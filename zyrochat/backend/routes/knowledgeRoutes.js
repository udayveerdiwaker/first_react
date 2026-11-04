/**
 * Knowledge Base REST API Routes
 */

const express = require("express");
const router = express.Router();
const db = require("../db");
const { chunkDocument, queryKnowledgeBase } = require("../services/knowledgeService");

/**
 * GET /api/knowledge-bases
 * Lists all knowledge bases accessible to the user
 */
router.get("/", (req, res) => {
  const workspaceId = req.query.workspaceId || "ws-default";
  const kbs = db.table("knowledge_bases").find({ workspaceId });
  res.json({ knowledgeBases: kbs });
});

/**
 * POST /api/knowledge-bases
 * Creates a new Knowledge Base collection
 */
router.post("/", (req, res) => {
  const { name, description, category = "Custom", workspaceId = "ws-default" } = req.body || {};

  if (!name || typeof name !== "string") {
    return res.status(400).json({ error: "Knowledge base name is required" });
  }

  const validCategories = ["Company", "College", "Project", "Personal", "Custom"];
  const sanitizedCategory = validCategories.includes(category) ? category : "Custom";

  const kb = db.table("knowledge_bases").insert({
    workspaceId,
    name: name.trim(),
    description: (description || "").trim(),
    category: sanitizedCategory,
    documentCount: 0,
    createdBy: req.user?.id || "usr-admin",
  });

  res.status(201).json({ success: true, knowledgeBase: kb });
});

/**
 * GET /api/knowledge-bases/:id
 * Fetches KB details and documents
 */
router.get("/:id", (req, res) => {
  const { id } = req.params;
  const kb = db.table("knowledge_bases").findById(id);
  if (!kb) {
    return res.status(404).json({ error: "Knowledge base not found" });
  }

  const documents = db.table("knowledge_documents").find({ knowledgeBaseId: id });
  res.json({ knowledgeBase: kb, documents });
});

/**
 * POST /api/knowledge-bases/:id/documents
 * Uploads, extracts, and chunks a document into the KB
 */
router.post("/:id/documents", (req, res) => {
  const { id } = req.params;
  const { title, fileName, content, mimeType = "text/plain", fileSize = 0 } = req.body || {};

  const kb = db.table("knowledge_bases").findById(id);
  if (!kb) {
    return res.status(404).json({ error: "Knowledge base not found" });
  }

  if (!content || typeof content !== "string") {
    return res.status(400).json({ error: "Document text content is required" });
  }

  // 1. Chunk document
  const chunks = chunkDocument(content, 100, 20);

  // 2. Save document record
  const doc = db.table("knowledge_documents").insert({
    knowledgeBaseId: id,
    title: title || fileName || "Uploaded Document",
    fileName: fileName || "document.txt",
    fileSize: fileSize || content.length,
    mimeType,
    chunkCount: chunks.length,
    isIndexed: true,
  });

  // 3. Save chunks
  for (const chunk of chunks) {
    db.table("knowledge_chunks").insert({
      documentId: doc.id,
      knowledgeBaseId: id,
      chunkIndex: chunk.chunkIndex,
      content: chunk.content,
      tokenCount: chunk.tokenCount,
      pageNumber: chunk.pageNumber,
      section: chunk.section,
    });
  }

  // 4. Update KB document count
  const allDocs = db.table("knowledge_documents").find({ knowledgeBaseId: id });
  db.table("knowledge_bases").update(id, { documentCount: allDocs.length });

  res.status(201).json({
    success: true,
    document: doc,
    chunksCreated: chunks.length,
  });
});

/**
 * POST /api/knowledge-bases/:id/query
 * Executes semantic search query against the KB
 */
router.post("/:id/query", (req, res) => {
  const { id } = req.params;
  const { query, topK = 4 } = req.body || {};

  if (!query || typeof query !== "string") {
    return res.status(400).json({ error: "Query string is required" });
  }

  const results = queryKnowledgeBase(id === "all" ? null : id, query, topK);
  res.json({ query, matches: results });
});

/**
 * DELETE /api/knowledge-bases/:id
 * Deletes a KB and associated documents
 */
router.delete("/:id", (req, res) => {
  const { id } = req.params;
  const deleted = db.table("knowledge_bases").delete(id);
  if (!deleted) {
    return res.status(404).json({ error: "Knowledge base not found" });
  }

  // Clean up associated documents & chunks
  const docs = db.table("knowledge_documents").find({ knowledgeBaseId: id });
  docs.forEach((doc) => {
    db.table("knowledge_documents").delete(doc.id, true);
    const chunks = db.table("knowledge_chunks").find({ documentId: doc.id });
    chunks.forEach((c) => db.table("knowledge_chunks").delete(c.id, true));
  });

  res.json({ success: true });
});

module.exports = router;
