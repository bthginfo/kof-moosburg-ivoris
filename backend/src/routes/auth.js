import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { query } from '../db/pool.js';
import { signToken, authenticateToken } from '../middleware/auth.js';

export const authRouter = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Zu viele Login-Versuche. Bitte in 15 Minuten erneut versuchen.' },
});

// POST /api/auth/login
authRouter.post('/login', loginLimiter, async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Pragma', 'no-cache');
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'E-Mail und Passwort erforderlich' });
    }

    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Ungültige Anmeldedaten' });
    }

    // Re-hash with lower cost if old hash used higher rounds
    const rounds = bcrypt.getRounds(user.password_hash);
    if (rounds > 10) {
      const newHash = await bcrypt.hash(password, 10);
      await query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, user.id]);
    }

    const token = signToken({ id: user.id, email: user.email, name: user.name, role: user.role });
    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// GET /api/auth/me – verify token and return user info
authRouter.get('/me', authenticateToken, (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');
  res.json({ user: req.user });
});
