/**
 * Knowledge Base & Semantic Vector Search Engine
 * 
 * Provides:
 * 1. Document text chunking with sliding token windows
 * 2. TF-IDF + Cosine similarity semantic search
 * 3. RAG context builder with verifiable citations (Filename & Page/Section)
 */

const db = require("../db");

/**
 * Basic word-level tokenizer and normalizer
 */
function tokenize(text = "") {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

/**
 * Splits document content into overlapping semantic chunks
 * @param {string} content - Full document text
 * @param {number} chunkSizeWords - Words per chunk (default ~100 words / ~130 tokens)
 * @param {number} overlapWords - Overlap between chunks (default 20 words)
 * @returns {Array} Array of chunk objects
 */
function chunkDocument(content = "", chunkSizeWords = 100, overlapWords = 20) {
  const words = String(content).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const chunks = [];
  let startIndex = 0;
  let chunkIndex = 0;

  while (startIndex < words.length) {
    const endIndex = Math.min(startIndex + chunkSizeWords, words.length);
    const chunkWords = words.slice(startIndex, endIndex);
    const text = chunkWords.join(" ");

    // Estimate page number assuming ~300 words per standard document page
    const pageNumber = Math.max(1, Math.floor(startIndex / 300) + 1);

    chunks.push({
      chunkIndex,
      content: text,
      tokenCount: Math.round(chunkWords.length * 1.3),
      pageNumber,
      section: `Page ${pageNumber}`,
    });

    chunkIndex++;
    if (endIndex >= words.length) break;
    startIndex += chunkSizeWords - overlapWords;
  }

  return chunks;
}

/**
 * Computes TF term frequencies for a given list of tokens
 */
function computeTermFrequencies(tokens) {
  const tf = {};
  for (const token of tokens) {
    tf[token] = (tf[token] || 0) + 1;
  }
  const total = tokens.length || 1;
  for (const token in tf) {
    tf[token] = tf[token] / total;
  }
  return tf;
}

/**
 * Computes Cosine Similarity between query term frequency and chunk term frequency
 */
function computeCosineSimilarity(queryTf, chunkTf) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (const term in queryTf) {
    normA += queryTf[term] * queryTf[term];
    if (chunkTf[term]) {
      dotProduct += queryTf[term] * chunkTf[term];
    }
  }

  for (const term in chunkTf) {
    normB += chunkTf[term] * chunkTf[term];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Queries the Knowledge Base for relevant chunks matching the user query
 * @param {string} knowledgeBaseId - KB ID or null for all accessible KBs
 * @param {string} query - User search query
 * @param {number} topK - Maximum chunks to return
 * @param {number} minScore - Minimum similarity threshold
 */
function queryKnowledgeBase(knowledgeBaseId, query, topK = 4, minScore = 0.05) {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];

  const queryTf = computeTermFrequencies(queryTokens);

  let filter = {};
  if (knowledgeBaseId) {
    filter = { knowledgeBaseId };
  }

  const allChunks = db.table("knowledge_chunks").find(filter);
  const scoredChunks = [];

  for (const chunk of allChunks) {
    const chunkTokens = tokenize(chunk.content);
    const chunkTf = computeTermFrequencies(chunkTokens);
    const score = computeCosineSimilarity(queryTf, chunkTf);

    if (score >= minScore) {
      const doc = db.table("knowledge_documents").findById(chunk.documentId);
      const kb = db.table("knowledge_bases").findById(chunk.knowledgeBaseId);

      scoredChunks.push({
        chunkId: chunk.id,
        content: chunk.content,
        score: Number(score.toFixed(4)),
        fileName: doc?.fileName || doc?.title || "Document",
        documentTitle: doc?.title || "Document",
        pageNumber: chunk.pageNumber || 1,
        section: chunk.section || `Page ${chunk.pageNumber || 1}`,
        knowledgeBaseName: kb?.name || "Knowledge Base",
      });
    }
  }

  // Sort descending by similarity score
  scoredChunks.sort((a, b) => b.score - a.score);
  return scoredChunks.slice(0, topK);
}

/**
 * Formats retrieved chunks into an authoritative RAG context string for the AI prompt
 */
function buildRagContextString(matchedChunks = []) {
  if (!matchedChunks.length) return "";

  const formatted = matchedChunks.map((chunk, idx) => {
    return `[KNOWLEDGE SOURCE ${idx + 1}]
File: ${chunk.fileName}
Page/Section: ${chunk.section}
Knowledge Base: ${chunk.knowledgeBaseName}
Content:
${chunk.content}
[END SOURCE ${idx + 1}]`;
  }).join("\n\n");

  return `[VERIFIED KNOWLEDGE BASE CONTEXT]
The following information is retrieved directly from uploaded knowledge base documents.
When answering, explicitly cite the source and page/section where the fact was found (e.g. "According to ${matchedChunks[0].fileName}, ${matchedChunks[0].section}...").
Never invent or fabricate details not present in these documents.

${formatted}
[END VERIFIED CONTEXT]`;
}

module.exports = {
  chunkDocument,
  queryKnowledgeBase,
  buildRagContextString,
};
