import { Router } from 'express';
import { configQueries } from '../db/queries.js';
import { computeInsights, buildLLMContext } from '../services/insights.js';

const router = Router();

router.get('/status', (_req, res) => {
  const provider = configQueries.get('ai_provider');
  res.json({
    enabled: provider && provider !== 'disabled',
    provider: provider || null,
    message: (!provider || provider === 'disabled')
      ? 'AI integration not yet configured. Set ai_provider in Settings.'
      : `Using provider: ${provider}`,
  });
});

// Full algorithmic analysis — no LLM needed
router.get('/analyze', (_req, res) => {
  try {
    const insights = computeInsights();
    // Don't send raw db data to the frontend, only processed
    const { metrics, flags, scores, summary } = insights;
    res.json({ metrics, flags, scores, summary });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Generate LLM-ready prompt with all context
router.get('/context', (_req, res) => {
  try {
    const insights = computeInsights();
    const prompt = buildLLMContext(insights);
    res.json({ prompt, charCount: prompt.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Chat endpoint — calls configured LLM provider
router.post('/chat', async (req, res) => {
  const provider = configQueries.get('ai_provider');
  if (!provider || provider === 'disabled') {
    return res.status(503).json({
      error: 'AI integration not enabled',
      hint: 'Set ai_provider in Settings to enable.',
    });
  }
  // Phase 2: wire up actual LLM call here
  res.status(503).json({
    error: 'AI chat not yet implemented',
    hint: 'Use the /ai/context endpoint to get the prompt and send it to your LLM manually.',
  });
});

export default router;
