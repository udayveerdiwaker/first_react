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
  let fullText = "";

  try {
    /* ==============================
       🧠 STEP 1: SAFE TOOL DETECT
    ============================== */
    let decision = "none";

    try {
      decision = await detectTool(userInput);
    } catch {
      decision = "none";
    }

    /* ==============================
       📅 DATE TOOL
    ============================== */
    if (decision.includes("date")) {
      const text = getDateTime();

      for (const char of text) {
        if (signal?.aborted) return fullText;

        fullText += char;
        onChunk(fullText);
        await new Promise((r) => setTimeout(r, 5));
      }

      return fullText;
    }

    /* ==============================
       🌦 WEATHER TOOL
    ============================== */
    if (decision.includes("weather")) {
      try {
        const city = decision.includes(":") ? decision.split(":")[1] : "Delhi";

        const result = await getWeather(city);

        const text = result
          ? `🌦 Weather Report

📍 ${result.city}
🌡 ${result.temp}°C
🌥 ${result.weather}
💧 ${result.humidity}%
🌬 ${result.wind} m/s`
          : "❌ Weather not found";

        for (const char of text) {
          if (signal?.aborted) return fullText;

          fullText += char;
          onChunk(fullText);
          await new Promise((r) => setTimeout(r, 5));
        }

        return fullText;
      } catch {
        const err = "❌ Weather error";
        onChunk(err);
        return err;
      }
    }

    /* ==============================
       🤖 STREAM AI RESPONSE
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

    if (!res.ok || !res.body) {
      throw new Error("API Error");
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      if (signal?.aborted) return fullText;

      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });

      const lines = chunk.split("\n");

      for (const line of lines) {
        if (!line.startsWith("data:")) continue;

        const jsonStr = line.replace("data: ", "").trim();

        if (jsonStr === "[DONE]") return fullText;

        try {
          const parsed = JSON.parse(jsonStr);
          const token = parsed?.choices?.[0]?.delta?.content;

          if (token) {
            fullText += token;
            onChunk(fullText);
          }
        } catch {
          // ignore bad chunks
        }
      }
    }

    return fullText;
  } catch (error) {
    const errMsg = "❌ Something went wrong. Check API key or network.";
    onChunk(errMsg);
    return errMsg;
  }
}
