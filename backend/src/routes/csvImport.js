import { Router } from 'express';
import multer from 'multer';
import { query } from '../db/pool.js';
import { authMiddleware } from '../middleware/auth.js';

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

  const name = get('patient', 'name', 'nachname');
  const vorname = get('vorname', 'first');
  const fullName = vorname && name ? `${vorname} ${name}` : name || vorname || '';

  return {
    patient_name: fullName,
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
        `INSERT INTO patienten (patient_name, geburtsdatum, versicherungsart, kassenart, telefon, email, notizen)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [p.patient_name, p.geburtsdatum || null, p.versicherungsart, p.kassenart, p.telefon, p.email, p.notizen]
      );
      imported++;
    }

    res.json({ imported, skipped, total: mapped.length });
  } catch (err) {
    console.error('CSV Import Fehler:', err);
    res.status(500).json({ error: 'Import fehlgeschlagen: ' + err.message });
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

export { router as csvImportRouter };
