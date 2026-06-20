/**
 * AI route — scaffolded for Phase 2.
 * Endpoints exist and return a "not yet configured" response.
 * Wire up src/services/ai.js when ready.
 */
import { Router } from 'express';
import { configQueries } from '../db/queries.js';

const router = Router();

router.get('/status', (_req, res) => {
  const provider = configQueries.get('ai_provider');
  res.json({
    enabled: false,
    provider: provider || null,
    message: 'AI integration is not yet configured. Set ai_provider and corresponding API keys in config.',
  });
});

router.post('/chat', (_req, res) => {
  res.status(503).json({
    error: 'AI integration not yet enabled',
    hint: 'Phase 2 feature — configure an AI provider in Settings to enable.',
  });
});

export default router;
