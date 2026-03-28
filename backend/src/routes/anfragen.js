import { Router } from 'express';
import { query } from '../db/pool.js';
import { authenticateToken } from '../middleware/auth.js';

export const anfragenRouter = Router();

// POST /api/anfragen – neue Anfrage (öffentlich, aus Preisrechner)
anfragenRouter.post('/', async (req, res) => {
  try {
    const { name, email, telefon, versicherungsart, kassenart, behandlungsart, kig_stufe,
      geschaetzte_kosten_min, geschaetzte_kosten_max, nachricht } = req.body;

    if (!name || !versicherungsart || !behandlungsart) {
      return res.status(400).json({ error: 'Name, Versicherungsart und Behandlungsart erforderlich' });
    }

    const result = await query(
      `INSERT INTO anfragen (name, email, telefon, versicherungsart, kassenart, behandlungsart,
       kig_stufe, geschaetzte_kosten_min, geschaetzte_kosten_max, nachricht)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [name, email, telefon, versicherungsart, kassenart, behandlungsart,
       kig_stufe, geschaetzte_kosten_min, geschaetzte_kosten_max, nachricht]
    );

    res.status(201).json({ success: true, id: result.rows[0].id });
  } catch (err) {
    console.error('Anfrage error:', err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// GET /api/anfragen – alle Anfragen (geschützt)
anfragenRouter.get('/', authenticateToken, async (req, res) => {
  try {
    const status = req.query.status;
    let sql = 'SELECT * FROM anfragen';
    const params = [];
    if (status) {
      sql += ' WHERE status = $1';
      params.push(status);
    }
    sql += ' ORDER BY created_at DESC';
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// PATCH /api/anfragen/:id/status – Status ändern (geschützt)
anfragenRouter.patch('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['neu', 'in_bearbeitung', 'termin_vereinbart', 'abgeschlossen', 'storniert'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Status muss einer von ${validStatuses.join(', ')} sein` });
    }
    const result = await query(
      'UPDATE anfragen SET status = $1 WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Anfrage nicht gefunden' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// DELETE /api/anfragen/:id – Anfrage löschen (geschützt)
anfragenRouter.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await query('DELETE FROM anfragen WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Anfrage nicht gefunden' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Serverfehler' });
  }
});
