/**
 * Chat & Conversation API Routes for ZyroChat
 * 
 * Provides:
 * 1. Full CRUD for conversations and messages with DB persistence
 * 2. Active generation status and stream reconnection endpoints
 * 3. User authorization enforcement (User A cannot access User B's conversations)
 * 4. Idempotent retry and cancellation endpoints
 */

const express = require("express");
const router = express.Router();
const db = require("../db");
const generationManager = require("../services/generationManager");
const imageGenerationService = require("../services/imageGenerationService");

/**
 * Authorization helper: Verifies conversation ownership
 */
function verifyConversationAccess(conversation, user) {
  if (!conversation) return false;
  if (!user) return false;
  if (user.role === "admin") return true;
  return conversation.userId === user.id;
}

/**
 * GET /api/chat/conversations
 * Retrieves all conversations for the authenticated user
 */
router.get("/conversations", (req, res) => {
  const userId = req.user?.id || "usr-admin";
  const isAdmin = req.user?.role === "admin";

  let conversations = [];
  if (isAdmin) {
    conversations = db.table("conversations").find({});
  } else {
    conversations = db.table("conversations").find({ userId });
  }

  // Attach message counts and last message snippet
  const enriched = conversations.map((conv) => {
    const msgs = db.table("messages").find({ conversationId: conv.id });
    const lastMsg = msgs.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0];
    return {
      ...conv,
      messageCount: msgs.length,
      lastMessageText: lastMsg?.text ? lastMsg.text.slice(0, 80) : "",
      updatedAt: conv.updatedAt || conv.createdAt || Date.now(),
    };
  });

  // Sort descending by updatedAt
  enriched.sort((a, b) => b.updatedAt - a.updatedAt);

  res.json({ success: true, conversations: enriched });
});

/**
 * GET /api/chat/conversations/:id
 * Retrieves a single conversation with all its messages and active generation state
 */
router.get("/conversations/:id", (req, res) => {
  const { id } = req.params;
  const conversation = db.table("conversations").findById(id);

  if (!conversation) {
    return res.status(404).json({ success: false, error: "Conversation not found" });
  }

  if (!verifyConversationAccess(conversation, req.user)) {
    return res.status(403).json({ success: false, error: "Access denied" });
  }

  // Fetch messages sorted chronologically
  const messages = db
    .table("messages")
    .find({ conversationId: id })
    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

  // Check for active or interrupted generation
  const activeGeneration = generationManager.getActiveForConversation(id);

  res.json({
    success: true,
    conversation,
    messages,
    activeGeneration,
  });
});

/**
 * POST /api/chat/conversations
 * Creates or updates a conversation
 */
router.post("/conversations", (req, res) => {
  const { id, title, workspaceId, parentConversationId, branchedFromMessageId } = req.body || {};
  const userId = req.user?.id || "usr-admin";
  const now = Date.now();

  let conversation = id ? db.table("conversations").findById(id) : null;

  if (conversation) {
    if (!verifyConversationAccess(conversation, req.user)) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }

    conversation = db.table("conversations").update(id, {
      title: title !== undefined ? title : conversation.title,
      updatedAt: now,
    });
  } else {
    conversation = db.table("conversations").insert({
      id: id || `conv-${now}-${Math.random().toString(36).slice(2, 7)}`,
      workspaceId: workspaceId || "ws-default",
      userId,
      title: title || "New Chat",
      parentConversationId: parentConversationId || null,
      branchedFromMessageId: branchedFromMessageId || null,
      createdAt: now,
      updatedAt: now,
    });
  }

  res.json({ success: true, conversation });
});

/**
 * DELETE /api/chat/conversations/:id
 * Deletes a conversation and its messages
 */
router.delete("/conversations/:id", (req, res) => {
  const { id } = req.params;
  const conversation = db.table("conversations").findById(id);

  if (!conversation) {
    return res.status(404).json({ success: false, error: "Conversation not found" });
  }

  if (!verifyConversationAccess(conversation, req.user)) {
    return res.status(403).json({ success: false, error: "Access denied" });
  }

  // Cancel any active generation
  const activeGen = generationManager.getActiveForConversation(id);
  if (activeGen) {
    generationManager.cancelGeneration(activeGen.id);
  }

  // Delete messages
  const msgs = db.table("messages").find({ conversationId: id });
  msgs.forEach((m) => db.table("messages").delete(m.id));

  // Delete generations
  const gens = db.table("generations").find({ conversationId: id });
  gens.forEach((g) => db.table("generations").delete(g.id));

  // Delete conversation
  db.table("conversations").delete(id);

  res.json({ success: true, message: "Conversation and messages deleted successfully" });
});

/**
 * POST /api/chat/messages
 * Immediately persists a user or assistant message
 */
router.post("/messages", (req, res) => {
  const {
    id,
    conversationId,
    role,
    text,
    status,
    generationId,
    requestId,
    sources = [],
    attachments = [],
    hour,
    timezone,
    imageGeneration,
  } = req.body || {};

  if (!conversationId) {
    return res.status(400).json({ success: false, error: "conversationId is required" });
  }

  // Validate hour format if provided (HH:mm, 00:00 to 23:59)
  if (hour !== undefined && hour !== null && hour !== "") {
    if (typeof hour !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(hour)) {
      return res.status(400).json({
        success: false,
        error: "Invalid hour format. Expected HH:mm in 24-hour range (00:00 - 23:59)",
      });
    }
  }

  const validTimezone =
    typeof timezone === "string" && timezone.trim()
      ? timezone.trim().slice(0, 64)
      : undefined;

  // Ensure conversation exists or create on the fly
  let conversation = db.table("conversations").findById(conversationId);
  const now = Date.now();

  if (!conversation) {
    conversation = db.table("conversations").insert({
      id: conversationId,
      workspaceId: "ws-default",
      userId: req.user?.id || "usr-admin",
      title: (text && text.length > 0 ? text.slice(0, 30) : "New Chat") || "New Chat",
      createdAt: now,
      updatedAt: now,
    });
  } else if (!verifyConversationAccess(conversation, req.user)) {
    return res.status(403).json({ success: false, error: "Access denied" });
  }

  const messageId = id || `msg-${now}-${Math.random().toString(36).slice(2, 7)}`;
  const existing = db.table("messages").findById(messageId);

  let savedMessage;
  if (existing) {
    savedMessage = db.table("messages").update(messageId, {
      text: text !== undefined ? text : existing.text,
      status: status || existing.status,
      generationId: generationId || existing.generationId,
      requestId: requestId || existing.requestId,
      sources: sources || existing.sources,
      attachments: attachments || existing.attachments,
      ...(hour !== undefined ? { hour: hour || null } : {}),
      ...(validTimezone !== undefined ? { timezone: validTimezone } : {}),
      ...(imageGeneration !== undefined ? { imageGeneration } : {}),
      updatedAt: now,
    });
  } else {
    savedMessage = db.table("messages").insert({
      id: messageId,
      conversationId,
      role: role || "user",
      text: text || "",
      status: status || (role === "user" ? "completed" : "pending"),
      generationId: generationId || null,
      requestId: requestId || null,
      sources,
      attachments,
      hour: hour || null,
      timezone: validTimezone || null,
      imageGeneration: imageGeneration || null,
      createdAt: now,
      updatedAt: now,
    });
  }

  // Update conversation updatedAt
  db.table("conversations").update(conversationId, { updatedAt: now });

  res.json({ success: true, message: savedMessage });
});

/**
 * PUT /api/chat/messages/:id
 * Updates an existing message
 */
router.put("/messages/:id", (req, res) => {
  const { id } = req.params;
  const message = db.table("messages").findById(id);

  if (!message) {
    return res.status(404).json({ success: false, error: "Message not found" });
  }

  const conversation = db.table("conversations").findById(message.conversationId);
  if (conversation && !verifyConversationAccess(conversation, req.user)) {
    return res.status(403).json({ success: false, error: "Access denied" });
  }

  const { text, status, sources, error, hour, timezone, imageGeneration } = req.body || {};

  if (hour !== undefined && hour !== null && hour !== "") {
    if (typeof hour !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(hour)) {
      return res.status(400).json({
        success: false,
        error: "Invalid hour format. Expected HH:mm in 24-hour range (00:00 - 23:59)",
      });
    }
  }

  const updated = db.table("messages").update(id, {
    ...(text !== undefined ? { text } : {}),
    ...(status !== undefined ? { status } : {}),
    ...(sources !== undefined ? { sources } : {}),
    ...(error !== undefined ? { error } : {}),
    ...(hour !== undefined ? { hour: hour || null } : {}),
    ...(timezone !== undefined ? { timezone: timezone || null } : {}),
    ...(imageGeneration !== undefined ? { imageGeneration } : {}),
    updatedAt: Date.now(),
  });

  res.json({ success: true, message: updated });
});

/**
 * GET /api/chat/generations/active
 * Returns any active generation for the given conversation
 */
router.get("/generations/active", (req, res) => {
  const { conversationId } = req.query;
  if (!conversationId) {
    return res.status(400).json({ success: false, error: "conversationId query required" });
  }

  const activeGen = generationManager.getActiveForConversation(conversationId);
  res.json({ success: true, activeGeneration: activeGen });
});

/**
 * GET /api/chat/generations/:id/stream
 * Connects or reconnects to an SSE stream for an active generation
 */
router.get("/generations/:id/stream", (req, res) => {
  const { id } = req.params;
  const subscribed = generationManager.subscribe(id, res);

  if (!subscribed) {
    // If generation is not in memory, check if completed or interrupted in DB
    const dbGen = db.table("generations").findById(id);
    if (dbGen) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.write(
        `data: ${JSON.stringify({
          type: "catchup",
          generationId: dbGen.id,
          status: dbGen.status,
          text: dbGen.partialText || "",
        })}\n\n`
      );
      res.write(
        `data: ${JSON.stringify({
          type: dbGen.status === "completed" ? "done" : "interrupted",
          generationId: dbGen.id,
          text: dbGen.partialText || "",
          status: dbGen.status,
        })}\n\n`
      );
      return res.end();
    }

    return res.status(404).json({ success: false, error: "Generation not found or expired" });
  }
});

/**
 * POST /api/chat/generations/:id/cancel
 * Cancels an in-flight generation
 */
router.post("/generations/:id/cancel", (req, res) => {
  const { id } = req.params;
  generationManager.cancelGeneration(id);
  imageGenerationService.cancelJob(id);
  res.json({ success: true, message: "Generation cancelled successfully" });
});

/**
 * POST /api/chat/generations/:id/retry
 * Idempotently marks or initiates retry of an interrupted generation
 */
router.post("/generations/:id/retry", (req, res) => {
  const { id } = req.params;
  const existing = generationManager.getGeneration(id);

  if (!existing) {
    return res.status(404).json({ success: false, error: "Generation not found" });
  }

  // If already streaming, return current active instance
  if (existing.status === "streaming") {
    return res.json({ success: true, status: "streaming", generation: existing });
  }

  res.json({
    success: true,
    message: "Ready for retry",
    generation: existing,
  });
});

module.exports = router;
