import { Router } from 'express';
import multer from 'multer';
import { syncGarmin } from '../services/garmin.js';
import { syncStrava, stravaCallback } from '../services/strava.js';
import { importAppleHealth } from '../services/appleHealth.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 500 * 1024 * 1024 } });

router.post('/garmin', async (_req, res) => {
  try {
    const result = await syncGarmin();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/strava/auth', (_req, res) => {
  const clientId = process.env.STRAVA_CLIENT_ID;
  if (!clientId) return res.status(400).json({ error: 'STRAVA_CLIENT_ID not configured' });
  const redirectUri = process.env.STRAVA_REDIRECT_URI || 'http://localhost:3001/api/sync/strava/callback';
  const url = `https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=read,activity:read_all`;
  res.redirect(url);
});

router.get('/strava/callback', async (req, res) => {
  try {
    const result = await stravaCallback(req.query.code);
    res.redirect('/?strava=connected');
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/strava', async (_req, res) => {
  try {
    const result = await syncStrava();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/apple-health', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try {
    const result = await importAppleHealth(req.file.buffer);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
