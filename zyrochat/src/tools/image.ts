export function generateImage(prompt: string) {
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(
    prompt
  )}`;
  return url;
}
