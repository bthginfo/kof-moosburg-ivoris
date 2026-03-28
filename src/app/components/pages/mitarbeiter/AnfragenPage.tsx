import { useState, useEffect } from "react";
import { api } from "../../../services/api";

interface Anfrage {
  id: number;
  name: string;
  email: string;
  telefon: string;
  versicherungsart: string;
  behandlungsart: string;
  kig_stufe: string;
  geschaetzte_kosten_min: number;
  geschaetzte_kosten_max: number;
  nachricht: string;
  status: string;
  created_at: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  neu: { label: 'Neu', color: 'bg-accent/20 text-accent' },
  in_bearbeitung: { label: 'In Bearbeitung', color: 'bg-blue-100 text-blue-700' },
  termin_vereinbart: { label: 'Termin vereinbart', color: 'bg-green-100 text-green-700' },
  abgeschlossen: { label: 'Abgeschlossen', color: 'bg-gray-100 text-gray-600' },
  storniert: { label: 'Storniert', color: 'bg-red-100 text-red-600' },
};

export function AnfragenPage() {
  const [anfragen, setAnfragen] = useState<Anfrage[]>([]);
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.getAnfragen(filter || undefined)
      .then(setAnfragen)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filter]);

  const updateStatus = async (id: number, status: string) => {
    await api.updateAnfrageStatus(id, status);
    load();
  };

  const deleteAnfrage = async (id: number) => {
    if (!confirm('Anfrage wirklich löschen?')) return;
    await api.deleteAnfrage(id);
    load();
  };

  const filtered = anfragen.filter(a => {
    if (!search) return true;
    const s = search.toLowerCase();
    return a.name.toLowerCase().includes(s) ||
      a.email?.toLowerCase().includes(s) ||
      a.telefon?.includes(s);
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-primary">Anfragen</h1>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Suche nach Name, Email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="py-2 px-3 rounded-lg border bg-card text-sm w-full sm:w-48"
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="py-2 px-3 rounded-lg border bg-card text-sm"
          >
            <option value="">Alle</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Laden...</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground">Keine Anfragen gefunden.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => (
            <div key={a.id} className="bg-card border rounded-xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-foreground">{a.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_LABELS[a.status]?.color || 'bg-gray-100'}`}>
                      {STATUS_LABELS[a.status]?.label || a.status}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {a.behandlungsart} | {a.versicherungsart}
                    {a.kig_stufe ? ` | KIG ${a.kig_stufe}` : ''}
                  </p>
                  {a.geschaetzte_kosten_min > 0 && (
                    <p className="text-sm text-accent font-medium mt-1">
                      Indikation: {a.geschaetzte_kosten_min.toFixed(0)} – {a.geschaetzte_kosten_max.toFixed(0)} €
                    </p>
                  )}
                  {a.email && <p className="text-xs text-muted-foreground mt-1">📧 {a.email}</p>}
                  {a.telefon && <p className="text-xs text-muted-foreground">📱 {a.telefon}</p>}
                  {a.nachricht && <p className="text-sm text-foreground mt-2 italic">„{a.nachricht}"</p>}
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(a.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  {a.status === 'neu' && (
                    <button onClick={() => updateStatus(a.id, 'in_bearbeitung')}
                      className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200">
                      Bearbeiten
                    </button>
                  )}
                  {a.status === 'in_bearbeitung' && (
                    <button onClick={() => updateStatus(a.id, 'termin_vereinbart')}
                      className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200">
                      Termin
                    </button>
                  )}
                  {a.status !== 'abgeschlossen' && a.status !== 'storniert' && (
                    <button onClick={() => updateStatus(a.id, 'abgeschlossen')}
                      className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded hover:bg-gray-200">
                      Abschließen
                    </button>
                  )}
                  <button onClick={() => deleteAnfrage(a.id)}
                    className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded hover:bg-red-100">
                    Löschen
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
