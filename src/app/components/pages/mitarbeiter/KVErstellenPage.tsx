import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { api } from "../../../services/api";
import { SearchableSelect } from "../../ui/SearchableSelect";

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
}

interface Anfrage {
  id: number;
  name: string;
  email: string;
  telefon: string;
  versicherungsart: string;
  kassenart: string;
  behandlungsart: string;
  kig_stufe: string;
  status: string;
  created_at: string;
}

type PatientSource = 'manuell' | 'patient' | 'anfrage' | 'ivoris';

// ── Ivoris Mock-Daten (Demo) ──
const IVORIS_MOCK_PATIENTS = [
  { ivoris_id: 'IV-10421', vorname: 'Anna', nachname: 'Berger', geburtsdatum: '2012-05-14', versicherungsart: 'GKV', kassenart: '1', email: 'berger@mail.de', telefon: '08761 1234' },
  { ivoris_id: 'IV-10422', vorname: 'Lukas', nachname: 'Meier', geburtsdatum: '2009-11-03', versicherungsart: 'GKV', kassenart: '8', email: 'meier.l@web.de', telefon: '08761 5678' },
  { ivoris_id: 'IV-10423', vorname: 'Sophie', nachname: 'Huber', geburtsdatum: '2014-02-28', versicherungsart: 'PKV', kassenart: '', email: 'huber.s@gmx.de', telefon: '08761 9012' },
  { ivoris_id: 'IV-10424', vorname: 'Maximilian', nachname: 'Wagner', geburtsdatum: '2008-08-19', versicherungsart: 'GKV', kassenart: '2', email: '', telefon: '08761 3456' },
  { ivoris_id: 'IV-10425', vorname: 'Emilia', nachname: 'Schmidt', geburtsdatum: '2011-12-01', versicherungsart: 'GKV', kassenart: '1', email: 'schmidt.e@outlook.de', telefon: '' },
];

const IVORIS_MOCK_TREATMENTS = [
  { patient_id: 'IV-10421', diagnose: 'Angle-Klasse II/1, Kompression im OK', kig_stufe: '3', behandlungen: ['119a', '119b', '121'] },
  { patient_id: 'IV-10422', diagnose: 'Distalbiss mit Protrusion der OK-Frontzähne', kig_stufe: '4', behandlungen: ['119a', '119c', '120'] },
  { patient_id: 'IV-10423', diagnose: 'Kreuzbiss rechts, Engstand UK', kig_stufe: '', behandlungen: ['119a', '119b'] },
  { patient_id: 'IV-10424', diagnose: 'Offener Biss anterior, KIG 3', kig_stufe: '3', behandlungen: ['119a', '121', '123'] },
  { patient_id: 'IV-10425', diagnose: 'Angle-Klasse III, Progenie', kig_stufe: '4', behandlungen: ['119a', '119b', '119c', '121'] },
];

export function KVErstellenPage() {
  const navigate = useNavigate();
  const [leistungen, setLeistungen] = useState<Leistung[]>([]);
  const [positionen, setPositionen] = useState<Position[]>([]);
  const [patienten, setPatienten] = useState<Patient[]>([]);
  const [anfragen, setAnfragen] = useState<Anfrage[]>([]);

  // Patient source
  const [source, setSource] = useState<PatientSource>('manuell');
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [selectedAnfrageId, setSelectedAnfrageId] = useState<number | null>(null);
  const [selectedIvorisId, setSelectedIvorisId] = useState<string>('');
  const [ivorisSearch, setIvorisSearch] = useState('');
  const [ivorisLoading, setIvorisLoading] = useState(false);
  const [ivorisResults, setIvorisResults] = useState<typeof IVORIS_MOCK_PATIENTS>([]);

  const [patientName, setPatientName] = useState("");
  const [geburtsdatum, setGeburtsdatum] = useState("");
  const [versicherungsart, setVersicherungsart] = useState("GKV");
  const [kassenart, setKassenart] = useState("1");
  const [kigStufe, setKigStufe] = useState("");
  const [diagnose, setDiagnose] = useState("");

  const [selectedBema, setSelectedBema] = useState("");
  const [selectedAnzahl, setSelectedAnzahl] = useState(1);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getLeistungen().then(setLeistungen).catch(() => {});
    api.getPatienten().then(setPatienten).catch(() => {});
    api.getAnfragen().then(setAnfragen).catch(() => {});
  }, []);

  // ── Source handlers ──
  const fillFromPatient = (id: number) => {
    const p = patienten.find(x => x.id === id);
    if (!p) return;
    setSelectedPatientId(id);
    setPatientName(p.patient_name || `${p.vorname} ${p.nachname}`.trim());
    setGeburtsdatum(p.geburtsdatum ? p.geburtsdatum.split('T')[0] : '');
    setVersicherungsart(p.versicherungsart || 'GKV');
    setKassenart(p.kassenart || '1');
  };

  const fillFromAnfrage = (id: number) => {
    const a = anfragen.find(x => x.id === id);
    if (!a) return;
    setSelectedAnfrageId(id);
    setPatientName(a.name);
    setVersicherungsart(a.versicherungsart || 'GKV');
    setKassenart(a.kassenart || '1');
    setKigStufe(a.kig_stufe || '');
  };

  // Live-Suche bei jedem Tastendruck
  useEffect(() => {
    if (source !== 'ivoris' || !ivorisSearch.trim()) {
      setIvorisResults([]);
      return;
    }
    setIvorisLoading(true);
    const timer = setTimeout(() => {
      const q = ivorisSearch.toLowerCase();
      const results = IVORIS_MOCK_PATIENTS.filter(p =>
        p.vorname.toLowerCase().includes(q) ||
        p.nachname.toLowerCase().includes(q) ||
        p.ivoris_id.toLowerCase().includes(q)
      );
      setIvorisResults(results);
      setIvorisLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [ivorisSearch, source]);

  const fillFromIvoris = (ivorisId: string) => {
    const p = IVORIS_MOCK_PATIENTS.find(x => x.ivoris_id === ivorisId);
    if (!p) return;
    setSelectedIvorisId(ivorisId);
    setPatientName(`${p.vorname} ${p.nachname}`);
    setGeburtsdatum(p.geburtsdatum);
    setVersicherungsart(p.versicherungsart);
    setKassenart(p.kassenart || '1');

    // Auto-load treatment data
    const treatment = IVORIS_MOCK_TREATMENTS.find(t => t.patient_id === ivorisId);
    if (treatment) {
      setDiagnose(treatment.diagnose);
      setKigStufe(treatment.kig_stufe);
      // Auto-add positions from treatment
      if (leistungen.length > 0) {
        const newPositionen: Position[] = [];
        for (const bema of treatment.behandlungen) {
          const l = leistungen.find(x => x.bema_nr === bema);
          if (l) {
            newPositionen.push({
              bema_nr: l.bema_nr,
              bezeichnung: l.bezeichnung,
              punkte: l.punkte,
              anzahl: 1,
            });
          }
        }
        if (newPositionen.length > 0) setPositionen(newPositionen);
      }
    }
  };

  const resetPatientData = () => {
    setPatientName(''); setGeburtsdatum(''); setVersicherungsart('GKV');
    setKassenart('1'); setKigStufe(''); setDiagnose('');
    setSelectedPatientId(null); setSelectedAnfrageId(null);
    setSelectedIvorisId(''); setIvorisResults([]); setIvorisSearch('');
    setPositionen([]);
  };

  const changeSource = (s: PatientSource) => {
    resetPatientData();
    setSource(s);
  };

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
      await api.createKV({
        patient_name: patientName,
        patient_geburtsdatum: geburtsdatum || null,
        versicherungsart,
        kassenart: versicherungsart === "GKV" ? kassenart : null,
        kig_stufe: kigStufe || null,
        diagnose: diagnose || null,
        positionen: positionen.map(p => ({ bema_nr: p.bema_nr, anzahl: p.anzahl })),
      });
      navigate('/mitarbeiter/kostenvoranschlaege');
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  const gesamtPunkte = positionen.reduce((sum, p) => sum + p.punkte * p.anzahl, 0);

  const SOURCE_TABS: { key: PatientSource; label: string; desc: string; iconPath: string; color: string }[] = [
    { key: 'manuell', label: 'Manuell', desc: 'Daten selbst eingeben', color: 'text-[#063255] bg-[#063255]/10', iconPath: 'M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z' },
    { key: 'patient', label: 'Bestandspatient', desc: 'Aus Patientenstamm', color: 'text-violet-600 bg-violet-500/10', iconPath: 'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z' },
    { key: 'anfrage', label: 'Aus Anfrage', desc: 'Patientenanfrage nutzen', color: 'text-[#f58a07] bg-[#f58a07]/10', iconPath: 'M21.75 9v.906a2.25 2.25 0 01-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 001.183 1.981l6.478 3.488m8.839 2.51l-4.66-2.51m0 0l-1.023-.55a2.25 2.25 0 00-2.134 0l-1.022.55m0 0l-4.661 2.51m16.5 1.615a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V8.844a2.25 2.25 0 011.183-1.98l7.5-4.04a2.25 2.25 0 012.134 0l7.5 4.04a2.25 2.25 0 011.183 1.98V19.5z' },
    { key: 'ivoris', label: 'Aus Ivoris', desc: 'Ivoris-Daten laden', color: 'text-emerald-600 bg-emerald-500/10', iconPath: 'M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75' },
  ];

  return (
    <div className="max-w-4xl">
      <h1 className="text-xl sm:text-2xl font-bold text-primary mb-6">Neuen Kostenvoranschlag erstellen</h1>

      {/* ── Source Selection ── */}
      <div className="bg-card border rounded-xl p-4 sm:p-6 mb-6">
        <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-3">Patientendaten-Quelle</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {SOURCE_TABS.map(tab => (
            <button key={tab.key} onClick={() => changeSource(tab.key)}
              className={`flex items-center gap-3 p-4 rounded-2xl border text-left transition-all ${
                source === tab.key
                  ? 'bg-white border-[#063255]/30 shadow-md ring-2 ring-[#063255]/20'
                  : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm'
              }`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tab.color}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={tab.iconPath} />
                </svg>
              </div>
              <div className="min-w-0">
                <p className={`font-semibold text-sm ${source === tab.key ? 'text-[#063255]' : 'text-gray-700'}`}>{tab.label}</p>
                <p className="text-[11px] text-gray-400 leading-tight hidden sm:block">{tab.desc}</p>
              </div>
            </button>
          ))}
        </div>

        {/* ── Source: Patient ── */}
        {source === 'patient' && (
          <div className="space-y-3">
            {patienten.length === 0 ? (
              <p className="text-muted-foreground text-sm">Noch keine Patienten angelegt. <a href="/mitarbeiter/patienten" className="text-accent hover:underline">Patienten verwalten →</a></p>
            ) : (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Patient auswählen</label>
                <SearchableSelect
                  options={patienten.map(p => ({
                    value: String(p.id),
                    label: `${p.nachname || ''}${p.vorname ? ', ' + p.vorname : ''} ${p.patient_name && !p.nachname ? p.patient_name : ''}`.trim(),
                    gruppe: p.versicherungsart,
                  }))}
                  value={selectedPatientId ? String(selectedPatientId) : ''}
                  onChange={(v) => fillFromPatient(Number(v))}
                  placeholder="Patient suchen..."
                  searchPlaceholder="Name eingeben..."
                  emptyText="Kein Patient gefunden."
                />
              </div>
            )}
            {selectedPatientId && (
              <div className="bg-[#edf7ff] rounded-xl p-3 text-sm text-[#063255]">
                Daten von <strong>{patientName}</strong> übernommen.
              </div>
            )}
          </div>
        )}

        {/* ── Source: Anfrage ── */}
        {source === 'anfrage' && (
          <div className="space-y-3">
            {anfragen.length === 0 ? (
              <p className="text-muted-foreground text-sm">Keine Anfragen vorhanden.</p>
            ) : (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Anfrage auswählen</label>
                <select value={selectedAnfrageId || ''} onChange={e => fillFromAnfrage(Number(e.target.value))}
                  className="w-full py-2 px-3 rounded-lg border bg-input-background text-sm">
                  <option value="">Anfrage wählen...</option>
                  {anfragen.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name} – {a.behandlungsart} ({a.versicherungsart}) – {new Date(a.created_at).toLocaleDateString('de-DE')}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {selectedAnfrageId && (
              <div className="bg-[#edf7ff] rounded-xl p-3 text-sm text-[#063255]">
                Daten aus Anfrage von <strong>{patientName}</strong> übernommen.
              </div>
            )}
          </div>
        )}

        {/* ── Source: Ivoris ── */}
        {source === 'ivoris' && (
          <div className="space-y-3">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800 flex items-start gap-2">
              <span className="text-base">⚠️</span>
              <span>
                <strong>Demo-Modus:</strong> Ivoris-API ist noch nicht angebunden. Es werden Beispieldaten angezeigt.
                Zum Testen z.B. <strong>IV-10421</strong> oder <strong>Berger</strong> suchen.
              </span>
            </div>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
              <input value={ivorisSearch} onChange={e => setIvorisSearch(e.target.value)}
                placeholder="Name oder Ivoris-Nr. eingeben..."
                className="w-full py-2.5 pl-9 pr-3 rounded-xl border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-[#063255]/20 focus:border-[#063255]/40 transition-all" />
              {ivorisLoading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-[#063255] border-t-transparent rounded-full animate-spin" />
              )}
            </div>
            {ivorisResults.length > 0 && (
              <div className="border rounded-xl divide-y max-h-60 overflow-y-auto">
                {ivorisResults.map(p => (
                  <button key={p.ivoris_id}
                    onClick={() => fillFromIvoris(p.ivoris_id)}
                    className={`w-full text-left p-3 hover:bg-muted/50 transition-colors text-sm ${selectedIvorisId === p.ivoris_id ? 'bg-[#edf7ff]' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium">{p.nachname}, {p.vorname}</span>
                        <span className="text-muted-foreground ml-2">({p.ivoris_id})</span>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.versicherungsart === 'PKV' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                        {p.versicherungsart}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Geb. {new Date(p.geburtsdatum).toLocaleDateString('de-DE')}
                      {p.email && ` · ${p.email}`}
                    </p>
                  </button>
                ))}
              </div>
            )}
            {ivorisResults.length === 0 && ivorisSearch && !ivorisLoading && (
              <p className="text-muted-foreground text-sm">Keine Ivoris-Patienten gefunden.</p>
            )}
            {selectedIvorisId && (
              <div className="bg-[#edf7ff] rounded-xl p-3 text-sm text-[#063255]">
                Daten aus Ivoris für <strong>{patientName}</strong> übernommen (inkl. Diagnose & Positionen).
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Patient Data Form ── */}
      <div className="bg-card border rounded-xl p-4 sm:p-6 mb-6">
        <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-4">Patientendaten</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Patient *</label>
            <input value={patientName} onChange={(e) => setPatientName(e.target.value)}
              placeholder="Vor- und Nachname"
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
              placeholder="z.B. Angle-Klasse II/1, Kompression im OK"
              className="w-full py-2 px-3 rounded-lg border bg-input-background focus:border-accent focus:outline-none text-sm" />
          </div>
        </div>
      </div>

      {/* ── Positionen ── */}
      <div className="bg-card border rounded-xl p-4 sm:p-6 mb-6">
        <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-4">Leistungspositionen</h2>

        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <select value={selectedBema} onChange={(e) => setSelectedBema(e.target.value)}
            className="flex-1 py-2 px-3 rounded-lg border bg-input-background text-sm">
            <option value="">BEMA-Position wählen...</option>
            {leistungen.map((l) => (
              <option key={l.bema_nr} value={l.bema_nr}>
                {l.bema_nr} – {l.bezeichnung} ({l.punkte} Pkt.)
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <input type="number" min={1} value={selectedAnzahl}
              onChange={(e) => setSelectedAnzahl(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-20 py-2 px-3 rounded-lg border bg-input-background text-sm text-center" />
            <button onClick={addPosition} disabled={!selectedBema}
              className="bg-accent text-accent-foreground px-4 py-2 rounded-lg font-medium text-sm disabled:opacity-50 hover:bg-accent/90">
              Hinzufügen
            </button>
          </div>
        </div>

        {positionen.length === 0 ? (
          <p className="text-muted-foreground text-sm">Noch keine Positionen hinzugefügt.</p>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:-mx-6 px-4 sm:px-6">
            <table className="w-full text-sm min-w-[480px]">
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
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 bg-destructive/10 text-destructive rounded-xl text-sm mb-4">{error}</div>
      )}

      <div className="flex gap-3">
        <button onClick={handleSave} disabled={saving}
          className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-semibold hover:bg-primary/90 disabled:opacity-50">
          {saving ? "Speichern..." : "Kostenvoranschlag erstellen"}
        </button>
        <button onClick={() => navigate('/mitarbeiter/kostenvoranschlaege')}
          className="bg-secondary text-secondary-foreground px-6 py-3 rounded-xl font-semibold hover:bg-secondary/80">
          Abbrechen
        </button>
      </div>
    </div>
  );
}
