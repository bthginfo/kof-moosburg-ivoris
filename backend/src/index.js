import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import { authRouter } from './routes/auth.js';
import { punktwerteRouter } from './routes/punktwerte.js';
import { leistungenRouter } from './routes/leistungen.js';
import { preisrechnerRouter } from './routes/preisrechner.js';
import { kostenvoranschlaegeRouter } from './routes/kostenvoranschlaege.js';
import { anfragenRouter } from './routes/anfragen.js';
import { csvImportRouter } from './routes/csvImport.js';
import { importPunktwerte } from './services/kzvbImport.js';
import { migrate } from './db/migrate.js';
import { seed } from './db/seed.js';
import { query } from './db/pool.js';

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors({
  origin: (origin, callback) => {
    const allowed = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map(s => s.trim());
    // Allow GitHub Codespaces and Vercel preview URLs
    if (!origin || allowed.includes(origin) || origin.endsWith('.app.github.dev') || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
}));
app.use(express.json());

// Health check – also warms up DB connection for fast login
app.get('/api/health', async (_req, res) => {
  try {
    await query('SELECT 1');
    res.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
  } catch {
    res.json({ status: 'ok', db: 'cold', timestamp: new Date().toISOString() });
  }
});

// Public routes
app.use('/api/auth', authRouter);
app.use('/api/preisrechner', preisrechnerRouter);

// Protected routes (auth middleware applied inside)
app.use('/api/punktwerte', punktwerteRouter);
app.use('/api/leistungen', leistungenRouter);
app.use('/api/kostenvoranschlaege', kostenvoranschlaegeRouter);
app.use('/api/anfragen', anfragenRouter);
app.use('/api/csv-import', csvImportRouter);

// Cron: Import KZVB Punktwerte am 5. des 1. Monats jedes Quartals (Jan, Apr, Jul, Okt)
cron.schedule('0 8 5 1,4,7,10 *', async () => {
  console.log('[CRON] Starte automatischen KZVB Punktwerte-Import...');
  try {
    await importPunktwerte();
    console.log('[CRON] Punktwerte-Import erfolgreich.');
  } catch (err) {
    console.error('[CRON] Punktwerte-Import fehlgeschlagen:', err.message);
  }
});

// Keep-alive: Alle 14 Minuten Self-Ping um Render Free-Tier Sleep zu vermeiden
if (process.env.NODE_ENV === 'production' && process.env.RENDER_EXTERNAL_URL) {
  cron.schedule('*/14 * * * *', () => {
    fetch(`${process.env.RENDER_EXTERNAL_URL}/api/health`).catch(() => {});
  });
}

app.listen(PORT, async () => {
  console.log(`KFO Moosburg Backend läuft auf Port ${PORT}`);
  try {
    await migrate();
    await seed();
    console.log('DB migration & seed complete.');
  } catch (err) {
    console.error('DB init error (non-fatal):', err.message);
  }
  try {
    await importPunktwerte();
  } catch (err) {
    console.error('KZVB import skipped:', err.message);
  }
});
