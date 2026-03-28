import { useState, useEffect } from "react";
import { api } from "../../../services/api";

interface Punktwert {
  id: number;
  quartal: string;
  kassengruppe: number;
  kassenart: string;
  pw_kch: number;
  pw_kfo: number;
  pw_par: number;
  pw_ze: number;
  imported_at: string;
}

const KK_LABELS: Record<string, string> = {
  '1': 'AOK', '2': 'BKK', '3': 'IKK', '4': 'LKK',
  '6': 'Knappschaft', '8': 'Ersatzkasse', '9': 'SOKO',
  'B': 'BAS', 'D': 'DRV', 'F': 'Fremdkassen',
};

// Mapping: Kassenart-ID → Liste konkreter Krankenkassen
const KK_DETAILS: Record<string, string[]> = {
  '1': ['AOK Bayern', 'AOK Baden-Württemberg', 'AOK Niedersachsen', 'AOK Nordost', 'AOK Nordwest', 'AOK Plus (Sachsen/Thüringen)', 'AOK Rheinland/Hamburg', 'AOK Rheinland-Pfalz/Saarland', 'AOK Sachsen-Anhalt', 'AOK Hessen', 'AOK Bremen/Bremerhaven'],
  '2': ['Audi BKK', 'BMW BKK', 'Bosch BKK', 'Continental BKK', 'Daimler BKK', 'Die Schwenninger BKK', 'energie BKK', 'Heimat Krankenkasse', 'Novitas BKK', 'BKK Mobil Oil', 'BKK VBU', 'BKK Pronova', 'BKK firmus', 'BKK Pfalz', 'R+V BKK', 'Salus BKK', 'SBK (Siemens BKK)', 'Viactiv Krankenkasse', 'vivida BKK', 'WMF BKK', 'u.a.'],
  '3': ['IKK classic', 'IKK Südwest', 'IKK gesund plus', 'IKK Brandenburg und Berlin'],
  '4': ['SVLFG (Landwirtschaftliche KK)'],
  '6': ['Knappschaft-Bahn-See'],
  '8': ['Techniker Krankenkasse (TK)', 'BARMER', 'DAK-Gesundheit', 'KKH Kaufmännische Krankenkasse', 'HEK – Hanseatische KK', 'hkk Krankenkasse'],
  '9': ['BAHN-BKK', 'BKK Dachverband', 'Sonstige Kostenträger'],
};

export function PunktwertePage() {
  const [punktwerte, setPunktwerte] = useState<Punktwert[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    api.getPunktwerte()
      .then(setPunktwerte)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleImport = async () => {
    setImporting(true);
    setMessage("");
    try {
      const result = await api.importPunktwerte();
      setMessage(`Import erfolgreich: ${result.imported} Zeilen für ${result.quartal}`);
      const data = await api.getPunktwerte();
      setPunktwerte(data);
    } catch {
      setMessage("Import fehlgeschlagen.");
    } finally {
      setImporting(false);
    }
  };

  // Gruppierung nach Quartal
  const quartale = [...new Set(punktwerte.map(p => p.quartal))].sort().reverse();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-primary">KZVB Punktwerte</h1>
        <button onClick={handleImport} disabled={importing}
          className="bg-accent text-accent-foreground px-4 py-2 rounded-xl font-medium text-sm hover:bg-accent/90 disabled:opacity-50">
          {importing ? "Importiere..." : "Aktuelles Quartal importieren"}
        </button>
      </div>

      {message && (
        <div className="p-3 bg-primary/10 text-primary rounded-xl text-sm mb-4">{message}</div>
      )}

      {loading ? (
        <p className="text-muted-foreground">Laden...</p>
      ) : punktwerte.length === 0 ? (
        <div className="bg-card border rounded-xl p-8 text-center">
          <p className="text-muted-foreground mb-4">Noch keine Punktwerte importiert.</p>
          <button onClick={handleImport} disabled={importing}
            className="bg-accent text-accent-foreground px-6 py-3 rounded-xl font-semibold hover:bg-accent/90">
            Jetzt von KZVB importieren
          </button>
        </div>
      ) : (
        quartale.map((q) => (
          <div key={q} className="mb-6">
            <h2 className="font-semibold text-lg text-foreground mb-2">Quartal {q}</h2>
            <div className="bg-card border rounded-xl overflow-x-auto">
              <table className="w-full text-sm min-w-[500px]">
                <thead>
                  <tr className="border-b bg-secondary/50 text-muted-foreground text-left">
                    <th className="px-4 py-2">Kassenart</th>
                    <th className="px-4 py-2 text-right">KCH</th>
                    <th className="px-4 py-2 text-right font-bold text-accent">KFO</th>
                    <th className="px-4 py-2 text-right">PAR</th>
                    <th className="px-4 py-2 text-right">ZE</th>
                  </tr>
                </thead>
                <tbody>
                  {punktwerte
                    .filter(p => p.quartal === q)
                    .map((p) => {
                      const key = `${q}-${p.kassenart}`;
                      const details = KK_DETAILS[p.kassenart];
                      const isExpanded = expanded[key];
                      return (
                        <>
                          <tr
                            key={p.id}
                            className={`border-b border-border/50 hover:bg-secondary/20 ${details ? 'cursor-pointer' : ''}`}
                            onClick={() => details && setExpanded(prev => ({ ...prev, [key]: !prev[key] }))}
                          >
                            <td className="px-4 py-2">
                              <div className="flex items-center gap-1.5">
                                {details && (
                                  <svg className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                )}
                                <span className="font-medium">{KK_LABELS[p.kassenart] || p.kassenart}</span>
                                <span className="text-xs text-muted-foreground ml-1">(KGr {p.kassengruppe})</span>
                              </div>
                            </td>
                            <td className="px-4 py-2 text-right font-mono">{p.pw_kch ? Number(p.pw_kch).toFixed(4) : '-'}</td>
                            <td className="px-4 py-2 text-right font-mono font-bold text-accent">{p.pw_kfo ? Number(p.pw_kfo).toFixed(4) : '-'}</td>
                            <td className="px-4 py-2 text-right font-mono">{p.pw_par ? Number(p.pw_par).toFixed(4) : '-'}</td>
                            <td className="px-4 py-2 text-right font-mono">{p.pw_ze ? Number(p.pw_ze).toFixed(4) : '-'}</td>
                          </tr>
                          {isExpanded && details && (
                            <tr key={`${p.id}-details`} className="border-b border-border/30 bg-secondary/30">
                              <td colSpan={5} className="px-4 py-2">
                                <div className="pl-5 text-xs text-muted-foreground">
                                  <span className="font-medium text-foreground/70">Enthaltene Krankenkassen:</span>{' '}
                                  {details.join(' · ')}
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}

      <div className="mt-4 text-xs text-muted-foreground">
        Quelle: KZVB – Kassenzahnärztliche Vereinigung Bayerns (kzvb.de/abrechnung/punktwerte)
      </div>
    </div>
  );
}
