import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { api } from "../../../services/api";

interface Leistung {
  id: number;
  bema_nr: string;
  bezeichnung: string;
  punkte: number;
  kategorie: string;
}

interface Position {
  bema_nr: string;
  bezeichnung: string;
  punkte: number;
  anzahl: number;
}

export function KVEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [leistungen, setLeistungen] = useState<Leistung[]>([]);
  const [positionen, setPositionen] = useState<Position[]>([]);

  const [patientName, setPatientName] = useState("");
  const [geburtsdatum, setGeburtsdatum] = useState("");
  const [versicherungsart, setVersicherungsart] = useState("GKV");
  const [kassenart, setKassenart] = useState("1");
  const [kigStufe, setKigStufe] = useState("");
  const [diagnose, setDiagnose] = useState("");

  const [selectedBema, setSelectedBema] = useState("");
  const [selectedAnzahl, setSelectedAnzahl] = useState(1);

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      api.getLeistungen(),
      api.getKV(Number(id)),
    ]).then(([leist, kv]) => {
      setLeistungen(leist);
      setPatientName(kv.patient_name);
      setGeburtsdatum(kv.patient_geburtsdatum ? kv.patient_geburtsdatum.split('T')[0] : "");
      setVersicherungsart(kv.versicherungsart);
      setKassenart(kv.kassenart || "1");
      setKigStufe(kv.kig_stufe || "");
      setDiagnose(kv.diagnose || "");

      const pos = typeof kv.positionen === 'string' ? JSON.parse(kv.positionen) : kv.positionen;
      setPositionen(pos.map((p: any) => ({
        bema_nr: p.bema_nr,
        bezeichnung: p.bezeichnung,
        punkte: p.punkte_einzeln,
        anzahl: p.anzahl,
      })));
    }).catch(() => setError("KV konnte nicht geladen werden"))
      .finally(() => setLoading(false));
  }, [id]);

  const addPosition = () => {
    const l = leistungen.find(l => l.bema_nr === selectedBema);
    if (!l) return;
    const existing = positionen.findIndex(p => p.bema_nr === selectedBema);
    if (existing >= 0) {
      const updated = [...positionen];
      updated[existing].anzahl += selectedAnzahl;
      setPositionen(updated);
    } else {
      setPositionen([...positionen, {
        bema_nr: l.bema_nr, bezeichnung: l.bezeichnung, punkte: l.punkte, anzahl: selectedAnzahl,
      }]);
    }
    setSelectedBema("");
    setSelectedAnzahl(1);
  };

  const removePosition = (index: number) => {
    setPositionen(positionen.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!patientName || positionen.length === 0) {
      setError("Patient und mindestens eine Position erforderlich.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await api.updateKV(Number(id), {
        patient_name: patientName,
        patient_geburtsdatum: geburtsdatum || null,
        versicherungsart,
        kassenart: versicherungsart === "GKV" ? kassenart : null,
        kig_stufe: kigStufe || null,
        diagnose: diagnose || null,
        positionen: positionen.map(p => ({ bema_nr: p.bema_nr, anzahl: p.anzahl })),
      });
      navigate(`/mitarbeiter/kv/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  const gesamtPunkte = positionen.reduce((sum, p) => sum + p.punkte * p.anzahl, 0);

  if (loading) return <p className="text-muted-foreground">Laden...</p>;

  return (
    <div className="max-w-4xl">
      <h1 className="text-xl sm:text-2xl font-bold text-primary mb-6">KV-{id} bearbeiten</h1>

      <div className="bg-card border rounded-xl p-4 sm:p-6 mb-6">
        <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-4">Patientendaten</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Patient *</label>
            <input value={patientName} onChange={(e) => setPatientName(e.target.value)}
              className="w-full py-2 px-3 rounded-lg border bg-input-background focus:border-accent focus:outline-none text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Geburtsdatum</label>
            <input type="date" value={geburtsdatum} onChange={(e) => setGeburtsdatum(e.target.value)}
              className="w-full py-2 px-3 rounded-lg border bg-input-background focus:border-accent focus:outline-none text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Versicherung *</label>
            <select value={versicherungsart} onChange={(e) => setVersicherungsart(e.target.value)}
              className="w-full py-2 px-3 rounded-lg border bg-input-background text-sm">
              <option value="GKV">Gesetzlich (GKV)</option>
              <option value="PKV">Privat (PKV)</option>
            </select>
          </div>
          {versicherungsart === "GKV" && (
            <>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Kassenart</label>
                <select value={kassenart} onChange={(e) => setKassenart(e.target.value)}
                  className="w-full py-2 px-3 rounded-lg border bg-input-background text-sm">
                  <option value="1">AOK</option>
                  <option value="2">BKK</option>
                  <option value="3">IKK</option>
                  <option value="4">LKK</option>
                  <option value="6">Knappschaft</option>
                  <option value="8">Ersatzkasse</option>
                  <option value="9">Sonstige</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">KIG-Stufe</label>
                <select value={kigStufe} onChange={(e) => setKigStufe(e.target.value)}
                  className="w-full py-2 px-3 rounded-lg border bg-input-background text-sm">
                  <option value="">-</option>
                  {[1, 2, 3, 4, 5].map(k => <option key={k} value={k}>KIG {k}</option>)}
                </select>
              </div>
            </>
          )}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-foreground mb-1">Diagnose</label>
            <textarea value={diagnose} onChange={(e) => setDiagnose(e.target.value)} rows={2}
              className="w-full py-2 px-3 rounded-lg border bg-input-background focus:border-accent focus:outline-none text-sm" />
          </div>
        </div>
      </div>

      <div className="bg-card border rounded-xl p-4 sm:p-6 mb-6">
        <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-4">Leistungspositionen</h2>
        <div className="flex gap-2 mb-4">
          <select value={selectedBema} onChange={(e) => setSelectedBema(e.target.value)}
            className="flex-1 py-2 px-3 rounded-lg border bg-input-background text-sm">
            <option value="">BEMA-Position wählen...</option>
            {leistungen.map((l) => (
              <option key={l.bema_nr} value={l.bema_nr}>
                {l.bema_nr} – {l.bezeichnung} ({l.punkte} Pkt.)
              </option>
            ))}
          </select>
          <input type="number" min={1} value={selectedAnzahl}
            onChange={(e) => setSelectedAnzahl(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-20 py-2 px-3 rounded-lg border bg-input-background text-sm text-center" />
          <button onClick={addPosition} disabled={!selectedBema}
            className="bg-accent text-accent-foreground px-4 py-2 rounded-lg font-medium text-sm disabled:opacity-50 hover:bg-accent/90">
            Hinzufügen
          </button>
        </div>

        {positionen.length === 0 ? (
          <p className="text-muted-foreground text-sm">Keine Positionen.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2">BEMA</th>
                <th className="py-2">Bezeichnung</th>
                <th className="py-2 text-right">Pkt.</th>
                <th className="py-2 text-right">Anz.</th>
                <th className="py-2 text-right">Gesamt</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {positionen.map((p, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="py-2 font-mono">{p.bema_nr}</td>
                  <td className="py-2">{p.bezeichnung}</td>
                  <td className="py-2 text-right">{p.punkte}</td>
                  <td className="py-2 text-right">{p.anzahl}×</td>
                  <td className="py-2 text-right font-medium">{p.punkte * p.anzahl}</td>
                  <td className="py-2 text-right">
                    <button onClick={() => removePosition(i)}
                      className="text-destructive hover:underline text-xs">Entfernen</button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-bold border-t">
                <td colSpan={4} className="py-2">Gesamt Punkte</td>
                <td className="py-2 text-right">{gesamtPunkte}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {error && (
        <div className="p-3 bg-destructive/10 text-destructive rounded-xl text-sm mb-4">{error}</div>
      )}

      <div className="flex gap-3">
        <button onClick={handleSave} disabled={saving}
          className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-semibold hover:bg-primary/90 disabled:opacity-50">
          {saving ? "Speichern..." : "Änderungen speichern"}
        </button>
        <button onClick={() => navigate(`/mitarbeiter/kv/${id}`)}
          className="bg-secondary text-secondary-foreground px-6 py-3 rounded-xl font-semibold hover:bg-secondary/80">
          Abbrechen
        </button>
      </div>
    </div>
  );
}
