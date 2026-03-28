import { useState, useEffect } from "react";
import { Link } from "react-router";
import { api } from "../../../services/api";

interface KV {
  id: number;
  patient_name: string;
  versicherungsart: string;
  summe_euro: number;
  eigenanteil: number;
  status: string;
  quartal: string;
  erstellt_von_name: string;
  created_at: string;
}

const STATUS_OPTIONS = ['entwurf', 'gesendet', 'angenommen', 'abgelehnt'] as const;

const STATUS_COLORS: Record<string, string> = {
  entwurf: 'bg-yellow-100 text-yellow-700',
  gesendet: 'bg-blue-100 text-blue-700',
  angenommen: 'bg-green-100 text-green-700',
  abgelehnt: 'bg-red-100 text-red-600',
};

export function KVListPage() {
  const [kvs, setKvs] = useState<KV[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.getKVs()
      .then(setKvs)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const changeStatus = async (id: number, status: string) => {
    await api.updateKVStatus(id, status);
    load();
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-primary">Kostenvoranschläge</h1>
        <a href="/mitarbeiter/kv-erstellen"
          className="bg-accent text-accent-foreground px-4 py-2 rounded-xl font-medium text-sm hover:bg-accent/90 transition-colors">
          + Neuer KV
        </a>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Laden...</p>
      ) : kvs.length === 0 ? (
        <p className="text-muted-foreground">Noch keine Kostenvoranschläge erstellt.</p>
      ) : (
        <>
          {/* Mobile: Cards */}
          <div className="md:hidden space-y-3">
            {kvs.map((kv) => (
              <div key={kv.id} className="bg-card border rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-sm text-muted-foreground">KV-{kv.id}</span>
                  <select
                    value={kv.status}
                    onChange={(e) => changeStatus(kv.id, e.target.value)}
                    className={`text-xs px-2 py-1 rounded-full font-medium border-0 cursor-pointer ${STATUS_COLORS[kv.status] || 'bg-gray-100'}`}
                  >
                    {STATUS_OPTIONS.map(s => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <p className="font-semibold text-foreground">{kv.patient_name}</p>
                <p className="text-sm text-muted-foreground">{kv.versicherungsart} | {new Date(kv.created_at).toLocaleDateString('de-DE')}</p>
                <div className="flex items-center justify-between mt-2">
                  <div>
                    <span className="text-xs text-muted-foreground">Eigenanteil: </span>
                    <span className="font-bold text-accent">{parseFloat(String(kv.eigenanteil)).toFixed(2)} €</span>
                  </div>
                  <div className="flex gap-3">
                    <Link to={`/mitarbeiter/kv/${kv.id}`} className="text-primary hover:underline text-sm">Details</Link>
                    <a href={api.getKVPdfUrl(kv.id)} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline text-sm">PDF</a>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: Table */}
          <div className="hidden md:block bg-card border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-secondary/50 text-muted-foreground text-left">
                  <th className="px-4 py-3">Nr.</th>
                  <th className="px-4 py-3">Patient</th>
                  <th className="px-4 py-3">Vers.</th>
                  <th className="px-4 py-3 text-right">Gesamt</th>
                  <th className="px-4 py-3 text-right">Eigenanteil</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Datum</th>
                  <th className="px-4 py-3">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {kvs.map((kv) => (
                  <tr key={kv.id} className="border-b hover:bg-secondary/20">
                    <td className="px-4 py-3 font-mono">KV-{kv.id}</td>
                    <td className="px-4 py-3 font-medium">{kv.patient_name}</td>
                    <td className="px-4 py-3">{kv.versicherungsart}</td>
                    <td className="px-4 py-3 text-right">{parseFloat(String(kv.summe_euro)).toFixed(2)} €</td>
                    <td className="px-4 py-3 text-right font-medium">{parseFloat(String(kv.eigenanteil)).toFixed(2)} €</td>
                    <td className="px-4 py-3">
                      <select
                        value={kv.status}
                        onChange={(e) => changeStatus(kv.id, e.target.value)}
                        className={`text-xs px-2 py-1 rounded-full font-medium border-0 cursor-pointer ${STATUS_COLORS[kv.status] || 'bg-gray-100'}`}
                      >
                        {STATUS_OPTIONS.map(s => (
                          <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(kv.created_at).toLocaleDateString('de-DE')}
                    </td>
                    <td className="px-4 py-3 flex gap-2">
                      <Link to={`/mitarbeiter/kv/${kv.id}`}
                        className="text-primary hover:underline text-xs">
                        Details
                      </Link>
                      <a href={api.getKVPdfUrl(kv.id)} target="_blank" rel="noopener noreferrer"
                        className="text-accent hover:underline text-xs">
                        PDF
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
