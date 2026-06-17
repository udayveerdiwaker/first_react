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
  
  let buffer = "";            // Temporary holding container for incomplete JSON lines
  let targetText = "";        // The full text we have received from the server so far
  let displayedText = "";     // The text currently typed out and shown on the screen
  let isStreamFinished = false; // Flag indicating if the network connection has finished

  // 4. Background typing loop: Interpolates the text output to make it look smooth like ChatGPT
  const typingPromise = (async () => {
    while (true) {
      if (signal.aborted) {
        throw new Error("Stream aborted");
      }

      // Calculate how many characters are waiting in the queue to be typed
      const diff = targetText.length - displayedText.length;

      if (diff > 0) {
        // Adjust typing speed dynamically based on how far behind the stream we are.
        // If we have a huge burst of text, type faster (up to 5 characters per step) to catch up.
        // Otherwise, type 1 character per step for a smooth animation.
        const charsToType = diff > 40 ? 5 : diff > 15 ? 2 : 1;
        displayedText += targetText.substring(displayedText.length, displayedText.length + charsToType);
        
        // Notify the chat UI with the newly updated text
        onChunk(displayedText);
      } else if (isStreamFinished) {
        // If the server stopped sending data and we finished typing all letters, exit
        break;
      }

      // 15ms step duration for a steady 60fps-like fluid typing animation
      await new Promise((resolve) => setTimeout(resolve, 15));
    }
  })();

  try {
    // 5. Main network loop: Reads incoming stream chunks from the server
    while (true) {
      if (signal.aborted) {
        throw new Error("Stream aborted");
      }

      const { done, value } = await reader.read();
      if (done) break;

      // Append raw decoded text to the line buffer
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      // Parse each completed line
      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) continue;

        // Parse standard SSE chunks (data: ...)
        if (line.startsWith("data:")) {
          const json = line.replace("data:", "").trim();
          if (json === "[DONE]") {
            break;
          }

          try {
            const parsed = JSON.parse(json);
            const token = parsed?.choices?.[0]?.delta?.content;
            if (token) {
              targetText += token; // Feed characters into the typewriter queue
            }
          } catch {
            // Ignore incomplete frames
          }
          continue;
        }

        // Parse legacy Vercel AI SDK chunks (0:...)
        if (line.startsWith("0:")) {
          const json = line.replace("0:", "").trim();
          try {
            const token = JSON.parse(json);
            if (typeof token === "string") {
              targetText += token; // Feed characters into the typewriter queue
            }
          } catch {
            // Ignore incomplete frames
          }
          continue;
        }
      }
    }

    // Mark that the server is done sending data
    isStreamFinished = true;
    
    // Wait for the background typewriter loop to finish typing out all the remaining buffered characters
    await typingPromise;
  } finally {
    isStreamFinished = true;
    reader.releaseLock();
  }

  // Return the completed target text
  return targetText;
}
