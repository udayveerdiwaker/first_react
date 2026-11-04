/**
 * Pollinations AI Image Provider (Flux.1 / SDXL)
 * Provides real AI image generation out-of-the-box without requiring a credit card.
 * Automatically eliminates branding / watermark via smart padding & precision extraction.
 */

const BaseImageProvider = require("./baseProvider");

let sharp = null;
try {
  sharp = require("sharp");
} catch {
  // sharp is optional fallback
}

class PollinationsImageProvider extends BaseImageProvider {
  constructor(defaultModel = "flux") {
    super("pollinations");
    this.defaultModel = defaultModel;
  }

  isConfigured() {
    return true;
  }

  mapAspectRatioToDimensions(aspectRatio) {
    switch (aspectRatio) {
      case "16:9":
        return { width: 1280, height: 720 };
      case "9:16":
        return { width: 720, height: 1280 };
      case "4:3":
        return { width: 1024, height: 768 };
      case "1:1":
      default:
        return { width: 1024, height: 1024 };
    }
  }

  async generate(options) {
    const {
      prompt,
      aspectRatio = "1:1",
      model,
      signal,
    } = options;

    if (!prompt || !prompt.trim()) {
      throw new Error("Prompt is required for image generation");
    }

    const { width, height } = this.mapAspectRatioToDimensions(aspectRatio);
    const seed = Math.floor(Math.random() * 1000000);
    const encodedPrompt = encodeURIComponent(prompt.trim());

    // Allocate extra bottom margin where the watermark is placed, so sharp can cleanly crop it away
    const extraBottomPadding = sharp ? 48 : 0;
    const requestHeight = height + extraBottomPadding;

    const apiKey = process.env.POLLINATIONS_API_KEY;
    const headers = {};
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    // Primary request: clean endpoint with width, requestHeight, seed, nologo, and nofeed
    let url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${requestHeight}&seed=${seed}&nologo=true&nofeed=true`;
    if (apiKey) {
      url += `&key=${encodeURIComponent(apiKey)}`;
    }
    if (model && model !== "default" && model !== "flux") {
      url += `&model=${encodeURIComponent(model)}`;
    }

    let res;
    try {
      res = await fetch(url, { method: "GET", headers, signal });
    } catch (fetchErr) {
      // Fallback
    }

    if (!res || !res.ok) {
      // Secondary fallback without seed
      const fallbackUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${requestHeight}&nologo=true&nofeed=true`;
      res = await fetch(fallbackUrl, { method: "GET", headers, signal });
    }

    if (!res.ok) {
      throw new Error(
        `Pollinations AI returned status ${res.status}: ${res.statusText}`
      );
    }

    const arrayBuffer = await res.arrayBuffer();
    const rawBuffer = Buffer.from(arrayBuffer);
    const contentType = res.headers.get("content-type") || "image/jpeg";

    // Precision extraction: cleanly crop off the bottom margin containing the watermark
    let cleanBuffer = rawBuffer;
    if (sharp) {
      try {
        const meta = await sharp(rawBuffer).metadata();
        const actualW = meta.width || width;
        const actualH = meta.height || requestHeight;

        if (extraBottomPadding > 0 && actualH > extraBottomPadding + 50) {
          cleanBuffer = await sharp(rawBuffer)
            .extract({
              left: 0,
              top: 0,
              width: actualW,
              height: actualH - extraBottomPadding,
            })
            .jpeg({ quality: 95 })
            .toBuffer();
        }
      } catch (cropErr) {
        console.warn("[Pollinations Watermark Crop Fallback]:", cropErr.message);
        cleanBuffer = rawBuffer;
      }
    }

    return {
      buffer: cleanBuffer,
      mimeType: contentType.includes("png") ? "image/png" : "image/jpeg",
      revisedPrompt: prompt,
      width,
      height,
      providerModel: `pollinations-${model || this.defaultModel}`,
    };
  }
}

module.exports = PollinationsImageProvider;
