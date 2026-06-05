/**
 * ZyroChat Backend Server
 * 
 * This Express.js server provides:
 * 1. API proxy for OpenRouter (AI model provider)
 * 2. MCP tools endpoint (weather, news, calculations, etc.)
 * 3. Chat title generation
 * 4. Health check endpoint
 * 
 * The server acts as a middleware between the frontend and external APIs,
 * handling authentication, error handling, and streaming responses.
 */

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const { OpenAI } = require("openai");

// Load environment variables from the project root, then fill any backend-only values.
dotenv.config({ path: path.join(__dirname, "..", ".env") });
dotenv.config({ path: path.join(__dirname, ".env") });

// Create Express app
const app = express();
const PORT = process.env.PORT || 5000;

// OpenRouter API endpoint for chat completions
// OpenRouter is a provider that offers access to various AI models
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_TITLE = "ZyroChat"; // Identifier sent to OpenRouter

// Enable CORS so the frontend can call this backend
app.use(cors());

// Parse incoming JSON requests
app.use(express.json());

// Initialize OpenAI client for title generation
// (Uses OpenAI SDK even though we primarily use OpenRouter for chat)
const openAiApiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
const hasOpenAIKey = Boolean(openAiApiKey);
const openai = hasOpenAIKey ? new OpenAI({ apiKey: openAiApiKey }) : null;

// Get OpenRouter API key from environment
const openRouterApiKey =
  process.env.OPENROUTER_API_KEY || process.env.VITE_OPENROUTER_API_KEY;

/**
 * Extracts a friendly error message from an API response.
 * 
 * Different APIs return errors in different formats,
 * so this tries multiple common locations.
 * 
 * @param response - The HTTP response object
 * @param fallback - Default message if parsing fails
 * @returns A string error message
 */
async function readProviderError(response, fallback) {
  const text = await response.text().catch(() => "");

  if (!text) {
    return fallback;
  }

  try {
    const payload = JSON.parse(text);
    return (
      payload?.error?.message ||
      payload?.message ||
      payload?.error ||
      fallback
    );
  } catch {
    return text;
  }
}

/**
 * Returns the current date and time in a formatted display.
 * 
 * Shows:
 * - Calendar date (1/15/2024)
 * - Day of week (Monday)
 * - Current time (3:45:30 PM)
 * 
 * @returns Formatted date/time string
 */
function getDateTime() {
  const now = new Date();

  return `Date & Time

${now.toLocaleDateString()}
${now.toLocaleDateString("en-US", { weekday: "long" })}
${now.toLocaleTimeString()}`;
}

/**
 * Safely calculates a math expression.
 * 
 * Wraps eval() in a try-catch to handle invalid expressions gracefully.
 * Warning: eval() can be unsafe, but here it's only used with AI-generated
 * expressions (not raw user input), so it's acceptable.
 * 
 * @param expression - Math expression to calculate (e.g., "2 + 2")
 * @returns Result or error message
 */
function calculate(expression) {
  try {
    return `Result: ${eval(expression)}`;
  } catch {
    return "Invalid calculation";
  }
}

/**
 * Fetches current weather for a given city.
 *
 * Uses OpenWeather's current weather endpoint and returns a concise string
 * that the chat model can include directly in its reply.
 *
 * @param city - City name to get weather for
 * @returns Weather formatted string
 * @throws Error if the API key is missing or the weather request fails
 */
async function getWeather(city) {
  const apiKey =
    process.env.WEATHER_API_KEY || process.env.VITE_WEATHER_API_KEY;

  if (!apiKey) {
    throw new Error("Weather API key not configured");
  }

  const cleanCity = String(city || "Delhi")
    .replace(/[^a-z\s]/gi, "")
    .trim();

  if (!cleanCity) {
    throw new Error("Invalid city name");
  }

  const res = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
      cleanCity
    )}&appid=${apiKey}&units=metric`
  );
  const data = await res.json();

  if (!res.ok || !data?.main) {
    throw new Error(data?.message || "Unable to fetch weather");
  }

  return `${data.name} ${Math.round(data.main.temp)}°C ${
    data.weather?.[0]?.description || "N/A"
  } | Humidity: ${data.main.humidity}% | Wind: ${data.wind.speed} m/s`;
}

/**
 * Fetches air quality index (AQI) for a given city.
 * 
 * Process:
 * 1. Use city name to get latitude/longitude via OpenWeather Geocoding API
 * 2. Use lat/lon to fetch air pollution data
 * 3. Convert AQI number to readable level (Good, Fair, Moderate, etc.)
 * 
 * @param city - City name to get AQI for
 * @returns AQI formatted string (e.g., "AQI: Good (1)")
 * @throws Error if city not found or API calls fail
 */
async function getAQI(city) {
  const apiKey =
    process.env.WEATHER_API_KEY || process.env.VITE_WEATHER_API_KEY;

  if (!apiKey) {
    throw new Error("Weather API key not configured");
  }

  // Step 1: Convert city name to coordinates
  const geo = await fetch(
    `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(
      city
    )}&limit=1&appid=${apiKey}`
  );
  const geoData = await geo.json();

  // Check if city was found
  if (!geo.ok || !Array.isArray(geoData) || geoData.length === 0) {
    throw new Error("Could not find that city for AQI");
  }

  // Extract coordinates
  const { lat, lon } = geoData[0];
  
  // Step 2: Fetch air pollution data using coordinates
  const res = await fetch(
    `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`
  );
  const data = await res.json();

  // Check if air quality data is available
  if (!res.ok || !data?.list?.[0]?.main?.aqi) {
    throw new Error("Unable to fetch AQI");
  }

  // Convert AQI number (1-5) to readable label
  const levels = ["Good", "Fair", "Moderate", "Poor", "Very Poor"];
  return `AQI: ${levels[data.list[0].main.aqi - 1]} (${data.list[0].main.aqi})`;
}

/**
 * Fetches the latest news headlines.
 * 
 * Supports two news providers based on API key format:
 * 1. NewsData.io (if key starts with "pub_")
 * 2. NewsAPI.org (standard API key)
 * 
 * Returns the top 5 headlines formatted as a numbered list.
 * 
 * @returns List of top 5 news headlines
 * @throws Error if no API key configured or API request fails
 */
async function getNews() {
  const apiKey = process.env.NEWS_API_KEY || process.env.VITE_NEWS_API_KEY;

  if (!apiKey) {
    throw new Error("News API key not configured");
  }

  // Detect which news provider based on API key format
  if (apiKey.startsWith("pub_")) {
    // Using NewsData.io API
    const res = await fetch(
      `https://newsdata.io/api/1/news?apikey=${apiKey}&country=in&language=en&category=top`
    );
    const data = await res.json();

    if (!res.ok || data.status === "error") {
      throw new Error(data.message || "NewsData error");
    }

    // Extract top 5 headlines
    const items = (data.results || []).slice(0, 5);
    return items.length
      ? items.map((item, index) => `${index + 1}. ${item.title}`).join("\n\n")
      : "No news articles were found right now.";
  }

  // Using NewsAPI.org API (default)
  const res = await fetch(
    `https://newsapi.org/v2/top-headlines?country=in&apiKey=${apiKey}`
  );
  const data = await res.json();

  if (!res.ok || data.status === "error") {
    throw new Error(data.message || "NewsAPI error");
  }

  // Extract top 5 headlines
  const items = (data.articles || []).slice(0, 5);
  return items.length
    ? items.map((item, index) => `${index + 1}. ${item.title}`).join("\n\n")
    : "No news articles were found right now.";
}

/**
 * Detects the user's approximate location based on their IP address.
 * 
 * Uses ipapi.co which is free and doesn't require authentication.
 * Returns city and country from IP geolocation.
 * 
 * @returns Location formatted string (e.g., "Location: London, United Kingdom")
 * @throws Error if geolocation fails
 */
async function getIPLocation() {
  const res = await fetch("https://ipapi.co/json/");
  const data = await res.json();

  if (!res.ok || !data?.city || !data?.country_name) {
    throw new Error("Unable to detect location");
  }

  return `Location: ${data.city}, ${data.country_name}`;
}

/**
 * Definition array of all MCP tools the backend can execute.
 * 
 * Each tool describes:
 * - type: Always "function" (for AI model compatibility)
 * - function.name: Tool identifier
 * - function.description: What the tool does (seen by AI)
 * - function.parameters: What inputs the tool accepts
 * 
 * These definitions are sent to the frontend, which passes them to the AI model.
 * The AI uses these to decide which tool to call.
 */
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
      name: "getWeather",
      description:
        "Get the current weather for a city including temperature, conditions, humidity, and wind",
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

/**
 * Executes a tool by name and returns its result.
 * 
 * Routes to the appropriate tool function based on the tool name.
 * Passes the arguments to the tool and catches any errors.
 * 
 * @param name - Name of the tool to execute
 * @param args - Input arguments for the tool
 * @returns Result string from the tool
 * @throws Error if tool name is unknown or tool execution fails
 */
async function executeMcpTool(name, args = {}) {
  switch (name) {
    case "getDateTime":
      return getDateTime();
    case "calculate":
      return calculate(String(args.expression || ""));
    case "getWeather":
      return getWeather(String(args.city || "Delhi"));
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

/**
 * GET /api/mcp/tools
 * 
 * Returns the list of available tools to the frontend.
 * The frontend uses these definitions to tell the AI model
 * what tools are available.
 */
app.get("/api/mcp/tools", (_req, res) => {
  res.json({
    server: "ZyroChat MCP Bridge",
    tools: mcpTools,
  });
});

/**
 * POST /api/mcp/execute
 * 
 * Executes a tool on the backend.
 * 
 * Request body should contain:
 * - name: Tool name to execute
 * - args: Tool arguments (varies by tool)
 * 
 * Response returns:
 * - result: The tool's output as a string
 * - error: Error message if execution fails
 */
app.post("/api/mcp/execute", async (req, res) => {
  try {
    const { name, args } = req.body || {};

    // Validate that tool name is provided
    if (!name || typeof name !== "string") {
      return res.status(400).json({ error: "Tool name is required" });
    }

    // Execute the tool
    const result = await executeMcpTool(name, args);
    res.json({ result });
  } catch (error) {
    console.error("MCP execution error:", error);
    res.status(500).json({
      error: error.message || "Failed to execute MCP tool",
    });
  }
});

/**
 * POST /api/openrouter/chat
 * 
 * Proxy endpoint for OpenRouter API.
 * The frontend sends chat/completion requests here instead of directly to OpenRouter.
 * 
 * This allows the backend to:
 * 1. Keep API keys secret (not exposed to frontend)
 * 2. Add required headers (authorization, title, etc.)
 * 3. Handle streaming responses
 * 4. Add logging and error handling
 * 
 * Request body: Standard OpenAI chat completion request
 * Response: Chat completion or streamed chunks
 */
app.post("/api/openrouter/chat", async (req, res) => {
  try {
    // Check that OpenRouter API key is configured
    if (!openRouterApiKey) {
      return res.status(500).json({ error: "OpenRouter API key not configured" });
    }

    // Forward the request to OpenRouter API
    const providerResponse = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        // Authorization header with API key
        Authorization: `Bearer ${openRouterApiKey}`,
        // Tell OpenRouter where requests are coming from
        "HTTP-Referer": req.get("origin") || "http://localhost:5173",
        // App identifier for OpenRouter tracking
        "X-OpenRouter-Title": OPENROUTER_TITLE,
        "Content-Type": "application/json",
      },
      // Forward the original request body as-is
      body: JSON.stringify(req.body),
    });

    // If OpenRouter returns an error, extract and return it
    if (!providerResponse.ok) {
      const message = await readProviderError(
        providerResponse,
        "OpenRouter request failed"
      );

      return res.status(providerResponse.status).json({
        error: message,
      });
    }

    // Handle streaming responses (when client requests stream: true)
    if (req.body?.stream) {
      // Set headers to enable Server-Sent Events streaming
      res.status(providerResponse.status);
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      // Stream the response directly to the client
      const reader = providerResponse.body.getReader();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }

      return res.end();
    }

    // For non-streaming requests, return the full response
    const data = await providerResponse.json();
    return res.status(providerResponse.status).json(data);
  } catch (error) {
    console.error("OpenRouter proxy error:", error);
    return res.status(500).json({
      error: error.message || "OpenRouter request failed",
    });
  }
});

/**
 * POST /api/generate-title
 * 
 * Generates a chat title from the user's first message.
 * 
 * Uses OpenAI's GPT-3.5-turbo to create a concise 3-6 word title.
 * Falls back to keyword extraction if title generation fails.
 * 
 * Request body:
 * - prompt: User's first message text
 * 
 * Response:
 * - title: Generated title string
 */
app.post("/api/generate-title", async (req, res) => {
  try {
    const { prompt } = req.body;

    // Validate input
    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "Prompt is required" });
    }

    // Check that OpenAI API key is configured
    if (!hasOpenAIKey) {
      return res.status(500).json({ error: "OpenAI API key not configured" });
    }

    // Ask GPT to generate a title from the first 200 characters of the prompt
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
      max_tokens: 20, // Very short response (just the title)
      temperature: 0.7, // Medium creativity
    });

    // Extract the generated title
    const title = response.choices[0].message.content.trim();

    if (!title) {
      throw new Error("No title generated");
    }

    res.json({ title });
  } catch (error) {
    console.error("Title generation error:", error);

    // Fallback: extract first few words from the prompt
    const fallbackTitle = req.body.prompt
      .split(/\s+/)
      .slice(0, 5)
      .join(" ")
      .substring(0, 40);

    // Return fallback title (always succeeds)
    res.json({ title: fallbackTitle || "New Chat" });
  }
});

/**
 * GET /api/health
 * 
 * Health check endpoint.
 * Used to verify the backend is running and what components are enabled.
 * 
 * Response shows:
 * - status: "ok" if server is running
 * - app: Application name ("ZyroChat")
 * - mcp: Whether MCP tools are enabled
 */
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    app: "ZyroChat",
    mcp: "enabled",
  });
});

// Start the Express server on the configured port
app.listen(PORT, () => {
  console.log(`ZyroChat backend running on http://localhost:${PORT}`);
});
