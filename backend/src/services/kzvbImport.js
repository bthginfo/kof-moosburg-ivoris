import { query } from '../db/pool.js';

const KZVB_CSV_URL_TEMPLATE = 'https://www.kzvb.de/fileadmin/user_upload/Abrechnung/Punktwerte/11Q{Q}{YY}PWD.csv';

function getCurrentQuartal() {
  const now = new Date();
  const q = Math.ceil((now.getMonth() + 1) / 3);
  const yy = String(now.getFullYear()).slice(-2);
  return { q, yy, label: `${now.getFullYear()}Q${q}` };
}

function buildCsvUrl(q, yy) {
  return KZVB_CSV_URL_TEMPLATE.replace('{Q}', q).replace('{YY}', yy);
}

function parseCsvLine(line) {
  const fields = line.split(';');
  if (fields.length < 11) return null;
  return {
    kzv_nr: parseInt(fields[0], 10),
    quartal: fields[1],
    kassengruppe: parseInt(fields[2], 10),
    kassenart: fields[3],
    kk_nr_bkv: fields[4] || null,
    pw_kch: parseFloat(fields[5].replace(',', '.')) || null,
    pw_kfo: parseFloat(fields[6].replace(',', '.')) || null,
    pw_par: parseFloat(fields[7].replace(',', '.')) || null,
    pw_kbr: parseFloat(fields[8].replace(',', '.')) || null,
    pw_ze: parseFloat(fields[9].replace(',', '.')) || null,
    pw_ip: parseFloat(fields[10].replace(',', '.')) || null,
  };
}

export async function importPunktwerte(quartalOverride) {
  const { q, yy, label } = quartalOverride || getCurrentQuartal();
  const url = buildCsvUrl(q, yy);

  console.log(`[KZVB] Fetching CSV from: ${url}`);
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`CSV download failed: ${response.status} ${response.statusText}`);
  }

  const text = await response.text();
  const lines = text.trim().split(/\r?\n/);

  // Skip header
  const dataLines = lines.slice(1);
  let imported = 0;

  for (const line of dataLines) {
    const row = parseCsvLine(line);
    if (!row || !row.quartal) continue;

    await query(
      `INSERT INTO punktwerte (kzv_nr, quartal, kassengruppe, kassenart, kk_nr_bkv, pw_kch, pw_kfo, pw_par, pw_kbr, pw_ze, pw_ip)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (quartal, kassengruppe, kassenart)
       DO UPDATE SET pw_kch=$6, pw_kfo=$7, pw_par=$8, pw_kbr=$9, pw_ze=$10, pw_ip=$11, imported_at=NOW()`,
      [row.kzv_nr, row.quartal, row.kassengruppe, row.kassenart, row.kk_nr_bkv,
       row.pw_kch, row.pw_kfo, row.pw_par, row.pw_kbr, row.pw_ze, row.pw_ip]
    );
    imported++;
  }

  console.log(`[KZVB] Imported ${imported} Punktwert-Zeilen für ${label}`);
  return { quartal: label, imported };
}

// CLI: node src/services/kzvbImport.js
if (process.argv[1]?.endsWith('kzvbImport.js')) {
  import('dotenv/config').then(() => importPunktwerte().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
  }));
}
