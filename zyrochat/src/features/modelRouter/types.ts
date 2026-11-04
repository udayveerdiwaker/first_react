/**
 * ZyroChat Future Feature: Intelligent Model Router
 * Dynamic model selection based on prompt complexity, task category, and token economy.
 */

export type TaskCategory =
  | 'fast_chat'
  | 'creative_writing'
  | 'code_generation'
  | 'code_debugging'
  | 'math_reasoning'
  | 'deep_research'
  | 'multimodal_vision';

export type ModelTier = 'fast_free' | 'balanced' | 'power_pro' | 'flagship';

export interface RouteDecision {
  selectedModelId: string;
  category: TaskCategory;
  tier: ModelTier;
  confidence: number;
  reasoning: string;
  estimatedPromptTokens: number;
}

export interface ModelProfile {
  id: string;
  name: string;
  provider: string;
  tier: ModelTier;
  maxContextTokens: number;
  supportsStreaming: boolean;
  supportsTools: boolean;
  supportsVision: boolean;
  isFree: boolean;
}
