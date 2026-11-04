/**
 * ZyroChat Future Feature: Conversation Branching & Tree History
 * Allows users to branch conversations from any message node and explore multiple thought paths.
 */

import type { ChatMessage } from '../../agent/types';

export interface BranchNode {
  id: string;
  parentId: string | null;
  message: ChatMessage;
  childrenIds: string[];
  createdAt: number;
}

export interface ConversationTree {
  id: string;
  rootNodeId: string;
  nodes: Record<string, BranchNode>;
  activeLeafNodeId: string;
  branchCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface ForkPoint {
  sourceSessionId: string;
  sourceMessageIndex: number;
  newBranchTitle: string;
}
