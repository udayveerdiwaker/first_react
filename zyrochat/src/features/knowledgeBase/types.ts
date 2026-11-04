/**
 * ZyroChat Future Feature: Knowledge Base & RAG Architecture
 * Chunking strategies, Vector Embeddings, Similarity Search, and Context Injection.
 */

export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  chunkIndex: number;
  tokenCount: number;
  embedding?: number[];
  metadata?: {
    sourceUrl?: string;
    fileName?: string;
    section?: string;
    pageNumber?: number;
    tags?: string[];
  };
}

export interface KnowledgeDocument {
  id: string;
  title: string;
  description?: string;
  originalFileName: string;
  fileSizeBytes: number;
  mimeType: string;
  chunks: DocumentChunk[];
  totalChunks: number;
  isIndexed: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface SimilarityResult {
  chunk: DocumentChunk;
  score: number; // 0.0 to 1.0 cosine similarity
  relevanceExplanation?: string;
}

export interface RAGQueryOptions {
  topK?: number;
  minSimilarityScore?: number;
  filterDocumentIds?: string[];
  filterTags?: string[];
}

export interface RAGInjectedContext {
  retrievedChunks: SimilarityResult[];
  formattedContextString: string;
  totalTokens: number;
}
