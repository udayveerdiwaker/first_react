/**
 * ZyroChat Future Feature: Deep Research Pipeline
 * Multi-stage query decomposition, iterative web exploration, source verification, and report synthesis.
 */

export type ResearchStage =
  | 'planning'
  | 'query_generation'
  | 'source_harvesting'
  | 'fact_extraction'
  | 'cross_validation'
  | 'report_synthesis'
  | 'completed';

export interface ResearchSource {
  id: string;
  url: string;
  title: string;
  domain: string;
  snippet: string;
  reliabilityScore: number; // 0.0 to 1.0
  publishedDate?: string;
  extractedFacts: string[];
}

export interface DeepResearchQuery {
  id: string;
  query: string;
  rationale: string;
  executed: boolean;
  resultsCount: number;
}

export interface DeepResearchSession {
  id: string;
  topic: string;
  currentStage: ResearchStage;
  subQueries: DeepResearchQuery[];
  sources: ResearchSource[];
  keyFindings: string[];
  finalReport?: string;
  progressPercent: number;
  startedAt: number;
  completedAt?: number;
}
