/**
 * ZyroChat Future Feature: Agent Mode Architecture
 * Multi-step reasoning, Planner / Executor patterns, and Tool Permission management.
 */

export type ToolPermissionLevel = 'auto_approve' | 'require_confirmation' | 'blocked';

export type StepStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';

export interface ToolCallRequest {
  id: string;
  toolName: string;
  parameters: Record<string, unknown>;
  permissionLevel: ToolPermissionLevel;
  approvedByUser?: boolean;
  timestamp: number;
}

export interface ToolCallResult {
  callId: string;
  success: boolean;
  output?: unknown;
  error?: string;
  durationMs: number;
}

export interface PlanStep {
  id: string;
  index: number;
  title: string;
  description: string;
  status: StepStatus;
  toolCalls: ToolCallRequest[];
  results: ToolCallResult[];
  observation?: string;
  retryCount: number;
}

export interface AgentPlan {
  id: string;
  goal: string;
  steps: PlanStep[];
  currentStepIndex: number;
  isComplete: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface ExecutionTrace {
  planId: string;
  stepId: string;
  timestamp: number;
  type: 'thought' | 'action' | 'observation' | 'reflection';
  content: string;
}
