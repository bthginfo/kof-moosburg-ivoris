import { Navigate, Outlet } from "react-router";
import { api } from "../../../services/api";

export function ProtectedLayout() {
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
            <a href="/" className="font-bold text-lg hover:text-accent transition-colors">
              KFO Moosburg
            </a>
            <span className="text-primary-foreground/50">|</span>
            <span className="text-sm text-primary-foreground/80">Interner Bereich</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-primary-foreground/70">{user?.name || user?.email}</span>
            <button
              onClick={() => { api.logout(); window.location.href = '/mitarbeiter/login'; }}
              className="text-sm bg-primary-foreground/10 hover:bg-primary-foreground/20 px-3 py-1.5 rounded-lg transition-colors"
            >
              Abmelden
            </button>
          </div>
        </div>
      </header>

      {/* Sidebar + Content */}
      <div className="max-w-7xl mx-auto flex min-h-[calc(100vh-56px)]">
        <nav className="hidden md:block w-56 bg-card border-r p-4">
          <ul className="space-y-1">
            {[
              { href: '/mitarbeiter', label: 'Dashboard' },
              { href: '/mitarbeiter/anfragen', label: 'Anfragen' },
              { href: '/mitarbeiter/kostenvoranschlaege', label: 'Kostenvoranschläge' },
              { href: '/mitarbeiter/kv-erstellen', label: '+ Neuer KV' },
              { href: '/mitarbeiter/punktwerte', label: 'Punktwerte' },
            ].map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
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
