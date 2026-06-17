# How ZyroChat Works (Easy Guide)

This guide explains how this chat application works in simple English.

---

## 🌟 The Big Picture

ZyroChat is a chat app where you can talk to an AI assistant. 
When you type a message, the app sends it to the AI. The AI can either:
1. **Answer directly** (normal chat).
2. **Use a Tool** to get real-time info (like Weather, Date & Time, Calculator, News, or Air Quality).

---

## 🔄 Simple Flow of a Message

```text
User types a message
       │
       ▼
React UI sends the message to the Smart Agent
       │
       ▼
Smart Agent asks the AI: "Do you need to run a tool for this?"
       │
       ├──► No Tool Needed ──► AI streams a normal reply
       │
       └──► Tool Needed ─────► App runs the correct tool
                                  │
                                  ▼
                              Tool result is shown in the chat
```

---

## 📂 Key Files of the App

| File Path | What it does |
| :--- | :--- |
| **`src/agent/smartAgent.ts`** | The main brain. It manages chat history and asks the AI for answers. |
| **`src/agent/toolRegistry.ts`** | Keeps a list of all tools (like weather, calculator) and executes them. |
| **`src/agent/mcpClient.ts`** | Communicates with the backend server to run backend tools. |
| **`src/tools/weather.ts`** | Frontend tool that fetches live weather from OpenWeather API. |
| **`backend/index.js`** | Express backend server. It proxies AI requests and runs backend tools. |
| **`.env`** | Stores private API keys (OpenWeather, NewsAPI, OpenRouter). |

---

## 💬 Chat Flow (Step-by-Step)

1. You type a prompt in the text box.
2. The UI calls **`runSmartAgentStream`** inside `src/agent/smartAgent.ts`.
3. The app gathers your conversation history so the AI remembers what you said.
4. The Smart Agent sends a quick request to the AI asking if a tool is needed.
   * If **Yes**: The app runs the tool (like fetching weather or checking news) and types the result in the chat.
   * If **No**: The AI writes a normal conversational response.

---

## 🛠️ Local Tools vs. Backend MCP Tools

The app has two types of tools:

### 1. Local Tools (Runs in your Browser)
These do not need the backend server to run:
* **Get Date & Time**: Returns the current system date and time.
* **Calculator**: Solves mathematical equations (e.g., `2 + 2`).
* **Weather**: Calls the OpenWeather API directly from the browser using your `VITE_WEATHER_API_KEY`.

### 2. Backend MCP Tools (Runs on the Server)
These run inside the Express server (`backend/index.js`) to protect API keys:
* **Air Quality (AQI)**: Converts city name to coordinates, then gets pollution metrics.
* **Top News**: Fetches top news headlines using your news API key.
* **Location Finder**: Detects your approximate location using your IP address.

---

## 🔑 Environment Keys You Need

Create a `.env` file in the project root with:
```text
VITE_OPENROUTER_API_KEY = your_openrouter_api_key_here
VITE_WEATHER_API_KEY = your_openweather_api_key_here
NEWS_API_KEY = your_news_api_key_here
```

---

## 🚀 How to Run the App

1. **Start the Backend Server**:
   ```bash
   cd backend
   npm install
   npm start
   ```
   *Runs at http://localhost:5000*

2. **Start the React Frontend**:
   ```bash
   npm install
   npm run dev
   ```
   *Runs at http://localhost:5173*
