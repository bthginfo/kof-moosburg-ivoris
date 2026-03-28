import { useState, useEffect } from "react";
import { api } from "../../../services/api";

interface Leistung {
  id: number;
  bema_nr: string;
  bezeichnung: string;
  punkte: number;
  kategorie: string;
  aktiv: boolean;
}

export function LeistungenPage() {
  const [leistungen, setLeistungen] = useState<Leistung[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<number | null>(null);
  const [showNew, setShowNew] = useState(false);

  // Form state
  const [formBema, setFormBema] = useState("");
  const [formBezeichnung, setFormBezeichnung] = useState("");
  const [formPunkte, setFormPunkte] = useState("");
  const [formKategorie, setFormKategorie] = useState("KFO");
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    api.getLeistungen()
      .then(setLeistungen)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setFormBema("");
    setFormBezeichnung("");
    setFormPunkte("");
    setFormKategorie("KFO");
    setEditId(null);
    setShowNew(false);
    setError("");
  };

  const startEdit = (l: Leistung) => {
    setEditId(l.id);
    setShowNew(false);
    setFormBema(l.bema_nr);
    setFormBezeichnung(l.bezeichnung);
    setFormPunkte(String(l.punkte));
    setFormKategorie(l.kategorie);
    setError("");
  };

  const startNew = () => {
    setEditId(null);
    setShowNew(true);
    setFormBema("");
    setFormBezeichnung("");
    setFormPunkte("");
    setFormKategorie("KFO");
    setError("");
  };

  const handleSave = async () => {
    if (!formBema || !formBezeichnung || !formPunkte) {
      setError("Alle Felder müssen ausgefüllt sein.");
      return;
    }
    setError("");
    try {
      if (editId) {
        await api.updateLeistung(editId, {
          bezeichnung: formBezeichnung,
          punkte: parseFloat(formPunkte),
          kategorie: formKategorie,
        });
      } else {
        await api.createLeistung({
          bema_nr: formBema,
          bezeichnung: formBezeichnung,
          punkte: parseFloat(formPunkte),
          kategorie: formKategorie,
        });
      }
      resetForm();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Speichern");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Leistung wirklich löschen?')) return;
    try {
      await api.deleteLeistung(id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Löschen");
    }
  };

  const toggleAktiv = async (l: Leistung) => {
    await api.updateLeistung(l.id, { aktiv: !l.aktiv });
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-primary">BEMA-Leistungen</h1>
        <button onClick={startNew}
          className="bg-accent text-accent-foreground px-4 py-2 rounded-xl font-medium text-sm hover:bg-accent/90">
          + Neue Leistung
        </button>
      </div>

      {(showNew || editId) && (
        <div className="bg-card border rounded-xl p-4 mb-6">
          <h2 className="font-semibold text-foreground mb-3">
            {editId ? 'Leistung bearbeiten' : 'Neue Leistung'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">BEMA-Nr. *</label>
              <input value={formBema} onChange={(e) => setFormBema(e.target.value)}
                disabled={!!editId}
                className="w-full py-2 px-3 rounded-lg border bg-input-background text-sm disabled:opacity-50" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Bezeichnung *</label>
              <input value={formBezeichnung} onChange={(e) => setFormBezeichnung(e.target.value)}
                className="w-full py-2 px-3 rounded-lg border bg-input-background text-sm" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Punkte *</label>
              <input type="number" step="0.01" value={formPunkte} onChange={(e) => setFormPunkte(e.target.value)}
                className="w-full py-2 px-3 rounded-lg border bg-input-background text-sm" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Kategorie</label>
              <input value={formKategorie} onChange={(e) => setFormKategorie(e.target.value)}
                className="w-full py-2 px-3 rounded-lg border bg-input-background text-sm" />
            </div>
          </div>
          {error && <p className="text-destructive text-sm mt-2">{error}</p>}
          <div className="flex gap-2 mt-3">
            <button onClick={handleSave}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90">
              Speichern
            </button>
            <button onClick={resetForm}
              className="bg-secondary text-secondary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-secondary/80">
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-muted-foreground">Laden...</p>
      ) : (
        <div className="bg-card border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-secondary/50 text-muted-foreground text-left">
                <th className="px-4 py-3">BEMA-Nr.</th>
                <th className="px-4 py-3">Bezeichnung</th>
                <th className="px-4 py-3 text-right">Punkte</th>
                <th className="px-4 py-3">Kategorie</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {leistungen.map((l) => (
                <tr key={l.id} className={`border-b hover:bg-secondary/20 ${!l.aktiv ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 font-mono">{l.bema_nr}</td>
                  <td className="px-4 py-3">{l.bezeichnung}</td>
                  <td className="px-4 py-3 text-right">{l.punkte}</td>
                  <td className="px-4 py-3">{l.kategorie}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleAktiv(l)}
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${l.aktiv ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {l.aktiv ? 'Aktiv' : 'Inaktiv'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => startEdit(l)}
                        className="text-primary hover:underline text-xs">Bearbeiten</button>
                      <button onClick={() => handleDelete(l.id)}
                        className="text-destructive hover:underline text-xs">Löschen</button>
                    </div>
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
