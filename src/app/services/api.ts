const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

async function request(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('kfo_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401 || res.status === 403) {
    localStorage.removeItem('kfo_token');
    localStorage.removeItem('kfo_user');
    if (window.location.pathname.startsWith('/mitarbeiter')) {
      window.location.href = '/mitarbeiter/login';
    }
  }

  return res;
}

export const api = {
  // Auth
  async login(email: string, password: string) {
    const res = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    localStorage.setItem('kfo_token', data.token);
    localStorage.setItem('kfo_user', JSON.stringify(data.user));
    return data;
  },

  logout() {
    localStorage.removeItem('kfo_token');
    localStorage.removeItem('kfo_user');
  },

  getUser() {
    const u = localStorage.getItem('kfo_user');
    return u ? JSON.parse(u) : null;
  },

  isLoggedIn() {
    return !!localStorage.getItem('kfo_token');
  },

  // Preisrechner (öffentlich)
  async getBehandlungen() {
    const res = await request('/api/preisrechner/behandlungen');
    return res.json();
  },

  async getKassenarten() {
    const res = await request('/api/preisrechner/kassenarten');
    return res.json();
  },

  async berechnePreis(data: {
    versicherungsart: string;
    kassenart?: string;
    behandlungsart: string;
    kig_stufe?: string;
  }) {
    const res = await request('/api/preisrechner/berechnen', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async sendeAnfrage(data: Record<string, unknown>) {
    const res = await request('/api/anfragen', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Punktwerte
  async getPunktwerte() {
    const res = await request('/api/punktwerte');
    return res.json();
  },

  async getPunkwerteAktuell() {
    const res = await request('/api/punktwerte/aktuell');
    return res.json();
  },

  async importPunktwerte() {
    const res = await request('/api/punktwerte/import', { method: 'POST' });
    return res.json();
  },

  // Leistungen
  async getLeistungen() {
    const res = await request('/api/leistungen');
    return res.json();
  },

  // Anfragen
  async getAnfragen(status?: string) {
    const q = status ? `?status=${status}` : '';
    const res = await request(`/api/anfragen${q}`);
    return res.json();
  },

  async updateAnfrageStatus(id: number, status: string) {
    const res = await request(`/api/anfragen/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    return res.json();
  },

  // Kostenvoranschläge
  async getKVs() {
    const res = await request('/api/kostenvoranschlaege');
    return res.json();
  },

  async createKV(data: Record<string, unknown>) {
    const res = await request('/api/kostenvoranschlaege', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error);
    return result;
  },

  async getKV(id: number) {
    const res = await request(`/api/kostenvoranschlaege/${id}`);
    return res.json();
  },

  getKVPdfUrl(id: number) {
    const token = localStorage.getItem('kfo_token');
    return `${API_BASE}/api/kostenvoranschlaege/${id}/pdf?token=${token}`;
  },

  async updateKVStatus(id: number, status: string) {
    const res = await request(`/api/kostenvoranschlaege/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    return res.json();
  },

  async updateKV(id: number, data: Record<string, unknown>) {
    const res = await request(`/api/kostenvoranschlaege/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error);
    return result;
  },

  // Leistungen
  async updateLeistung(id: number, data: Record<string, unknown>) {
    const res = await request(`/api/leistungen/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error);
    return result;
  },

  async createLeistung(data: Record<string, unknown>) {
    const res = await request('/api/leistungen', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error);
    return result;
  },

  async deleteLeistung(id: number) {
    const res = await request(`/api/leistungen/${id}`, { method: 'DELETE' });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error);
    return result;
  },

  // Anfragen
  async deleteAnfrage(id: number) {
    const res = await request(`/api/anfragen/${id}`, { method: 'DELETE' });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error);
    return result;
  },
};
