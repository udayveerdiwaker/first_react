export interface ChatMessage {
  role: "user" | "bot";
  text: string;
  loading?: boolean;
  error?: boolean;
  liked?: boolean;
  disliked?: boolean;
}

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

export interface AgentToolContext {
  signal: AbortSignal;
}

export interface AgentTool {
  definition: AgentToolDefinition;
  run: (args: Record<string, unknown>, context: AgentToolContext) => Promise<string>;
}
