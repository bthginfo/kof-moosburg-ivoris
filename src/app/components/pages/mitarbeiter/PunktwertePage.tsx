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

export function PunktwertePage() {
  const [punktwerte, setPunktwerte] = useState<Punktwert[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState("");

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
            <div className="bg-card border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
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
                    .map((p) => (
                      <tr key={p.id} className="border-b border-border/50 hover:bg-secondary/20">
                        <td className="px-4 py-2">
                          <span className="font-medium">{KK_LABELS[p.kassenart] || p.kassenart}</span>
                          <span className="text-xs text-muted-foreground ml-1">(KGr {p.kassengruppe})</span>
                        </td>
                        <td className="px-4 py-2 text-right font-mono">{p.pw_kch ? Number(p.pw_kch).toFixed(4) : '-'}</td>
                        <td className="px-4 py-2 text-right font-mono font-bold text-accent">{p.pw_kfo ? Number(p.pw_kfo).toFixed(4) : '-'}</td>
                        <td className="px-4 py-2 text-right font-mono">{p.pw_par ? Number(p.pw_par).toFixed(4) : '-'}</td>
                        <td className="px-4 py-2 text-right font-mono">{p.pw_ze ? Number(p.pw_ze).toFixed(4) : '-'}</td>
                      </tr>
                    ))}
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
