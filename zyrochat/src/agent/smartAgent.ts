import { getSystemPrompt } from "./SystemPrompt";
import { getToolDefinitions, runToolByName } from "./toolRegistry";
import { streamOpenRouterText, streamTextByCharacter } from "../lib/streaming";
import type { ChatMessage, SourceCitation, ToolStatusInfo } from "./types";
import { resolveArtifactContext } from "../utils/artifactContext";

// The backend URL where we send chat API calls
const BACKEND_BASE_URL =
  import.meta.env.VITE_BACKEND_URL?.replace(/\/$/, "") || "http://localhost:5000";

const BACKEND_CHAT_URL = `${BACKEND_BASE_URL}/api/openrouter/chat`;
const BACKEND_SEARCH_URL = `${BACKEND_BASE_URL}/api/search`;

// The AI model we are using (Free OpenRouter model or configured model)
const OPENROUTER_MODEL = import.meta.env.VITE_MODEL || "openrouter/free";

// Limit the context history sent to the AI to save tokens and response time
const MAX_CONTEXT_MESSAGES = 15;

// Token limit for deciding whether the AI needs to call a tool
const TOOL_DECISION_MAX_TOKENS = 150;

// Maximum token size for the full chat response
const CHAT_MAX_TOKENS = 4096;

export interface AgentStreamOptions {
  projectInstructions?: string;
  memories?: string[];
  webSearchActive?: boolean;
  onToolStatus?: (status: ToolStatusInfo | null) => void;
  onSourcesFound?: (sources: SourceCitation[]) => void;
  generationId?: string;
  conversationId?: string;
  userMessageId?: string;
  assistantMessageId?: string;
  hour?: string;
  timezone?: string;
}

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
  } catch (err: any) {
    if (err?.name === "AbortError" || init.signal?.aborted) {
      const abortErr = new Error("Aborted");
      abortErr.name = "AbortError";
      throw abortErr;
    }
    throw new Error(
      "Backend is not reachable. Start it with `npm run backend` or check port 5000."
    );
  }
}

function getHeaders() {
  return {
    "Content-Type": "application/json",
  };
}

/**
 * Performs web search via backend proxy
 */
async function performWebSearch(query: string, signal?: AbortSignal) {
  try {
    const res = await fetch(BACKEND_SEARCH_URL, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ query }),
      signal,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn("Web search request failed:", err);
    return null;
  }
}

/**
 * Builds the message list payload to send to OpenRouter
 */
function buildMessages(
  chat: ChatMessage[],
  userInput: string,
  mode: string,
  options?: AgentStreamOptions,
  limitToRecent = false,
  extraContext = ""
) {
  const history = limitToRecent ? chat.slice(-MAX_CONTEXT_MESSAGES) : chat;

  // Map each message to OpenAI format
  const mappedMessages = history.map((message) => {
    const role = message.role === "bot" ? "assistant" : "user";

    // If message contains files, build a multi-part content array
    if (message.attachments && message.attachments.length > 0) {
      const contentParts: any[] = [];

      let initialText = message.text || "Please analyze the attached files.";

      // If any attachment has extracted text content, append it
      message.attachments.forEach((file: any) => {
        if (file.type?.startsWith("image/") && file.url) {
          contentParts.push({
            type: "image_url",
            image_url: { url: file.url },
          });
        } else if (file.content) {
          initialText += `\n\n[File: ${file.name} (${(file.size / 1024).toFixed(1)} KB)]\n\`\`\`${file.name.split(".").pop() || ""}\n${file.content.slice(0, 14000)}\n\`\`\``;
        } else {
          initialText += `\n[Attached File: ${file.name} (${(file.size / 1024).toFixed(1)} KB)]`;
        }
      });

      contentParts.unshift({ type: "text", text: initialText });
      return { role, content: contentParts };
    }

    return { role, content: message.text || "Please analyze the request." };
  });

  const lastMsg = history[history.length - 1];
  const lastMsgIsLatestUser =
    lastMsg && lastMsg.role === "user" && lastMsg.text === userInput;

  const timeContext = options?.hour
    ? `[User specified scheduled/target time: ${options.hour}${options.timezone ? ` (Timezone: ${options.timezone})` : ""}]`
    : "";

  let finalUserContent = userInput;
  if (timeContext) {
    finalUserContent = `${timeContext}\n\n${finalUserContent}`;
  }
  if (extraContext) {
    finalUserContent = `${extraContext}\n\n${finalUserContent}`;
  }

  if (!lastMsgIsLatestUser && userInput) {
    mappedMessages.push({ role: "user", content: finalUserContent });
  }

    const personalization = {
      responseStyle: localStorage.getItem("zyrochat-pref-style") || "Balanced",
      language: localStorage.getItem("zyrochat-pref-language") || "English",
      expertise: localStorage.getItem("zyrochat-pref-expertise") || "Advanced",
      tone: localStorage.getItem("zyrochat-pref-tone") || "Professional",
    };

    return [
      {
        role: "system",
        content: getSystemPrompt(mode || "normal", {
          projectInstructions: options?.projectInstructions,
          memories: options?.memories,
          webSearchActive: options?.webSearchActive,
          personalization,
        }),
      },
      ...mappedMessages,
    ];
}

/**
 * Asks the AI if it wants to use a tool
 */
async function requestToolDecision(
  userInput: string,
  chat: ChatMessage[],
  mode: string,
  options: AgentStreamOptions | undefined,
  signal: AbortSignal
) {
  const response = await fetchBackendChat({
    method: "POST",
    signal,
    headers: getHeaders(),
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      max_tokens: TOOL_DECISION_MAX_TOKENS,
      messages: buildMessages(chat, userInput, mode, options, true),
      tools: await getToolDefinitions(signal),
      tool_choice: "auto",
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
  options: AgentStreamOptions | undefined,
  extraContext: string,
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
      stream: true,
      messages: buildMessages(chat, userInput, mode, options, false, extraContext),
      generationId: options?.generationId,
      conversationId: options?.conversationId,
      userMessageId: options?.userMessageId,
      assistantMessageId: options?.assistantMessageId,
      hour: options?.hour,
      timezone: options?.timezone,
      mode,
      promptText: userInput,
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

/**
 * Reconnects to an in-flight server generation via SSE stream
 */
export async function reconnectGenerationStream(
  generationId: string,
  onChunk: (fullText: string) => void,
  signal?: AbortSignal
): Promise<string> {
  const url = `${BACKEND_BASE_URL}/api/chat/generations/${encodeURIComponent(generationId)}/stream`;
  const response = await fetch(url, { signal });
  if (!response.ok || !response.body) {
    throw new Error("Unable to reconnect to generation stream");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";

  while (!signal?.aborted) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || !line.startsWith("data:")) continue;
      const jsonStr = line.replace("data:", "").trim();
      if (jsonStr === "[DONE]") break;
      try {
        const payload = JSON.parse(jsonStr);
        if (payload.type === "catchup" || payload.type === "chunk" || payload.type === "done" || payload.type === "interrupted") {
          if (typeof payload.fullText === "string") {
            fullText = payload.fullText;
          } else if (typeof payload.text === "string") {
            fullText = payload.text;
          }
          onChunk(fullText);
        }
      } catch {
        // Ignore parse errors on stream fragments
      }
    }
  }

  return fullText;
}

/**
 * Orchestrates the smart agent conversational stream
 */
export async function runSmartAgentStream(
  userInput: string,
  chat: ChatMessage[],
  mode: string,
  onChunk: (chunk: string) => void,
  signal: AbortSignal,
  options?: AgentStreamOptions
) {
  try {
    let extraContext = "";

    // 0. Check for referenced workspace artifacts or smart chunking
    const artifactResolution = resolveArtifactContext(userInput);
    if (artifactResolution.disambiguationMessage) {
      // Prompt user to pick which artifact to analyze when ambiguous
      return streamTextByCharacter(artifactResolution.disambiguationMessage, onChunk, signal);
    }
    if (artifactResolution.contextPrompt) {
      extraContext = extraContext
        ? `${extraContext}\n\n${artifactResolution.contextPrompt}`
        : artifactResolution.contextPrompt;
    }

    // 1. Explicit Web Search Toggle or Research Mode
    if (options?.webSearchActive || mode === "research") {
      options?.onToolStatus?.({
        name: "webSearch",
        label: `Searching the web for "${userInput.slice(0, 35)}..."`,
        status: "running",
      });

      const searchData = await performWebSearch(userInput, signal);
      if (searchData?.results?.length) {
        options?.onSourcesFound?.(searchData.results);
        extraContext = `[REAL-TIME WEB SEARCH RESULTS]\n${searchData.formatted}\n[END SEARCH RESULTS]\nWhen citing these results, reference source numbers like [1], [2].`;
        options?.onToolStatus?.({
          name: "webSearch",
          label: `Retrieved ${searchData.results.length} web sources`,
          status: "completed",
        });
      } else {
        options?.onToolStatus?.(null);
      }
    }

    // 2. Heuristic check: request tool decision if input has tool keywords
    const hasToolKeywords =
      /weather|temp|aqi|pollut|air|news|headlin|time|date|calc|math|eval|expr|locat|ip/i.test(
        userInput
      );

    let toolMessage = null;
    if (hasToolKeywords && !options?.webSearchActive) {
      try {
        toolMessage = await requestToolDecision(
          userInput,
          chat,
          mode,
          options,
          signal
        );
      } catch (err) {
        console.warn("Tool decision check failed, falling back to direct response:", err);
      }
    }

    if (toolMessage?.tool_calls?.length) {
      const toolCall = toolMessage.tool_calls[0];
      const toolName = toolCall.function.name;
      let args = {};
      try {
        args = JSON.parse(toolCall.function.arguments || "{}");
      } catch {
        args = {};
      }

      options?.onToolStatus?.({
        name: toolName,
        label: `Running ${toolName}...`,
        status: "running",
      });

      const toolResult = await runToolByName(toolName, args, signal);

      options?.onToolStatus?.({
        name: toolName,
        label: `Completed ${toolName}`,
        status: "completed",
      });

      return streamTextByCharacter(toolResult, onChunk, signal);
    }

    // 3. Normal streaming response
    return streamModelResponse(
      userInput,
      chat,
      mode,
      options,
      extraContext,
      onChunk,
      signal
    );
  } catch (error: unknown) {
    if (
      (error instanceof Error && error.message === "Stream aborted") ||
      signal.aborted
    ) {
      const abortError = new Error("Aborted");
      abortError.name = "AbortError";
      throw abortError;
    }

    console.error("Stream error in agent:", error);
    throw error;
  }
}
