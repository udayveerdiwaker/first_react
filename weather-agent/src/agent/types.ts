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
export interface ChatMessage {
  role: "user" | "bot";
  text: string;
  loading?: boolean;
  error?: boolean;
  liked?: boolean;
  disliked?: boolean;
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
      properties: Record<string, { type: string }>;
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
