const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { OpenAI } = require("openai");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY,
});
const hasOpenAIKey = Boolean(
  process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY
);

function getDateTime() {
  const now = new Date();

  return `Date & Time

${now.toLocaleDateString()}
${now.toLocaleDateString("en-US", { weekday: "long" })}
${now.toLocaleTimeString()}`;
}

function calculate(expression) {
  try {
    return `Result: ${eval(expression)}`;
  } catch {
    return "Invalid calculation";
  }
}

async function getAQI(city) {
  const apiKey =
    process.env.WEATHER_API_KEY || process.env.VITE_WEATHER_API_KEY;

  if (!apiKey) {
    throw new Error("Weather API key not configured");
  }

  const geo = await fetch(
    `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(
      city
    )}&limit=1&appid=${apiKey}`
  );
  const geoData = await geo.json();

  if (!geo.ok || !Array.isArray(geoData) || geoData.length === 0) {
    throw new Error("Could not find that city for AQI");
  }

  const { lat, lon } = geoData[0];
  const res = await fetch(
    `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`
  );
  const data = await res.json();

  if (!res.ok || !data?.list?.[0]?.main?.aqi) {
    throw new Error("Unable to fetch AQI");
  }

  const levels = ["Good", "Fair", "Moderate", "Poor", "Very Poor"];
  return `AQI: ${levels[data.list[0].main.aqi - 1]} (${data.list[0].main.aqi})`;
}

async function getNews() {
  const apiKey = process.env.NEWS_API_KEY || process.env.VITE_NEWS_API_KEY;

  if (!apiKey) {
    throw new Error("News API key not configured");
  }

  if (apiKey.startsWith("pub_")) {
    const res = await fetch(
      `https://newsdata.io/api/1/news?apikey=${apiKey}&country=in&language=en&category=top`
    );
    const data = await res.json();

    if (!res.ok || data.status === "error") {
      throw new Error(data.message || "NewsData error");
    }

    const items = (data.results || []).slice(0, 5);
    return items.length
      ? items.map((item, index) => `${index + 1}. ${item.title}`).join("\n\n")
      : "No news articles were found right now.";
  }

  const res = await fetch(
    `https://newsapi.org/v2/top-headlines?country=in&apiKey=${apiKey}`
  );
  const data = await res.json();

  if (!res.ok || data.status === "error") {
    throw new Error(data.message || "NewsAPI error");
  }

  const items = (data.articles || []).slice(0, 5);
  return items.length
    ? items.map((item, index) => `${index + 1}. ${item.title}`).join("\n\n")
    : "No news articles were found right now.";
}

async function getIPLocation() {
  const res = await fetch("https://ipapi.co/json/");
  const data = await res.json();

  if (!res.ok || !data?.city || !data?.country_name) {
    throw new Error("Unable to detect location");
  }

  return `Location: ${data.city}, ${data.country_name}`;
}

const mcpTools = [
  {
    type: "function",
    function: {
      name: "getDateTime",
      description: "Get the current local date and time",
      parameters: { type: "object", properties: {} },
    },
  },
  {
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
  {
    type: "function",
    function: {
      name: "getAQI",
      description: "Get the air quality index for a city",
      parameters: {
        type: "object",
        properties: { city: { type: "string" } },
        required: ["city"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getNews",
      description: "Get the latest top headlines",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "getIPLocation",
      description: "Detect the user's approximate location",
      parameters: { type: "object", properties: {} },
    },
  },
];

async function executeMcpTool(name, args = {}) {
  switch (name) {
    case "getDateTime":
      return getDateTime();
    case "calculate":
      return calculate(String(args.expression || ""));
    case "getAQI":
      return getAQI(String(args.city || "Delhi"));
    case "getNews":
      return getNews();
    case "getIPLocation":
      return getIPLocation();
    default:
      throw new Error(`Unknown MCP tool: ${name}`);
  }
}

app.get("/api/mcp/tools", (_req, res) => {
  res.json({
    server: "ZyroChat MCP Bridge",
    tools: mcpTools,
  });
});

app.post("/api/mcp/execute", async (req, res) => {
  try {
    const { name, args } = req.body || {};

    if (!name || typeof name !== "string") {
      return res.status(400).json({ error: "Tool name is required" });
    }

    const result = await executeMcpTool(name, args);
    res.json({ result });
  } catch (error) {
    console.error("MCP execution error:", error);
    res.status(500).json({
      error: error.message || "Failed to execute MCP tool",
    });
  }
});

app.post("/api/generate-title", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "Prompt is required" });
    }

    if (!hasOpenAIKey) {
      return res.status(500).json({ error: "OpenAI API key not configured" });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "Generate a concise, natural chat title (3-6 words max) from user input. Return ONLY the title text, nothing else.",
        },
        {
          role: "user",
          content: prompt.substring(0, 200),
        },
      ],
      max_tokens: 20,
      temperature: 0.7,
    });

    const title = response.choices[0].message.content.trim();

    if (!title) {
      throw new Error("No title generated");
    }

    res.json({ title });
  } catch (error) {
    console.error("Title generation error:", error);

    const fallbackTitle = req.body.prompt
      .split(/\s+/)
      .slice(0, 5)
      .join(" ")
      .substring(0, 40);

    res.json({ title: fallbackTitle || "New Chat" });
  }
});

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    app: "ZyroChat",
    mcp: "enabled",
  });
});

app.listen(PORT, () => {
  console.log(`ZyroChat backend running on http://localhost:${PORT}`);
});
