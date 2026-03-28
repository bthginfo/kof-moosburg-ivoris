import { Router } from 'express';
import { query } from '../db/pool.js';
import { authenticateToken } from '../middleware/auth.js';

export const leistungenRouter = Router();

// GET /api/leistungen – alle aktiven Leistungen (öffentlich)
leistungenRouter.get('/', async (_req, res) => {
  try {
    const result = await query(
      `SELECT * FROM leistungen WHERE aktiv = true ORDER BY kategorie, bema_nr`
    );
    res.json(result.rows);
  } catch (err) {
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
