import type { AgentToolDefinition } from "./types";

const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL?.replace(/\/$/, "") ||
  "http://localhost:5000";

interface ToolListResponse {
  server: string;
  tools: AgentToolDefinition[];
}

interface ToolExecuteResponse {
  result: string;
}

export async function getMcpToolDefinitions(signal?: AbortSignal) {
  let response: Response;

  try {
    response = await fetch(`${BACKEND_URL}/api/mcp/tools`, { signal });
  } catch (error) {
    throw new Error(
      `MCP backend is not reachable at ${BACKEND_URL}. Start the backend server.`
    );
  }

  if (!response.ok) {
    throw new Error(`MCP tools request failed: ${response.status}`);
  }

  const data = (await response.json()) as ToolListResponse;
  return data.tools;
}

export async function executeMcpTool(
  name: string,
  args: Record<string, unknown>,
  signal?: AbortSignal
) {
  let response: Response;

  try {
    response = await fetch(`${BACKEND_URL}/api/mcp/execute`, {
      method: "POST",
      signal,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, args }),
    });
  } catch (error) {
    throw new Error(
      `MCP backend is not reachable at ${BACKEND_URL}. Start the backend server.`
    );
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(
      payload.error || `MCP execution failed: ${response.status}`
    );
  }

  const data = (await response.json()) as ToolExecuteResponse;
  return data.result;
}
