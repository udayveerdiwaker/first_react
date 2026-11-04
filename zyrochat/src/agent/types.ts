/**
 * Represents a single message in a conversation.
 *
 * Properties:
 * - role: Either "user" (message from the person) or "bot" (reply from AI)
 * - text: The actual content of the message
 * - loading: True while the AI is generating a response
 * - error: True if something went wrong (like API failure)
 * - liked: True if the user liked this response
 * - disliked: True if the user disliked this response
 */
export interface Attachment {
  name: string;
  size: number;
  type: string;
  url?: string;
}

export interface SourceCitation {
  title: string;
  url: string;
  snippet?: string;
  source?: string;
}

export interface ToolStatusInfo {
  name: string;
  label: string;
  status: "running" | "completed" | "error";
  output?: string;
}

import type { WorkspaceArtifact, ArtifactVersion } from "../utils/artifactManager";
export type { WorkspaceArtifact, ArtifactVersion };

export interface ChatMessage {
  id?: string;
  role: "user" | "bot";
  text: string;
  loading?: boolean;
  error?: boolean;
  status?: "pending" | "sending" | "streaming" | "completed" | "failed" | "cancelled" | "interrupted";
  generationId?: string;
  requestId?: string;
  createdAt?: number;
  liked?: boolean;
  disliked?: boolean;
  attachments?: Attachment[];
  sources?: SourceCitation[];
  toolCall?: ToolStatusInfo;
  artifacts?: WorkspaceArtifact[];
  hour?: string;
  timezone?: string;
  imageGeneration?: ImageGenerationInfo;
}

export interface ImageGenerationInfo {
  id: string;
  prompt: string;
  revisedPrompt?: string;
  aspectRatio?: "1:1" | "16:9" | "9:16" | "4:3";
  provider?: string;
  quality?: string;
  style?: string;
  status: "pending" | "generating" | "completed" | "failed" | "cancelled";
  imageUrl?: string;
  images?: string[];
  localPath?: string;
  mimeType?: string;
  width?: number;
  height?: number;
  fileSize?: number;
  error?: string;
  createdAt?: number;
  completedAt?: number;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  instructions?: string;
  color?: string;
  createdAt: number;
  updatedAt?: number;
}

export interface MemoryItem {
  id: string;
  key: string;
  value: string;
  category?: string;
  createdAt: number;
}

export interface SavedPrompt {
  id: string;
  title: string;
  prompt: string;
  category: string;
  tags?: string[];
}

/**
 * Describes what a tool is, what it does, and what inputs it needs.
 * This follows the OpenAI function calling format so the AI model knows
 * which tools are available and how to call them.
 *
 * Properties:
 * - type: Always "function" (could be other types in the future)
 * - function.name: The tool name (e.g., "getWeather")
 * - function.description: Plain English explanation of what the tool does
 * - function.parameters: What inputs the tool accepts (types, required fields, etc.)
 */
export interface AgentToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, { type: string; description?: string; enum?: string[] }>;
      required?: string[];
    };
  };
}

/**
 * Context passed to a tool when it runs.
 * This allows the tool to be cancelled if the user stops the conversation.
 *
 * Properties:
 * - signal: AbortSignal lets the tool cancel itself if the request is stopped
 */
export interface AgentToolContext {
  signal: AbortSignal;
}

/**
 * A combination of a tool's definition and its implementation.
 * The definition tells the AI how to call it, and the run function does the actual work.
 *
 * Properties:
 * - definition: What the AI sees (name, description, parameters)
 * - run: A function that executes the tool and returns a text result
 */
export interface AgentTool {
  definition: AgentToolDefinition;
  run: (
    args: Record<string, unknown>,
    context: AgentToolContext
  ) => Promise<string>;
}
