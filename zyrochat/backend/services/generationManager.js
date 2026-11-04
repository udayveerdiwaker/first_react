/**
 * Generation Manager Service for ZyroChat
 * 
 * Provides:
 * 1. Active in-memory generation registry with token buffering
 * 2. Seamless client stream reconnection on page reload (catchup + live SSE)
 * 3. Disconnect grace period (60s) allowing upstream to keep buffering while browser reloads
 * 4. DB message status synchronization ('pending', 'streaming', 'completed', 'interrupted', 'cancelled')
 * 5. Idempotency to prevent duplicate AI generations on rapid retries
 */

const db = require("../db");

class GenerationManager {
  constructor() {
    this.activeGenerations = new Map();
    this.DISCONNECT_GRACE_MS = 60000; // 60 seconds
  }

  /**
   * Generates a unique generation ID
   */
  createGenerationId() {
    return `gen-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  /**
   * Starts or resumes a generation job
   */
  startGeneration({
    generationId,
    conversationId,
    userMessageId,
    assistantMessageId,
    userId,
    prompt,
    mode,
    abortController,
  }) {
    const id = generationId || this.createGenerationId();

    // Check for existing generation (Idempotency)
    const existing = this.activeGenerations.get(id);
    if (existing && (existing.status === "streaming" || existing.status === "pending")) {
      return existing;
    }

    // Check if another generation is currently running for this conversation
    for (const [, gen] of this.activeGenerations.entries()) {
      if (
        gen.conversationId === conversationId &&
        gen.id !== id &&
        (gen.status === "streaming" || gen.status === "pending")
      ) {
        // Cancel the older generation to prevent race conditions
        this.cancelGeneration(gen.id);
      }
    }

    const now = Date.now();
    const generation = {
      id,
      conversationId: conversationId || "conv-default",
      userMessageId: userMessageId || `usr-msg-${now}`,
      assistantMessageId: assistantMessageId || `bot-msg-${now}`,
      userId: userId || "usr-admin",
      status: "streaming",
      prompt: prompt || "",
      mode: mode || "normal",
      bufferedText: "",
      sources: [],
      createdAt: now,
      updatedAt: now,
      abortController: abortController || new AbortController(),
      subscribers: new Set(),
      disconnectTimeout: null,
    };

    this.activeGenerations.set(id, generation);

    // Persist/update generation record in DB
    try {
      const existingDbGen = db.table("generations").findById(id);
      if (existingDbGen) {
        db.table("generations").update(id, {
          status: "streaming",
          partialText: "",
          updatedAt: now,
        });
      } else {
        db.table("generations").insert({
          id,
          conversationId: generation.conversationId,
          userMessageId: generation.userMessageId,
          assistantMessageId: generation.assistantMessageId,
          status: "streaming",
          prompt: generation.prompt,
          mode: generation.mode,
          partialText: "",
          error: "",
          createdAt: now,
          updatedAt: now,
        });
      }

      // Ensure assistant message exists in DB with streaming status
      const existingBotMsg = db.table("messages").findById(generation.assistantMessageId);
      if (existingBotMsg) {
        db.table("messages").update(generation.assistantMessageId, {
          status: "streaming",
          text: "",
          generationId: id,
          updatedAt: now,
        });
      } else {
        db.table("messages").insert({
          id: generation.assistantMessageId,
          conversationId: generation.conversationId,
          role: "bot",
          text: "",
          status: "streaming",
          generationId: id,
          sources: [],
          attachments: [],
          createdAt: now,
          updatedAt: now,
        });
      }
    } catch (dbErr) {
      console.error("Failed to persist generation initiation to DB:", dbErr);
    }

    return generation;
  }

  /**
   * Appends streamed chunk, buffers it, and forwards to connected subscribers
   */
  appendChunk(generationId, chunkText) {
    const gen = this.activeGenerations.get(generationId);
    if (!gen) return;

    gen.bufferedText += chunkText;
    gen.updatedAt = Date.now();

    // Broadcast to active SSE listeners
    const payload = `data: ${JSON.stringify({
      type: "chunk",
      generationId,
      chunk: chunkText,
      fullText: gen.bufferedText,
      status: gen.status,
    })}\n\n`;

    for (const res of gen.subscribers) {
      try {
        if (!res.writableEnded) {
          res.write(payload);
        }
      } catch (err) {
        gen.subscribers.delete(res);
      }
    }
  }

  /**
   * Sets sources / citations found during generation
   */
  setSources(generationId, sources = []) {
    const gen = this.activeGenerations.get(generationId);
    if (!gen) return;

    gen.sources = sources;
    const payload = `data: ${JSON.stringify({
      type: "sources",
      generationId,
      sources,
    })}\n\n`;

    for (const res of gen.subscribers) {
      try {
        if (!res.writableEnded) {
          res.write(payload);
        }
      } catch {
        gen.subscribers.delete(res);
      }
    }
  }

  /**
   * Marks generation as successfully completed and persists final text
   */
  completeGeneration(generationId) {
    const gen = this.activeGenerations.get(generationId);
    if (!gen) return;

    if (gen.disconnectTimeout) {
      clearTimeout(gen.disconnectTimeout);
      gen.disconnectTimeout = null;
    }

    gen.status = "completed";
    gen.updatedAt = Date.now();

    // Persist to DB
    try {
      db.table("generations").update(generationId, {
        status: "completed",
        partialText: gen.bufferedText,
        updatedAt: gen.updatedAt,
      });

      db.table("messages").update(gen.assistantMessageId, {
        status: "completed",
        text: gen.bufferedText,
        sources: gen.sources,
        updatedAt: gen.updatedAt,
      });

      // Update conversation updatedAt
      db.table("conversations").update(gen.conversationId, {
        updatedAt: gen.updatedAt,
      });
    } catch (err) {
      console.error("Failed to commit completed generation to DB:", err);
    }

    // Broadcast done event
    const payload = `data: ${JSON.stringify({
      type: "done",
      generationId,
      text: gen.bufferedText,
      sources: gen.sources,
      status: "completed",
    })}\n\n`;

    for (const res of gen.subscribers) {
      try {
        if (!res.writableEnded) {
          res.write(payload);
          res.end();
        }
      } catch {}
    }
    gen.subscribers.clear();

    // Keep in cache for 30 seconds for quick reload verification, then purge
    setTimeout(() => {
      this.activeGenerations.delete(generationId);
    }, 30000);
  }

  /**
   * Handles upstream or network error
   */
  failGeneration(generationId, errorMsg) {
    const gen = this.activeGenerations.get(generationId);
    if (!gen) return;

    if (gen.disconnectTimeout) {
      clearTimeout(gen.disconnectTimeout);
      gen.disconnectTimeout = null;
    }

    gen.status = "interrupted";
    gen.updatedAt = Date.now();

    try {
      db.table("generations").update(generationId, {
        status: "interrupted",
        partialText: gen.bufferedText,
        error: errorMsg || "Upstream generation interrupted",
        updatedAt: gen.updatedAt,
      });

      db.table("messages").update(gen.assistantMessageId, {
        status: "interrupted",
        text: gen.bufferedText || "Response interrupted.",
        error: errorMsg || "Generation interrupted",
        updatedAt: gen.updatedAt,
      });
    } catch (err) {
      console.error("Failed to commit interrupted generation to DB:", err);
    }

    const payload = `data: ${JSON.stringify({
      type: "interrupted",
      generationId,
      text: gen.bufferedText,
      error: errorMsg || "Response interrupted.",
      status: "interrupted",
    })}\n\n`;

    for (const res of gen.subscribers) {
      try {
        if (!res.writableEnded) {
          res.write(payload);
          res.end();
        }
      } catch {}
    }
    gen.subscribers.clear();

    setTimeout(() => {
      this.activeGenerations.delete(generationId);
    }, 30000);
  }

  /**
   * Cancels generation upon user clicking 'Stop'
   */
  cancelGeneration(generationId) {
    const gen = this.activeGenerations.get(generationId);
    if (!gen) return;

    if (gen.disconnectTimeout) {
      clearTimeout(gen.disconnectTimeout);
      gen.disconnectTimeout = null;
    }

    gen.status = "cancelled";
    gen.updatedAt = Date.now();

    try {
      gen.abortController?.abort();
    } catch {}

    try {
      db.table("generations").update(generationId, {
        status: "cancelled",
        partialText: gen.bufferedText,
        updatedAt: gen.updatedAt,
      });

      db.table("messages").update(gen.assistantMessageId, {
        status: "cancelled",
        text: gen.bufferedText,
        updatedAt: gen.updatedAt,
      });
    } catch (err) {
      console.error("Failed to commit cancelled generation to DB:", err);
    }

    const payload = `data: ${JSON.stringify({
      type: "cancelled",
      generationId,
      text: gen.bufferedText,
      status: "cancelled",
    })}\n\n`;

    for (const res of gen.subscribers) {
      try {
        if (!res.writableEnded) {
          res.write(payload);
          res.end();
        }
      } catch {}
    }
    gen.subscribers.clear();

    setTimeout(() => {
      this.activeGenerations.delete(generationId);
    }, 15000);
  }

  /**
   * Subscribes an SSE HTTP response to a generation
   */
  subscribe(generationId, res) {
    const gen = this.activeGenerations.get(generationId);
    if (!gen) return false;

    // Clear disconnect timer if a client has reconnected
    if (gen.disconnectTimeout) {
      clearTimeout(gen.disconnectTimeout);
      gen.disconnectTimeout = null;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Immediately send catch-up payload with all buffered text so far
    const catchup = `data: ${JSON.stringify({
      type: "catchup",
      generationId: gen.id,
      conversationId: gen.conversationId,
      userMessageId: gen.userMessageId,
      assistantMessageId: gen.assistantMessageId,
      status: gen.status,
      text: gen.bufferedText,
      sources: gen.sources,
    })}\n\n`;

    res.write(catchup);

    // If already finished, end response immediately
    if (gen.status === "completed" || gen.status === "interrupted" || gen.status === "cancelled") {
      res.end();
      return true;
    }

    gen.subscribers.add(res);

    // Handle client disconnect during stream
    res.on("close", () => {
      gen.subscribers.delete(res);

      // If no listeners remain and still streaming, start disconnect grace timer
      if (gen.subscribers.size === 0 && gen.status === "streaming" && !gen.disconnectTimeout) {
        gen.disconnectTimeout = setTimeout(() => {
          if (gen.subscribers.size === 0 && gen.status === "streaming") {
            // After 60s with zero subscribers, cancel upstream to save resources
            this.failGeneration(generationId, "Client disconnected and did not reconnect within grace period");
          }
        }, this.DISCONNECT_GRACE_MS);
      }
    });

    return true;
  }

  /**
   * Retrieves active generation for a given conversation ID
   */
  getActiveForConversation(conversationId) {
    if (!conversationId) return null;

    for (const [, gen] of this.activeGenerations.entries()) {
      if (
        gen.conversationId === conversationId &&
        (gen.status === "streaming" || gen.status === "pending")
      ) {
        return {
          id: gen.id,
          conversationId: gen.conversationId,
          userMessageId: gen.userMessageId,
          assistantMessageId: gen.assistantMessageId,
          status: gen.status,
          bufferedText: gen.bufferedText,
          sources: gen.sources,
          createdAt: gen.createdAt,
          updatedAt: gen.updatedAt,
        };
      }
    }

    // Check DB for any recently interrupted or streaming generation
    try {
      const recentGen = db
        .table("generations")
        .find({ conversationId })
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0];

      if (recentGen && (recentGen.status === "streaming" || recentGen.status === "pending")) {
        // If it was left streaming in DB but not in active memory (e.g. server restart), mark interrupted
        db.table("generations").update(recentGen.id, {
          status: "interrupted",
          updatedAt: Date.now(),
        });
        recentGen.status = "interrupted";
      }

      return recentGen || null;
    } catch {
      return null;
    }
  }

  /**
   * Retrieves generation by ID
   */
  getGeneration(generationId) {
    const active = this.activeGenerations.get(generationId);
    if (active) {
      return {
        id: active.id,
        conversationId: active.conversationId,
        userMessageId: active.userMessageId,
        assistantMessageId: active.assistantMessageId,
        status: active.status,
        bufferedText: active.bufferedText,
        sources: active.sources,
        createdAt: active.createdAt,
        updatedAt: active.updatedAt,
      };
    }
    return db.table("generations").findById(generationId);
  }
}

const generationManager = new GenerationManager();
module.exports = generationManager;
