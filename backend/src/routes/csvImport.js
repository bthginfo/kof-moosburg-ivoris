import { Router } from 'express';
import multer from 'multer';
import { query } from '../db/pool.js';
import { authenticateToken as authMiddleware } from '../middleware/auth.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// CSV parsen (Semikolon oder Komma als Trennzeichen)
function parseCSV(buffer) {
  const text = buffer.toString('utf-8').replace(/^\uFEFF/, ''); // BOM entfernen
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) throw new Error('CSV muss mindestens eine Kopfzeile und eine Datenzeile enthalten.');

  const delimiter = lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase().replace(/[^a-z0-9äöüß_]/g, '_'));

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(delimiter).map(v => v.trim().replace(/^"|"$/g, ''));
    if (vals.length < 2) continue; // Leerzeile überspringen
    const row = {};
    headers.forEach((h, idx) => { row[h] = vals[idx] || ''; });
    rows.push(row);
  }
  return { headers, rows };
}

// Spalten-Mapping: verschiedene CSV-Formate erkennen
function mapRow(row) {
  const get = (...keys) => {
    for (const k of keys) {
      const val = Object.entries(row).find(([key]) => key.includes(k));
      if (val && val[1]) return val[1];
    }
    return '';
  };

  const nachname = get('nachname', 'name', 'patient');
  const vorname = get('vorname', 'first');
  const patient_name = vorname && nachname ? `${vorname} ${nachname}` : nachname || vorname || '';

  return {
    vorname: vorname || '',
    nachname: nachname || '',
    patient_name,
    geburtsdatum: get('geburt', 'dob', 'birth', 'datum') || null,
    versicherungsart: get('versicherung', 'kasse_privat', 'versicherungs') || 'GKV',
    kassenart: get('kassenart', 'krankenkasse', 'kasse') || '',
    telefon: get('telefon', 'tel', 'phone', 'mobil') || '',
    email: get('email', 'mail') || '',
    notizen: get('notiz', 'bemerkung', 'hinweis', 'kommentar') || '',
  };
}

// POST /api/csv-import/vorschau - CSV-Vorschau (parsen ohne speichern)
router.post('/vorschau', authMiddleware, upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Keine Datei hochgeladen.' });
    const { headers, rows } = parseCSV(req.file.buffer);
    const mapped = rows.map(mapRow).filter(r => r.patient_name);
    res.json({ headers, total: rows.length, valid: mapped.length, vorschau: mapped.slice(0, 50) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/csv-import/importieren - CSV speichern
router.post('/importieren', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Keine Datei hochgeladen.' });
    const { rows } = parseCSV(req.file.buffer);
    const mapped = rows.map(mapRow).filter(r => r.patient_name);

    if (mapped.length === 0) return res.status(400).json({ error: 'Keine gültigen Patientendaten gefunden.' });

    let imported = 0;
    let skipped = 0;
    for (const p of mapped) {
      // Duplikat-Check: gleicher Name + Geburtsdatum
      const existing = await query(
        'SELECT id FROM patienten WHERE LOWER(patient_name) = LOWER($1) AND geburtsdatum = $2',
        [p.patient_name, p.geburtsdatum || null]
      );
      if (existing.rows.length > 0) {
        skipped++;
        continue;
      }
      await query(
        `INSERT INTO patienten (patient_name, vorname, nachname, geburtsdatum, versicherungsart, kassenart, telefon, email, notizen)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [p.patient_name, p.vorname, p.nachname, p.geburtsdatum || null, p.versicherungsart, p.kassenart, p.telefon, p.email, p.notizen]
      );
      imported++;
    }

    res.json({ imported, skipped, total: mapped.length });
  } catch (err) {
    console.error('CSV Import Fehler:', err);
    res.status(500).json({ error: 'Import fehlgeschlagen: ' + err.message });
  }
});

// POST /api/csv-import/import-ivoris-mock - Mock-Gesamtimport aller Ivoris-Patienten
router.post('/import-ivoris-mock', authMiddleware, async (_req, res) => {
  try {
    const mockPatienten = [
      { vorname: 'Max', nachname: 'Mustermann', geburtsdatum: '1991-05-02', versicherungsart: 'GKV', kassenart: 'TK', telefon: '01761234567', email: 'max.mustermann@example.de', notizen: 'Mock aus Ivoris Gesamtimport' },
      { vorname: 'Anna', nachname: 'Schneider', geburtsdatum: '2009-11-18', versicherungsart: 'GKV', kassenart: 'AOK Bayern', telefon: '01761234568', email: 'anna.schneider@example.de', notizen: 'Mock aus Ivoris Gesamtimport' },
      { vorname: 'Luca', nachname: 'Weber', geburtsdatum: '2007-08-24', versicherungsart: 'PKV', kassenart: 'Debeka', telefon: '01761234569', email: 'luca.weber@example.de', notizen: 'Mock aus Ivoris Gesamtimport' },
      { vorname: 'Sophie', nachname: 'Fischer', geburtsdatum: '2010-01-13', versicherungsart: 'GKV', kassenart: 'Barmer', telefon: '01761234570', email: 'sophie.fischer@example.de', notizen: 'Mock aus Ivoris Gesamtimport' },
      { vorname: 'Noah', nachname: 'Meyer', geburtsdatum: '2008-06-03', versicherungsart: 'GKV', kassenart: 'DAK', telefon: '01761234571', email: 'noah.meyer@example.de', notizen: 'Mock aus Ivoris Gesamtimport' },
      { vorname: 'Leonie', nachname: 'Wagner', geburtsdatum: '2012-04-21', versicherungsart: 'GKV', kassenart: 'IKK classic', telefon: '01761234572', email: 'leonie.wagner@example.de', notizen: 'Mock aus Ivoris Gesamtimport' },
      { vorname: 'Paul', nachname: 'Becker', geburtsdatum: '2006-09-30', versicherungsart: 'PKV', kassenart: 'Allianz', telefon: '01761234573', email: 'paul.becker@example.de', notizen: 'Mock aus Ivoris Gesamtimport' },
      { vorname: 'Mia', nachname: 'Hoffmann', geburtsdatum: '2011-02-27', versicherungsart: 'GKV', kassenart: 'BKK VerbundPlus', telefon: '01761234574', email: 'mia.hoffmann@example.de', notizen: 'Mock aus Ivoris Gesamtimport' },
      { vorname: 'Elias', nachname: 'Schulz', geburtsdatum: '2005-12-15', versicherungsart: 'GKV', kassenart: 'Techniker', telefon: '01761234575', email: 'elias.schulz@example.de', notizen: 'Mock aus Ivoris Gesamtimport' },
      { vorname: 'Emilia', nachname: 'Koch', geburtsdatum: '2013-07-09', versicherungsart: 'GKV', kassenart: 'AOK Plus', telefon: '01761234576', email: 'emilia.koch@example.de', notizen: 'Mock aus Ivoris Gesamtimport' },
      { vorname: 'Jonas', nachname: 'Richter', geburtsdatum: '2004-10-19', versicherungsart: 'PKV', kassenart: 'HUK-Coburg', telefon: '01761234577', email: 'jonas.richter@example.de', notizen: 'Mock aus Ivoris Gesamtimport' },
      { vorname: 'Lina', nachname: 'Klein', geburtsdatum: '2014-03-25', versicherungsart: 'GKV', kassenart: 'SBK', telefon: '01761234578', email: 'lina.klein@example.de', notizen: 'Mock aus Ivoris Gesamtimport' },
    ];

    let imported = 0;
    let skipped = 0;

    for (const p of mockPatienten) {
      const patient_name = [p.vorname, p.nachname].filter(Boolean).join(' ');
      const existing = await query(
        'SELECT id FROM patienten WHERE LOWER(patient_name) = LOWER($1) AND geburtsdatum = $2',
        [patient_name, p.geburtsdatum || null]
      );

      if (existing.rows.length > 0) {
        skipped++;
        continue;
      }

      await query(
        `INSERT INTO patienten (patient_name, vorname, nachname, geburtsdatum, versicherungsart, kassenart, telefon, email, notizen)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [patient_name, p.vorname, p.nachname, p.geburtsdatum || null, p.versicherungsart, p.kassenart, p.telefon, p.email, p.notizen]
      );

      imported++;
    }

    res.json({ imported, skipped, total: mockPatienten.length, source: 'ivoris-mock' });
  } catch (err) {
    console.error('Ivoris Mock Import Fehler:', err);
    res.status(500).json({ error: 'Mock-Import fehlgeschlagen: ' + err.message });
  }
});

// GET /api/csv-import/patienten - Alle importierten Patienten abfragen
router.get('/patienten', authMiddleware, async (_req, res) => {
  try {
    const result = await query('SELECT * FROM patienten ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/csv-import/patienten/:id
router.delete('/patienten/:id', authMiddleware, async (req, res) => {
  try {
    await query('DELETE FROM patienten WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/csv-import/patienten/:id - Patient bearbeiten
router.put('/patienten/:id', authMiddleware, async (req, res) => {
  try {
    const { vorname, nachname, geburtsdatum, versicherungsart, kassenart, telefon, email, notizen } = req.body;
    if (!nachname && !vorname) return res.status(400).json({ error: 'Name ist erforderlich.' });
    const patient_name = [vorname, nachname].filter(Boolean).join(' ');
    const result = await query(
      `UPDATE patienten SET patient_name=$1, vorname=$2, nachname=$3, geburtsdatum=$4, versicherungsart=$5,
       kassenart=$6, telefon=$7, email=$8, notizen=$9 WHERE id=$10 RETURNING *`,
      [patient_name, vorname || '', nachname || '', geburtsdatum || null, versicherungsart || 'GKV', kassenart || '', telefon || '', email || '', notizen || '', req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Patient nicht gefunden.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/csv-import/patienten - Patient manuell anlegen
router.post('/patienten', authMiddleware, async (req, res) => {
  try {
    const { vorname, nachname, geburtsdatum, versicherungsart, kassenart, telefon, email, notizen } = req.body;
    if (!nachname && !vorname) return res.status(400).json({ error: 'Name ist erforderlich.' });
    const patient_name = [vorname, nachname].filter(Boolean).join(' ');
    const result = await query(
      `INSERT INTO patienten (patient_name, vorname, nachname, geburtsdatum, versicherungsart, kassenart, telefon, email, notizen)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [patient_name, vorname || '', nachname || '', geburtsdatum || null, versicherungsart || 'GKV', kassenart || '', telefon || '', email || '', notizen || '']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export { router as csvImportRouter };
