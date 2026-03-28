import { Router } from 'express';
import { query } from '../db/pool.js';

export const preisrechnerRouter = Router();

// Behandlungs-Pakete mit typischen BEMA-Positionen und deren Häufigkeit
const BEHANDLUNGSPAKETE = {
  'festsitzend-ok': {
    label: 'Feste Zahnspange (Oberkiefer)',
    positionen: [
      { bema_nr: '1', anzahl: 1 },
      { bema_nr: '6', anzahl: 2 },
      { bema_nr: '126', anzahl: 2 },
      { bema_nr: '128', anzahl: 1 },
      { bema_nr: 'Ä925', anzahl: 1 },
      { bema_nr: 'Ä935a', anzahl: 1 },
      { bema_nr: '120', anzahl: 1 },
      { bema_nr: '121', anzahl: 16 },
      { bema_nr: '124', anzahl: 2 },
      { bema_nr: '125', anzahl: 1 },
      { bema_nr: '122', anzahl: 1 },
    ],
  },
  'festsitzend-ok-uk': {
    label: 'Feste Zahnspange (Ober- & Unterkiefer)',
    positionen: [
      { bema_nr: '1', anzahl: 1 },
      { bema_nr: '6', anzahl: 2 },
      { bema_nr: '126', anzahl: 3 },
      { bema_nr: '128', anzahl: 1 },
      { bema_nr: 'Ä925', anzahl: 1 },
      { bema_nr: 'Ä935a', anzahl: 1 },
      { bema_nr: '120', anzahl: 2 },
      { bema_nr: '121', anzahl: 24 },
      { bema_nr: '124', anzahl: 4 },
      { bema_nr: '125', anzahl: 2 },
      { bema_nr: '122', anzahl: 2 },
    ],
  },
  'herausnehmbar': {
    label: 'Herausnehmbare Zahnspange',
    positionen: [
      { bema_nr: '1', anzahl: 1 },
      { bema_nr: '6', anzahl: 2 },
      { bema_nr: '126', anzahl: 2 },
      { bema_nr: '128', anzahl: 1 },
      { bema_nr: 'Ä925', anzahl: 1 },
      { bema_nr: 'Ä935a', anzahl: 1 },
      { bema_nr: '119c', anzahl: 1 },
      { bema_nr: '121', anzahl: 12 },
      { bema_nr: '123', anzahl: 1 },
    ],
  },
  'aktivator': {
    label: 'Funktionskieferorthopädie (Aktivator)',
    positionen: [
      { bema_nr: '1', anzahl: 1 },
      { bema_nr: '6', anzahl: 2 },
      { bema_nr: '126', anzahl: 2 },
      { bema_nr: '128', anzahl: 1 },
      { bema_nr: 'Ä925', anzahl: 1 },
      { bema_nr: 'Ä935a', anzahl: 1 },
      { bema_nr: '119a', anzahl: 1 },
      { bema_nr: '121', anzahl: 12 },
    ],
  },
  'aligner': {
    label: 'Aligner-Therapie (Privatleistung)',
    positionen: [],
    pauschal_min: 3500,
    pauschal_max: 7500,
    hinweis: 'Aligner-Therapien werden nach GOZ/GOÄ privat abgerechnet. Die Kosten variieren je nach Komplexität und Anzahl der Schienen.',
  },
};

// POST /api/preisrechner/berechnen
preisrechnerRouter.post('/berechnen', async (req, res) => {
  try {
    const { versicherungsart, kassenart, behandlungsart, kig_stufe } = req.body;

    if (!versicherungsart || !behandlungsart) {
      return res.status(400).json({ error: 'Versicherungsart und Behandlungsart erforderlich' });
    }

    const paket = BEHANDLUNGSPAKETE[behandlungsart];
    if (!paket) {
      return res.status(400).json({ error: 'Unbekannte Behandlungsart' });
    }

    // Aligner: Pauschalpreis zurückgeben
    if (paket.pauschal_min) {
      return res.json({
        behandlung: paket.label,
        versicherungsart,
        hinweis: paket.hinweis,
        geschaetzte_kosten_min: paket.pauschal_min,
        geschaetzte_kosten_max: paket.pauschal_max,
        details: [],
        kassenanteil: 0,
        eigenanteil_min: paket.pauschal_min,
        eigenanteil_max: paket.pauschal_max,
      });
    }

    // Punktwert für die Kassenart holen (aktuellstes Quartal)
    const kkArt = kassenart || '1';
    const pwResult = await query(
      `SELECT pw_kfo FROM punktwerte
       WHERE quartal = (SELECT MAX(quartal) FROM punktwerte)
       AND kassenart = $1
       ORDER BY kassengruppe LIMIT 1`,
      [kkArt]
    );

    // Fallback: Durchschnitt aller KFO-Punktwerte des aktuellen Quartals
    let punktwert;
    if (pwResult.rows.length > 0) {
      punktwert = parseFloat(pwResult.rows[0].pw_kfo);
    } else {
      const avgResult = await query(
        `SELECT AVG(pw_kfo) as avg_pw FROM punktwerte
         WHERE quartal = (SELECT MAX(quartal) FROM punktwerte) AND pw_kfo > 0`
      );
      punktwert = avgResult.rows[0]?.avg_pw ? parseFloat(avgResult.rows[0].avg_pw) : 1.13;
    }

    // Leistungen laden
    const leistungen = await query(`SELECT bema_nr, bezeichnung, punkte FROM leistungen WHERE aktiv = true`);
    const leistungsMap = Object.fromEntries(leistungen.rows.map(l => [l.bema_nr, l]));

    // Berechnung
    let gesamtPunkte = 0;
    const details = [];

    for (const pos of paket.positionen) {
      const leistung = leistungsMap[pos.bema_nr];
      if (!leistung) continue;
      const punkte = parseFloat(leistung.punkte) * pos.anzahl;
      gesamtPunkte += punkte;
      details.push({
        bema_nr: pos.bema_nr,
        bezeichnung: leistung.bezeichnung,
        punkte: parseFloat(leistung.punkte),
        anzahl: pos.anzahl,
        summe_punkte: punkte,
        summe_euro: +(punkte * punktwert).toFixed(2),
      });
    }

    const gesamtEuro = +(gesamtPunkte * punktwert).toFixed(2);

    // Kassenanteil: GKV übernimmt 80% bei KIG 3-5 (Kassenleistung), 100% nach Behandlung
    // Bei KIG 1-2: keine Kassenleistung
    let kassenanteilProzent = 0;
    if (versicherungsart === 'GKV') {
      const kig = parseInt(kig_stufe, 10);
      if (kig >= 3) {
        kassenanteilProzent = 80;
      }
    }

    const kassenanteil = +(gesamtEuro * kassenanteilProzent / 100).toFixed(2);
    const eigenanteil = +(gesamtEuro - kassenanteil).toFixed(2);

    // Spanne ±15% für die Schätzung
    const min = +(eigenanteil * 0.85).toFixed(2);
    const max = +(eigenanteil * 1.15).toFixed(2);

    res.json({
      behandlung: paket.label,
      versicherungsart,
      kassenart: kkArt,
      kig_stufe: kig_stufe || 'nicht angegeben',
      punktwert,
      gesamt_punkte: gesamtPunkte,
      gesamt_euro: gesamtEuro,
      kassenanteil_prozent: kassenanteilProzent,
      kassenanteil,
      geschaetzte_kosten_min: min,
      geschaetzte_kosten_max: max,
      details,
      hinweis: 'Dies ist eine unverbindliche Kostenindikation. Die tatsächlichen Kosten können je nach individuellem Behandlungsplan abweichen. Bitte vereinbaren Sie einen Beratungstermin für eine genaue Kalkulation.',
    });
  } catch (err) {
    console.error('Preisrechner error:', err);
    res.status(500).json({ error: 'Serverfehler bei der Berechnung' });
  }
});

// GET /api/preisrechner/behandlungen – verfügbare Behandlungen
preisrechnerRouter.get('/behandlungen', (_req, res) => {
  const behandlungen = Object.entries(BEHANDLUNGSPAKETE).map(([key, val]) => ({
    id: key,
    label: val.label,
    istPrivat: !!val.pauschal_min,
  }));
  res.json(behandlungen);
});

// GET /api/preisrechner/kassenarten – verfügbare Kassenarten
preisrechnerRouter.get('/kassenarten', async (_req, res) => {
  const KASSENARTEN = [
    { id: '1', label: 'AOK' },
    { id: '2', label: 'BKK (Betriebskrankenkasse)' },
    { id: '3', label: 'IKK (Innungskrankenkasse)' },
    { id: '4', label: 'LKK (Landwirtschaftliche KK)' },
    { id: '6', label: 'Knappschaft' },
    { id: '8', label: 'Ersatzkasse (TK, Barmer, DAK...)' },
    { id: '9', label: 'Sonstige (SOKO)' },
  ];
  res.json(KASSENARTEN);
});
