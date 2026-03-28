import { Router } from 'express';
import PDFDocument from 'pdfkit';
import { query } from '../db/pool.js';
import { authenticateToken } from '../middleware/auth.js';

export const kostenvoranschlaegeRouter = Router();

// Alle Routen geschützt
kostenvoranschlaegeRouter.use(authenticateToken);

// GET /api/kostenvoranschlaege – Liste aller KVs
kostenvoranschlaegeRouter.get('/', async (req, res) => {
  try {
    const result = await query(
      `SELECT kv.*, u.name as erstellt_von_name FROM kostenvoranschlaege kv
       LEFT JOIN users u ON kv.erstellt_von = u.id
       ORDER BY kv.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// POST /api/kostenvoranschlaege – neuen KV erstellen
kostenvoranschlaegeRouter.post('/', async (req, res) => {
  try {
    const { patient_name, patient_geburtsdatum, versicherungsart, kassenart,
      kig_stufe, diagnose, positionen } = req.body;

    if (!patient_name || !versicherungsart || !positionen?.length) {
      return res.status(400).json({ error: 'Patient, Versicherungsart und Positionen erforderlich' });
    }

    // Punktwert holen
    const kkArt = kassenart || '1';
    const pwResult = await query(
      `SELECT quartal, pw_kfo FROM punktwerte
       WHERE quartal = (SELECT MAX(quartal) FROM punktwerte)
       AND kassenart = $1 ORDER BY kassengruppe LIMIT 1`,
      [kkArt]
    );
    const punktwert = pwResult.rows[0]?.pw_kfo ? parseFloat(pwResult.rows[0].pw_kfo) : 1.13;
    const quartal = pwResult.rows[0]?.quartal || 'unbekannt';

    // Leistungen laden und Positionen anreichern
    const leistungen = await query('SELECT bema_nr, bezeichnung, punkte FROM leistungen');
    const lMap = Object.fromEntries(leistungen.rows.map(l => [l.bema_nr, l]));

    let summePunkte = 0;
    const enrichedPositionen = positionen.map(p => {
      const l = lMap[p.bema_nr];
      const punkte = l ? parseFloat(l.punkte) * (p.anzahl || 1) : 0;
      summePunkte += punkte;
      return {
        bema_nr: p.bema_nr,
        bezeichnung: l?.bezeichnung || p.bezeichnung || '',
        punkte_einzeln: l ? parseFloat(l.punkte) : 0,
        anzahl: p.anzahl || 1,
        punkte_gesamt: punkte,
        euro: +(punkte * punktwert).toFixed(2),
      };
    });

    const summeEuro = +(summePunkte * punktwert).toFixed(2);
    const kig = parseInt(kig_stufe, 10);
    const kassenanteilProzent = (versicherungsart === 'GKV' && kig >= 3) ? 80 : 0;
    const kassenanteil = +(summeEuro * kassenanteilProzent / 100).toFixed(2);
    const eigenanteil = +(summeEuro - kassenanteil).toFixed(2);

    const result = await query(
      `INSERT INTO kostenvoranschlaege (patient_name, patient_geburtsdatum, versicherungsart,
       kassenart, kig_stufe, diagnose, positionen, summe_punkte, summe_euro,
       eigenanteil, kassenanteil, quartal, erstellt_von)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
      [patient_name, patient_geburtsdatum || null, versicherungsart, kassenart,
       kig_stufe, diagnose, JSON.stringify(enrichedPositionen), summePunkte, summeEuro,
       eigenanteil, kassenanteil, quartal, req.user.id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('KV create error:', err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// GET /api/kostenvoranschlaege/:id – einzelnen KV
kostenvoranschlaegeRouter.get('/:id', async (req, res) => {
  try {
    const result = await query(
      `SELECT kv.*, u.name as erstellt_von_name FROM kostenvoranschlaege kv
       LEFT JOIN users u ON kv.erstellt_von = u.id WHERE kv.id = $1`,
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'KV nicht gefunden' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// GET /api/kostenvoranschlaege/:id/pdf – KV als PDF generieren
kostenvoranschlaegeRouter.get('/:id/pdf', async (req, res) => {
  try {
    const result = await query('SELECT * FROM kostenvoranschlaege WHERE id = $1', [req.params.id]);
    const kv = result.rows[0];
    if (!kv) return res.status(404).json({ error: 'KV nicht gefunden' });

    // Ersteller-Name laden
    let erstellerName = '';
    if (kv.erstellt_von) {
      const userRes = await query('SELECT name FROM users WHERE id = $1', [kv.erstellt_von]);
      erstellerName = userRes.rows[0]?.name || '';
    }

    const doc = new PDFDocument({ size: 'A4', margins: { top: 40, bottom: 40, left: 50, right: 50 } });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=KV-${kv.id}.pdf`);
    doc.pipe(res);

    const PRIMARY = '#063255';
    const ACCENT = '#f58a07';
    const LIGHT_BG = '#edf7ff';
    const GRAY = '#6b7280';
    const pageWidth = 495; // 595 - 50 - 50

    // ── Header Bar ──
    doc.rect(0, 0, 595, 90).fill(PRIMARY);

    // Praxis-Name
    doc.fontSize(22).font('Helvetica-Bold').fillColor('#ffffff');
    doc.text('KFO Praxis Moosburg', 50, 22, { width: 300 });
    doc.fontSize(10).font('Helvetica').fillColor('#ffffff');
    doc.text('Dr. Amann & Dr. Burg · Kieferorthopädie', 50, 50);

    // KV-Badge rechts
    doc.fontSize(9).font('Helvetica-Bold').fillColor(ACCENT);
    doc.text(`KV-${kv.id}`, 400, 25, { width: 145, align: 'right' });
    doc.fontSize(8).font('Helvetica').fillColor('#ffffff');
    doc.text(`Erstellt: ${new Date(kv.created_at).toLocaleDateString('de-DE')}`, 400, 40, { width: 145, align: 'right' });
    doc.text(`Quartal: ${kv.quartal}`, 400, 52, { width: 145, align: 'right' });
    const statusLabel = { entwurf: 'Entwurf', gesendet: 'Gesendet', angenommen: 'Angenommen', abgelehnt: 'Abgelehnt' };
    doc.text(`Status: ${statusLabel[kv.status] || kv.status}`, 400, 64, { width: 145, align: 'right' });

    // ── Accent line ──
    doc.rect(0, 90, 595, 4).fill(ACCENT);

    // ── KOSTENVORANSCHLAG Title ──
    doc.fillColor(PRIMARY).fontSize(16).font('Helvetica-Bold');
    doc.text('Kostenvoranschlag', 50, 110);

    // ── Accent underline ──
    doc.rect(50, 130, 80, 2.5).fill(ACCENT);

    // ── Patient Info Box ──
    const boxTop = 145;
    doc.roundedRect(50, boxTop, pageWidth, 80, 6).fill(LIGHT_BG);

    doc.fillColor(PRIMARY).fontSize(9).font('Helvetica-Bold');
    doc.text('Patientendaten', 62, boxTop + 10);

    doc.fontSize(9).font('Helvetica').fillColor('#374151');
    const col1 = 62;
    const col2 = 300;
    let infoY = boxTop + 26;

    doc.font('Helvetica-Bold').text('Patient:', col1, infoY, { continued: true }).font('Helvetica').text(` ${kv.patient_name}`);
    if (kv.patient_geburtsdatum) {
      doc.font('Helvetica-Bold').text('Geb.:', col2, infoY, { continued: true }).font('Helvetica').text(` ${new Date(kv.patient_geburtsdatum).toLocaleDateString('de-DE')}`);
    }
    infoY += 15;
    doc.font('Helvetica-Bold').text('Versicherung:', col1, infoY, { continued: true }).font('Helvetica').text(` ${kv.versicherungsart}${kv.kassenart ? ` (Kassenart ${kv.kassenart})` : ''}`);
    if (kv.kig_stufe) {
      doc.font('Helvetica-Bold').text('KIG-Stufe:', col2, infoY, { continued: true }).font('Helvetica').text(` ${kv.kig_stufe}`);
    }
    if (kv.diagnose) {
      infoY += 15;
      doc.font('Helvetica-Bold').text('Diagnose:', col1, infoY, { continued: true }).font('Helvetica').text(` ${kv.diagnose}`);
    }

    // ── Positions Table ──
    let tableTop = boxTop + 95;

    doc.fillColor(PRIMARY).fontSize(10).font('Helvetica-Bold');
    doc.text('Leistungspositionen', 50, tableTop);
    tableTop += 18;

    // Table header
    doc.rect(50, tableTop, pageWidth, 22).fill(PRIMARY);
    doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');
    const cols = { nr: 58, bez: 120, pkt: 320, anz: 370, sum: 415, eur: 475 };
    doc.text('BEMA-Nr.', cols.nr, tableTop + 6);
    doc.text('Bezeichnung', cols.bez, tableTop + 6);
    doc.text('Punkte', cols.pkt, tableTop + 6, { width: 40, align: 'right' });
    doc.text('Anz.', cols.anz, tableTop + 6, { width: 35, align: 'right' });
    doc.text('Ges. Pkt.', cols.sum, tableTop + 6, { width: 50, align: 'right' });
    doc.text('EUR', cols.eur, tableTop + 6, { width: 62, align: 'right' });
    tableTop += 22;

    // Table rows
    const positionen = typeof kv.positionen === 'string' ? JSON.parse(kv.positionen) : kv.positionen;
    doc.font('Helvetica').fontSize(8).fillColor('#374151');

    for (let i = 0; i < positionen.length; i++) {
      const pos = positionen[i];
      const rowY = tableTop + (i * 20);

      // Alternating row background
      if (i % 2 === 0) {
        doc.rect(50, rowY - 2, pageWidth, 20).fill('#f8fafc');
        doc.fillColor('#374151');
      }

      // Page break check
      if (rowY > 680) {
        doc.addPage();
        tableTop = 50 - (i * 20);
      }

      doc.text(pos.bema_nr, cols.nr, rowY + 4);
      doc.text(pos.bezeichnung, cols.bez, rowY + 4, { width: 195 });
      doc.text(String(pos.punkte_einzeln), cols.pkt, rowY + 4, { width: 40, align: 'right' });
      doc.text(`${pos.anzahl}×`, cols.anz, rowY + 4, { width: 35, align: 'right' });
      doc.text(String(pos.punkte_gesamt), cols.sum, rowY + 4, { width: 50, align: 'right' });
      doc.text(`${pos.euro.toFixed(2)} €`, cols.eur, rowY + 4, { width: 62, align: 'right' });
    }

    const afterTable = tableTop + (positionen.length * 20) + 4;

    // ── Divider line ──
    doc.moveTo(50, afterTable).lineTo(50 + pageWidth, afterTable).lineWidth(1).strokeColor(PRIMARY).stroke();

    // ── Summary Box ──
    const summaryTop = afterTable + 12;
    const summaryWidth = 220;
    const summaryX = 50 + pageWidth - summaryWidth;

    doc.fontSize(9).font('Helvetica').fillColor(GRAY);
    doc.text('Gesamtsumme:', summaryX, summaryTop, { width: summaryWidth - 90 });
    doc.font('Helvetica-Bold').fillColor('#374151');
    doc.text(`${parseFloat(kv.summe_euro).toFixed(2)} €`, summaryX + summaryWidth - 90, summaryTop, { width: 90, align: 'right' });

    let sumY = summaryTop;
    if (parseFloat(kv.kassenanteil) > 0) {
      sumY += 16;
      doc.font('Helvetica').fillColor(GRAY);
      doc.text('Kassenanteil (ca. 80%):', summaryX, sumY, { width: summaryWidth - 90 });
      doc.font('Helvetica-Bold').fillColor('#16a34a');
      doc.text(`-${parseFloat(kv.kassenanteil).toFixed(2)} €`, summaryX + summaryWidth - 90, sumY, { width: 90, align: 'right' });
    }

    // Eigenanteil highlight
    sumY += 22;
    doc.roundedRect(summaryX - 10, sumY - 4, summaryWidth + 10, 28, 4).fill(ACCENT);
    doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold');
    doc.text('Ihr Eigenanteil:', summaryX, sumY + 3, { width: summaryWidth - 90 });
    doc.fontSize(12);
    doc.text(`${parseFloat(kv.eigenanteil).toFixed(2)} €`, summaryX + summaryWidth - 90, sumY + 1, { width: 90, align: 'right' });

    // ── Footer ──
    const footerY = 740;

    // Separator
    doc.moveTo(50, footerY).lineTo(50 + pageWidth, footerY).lineWidth(0.5).strokeColor('#d1d5db').stroke();

    doc.fontSize(7).font('Helvetica').fillColor(GRAY);
    doc.text(
      'Dieser Kostenvoranschlag ist unverbindlich und dient der Orientierung. Die tatsächlichen Kosten können je nach Behandlungsverlauf abweichen. Grundlage der Berechnung sind die aktuellen KZVB-Punktwerte.',
      50, footerY + 8, { width: pageWidth, lineGap: 2 }
    );

    doc.moveDown(0.5);
    doc.fontSize(7).fillColor(PRIMARY).font('Helvetica-Bold');
    doc.text('KFO Praxis Moosburg', 50, doc.y, { continued: true });
    doc.font('Helvetica').fillColor(GRAY);
    doc.text('  ·  Stadtplatz 2  ·  85368 Moosburg a.d. Isar  ·  Tel. 08761 7222750  ·  praxis@kfo-moosburg.de');

    if (erstellerName) {
      doc.moveDown(0.3);
      doc.text(`Erstellt von: ${erstellerName}`, 50);
    }

    doc.end();
  } catch (err) {
    console.error('PDF error:', err);
    res.status(500).json({ error: 'PDF-Generierung fehlgeschlagen' });
  }
});

// PATCH /api/kostenvoranschlaege/:id/status
kostenvoranschlaegeRouter.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const valid = ['entwurf', 'gesendet', 'angenommen', 'abgelehnt'];
    if (!valid.includes(status)) return res.status(400).json({ error: 'Ungültiger Status' });

    const result = await query(
      'UPDATE kostenvoranschlaege SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'KV nicht gefunden' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// PUT /api/kostenvoranschlaege/:id – KV bearbeiten
kostenvoranschlaegeRouter.put('/:id', async (req, res) => {
  try {
    const { patient_name, patient_geburtsdatum, versicherungsart, kassenart,
      kig_stufe, diagnose, positionen } = req.body;

    if (!patient_name || !versicherungsart || !positionen?.length) {
      return res.status(400).json({ error: 'Patient, Versicherungsart und Positionen erforderlich' });
    }

    const kkArt = kassenart || '1';
    const pwResult = await query(
      `SELECT quartal, pw_kfo FROM punktwerte
       WHERE quartal = (SELECT MAX(quartal) FROM punktwerte)
       AND kassenart = $1 ORDER BY kassengruppe LIMIT 1`,
      [kkArt]
    );
    const punktwert = pwResult.rows[0]?.pw_kfo ? parseFloat(pwResult.rows[0].pw_kfo) : 1.13;
    const quartal = pwResult.rows[0]?.quartal || 'unbekannt';

    const leistungen = await query('SELECT bema_nr, bezeichnung, punkte FROM leistungen');
    const lMap = Object.fromEntries(leistungen.rows.map(l => [l.bema_nr, l]));

    let summePunkte = 0;
    const enrichedPositionen = positionen.map(p => {
      const l = lMap[p.bema_nr];
      const punkte = l ? parseFloat(l.punkte) * (p.anzahl || 1) : 0;
      summePunkte += punkte;
      return {
        bema_nr: p.bema_nr,
        bezeichnung: l?.bezeichnung || p.bezeichnung || '',
        punkte_einzeln: l ? parseFloat(l.punkte) : 0,
        anzahl: p.anzahl || 1,
        punkte_gesamt: punkte,
        euro: +(punkte * punktwert).toFixed(2),
      };
    });

    const summeEuro = +(summePunkte * punktwert).toFixed(2);
    const kig = parseInt(kig_stufe, 10);
    const kassenanteilProzent = (versicherungsart === 'GKV' && kig >= 3) ? 80 : 0;
    const kassenanteil = +(summeEuro * kassenanteilProzent / 100).toFixed(2);
    const eigenanteil = +(summeEuro - kassenanteil).toFixed(2);

    const result = await query(
      `UPDATE kostenvoranschlaege SET patient_name=$1, patient_geburtsdatum=$2,
       versicherungsart=$3, kassenart=$4, kig_stufe=$5, diagnose=$6,
       positionen=$7, summe_punkte=$8, summe_euro=$9, eigenanteil=$10,
       kassenanteil=$11, quartal=$12, updated_at=NOW()
       WHERE id=$13 RETURNING *`,
      [patient_name, patient_geburtsdatum || null, versicherungsart, kassenart,
       kig_stufe, diagnose, JSON.stringify(enrichedPositionen), summePunkte, summeEuro,
       eigenanteil, kassenanteil, quartal, req.params.id]
    );

    if (!result.rows[0]) return res.status(404).json({ error: 'KV nicht gefunden' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('KV update error:', err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});
