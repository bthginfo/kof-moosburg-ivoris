import { useState, useRef } from "react";

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface Patient {
  patient_name: string;
  vorname: string;
  nachname: string;
  geburtsdatum: string | null;
  versicherungsart: string;
  kassenart: string;
  telefon: string;
  email: string;
  notizen: string;
}

interface ImportedPatient extends Patient {
  id: number;
  created_at: string;
}

export function CsvImportPage() {
  const [vorschau, setVorschau] = useState<Patient[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [valid, setValid] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; total: number } | null>(null);
  const [error, setError] = useState("");
  const [patienten, setPatienten] = useState<ImportedPatient[]>([]);
  const [showPatienten, setShowPatienten] = useState(false);
  const [patLoading, setPatLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const token = () => localStorage.getItem("kfo_token") || "";

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setError("");
    setImportResult(null);
    setVorschau([]);

    const formData = new FormData();
    formData.append("file", f);

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/csv-import/vorschau`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token()}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setHeaders(data.headers);
      setTotal(data.total);
      setValid(data.valid);
      setVorschau(data.vorschau);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Vorschau fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API_BASE}/api/csv-import/importieren`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token()}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setImportResult(data);
      setVorschau([]);
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  };

  const loadPatienten = async () => {
    setPatLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/csv-import/patienten`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      setPatienten(data);
      setShowPatienten(true);
    } catch {
      setError("Patienten laden fehlgeschlagen");
    } finally {
      setPatLoading(false);
    }
  };

  const deletePatient = async (id: number) => {
    if (!confirm("Patient wirklich löschen?")) return;
    try {
      await fetch(`${API_BASE}/api/csv-import/patienten/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token()}` },
      });
      setPatienten((prev) => prev.filter((p) => p.id !== id));
    } catch {
      setError("Löschen fehlgeschlagen");
    }
  };

  const reset = () => {
    setFile(null);
    setVorschau([]);
    setImportResult(null);
    setError("");
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-primary">CSV Import</h1>
        <button
          onClick={showPatienten ? () => setShowPatienten(false) : loadPatienten}
          disabled={patLoading}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-xl font-medium text-sm hover:bg-primary/90 disabled:opacity-50"
        >
          {patLoading ? "Laden..." : showPatienten ? "Zurück zum Import" : "Importierte Patienten anzeigen"}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-destructive/10 text-destructive rounded-xl text-sm mb-4">{error}</div>
      )}

      {importResult && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl mb-4">
          <p className="text-green-800 font-medium">Import abgeschlossen!</p>
          <p className="text-green-700 text-sm mt-1">
            {importResult.imported} importiert · {importResult.skipped} übersprungen (Duplikate) · {importResult.total} gesamt
          </p>
        </div>
      )}

      {showPatienten ? (
        <div>
          <p className="text-sm text-muted-foreground mb-3">{patienten.length} Patienten gespeichert</p>
          {patienten.length === 0 ? (
            <div className="bg-card border rounded-xl p-8 text-center text-muted-foreground">
              Noch keine Patienten importiert.
            </div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="space-y-3 md:hidden">
                {patienten.map((p) => (
                  <div key={p.id} className="bg-card border rounded-xl p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-foreground">{p.nachname ? `${p.nachname}, ${p.vorname || ''}`.trim() : p.patient_name}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {p.geburtsdatum ? new Date(p.geburtsdatum).toLocaleDateString("de-DE") : "–"} · {p.versicherungsart}
                        </p>
                        {p.kassenart && <p className="text-xs text-muted-foreground">{p.kassenart}</p>}
                        {p.telefon && <p className="text-xs text-muted-foreground mt-1">{p.telefon}</p>}
                        {p.email && <p className="text-xs text-muted-foreground">{p.email}</p>}
                      </div>
                      <button onClick={() => deletePatient(p.id)} className="text-destructive hover:underline text-xs">
                        Löschen
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop table */}
              <div className="hidden md:block bg-card border rounded-xl overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-secondary/50 text-muted-foreground text-left">
                      <th className="px-4 py-3">Nachname</th>
                      <th className="px-4 py-3">Vorname</th>
                      <th className="px-4 py-3">Geb.-Datum</th>
                      <th className="px-4 py-3">Versicherung</th>
                      <th className="px-4 py-3">Kassenart</th>
                      <th className="px-4 py-3">Telefon</th>
                      <th className="px-4 py-3">E-Mail</th>
                      <th className="px-4 py-3">Aktionen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patienten.map((p) => (
                      <tr key={p.id} className="border-b hover:bg-secondary/20">
                        <td className="px-4 py-3 font-medium">{p.nachname || p.patient_name}</td>
                        <td className="px-4 py-3">{p.vorname || "–"}</td>
                        <td className="px-4 py-3">{p.geburtsdatum ? new Date(p.geburtsdatum).toLocaleDateString("de-DE") : "–"}</td>
                        <td className="px-4 py-3">{p.versicherungsart}</td>
                        <td className="px-4 py-3">{p.kassenart || "–"}</td>
                        <td className="px-4 py-3">{p.telefon || "–"}</td>
                        <td className="px-4 py-3">{p.email || "–"}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => deletePatient(p.id)} className="text-destructive hover:underline text-xs">
                            Löschen
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      ) : (
        <div>
          {/* Upload-Bereich */}
          <div className="bg-card border rounded-xl p-4 sm:p-6 mb-6">
            <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-2">Patientendaten aus CSV importieren</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Exportieren Sie Patientendaten aus Ivoris KFO als CSV-Datei und laden Sie diese hier hoch.
              Unterstützt werden Semikolon- und Komma-getrennte Dateien.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 items-start">
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleFileSelect}
                className="block w-full sm:w-auto text-sm text-muted-foreground file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-accent file:text-accent-foreground hover:file:bg-accent/90 file:cursor-pointer"
              />
              {file && (
                <button onClick={reset} className="text-sm text-muted-foreground hover:text-foreground">
                  Zurücksetzen
                </button>
              )}
            </div>

            <div className="mt-4 p-3 bg-secondary/50 rounded-lg text-xs text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Erwartete CSV-Spalten:</p>
              <p>Name/Nachname, Vorname, Geburtsdatum, Versicherungsart, Kassenart/Krankenkasse, Telefon, E-Mail</p>
              <p className="mt-1">Die Spalten werden automatisch erkannt. Duplikate (gleicher Name + Geburtsdatum) werden übersprungen.</p>
            </div>
          </div>

          {/* Vorschau */}
          {loading && <p className="text-muted-foreground">CSV wird verarbeitet...</p>}

          {vorschau.length > 0 && (
            <div className="mb-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 gap-2">
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold text-foreground">Vorschau</h2>
                  <p className="text-sm text-muted-foreground">
                    {valid} von {total} Zeilen erkannt · Erkannte Spalten: {headers.join(", ")}
                  </p>
                </div>
                <button
                  onClick={handleImport}
                  disabled={loading}
                  className="bg-accent text-accent-foreground px-6 py-2 rounded-xl font-medium text-sm hover:bg-accent/90 disabled:opacity-50"
                >
                  {loading ? "Importiere..." : `${valid} Patienten importieren`}
                </button>
              </div>

              {/* Mobile cards */}
              <div className="space-y-3 md:hidden">
                {vorschau.map((p, i) => (
                  <div key={i} className="bg-card border rounded-xl p-4">
                    <p className="font-semibold text-foreground">{p.nachname ? `${p.nachname}, ${p.vorname || ''}`.trim() : p.patient_name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {p.geburtsdatum || "–"} · {p.versicherungsart} {p.kassenart ? `· ${p.kassenart}` : ""}
                    </p>
                    {p.telefon && <p className="text-xs text-muted-foreground">{p.telefon}</p>}
                    {p.email && <p className="text-xs text-muted-foreground">{p.email}</p>}
                  </div>
                ))}
              </div>
              {/* Desktop table */}
              <div className="hidden md:block bg-card border rounded-xl overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-secondary/50 text-muted-foreground text-left">
                      <th className="px-4 py-3">#</th>
                      <th className="px-4 py-3">Nachname</th>
                      <th className="px-4 py-3">Vorname</th>
                      <th className="px-4 py-3">Geb.-Datum</th>
                      <th className="px-4 py-3">Versicherung</th>
                      <th className="px-4 py-3">Kassenart</th>
                      <th className="px-4 py-3">Telefon</th>
                      <th className="px-4 py-3">E-Mail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vorschau.map((p, i) => (
                      <tr key={i} className="border-b hover:bg-secondary/20">
                        <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                        <td className="px-4 py-3 font-medium">{p.nachname || p.patient_name}</td>
                        <td className="px-4 py-3">{p.vorname || "–"}</td>
                        <td className="px-4 py-3">{p.geburtsdatum || "–"}</td>
                        <td className="px-4 py-3">{p.versicherungsart}</td>
                        <td className="px-4 py-3">{p.kassenart || "–"}</td>
                        <td className="px-4 py-3">{p.telefon || "–"}</td>
                        <td className="px-4 py-3">{p.email || "–"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {valid > 50 && (
                <p className="text-xs text-muted-foreground mt-2">Vorschau zeigt die ersten 50 von {valid} Einträgen.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
