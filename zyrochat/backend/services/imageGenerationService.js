/**
 * Image Generation Service
 * Orchestrates provider abstraction, disk persistence, database records, and idempotency.
 */

const fs = require("fs");
const path = require("path");
const db = require("../db");
const OpenAIImageProvider = require("./imageProviders/openAIProvider");
const PollinationsImageProvider = require("./imageProviders/pollinationsProvider");

class ImageGenerationService {
  constructor() {
    this.storageDir = path.join(__dirname, "..", "data", "generated_images");
    fs.mkdirSync(this.storageDir, { recursive: true });

    this.activeJobs = new Map();
    this.activeControllers = new Map();
    this.initProviders();
  }

  initProviders() {
    const openAiKey = process.env.IMAGE_PROVIDER_API_KEY || process.env.OPENAI_API_KEY;
    this.providers = {
      openai: new OpenAIImageProvider(openAiKey, process.env.IMAGE_MODEL || "dall-e-3"),
      pollinations: new PollinationsImageProvider(process.env.IMAGE_MODEL || "flux"),
    };

    // Determine active provider
    const requested = (process.env.IMAGE_PROVIDER || "").toLowerCase().trim();
    if (requested && this.providers[requested]) {
      this.activeProviderName = requested;
    } else if (openAiKey && openAiKey.trim().length > 0) {
      this.activeProviderName = "openai";
    } else {
      this.activeProviderName = "pollinations";
    }
  }

  getActiveProvider() {
    // Re-check environment variable dynamically in case .env updated
    const requested = (process.env.IMAGE_PROVIDER || "").toLowerCase().trim();
    if (requested && this.providers[requested]) {
      return this.providers[requested];
    }
    return this.providers[this.activeProviderName] || this.providers.pollinations;
  }

  getConfig() {
    const provider = this.getActiveProvider();
    const ratios = provider.getSupportedAspectRatios();
    return {
      provider: provider.getName(),
      isConfigured: provider.isConfigured(),
      supportedAspectRatios: ratios,
      aspectRatios: ratios,
      defaultModel: provider.defaultModel || "flux",
    };
  }

  /**
   * Generates an image with idempotency, disk storage, and DB persistence
   */
  async generateImage({
    prompt,
    aspectRatio = "1:1",
    quality = "standard",
    style = "vivid",
    model,
    userId = "usr-admin",
    conversationId,
    messageId,
    generationId,
  }) {
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      throw new Error("Prompt is required for image generation");
    }

    if (prompt.trim().length > 2000) {
      throw new Error("Prompt exceeds maximum length of 2000 characters");
    }

    const genKey = generationId || `imggen-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    // Idempotency check: if existing generation is already completed in DB
    const existingInDb = db.table("image_generations").findOne({ generationId: genKey });
    if (existingInDb && existingInDb.status === "completed") {
      return existingInDb;
    }

    // Idempotency check: in-flight generation
    if (this.activeJobs.has(genKey)) {
      return this.activeJobs.get(genKey);
    }

    const imageId = `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = Date.now();

    // Initial DB record
    const initialRecord = {
      id: imageId,
      userId,
      workspaceId: "ws-default",
      conversationId: conversationId || null,
      messageId: messageId || null,
      generationId: genKey,
      provider: this.getActiveProvider().getName(),
      model: model || this.getActiveProvider().defaultModel || "flux",
      prompt: prompt.trim(),
      revisedPrompt: null,
      aspectRatio,
      quality,
      style,
      status: "generating",
      imageUrl: null,
      localPath: null,
      mimeType: null,
      width: null,
      height: null,
      fileSize: null,
      error: null,
      createdAt: now,
      completedAt: null,
    };

    db.table("image_generations").insert(initialRecord);

    const controller = new AbortController();
    this.activeControllers.set(genKey, controller);
    this.activeControllers.set(imageId, controller);

    const jobPromise = (async () => {
      try {
        const provider = this.getActiveProvider();
        const result = await provider.generate({
          prompt: prompt.trim(),
          aspectRatio,
          quality,
          style,
          model,
          signal: controller.signal,
        });

        const ext = result.mimeType === "image/png" ? "png" : "jpg";
        const filename = `${imageId}.${ext}`;
        const filePath = path.join(this.storageDir, filename);

        // Persist binary file to server disk
        await fs.promises.writeFile(filePath, result.buffer);

        const localUrl = `/api/images/files/${filename}`;
        const completedAt = Date.now();

        const updatedRecord = db.table("image_generations").update(imageId, {
          status: "completed",
          imageUrl: localUrl,
          localPath: filePath,
          mimeType: result.mimeType,
          revisedPrompt: result.revisedPrompt || prompt.trim(),
          width: result.width,
          height: result.height,
          fileSize: result.buffer.length,
          completedAt,
        });

        // Sync with messages table if messageId provided
        if (messageId) {
          const existingMsg = db.table("messages").findById(messageId);
          if (existingMsg) {
            db.table("messages").update(messageId, {
              status: "completed",
              imageGeneration: updatedRecord,
              updatedAt: completedAt,
            });
          }
        }

        return updatedRecord;
      } catch (err) {
        const isCancelled = controller.signal.aborted || err?.name === "AbortError";
        const finalStatus = isCancelled ? "cancelled" : "failed";
        const errMsg = isCancelled
          ? "Image generation cancelled by user"
          : err?.message || "Image generation failed";

        const updatedRecord = db.table("image_generations").update(imageId, {
          status: finalStatus,
          error: errMsg,
          completedAt: Date.now(),
        });

        if (messageId) {
          const existingMsg = db.table("messages").findById(messageId);
          if (existingMsg) {
            db.table("messages").update(messageId, {
              status: finalStatus,
              error: errMsg,
              updatedAt: Date.now(),
            });
          }
        }

        if (isCancelled) {
          return updatedRecord;
        }
        throw err;
      } finally {
        this.activeJobs.delete(genKey);
        this.activeControllers.delete(genKey);
        this.activeControllers.delete(imageId);
      }
    })();

    this.activeJobs.set(genKey, jobPromise);
    return jobPromise;
  }

  cancelJob(idOrGenKey) {
    let controller = this.activeControllers.get(idOrGenKey);
    const record = this.getImageStatus(idOrGenKey);
    if (!controller && record) {
      controller =
        this.activeControllers.get(record.id) ||
        this.activeControllers.get(record.generationId);
    }

    if (controller) {
      try {
        controller.abort();
      } catch {
        // Ignore already aborted
      }
      this.activeControllers.delete(idOrGenKey);
      if (record?.id) this.activeControllers.delete(record.id);
      if (record?.generationId) this.activeControllers.delete(record.generationId);
    }

    if (record && record.status !== "completed") {
      const updated = db.table("image_generations").update(record.id, {
        status: "cancelled",
        error: "Image generation cancelled by user",
        completedAt: Date.now(),
      });

      if (record.messageId) {
        db.table("messages").update(record.messageId, {
          status: "cancelled",
          error: false,
          updatedAt: Date.now(),
        });
      }
      return { success: true, message: "Image generation cancelled", record: updated };
    }

    return { success: true, message: "Job cancelled or already finalized", record };
  }

  getImageStatus(id) {
    const record =
      db.table("image_generations").findById(id) ||
      db.table("image_generations").findOne({ generationId: id });
    return record || null;
  }

  getSafeFilePath(filename) {
    const safeName = path.basename(filename);
    const resolvedPath = path.join(this.storageDir, safeName);
    if (!resolvedPath.startsWith(this.storageDir)) {
      throw new Error("Invalid file path");
    }
    if (!fs.existsSync(resolvedPath)) {
      return null;
    }
    return resolvedPath;
  }
}

// Export singleton instance
const imageGenerationService = new ImageGenerationService();
module.exports = imageGenerationService;
