import { useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { api } from "../../../services/api";

const NAV_SECTIONS = [
  {
    label: 'Übersicht',
    items: [
      { href: '/mitarbeiter', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
      { href: '/mitarbeiter/anfragen', label: 'Anfragen', icon: 'M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4', badge: 'anfragen' },
    ],
  },
  {
    label: 'Kostenvoranschläge',
    items: [
      { href: '/mitarbeiter/kostenvoranschlaege', label: 'Alle KVs', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
      { href: '/mitarbeiter/kv-erstellen', label: 'Neuer KV', icon: 'M12 4v16m8-8H4', accent: true },
    ],
  },
  {
    label: 'Stammdaten',
    items: [
      { href: '/mitarbeiter/patienten', label: 'Patienten', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
      { href: '/mitarbeiter/leistungen', label: 'BEMA-Leistungen', icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z' },
      { href: '/mitarbeiter/punktwerte', label: 'Punktwerte', icon: 'M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z' },
    ],
  },
  {
    label: 'Import',
    items: [
      { href: '/mitarbeiter/csv-import', label: 'CSV Import', icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12' },
    ],
  },
];

export function ProtectedLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  if (!api.isLoggedIn()) {
    return <Navigate to="/mitarbeiter/login" replace />;
  }

  const user = api.getUser();
  const initials = (user?.name || user?.email || 'U').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

  const isActive = (href: string) => {
    if (href === '/mitarbeiter') return location.pathname === '/mitarbeiter';
    return location.pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-[#f0f4f8]">
      {/* ── Header ── */}
      <header className="bg-[#063255] sticky top-0 z-30 shadow-lg">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Menü"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {sidebarOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
            <a href="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-[#f58a07] flex items-center justify-center shadow-sm">
                <span className="text-white font-bold text-sm">KFO</span>
              </div>
              <div className="hidden sm:block">
                <span className="text-white font-semibold text-sm group-hover:text-[#f58a07] transition-colors">KFO Moosburg</span>
                <span className="text-white/40 text-xs block leading-tight">Praxisverwaltung</span>
              </div>
            </a>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2.5 bg-white/5 rounded-lg px-3 py-1.5">
              <div className="w-7 h-7 rounded-full bg-[#f58a07]/20 flex items-center justify-center">
                <span className="text-[#f58a07] text-xs font-bold">{initials}</span>
              </div>
              <span className="text-white/80 text-sm">{user?.name || user?.email}</span>
            </div>
            <button
              onClick={() => { api.logout(); window.location.href = '/mitarbeiter/login'; }}
              className="text-white/60 hover:text-white text-sm hover:bg-white/10 px-2.5 py-1.5 rounded-lg transition-colors"
              title="Abmelden"
            >
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile overlay ── */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Layout ── */}
      <div className="max-w-[1400px] mx-auto flex min-h-[calc(100vh-56px)]">
        {/* ── Sidebar ── */}
        <nav className={`
          ${sidebarOpen ? 'fixed inset-y-0 left-0 z-50 w-60 pt-14' : 'hidden'}
          lg:relative lg:block lg:pt-0 lg:z-auto
          w-60 bg-white border-r border-gray-200/80 shadow-sm
        `}>
          <div className="p-3 space-y-5 overflow-y-auto h-full">
            {NAV_SECTIONS.map((section) => (
              <div key={section.label}>
                <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  {section.label}
                </p>
                <ul className="space-y-0.5">
                  {section.items.map((item) => {
                    const active = isActive(item.href);
                    return (
                      <li key={item.href}>
                        <a
                          href={item.href}
                          onClick={() => setSidebarOpen(false)}
                          className={`group flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all ${
                            active
                              ? 'bg-[#063255] text-white shadow-sm'
                              : (item as { accent?: boolean }).accent
                                ? 'text-[#f58a07] hover:bg-[#f58a07]/10'
                                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                          }`}
                        >
                          <svg className={`w-[18px] h-[18px] shrink-0 ${active ? 'text-white' : (item as { accent?: boolean }).accent ? 'text-[#f58a07]' : 'text-gray-400 group-hover:text-gray-500'}`}
                            fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                          </svg>
                          <span className="truncate">{item.label}</span>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </nav>

        {/* ── Content ── */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
