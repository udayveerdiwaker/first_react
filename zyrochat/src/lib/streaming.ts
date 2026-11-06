// 1. This defines the callback function type to update the chat window in real-time.
export type StreamChunkCallback = (text: string) => void;

/**
 * 2. Helper to simulate typewriter-style streaming of static text.
 */
export async function streamTextByCharacter(
  text: string,
  onChunk: StreamChunkCallback,
  signal: AbortSignal
) {
  let fullText = "";

  for (const character of text) {
    if (signal.aborted) return fullText;

    fullText += character;
    onChunk(fullText);

    // Smooth typing delay (5 milliseconds per character)
    await new Promise((resolve) => setTimeout(resolve, 5));
  }

  return fullText;
}

/**
 * 3. Handles real-time streaming from the backend using a ChatGPT-style smooth typewriter queue.
 * Instead of dumping text chunks instantly, it buffers them and types them out at a smooth, constant pace.
 */
export async function streamOpenRouterText(
  body: ReadableStream<Uint8Array>,
  onChunk: StreamChunkCallback,
  signal: AbortSignal
) {
  const reader = body.getReader();
  const decoder = new TextDecoder("utf-8");

  const isSmooth =
    localStorage.getItem("zyrochat-smooth-stream") !== "false" &&
    localStorage.getItem("app-smooth-stream") !== "false";

  let buffer = ""; // Temporary holding container for incomplete JSON lines
  let targetText = ""; // The full text we have received from the server so far
  let reasoningText = ""; // Reasoning thoughts emitted by models (Nemotron, DeepSeek, etc.)
  let displayedText = ""; // The text currently typed out and shown on the screen
  let isStreamFinished = false; // Flag indicating if the network connection has finished

  // Background typing loop (only active if smooth streaming is enabled)
  const typingPromise = isSmooth
    ? (async () => {
        while (!signal.aborted) {
          const diff = targetText.length - displayedText.length;

          if (diff > 0) {
            const charsToType = diff > 40 ? 6 : diff > 15 ? 2 : 1;
            displayedText += targetText.substring(
              displayedText.length,
              displayedText.length + charsToType
            );
            onChunk(displayedText);
          } else if (isStreamFinished) {
            break;
          }

          // Constant typing pace (15 milliseconds per tick)
          await new Promise((resolve) => setTimeout(resolve, 15));
        }
      })()
    : null;

  try {
    while (!signal.aborted) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const rawLine of lines) {
        const line = rawLine.trim();
        // Skip empty lines and SSE comments (e.g. ": OPENROUTER PROCESSING")
        if (!line || line.startsWith(":")) continue;

        if (line.startsWith("data:")) {
          const json = line.replace("data:", "").trim();
          if (json === "[DONE]") break;

          try {
            const parsed = JSON.parse(json);
            const delta = parsed?.choices?.[0]?.delta;
            const content = delta?.content || "";
            const reasoning =
              delta?.reasoning ||
              delta?.reasoning_content ||
              delta?.reasoning_details?.[0]?.text ||
              "";

            if (content) {
              targetText += content;
              if (!isSmooth) {
                onChunk(targetText);
              }
            } else if (reasoning) {
              reasoningText += reasoning;
              // If main content has not started yet, show live thinking preview so user sees instant activity
              if (!targetText) {
                const preview = reasoningText.slice(-140).replace(/\r?\n/g, " ").trim();
                onChunk(`*Thinking...*\n\n> ${preview}...`);
              }
            }
          } catch {
            // Ignore incomplete frames
          }
          continue;
        }

        if (line.startsWith("0:")) {
          const json = line.replace("0:", "").trim();
          try {
            const token = JSON.parse(json);
            if (typeof token === "string") {
              targetText += token;
              if (!isSmooth) {
                onChunk(targetText);
              }
            }
          } catch {
            // Ignore incomplete frames
          }
          continue;
        }
      }
    }

    isStreamFinished = true;
    if (typingPromise) {
      await typingPromise;
    }
  } finally {
    isStreamFinished = true;
    try {
      reader.releaseLock();
    } catch {
      // Reader lock may already be released
    }
  }

  // If the model generated reasoning thoughts but no explicit content, use reasoning output
  if (!targetText.trim() && reasoningText.trim()) {
    targetText = reasoningText;
  }

  // Final chunk sync to guarantee entire text is rendered
  onChunk(targetText);
  return targetText;
}
