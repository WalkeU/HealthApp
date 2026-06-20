/**
 * AI service — scaffolded for Phase 2.
 *
 * Supports three providers (switchable via config key "ai_provider"):
 *   - "anthropic"  → Claude API
 *   - "openai"     → OpenAI API
 *   - "ollama"     → Local LLM on Mac Mini
 *
 * Call chat(messages, context) once a provider is configured.
 * The context object is built from recent runs, health data, and notes
 * so the AI can answer questions like "Why am I tired this week?"
 */

export async function chat(_messages, _context) {
  throw new Error('AI integration not yet enabled (Phase 2). Configure ai_provider in settings.');
}

// Provider stubs — implement each in Phase 2

async function callAnthropic(_messages, _context) {
  // import Anthropic from '@anthropic-ai/sdk';
  // const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  // const response = await client.messages.create({ ... });
  throw new Error('Not implemented');
}

async function callOpenAI(_messages, _context) {
  // import OpenAI from 'openai';
  // const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  // const completion = await client.chat.completions.create({ ... });
  throw new Error('Not implemented');
}

async function callOllama(_messages, _context) {
  // const baseUrl = process.env.OLLAMA_BASE_URL || 'http://mac-mini.local:11434';
  // const res = await fetch(`${baseUrl}/api/chat`, { method: 'POST', body: JSON.stringify({ ... }) });
  throw new Error('Not implemented');
}
