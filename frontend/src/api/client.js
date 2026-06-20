const BASE = '/api';

async function request(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

const get = (path) => request('GET', path);
const post = (path, body) => request('POST', path, body);
const put = (path, body) => request('PUT', path, body);
const del = (path) => request('DELETE', path);

export const api = {
  // Dashboard
  getDashboardSummary: () => get('/dashboard/summary'),

  // Activities
  getActivities: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return get(`/activities${qs ? `?${qs}` : ''}`);
  },
  getActivity: (id) => get(`/activities/${id}`),
  createActivity: (data) => post('/activities', data),
  getWeeklyMileage: (weeks = 12) => get(`/activities/stats/weekly-mileage?weeks=${weeks}`),

  // Health
  getHealthDaily: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return get(`/health/daily${qs ? `?${qs}` : ''}`);
  },
  getHrTrend: (days = 30) => get(`/health/hr-trend?days=${days}`),
  getHrvTrend: (days = 30) => get(`/health/hrv-trend?days=${days}`),
  getSleepTrend:  (days = 30) => get(`/health/sleep-trend?days=${days}`),
  getSleepDetail: (date)      => get(`/health/sleep-detail${date ? `?date=${date}` : ''}`),
  getBbTrend:     (days = 30) => get(`/health/bb-trend?days=${days}`),

  // Notes
  getNotes: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return get(`/notes${qs ? `?${qs}` : ''}`);
  },
  createNote: (data) => post('/notes', data),
  updateNote: (id, data) => put(`/notes/${id}`, data),
  deleteNote: (id) => del(`/notes/${id}`),

  // Pain log
  getPainLog: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return get(`/pain-log${qs ? `?${qs}` : ''}`);
  },
  createPainEntry: (data) => post('/pain-log', data),

  // Sync
  syncStrava: () => post('/sync/strava'),
  syncGarmin: () => post('/sync/garmin'),
  importAppleHealth: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return fetch(`${BASE}/sync/apple-health`, { method: 'POST', body: fd }).then(r => r.json());
  },

  // Config
  getConfig: () => get('/config'),
  saveConfig: (data) => post('/config', data),

  // AI (Phase 2)
  getAiStatus: () => get('/ai/status'),
  aiChat: (messages) => post('/ai/chat', { messages }),
};
