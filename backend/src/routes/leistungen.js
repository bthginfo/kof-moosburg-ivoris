import { Router } from 'express';
import { query } from '../db/pool.js';
import { authenticateToken } from '../middleware/auth.js';

export const leistungenRouter = Router();

// GET /api/leistungen – alle aktiven Leistungen (öffentlich)
leistungenRouter.get('/', async (_req, res) => {
  try {
    const result = await query(
      `SELECT * FROM leistungen ORDER BY kategorie, bema_nr`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// POST /api/leistungen – neue Leistung anlegen (geschützt)
leistungenRouter.post('/', authenticateToken, async (req, res) => {
  try {
    const { bema_nr, bezeichnung, punkte, kategorie } = req.body;
    if (!bema_nr || !bezeichnung || punkte == null) {
      return res.status(400).json({ error: 'BEMA-Nr., Bezeichnung und Punkte erforderlich' });
    }
    const result = await query(
      `INSERT INTO leistungen (bema_nr, bezeichnung, punkte, kategorie, aktiv)
       VALUES ($1, $2, $3, $4, true) RETURNING *`,
      [bema_nr, bezeichnung, punkte, kategorie || 'KFO']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'BEMA-Nr. existiert bereits' });
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// PUT /api/leistungen/:id – Leistung bearbeiten (geschützt)
leistungenRouter.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { bezeichnung, punkte, kategorie, aktiv } = req.body;
    const result = await query(
      `UPDATE leistungen SET bezeichnung = COALESCE($1, bezeichnung), punkte = COALESCE($2, punkte),
       kategorie = COALESCE($3, kategorie), aktiv = COALESCE($4, aktiv) WHERE id = $5 RETURNING *`,
      [bezeichnung, punkte, kategorie, aktiv, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Leistung nicht gefunden' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// DELETE /api/leistungen/:id – Leistung löschen (geschützt)
leistungenRouter.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await query('DELETE FROM leistungen WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Leistung nicht gefunden' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Serverfehler' });
  }
});
