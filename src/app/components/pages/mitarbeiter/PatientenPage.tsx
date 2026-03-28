import { useState, useEffect } from "react";
import { api } from "../../../services/api";
import { SearchableSelect } from "../../ui/SearchableSelect";

interface Patient {
  id: number;
  patient_name: string;
  vorname: string;
  nachname: string;
  geburtsdatum: string | null;
  versicherungsart: string;
  kassenart: string;
  telefon: string;
  email: string;
  notizen: string;
  created_at: string;
}

interface KassenartenGrouped {
  [gruppe: string]: { id: string; label: string }[];
}

export function PatientenPage() {
  const [patienten, setPatienten] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [kassenarten, setKassenarten] = useState<KassenartenGrouped>({});

  // Form
  const [formVorname, setFormVorname] = useState("");
  const [formNachname, setFormNachname] = useState("");
  const [formGeb, setFormGeb] = useState("");
  const [formVers, setFormVers] = useState("GKV");
  const [formKasse, setFormKasse] = useState("");
  const [formTel, setFormTel] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formNotizen, setFormNotizen] = useState("");

  const load = () => {
    setLoading(true);
    api.getPatienten()
      .then(setPatienten)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    api.getKassenarten()
      .then((data: { grouped: KassenartenGrouped }) => setKassenarten(data.grouped))
      .catch(() => {});
  }, []);

  const kassenOptions = Object.entries(kassenarten).flatMap(([gruppe, kassen]) =>
    kassen.map((k) => ({ value: k.id, label: k.label, gruppe }))
  );

  const resetForm = () => {
    setShowForm(false);
    setEditId(null);
    setFormVorname(""); setFormNachname(""); setFormGeb(""); setFormVers("GKV"); setFormKasse("");
    setFormTel(""); setFormEmail(""); setFormNotizen(""); setError("");
  };

  const startNew = () => {
    resetForm();
    setShowForm(true);
  };

  const startEdit = (p: Patient) => {
    setEditId(p.id);
    setShowForm(true);
    setFormVorname(p.vorname || "");
    setFormNachname(p.nachname || "");
    setFormGeb(p.geburtsdatum ? p.geburtsdatum.split("T")[0] : "");
    setFormVers(p.versicherungsart);
    setFormKasse(p.kassenart);
    setFormTel(p.telefon);
    setFormEmail(p.email);
    setFormNotizen(p.notizen);
    setError("");
  };

  const handleSave = async () => {
    if (!formNachname.trim() && !formVorname.trim()) { setError("Vor- oder Nachname ist erforderlich."); return; }
    setError("");
    try {
      const data = {
        vorname: formVorname,
        nachname: formNachname,
        geburtsdatum: formGeb || null,
        versicherungsart: formVers,
        kassenart: formKasse,
        telefon: formTel,
        email: formEmail,
        notizen: formNotizen,
      };
      if (editId) {
        await api.updatePatient(editId, data);
      } else {
        await api.createPatient(data);
      }
      resetForm();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Speichern");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Patient wirklich löschen?")) return;
    try {
      await api.deletePatient(id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Löschen");
    }
  };

  const filtered = patienten.filter(p => {
    if (!search) return true;
    const s = search.toLowerCase();
    return p.patient_name.toLowerCase().includes(s) ||
      p.vorname?.toLowerCase().includes(s) ||
      p.nachname?.toLowerCase().includes(s) ||
      p.email?.toLowerCase().includes(s) ||
      p.telefon?.includes(s) ||
      p.kassenart?.toLowerCase().includes(s);
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-primary">Patienten</h1>
        <div className="flex gap-2">
          <a href="/mitarbeiter/csv-import"
            className="bg-secondary text-secondary-foreground px-4 py-2 rounded-xl font-medium text-sm hover:bg-secondary/80">
            CSV Import
          </a>
          <button onClick={startNew}
            className="bg-accent text-accent-foreground px-4 py-2 rounded-xl font-medium text-sm hover:bg-accent/90">
            + Neuer Patient
          </button>
        </div>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Suche nach Name, E-Mail, Telefon..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-72 py-2 px-3 rounded-lg border bg-card text-sm"
        />
      </div>

      {error && <div className="p-3 bg-destructive/10 text-destructive rounded-xl text-sm mb-4">{error}</div>}

      {showForm && (
        <div className="bg-card border rounded-xl p-4 sm:p-6 mb-6">
          <h2 className="font-semibold text-foreground mb-3">
            {editId ? "Patient bearbeiten" : "Neuer Patient"}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Vorname *</label>
              <input value={formVorname} onChange={e => setFormVorname(e.target.value)}
                placeholder="Max"
                className="w-full py-2 px-3 rounded-lg border bg-input-background text-sm" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Nachname *</label>
              <input value={formNachname} onChange={e => setFormNachname(e.target.value)}
                placeholder="Mustermann"
                className="w-full py-2 px-3 rounded-lg border bg-input-background text-sm" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Geburtsdatum</label>
              <input type="date" value={formGeb} onChange={e => setFormGeb(e.target.value)}
                className="w-full py-2 px-3 rounded-lg border bg-input-background text-sm" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Versicherung</label>
              <select value={formVers} onChange={e => setFormVers(e.target.value)}
                className="w-full py-2 px-3 rounded-lg border bg-input-background text-sm">
                <option value="GKV">GKV</option>
                <option value="PKV">PKV</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-muted-foreground mb-1">Krankenkasse</label>
              <SearchableSelect
                options={kassenOptions}
                value={formKasse}
                onChange={v => setFormKasse(v.split("::")[0])}
                placeholder="Krankenkasse suchen..."
                searchPlaceholder="z.B. TK, AOK, Barmer..."
                emptyText="Keine Krankenkasse gefunden."
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Telefon</label>
              <input value={formTel} onChange={e => setFormTel(e.target.value)}
                className="w-full py-2 px-3 rounded-lg border bg-input-background text-sm" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">E-Mail</label>
              <input type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)}
                className="w-full py-2 px-3 rounded-lg border bg-input-background text-sm" />
            </div>
            <div className="sm:col-span-2 md:col-span-3">
              <label className="block text-xs text-muted-foreground mb-1">Notizen</label>
              <textarea value={formNotizen} onChange={e => setFormNotizen(e.target.value)} rows={2}
                className="w-full py-2 px-3 rounded-lg border bg-input-background text-sm" />
            </div>
          </div>
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
      ) : filtered.length === 0 ? (
        <div className="bg-card border rounded-xl p-8 text-center text-muted-foreground">
          {search ? "Keine Patienten gefunden." : "Noch keine Patienten angelegt."}
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground mb-3">{filtered.length} Patient{filtered.length !== 1 ? 'en' : ''}</p>

           {/* Mobile: Cards */}
          <div className="space-y-3 md:hidden">
            {filtered.map(p => (
              <div key={p.id} className="bg-card border rounded-xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground">
                      {p.nachname || p.vorname ? `${p.nachname}${p.vorname ? ', ' + p.vorname : ''}` : p.patient_name}
                    </p>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-1">
                      {p.geburtsdatum && <span>{new Date(p.geburtsdatum).toLocaleDateString("de-DE")}</span>}
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${p.versicherungsart === 'PKV' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                        {p.versicherungsart}
                      </span>
                      {p.kassenart && <span>{p.kassenart}</span>}
                    </div>
                    {p.telefon && <p className="text-xs text-muted-foreground mt-1">{p.telefon}</p>}
                    {p.email && <p className="text-xs text-muted-foreground">{p.email}</p>}
                    {p.notizen && <p className="text-xs text-muted-foreground mt-1 italic line-clamp-2">{p.notizen}</p>}
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <button onClick={() => startEdit(p)} className="text-primary hover:underline text-xs">Bearbeiten</button>
                    <button onClick={() => handleDelete(p.id)} className="text-destructive hover:underline text-xs">Löschen</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: Table */}
          <div className="hidden md:block bg-card border rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-secondary/50 text-muted-foreground text-left">
                  <th className="px-4 py-3">Nachname</th>
                  <th className="px-4 py-3">Vorname</th>
                  <th className="px-4 py-3">Geb.-Datum</th>
                  <th className="px-4 py-3">Versicherung</th>
                  <th className="px-4 py-3">Krankenkasse</th>
                  <th className="px-4 py-3">Telefon</th>
                  <th className="px-4 py-3">E-Mail</th>
                  <th className="px-4 py-3">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} className="border-b hover:bg-secondary/20">
                    <td className="px-4 py-3 font-medium">{p.nachname || p.patient_name}</td>
                    <td className="px-4 py-3">{p.vorname || "–"}</td>
                    <td className="px-4 py-3">{p.geburtsdatum ? new Date(p.geburtsdatum).toLocaleDateString("de-DE") : "–"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.versicherungsart === 'PKV' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                        {p.versicherungsart}
                      </span>
                    </td>
                    <td className="px-4 py-3">{p.kassenart || "–"}</td>
                    <td className="px-4 py-3">{p.telefon || "–"}</td>
                    <td className="px-4 py-3">{p.email || "–"}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => startEdit(p)} className="text-primary hover:underline text-xs">Bearbeiten</button>
                        <button onClick={() => handleDelete(p.id)} className="text-destructive hover:underline text-xs">Löschen</button>
                      </div>
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
