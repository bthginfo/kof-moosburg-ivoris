import { useState, useEffect } from "react";
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

const STATUS_COLORS: Record<string, string> = {
  entwurf: 'bg-yellow-100 text-yellow-700',
  gesendet: 'bg-blue-100 text-blue-700',
  angenommen: 'bg-green-100 text-green-700',
  abgelehnt: 'bg-red-100 text-red-600',
};

export function KVListPage() {
  const [kvs, setKvs] = useState<KV[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getKVs()
      .then(setKvs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-primary">Kostenvoranschläge</h1>
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
        <div className="bg-card border rounded-xl overflow-hidden">
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
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[kv.status] || 'bg-gray-100'}`}>
                      {kv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(kv.created_at).toLocaleDateString('de-DE')}
                  </td>
                  <td className="px-4 py-3">
                    <a href={api.getKVPdfUrl(kv.id)} target="_blank" rel="noopener noreferrer"
                      className="text-accent hover:underline text-xs mr-2">
                      PDF
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
