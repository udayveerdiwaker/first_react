/**
 * Model and Provider Pricing Configuration (per 1,000,000 tokens in USD)
 */

const MODEL_PRICING = {
  // Free / Default OpenRouter tier
  "openrouter/free": {
    provider: "OpenRouter",
    inputPerMillion: 0.0,
    outputPerMillion: 0.0,
  },
  // Fast models
  "google/gemini-2.0-flash-exp:free": {
    provider: "Google",
    inputPerMillion: 0.0,
    outputPerMillion: 0.0,
  },
  "meta-llama/llama-3.3-70b-instruct:free": {
    provider: "Meta",
    inputPerMillion: 0.0,
    outputPerMillion: 0.0,
  },
  "deepseek/deepseek-r1:free": {
    provider: "DeepSeek",
    inputPerMillion: 0.0,
    outputPerMillion: 0.0,
  },
  // Standard models
  "openai/gpt-4o-mini": {
    provider: "OpenAI",
    inputPerMillion: 0.15,
    outputPerMillion: 0.60,
  },
  "openai/gpt-4o": {
    provider: "OpenAI",
    inputPerMillion: 2.50,
    outputPerMillion: 10.00,
  },
  "anthropic/claude-3.5-sonnet": {
    provider: "Anthropic",
    inputPerMillion: 3.00,
    outputPerMillion: 15.00,
  },
  // Fallback defaults for unknown models
  default: {
    provider: "Generic",
    inputPerMillion: 0.20,
    outputPerMillion: 0.80,
  },
};

/**
 * Calculates estimated API cost for a request
 * @param {string} model - Model identifier
 * @param {number} inputTokens - Input token count
 * @param {number} outputTokens - Output token count
 * @returns {number} Estimated cost in USD
 */
function calculateEstimatedCost(model = "openrouter/free", inputTokens = 0, outputTokens = 0) {
  const pricing = MODEL_PRICING[model] || MODEL_PRICING.default;
  const inputCost = (inputTokens / 1000000) * pricing.inputPerMillion;
  const outputCost = (outputTokens / 1000000) * pricing.outputPerMillion;
  return Number((inputCost + outputCost).toFixed(6));
}

module.exports = {
  MODEL_PRICING,
  calculateEstimatedCost,
};
