import OpenAI from "openai";
import { getWeather } from "../tools/weather";

const client = new OpenAI({
  apiKey: import.meta.env.VITE_OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": "http://localhost:5173",
    "X-Title": "Smart Agent App",
  },
  dangerouslyAllowBrowser: true,
});

// export async function runSmartAgent(
//   userInput: string,
//   chat: Array<{ role: string; text: string }> = []
// ) {
export async function runSmartAgent(userInput: string, chat: any[]) {
  try {
    const response = await client.chat.completions.create({
      model: "openai/gpt-4o-mini",

      messages: [
        {
          role: "system",
          // content: "You are a smart helpful AI assistant",
          //           content: `
          // You are a smart, friendly and helpful AI assistant.

          // - Give clear and detailed answers
          // - Use simple language
          // - Use formatting (bullet points, steps)
          // - Be helpful like ChatGPT
          // `,
          content: `
You are a smart, professional AI assistant and You are a funny AI. Always reply with jokes. and You are a funny AI. Always reply with jokes.

Rules:
- Always give clear, detailed and helpful answers
- Use simple language (easy to understand)
- Use bullet points, steps, and formatting
- If coding → give clean code with explanation
- If concept → explain with examples
- If user is confused → guide step-by-step
- Never give very short answers

Your goal: behave like ChatGPT and help the user deeply.
`,
        },
        ...chat.map((msg) => ({
          role: msg.role === "bot" ? "assistant" : "user",
          content: msg.text,
        })),
        {
          role: "user",
          content: userInput,
        },
      ],

      tool_choice: "auto",

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

    // 🌦 Weather Tool
    if (msg.tool_calls) {
      const toolCall = msg.tool_calls[0];
      const args = JSON.parse(toolCall.function.arguments);

      if (toolCall.function.name === "getWeather") {
        const result = await getWeather(args.city);

        return `🌤 ${result.city}: ${result.temp}°C, ${result.weather}`;
      }
    }

    return msg.content || "No response";
  } catch (err) {
    console.error(err);
    return "AI error 😢";
  }
}
