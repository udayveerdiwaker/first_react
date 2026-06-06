export type StreamChunkCallback = (text: string) => void;

const TYPEWRITER_DELAY_MS = 5;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

    await wait(TYPEWRITER_DELAY_MS);
  }

  return fullText;
}

export async function streamOpenRouterText(
  body: ReadableStream<Uint8Array>,
  onChunk: StreamChunkCallback,
  signal: AbortSignal
) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";

  while (true) {
    if (signal.aborted) {
      throw new Error("Stream aborted");
    }

    const { done, value } = await reader.read();
    if (done) return fullText;

    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line.startsWith("data:")) continue;

      const json = line.replace("data:", "").trim();
      if (json === "[DONE]") return fullText;

      try {
        const parsed = JSON.parse(json);
        const token = parsed?.choices?.[0]?.delta?.content;

        if (token) {
          fullText += token;
          onChunk(fullText);
        }
      } catch {
        // Ignore incomplete stream frames. The next chunk should complete them.
      }
    }
  }
}
