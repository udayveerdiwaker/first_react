import { getWeather } from "../tools/weather";
import { generateImage } from "../tools/image";
import { executeMcpTool, getMcpToolDefinitions } from "./mcpClient";
import type { AgentTool, AgentToolDefinition } from "./types";

/**
 * Returns the current date and time as a formatted string.
 *
 * This function:
 * 1. Gets the current date and time from the system
 * 2. Formats it into a readable multi-line display showing:
 *    - The calendar date (e.g., "1/15/2024")
 *    - The day of the week (e.g., "Monday")
 *    - The current time (e.g., "3:45:30 PM")
 *
 * @returns A formatted date/time string ready to show to the user
 */
function getDateTime() {
  const now = new Date();

  return `Date & Time

${now.toLocaleDateString()}
${now.toLocaleDateString("en-US", { weekday: "long" })}
${now.toLocaleTimeString()}`;
}

/**
 * Safely evaluates a math expression and returns the result.
 *
 * This function:
 * 1. Takes a math expression like "2 + 2" or "Math.sqrt(16)"
 * 2. Evaluates it using JavaScript's eval()
 * 3. Returns the result or an error message if evaluation fails
 *
 * Warning: eval() can be unsafe, but here it's only used from trusted AI responses,
 * not from raw user input that could contain malicious code.
 *
 * @param expression - A math expression to calculate
 * @returns A string with the result or error message
 */
function calculate(expression: string) {
  try {
    return `Result: ${eval(expression)}`;
  } catch {
    return "Invalid calculation";
  }
}

/**
 * Array of tools that run locally in the frontend (no backend needed).
 *
 * These tools are always available and don't require calling the backend.
 * Each tool in the array contains:
 * - definition: What the AI model sees (name, description, expected parameters)
 * - run: The actual function that executes when the AI calls this tool
 *
 * Tools included:
 * 1. getWeather: Fetches current weather for a city
 * 2. getDateTime: Returns current date and time
 * 3. calculate: Evaluates math expressions
 * 4. generateImage: Creates an image URL from a text prompt
 */
const localTools: AgentTool[] = [
  {
    definition: {
      type: "function",
      function: {
        name: "getWeather",
        description:
          "Get the current weather for a city including temperature, conditions, and air quality",
        parameters: {
          type: "object",
          properties: { city: { type: "string" } },
          required: ["city"],
        },
      },
    },
    // When the AI wants weather info, run this function
    async run(args) {
      const city = String(args.city || "Delhi");
      const result = await getWeather(city);
      // If the API call failed, return the error message
      if ("error" in result) {
        return result.error;
      }
      // Return a formatted weather string for the AI to include in its response
      let weatherStr = `${result.city} ${result.temp}°C ${result.weather}`;
      // Add AQI data if available
      if (result.aqiLevel && result.aqiLevel !== "N/A") {
        weatherStr += ` | AQI: ${result.aqiLevel} (${result.aqi})`;
      }
      return weatherStr;
    },
  },
  {
    definition: {
      type: "function",
      function: {
        name: "getDateTime",
        description: "Get the current local date and time",
        parameters: { type: "object", properties: {} },
      },
    },
    // When the AI wants to know the current time, run this function
    async run() {
      return getDateTime();
    },
  },
  {
    definition: {
      type: "function",
      function: {
        name: "calculate",
        description: "Evaluate a math expression",
        parameters: {
          type: "object",
          properties: { expression: { type: "string" } },
          required: ["expression"],
        },
      },
    },
    // When the AI needs to calculate something, run this function
    async run(args) {
      return calculate(String(args.expression || ""));
    },
  },
  {
    definition: {
      type: "function",
      function: {
        name: "generateImage",
        description:
          "Generate an image from a text prompt and return it as Markdown so it appears in the chat",
        parameters: {
          type: "object",
          properties: {
            prompt: {
              type: "string",
            },
          },
          required: ["prompt"],
        },
      },
    },
    async run(args) {
      const prompt = String(args.prompt || "").trim();

      if (!prompt) {
        return "Please provide a prompt for the image you want to generate.";
      }

      try {
        const imageUrl = await generateImage(prompt);
        return `Generated image for: ${prompt}\n\n![Generated image](${imageUrl})\n\n[Open full image](${imageUrl})`;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to generate image';
        return `Error generating image: ${errorMessage}`;
      }
    },
  },
];

/**
 * Cache for tool definitions fetched from the backend.
 *
 * The first time we fetch backend tools, we store them here so we don't have to
 * ask the backend every single message. This improves performance.
 */
let cachedDefinitions: AgentToolDefinition[] | null = null;

function getLocalToolDefinitions() {
  return localTools.map((tool) => tool.definition);
}

function mergeToolDefinitions(
  localDefinitions: AgentToolDefinition[],
  backendDefinitions: AgentToolDefinition[]
) {
  const localNames = new Set(
    localDefinitions.map((definition) => definition.function.name)
  );

  return [
    ...localDefinitions,
    ...backendDefinitions.filter(
      (definition) => !localNames.has(definition.function.name)
    ),
  ];
}

/**
 * Fetches all available tool definitions from the backend (plus local tools).
 *
 * This function:
 * 1. Checks if we've already fetched the backend tools (cached)
 * 2. If yes, return the cached list for performance
 * 3. If no, fetch from the backend via getMcpToolDefinitions()
 * 4. If the backend is unreachable, fall back to local tools only
 *
 * The returned definitions are what the AI model sees as "available tools".
 * The AI uses these descriptions to decide whether to call a tool.
 *
 * @param signal - Can be used to cancel the fetch if needed
 * @returns Promise resolving to available tool definitions
 */
export async function getToolDefinitions(signal?: AbortSignal) {
  // If we've already loaded the definitions, just return the cached version
  if (cachedDefinitions) return cachedDefinitions;

  const localDefinitions = getLocalToolDefinitions();

  try {
    // Try to get tool definitions from the backend and keep local tools available.
    const backendDefinitions = await getMcpToolDefinitions(signal);
    cachedDefinitions = mergeToolDefinitions(localDefinitions, backendDefinitions);
    return cachedDefinitions;
  } catch {
    // If backend is unavailable, fall back to local tools only
    return localDefinitions;
  }
}

/**
 * Runs a tool by name with the given arguments.
 *
 * This function:
 * 1. Checks if the tool exists locally (faster execution)
 * 2. If found locally, runs it and returns the result
 * 3. If not found, tries to run it on the backend
 * 4. This acts as a router that decides whether to use local or backend tools
 *
 * Example:
 * - runToolByName("calculate", { expression: "2 + 2" }, signal)
 *   → Returns "Result: 4"
 * - runToolByName("getNews", {}, signal)
 *   → Sends to backend, which fetches news headlines
 *
 * @param name - The name of the tool to run
 * @param args - Input parameters for the tool (varies by tool)
 * @param signal - Can be used to cancel execution
 * @returns Promise resolving to the tool's result as a string
 * @throws Error if the tool doesn't exist or fails
 */
export async function runToolByName(
  name: string,
  args: Record<string, unknown>,
  signal: AbortSignal
) {
  // Look for the tool in our local tools first
  const localTool = localTools.find(
    (entry) => entry.definition.function.name === name
  );

  // If found locally, run it immediately (no backend call needed)
  if (localTool) {
    return localTool.run(args, { signal });
  }

  // If not found locally, try to run it on the backend
  return executeMcpTool(name, args, signal);
}
