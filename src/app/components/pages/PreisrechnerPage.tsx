import { useState, useEffect } from "react";
import { api } from "../../services/api";

interface Behandlung {
  id: string;
  label: string;
  istPrivat: boolean;
}

interface Kassenart {
  id: string;
  label: string;
}

interface KassenartenGrouped {
  [gruppe: string]: Kassenart[];
}

interface Ergebnis {
  behandlung: string;
  versicherungsart: string;
  kassenart?: string;
  kig_stufe?: string;
  punktwert?: number;
  gesamt_punkte?: number;
  gesamt_euro?: number;
  kassenanteil_prozent?: number;
  kassenanteil?: number;
  geschaetzte_kosten_min: number;
  geschaetzte_kosten_max: number;
  details?: Array<{
    bema_nr: string;
    bezeichnung: string;
    punkte: number;
    anzahl: number;
    summe_punkte: number;
    summe_euro: number;
  }>;
  hinweis: string;
}

export function PreisrechnerPage() {
  const [behandlungen, setBehandlungen] = useState<Behandlung[]>([]);
  const [kassenarten, setKassenarten] = useState<KassenartenGrouped>({});
  const [versicherungsart, setVersicherungsart] = useState("");
  const [kassenart, setKassenart] = useState("");
  const [behandlungsart, setBehandlungsart] = useState("");
  const [kigStufe, setKigStufe] = useState("");
  const [ergebnis, setErgebnis] = useState<Ergebnis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showDetails, setShowDetails] = useState(false);

  // Kontaktformular
  const [showKontakt, setShowKontakt] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [telefon, setTelefon] = useState("");
  const [nachricht, setNachricht] = useState("");
  const [anfrageSent, setAnfrageSent] = useState(false);

  useEffect(() => {
    api.getBehandlungen().then(setBehandlungen).catch(() => {});
    api.getKassenarten().then((data: { grouped: KassenartenGrouped }) => setKassenarten(data.grouped)).catch(() => {});
  }, []);

  const berechnen = async () => {
    if (!versicherungsart || !behandlungsart) {
      setError("Bitte wählen Sie Versicherungsart und Behandlung.");
      return;
    }
    setError("");
    setLoading(true);
    setErgebnis(null);
    try {
      const data = await api.berechnePreis({
        versicherungsart,
        kassenart: versicherungsart === "GKV" ? kassenart : undefined,
        behandlungsart,
        kig_stufe: versicherungsart === "GKV" ? kigStufe : undefined,
      });
      setErgebnis(data);
    } catch {
      setError("Berechnung konnte nicht durchgeführt werden. Bitte versuchen Sie es später erneut.");
    } finally {
      setLoading(false);
    }
  };

  const sendeAnfrage = async () => {
    if (!name) {
      setError("Bitte geben Sie Ihren Namen ein.");
      return;
    }
    try {
      await api.sendeAnfrage({
        name,
        email,
        telefon,
        versicherungsart,
        kassenart,
        behandlungsart,
        kig_stufe: kigStufe,
        geschaetzte_kosten_min: ergebnis?.geschaetzte_kosten_min,
        geschaetzte_kosten_max: ergebnis?.geschaetzte_kosten_max,
        nachricht,
      });
      setAnfrageSent(true);
    } catch {
      setError("Anfrage konnte nicht gesendet werden.");
    }
  };

  return (
    <section className="min-h-screen bg-gradient-to-b from-secondary to-background pt-28 pb-20 px-5 md:px-10">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="inline-block bg-accent/10 text-accent font-semibold text-sm px-4 py-1.5 rounded-full mb-4">
            Kostenrechner
          </span>
          <h1 className="text-3xl md:text-4xl font-bold text-primary mb-4">
            Was kostet meine KFO-Behandlung?
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Erhalten Sie eine erste, unverbindliche Kostenindikation für Ihre kieferorthopädische Behandlung.
            Basierend auf den aktuellen BEMA-Punktwerten der KZVB.
          </p>
        </div>

        {/* Formular */}
        <div className="bg-card rounded-[1.25rem] shadow-lg p-6 md:p-10 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Versicherungsart */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Versicherungsart *
              </label>
              <div className="flex gap-3">
                {["GKV", "PKV"].map((v) => (
                  <button
                    key={v}
                    onClick={() => { setVersicherungsart(v); setErgebnis(null); }}
                    className={`flex-1 py-3 px-4 rounded-xl border-2 font-medium transition-all ${
                      versicherungsart === v
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border bg-input-background text-muted-foreground hover:border-accent/50"
                    }`}
                  >
                    {v === "GKV" ? "Gesetzlich (GKV)" : "Privat (PKV)"}
                  </button>
                ))}
              </div>
            </div>

            {/* Kassenart (nur bei GKV) */}
            {versicherungsart === "GKV" && (
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Krankenkasse
                </label>
                <select
                  value={kassenart}
                  onChange={(e) => setKassenart(e.target.value)}
                  className="w-full py-3 px-4 rounded-xl border-2 border-border bg-input-background text-foreground focus:border-accent focus:outline-none"
                >
                  <option value="">Bitte wählen...</option>
                  {Object.entries(kassenarten).map(([gruppe, kassen]) => (
                    <optgroup key={gruppe} label={gruppe}>
                      {kassen.map((k, i) => (
                        <option key={`${k.id}-${i}`} value={k.id}>{k.label}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            )}

            {/* Behandlungsart */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Behandlungsart *
              </label>
              <select
                value={behandlungsart}
                onChange={(e) => { setBehandlungsart(e.target.value); setErgebnis(null); }}
                className="w-full py-3 px-4 rounded-xl border-2 border-border bg-input-background text-foreground focus:border-accent focus:outline-none"
              >
                <option value="">Bitte wählen...</option>
                {behandlungen.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.label}{b.istPrivat ? " (Privatleistung)" : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* KIG Stufe (nur bei GKV) */}
            {versicherungsart === "GKV" && (
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  KIG-Stufe
                </label>
                <select
                  value={kigStufe}
                  onChange={(e) => setKigStufe(e.target.value)}
                  className="w-full py-3 px-4 rounded-xl border-2 border-border bg-input-background text-foreground focus:border-accent focus:outline-none"
                >
                  <option value="">Nicht bekannt</option>
                  <option value="1">KIG 1 – leichte Fehlstellung</option>
                  <option value="2">KIG 2 – geringe Fehlstellung</option>
                  <option value="3">KIG 3 – ausgeprägte Fehlstellung (Kassenleistung)</option>
                  <option value="4">KIG 4 – stark ausgeprägt (Kassenleistung)</option>
                  <option value="5">KIG 5 – extrem stark (Kassenleistung)</option>
                </select>
                {versicherungsart === "GKV" && kigStufe && parseInt(kigStufe) < 3 && (
                  <p className="text-xs text-destructive mt-1">
                    Bei KIG 1-2 übernimmt die gesetzliche Krankenkasse keine Kosten.
                  </p>
                )}
              </div>
            )}
          </div>

          {error && (
            <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-xl text-sm">
              {error}
            </div>
          )}

          <button
            onClick={berechnen}
            disabled={loading}
            className="mt-6 w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold py-4 rounded-xl transition-all text-lg disabled:opacity-50"
          >
            {loading ? "Wird berechnet..." : "Kostenindikation berechnen"}
          </button>
        </div>

        {/* Ergebnis */}
        {ergebnis && (
          <div className="bg-card rounded-[1.25rem] shadow-lg p-6 md:p-10 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-bold text-primary mb-2">Ihre Kostenindikation</h2>
            <p className="text-muted-foreground mb-6">{ergebnis.behandlung}</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-secondary rounded-xl p-4 text-center">
                <p className="text-sm text-muted-foreground">Geschätzter Eigenanteil</p>
                <p className="text-2xl font-bold text-accent">
                  {ergebnis.geschaetzte_kosten_min.toFixed(0)} – {ergebnis.geschaetzte_kosten_max.toFixed(0)} €
                </p>
              </div>
              {ergebnis.kassenanteil != null && ergebnis.kassenanteil > 0 && (
                <div className="bg-secondary rounded-xl p-4 text-center">
                  <p className="text-sm text-muted-foreground">Kassenanteil (ca.)</p>
                  <p className="text-2xl font-bold text-primary">{ergebnis.kassenanteil.toFixed(0)} €</p>
                </div>
              )}
              {ergebnis.gesamt_euro != null && (
                <div className="bg-secondary rounded-xl p-4 text-center">
                  <p className="text-sm text-muted-foreground">Gesamtkosten (ca.)</p>
                  <p className="text-2xl font-bold text-primary">{ergebnis.gesamt_euro.toFixed(0)} €</p>
                </div>
              )}
            </div>

            {/* Details Toggle */}
            {ergebnis.details && ergebnis.details.length > 0 && (
              <div className="mb-6">
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="text-sm text-accent hover:underline font-medium"
                >
                  {showDetails ? "Details ausblenden ▲" : "Details anzeigen ▼"}
                </button>
                {showDetails && (
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="py-2 pr-4">BEMA-Nr.</th>
                          <th className="py-2 pr-4">Bezeichnung</th>
                          <th className="py-2 pr-4 text-right">Punkte</th>
                          <th className="py-2 pr-4 text-right">Anz.</th>
                          <th className="py-2 text-right">EUR</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ergebnis.details.map((d, i) => (
                          <tr key={i} className="border-b border-border/50">
                            <td className="py-2 pr-4 font-mono">{d.bema_nr}</td>
                            <td className="py-2 pr-4">{d.bezeichnung}</td>
                            <td className="py-2 pr-4 text-right">{d.punkte}</td>
                            <td className="py-2 pr-4 text-right">{d.anzahl}×</td>
                            <td className="py-2 text-right font-medium">{d.summe_euro.toFixed(2)} €</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {ergebnis.punktwert && (
                      <p className="text-xs text-muted-foreground mt-2">
                        KFO-Punktwert: {ergebnis.punktwert.toFixed(4)} €
                        {ergebnis.kassenanteil_prozent ? ` | Kassenanteil: ${ergebnis.kassenanteil_prozent}%` : ""}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="bg-accent/5 text-accent-foreground/80 rounded-xl p-4 text-sm mb-6 border border-accent/20">
              <p className="text-foreground">{ergebnis.hinweis}</p>
            </div>

            {/* CTA: Anfrage senden */}
            {!showKontakt && !anfrageSent && (
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setShowKontakt(true)}
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 rounded-xl transition-all"
                >
                  Beratungstermin anfragen
                </button>
                <a
                  href="/#kontakt"
                  className="flex-1 bg-secondary hover:bg-secondary/80 text-secondary-foreground font-semibold py-3 rounded-xl transition-all text-center"
                >
                  Anrufen / Kontakt
                </a>
              </div>
            )}

            {/* Kontaktformular */}
            {showKontakt && !anfrageSent && (
              <div className="border-t pt-6 mt-4 space-y-4">
                <h3 className="font-semibold text-lg text-primary">Beratungstermin anfragen</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ihr Name *"
                    className="py-3 px-4 rounded-xl border-2 border-border bg-input-background focus:border-accent focus:outline-none"
                  />
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="E-Mail"
                    type="email"
                    className="py-3 px-4 rounded-xl border-2 border-border bg-input-background focus:border-accent focus:outline-none"
                  />
                  <input
                    value={telefon}
                    onChange={(e) => setTelefon(e.target.value)}
                    placeholder="Telefon"
                    className="py-3 px-4 rounded-xl border-2 border-border bg-input-background focus:border-accent focus:outline-none"
                  />
                </div>
                <textarea
                  value={nachricht}
                  onChange={(e) => setNachricht(e.target.value)}
                  placeholder="Ihre Nachricht (optional)"
                  rows={3}
                  className="w-full py-3 px-4 rounded-xl border-2 border-border bg-input-background focus:border-accent focus:outline-none"
                />
                <button
                  onClick={sendeAnfrage}
                  className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold py-3 rounded-xl transition-all"
                >
                  Anfrage senden
                </button>
              </div>
            )}

            {anfrageSent && (
              <div className="bg-primary/10 text-primary rounded-xl p-6 text-center">
                <p className="text-lg font-semibold">Vielen Dank für Ihre Anfrage!</p>
                <p className="mt-2">Wir melden uns schnellstmöglich bei Ihnen.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
