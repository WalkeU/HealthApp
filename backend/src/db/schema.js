import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.SQLITE_PATH || path.join(process.cwd(), 'data', 'healthapp.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

let db;

export function getDb() {
  if (!db) throw new Error('Database not initialized. Call initDb() first.');
  return db;
}

export function initDb() {
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS activities (
      id                        INTEGER PRIMARY KEY AUTOINCREMENT,
      source                    TEXT NOT NULL,
      external_id               TEXT,
      date                      TEXT NOT NULL,
      type                      TEXT NOT NULL DEFAULT 'run',
      name                      TEXT,
      -- Distance / pace / speed
      distance_m                REAL,
      duration_s                INTEGER,
      elapsed_duration_s        INTEGER,
      moving_duration_s         INTEGER,
      avg_pace_s                INTEGER,
      avg_speed_ms              REAL,
      max_speed_ms              REAL,
      -- Heart rate
      avg_hr                    INTEGER,
      max_hr                    INTEGER,
      hr_zone1_s                INTEGER,
      hr_zone2_s                INTEGER,
      hr_zone3_s                INTEGER,
      hr_zone4_s                INTEGER,
      hr_zone5_s                INTEGER,
      -- Elevation
      elevation_m               REAL,
      elevation_loss_m          REAL,
      -- Calories
      calories                  INTEGER,
      -- Running dynamics
      avg_cadence               INTEGER,
      max_cadence               INTEGER,
      avg_stride_length_m       REAL,
      avg_vertical_oscillation  REAL,
      avg_ground_contact_time   REAL,
      avg_vertical_ratio        REAL,
      steps                     INTEGER,
      -- Power
      avg_power                 INTEGER,
      max_power                 INTEGER,
      norm_power                INTEGER,
      -- Training load
      aerobic_te                REAL,
      anaerobic_te              REAL,
      training_effect_label     TEXT,
      vo2max                    REAL,
      -- Meta
      location_name             TEXT,
      is_pr                     INTEGER DEFAULT 0,
      raw_json                  TEXT,
      created_at                TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(source, external_id)
    );

    CREATE TABLE IF NOT EXISTS health_daily (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      date              TEXT NOT NULL,
      source            TEXT NOT NULL,
      -- Heart rate
      resting_hr        INTEGER,
      max_hr_day        INTEGER,
      -- HRV
      hrv               REAL,
      hrv_weekly_avg    REAL,
      hrv_status        TEXT,
      -- Sleep totals
      sleep_duration_s  INTEGER,
      sleep_score       INTEGER,
      deep_sleep_s      INTEGER,
      light_sleep_s     INTEGER,
      rem_sleep_s       INTEGER,
      awake_s           INTEGER,
      -- Sleep scores
      sleep_rem_pct     INTEGER,
      sleep_deep_pct    INTEGER,
      sleep_restfulness INTEGER,
      -- SpO2
      spo2_avg          REAL,
      spo2_min          INTEGER,
      -- Stress / body battery
      avg_stress           REAL,
      body_battery_high    INTEGER,
      body_battery_low     INTEGER,
      body_battery_charged INTEGER,
      body_battery_drained INTEGER,
      -- Respiration during sleep
      avg_respiration   REAL,
      min_respiration   INTEGER,
      max_respiration   INTEGER,
      -- Sleep HR & quality detail
      avg_sleep_hr      INTEGER,
      awake_count       INTEGER,
      sleep_feedback    TEXT,
      sleep_need_min    INTEGER,
      nap_duration_s    INTEGER,
      nap_count         INTEGER,
      -- Activity
      steps             INTEGER,
      weight_kg         REAL,
      raw_json          TEXT,
      created_at        TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(date, source)
    );

    CREATE TABLE IF NOT EXISTS notes (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      date            TEXT NOT NULL,
      activity_id     INTEGER REFERENCES activities(id) ON DELETE SET NULL,
      content         TEXT NOT NULL,
      tags            TEXT,
      wellbeing_score INTEGER CHECK(wellbeing_score BETWEEN 1 AND 5),
      created_at      TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS pain_log (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      date        TEXT NOT NULL,
      body_part   TEXT NOT NULL,
      severity    INTEGER NOT NULL CHECK(severity BETWEEN 1 AND 5),
      description TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS config (
      key         TEXT PRIMARY KEY,
      value       TEXT,
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_activities_date ON activities(date);
    CREATE INDEX IF NOT EXISTS idx_health_daily_date ON health_daily(date);
    CREATE INDEX IF NOT EXISTS idx_notes_date ON notes(date);
    CREATE INDEX IF NOT EXISTS idx_pain_log_date ON pain_log(date);
  `);

  // Migrate existing DBs: add any columns that may not exist yet
  migrateColumns(db);

  console.log(`Database initialized at ${DB_PATH}`);
  return db;
}

function addColumnIfMissing(db, table, column, definition) {
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  } catch {
    // Column already exists — fine
  }
}

function migrateColumns(db) {
  const activityCols = [
    ['elapsed_duration_s',       'INTEGER'],
    ['moving_duration_s',        'INTEGER'],
    ['avg_speed_ms',             'REAL'],
    ['max_speed_ms',             'REAL'],
    ['hr_zone1_s',               'INTEGER'],
    ['hr_zone2_s',               'INTEGER'],
    ['hr_zone3_s',               'INTEGER'],
    ['hr_zone4_s',               'INTEGER'],
    ['hr_zone5_s',               'INTEGER'],
    ['elevation_loss_m',         'REAL'],
    ['calories',                 'INTEGER'],
    ['avg_cadence',              'INTEGER'],
    ['max_cadence',              'INTEGER'],
    ['avg_stride_length_m',      'REAL'],
    ['avg_vertical_oscillation', 'REAL'],
    ['avg_ground_contact_time',  'REAL'],
    ['avg_vertical_ratio',       'REAL'],
    ['steps',                    'INTEGER'],
    ['avg_power',                'INTEGER'],
    ['max_power',                'INTEGER'],
    ['norm_power',               'INTEGER'],
    ['aerobic_te',               'REAL'],
    ['anaerobic_te',             'REAL'],
    ['training_effect_label',    'TEXT'],
    ['vo2max',                   'REAL'],
    ['location_name',            'TEXT'],
    ['is_pr',                    'INTEGER DEFAULT 0'],
  ];

  const healthCols = [
    ['max_hr_day',        'INTEGER'],
    ['hrv_weekly_avg',    'REAL'],
    ['hrv_status',        'TEXT'],
    ['deep_sleep_s',      'INTEGER'],
    ['light_sleep_s',     'INTEGER'],
    ['rem_sleep_s',       'INTEGER'],
    ['awake_s',           'INTEGER'],
    ['sleep_rem_pct',     'INTEGER'],
    ['sleep_deep_pct',    'INTEGER'],
    ['sleep_restfulness', 'INTEGER'],
    ['spo2_avg',          'REAL'],
    ['spo2_min',          'INTEGER'],
    ['avg_stress',        'REAL'],
    ['body_battery_high',    'INTEGER'],
    ['body_battery_low',     'INTEGER'],
    ['body_battery_charged', 'INTEGER'],
    ['body_battery_drained', 'INTEGER'],
    ['avg_respiration',      'REAL'],
    ['min_respiration',   'INTEGER'],
    ['max_respiration',   'INTEGER'],
    ['avg_sleep_hr',      'INTEGER'],
    ['awake_count',       'INTEGER'],
    ['sleep_feedback',    'TEXT'],
    ['sleep_need_min',    'INTEGER'],
    ['nap_duration_s',    'INTEGER'],
    ['nap_count',         'INTEGER'],
  ];

  for (const [col, def] of activityCols) addColumnIfMissing(db, 'activities',    col, def);
  for (const [col, def] of healthCols)   addColumnIfMissing(db, 'health_daily',  col, def);
}
