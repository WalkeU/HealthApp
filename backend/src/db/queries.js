import { getDb } from './schema.js';
export { getDb };

// --- Activities ---

export const activityQueries = {
  list(filters = {}) {
    const db = getDb();
    let sql = 'SELECT * FROM activities WHERE 1=1';
    const params = [];
    if (filters.from) { sql += ' AND date >= ?'; params.push(filters.from); }
    if (filters.to)   { sql += ' AND date <= ?'; params.push(filters.to); }
    if (filters.source) { sql += ' AND source = ?'; params.push(filters.source); }
    if (filters.type)   { sql += ' AND type = ?'; params.push(filters.type); }
    sql += ' ORDER BY date DESC, id DESC';
    if (filters.limit) { sql += ` LIMIT ${parseInt(filters.limit, 10)}`; }
    return db.prepare(sql).all(...params);
  },

  getById(id) {
    return getDb().prepare('SELECT * FROM activities WHERE id = ?').get(id);
  },

  upsert(activity) {
    const db = getDb();
    return db.prepare(`
      INSERT INTO activities (
        source, external_id, date, type, name,
        distance_m, duration_s, elapsed_duration_s, moving_duration_s, avg_pace_s, avg_speed_ms, max_speed_ms,
        avg_hr, max_hr, hr_zone1_s, hr_zone2_s, hr_zone3_s, hr_zone4_s, hr_zone5_s,
        elevation_m, elevation_loss_m, calories,
        avg_cadence, max_cadence, avg_stride_length_m, avg_vertical_oscillation, avg_ground_contact_time, avg_vertical_ratio, steps,
        avg_power, max_power, norm_power,
        aerobic_te, anaerobic_te, training_effect_label, vo2max,
        location_name, is_pr, raw_json
      ) VALUES (
        @source, @external_id, @date, @type, @name,
        @distance_m, @duration_s, @elapsed_duration_s, @moving_duration_s, @avg_pace_s, @avg_speed_ms, @max_speed_ms,
        @avg_hr, @max_hr, @hr_zone1_s, @hr_zone2_s, @hr_zone3_s, @hr_zone4_s, @hr_zone5_s,
        @elevation_m, @elevation_loss_m, @calories,
        @avg_cadence, @max_cadence, @avg_stride_length_m, @avg_vertical_oscillation, @avg_ground_contact_time, @avg_vertical_ratio, @steps,
        @avg_power, @max_power, @norm_power,
        @aerobic_te, @anaerobic_te, @training_effect_label, @vo2max,
        @location_name, @is_pr, @raw_json
      )
      ON CONFLICT(source, external_id) DO UPDATE SET
        date=excluded.date, type=excluded.type, name=excluded.name,
        distance_m=excluded.distance_m, duration_s=excluded.duration_s,
        elapsed_duration_s=excluded.elapsed_duration_s, moving_duration_s=excluded.moving_duration_s,
        avg_pace_s=excluded.avg_pace_s, avg_speed_ms=excluded.avg_speed_ms, max_speed_ms=excluded.max_speed_ms,
        avg_hr=excluded.avg_hr, max_hr=excluded.max_hr,
        hr_zone1_s=excluded.hr_zone1_s, hr_zone2_s=excluded.hr_zone2_s, hr_zone3_s=excluded.hr_zone3_s,
        hr_zone4_s=excluded.hr_zone4_s, hr_zone5_s=excluded.hr_zone5_s,
        elevation_m=excluded.elevation_m, elevation_loss_m=excluded.elevation_loss_m, calories=excluded.calories,
        avg_cadence=excluded.avg_cadence, max_cadence=excluded.max_cadence,
        avg_stride_length_m=excluded.avg_stride_length_m, avg_vertical_oscillation=excluded.avg_vertical_oscillation,
        avg_ground_contact_time=excluded.avg_ground_contact_time, avg_vertical_ratio=excluded.avg_vertical_ratio,
        steps=excluded.steps, avg_power=excluded.avg_power, max_power=excluded.max_power, norm_power=excluded.norm_power,
        aerobic_te=excluded.aerobic_te, anaerobic_te=excluded.anaerobic_te,
        training_effect_label=excluded.training_effect_label, vo2max=excluded.vo2max,
        location_name=excluded.location_name, is_pr=excluded.is_pr, raw_json=excluded.raw_json
    `).run(activity);
  },

  insert(activity) {
    const db = getDb();
    return db.prepare(`
      INSERT INTO activities (source, external_id, date, type, distance_m, duration_s, avg_hr, max_hr, elevation_m, avg_pace_s, name, raw_json)
      VALUES (@source, @external_id, @date, @type, @distance_m, @duration_s, @avg_hr, @max_hr, @elevation_m, @avg_pace_s, @name, @raw_json)
    `).run(activity);
  },

  weeklyMileage(weeks = 12) {
    const db   = getDb();
    const days = weeks * 7; // SQLite doesn't support 'weeks' modifier — use days
    return db.prepare(`
      SELECT
        strftime('%Y-W%W', date) AS week,
        ROUND(SUM(distance_m) / 1000.0, 2) AS total_km,
        COUNT(*) AS runs
      FROM activities
      WHERE type = 'run'
        AND date >= date('now', '-' || ? || ' days')
      GROUP BY week
      ORDER BY week ASC
    `).all(days);
  },
};

// --- Health Daily ---

export const healthQueries = {
  list(filters = {}) {
    const db = getDb();
    let sql = 'SELECT * FROM health_daily WHERE 1=1';
    const params = [];
    if (filters.from)   { sql += ' AND date >= ?'; params.push(filters.from); }
    if (filters.to)     { sql += ' AND date <= ?'; params.push(filters.to); }
    if (filters.source) { sql += ' AND source = ?'; params.push(filters.source); }
    sql += ' ORDER BY date DESC';
    if (filters.limit) { sql += ` LIMIT ${parseInt(filters.limit, 10)}`; }
    return db.prepare(sql).all(...params);
  },

  upsert(entry) {
    const db = getDb();
    return db.prepare(`
      INSERT INTO health_daily (
        date, source,
        resting_hr, max_hr_day,
        hrv, hrv_weekly_avg, hrv_status,
        sleep_duration_s, sleep_score, deep_sleep_s, light_sleep_s, rem_sleep_s, awake_s,
        sleep_rem_pct, sleep_deep_pct, sleep_restfulness,
        spo2_avg, spo2_min,
        avg_stress, body_battery_high, body_battery_low, body_battery_charged, body_battery_drained,
        avg_respiration, min_respiration, max_respiration,
        avg_sleep_hr, awake_count, sleep_feedback, sleep_need_min,
        steps, weight_kg, raw_json
      ) VALUES (
        @date, @source,
        @resting_hr, @max_hr_day,
        @hrv, @hrv_weekly_avg, @hrv_status,
        @sleep_duration_s, @sleep_score, @deep_sleep_s, @light_sleep_s, @rem_sleep_s, @awake_s,
        @sleep_rem_pct, @sleep_deep_pct, @sleep_restfulness,
        @spo2_avg, @spo2_min,
        @avg_stress, @body_battery_high, @body_battery_low, @body_battery_charged, @body_battery_drained,
        @avg_respiration, @min_respiration, @max_respiration,
        @avg_sleep_hr, @awake_count, @sleep_feedback, @sleep_need_min,
        @nap_duration_s, @nap_count,
        @steps, @weight_kg, @raw_json
      )
      ON CONFLICT(date, source) DO UPDATE SET
        resting_hr=excluded.resting_hr, max_hr_day=excluded.max_hr_day,
        hrv=excluded.hrv, hrv_weekly_avg=excluded.hrv_weekly_avg, hrv_status=excluded.hrv_status,
        sleep_duration_s=excluded.sleep_duration_s, sleep_score=excluded.sleep_score,
        deep_sleep_s=excluded.deep_sleep_s, light_sleep_s=excluded.light_sleep_s,
        rem_sleep_s=excluded.rem_sleep_s, awake_s=excluded.awake_s,
        sleep_rem_pct=excluded.sleep_rem_pct, sleep_deep_pct=excluded.sleep_deep_pct,
        sleep_restfulness=excluded.sleep_restfulness,
        spo2_avg=excluded.spo2_avg, spo2_min=excluded.spo2_min,
        avg_stress=excluded.avg_stress,
        body_battery_high=excluded.body_battery_high, body_battery_low=excluded.body_battery_low,
        body_battery_charged=excluded.body_battery_charged, body_battery_drained=excluded.body_battery_drained,
        avg_respiration=excluded.avg_respiration, min_respiration=excluded.min_respiration,
        max_respiration=excluded.max_respiration, avg_sleep_hr=excluded.avg_sleep_hr,
        awake_count=excluded.awake_count, sleep_feedback=excluded.sleep_feedback,
        sleep_need_min=excluded.sleep_need_min,
        nap_duration_s=excluded.nap_duration_s, nap_count=excluded.nap_count,
        steps=excluded.steps, weight_kg=excluded.weight_kg, raw_json=excluded.raw_json
    `).run(entry);
  },

  hrTrend(days = 30) {
    return getDb().prepare(`
      SELECT date, AVG(resting_hr) AS avg_resting_hr
      FROM health_daily
      WHERE resting_hr IS NOT NULL AND date >= date('now', '-' || ? || ' days')
      GROUP BY date ORDER BY date ASC
    `).all(days);
  },

  hrvTrend(days = 30) {
    return getDb().prepare(`
      SELECT date, AVG(hrv) AS avg_hrv
      FROM health_daily
      WHERE hrv IS NOT NULL AND date >= date('now', '-' || ? || ' days')
      GROUP BY date ORDER BY date ASC
    `).all(days);
  },

  sleepTrend(days = 30) {
    return getDb().prepare(`
      SELECT date,
             AVG(sleep_duration_s) AS avg_sleep_duration_s,
             AVG(sleep_score) AS avg_sleep_score
      FROM health_daily
      WHERE sleep_duration_s IS NOT NULL AND date >= date('now', '-' || ? || ' days')
      GROUP BY date ORDER BY date ASC
    `).all(days);
  },

  bbTrend(days = 30) {
    return getDb().prepare(`
      SELECT date,
             MAX(body_battery_high)    AS high,
             MIN(body_battery_low)     AS low,
             AVG(body_battery_charged) AS charged,
             AVG(body_battery_drained) AS drained
      FROM health_daily
      WHERE body_battery_high IS NOT NULL AND date >= date('now', '-' || ? || ' days')
      GROUP BY date ORDER BY date ASC
    `).all(days);
  },
};

// --- Notes ---

export const noteQueries = {
  list(filters = {}) {
    const db = getDb();
    let sql = 'SELECT * FROM notes WHERE 1=1';
    const params = [];
    if (filters.from) { sql += ' AND date >= ?'; params.push(filters.from); }
    if (filters.to)   { sql += ' AND date <= ?'; params.push(filters.to); }
    sql += ' ORDER BY date DESC, id DESC';
    if (filters.limit) { sql += ` LIMIT ${parseInt(filters.limit, 10)}`; }
    return db.prepare(sql).all(...params);
  },

  getById(id) {
    return getDb().prepare('SELECT * FROM notes WHERE id = ?').get(id);
  },

  create(note) {
    const db = getDb();
    const result = db.prepare(`
      INSERT INTO notes (date, activity_id, content, tags, wellbeing_score)
      VALUES (@date, @activity_id, @content, @tags, @wellbeing_score)
    `).run(note);
    return db.prepare('SELECT * FROM notes WHERE id = ?').get(result.lastInsertRowid);
  },

  update(id, fields) {
    const db = getDb();
    const allowed = ['content', 'tags', 'wellbeing_score', 'date'];
    const sets = allowed.filter(k => k in fields).map(k => `${k} = @${k}`);
    if (!sets.length) return null;
    sets.push("updated_at = datetime('now')");
    db.prepare(`UPDATE notes SET ${sets.join(', ')} WHERE id = @id`).run({ ...fields, id });
    return db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
  },

  delete(id) {
    return getDb().prepare('DELETE FROM notes WHERE id = ?').run(id);
  },
};

// --- Pain Log ---

export const painLogQueries = {
  list(filters = {}) {
    const db = getDb();
    let sql = 'SELECT * FROM pain_log WHERE 1=1';
    const params = [];
    if (filters.from) { sql += ' AND date >= ?'; params.push(filters.from); }
    if (filters.to)   { sql += ' AND date <= ?'; params.push(filters.to); }
    sql += ' ORDER BY date DESC, id DESC';
    if (filters.limit) { sql += ` LIMIT ${parseInt(filters.limit, 10)}`; }
    return db.prepare(sql).all(...params);
  },

  create(entry) {
    const db = getDb();
    const result = db.prepare(`
      INSERT INTO pain_log (date, body_part, severity, description)
      VALUES (@date, @body_part, @severity, @description)
    `).run(entry);
    return db.prepare('SELECT * FROM pain_log WHERE id = ?').get(result.lastInsertRowid);
  },
};

// --- Config ---

export const configQueries = {
  getAll() {
    const rows = getDb().prepare('SELECT key, value FROM config').all();
    return Object.fromEntries(rows.map(r => [r.key, r.value]));
  },

  get(key) {
    const row = getDb().prepare('SELECT value FROM config WHERE key = ?').get(key);
    return row?.value ?? null;
  },

  set(key, value) {
    getDb().prepare(`
      INSERT INTO config (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=datetime('now')
    `).run(key, value);
  },

  setMany(obj) {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO config (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=datetime('now')
    `);
    const tx = db.transaction((entries) => {
      for (const [k, v] of entries) stmt.run(k, v);
    });
    tx(Object.entries(obj));
  },
};

// --- Dashboard ---

export const dashboardQueries = {
  summary() {
    const db = getDb();

    const weeklyKm = db.prepare(`
      SELECT ROUND(SUM(distance_m) / 1000.0, 2) AS total_km, COUNT(*) AS runs
      FROM activities
      WHERE type = 'run' AND date >= date('now', '-7 days')
    `).get();

    const lastRun = db.prepare(`
      SELECT * FROM activities WHERE type = 'run' ORDER BY date DESC LIMIT 1
    `).get();

    const avgPace = db.prepare(`
      SELECT AVG(avg_pace_s) AS avg_pace_s
      FROM activities
      WHERE type = 'run' AND avg_pace_s IS NOT NULL AND date >= date('now', '-30 days')
    `).get();

    // 7-day averages for trend cards
    const latestHealth = db.prepare(`
      SELECT
        AVG(resting_hr)       AS resting_hr,
        AVG(hrv)              AS hrv,
        AVG(hrv_weekly_avg)   AS hrv_weekly_avg,
        AVG(sleep_duration_s) AS sleep_duration_s,
        AVG(sleep_score)      AS sleep_score,
        AVG(deep_sleep_s)     AS deep_sleep_s,
        AVG(light_sleep_s)    AS light_sleep_s,
        AVG(rem_sleep_s)      AS rem_sleep_s,
        AVG(awake_s)          AS awake_s,
        AVG(spo2_avg)         AS spo2_avg,
        AVG(avg_stress)       AS avg_stress,
        AVG(steps)            AS steps
      FROM health_daily
      WHERE date >= date('now', '-7 days')
    `).get();

    // Most recent single record for HRV status and exact values
    const todayHealth = db.prepare(`
      SELECT * FROM health_daily ORDER BY date DESC LIMIT 1
    `).get();

    const recentRuns = db.prepare(`
      SELECT * FROM activities WHERE type = 'run' ORDER BY date DESC LIMIT 10
    `).all();

    return { weeklyKm, lastRun, avgPace, latestHealth, todayHealth, recentRuns };
  },
};
