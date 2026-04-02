import OpenAI from "openai";
import { getWeather } from "../tools/weather";

const client = new OpenAI({
  apiKey: import.meta.env.VITE_OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
  dangerouslyAllowBrowser: true,
});

/* ==============================
   🧠 SYSTEM PROMPT
============================== */
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

/* ==============================
   📅 DATE TOOL (NEW)
============================== */
function getDateTime() {
  const now = new Date();

  return `
📅 Date & Time

🗓 Date: ${now.toLocaleDateString()}
📆 Day: ${now.toLocaleDateString("en-US", { weekday: "long" })}
⏰ Time: ${now.toLocaleTimeString()}
🌍 Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}
`;
}

/* ==============================
   🚀 MAIN FUNCTION
============================== */
export async function runSmartAgent(
  userInput: string,
  chat: any[],
  mode: string
) {
  try {
    const input = userInput.toLowerCase();

    /* ==============================
       📅 DATE HANDLING (ADDED)
    ============================== */
    if (
      input.includes("date") ||
      input.includes("time") ||
      input.includes("day") ||
      input.includes("today")
    ) {
      return getDateTime();
    }

    /* ==============================
       🤖 OPENAI CALL (UNCHANGED)
    ============================== */
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

    /* ==============================
       🌦 WEATHER TOOL (UNCHANGED)
    ============================== */
    if (msg.tool_calls && msg.tool_calls.length > 0) {
      const toolCall = msg.tool_calls[0];

      try {
        const args = JSON.parse(toolCall.function.arguments);

        const city = args.city || "Delhi"; // fallback

        const result = await getWeather(city);

        if (!result || "error" in result) {
          return "❌ Weather not found. Try another city.";
        }

        return `
🌦 Weather Report

📍 ${result.city}
🌡 ${result.temp}°C
🌥 ${result.weather}
💧 Humidity: ${result.humidity}%
🌬 Wind: ${result.wind} m/s
`;
      } catch (e) {
        console.error("Tool error:", e);
      }
    }

    /* ==============================
       🤖 NORMAL RESPONSE
    ============================== */
    return msg.content || "🤖 No response";
  } catch (err) {
    console.error(err);
    return "AI error 😢";
  }
}
