/**
 * Image Generation Routes for ZyroChat
 */

const express = require("express");
const path = require("path");
const router = express.Router();
const imageGenerationService = require("../services/imageGenerationService");
const db = require("../db");

/**
 * GET /api/images/config
 * Returns image provider metadata and options
 */
router.get("/config", (_req, res) => {
  try {
    const config = imageGenerationService.getConfig();
    res.json({ success: true, config, ...config });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/images/generate
 * Triggers image generation
 */
router.post("/generate", async (req, res) => {
  const {
    prompt,
    aspectRatio = "1:1",
    quality = "standard",
    style = "vivid",
    model,
    conversationId,
    messageId,
    generationId,
  } = req.body || {};

  if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
    return res.status(400).json({
      success: false,
      error: "Prompt is required and must be a non-empty string",
    });
  }

  if (prompt.trim().length > 2000) {
    return res.status(400).json({
      success: false,
      error: "Prompt must not exceed 2000 characters",
    });
  }

  const validAspectRatios = ["1:1", "16:9", "9:16", "4:3"];
  if (aspectRatio && !validAspectRatios.includes(aspectRatio)) {
    return res.status(400).json({
      success: false,
      error: `Invalid aspectRatio. Supported options: ${validAspectRatios.join(", ")}`,
    });
  }

  try {
    const userId = req.user?.id || "usr-admin";
    const result = await imageGenerationService.generateImage({
      prompt: prompt.trim(),
      aspectRatio,
      quality,
      style,
      model,
      userId,
      conversationId,
      messageId,
      generationId,
    });

    res.json({ success: true, imageGeneration: result, ...result });
  } catch (err) {
    console.error("[Image Generation Error]:", err);
    res.status(500).json({
      success: false,
      error: err?.message || "Failed to generate image",
    });
  }
});

/**
 * GET /api/images/status/:id
 * Retrieves generation status for polling & page refresh recovery
 */
router.get("/status/:id", (req, res) => {
  const { id } = req.params;
  const status = imageGenerationService.getImageStatus(id);

  if (!status) {
    return res.status(404).json({ success: false, error: "Image generation record not found" });
  }

  res.json({ success: true, imageGeneration: status, generation: status, ...status });
});

/**
 * POST /api/images/cancel/:id
 * Cancels an in-flight or pending image generation
 */
router.post("/cancel/:id", (req, res) => {
  const { id } = req.params;
  const result = imageGenerationService.cancelJob(id);
  res.json({ success: true, ...result });
});

/**
 * POST /api/images/cancel
 * Body-based cancel endpoint
 */
router.post("/cancel", (req, res) => {
  const { id, generationId } = req.body || {};
  const targetId = id || generationId;
  if (!targetId) {
    return res.status(400).json({ success: false, error: "id or generationId is required" });
  }
  const result = imageGenerationService.cancelJob(targetId);
  res.json({ success: true, ...result });
});

/**
 * GET /api/images/download/:id
 * Secure download endpoint with friendly timestamped filename
 */
router.get("/download/:id", (req, res) => {
  const { id } = req.params;
  const record = imageGenerationService.getImageStatus(id);

  if (!record || record.status !== "completed" || !record.localPath) {
    return res.status(404).json({ success: false, error: "Generated image not found or not ready" });
  }

  const dateStr = new Date(record.createdAt || Date.now()).toISOString().split("T")[0];
  const ext = record.mimeType === "image/png" ? "png" : "jpg";
  const downloadFilename = `zyrochat-image-${dateStr}-${record.id.slice(-6)}.${ext}`;

  res.download(record.localPath, downloadFilename, (err) => {
    if (err && !res.headersSent) {
      res.status(500).json({ success: false, error: "Failed to download image" });
    }
  });
});

/**
 * GET /api/images/files/:filename
 * Serves generated image files from local disk
 */
router.get("/files/:filename", (req, res) => {
  const { filename } = req.params;
  const filePath = imageGenerationService.getSafeFilePath(filename);

  if (!filePath) {
    return res.status(404).json({ success: false, error: "Image file not found" });
  }

  const ext = path.extname(filename).toLowerCase();
  const mimeTypes = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
  };

  res.setHeader("Content-Type", mimeTypes[ext] || "application/octet-stream");
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.sendFile(filePath);
});

module.exports = router;
