import { useState } from "react";
import { Navigate, Outlet } from "react-router";
import { api } from "../../../services/api";

const NAV_ITEMS = [
  { href: '/mitarbeiter', label: 'Dashboard' },
  { href: '/mitarbeiter/anfragen', label: 'Anfragen' },
  { href: '/mitarbeiter/kostenvoranschlaege', label: 'Kostenvoranschläge' },
  { href: '/mitarbeiter/kv-erstellen', label: '+ Neuer KV' },
  { href: '/mitarbeiter/leistungen', label: 'BEMA-Leistungen' },
  { href: '/mitarbeiter/punktwerte', label: 'Punktwerte' },
];

export function ProtectedLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!api.isLoggedIn()) {
    return <Navigate to="/mitarbeiter/login" replace />;
  }

  const user = api.getUser();

  return (
    <div className="min-h-screen bg-secondary/30">
      {/* Top nav */}
      <header className="bg-primary text-primary-foreground shadow-md">
        <div className="max-w-7xl mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden text-primary-foreground/80 hover:text-primary-foreground p-1"
              aria-label="Menü"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {sidebarOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
            <a href="/" className="font-bold text-lg hover:text-accent transition-colors">
              KFO Moosburg
            </a>
            <span className="text-primary-foreground/50 hidden sm:inline">|</span>
            <span className="text-sm text-primary-foreground/80 hidden sm:inline">Interner Bereich</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-primary-foreground/70 hidden sm:inline">{user?.name || user?.email}</span>
            <button
              onClick={() => { api.logout(); window.location.href = '/mitarbeiter/login'; }}
              className="text-sm bg-primary-foreground/10 hover:bg-primary-foreground/20 px-3 py-1.5 rounded-lg transition-colors"
            >
              Abmelden
            </button>
          </div>
        </div>
      </header>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar + Content */}
      <div className="max-w-7xl mx-auto flex min-h-[calc(100vh-56px)]">
        <nav className={`
          ${sidebarOpen ? 'fixed inset-y-0 left-0 z-50 w-56 pt-14' : 'hidden'}
          md:relative md:block md:pt-0 md:z-auto
          w-56 bg-card border-r p-4
        `}>
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    window.location.pathname === item.href
                      ? "bg-accent/10 text-accent"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
