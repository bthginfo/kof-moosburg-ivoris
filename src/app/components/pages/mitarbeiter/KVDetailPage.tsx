import { useState, useEffect } from "react";
import { useParams, Link } from "react-router";
import { api } from "../../../services/api";

interface Position {
  bema_nr: string;
  bezeichnung: string;
  punkte_einzeln: number;
  anzahl: number;
  punkte_gesamt: number;
  euro: number;
}

interface KVDetail {
  id: number;
  patient_name: string;
  patient_geburtsdatum: string | null;
  versicherungsart: string;
  kassenart: string | null;
  kig_stufe: string | null;
  diagnose: string | null;
  positionen: Position[] | string;
  summe_punkte: number;
  summe_euro: number;
  eigenanteil: number;
  kassenanteil: number;
  quartal: string;
  status: string;
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

export function KVDetailPage() {
  const { id } = useParams();
  const [kv, setKv] = useState<KVDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    if (!id) return;
    setLoading(true);
    api.getKV(Number(id))
      .then(setKv)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const changeStatus = async (status: string) => {
    if (!id) return;
    await api.updateKVStatus(Number(id), status);
    load();
  };

  if (loading) return <p className="text-muted-foreground">Laden...</p>;
  if (!kv) return <p className="text-destructive">KV nicht gefunden.</p>;

  const positionen: Position[] = typeof kv.positionen === 'string'
    ? JSON.parse(kv.positionen) : kv.positionen;

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link to="/mitarbeiter/kostenvoranschlaege"
            className="text-muted-foreground hover:text-foreground text-sm">
            ← Zurück
          </Link>
          <h1 className="text-2xl font-bold text-primary">KV-{kv.id}</h1>
          <select
            value={kv.status}
            onChange={(e) => changeStatus(e.target.value)}
            className={`text-xs px-2 py-1 rounded-full font-medium border-0 cursor-pointer ${STATUS_COLORS[kv.status] || 'bg-gray-100'}`}
          >
            {STATUS_OPTIONS.map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <Link to={`/mitarbeiter/kv/${kv.id}/bearbeiten`}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary/90">
            Bearbeiten
          </Link>
          <a href={api.getKVPdfUrl(kv.id)} target="_blank" rel="noopener noreferrer"
            className="bg-accent text-accent-foreground px-4 py-2 rounded-xl text-sm font-medium hover:bg-accent/90">
            PDF
          </a>
        </div>
      </div>

      {/* Patient info */}
      <div className="bg-card border rounded-xl p-6 mb-6">
        <h2 className="font-semibold text-foreground mb-3">Patientendaten</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Patient</span>
            <p className="font-medium">{kv.patient_name}</p>
          </div>
          {kv.patient_geburtsdatum && (
            <div>
              <span className="text-muted-foreground">Geburtsdatum</span>
              <p className="font-medium">{new Date(kv.patient_geburtsdatum).toLocaleDateString('de-DE')}</p>
            </div>
          )}
          <div>
            <span className="text-muted-foreground">Versicherung</span>
            <p className="font-medium">{kv.versicherungsart}</p>
          </div>
          {kv.kassenart && (
            <div>
              <span className="text-muted-foreground">Kassenart</span>
              <p className="font-medium">{kv.kassenart}</p>
            </div>
          )}
          {kv.kig_stufe && (
            <div>
              <span className="text-muted-foreground">KIG-Stufe</span>
              <p className="font-medium">{kv.kig_stufe}</p>
            </div>
          )}
          <div>
            <span className="text-muted-foreground">Quartal</span>
            <p className="font-medium">{kv.quartal}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Erstellt am</span>
            <p className="font-medium">{new Date(kv.created_at).toLocaleDateString('de-DE')}</p>
          </div>
          {kv.erstellt_von_name && (
            <div>
              <span className="text-muted-foreground">Erstellt von</span>
              <p className="font-medium">{kv.erstellt_von_name}</p>
            </div>
          )}
        </div>
        {kv.diagnose && (
          <div className="mt-4 text-sm">
            <span className="text-muted-foreground">Diagnose</span>
            <p className="font-medium">{kv.diagnose}</p>
          </div>
        )}
      </div>

      {/* Positionen */}
      <div className="bg-card border rounded-xl p-6 mb-6">
        <h2 className="font-semibold text-foreground mb-3">Leistungspositionen</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-2">BEMA</th>
              <th className="py-2">Bezeichnung</th>
              <th className="py-2 text-right">Pkt.</th>
              <th className="py-2 text-right">Anz.</th>
              <th className="py-2 text-right">Gesamt</th>
              <th className="py-2 text-right">EUR</th>
            </tr>
          </thead>
          <tbody>
            {positionen.map((p, i) => (
              <tr key={i} className="border-b border-border/50">
                <td className="py-2 font-mono">{p.bema_nr}</td>
                <td className="py-2">{p.bezeichnung}</td>
                <td className="py-2 text-right">{p.punkte_einzeln}</td>
                <td className="py-2 text-right">{p.anzahl}×</td>
                <td className="py-2 text-right">{p.punkte_gesamt}</td>
                <td className="py-2 text-right">{p.euro.toFixed(2)} €</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Zusammenfassung */}
      <div className="bg-card border rounded-xl p-6">
        <h2 className="font-semibold text-foreground mb-3">Zusammenfassung</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Gesamtsumme</span>
            <span className="font-medium">{parseFloat(String(kv.summe_euro)).toFixed(2)} €</span>
          </div>
          {parseFloat(String(kv.kassenanteil)) > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Kassenanteil (ca. 80%)</span>
              <span className="font-medium text-green-600">-{parseFloat(String(kv.kassenanteil)).toFixed(2)} €</span>
            </div>
          )}
          <div className="flex justify-between border-t pt-2">
            <span className="font-semibold">Eigenanteil</span>
            <span className="font-bold text-lg text-accent">{parseFloat(String(kv.eigenanteil)).toFixed(2)} €</span>
          </div>
        </div>
      </div>
    </div>
  );
}
