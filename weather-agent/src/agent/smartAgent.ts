import { getSystemPrompt } from "./SystemPrompt";
import { getToolDefinitions, runToolByName } from "./toolRegistry";
import type { ChatMessage } from "./types";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = "openai/gpt-4o-mini";
const MAX_CONTEXT_MESSAGES = 10;

function getHeaders() {
  return {
    Authorization: `Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY}`,
    "Content-Type": "application/json",
  };
}

function buildMessages(
  chat: ChatMessage[],
  userInput: string,
  mode: string,
  limitToRecent = false
) {
  const history = (limitToRecent ? chat.slice(-MAX_CONTEXT_MESSAGES) : chat).map(
    (message) => ({
      role: message.role === "bot" ? "assistant" : "user",
      content: message.text,
    })
  );

  return [
    { role: "system", content: getSystemPrompt(mode || "normal") },
    ...history,
    { role: "user", content: userInput },
  ];
}

async function streamText(
  text: string,
  onChunk: (chunk: string) => void,
  signal: AbortSignal
) {
  let full = "";

  for (const character of text) {
    if (signal.aborted) return full;
    full += character;
    onChunk(full);
    await new Promise((resolve) => setTimeout(resolve, 5));
  }

  return full;
}

async function requestToolDecision(
  userInput: string,
  chat: ChatMessage[],
  mode: string,
  signal: AbortSignal
) {
  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    signal,
    headers: getHeaders(),
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: buildMessages(chat, userInput, mode, true),
      tools: await getToolDefinitions(signal),
      tool_choice: "auto",
    }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  const message = data?.choices?.[0]?.message;

  if (!message) {
    throw new Error("Invalid API response");
  }

  return message;
}

async function streamModelResponse(
  userInput: string,
  chat: ChatMessage[],
  mode: string,
  onChunk: (chunk: string) => void,
  signal: AbortSignal
) {
  let fullText = "";

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    signal,
    headers: getHeaders(),
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      stream: true,
      messages: buildMessages(chat, userInput, mode),
    }),
  });

  if (!response.ok) {
    throw new Error(`Stream error: ${response.status}`);
  }

  if (!response.body) {
    throw new Error("No response body from stream");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    if (signal.aborted) {
      throw new Error("Stream aborted");
    }

    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const rawLine of lines) {
      const line = rawLine.trim();

      if (!line.startsWith("data:")) continue;

      const json = line.replace("data:", "").trim();

      if (json === "[DONE]") {
        return fullText;
      }

      try {
        const parsed = JSON.parse(json);
        const token = parsed?.choices?.[0]?.delta?.content;

        if (token) {
          fullText += token;
          onChunk(fullText);
        }
      } catch {
        // Ignore partial SSE frames until the next chunk completes them.
      }
    }
  }

  return fullText;
}

export async function runSmartAgentStream(
  userInput: string,
  chat: ChatMessage[],
  mode: string,
  onChunk: (chunk: string) => void,
  signal: AbortSignal
) {
  try {
    const message = await requestToolDecision(userInput, chat, mode, signal);

    if (message.tool_calls?.length) {
      const toolCall = message.tool_calls[0];
      const args = JSON.parse(toolCall.function.arguments || "{}");
      const toolResult = await runToolByName(
        toolCall.function.name,
        args,
        signal
      );

      return streamText(toolResult, onChunk, signal);
    }

    return streamModelResponse(userInput, chat, mode, onChunk, signal);
  } catch (error: any) {
    if (error.message === "Stream aborted" || signal.aborted) {
      const abortError = new Error("Aborted");
      abortError.name = "AbortError";
      throw abortError;
    }

    console.error("Stream error:", error);
    throw error;
  }
}
