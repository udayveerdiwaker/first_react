/**
 * Feedback REST API Routes
 */

const express = require("express");
const router = express.Router();
const db = require("../db");

/**
 * POST /api/feedback
 * Records user rating and feedback on an AI response
 */
router.post("/", (req, res) => {
  const { conversationId, messageIndex, rating, category = "General", comment = "" } = req.body || {};

  if (typeof rating !== "number") {
    return res.status(400).json({ error: "Rating is required (1 or -1)" });
  }

  const record = db.table("feedback").insert({
    userId: req.user?.id || "usr-admin",
    conversationId: conversationId || "current",
    messageIndex: typeof messageIndex === "number" ? messageIndex : 0,
    rating: rating >= 0 ? 1 : -1,
    category: category.trim(),
    comment: (comment || "").trim(),
  });

  res.status(201).json({ success: true, feedbackId: record.id });
});

/**
 * GET /api/feedback
 * Lists feedback records
 */
router.get("/", (_req, res) => {
  const feedback = db.table("feedback").find();
  feedback.sort((a, b) => b.createdAt - a.createdAt);
  res.json({ feedback });
});

module.exports = router;
