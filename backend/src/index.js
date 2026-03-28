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
import { importPunktwerte } from './services/kzvbImport.js';

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Public routes
app.use('/api/auth', authRouter);
app.use('/api/preisrechner', preisrechnerRouter);

// Protected routes (auth middleware applied inside)
app.use('/api/punktwerte', punktwerteRouter);
app.use('/api/leistungen', leistungenRouter);
app.use('/api/kostenvoranschlaege', kostenvoranschlaegeRouter);
app.use('/api/anfragen', anfragenRouter);

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

app.listen(PORT, () => {
  console.log(`KFO Moosburg Backend läuft auf Port ${PORT}`);
});
