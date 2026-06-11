import type { AgentToolDefinition } from "./types";

// The backend URL where the MCP tools live.
// This is configured via environment variables, defaulting to localhost:5000 during development.
const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL?.replace(/\/$/, "") ||
  "http://localhost:5000";

/**
 * Response format from the backend when listing available tools.
 *
 * Properties:
 * - server: A string identifying the backend (for debugging)
 * - tools: An array of tool definitions the backend can execute
 */
interface ToolListResponse {
  server: string;
  tools: AgentToolDefinition[];
}

/**
 * Response format from the backend after executing a tool.
 *
 * Properties:
 * - result: The text result returned by the executed tool
 */
interface ToolExecuteResponse {
  result: string;
}

/**
 * Fetches the list of available tools from the backend.
 *
 * This function:
 * 1. Makes a GET request to the backend's MCP tools endpoint
 * 2. Parses the JSON response to extract tool definitions
 * 3. Returns the array of tools that the AI can use
 *
 * If the backend is not running, throws an error with instructions to start it.
 *
 * @param signal - AbortSignal to cancel the request if needed
 * @returns Promise resolving to an array of available tool definitions
 * @throws Error if the backend is unreachable or returns invalid data
 */
export async function getMcpToolDefinitions(signal?: AbortSignal) {
  let response: Response;

  try {
    response = await fetch(`${BACKEND_URL}/api/mcp/tools`, { signal });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

/**
 * Executes a tool on the backend and returns its result.
 *
 * This function:
 * 1. Sends the tool name and arguments to the backend
 * 2. The backend finds and runs the tool
 * 3. Returns the text result from the tool execution
 *
 * For example, calling executeMcpTool("getWeather", { city: "Paris" })
 * will fetch and return weather data for Paris.
 *
 * @param name - The name of the tool to run (e.g., "getWeather", "getNews")
 * @param args - An object containing the tool's input parameters
 * @param signal - AbortSignal to cancel the request if needed
 * @returns Promise resolving to a text result from the tool
 * @throws Error if the backend is unreachable or the tool fails
 */
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
