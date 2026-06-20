import { Router } from 'express';
import { activityQueries } from '../db/queries.js';

const router = Router();

// Static routes MUST come before /:id to avoid Express treating "stats" as an id
router.get('/stats/weekly-mileage', (req, res) => {
  const weeks = parseInt(req.query.weeks ?? '12', 10);
  res.json(activityQueries.weeklyMileage(weeks));
});

router.get('/', (req, res) => {
  const { from, to, source, type, limit } = req.query;
  res.json(activityQueries.list({ from, to, source, type, limit }));
});

router.get('/:id', (req, res) => {
  const activity = activityQueries.getById(req.params.id);
  if (!activity) return res.status(404).json({ error: 'Not found' });
  res.json(activity);
});

router.post('/', (req, res) => {
  const { source = 'manual', date, type = 'run', distance_m, duration_s, avg_hr, max_hr, elevation_m, avg_pace_s, name } = req.body;
  if (!date) return res.status(400).json({ error: 'date is required' });

  const result = activityQueries.insert({
    source,
    external_id: null,
    date,
    type,
    distance_m:  distance_m  ?? null,
    duration_s:  duration_s  ?? null,
    avg_hr:      avg_hr      ?? null,
    max_hr:      max_hr      ?? null,
    elevation_m: elevation_m ?? null,
    avg_pace_s:  avg_pace_s  ?? null,
    name:        name        ?? null,
    raw_json:    null,
  });
  res.status(201).json(activityQueries.getById(result.lastInsertRowid));
});

export default router;
