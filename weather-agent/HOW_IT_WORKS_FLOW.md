# How This App Works

This file explains the app flow in easy English.

## Big Picture

This project is a React chat app with AI and tools.

The user types a message. The app sends the message to the AI. The AI decides if it should answer normally or use a tool, like weather, date/time, calculator, news, or AQI.

## Simple Flow

```text
User types message
        |
        v
React UI sends message to smart agent
        |
        v
Smart agent asks AI: "Do you need a tool?"
        |
        +-- No tool needed --> AI writes normal answer
        |
        +-- Tool needed ----> App runs the tool
                              |
                              v
                         Tool result is shown in chat
```

## Main Files

| File | What it does |
| --- | --- |
| `src/agent/smartAgent.ts` | Main brain flow for chat messages |
| `src/agent/toolRegistry.ts` | Keeps the list of tools and runs the correct tool |
| `src/agent/mcpClient.ts` | Talks to the backend MCP endpoints |
| `src/tools/weather.ts` | Frontend weather tool |
| `backend/index.js` | Backend server, OpenRouter proxy, and MCP tools |
| `.env` | Stores API keys |

## Chat Flow

When the user sends a message:

1. The UI calls `runSmartAgentStream()` in `src/agent/smartAgent.ts`.
2. The smart agent builds the message history.
3. It sends a small request to the AI asking if a tool is needed.
4. If the AI does not need a tool, the app streams a normal AI answer.
5. If the AI needs a tool, the app runs that tool and shows the result.

## Tool Decision Flow

The AI gets a list of available tools from `getToolDefinitions()`.

That function lives in:

```text
src/agent/toolRegistry.ts
```

It combines:

1. Local frontend tools.
2. Backend MCP tools.

Local tools are used first. If a tool is not local, the app sends it to the backend MCP server.

## Weather Tool Flow

Example user message:

```text
What is the weather in Delhi?
```

Flow:

```text
User asks weather
        |
        v
AI chooses getWeather tool
        |
        v
toolRegistry runs getWeather
        |
        v
src/tools/weather.ts calls OpenWeather API
        |
        v
Weather result returns to chat
```

The weather API key comes from:

```text
VITE_WEATHER_API_KEY
```

This key is stored in `.env`.

## Backend MCP Flow

The backend server is in:

```text
backend/index.js
```

It has these MCP endpoints:

```text
GET  /api/mcp/tools
POST /api/mcp/execute
```

`/api/mcp/tools` returns the list of backend tools.

`/api/mcp/execute` runs one backend tool.

Example:

```text
Frontend asks backend: run getNews
Backend runs getNews
Backend returns news result
Frontend shows result in chat
```

## OpenRouter Chat Flow

The frontend does not call OpenRouter directly.

Instead, it sends chat requests to:

```text
POST /api/openrouter/chat
```

The backend then sends the request to OpenRouter.

This is better because API keys stay on the backend side.

## Environment Variables

The app uses these keys:

```text
VITE_OPENROUTER_API_KEY
VITE_WEATHER_API_KEY
VITE_NEWS_API_KEY
```

The backend now loads `.env` from the project root, so it can read the same keys.

## How To Run

Start frontend:

```powershell
npm run dev
```

Start backend:

```powershell
cd backend
npm start
```

Default backend URL:

```text
http://localhost:5000
```

If you change the backend URL, set:

```text
VITE_BACKEND_URL=http://localhost:5000
```

## Important Notes

- If backend is running, the app can use backend MCP tools.
- If backend is not running, local tools like weather, date/time, and calculator can still work.
- Local tools run inside the frontend.
- Backend tools run inside `backend/index.js`.
- Weather uses OpenWeather API.
- News uses the news API key.
- Chat answers use OpenRouter.

## Very Short Summary

```text
React UI -> smartAgent -> AI decides -> toolRegistry -> local tool or backend MCP -> result in chat
```

