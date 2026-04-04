import { getWeather } from "../tools/weather";
import { getSystemPrompt } from "./SystemPrompt";

/* ==============================
   📅 DATE
============================== */
function getDateTime() {
  const now = new Date();

  return `📅 Date & Time

🗓 ${now.toLocaleDateString()}
📆 ${now.toLocaleDateString("en-US", { weekday: "long" })}
⏰ ${now.toLocaleTimeString()}`;
}

/* ==============================
   🧮 CALCULATOR
============================== */
function calculate(expression: string) {
  try {
    return `🧮 Result: ${eval(expression)}`;
  } catch {
    return "❌ Invalid calculation";
  }
}

/* ==============================
   🌫 AQI
============================== */
async function getAQI(city: string) {
  const API_KEY = import.meta.env.VITE_WEATHER_API_KEY;

  const geo = await fetch(
    `https://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=1&appid=${API_KEY}`
  );
  const geoData = await geo.json();

  if (!geoData.length) return null;

  const { lat, lon } = geoData[0];

  const res = await fetch(
    `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`
  );

  const data = await res.json();
  return data.list[0].main.aqi;
}

function formatAQI(aqi: number) {
  const levels = ["Good", "Fair", "Moderate", "Poor", "Very Poor"];
  return `🌫 AQI: ${levels[aqi - 1]} (${aqi})`;
}

/* ==============================
   📰 NEWS
============================== */
async function getNews() {
  const res = await fetch(
    `https://newsapi.org/v2/top-headlines?country=in&apiKey=${
      import.meta.env.VITE_NEWS_API_KEY
    }`
  );
  const data = await res.json();
  return data.articles.slice(0, 5);
}

function formatNews(news: any[]) {
  return news.map((n, i) => `${i + 1}. ${n.title}`).join("\n\n");
}

/* ==============================
   🌍 IP LOCATION
============================== */
async function getIPLocation() {
  const res = await fetch("https://ipapi.co/json/");
  const data = await res.json();
  return `${data.city}, ${data.country_name}`;
}

/* ==============================
   ✨ STREAM
============================== */
async function streamText(text: string, onChunk: { (chunk: string): void; (arg0: string): void; (chunk: string): void; (arg0: string): void; (chunk: string): void; (arg0: string): void; (chunk: string): void; (arg0: string): void; (chunk: string): void; (arg0: string): void; (chunk: string): void; (arg0: string): void; (arg0: string): void; }, signal: AbortSignal) {
  let full = "";

  for (const c of text) {
    if (signal?.aborted) return full;
    full += c;
    onChunk(full);
    await new Promise((r) => setTimeout(r, 5));
  }

  return full;
}

/* ==============================
   🚀 MAIN
============================== */
export async function runSmartAgentStream(
  userInput: string,
  chat: any[],
  mode: string,
  onChunk: { (chunk: string): void; (arg0: string): void; },
  signal: AbortSignal
) {
  let fullText = "";

  try {
    /* ==============================
       🧠 AI TOOL DECISION
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
        messages: [
          { role: "system", content: getSystemPrompt(mode || "normal") },
          ...chat.slice(-10).map((m) => ({
            role: m.role === "bot" ? "assistant" : "user",
            content: m.text,
          })),
          { role: "user", content: userInput },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "getWeather",
              description: "Get weather",
              parameters: {
                type: "object",
                properties: { city: { type: "string" } },
              },
            },
          },
          {
            type: "function",
            function: {
              name: "getDateTime",
              description: "Get date time",
              parameters: { type: "object", properties: {} },
            },
          },
          {
            type: "function",
            function: {
              name: "calculate",
              description: "Math calculation",
              parameters: {
                type: "object",
                properties: { expression: { type: "string" } },
              },
            },
          },
          {
            type: "function",
            function: {
              name: "getAQI",
              description: "Air quality",
              parameters: {
                type: "object",
                properties: { city: { type: "string" } },
              },
            },
          },
          {
            type: "function",
            function: {
              name: "getNews",
              description: "Latest news",
              parameters: { type: "object", properties: {} },
            },
          },
          {
            type: "function",
            function: {
              name: "getIPLocation",
              description: "User location",
              parameters: { type: "object", properties: {} },
            },
          },
        ],
        tool_choice: "auto",
      }),
    });

    const data = await res.json();
    const msg = data.choices[0].message;

    /* ==============================
       🔥 TOOL HANDLER (FIXED)
    ============================== */
    if (msg.tool_calls) {
      const toolCall = msg.tool_calls[0];
      const args = JSON.parse(toolCall.function.arguments);

      switch (toolCall.function.name) {
        case "getWeather": {
          const r = await getWeather(args.city || "Delhi");
          return await streamText(
            `🌦 ${r.city} ${r.temp}°C ${r.weather}`,
            onChunk,
            signal
          );
        }

        case "getDateTime":
          return await streamText(getDateTime(), onChunk, signal);

        case "calculate":
          return await streamText(calculate(args.expression), onChunk, signal);

        case "getAQI": {
          const aqi = await getAQI(args.city || "Delhi");
          return await streamText(formatAQI(aqi), onChunk, signal);
        }

        case "getNews": {
          const news = await getNews();
          return await streamText(formatNews(news), onChunk, signal);
        }

        case "getIPLocation": {
          const loc = await getIPLocation();
          return await streamText(`📍 ${loc}`, onChunk, signal);
        }
      }
    }

    /* ==============================
       🤖 NORMAL STREAM
    ============================== */
    const streamRes = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
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
            { role: "user", content: userInput },
          ],
        }),
      }
    );

    if (!streamRes.body) {
      onChunk("❌ Error: No response body");
      return "❌ Error";
    }

    const reader = streamRes.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      if (signal?.aborted) return fullText;

      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);

      const lines = chunk.split("\n");

      for (const line of lines) {
        if (!line.startsWith("data:")) continue;

        const json = line.replace("data: ", "").trim();

        if (json === "[DONE]") return fullText;

        try {
          const parsed = JSON.parse(json);
          const token = parsed.choices[0]?.delta?.content;

          if (token) {
            fullText += token;
            onChunk(fullText);
          }
        } catch { /* empty */ }
      }
    }

    return fullText;
  } catch {     
    onChunk("❌ Error occurred");
    return "❌ Error";
  }
}
