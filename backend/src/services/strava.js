/**
 * Strava OAuth2 + activity sync service.
 * OAuth flow: /api/sync/strava/auth → Strava → /api/sync/strava/callback
 */
import { configQueries, activityQueries } from '../db/queries.js';

const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token';
const STRAVA_API_BASE = 'https://www.strava.com/api/v3';

async function getValidToken() {
  const accessToken = configQueries.get('strava_access_token');
  const refreshToken = configQueries.get('strava_refresh_token');
  const expiresAt = parseInt(configQueries.get('strava_expires_at') ?? '0', 10);

  if (!refreshToken) throw new Error('Strava not connected. Authorize via /api/sync/strava/auth');

  if (Date.now() / 1000 < expiresAt - 60) return accessToken;

  const res = await fetch(STRAVA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) throw new Error(`Strava token refresh failed: ${res.status}`);
  const data = await res.json();
  configQueries.setMany({
    strava_access_token: data.access_token,
    strava_refresh_token: data.refresh_token,
    strava_expires_at: String(data.expires_at),
  });
  return data.access_token;
}

export async function stravaCallback(code) {
  const res = await fetch(STRAVA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) throw new Error(`Strava OAuth exchange failed: ${res.status}`);
  const data = await res.json();
  configQueries.setMany({
    strava_access_token: data.access_token,
    strava_refresh_token: data.refresh_token,
    strava_expires_at: String(data.expires_at),
    strava_athlete_id: String(data.athlete?.id ?? ''),
  });
  return { ok: true, athlete: data.athlete };
}

export async function syncStrava() {
  const token = await getValidToken();
  const lastSync = configQueries.get('strava_last_sync');
  const afterParam = lastSync ? `&after=${Math.floor(new Date(lastSync).getTime() / 1000)}` : '';

  let page = 1;
  let imported = 0;

  while (true) {
    const res = await fetch(`${STRAVA_API_BASE}/athlete/activities?per_page=50&page=${page}${afterParam}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Strava API error: ${res.status}`);
    const activities = await res.json();
    if (!activities.length) break;

    for (const a of activities) {
      activityQueries.upsert(mapStravaActivity(a));
      imported++;
    }
    if (activities.length < 50) break;
    page++;
  }

  configQueries.set('strava_last_sync', new Date().toISOString());
  return { ok: true, imported };
}

function mapStravaActivity(raw) {
  return {
    source: 'strava',
    external_id: String(raw.id),
    date: raw.start_date_local?.slice(0, 10),
    type: raw.type?.toLowerCase().includes('run') ? 'run' : raw.type?.toLowerCase() ?? 'other',
    distance_m: raw.distance ?? null,
    duration_s: raw.moving_time ?? null,
    avg_hr: raw.average_heartrate ? Math.round(raw.average_heartrate) : null,
    max_hr: raw.max_heartrate ? Math.round(raw.max_heartrate) : null,
    elevation_m: raw.total_elevation_gain ?? null,
    avg_pace_s: raw.average_speed > 0 ? Math.round(1000 / raw.average_speed) : null,
    name: raw.name ?? null,
    raw_json: JSON.stringify(raw),
  };
}
