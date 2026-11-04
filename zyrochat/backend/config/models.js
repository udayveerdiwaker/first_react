/**
 * Server-Side Model Routing Configuration
 * 
 * Maps task categories to configured models.
 * Automatically falls back to VITE_MODEL or 'openrouter/free' if specific models are not configured.
 */

const DEFAULT_FALLBACK_MODEL = process.env.VITE_MODEL || "openrouter/free";

const MODEL_ROUTER_CONFIG = {
  // General chat & everyday queries
  general: process.env.MODEL_GENERAL || DEFAULT_FALLBACK_MODEL,

  // Low latency, concise replies
  fast: process.env.MODEL_FAST || DEFAULT_FALLBACK_MODEL,

  // First-principles logic, multi-variable logic, math
  reasoning: process.env.MODEL_REASONING || DEFAULT_FALLBACK_MODEL,

  // Software engineering, syntax, algorithms, debugging
  coding: process.env.MODEL_CODING || DEFAULT_FALLBACK_MODEL,

  // Image understanding & multimodal analysis
  vision: process.env.MODEL_VISION || DEFAULT_FALLBACK_MODEL,

  // In-depth academic synthesis and multi-stage web search
  research: process.env.MODEL_RESEARCH || DEFAULT_FALLBACK_MODEL,

  // Copywriting, storytelling, conceptual ideation
  creative: process.env.MODEL_CREATIVE || DEFAULT_FALLBACK_MODEL,

  // Data processing, tables, calculations
  dataAnalysis: process.env.MODEL_DATA_ANALYSIS || DEFAULT_FALLBACK_MODEL,
};

module.exports = {
  MODEL_ROUTER_CONFIG,
  DEFAULT_FALLBACK_MODEL,
};
