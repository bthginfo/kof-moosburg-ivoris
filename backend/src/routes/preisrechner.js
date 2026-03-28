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

// GET /api/preisrechner/kassenarten – verfügbare Kassenarten mit konkreten Namen
preisrechnerRouter.get('/kassenarten', async (_req, res) => {
  // Jede Kasse wird auf ihre KZVB-Kassenart (Abrechnungsgruppe) gemapped,
  // da die Punktwerte pro Gruppe gelten, nicht pro Einzelkasse.
  const KASSENARTEN = [
    // Kassenart 1 – AOK
    { id: '1', label: 'AOK Bayern', gruppe: 'AOK' },
    { id: '1', label: 'AOK Baden-Württemberg', gruppe: 'AOK' },
    { id: '1', label: 'AOK Niedersachsen', gruppe: 'AOK' },
    { id: '1', label: 'AOK Nordost', gruppe: 'AOK' },
    { id: '1', label: 'AOK Nordwest', gruppe: 'AOK' },
    { id: '1', label: 'AOK Plus (Sachsen/Thüringen)', gruppe: 'AOK' },
    { id: '1', label: 'AOK Rheinland/Hamburg', gruppe: 'AOK' },
    { id: '1', label: 'AOK Rheinland-Pfalz/Saarland', gruppe: 'AOK' },
    { id: '1', label: 'AOK Sachsen-Anhalt', gruppe: 'AOK' },
    { id: '1', label: 'AOK Hessen', gruppe: 'AOK' },
    { id: '1', label: 'AOK Bremen/Bremerhaven', gruppe: 'AOK' },
    // Kassenart 2 – BKK
    { id: '2', label: 'BKK Mobil Oil', gruppe: 'BKK' },
    { id: '2', label: 'BKK VBU', gruppe: 'BKK' },
    { id: '2', label: 'BKK Pronova', gruppe: 'BKK' },
    { id: '2', label: 'BKK firmus', gruppe: 'BKK' },
    { id: '2', label: 'BKK Gildemeister Seidensticker', gruppe: 'BKK' },
    { id: '2', label: 'BKK Linde', gruppe: 'BKK' },
    { id: '2', label: 'BKK Pfalz', gruppe: 'BKK' },
    { id: '2', label: 'BKK Scheufelen', gruppe: 'BKK' },
    { id: '2', label: 'BKK Technoform', gruppe: 'BKK' },
    { id: '2', label: 'BKK ZF & Partner', gruppe: 'BKK' },
    { id: '2', label: 'Audi BKK', gruppe: 'BKK' },
    { id: '2', label: 'BMW BKK', gruppe: 'BKK' },
    { id: '2', label: 'Bosch BKK', gruppe: 'BKK' },
    { id: '2', label: 'Continental BKK', gruppe: 'BKK' },
    { id: '2', label: 'Daimler BKK', gruppe: 'BKK' },
    { id: '2', label: 'Die Schwenninger BKK', gruppe: 'BKK' },
    { id: '2', label: 'energie BKK', gruppe: 'BKK' },
    { id: '2', label: 'Heimat Krankenkasse', gruppe: 'BKK' },
    { id: '2', label: 'Novitas BKK', gruppe: 'BKK' },
    { id: '2', label: 'R+V BKK', gruppe: 'BKK' },
    { id: '2', label: 'Salus BKK', gruppe: 'BKK' },
    { id: '2', label: 'SBK (Siemens BKK)', gruppe: 'BKK' },
    { id: '2', label: 'Viactiv Krankenkasse', gruppe: 'BKK' },
    { id: '2', label: 'vivida BKK', gruppe: 'BKK' },
    { id: '2', label: 'WMF BKK', gruppe: 'BKK' },
    { id: '2', label: 'Andere BKK', gruppe: 'BKK' },
    // Kassenart 3 – IKK
    { id: '3', label: 'IKK classic', gruppe: 'IKK' },
    { id: '3', label: 'IKK Südwest', gruppe: 'IKK' },
    { id: '3', label: 'IKK gesund plus', gruppe: 'IKK' },
    { id: '3', label: 'IKK Brandenburg und Berlin', gruppe: 'IKK' },
    // Kassenart 4 – LKK
    { id: '4', label: 'SVLFG (Landwirtschaftliche KK)', gruppe: 'LKK' },
    // Kassenart 6 – Knappschaft
    { id: '6', label: 'Knappschaft', gruppe: 'Knappschaft' },
    // Kassenart 8 – Ersatzkassen
    { id: '8', label: 'Techniker Krankenkasse (TK)', gruppe: 'Ersatzkasse' },
    { id: '8', label: 'BARMER', gruppe: 'Ersatzkasse' },
    { id: '8', label: 'DAK-Gesundheit', gruppe: 'Ersatzkasse' },
    { id: '8', label: 'KKH Kaufmännische Krankenkasse', gruppe: 'Ersatzkasse' },
    { id: '8', label: 'HEK – Hanseatische Krankenkasse', gruppe: 'Ersatzkasse' },
    { id: '8', label: 'hkk Krankenkasse', gruppe: 'Ersatzkasse' },
    // Kassenart 9 – Sonstige
    { id: '9', label: 'BAHN-BKK', gruppe: 'Sonstige' },
    { id: '9', label: 'BKK Dachverband', gruppe: 'Sonstige' },
    { id: '9', label: 'Andere gesetzliche Krankenkasse', gruppe: 'Sonstige' },
  ];

  // Gruppiert nach Kategorie zurückgeben
  const grouped = {};
  for (const k of KASSENARTEN) {
    if (!grouped[k.gruppe]) grouped[k.gruppe] = [];
    grouped[k.gruppe].push({ id: k.id, label: k.label });
  }

  res.json({ flat: KASSENARTEN, grouped });
});
