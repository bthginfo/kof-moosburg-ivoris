import { useState, useEffect } from "react";
import { api } from "../../../services/api";

export function DashboardPage() {
  const [stats, setStats] = useState({ anfragen: 0, kvs: 0, neueAnfragen: 0, patienten: 0 });
  const [recentKvs, setRecentKvs] = useState<{ id: number; patient_name: string; eigenanteil: number; status: string; created_at: string }[]>([]);
  const user = api.getUser();

  useEffect(() => {
    Promise.all([
      api.getAnfragen().catch(() => []),
      api.getKVs().catch(() => []),
      api.getPatienten().catch(() => []),
    ]).then(([anfragen, kvs, patienten]) => {
      setStats({
        anfragen: anfragen.length,
        kvs: kvs.length,
        neueAnfragen: anfragen.filter((a: { status: string }) => a.status === 'neu').length,
        patienten: patienten.length,
      });
      setRecentKvs(kvs.slice(0, 5));
    });
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Guten Morgen';
    if (h < 18) return 'Guten Tag';
    return 'Guten Abend';
  };

  const STATUS_COLORS: Record<string, string> = {
    entwurf: 'bg-amber-100 text-amber-700',
    gesendet: 'bg-blue-100 text-blue-700',
    angenommen: 'bg-emerald-100 text-emerald-700',
    abgelehnt: 'bg-red-100 text-red-600',
  };

  return (
    <div className="max-w-5xl">
      {/* Greeting */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#063255]">
          {greeting()}, {user?.name?.split(' ')[0] || 'Mitarbeiter'}
        </h1>
        <p className="text-gray-500 mt-1">Hier ist Ihre Praxis-Übersicht für heute.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
        {/* Neue Anfragen */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-100 relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 w-20 h-20 bg-[#f58a07]/5 rounded-bl-[40px]" />
          <div className="w-10 h-10 rounded-xl bg-[#f58a07]/10 flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-[#f58a07]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
          </div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Neue Anfragen</p>
          <p className="text-2xl sm:text-3xl font-bold text-[#f58a07] mt-1">{stats.neueAnfragen}</p>
        </div>

        {/* Anfragen Gesamt */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-100 relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 w-20 h-20 bg-[#063255]/5 rounded-bl-[40px]" />
          <div className="w-10 h-10 rounded-xl bg-[#063255]/10 flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-[#063255]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Anfragen Gesamt</p>
          <p className="text-2xl sm:text-3xl font-bold text-[#063255] mt-1">{stats.anfragen}</p>
        </div>

        {/* KVs */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-100 relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 rounded-bl-[40px]" />
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Kostenvoranschläge</p>
          <p className="text-2xl sm:text-3xl font-bold text-emerald-600 mt-1">{stats.kvs}</p>
        </div>

        {/* Patienten */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-100 relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 w-20 h-20 bg-violet-500/5 rounded-bl-[40px]" />
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
          </div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Patienten</p>
          <p className="text-2xl sm:text-3xl font-bold text-violet-600 mt-1">{stats.patienten}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-1">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Schnellzugriff</h2>
          <div className="space-y-2">
            <a href="/mitarbeiter/kv-erstellen"
              className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl p-4 hover:border-[#f58a07]/40 hover:shadow-sm transition-all group">
              <div className="w-10 h-10 rounded-xl bg-[#f58a07] flex items-center justify-center shadow-sm shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-[#063255] text-sm group-hover:text-[#f58a07] transition-colors">Neuer Kostenvoranschlag</p>
                <p className="text-xs text-gray-400">KV basierend auf BEMA erstellen</p>
              </div>
            </a>
            <a href="/mitarbeiter/anfragen"
              className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl p-4 hover:border-[#063255]/20 hover:shadow-sm transition-all group">
              <div className="w-10 h-10 rounded-xl bg-[#063255]/10 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-[#063255]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-[#063255] text-sm">Anfragen bearbeiten</p>
                <p className="text-xs text-gray-400">Patientenanfragen verwalten</p>
              </div>
            </a>
            <a href="/mitarbeiter/patienten"
              className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl p-4 hover:border-violet-200 hover:shadow-sm transition-all group">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-[#063255] text-sm">Patienten verwalten</p>
                <p className="text-xs text-gray-400">Stammdaten & Ivoris-Import</p>
              </div>
            </a>
            <a href="/mitarbeiter/punktwerte"
              className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl p-4 hover:border-emerald-200 hover:shadow-sm transition-all group">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-[#063255] text-sm">KZVB-Punktwerte</p>
                <p className="text-xs text-gray-400">Aktuelle Punktwerte verwalten</p>
              </div>
            </a>
          </div>
        </div>

        {/* Recent KVs */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Letzte Kostenvoranschläge</h2>
            <a href="/mitarbeiter/kostenvoranschlaege" className="text-xs text-[#063255] hover:text-[#f58a07] font-medium transition-colors">
              Alle anzeigen →
            </a>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            {recentKvs.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <svg className="w-12 h-12 mx-auto mb-3 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm">Noch keine Kostenvoranschläge erstellt.</p>
                <a href="/mitarbeiter/kv-erstellen" className="text-[#f58a07] text-sm font-medium hover:underline mt-1 inline-block">
                  Ersten KV erstellen →
                </a>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {recentKvs.map(kv => (
                  <a key={kv.id} href={`/mitarbeiter/kv/${kv.id}`}
                    className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50/80 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-[#063255]/5 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-[#063255]">KV</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{kv.patient_name}</p>
                        <p className="text-xs text-gray-400">
                          KV-{kv.id} · {new Date(kv.created_at).toLocaleDateString('de-DE')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`text-[11px] px-2.5 py-1 rounded-full font-semibold ${STATUS_COLORS[kv.status] || 'bg-gray-100 text-gray-600'}`}>
                        {kv.status.charAt(0).toUpperCase() + kv.status.slice(1)}
                      </span>
                      <span className="text-sm font-semibold text-[#063255] tabular-nums">
                        {parseFloat(String(kv.eigenanteil)).toFixed(2)} €
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
