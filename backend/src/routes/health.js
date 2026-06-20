import { Router } from 'express';
import { healthQueries, getDb } from '../db/queries.js';

const router = Router();

router.get('/daily', (req, res) => {
  const { from, to, source, limit } = req.query;
  res.json(healthQueries.list({ from, to, source, limit }));
});

router.get('/hr-trend', (req, res) => {
  const days = parseInt(req.query.days ?? '30', 10);
  res.json(healthQueries.hrTrend(days));
});

router.get('/hrv-trend', (req, res) => {
  const days = parseInt(req.query.days ?? '30', 10);
  res.json(healthQueries.hrvTrend(days));
});

router.get('/sleep-trend', (req, res) => {
  const days = parseInt(req.query.days ?? '30', 10);
  res.json(healthQueries.sleepTrend(days));
});

router.get('/bb-trend', (req, res) => {
  const days = parseInt(req.query.days ?? '30', 10);
  res.json(healthQueries.bbTrend(days));
});

// Returns sleepLevels phase timeline for a specific date (or latest if no date given)
router.get('/sleep-detail', (req, res) => {
  const db = getDb();
  const date = req.query.date;

  const row = date
    ? db.prepare(`SELECT date, raw_json FROM health_daily WHERE date = ? AND raw_json IS NOT NULL ORDER BY id DESC LIMIT 1`).get(date)
    : db.prepare(`SELECT date, raw_json FROM health_daily WHERE raw_json IS NOT NULL ORDER BY date DESC LIMIT 1`).get();

  if (!row?.raw_json) return res.json({ date: null, sleepLevels: [], sleepMovement: [] });

  const raw = JSON.parse(row.raw_json);
  // sleepLevels: [{startGMT, endGMT, activityLevel}]
  // activityLevel: 0=deep, 1=light, 2=awake, 3=REM
  res.json({
    date:          row.date,
    sleepLevels:   raw.sleep?.sleepLevels   ?? [],
    sleepMovement: raw.sleep?.sleepMovement ?? [],
    remSleepData:  raw.sleep?.remSleepData  ?? false,
    dto:           raw.sleep?.dailySleepDTO ?? null,
  });
});

export default router;
