import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { query } from './pool.js';

// BEMA KFO Leistungskatalog – die gängigsten KFO-Positionen
const LEISTUNGEN = [
  { bema_nr: '119a', bezeichnung: 'Eingliedern eines Aktivators oder eines vergleichbaren Gerätes', punkte: 90, kategorie: 'KFO' },
  { bema_nr: '119b', bezeichnung: 'Eingliedern eines Aktivators mit Vorschubschlaufe', punkte: 110, kategorie: 'KFO' },
  { bema_nr: '119c', bezeichnung: 'Eingliedern einer Dehnplatte oder vergleichbaren Gerätes', punkte: 70, kategorie: 'KFO' },
  { bema_nr: '119d', bezeichnung: 'Eingliedern einer Oberkiefer-/Unterkieferplatte', punkte: 55, kategorie: 'KFO' },
  { bema_nr: '119e', bezeichnung: 'Eingliedern einer Platte mit Schrauben oder Federn', punkte: 80, kategorie: 'KFO' },
  { bema_nr: '119f', bezeichnung: 'Eingliedern von Teilbögen oder Sektionalbögen', punkte: 45, kategorie: 'KFO' },
  { bema_nr: '120', bezeichnung: 'Eingliederung einer festsitzenden Apparatur (MB, je Kiefer)', punkte: 175, kategorie: 'KFO' },
  { bema_nr: '121', bezeichnung: 'Kontrolle/Nachbehandlung KFO (je Sitzung)', punkte: 25, kategorie: 'KFO' },
  { bema_nr: '122', bezeichnung: 'Maßnahmen zur Retention (je Kiefer)', punkte: 60, kategorie: 'KFO' },
  { bema_nr: '123', bezeichnung: 'Reparatur einer herausnehmbaren Apparatur', punkte: 30, kategorie: 'KFO' },
  { bema_nr: '124', bezeichnung: 'Wiedereinsetzen eines Brackets oder Bandes', punkte: 15, kategorie: 'KFO' },
  { bema_nr: '125', bezeichnung: 'Entfernung der festsitzenden Apparatur (je Kiefer)', punkte: 40, kategorie: 'KFO' },
  { bema_nr: '126', bezeichnung: 'Abdrucknahme / Modell für KFO-Diagnostik', punkte: 35, kategorie: 'KFO' },
  { bema_nr: '127', bezeichnung: 'Photographische Dokumentation', punkte: 15, kategorie: 'KFO' },
  { bema_nr: '128', bezeichnung: 'Fernröntgen-Auswertung (FRS)', punkte: 60, kategorie: 'KFO' },
  { bema_nr: '6', bezeichnung: 'Beratung (eingehend, auch fernmündlich)', punkte: 15, kategorie: 'Allgemein' },
  { bema_nr: '1', bezeichnung: 'Eingehende Untersuchung', punkte: 20, kategorie: 'Allgemein' },
  { bema_nr: 'Ä925', bezeichnung: 'Orthopantomogramm (OPG)', punkte: 25, kategorie: 'Röntgen' },
  { bema_nr: 'Ä935a', bezeichnung: 'Fernröntgenseitenbild (FRS)', punkte: 20, kategorie: 'Röntgen' },
];

async function seed() {
  console.log('Seeding database...');

  // Admin user
  const email = process.env.ADMIN_EMAIL || 'admin@kfo-moosburg.de';
  const password = process.env.ADMIN_PASSWORD || 'changeme123';
  const hash = await bcrypt.hash(password, 12);

  await query(
    `INSERT INTO users (email, password_hash, name, role)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO UPDATE SET password_hash = $2`,
    [email, hash, 'Admin', 'admin']
  );
  console.log(`Admin user created: ${email}`);

  // Leistungen
  for (const l of LEISTUNGEN) {
    await query(
      `INSERT INTO leistungen (bema_nr, bezeichnung, punkte, kategorie)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (bema_nr) DO UPDATE SET bezeichnung = $2, punkte = $3, kategorie = $4`,
      [l.bema_nr, l.bezeichnung, l.punkte, l.kategorie]
    );
  }
  console.log(`${LEISTUNGEN.length} BEMA-Leistungen seeded.`);

  console.log('Seed complete.');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
