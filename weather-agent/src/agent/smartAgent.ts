import { getWeather } from "../tools/weather";

/* ==============================
   🧠 SYSTEM PROMPT
============================== */
// const systemPrompt = `
// You are an intelligent AI assistant.

// Rules:
// - If user asks about weather → call getWeather tool
// - Understand spelling mistakes (delgi = delhi)
// - If user asks date/time/day → respond directly
// - Do NOT generate code unless asked
// `;
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
   📅 DATE TOOL
============================== */
function getDateTime() {
  const now = new Date();

  return `
📅 Date & Time

🗓 ${now.toLocaleDateString()}
📆 ${now.toLocaleDateString("en-US", { weekday: "long" })}
⏰ ${now.toLocaleTimeString()}
`;
}

/* ==============================
   🧠 TOOL DETECTOR (AI decides)
============================== */
async function detectTool(userInput: string) {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
Decide which tool to use.

Return ONLY:
- "weather:city"
- "date"
- "none"
          `,
        },
        { role: "user", content: userInput },
      ],
    }),
  });

  const data = await res.json();
  return data.choices[0].message.content.toLowerCase();
}

/* ==============================
   🚀 MAIN FUNCTION
============================== */
export async function runSmartAgentStream(
  userInput: string,
  chat: any[],
  mode: string,
  onChunk: (chunk: string) => void,
  signal?: AbortSignal
) {
  /* ==============================
     🧠 STEP 1: DETECT TOOL
  ============================== */
  const decision = await detectTool(userInput);

  /* ==============================
     📅 DATE TOOL
  ============================== */
  if (decision.includes("date")) {
    const text = getDateTime();

    let current = "";
    for (let char of text) {
      if (signal?.aborted) return current;

      current += char;
      onChunk(current);
      await new Promise((r) => setTimeout(r, 5));
    }

    return text;
  }

  /* ==============================
     🌦 WEATHER TOOL
  ============================== */
  if (decision.includes("weather")) {
    try {
      const city = decision.split(":")[1] || "Delhi";

      const result = await getWeather(city);

      if (!result || "error" in result) {
        const err = "❌ Weather not found.";
        onChunk(err);
        return err;
      }

      const text = `
🌦 Weather Report

📍 ${result.city}
🌡 ${result.temp}°C
🌥 ${result.weather}
💧 ${result.humidity}%
🌬 ${result.wind} m/s
`;

      let current = "";
      for (let char of text) {
        if (signal?.aborted) return current;

        current += char;
        onChunk(current);
        await new Promise((r) => setTimeout(r, 5));
      }

      return text;
    } catch {
      const err = "❌ Weather error";
      onChunk(err);
      return err;
    }
  }

  /* ==============================
     🤖 NORMAL STREAMING AI
  ============================== */
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    signal,
    headers: {
      Authorization: `Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini",
      stream: true,
      messages: [
        { role: "system", content: getSystemPrompt(mode || "normal") },
        ...chat.slice(-10).map((msg: any) => ({
          role: msg.role === "bot" ? "assistant" : "user",
          content: msg.text,
        })),
        { role: "user", content: userInput },
      ],
    }),
  });

  const reader = res.body?.getReader();
  const decoder = new TextDecoder("utf-8");

  let fullText = "";

  while (true) {
    if (signal?.aborted) return fullText;

    const { done, value } = await reader!.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split("\n").filter((l) => l.startsWith("data:"));

    for (let line of lines) {
      const json = line.replace("data: ", "");

      if (json === "[DONE]") return fullText;

      try {
        const parsed = JSON.parse(json);
        const token = parsed.choices[0]?.delta?.content;

        if (token) {
          fullText += token;
          onChunk(fullText);
        }
      } catch {}
    }
  }

  return fullText;
}
