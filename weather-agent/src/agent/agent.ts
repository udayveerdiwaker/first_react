import OpenAI from "openai";
import { getWeather } from "../tools/weather";

// const client = new OpenAI({
//   apiKey: import.meta.env.VITE_OPENAI_API_KEY,
//   dangerouslyAllowBrowser: true,
// });
const client = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
  dangerouslyAllowBrowser: true,
});

export async function runAgent(userInput: string) {
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: userInput }],
    tools: [
      {
        type: "function",
        function: {
          name: "getWeather",
          description: "Get weather of a city",
          parameters: {
            type: "object",
            properties: {
              city: { type: "string" },
            },
            required: ["city"],
          },
        },
      },
    ],
  });

  const msg = response.choices[0].message;

  // 👉 Tool call detect
  if (msg.tool_calls) {
    const toolCall = msg.tool_calls[0];
    const args = JSON.parse(toolCall.function.arguments);

    const result = await getWeather(args.city);

    return `🌤 ${result.city}: ${result.temp}°C, ${result.weather}`;
  }

  return msg.content || "No response";
}
