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
  entwurf: 'bg-amber-100 text-amber-700',
  gesendet: 'bg-blue-100 text-blue-700',
  angenommen: 'bg-emerald-100 text-emerald-700',
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
        <div><h1 className="text-xl sm:text-2xl font-bold text-[#063255]">Kostenvoranschläge</h1><p className="text-sm text-gray-500 mt-0.5">Alle erstellten KVs im Überblick</p></div>
        <a href="/mitarbeiter/kv-erstellen"
          className="inline-flex items-center justify-center gap-2 bg-[#f58a07] text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#e07d06] transition-colors shadow-sm w-full sm:w-auto">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg> Neuer KV
        </a>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><div className="w-6 h-6 border-2 border-[#063255] border-t-transparent rounded-full animate-spin" /></div>
      ) : kvs.length === 0 ? (
        <div className="text-center py-12 text-gray-400"><p className="text-sm">Noch keine Kostenvoranschläge erstellt.</p></div>
      ) : (
        <>
          {/* Mobile: Cards */}
          <div className="md:hidden space-y-3">
            {kvs.map((kv) => (
              <div key={kv.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
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
                <p className="font-semibold text-foreground break-words">{kv.patient_name}</p>
                <p className="text-sm text-muted-foreground">{kv.versicherungsart} | {new Date(kv.created_at).toLocaleDateString('de-DE')}</p>
                <div className="flex items-center justify-between mt-2">
                  <div>
                    <span className="text-xs text-muted-foreground">Eigenanteil: </span>
                    <span className="font-bold text-accent">{parseFloat(String(kv.eigenanteil)).toFixed(2)} €</span>
                  </div>
                  <div className="flex gap-3 shrink-0">
                    <Link to={`/mitarbeiter/kv/${kv.id}`} className="text-primary hover:underline text-sm">Details</Link>
                    <a href={api.getKVPdfUrl(kv.id)} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline text-sm">PDF</a>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: Table */}
          <div className="hidden md:block bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80 text-gray-500 text-left">
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
                  <tr key={kv.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
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
