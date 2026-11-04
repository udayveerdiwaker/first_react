/**
 * Deep Research REST API Routes
 */

const express = require("express");
const router = express.Router();
const db = require("../db");
const { executeDeepResearch } = require("../services/deepResearchService");

/**
 * POST /api/research/start
 * Initiates an autonomous multi-step deep research job
 */
router.post("/start", async (req, res) => {
  const { topic } = req.body || {};

  if (!topic || typeof topic !== "string" || topic.trim().length < 3) {
    return res.status(400).json({ error: "A descriptive research topic is required." });
  }

  try {
    const session = await executeDeepResearch(topic.trim(), req.user?.id || "usr-admin");
    res.json({ success: true, session });
  } catch (error) {
    console.error("Deep research error:", error);
    res.status(500).json({ error: error.message || "Failed to execute deep research" });
  }
});

/**
 * GET /api/research/sessions
 * Returns all saved deep research sessions
 */
router.get("/sessions", (req, res) => {
  const sessions = db.table("research_sessions").find();
  // Return in reverse chronological order
  sessions.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  res.json({ sessions });
});

/**
 * GET /api/research/sessions/:id
 * Returns a specific research session with report and sources
 */
router.get("/sessions/:id", (req, res) => {
  const { id } = req.params;
  const session = db.table("research_sessions").findById(id);
  if (!session) {
    return res.status(404).json({ error: "Research session not found" });
  }
  res.json({ session });
});

/**
 * DELETE /api/research/sessions/:id
 * Deletes a research session
 */
router.delete("/sessions/:id", (req, res) => {
  const { id } = req.params;
  const deleted = db.table("research_sessions").delete(id);
  if (!deleted) {
    return res.status(404).json({ error: "Session not found" });
  }
  res.json({ success: true });
});

module.exports = router;
