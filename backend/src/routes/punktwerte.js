import { Router } from 'express';
import { query } from '../db/pool.js';
import { authenticateToken } from '../middleware/auth.js';
import { importPunktwerte } from '../services/kzvbImport.js';

export const punktwerteRouter = Router();

// GET /api/punktwerte – alle Punktwerte (öffentlich für aktuelles Quartal)
punktwerteRouter.get('/', async (_req, res) => {
  try {
    const result = await query(
      `SELECT * FROM punktwerte ORDER BY quartal DESC, kassengruppe, kassenart`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Punktwerte fetch error:', err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// GET /api/punktwerte/aktuell – nur aktuelles Quartal
punktwerteRouter.get('/aktuell', async (_req, res) => {
  try {
    const result = await query(
      `SELECT * FROM punktwerte WHERE quartal = (SELECT MAX(quartal) FROM punktwerte)
       ORDER BY kassengruppe, kassenart`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Punktwerte aktuell error:', err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// POST /api/punktwerte/import – manueller Import (nur Admin)
punktwerteRouter.post('/import', authenticateToken, async (req, res) => {
  try {
    const result = await importPunktwerte(req.body.quartal || undefined);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('Import error:', err);
    res.status(500).json({ error: err.message });
  }
});
