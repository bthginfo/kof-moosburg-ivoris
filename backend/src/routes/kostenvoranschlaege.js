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

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=KV-${kv.id}.pdf`);
    doc.pipe(res);

    // Header
    doc.fontSize(20).text('KFO Praxis Moosburg', { align: 'center' });
    doc.fontSize(10).text('Kostenvoranschlag', { align: 'center' });
    doc.moveDown(2);

    // Patient info
    doc.fontSize(12).text(`Patient: ${kv.patient_name}`);
    if (kv.patient_geburtsdatum) {
      doc.text(`Geburtsdatum: ${new Date(kv.patient_geburtsdatum).toLocaleDateString('de-DE')}`);
    }
    doc.text(`Versicherung: ${kv.versicherungsart}${kv.kassenart ? ` (Kassenart ${kv.kassenart})` : ''}`);
    if (kv.kig_stufe) doc.text(`KIG-Stufe: ${kv.kig_stufe}`);
    doc.text(`Quartal: ${kv.quartal}`);
    doc.text(`Datum: ${new Date(kv.created_at).toLocaleDateString('de-DE')}`);
    if (kv.diagnose) {
      doc.moveDown(0.5);
      doc.text(`Diagnose: ${kv.diagnose}`);
    }
    doc.moveDown(1);

    // Table header
    doc.fontSize(10).font('Helvetica-Bold');
    const tableTop = doc.y;
    doc.text('BEMA-Nr.', 50, tableTop, { width: 60 });
    doc.text('Bezeichnung', 115, tableTop, { width: 220 });
    doc.text('Pkt.', 340, tableTop, { width: 40, align: 'right' });
    doc.text('Anz.', 385, tableTop, { width: 35, align: 'right' });
    doc.text('Summe Pkt.', 425, tableTop, { width: 60, align: 'right' });
    doc.text('EUR', 490, tableTop, { width: 55, align: 'right' });
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.3);

    // Positionen
    doc.font('Helvetica');
    const positionen = typeof kv.positionen === 'string' ? JSON.parse(kv.positionen) : kv.positionen;
    for (const pos of positionen) {
      const y = doc.y;
      doc.text(pos.bema_nr, 50, y, { width: 60 });
      doc.text(pos.bezeichnung, 115, y, { width: 220 });
      doc.text(String(pos.punkte_einzeln), 340, y, { width: 40, align: 'right' });
      doc.text(String(pos.anzahl), 385, y, { width: 35, align: 'right' });
      doc.text(String(pos.punkte_gesamt), 425, y, { width: 60, align: 'right' });
      doc.text(`${pos.euro.toFixed(2)}`, 490, y, { width: 55, align: 'right' });
      doc.moveDown(0.5);
    }

    // Summen
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);
    doc.font('Helvetica-Bold');
    doc.text(`Gesamtsumme: ${parseFloat(kv.summe_euro).toFixed(2)} EUR`, { align: 'right' });
    if (parseFloat(kv.kassenanteil) > 0) {
      doc.text(`Kassenanteil (ca. 80%): -${parseFloat(kv.kassenanteil).toFixed(2)} EUR`, { align: 'right' });
    }
    doc.fontSize(14).text(`Ihr voraussichtlicher Eigenanteil: ${parseFloat(kv.eigenanteil).toFixed(2)} EUR`, { align: 'right' });

    // Footer
    doc.moveDown(2);
    doc.fontSize(8).font('Helvetica').fillColor('#666');
    doc.text('Dieser Kostenvoranschlag ist unverbindlich. Die tatsächlichen Kosten können je nach Behandlungsverlauf abweichen.', 50);
    doc.text(`KV-Nr.: ${kv.id} | Erstellt: ${new Date(kv.created_at).toLocaleDateString('de-DE')}`);

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
