import { getSystemPrompt } from "./SystemPrompt";
import { getToolDefinitions, runToolByName } from "./toolRegistry";
import { streamOpenRouterText, streamTextByCharacter } from "../lib/streaming";
import type { ChatMessage } from "./types";

// The URL on the backend where chat requests are sent
const BACKEND_CHAT_URL = `${
  import.meta.env.VITE_BACKEND_URL?.replace(/\/$/, "") ||
  "http://localhost:5000"
}/api/openrouter/chat`;

// The AI model we're using: OpenAI's fast, capable GPT-4o-mini model
const OPENROUTER_MODEL = "openai/gpt-4o-mini";

// Maximum number of recent messages to include when asking the AI.
// Older messages are dropped to keep API costs low and response time fast.
const MAX_CONTEXT_MESSAGES = 10;

// Maximum tokens (roughly words) the AI should use when deciding whether to call a tool.
// Lower limit = faster decisions
const TOOL_DECISION_MAX_TOKENS = 300;

// Maximum tokens the AI should use when generating a full response.
// This is the main limit for reply length.
const CHAT_MAX_TOKENS = 1200;

/**
 * Extracts error details from failed API responses.
 *
 * When the backend or API returns an error, this function:
 * 1. Parses the JSON response to find the error message
 * 2. Checks multiple common locations where error messages appear
 * 3. Returns a human-readable error string combining the fallback text and status code
 *
 * @param response - The failed HTTP response
 * @param fallback - A default error message if parsing fails
 * @returns A formatted error string with status code and message
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
 * Makes a fetch request to the backend chat endpoint.
 *
 * This is a wrapper that adds error handling specific to backend communication.
 * If the backend is not running, it provides helpful instructions.
 *
 * @param init - Standard fetch RequestInit (method, headers, body, etc.)
 * @returns Promise resolving to the HTTP response
 * @throws Error if the backend is unreachable
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
 * Returns HTTP headers needed for API requests.
 *
 * Currently just sets Content-Type for JSON requests.
 * This is separated out so headers can be reused and easily modified.
 *
 * @returns Object with required HTTP headers
 */
function getHeaders() {
  return {
    "Content-Type": "application/json",
  };
}

/**
 * Assembles the messages to send to the AI model.
 *
 * This function:
 * 1. Takes the conversation history and formats it for the AI
 * 2. Optionally limits to the most recent messages (to save API costs)
 * 3. Prepends the system prompt (instructions for how to behave)
 * 4. Appends the new user input
 * 5. Returns an array in the format the API expects
 *
 * Example output:
 * [
 *   { role: "system", content: "You are ZyroChat..." },
 *   { role: "user", content: "What's the weather?" },
 *   { role: "assistant", content: "I'll check for you." },
 *   { role: "user", content: "In Tokyo?" }
 * ]
 *
 * @param chat - Array of previous messages in the conversation
 * @param userInput - The new question/message from the user
 * @param mode - The assistant mode (normal, coding, teaching, fun)
 * @param limitToRecent - If true, only include the last N messages to save API costs
 * @returns Array of messages formatted for the OpenAI API
 */
function buildMessages(
  chat: ChatMessage[],
  userInput: string,
  mode: string,
  limitToRecent = false
) {
  // Convert our chat format to OpenAI format and optionally trim old messages
  const history = (
    limitToRecent ? chat.slice(-MAX_CONTEXT_MESSAGES) : chat
  ).map((message) => ({
    role: message.role === "bot" ? "assistant" : "user",
    content: message.text,
  }));

  // Build the final message array: system instructions + history + new user input
  return [
    { role: "system", content: getSystemPrompt(mode || "normal") },
    ...history,
    { role: "user", content: userInput },
  ];
}

/**
 * Asks the AI whether to use a tool or just respond normally.
 *
 * This is a preliminary request where:
 * 1. The AI sees the user input and available tools
 * 2. The AI decides whether the question can be answered with a tool
 * 3. If yes, it returns tool_calls specifying which tool to use
 * 4. If no, it returns empty tool_calls and we'll ask for a full response
 *
 * We do this in two separate API calls instead of one because:
 * - Tool decisions are simpler and need fewer tokens (saved money)
 * - We can handle tool results and include them in the full response
 *
 * @param userInput - The user's question/message
 * @param chat - The conversation history so far
 * @param mode - The assistant mode (normal, coding, teaching, fun)
 * @param signal - AbortSignal to cancel if needed
 * @returns Promise resolving to the AI's decision (may include tool_calls)
 * @throws Error if the API request fails
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
      tool_choice: "auto", // Let the AI decide whether to use a tool
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
 * Streams a full response from the AI model.
 *
 * This makes an API request to get the AI's response and receives it in chunks
 * (streaming). Each chunk is parsed and passed to onChunk, which updates the UI.
 *
 * The function:
 * 1. Sends a request to the backend with stream: true
 * 2. Reads chunks as they arrive (Server-Sent Events format)
 * 3. Parses each chunk to extract the text token
 * 4. Accumulates tokens into fullText
 * 5. Calls onChunk with the growing response for real-time UI updates
 * 6. Stops when [DONE] is received
 *
 * @param userInput - The user's question/message
 * @param chat - The conversation history
 * @param mode - The assistant mode
 * @param onChunk - Callback called with each chunk of the response
 * @param signal - AbortSignal to cancel streaming
 * @returns Promise resolving to the complete response text
 * @throws Error if the stream fails or is aborted
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
      stream: true, // This tells the API to stream the response instead of waiting for completion
      messages: buildMessages(chat, userInput, mode),
    }),
  });

  if (!response.ok) {
    throw new Error(await getOpenRouterError(response, "Stream error"));
  }

  if (!response.body) {
    throw new Error("No response body from stream");
  }

  return streamOpenRouterText(response.body, onChunk, signal);
}

function isImageGenerationRequest(input: string) {
  const text = input.toLowerCase();
  const actionPattern =
    /\b(generate|create|make|draw|design|render|produce)\b/;
  const imagePattern =
    /\b(image|img|picture|photo|art|artwork|illustration|poster|logo|wallpaper)\b/;

  return actionPattern.test(text) && imagePattern.test(text);
}

function getImagePrompt(input: string) {
  return input
    .replace(
      /\b(please\s+)?(generate|create|make|draw|design|render|produce)\b/gi,
      ""
    )
    .replace(/\b(an?|the)?\s*(image|img|picture|photo|artwork|art)\s*(of|for)?\b/gi, "")
    .trim()
    .replace(/^[:,-]\s*/, "")
    .trim();
}

/**
 * The main entry point for the smart agent.
 *
 * This orchestrates the entire conversation flow:
 * 1. Ask the AI if a tool is needed
 * 2. If yes, run the tool and stream its result
 * 3. If no, get the AI's full response and stream it
 *
 * This is called whenever the user sends a message, and handles streaming the response
 * character-by-character to the UI in real-time.
 *
 * Error handling:
 * - If the user clicks "stop", the signal is aborted and we propagate an AbortError
 * - Other errors are logged and re-thrown for the UI to handle
 *
 * @param userInput - The user's message
 * @param chat - The conversation history so far
 * @param mode - The assistant mode (normal, coding, teaching, fun)
 * @param onChunk - Callback called with each chunk of streamed text
 * @param signal - AbortSignal to stop streaming
 * @returns Promise resolving to the complete response text
 * @throws Error if something goes wrong (logged to console)
 * @throws AbortError if the stream is cancelled by the user
 */
export async function runSmartAgentStream(
  userInput: string,
  chat: ChatMessage[],
  mode: string,
  onChunk: (chunk: string) => void,
  signal: AbortSignal
) {
  try {
    if (isImageGenerationRequest(userInput)) {
      const prompt = getImagePrompt(userInput) || userInput;
      const toolResult = await runToolByName("generateImage", { prompt }, signal);

      return streamTextByCharacter(toolResult, onChunk, signal);
    }

    // Step 1: Ask the AI if a tool is needed
    const message = await requestToolDecision(userInput, chat, mode, signal);

    // Step 2: If tools are available and the AI wants to use one, execute it
    if (message.tool_calls?.length) {
      const toolCall = message.tool_calls[0];
      const args = JSON.parse(toolCall.function.arguments || "{}");
      const toolResult = await runToolByName(
        toolCall.function.name,
        args,
        signal
      );

      // Stream the tool result character-by-character for visual feedback
      return streamTextByCharacter(toolResult, onChunk, signal);
    }

    // Step 3: No tool needed, get the AI's full response and stream it
    return streamModelResponse(userInput, chat, mode, onChunk, signal);
  } catch (error: unknown) {
    // Handle abort errors gracefully (user clicked stop)
    if ((error instanceof Error && error.message === "Stream aborted") || signal.aborted) {
      const abortError = new Error("Aborted");
      abortError.name = "AbortError";
      throw abortError;
    }

    // Log unexpected errors for debugging
    console.error("Stream error:", error);
    throw error;
  }
}
