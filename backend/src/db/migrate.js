import 'dotenv/config';
import { query } from './pool.js';

const SQL = `
-- Mitarbeiter / Admin Users
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'mitarbeiter',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- KZVB Punktwerte pro Quartal und Kassenart
CREATE TABLE IF NOT EXISTS punktwerte (
  id SERIAL PRIMARY KEY,
  kzv_nr INTEGER NOT NULL DEFAULT 11,
  quartal VARCHAR(10) NOT NULL,
  kassengruppe INTEGER NOT NULL,
  kassenart VARCHAR(5) NOT NULL,
  kk_nr_bkv VARCHAR(20),
  pw_kch NUMERIC(10,4),
  pw_kfo NUMERIC(10,4),
  pw_par NUMERIC(10,4),
  pw_kbr NUMERIC(10,4),
  pw_ze NUMERIC(10,4),
  pw_ip NUMERIC(10,4),
  imported_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(quartal, kassengruppe, kassenart)
);

-- BEMA KFO Leistungskatalog
CREATE TABLE IF NOT EXISTS leistungen (
  id SERIAL PRIMARY KEY,
  bema_nr VARCHAR(20) UNIQUE NOT NULL,
  bezeichnung TEXT NOT NULL,
  punkte NUMERIC(10,2) NOT NULL,
  kategorie VARCHAR(50) DEFAULT 'KFO',
  beschreibung TEXT,
  aktiv BOOLEAN DEFAULT true
);

-- Patientenanfragen aus dem öffentlichen Preisrechner
CREATE TABLE IF NOT EXISTS anfragen (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  telefon VARCHAR(50),
  versicherungsart VARCHAR(10) NOT NULL,
  kassenart VARCHAR(5),
  behandlungsart VARCHAR(100) NOT NULL,
  kig_stufe VARCHAR(10),
  geschaetzte_kosten_min NUMERIC(10,2),
  geschaetzte_kosten_max NUMERIC(10,2),
  nachricht TEXT,
  status VARCHAR(50) DEFAULT 'neu',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Kostenvoranschläge (Mitarbeiter-generiert)
CREATE TABLE IF NOT EXISTS kostenvoranschlaege (
  id SERIAL PRIMARY KEY,
  patient_name VARCHAR(255) NOT NULL,
  patient_geburtsdatum DATE,
  versicherungsart VARCHAR(10) NOT NULL,
  kassenart VARCHAR(5),
  kig_stufe VARCHAR(10),
  diagnose TEXT,
  positionen JSONB NOT NULL DEFAULT '[]',
  summe_punkte NUMERIC(10,2),
  summe_euro NUMERIC(10,2),
  eigenanteil NUMERIC(10,2),
  kassenanteil NUMERIC(10,2),
  quartal VARCHAR(10),
  erstellt_von INTEGER REFERENCES users(id),
  pdf_path TEXT,
  status VARCHAR(50) DEFAULT 'entwurf',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_punktwerte_quartal ON punktwerte(quartal);
CREATE INDEX IF NOT EXISTS idx_anfragen_status ON anfragen(status);
CREATE INDEX IF NOT EXISTS idx_kv_status ON kostenvoranschlaege(status);
`;

async function migrate() {
  console.log('Running migrations...');
  await query(SQL);
  console.log('Migrations complete.');
}

export { migrate };

// CLI mode
if (process.argv[1]?.endsWith('migrate.js')) {
  migrate().then(() => process.exit(0)).catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
}
