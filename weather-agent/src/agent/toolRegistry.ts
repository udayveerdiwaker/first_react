import { getWeather } from "../tools/weather";
import { executeMcpTool, getMcpToolDefinitions } from "./mcpClient";
import type { AgentTool, AgentToolDefinition } from "./types";

function getDateTime() {
  const now = new Date();

  return `Date & Time

${now.toLocaleDateString()}
${now.toLocaleDateString("en-US", { weekday: "long" })}
${now.toLocaleTimeString()}`;
}

function calculate(expression: string) {
  try {
    return `Result: ${eval(expression)}`;
  } catch {
    return "Invalid calculation";
  }
}

const localTools: AgentTool[] = [
  {
    definition: {
      type: "function",
      function: {
        name: "getWeather",
        description: "Get the current weather for a city",
        parameters: {
          type: "object",
          properties: { city: { type: "string" } },
          required: ["city"],
        },
      },
    },
    async run(args) {
      const city = String(args.city || "Delhi");
      const result = await getWeather(city);
      if ("error" in result) {
        return result.error;
      }
      return `${result.city} ${result.temp}°C ${result.weather}`;
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
    async run(args) {
      return calculate(String(args.expression || ""));
    },
  },
];

let cachedDefinitions: AgentToolDefinition[] | null = null;

export async function getToolDefinitions(signal?: AbortSignal) {
  if (cachedDefinitions) return cachedDefinitions;

  try {
    cachedDefinitions = await getMcpToolDefinitions(signal);
    return cachedDefinitions;
  } catch {
    cachedDefinitions = localTools.map((tool) => tool.definition);
    return cachedDefinitions;
  }
}

export async function runToolByName(
  name: string,
  args: Record<string, unknown>,
  signal: AbortSignal
) {
  const localTool = localTools.find(
    (entry) => entry.definition.function.name === name
  );

  if (localTool) {
    return localTool.run(args, { signal });
  }

  return executeMcpTool(name, args, signal);
}
