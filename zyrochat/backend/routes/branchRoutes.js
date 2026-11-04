/**
 * Conversation Branching API Routes
 */

const express = require("express");
const router = express.Router();
const db = require("../db");

/**
 * POST /api/conversations/:id/branch
 * Branches a conversation from a given message index or message ID
 */
router.post("/:id/branch", (req, res) => {
  const { id } = req.params;
  const { messageIndex, messageId, newTitle, messages = [] } = req.body || {};

  // If client provided existing chat array (from local state)
  let branchMessages = [];
  if (Array.isArray(messages) && messages.length > 0) {
    const sliceIndex = typeof messageIndex === "number" ? messageIndex + 1 : messages.length;
    branchMessages = messages.slice(0, sliceIndex);
  }

  const parentConv = db.table("conversations").findById(id);
  const parentTitle = parentConv ? parentConv.title : "Parent Chat";

  const branchConv = db.table("conversations").insert({
    workspaceId: parentConv?.workspaceId || "ws-default",
    userId: req.user?.id || "usr-admin",
    title: newTitle || `Branch: ${parentTitle.slice(0, 30)}`,
    parentConversationId: id,
    branchedFromMessageId: messageId || `msg-idx-${messageIndex}`,
    branchedAtIndex: messageIndex,
  });

  // Persist messages if provided
  branchMessages.forEach((msg, idx) => {
    db.table("messages").insert({
      conversationId: branchConv.id,
      role: msg.role || "user",
      text: msg.text || "",
      sources: msg.sources || [],
      attachments: msg.attachments || [],
      index: idx,
    });
  });

  res.json({
    success: true,
    branchConversation: branchConv,
    messages: branchMessages,
    parentTitle,
  });
});

/**
 * GET /api/conversations/:id/branches
 * Returns all branches created from a conversation
 */
router.get("/:id/branches", (req, res) => {
  const { id } = req.params;
  const branches = db.table("conversations").find({ parentConversationId: id });
  res.json({ branches });
});

module.exports = router;
