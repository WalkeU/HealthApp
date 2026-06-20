import { Router } from 'express';
import { configQueries } from '../db/queries.js';

const router = Router();

const SENSITIVE_KEYS = ['strava_client_secret', 'garmin_password', 'anthropic_api_key', 'openai_api_key'];

router.get('/', (_req, res) => {
  const config = configQueries.getAll();
  // Mask sensitive values
  for (const key of SENSITIVE_KEYS) {
    if (config[key]) config[key] = '••••••••';
  }
  res.json(config);
});

router.post('/', (req, res) => {
  const body = req.body;
  if (typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({ error: 'Body must be a key-value object' });
  }
  configQueries.setMany(body);
  res.json({ ok: true });
});

export default router;
