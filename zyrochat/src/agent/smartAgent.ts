import { getSystemPrompt } from "./SystemPrompt";
import { getToolDefinitions, runToolByName } from "./toolRegistry";
import { streamOpenRouterText, streamTextByCharacter } from "../lib/streaming";
import type { ChatMessage } from "./types";

// The backend URL where we send chat API calls
const BACKEND_CHAT_URL = `${
  import.meta.env.VITE_BACKEND_URL?.replace(/\/$/, "") ||
  "http://localhost:5000"
}/api/openrouter/chat`;

// The AI model we are using (fast and capable GPT-4o-mini)
const OPENROUTER_MODEL = "openai/gpt-4o-mini";

// Limit the context history sent to the AI to save tokens and response time
const MAX_CONTEXT_MESSAGES = 10;

// Token limit for deciding whether the AI needs to call a tool
const TOOL_DECISION_MAX_TOKENS = 300;

// Maximum token size for the full chat response
const CHAT_MAX_TOKENS = 1200;

/**
 * Helper function to extract and format error messages from HTTP responses
 */
async function getOpenRouterError(response: Response, fallback: string) {
  const payload = await response.json().catch(() => null);
  const message =
    payload?.error?.message ||
    payload?.message ||
    payload?.error ||
    response.statusText ||
    fallback;

  return `${fallback}: ${response.status} ${message}`;
}

/**
 * Fetch wrapper for connecting to the local backend proxy
 */
async function fetchBackendChat(init: RequestInit) {
  try {
    return await fetch(BACKEND_CHAT_URL, init);
  } catch {
    throw new Error(
      "Backend is not reachable. Start it with `cd backend` then `npm start`."
    );
  }
}

/**
 * Simple helper to return standard headers for JSON API requests
 */
function getHeaders() {
  return {
    "Content-Type": "application/json",
  };
}

/**
 * Builds the message list payload to send to OpenRouter
 */
function buildMessages(
  chat: ChatMessage[],
  userInput: string,
  mode: string,
  limitToRecent = false
) {
  // Map our app's bot/user roles to OpenAI assistant/user standards
  const history = (
    limitToRecent ? chat.slice(-MAX_CONTEXT_MESSAGES) : chat
  ).map((message) => ({
    role: message.role === "bot" ? "assistant" : "user",
    content: message.text,
  }));

  // Combine system instructions, chat history, and the latest user prompt
  return [
    { role: "system", content: getSystemPrompt(mode || "normal") },
    ...history,
    { role: "user", content: userInput },
  ];
}

/**
 * Asks the AI if it wants to use a tool (like weather, news, etc.) or write code/text directly
 */
async function requestToolDecision(
  userInput: string,
  chat: ChatMessage[],
  mode: string,
  signal: AbortSignal
) {
  const response = await fetchBackendChat({
    method: "POST",
    signal,
    headers: getHeaders(),
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      max_tokens: TOOL_DECISION_MAX_TOKENS,
      messages: buildMessages(chat, userInput, mode, true),
      tools: await getToolDefinitions(signal),
      tool_choice: "auto", // Let OpenRouter auto-decide tool usage
    }),
  });

  if (!response.ok) {
    throw new Error(await getOpenRouterError(response, "API error"));
  }

  const data = await response.json();
  const message = data?.choices?.[0]?.message;

  if (!message) {
    throw new Error("Invalid API response");
  }

  return message;
}

/**
 * Streams the standard AI reply from the proxy back to the user
 */
async function streamModelResponse(
  userInput: string,
  chat: ChatMessage[],
  mode: string,
  onChunk: (chunk: string) => void,
  signal: AbortSignal
) {
  const response = await fetchBackendChat({
    method: "POST",
    signal,
    headers: getHeaders(),
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      max_tokens: CHAT_MAX_TOKENS,
      stream: true, // Request streaming responses
      messages: buildMessages(chat, userInput, mode),
    }),
  });

  if (!response.ok) {
    throw new Error(await getOpenRouterError(response, "Stream error"));
  }

  if (!response.body) {
    throw new Error("No response body from stream");
  }

  // Parse using our standard library-free stream reader
  return streamOpenRouterText(response.body, onChunk, signal);
}

/**
 * Orchestrates the smart agent conversational stream
 */
export async function runSmartAgentStream(
  userInput: string,
  chat: ChatMessage[],
  mode: string,
  onChunk: (chunk: string) => void,
  signal: AbortSignal
) {
  try {
    // 1. Check if the AI wants to execute an MCP tool first
    const message = await requestToolDecision(userInput, chat, mode, signal);

    if (message.tool_calls?.length) {
      // Get first tool call information
      const toolCall = message.tool_calls[0];
      const args = JSON.parse(toolCall.function.arguments || "{}");
      
      // Run the corresponding local/MCP tool
      const toolResult = await runToolByName(
        toolCall.function.name,
        args,
        signal
      );

      // Stream the tool's textual output character-by-character
      return streamTextByCharacter(toolResult, onChunk, signal);
    }

    // 2. If no tool is requested, call and stream the standard AI reply
    return streamModelResponse(userInput, chat, mode, onChunk, signal);
  } catch (error: unknown) {
    // Gracefully capture stops initiated by the user
    if ((error instanceof Error && error.message === "Stream aborted") || signal.aborted) {
      const abortError = new Error("Aborted");
      abortError.name = "AbortError";
      throw abortError;
    }

    console.error("Stream error in agent:", error);
    throw error;
  }
}
