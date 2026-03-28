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

interface Patient {
  id: number;
  patient_name: string;
  email: string | null;
  telefon: string | null;
}

interface SignForm {
  empfaengerName: string;
  empfaengerEmail: string;
  nachricht: string;
  erinnerung: string;
  frist: string;
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
  const [showSignModal, setShowSignModal] = useState(false);
  const [signStep, setSignStep] = useState<'form' | 'preview' | 'success'>('form');
  const [signSending, setSignSending] = useState(false);
  const [signForm, setSignForm] = useState<SignForm>({
    empfaengerName: '',
    empfaengerEmail: '',
    nachricht: '',
    erinnerung: '3',
    frist: '14',
  });

  const load = () => {
    if (!id) return;
    setLoading(true);
    api.getKV(Number(id))
      .then(setKv)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  // Pre-fill sign form when KV loads or modal opens
  useEffect(() => {
    if (kv && showSignModal && signStep === 'form') {
      // Try to find patient email from patienten list
      api.getPatienten().then((patienten: Patient[]) => {
        const match = patienten.find((p: Patient) =>
          p.patient_name.toLowerCase() === kv.patient_name.toLowerCase()
        );
        setSignForm(prev => ({
          ...prev,
          empfaengerName: kv.patient_name,
          empfaengerEmail: match?.email || prev.empfaengerEmail,
          nachricht: `Sehr geehrte/r ${kv.patient_name},\n\nanbei erhalten Sie Ihren Kostenvoranschlag KV-${kv.id} über ${parseFloat(String(kv.eigenanteil)).toFixed(2)} € zur digitalen Unterschrift.\n\nBitte prüfen und unterschreiben Sie das Dokument.\n\nMit freundlichen Grüßen\nKFO Praxis Moosburg`,
        }));
      }).catch(() => {
        setSignForm(prev => ({
          ...prev,
          empfaengerName: kv.patient_name,
          nachricht: `Sehr geehrte/r ${kv.patient_name},\n\nanbei erhalten Sie Ihren Kostenvoranschlag KV-${kv.id} über ${parseFloat(String(kv.eigenanteil)).toFixed(2)} € zur digitalen Unterschrift.\n\nBitte prüfen und unterschreiben Sie das Dokument.\n\nMit freundlichen Grüßen\nKFO Praxis Moosburg`,
        }));
      });
    }
  }, [kv, showSignModal, signStep]);

  const openSignModal = () => {
    setSignStep('form');
    setShowSignModal(true);
  };

  const closeSignModal = () => {
    setShowSignModal(false);
    setSignStep('form');
  };

  const handleSignSubmit = () => {
    setSignSending(true);
    // Mock: simulate sending delay
    setTimeout(() => {
      setSignSending(false);
      setSignStep('success');
    }, 1500);
  };

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Link to="/mitarbeiter/kostenvoranschlaege"
            className="text-muted-foreground hover:text-foreground text-sm">
            ← Zurück
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-primary">KV-{kv.id}</h1>
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
        <div className="flex flex-wrap gap-2">
          <Link to={`/mitarbeiter/kv/${kv.id}/bearbeiten`}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary/90">
            Bearbeiten
          </Link>
          <a href={api.getKVPdfUrl(kv.id)} target="_blank" rel="noopener noreferrer"
            className="bg-accent text-accent-foreground px-4 py-2 rounded-xl text-sm font-medium hover:bg-accent/90">
            PDF
          </a>
          <button onClick={openSignModal}
            className="bg-[#063255] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#063255]/90 flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            Zur Unterschrift senden
          </button>
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
      <div className="bg-card border rounded-xl p-4 sm:p-6 mb-6">
        <h2 className="font-semibold text-foreground mb-3">Leistungspositionen</h2>
        <div className="overflow-x-auto -mx-4 sm:-mx-6 px-4 sm:px-6">
        <table className="w-full text-sm min-w-[480px]">
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

      {/* Adobe Sign Modal */}
      {showSignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={closeSignModal} />
          <div className="relative bg-card rounded-2xl shadow-2xl border w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b bg-[#063255] rounded-t-2xl">
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                <h2 className="text-lg font-semibold text-white">Adobe Sign – Zur Unterschrift senden</h2>
              </div>
              <button onClick={closeSignModal} className="text-white/70 hover:text-white text-xl leading-none">&times;</button>
            </div>

            {signStep === 'form' && (
              <div className="p-5 space-y-4">
                <div className="bg-[#edf7ff] rounded-xl p-3 text-sm flex items-start gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#063255] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
                  </svg>
                  <span className="text-[#063255]">
                    <strong>Demo-Modus:</strong> Die Adobe Sign API ist noch nicht angebunden. Die Daten werden geprüft und eine Vorschau angezeigt, aber nichts versendet.
                  </span>
                </div>

                {/* Dokument */}
                <div className="bg-muted/50 rounded-xl p-3 text-sm">
                  <p className="text-muted-foreground text-xs mb-1">Dokument</p>
                  <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM6 20V4h5v7h7v9H6z"/>
                    </svg>
                    <span className="font-medium">KV-{kv.id}_{kv.patient_name.replace(/\s+/g, '_')}.pdf</span>
                  </div>
                </div>

                {/* Empfänger */}
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1">Empfänger Name *</label>
                  <input
                    type="text"
                    value={signForm.empfaengerName}
                    onChange={e => setSignForm(f => ({ ...f, empfaengerName: e.target.value }))}
                    className="w-full border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-[#063255]"
                    placeholder="Max Mustermann"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground block mb-1">Empfänger E-Mail *</label>
                  <input
                    type="email"
                    value={signForm.empfaengerEmail}
                    onChange={e => setSignForm(f => ({ ...f, empfaengerEmail: e.target.value }))}
                    className="w-full border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-[#063255]"
                    placeholder="patient@beispiel.de"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Wird automatisch aus Patientenstammdaten gezogen, falls vorhanden.</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground block mb-1">Persönliche Nachricht</label>
                  <textarea
                    value={signForm.nachricht}
                    onChange={e => setSignForm(f => ({ ...f, nachricht: e.target.value }))}
                    rows={5}
                    className="w-full border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-[#063255] resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-1">Erinnerung nach (Tage)</label>
                    <select
                      value={signForm.erinnerung}
                      onChange={e => setSignForm(f => ({ ...f, erinnerung: e.target.value }))}
                      className="w-full border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-[#063255]"
                    >
                      <option value="1">1 Tag</option>
                      <option value="3">3 Tage</option>
                      <option value="5">5 Tage</option>
                      <option value="7">7 Tage</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-1">Unterschrift-Frist (Tage)</label>
                    <select
                      value={signForm.frist}
                      onChange={e => setSignForm(f => ({ ...f, frist: e.target.value }))}
                      className="w-full border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-[#063255]"
                    >
                      <option value="7">7 Tage</option>
                      <option value="14">14 Tage</option>
                      <option value="21">21 Tage</option>
                      <option value="30">30 Tage</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button onClick={closeSignModal}
                    className="flex-1 border rounded-xl py-2.5 text-sm font-medium hover:bg-muted/50">
                    Abbrechen
                  </button>
                  <button
                    onClick={() => setSignStep('preview')}
                    disabled={!signForm.empfaengerName || !signForm.empfaengerEmail}
                    className="flex-1 bg-[#063255] text-white rounded-xl py-2.5 text-sm font-medium hover:bg-[#063255]/90 disabled:opacity-50 disabled:cursor-not-allowed">
                    Vorschau →
                  </button>
                </div>
              </div>
            )}

            {signStep === 'preview' && (
              <div className="p-5 space-y-4">
                <h3 className="font-semibold text-foreground">Versand-Vorschau</h3>

                <div className="border rounded-xl divide-y text-sm">
                  <div className="flex justify-between p-3">
                    <span className="text-muted-foreground">Dokument</span>
                    <span className="font-medium">KV-{kv.id}_{kv.patient_name.replace(/\s+/g, '_')}.pdf</span>
                  </div>
                  <div className="flex justify-between p-3">
                    <span className="text-muted-foreground">Empfänger</span>
                    <span className="font-medium">{signForm.empfaengerName}</span>
                  </div>
                  <div className="flex justify-between p-3">
                    <span className="text-muted-foreground">E-Mail</span>
                    <span className="font-medium">{signForm.empfaengerEmail}</span>
                  </div>
                  <div className="flex justify-between p-3">
                    <span className="text-muted-foreground">Betrag</span>
                    <span className="font-medium text-accent">{parseFloat(String(kv.eigenanteil)).toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between p-3">
                    <span className="text-muted-foreground">Erinnerung</span>
                    <span className="font-medium">nach {signForm.erinnerung} Tagen</span>
                  </div>
                  <div className="flex justify-between p-3">
                    <span className="text-muted-foreground">Frist</span>
                    <span className="font-medium">{signForm.frist} Tage</span>
                  </div>
                </div>

                <div className="border rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-1">Nachricht an Patient:</p>
                  <p className="text-sm whitespace-pre-line">{signForm.nachricht}</p>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800 flex items-start gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
                  </svg>
                  <span>
                    <strong>Demo-Modus:</strong> Klicken Sie auf „Senden", um den Ablauf zu simulieren. Es wird keine E-Mail versendet.
                  </span>
                </div>

                <div className="flex gap-2 pt-2">
                  <button onClick={() => setSignStep('form')}
                    className="flex-1 border rounded-xl py-2.5 text-sm font-medium hover:bg-muted/50">
                    ← Zurück
                  </button>
                  <button onClick={handleSignSubmit} disabled={signSending}
                    className="flex-1 bg-[#f58a07] text-white rounded-xl py-2.5 text-sm font-medium hover:bg-[#f58a07]/90 disabled:opacity-70 flex items-center justify-center gap-2">
                    {signSending ? (
                      <>
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Wird gesendet...
                      </>
                    ) : (
                      'Zur Unterschrift senden'
                    )}
                  </button>
                </div>
              </div>
            )}

            {signStep === 'success' && (
              <div className="p-5 text-center space-y-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-foreground">Erfolgreich versendet!</h3>
                <p className="text-sm text-muted-foreground">
                  Der Kostenvoranschlag <strong>KV-{kv.id}</strong> wurde zur digitalen Unterschrift an <strong>{signForm.empfaengerEmail}</strong> gesendet.
                </p>
                <div className="bg-[#edf7ff] rounded-xl p-3 text-sm text-[#063255]">
                  <strong>Demo-Hinweis:</strong> In der finalen Version wird hier die Adobe Sign API genutzt. Der Patient erhält dann eine E-Mail mit dem Link zur digitalen Unterschrift.
                </div>
                <div className="border rounded-xl p-3 text-sm text-left">
                  <p className="font-medium mb-2">Nächste Schritte (nach API-Anbindung):</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Patient erhält E-Mail mit Unterschrift-Link</li>
                    <li>• Status wird automatisch auf „Gesendet" gesetzt</li>
                    <li>• Nach Unterschrift: Status → „Angenommen"</li>
                    <li>• Signiertes PDF wird automatisch gespeichert</li>
                  </ul>
                </div>
                <button onClick={closeSignModal}
                  className="w-full bg-[#063255] text-white rounded-xl py-2.5 text-sm font-medium hover:bg-[#063255]/90 mt-2">
                  Schließen
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
