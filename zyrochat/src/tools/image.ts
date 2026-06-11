export function generateImage(prompt: string) {
  const cleanPrompt = prompt.trim();
  const params = new URLSearchParams({
    width: "1024",
    height: "1024",
    nologo: "true",
    enhance: "true",
    seed: String(Date.now()),
  });

  return `https://image.pollinations.ai/prompt/${encodeURIComponent(
    cleanPrompt
  )}?${params.toString()}`;
}
