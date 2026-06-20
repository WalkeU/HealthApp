export function formatPace(avg_pace_s) {
  if (!avg_pace_s) return '—';
  const min = Math.floor(avg_pace_s / 60);
  const sec = Math.round(avg_pace_s % 60);
  return `${min}:${String(sec).padStart(2, '0')} /km`;
}

export function formatDuration(s) {
  if (s == null) return '—';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.round(s % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export function formatDistance(m) {
  if (m == null) return '—';
  return `${(m / 1000).toFixed(2)} km`;
}

export function formatDate(str) {
  if (!str) return '—';
  const d = new Date(str.length === 10 ? str + 'T00:00:00' : str);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function formatSleep(s) {
  if (!s) return '—';
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  return `${h}h ${m}m`;
}

export function formatHrv(v) {
  if (v == null) return '—';
  return `${Math.round(v)} ms`;
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}
