/**
 * OpenAI DALL-E 3 / DALL-E 2 Image Provider
 */

const BaseImageProvider = require("./baseProvider");

class OpenAIImageProvider extends BaseImageProvider {
  constructor(apiKey, defaultModel = "dall-e-3") {
    super("openai");
    this.apiKey = apiKey || process.env.IMAGE_PROVIDER_API_KEY || process.env.OPENAI_API_KEY;
    this.defaultModel = defaultModel;
  }

  isConfigured() {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  mapAspectRatioToSize(aspectRatio, model) {
    if (model === "dall-e-2") {
      return { size: "1024x1024", width: 1024, height: 1024 };
    }

    switch (aspectRatio) {
      case "16:9":
        return { size: "1792x1024", width: 1792, height: 1024 };
      case "9:16":
        return { size: "1024x1792", width: 1024, height: 1792 };
      case "4:3":
        return { size: "1024x1024", width: 1024, height: 1024 };
      case "1:1":
      default:
        return { size: "1024x1024", width: 1024, height: 1024 };
    }
  }

  async generate(options) {
    if (!this.isConfigured()) {
      throw new Error(
        "OpenAI Image Provider requires OPENAI_API_KEY or IMAGE_PROVIDER_API_KEY to be set in backend/.env"
      );
    }

    const {
      prompt,
      aspectRatio = "1:1",
      quality = "standard",
      style = "vivid",
      model = this.defaultModel,
      signal,
    } = options;

    const { size, width, height } = this.mapAspectRatioToSize(aspectRatio, model);

    const payload = {
      model,
      prompt,
      n: 1,
      size,
      response_format: "b64_json",
    };

    if (model === "dall-e-3") {
      payload.quality = quality === "hd" ? "hd" : "standard";
      payload.style = style === "natural" ? "natural" : "vivid";
    }

    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal,
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => null);
      const errMsg =
        errBody?.error?.message ||
        `OpenAI Image API returned status ${res.status}: ${res.statusText}`;
      throw new Error(errMsg);
    }

    const data = await res.json();
    const item = data?.data?.[0];
    if (!item || !item.b64_json) {
      throw new Error("OpenAI did not return image data in the expected format");
    }

    const buffer = Buffer.from(item.b64_json, "base64");
    return {
      buffer,
      mimeType: "image/png",
      revisedPrompt: item.revised_prompt || prompt,
      width,
      height,
      providerModel: model,
    };
  }
}

module.exports = OpenAIImageProvider;
