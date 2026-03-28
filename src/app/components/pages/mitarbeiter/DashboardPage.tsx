import { useState, useEffect } from "react";
import { api } from "../../../services/api";

export function DashboardPage() {
  const [stats, setStats] = useState({ anfragen: 0, kvs: 0, neueAnfragen: 0 });
  const user = api.getUser();

  useEffect(() => {
    Promise.all([
      api.getAnfragen().catch(() => []),
      api.getKVs().catch(() => []),
    ]).then(([anfragen, kvs]) => {
      setStats({
        anfragen: anfragen.length,
        kvs: kvs.length,
        neueAnfragen: anfragen.filter((a: { status: string }) => a.status === 'neu').length,
      });
    });
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-primary mb-6">
        Willkommen, {user?.name || 'Mitarbeiter'}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-card rounded-xl p-6 shadow-sm border">
          <p className="text-sm text-muted-foreground">Neue Anfragen</p>
          <p className="text-3xl font-bold text-accent mt-1">{stats.neueAnfragen}</p>
        </div>
        <div className="bg-card rounded-xl p-6 shadow-sm border">
          <p className="text-sm text-muted-foreground">Anfragen Gesamt</p>
          <p className="text-3xl font-bold text-primary mt-1">{stats.anfragen}</p>
        </div>
        <div className="bg-card rounded-xl p-6 shadow-sm border">
          <p className="text-sm text-muted-foreground">Kostenvoranschläge</p>
          <p className="text-3xl font-bold text-primary mt-1">{stats.kvs}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <h2 className="font-semibold text-lg text-foreground mb-3">Schnellzugriff</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        <a href="/mitarbeiter/kv-erstellen" className="bg-card border rounded-xl p-4 hover:border-accent transition-colors">
          <p className="font-semibold text-primary">+ Neuer Kostenvoranschlag</p>
          <p className="text-sm text-muted-foreground mt-1">KV basierend auf BEMA-Positionen erstellen</p>
        </a>
        <a href="/mitarbeiter/anfragen" className="bg-card border rounded-xl p-4 hover:border-accent transition-colors">
          <p className="font-semibold text-primary">Anfragen bearbeiten</p>
          <p className="text-sm text-muted-foreground mt-1">Patientenanfragen aus dem Preisrechner</p>
        </a>
        <a href="/mitarbeiter/punktwerte" className="bg-card border rounded-xl p-4 hover:border-accent transition-colors">
          <p className="font-semibold text-primary">Punktwerte</p>
          <p className="text-sm text-muted-foreground mt-1">KZVB-Punktwerte einsehen und importieren</p>
        </a>
      </div>
    </div>
  );
}
