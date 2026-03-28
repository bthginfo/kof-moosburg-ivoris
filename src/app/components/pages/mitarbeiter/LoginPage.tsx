import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { api } from "../../../services/api";

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [warmingUp, setWarmingUp] = useState(false);
  const navigate = useNavigate();

  // Warm-up: Backend + DB-Verbindung vor Login vorbereiten
  useEffect(() => {
    setWarmingUp(true);
    fetch(`${API_BASE}/api/health`)
      .catch(() => {})
      .finally(() => setWarmingUp(false));
  }, []);

  const warmupServer = () => {
    fetch(`${API_BASE}/api/health`)
      .catch(() => {
        // Retry nach 1.5 Sek., ohne den Login zu blockieren
        setTimeout(() => {
          fetch(`${API_BASE}/api/health`).catch(() => {});
        }, 1500);
      });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Start warm-up parallel, Login läuft sofort weiter
    warmupServer();

    try {
      await api.login(email, password);
      navigate("/mitarbeiter");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="min-h-screen bg-gradient-to-b from-secondary to-background flex items-center justify-center px-5">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-[1.25rem] shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-primary">Mitarbeiter-Login</h1>
            <p className="text-muted-foreground mt-2">KFO Praxis Moosburg – Interner Bereich</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">E-Mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full py-3 px-4 rounded-xl border-2 border-border bg-input-background focus:border-accent focus:outline-none"
                placeholder="name@kfo-moosburg.de"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Passwort</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full py-3 px-4 rounded-xl border-2 border-border bg-input-background focus:border-accent focus:outline-none"
              />
            </div>

            {error && (
              <div className="p-3 bg-destructive/10 text-destructive rounded-xl text-sm">{error}</div>
            )}

            {warmingUp && (
              <div className="p-3 bg-accent/10 text-accent rounded-xl text-sm flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" className="opacity-25" />
                  <path d="M4 12a8 8 0 018-8" className="opacity-75" />
                </svg>
                Verbindung wird vorbereitet...
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 rounded-xl transition-all disabled:opacity-50"
            >
              {loading ? "Anmelden..." : "Anmelden"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <a href="/" className="text-sm text-muted-foreground hover:text-accent">
              ← Zurück zur Website
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
