/**
 * AI Workspace Backend Server
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
const { executeWebSearch } = require("./searchService");

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
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Observability: Server-side request logger with sensitive data protection
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (req.path !== "/api/health" && req.path !== "/health") {
      console.log(
        `[${new Date().toISOString()}] ${req.method} ${req.path} -> ${res.statusCode} (${duration}ms)`
      );
    }
  });
  next();
});

// Import new modular routes and middlewares
const db = require("./db");
const { userContextMiddleware } = require("./middleware/auth");
const { standardLimiter, aiChatLimiter, imageLimiter } = require("./middleware/rateLimiter");
const modelRoutes = require("./routes/modelRoutes");
const branchRoutes = require("./routes/branchRoutes");
const knowledgeRoutes = require("./routes/knowledgeRoutes");
const researchRoutes = require("./routes/researchRoutes");
const workspaceRoutes = require("./routes/workspaceRoutes");
const workflowRoutes = require("./routes/workflowRoutes");
const connectorRoutes = require("./routes/connectorRoutes");
const adminRoutes = require("./routes/adminRoutes");
const feedbackRoutes = require("./routes/feedbackRoutes");
const artifactRoutes = require("./routes/artifactRoutes");
const chatRoutes = require("./routes/chatRoutes");
const imageRoutes = require("./routes/imageRoutes");
const generationManager = require("./services/generationManager");
const { handleApiError } = require("./utils/errorHandler");

// Attach user context and standard rate limiting to /api endpoints
app.use(userContextMiddleware);
app.use("/api", standardLimiter);

// Mount modular feature routes
app.use("/api/chat", chatRoutes);
app.use("/api/images", imageLimiter, imageRoutes);
app.use("/api/models", modelRoutes);
app.use("/api/conversations", branchRoutes);
app.use("/api/knowledge-bases", knowledgeRoutes);
app.use("/api/research", researchRoutes);
app.use("/api/workspaces", workspaceRoutes);
app.use("/api/workflows", workflowRoutes);
app.use("/api/connectors", connectorRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/artifacts", artifactRoutes);

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
 * Safely calculates a math expression without using arbitrary eval.
 * Only permits valid arithmetic symbols and whitelisted Math methods.
 * Prevents Remote Code Execution (RCE).
 * 
 * @param expression - Math expression to calculate (e.g., "2 + 2", "Math.sqrt(144)")
 * @returns Result or error message
 */
function calculate(expression) {
  try {
    if (!expression || typeof expression !== "string") {
      return "Invalid calculation";
    }

    const expr = expression.trim();

    // Security check: reject if contains any alphabetical character not in the whitelisted Math functions
    const stripped = expr.replace(
      /Math\.(sqrt|pow|abs|round|floor|ceil|sin|cos|tan|log|PI|E)/g,
      ""
    );
    if (/[a-zA-Z_$]/.test(stripped)) {
      return "Invalid calculation: Disallowed characters in expression";
    }

    // Replace power operator ^ with **
    const sanitized = expr.replace(/\^/g, "**");

    // Safe strict execution with Math as the only argument
    const safeFn = new Function("Math", `"use strict"; return (${sanitized});`);
    const result = safeFn(Math);

    if (typeof result !== "number" || isNaN(result) || !isFinite(result)) {
      return "Result: undefined or infinite";
    }

    return `Result: ${result}`;
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

  return `${data.name} ${Math.round(data.main.temp)}°C ${data.weather?.[0]?.description || "N/A"
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
 * Retrieves the user's public IP address.
 * 
 * Uses ipapi.co to fetch the connection IP address.
 * 
 * @returns IP Address formatted string (e.g., "IP Address: 8.8.8.8")
 * @throws Error if retrieve fails
 */
async function getIP() {
  const res = await fetch("https://ipapi.co/json/");
  const data = await res.json();

  if (!res.ok || !data?.ip) {
    throw new Error("Unable to retrieve IP address");
  }

  return `IP Address: ${data.ip}`;
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
  {
    type: "function",
    function: {
      name: "getIP",
      description: "Get the user's public IP address",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "webSearch",
      description:
        "Search the live web for current information, recent news, documentation, or facts",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query string" },
        },
        required: ["query"],
      },
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
    case "getIP":
      return getIP();
    case "webSearch": {
      const searchResult = await executeWebSearch(String(args.query || ""));
      return searchResult.formatted;
    }
    default:
      throw new Error(`Unknown MCP tool: ${name}`);
  }
}

/**
 * POST /api/search
 * 
 * Direct web search endpoint for the frontend search toggle.
 */
app.post("/api/search", async (req, res) => {
  try {
    const { query } = req.body || {};
    const data = await executeWebSearch(query);
    res.json(data);
  } catch (error) {
    console.error("Search API error:", error);
    res.status(500).json({ error: "Search failed", results: [] });
  }
});

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
  const {
    generationId,
    conversationId,
    userMessageId,
    assistantMessageId,
    mode,
    prompt,
    promptText,
  } = req.body || {};
  const effectivePrompt = prompt || promptText || "";

  // AbortController for upstream timeout and client disconnects
  const abortController = new AbortController();
  let clientDisconnected = false;

  const timeoutId = setTimeout(() => {
    abortController.abort(new Error("Upstream request timed out after 90 seconds"));
  }, 90000);

  // If a tracked generationId is provided, register with generationManager
  if (generationId) {
    generationManager.startGeneration({
      generationId,
      conversationId,
      userMessageId,
      assistantMessageId,
      userId: req.user?.id,
      prompt: effectivePrompt,
      mode,
      abortController,
    });
  }

  // Detect client disconnection:
  // If tracked with generationId, DO NOT abort upstream immediately — allow 60s grace period for page refresh recovery!
  res.on("close", () => {
    if (!res.writableEnded) {
      clientDisconnected = true;
      if (!generationId) {
        abortController.abort(new Error("Client disconnected"));
      }
    }
  });

  try {
    // Check that OpenRouter API key is configured
    if (!openRouterApiKey) {
      clearTimeout(timeoutId);
      return res.status(500).json({ error: "OpenRouter API key not configured" });
    }

    // Default to a free OpenRouter model if none provided
    const model = req.body?.model || process.env.VITE_MODEL || "openrouter/free";
    const requestBody = {
      ...req.body,
      model,
    };
    // Strip our custom tracking fields before forwarding to OpenRouter
    delete requestBody.generationId;
    delete requestBody.conversationId;
    delete requestBody.userMessageId;
    delete requestBody.assistantMessageId;
    delete requestBody.prompt;
    delete requestBody.promptText;
    delete requestBody.mode;
    delete requestBody.hour;
    delete requestBody.timezone;
    delete requestBody.userId;
    delete requestBody.requestId;

    // Strict OpenAI/OpenRouter specification: NEVER pass prompt when messages array is present
    if (Array.isArray(requestBody.messages)) {
      delete requestBody.prompt;
    }

    // Forward the request to OpenRouter API with abort signal
    const providerResponse = await fetch(OPENROUTER_URL, {
      method: "POST",
      signal: abortController.signal,
      headers: {
        Authorization: `Bearer ${openRouterApiKey}`,
        "HTTP-Referer": req.get("origin") || "http://localhost:5173",
        "X-OpenRouter-Title": OPENROUTER_TITLE,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    // If OpenRouter returns an error, extract and return it
    if (!providerResponse.ok) {
      clearTimeout(timeoutId);
      const message = await readProviderError(
        providerResponse,
        "OpenRouter request failed"
      );

      if (generationId) {
        generationManager.failGeneration(generationId, message);
      }

      return res.status(providerResponse.status).json({
        error: message,
      });
    }

    // 1. If streaming was requested
    if (req.body?.stream) {
      res.status(providerResponse.status);
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const reader = providerResponse.body.getReader();
      const textDecoder = new TextDecoder();
      let parseBuffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          if (!clientDisconnected && !res.writableEnded) {
            res.write(Buffer.from(value));
          }

          if (generationId && value) {
            const chunkStr = textDecoder.decode(value, { stream: true });
            parseBuffer += chunkStr;
            const lines = parseBuffer.split("\n");
            parseBuffer = lines.pop() ?? "";

            for (const rawLine of lines) {
              const line = rawLine.trim();
              if (!line || line.startsWith(":")) continue;
              if (line.startsWith("data:")) {
                const jsonStr = line.replace("data:", "").trim();
                if (jsonStr === "[DONE]") continue;
                try {
                  const parsed = JSON.parse(jsonStr);
                  const content = parsed?.choices?.[0]?.delta?.content || "";
                  if (content) {
                    generationManager.appendChunk(generationId, content);
                  }
                } catch {}
              }
            }
          }
        }

        if (generationId) {
          generationManager.completeGeneration(generationId);
        }
      } catch (streamError) {
        if (generationId) {
          generationManager.failGeneration(generationId, streamError.message);
        }
        if (!clientDisconnected && !res.writableEnded) {
          console.error("Error during streaming proxy:", streamError);
        }
      } finally {
        clearTimeout(timeoutId);
        try {
          reader.releaseLock();
        } catch {}
      }

      if (!clientDisconnected && !res.writableEnded) {
        return res.end();
      }
      return;
    }

    clearTimeout(timeoutId);
    // For non-streaming requests, return the full response
    const data = await providerResponse.json();
    return res.status(providerResponse.status).json(data);
  } catch (error) {
    clearTimeout(timeoutId);
    if (clientDisconnected || res.writableEnded) {
      return; // Connection already closed by client
    }
    console.error("OpenRouter proxy error:", error.message || error);
    if (!res.headersSent) {
      return res.status(500).json({
        error: error.name === "AbortError"
          ? "Request timed out or cancelled"
          : (error.message || "OpenRouter request failed"),
      });
    } else {
      res.end();
    }
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
    // Fallback: extract first few words safely from the prompt
    const promptText = typeof req.body?.prompt === "string" ? req.body.prompt : "";
    const fallbackTitle = promptText
      .split(/\s+/)
      .slice(0, 5)
      .join(" ")
      .substring(0, 40);

    // Return fallback title (always succeeds)
    res.json({ title: fallbackTitle || "New Chat" });
  }
});

/**
 * GET /api/health and GET /health
 * 
 * Health check endpoints for uptime and monitoring.
 */
function getHealthPayload() {
  return {
    status: "ok",
    app: "ZyroChat",
    version: "2.5.0",
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    mcp: "enabled",
    webSearch: "enabled",
  };
}

app.get("/api/health", (_req, res) => {
  res.json(getHealthPayload());
});

app.get("/health", (_req, res) => {
  res.json(getHealthPayload());
});

// Centralized Express 404 for unmatched /api routes
app.use("/api", (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: `API endpoint ${req.originalUrl || req.baseUrl} not found`,
      errorId: "err-404",
    },
    errorId: "err-404",
    retryAllowed: false,
  });
});

// Centralized Express unhandled error handler
app.use((err, req, res, _next) => {
  handleApiError(err, req, res, "express", "An unexpected server error occurred.");
});

// Start the Express server on the configured port if run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`ZyroChat backend running on http://localhost:${PORT}`);
  });
}

module.exports = app;
