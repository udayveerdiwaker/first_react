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

// ✅ SINGLE CLEAN FUNCTION
// const getSystemPrompt = (mode: string) => {
//   switch (mode) {
//     case "coding":
//       return `
// You are a senior software engineer.

// - Give clean and correct code
// - Explain step-by-step
// - Use best practices
// `;

//     case "teaching":
//       return `
// You are a friendly teacher.

// - Explain in very simple language
// - Use examples
// - Break into steps
// `;

//     case "fun":
//       return `
// You are a funny AI assistant.

// - Add humor and jokes
// - Keep answers fun but helpful
// `;

//     default:
//       return `
// You are a smart professional AI assistant.

// - Give clear and detailed answers
// - Use bullet points
// - Be structured and helpful
// `;
//   }
// };
const getSystemPrompt = (mode: string) => {
  const basePrompt = `
You are an advanced AI assistant like ChatGPT.

Rules:
- Always give structured answers
- Start with a simple explanation
- Then give detailed explanation
- Then give examples
- If coding → give clean code blocks (use triple backticks)
- Always explain the code
- Use headings and bullet points
- Always give suggestions at the end

Response format:

1. 📌 What is it
2. 🧠 Detailed explanation
3. 💻 Example
4. 🔍 Code explanation
5. 🚀 Suggestions
`;

  switch (mode) {
    case "coding":
      return (
        basePrompt +
        `
You are a senior software engineer.

- Give clean and correct code
- Explain step-by-step
- Use best practices
`
      );

    case "teaching":
      return (
        basePrompt +
        `
You are a friendly teacher.

- Explain in very simple language
- Use real-life examples
`
      );

    case "fun":
      return (
        basePrompt +
        `
You are a funny AI assistant.

- Add humor and jokes
- Keep answers fun but helpful
`
      );

    // default:
    //   return basePrompt;
    default:
      return (
        basePrompt +
        `
You are a smart professional AI assistant.

- Give clear and detailed answers
- Use bullet points
- Be structured and helpful

`
      );
  }
};
// ✅ MAIN FUNCTION
export async function runSmartAgent(
  userInput: string,
  chat: any[],
  mode: string
) {
  try {
    const response = await client.chat.completions.create({
      model: "openai/gpt-4o-mini",

      messages: [
        {
          role: "system",
          content: getSystemPrompt(mode || "normal"),
        },

        ...chat.slice(-10).map((msg: any) => ({
          role: msg.role === "bot" ? "assistant" : "user",
          content: msg.text,
        })),

        {
          role: "user",
          content: userInput,
        },
      ],

      temperature: 0.7,
      max_tokens: 1000,

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
    console.log(response);
    // 🌦 Weather Tool
    if (msg.tool_calls && msg.tool_calls.length > 0) {
      const toolCall = msg.tool_calls[0];

      try {
        const args = JSON.parse(toolCall.function.arguments);

        if (toolCall.function.name === "getWeather") {
          const result = await getWeather(args.city);
          return `🌤 ${result.city}: ${result.temp}°C, ${result.weather}`;
        }
      } catch (e) {
        console.error("Tool error:", e);
      }
    }

    if (msg.content) return msg.content;

    return "🤖 Sorry, I couldn't generate a response.";
  } catch (err) {
    console.error(err);
    return "AI error 😢";
  }
}
