/**
 * Model Router API Routes
 */

const express = require("express");
const router = express.Router();
const { routePrompt } = require("../services/modelRouter");
const { MODEL_ROUTER_CONFIG } = require("../config/models");

/**
 * POST /api/models/route
 * Analyzes a prompt and returns the recommended model and reasoning
 */
router.post("/route", (req, res) => {
  const { prompt, attachments } = req.body || {};
  const decision = routePrompt(prompt, attachments);
  res.json(decision);
});

/**
 * GET /api/models/config
 * Returns available model tiers and active router mappings
 */
router.get("/config", (_req, res) => {
  res.json({
    activeConfig: MODEL_ROUTER_CONFIG,
    supportedCategories: [
      "general",
      "fast",
      "reasoning",
      "coding",
      "vision",
      "research",
      "creative",
      "dataAnalysis",
    ],
  });
});

module.exports = router;
