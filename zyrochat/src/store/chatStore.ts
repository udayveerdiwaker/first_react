/**
 * Normalizes chat data to ensure consistency.
 *
 * This function:
 * 1. Takes an array of chats (which might be empty or have incomplete data)
 * 2. Ensures each chat has a title (uses "New Chat" as fallback)
 * 3. Ensures each chat has an updatedAt timestamp (uses current time if missing)
 * 4. Returns a normalized array safe for storage and display
 *
 * This prevents bugs where undefined values cause issues elsewhere in the code.
 *
 * @param chats - Array of chat objects (may be undefined or empty)
 * @returns Normalized array where all chats have title and updatedAt
 */
function normalizeChats(chats: any[] = []) {
  return chats.map((chat) => ({
    ...chat,
    title: chat.title || "New Chat",
    updatedAt: typeof chat.updatedAt === "number" ? chat.updatedAt : Date.now(),
  }));
}

/**
 * Retrieves all saved chats from browser localStorage safely.
 * Handles corrupt data or parse errors without crashing the app.
 *
 * @returns Array of all saved chat objects
 */
export function getChats() {
  try {
    const raw = localStorage.getItem("chats");
    if (!raw) return [];
    const chats = JSON.parse(raw);
    return Array.isArray(chats) ? normalizeChats(chats) : [];
  } catch (err) {
    console.warn("Failed to read chats from localStorage (corrupt data?):", err);
    return [];
  }
}

/**
 * Strips massive data URLs or payload bloat from attachments to prevent QuotaExceededError.
 */
function sanitizeChatsForStorage(chats: any[]): any[] {
  return chats.map((chat) => ({
    ...chat,
    messages: (chat.messages || []).map((msg: any) => ({
      ...msg,
      attachments: (msg.attachments || []).map((att: any) => ({
        name: att.name,
        size: att.size,
        type: att.type,
        lineCount: att.lineCount,
        // Retain text content up to 10k chars, drop massive base64 strings
        content: att.content ? att.content.slice(0, 10000) : undefined,
        url: att.url && att.url.length < 50000 ? att.url : undefined,
      })),
    })),
  }));
}

/**
 * Saves all chats to browser localStorage with quota management.
 * Automatically recovers from QuotaExceededError by trimming bloated binary data.
 *
 * @param chats - Array of chat objects to save
 */
export function saveChats(chats: any) {
  const normalized = normalizeChats(chats);

  try {
    localStorage.setItem("chats", JSON.stringify(normalized));
  } catch (err: any) {
    // Quota exceeded: retry with sanitized attachments
    if (
      err?.name === "QuotaExceededError" ||
      err?.code === 22 ||
      err?.code === 1014
    ) {
      console.warn("LocalStorage quota exceeded. Sanitizing attachment data to preserve chats...");
      try {
        const sanitized = sanitizeChatsForStorage(normalized);
        localStorage.setItem("chats", JSON.stringify(sanitized));
      } catch (retryErr) {
        // Extreme fallback: retain only the latest 50 conversations
        console.error("Critical storage limit reached. Retaining recent 50 chats.", retryErr);
        try {
          const recentChats = sanitizeChatsForStorage(normalized.slice(0, 50));
          localStorage.setItem("chats", JSON.stringify(recentChats));
        } catch (finalErr) {
          console.error("Unable to persist to localStorage:", finalErr);
        }
      }
    } else {
      console.error("Failed to save chats to localStorage:", err);
    }
  }
}

const BACKEND_BASE = (
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_BACKEND_URL) ||
  "http://localhost:5000"
).replace(/\/$/, "");

/**
 * Conversation-scoped draft management
 */
export function getConversationDraft(conversationId?: string | null): string {
  if (typeof window === "undefined" || !window.localStorage) return "";
  try {
    const key = conversationId ? `zyrochat-draft-${conversationId}` : "zyrochat-draft-new";
    return localStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

export function saveConversationDraft(
  conversationId: string | null | undefined,
  text: string
): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const key = conversationId ? `zyrochat-draft-${conversationId}` : "zyrochat-draft-new";
    if (text.trim()) {
      localStorage.setItem(key, text);
    } else {
      localStorage.removeItem(key);
    }
  } catch {}
}

export function clearConversationDraft(conversationId?: string | null): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const key = conversationId ? `zyrochat-draft-${conversationId}` : "zyrochat-draft-new";
    localStorage.removeItem(key);
    // Also clean up legacy single key if present
    localStorage.removeItem("zyrochat-composer-draft");
  } catch {}
}

/**
 * Persists a message immediately to the backend DB
 */
export async function saveMessageToServer(msg: {
  id?: string;
  conversationId: string;
  role: string;
  text: string;
  status?: string;
  generationId?: string;
  requestId?: string;
  sources?: any[];
  attachments?: any[];
  hour?: string;
  timezone?: string;
  imageGeneration?: any;
}): Promise<any> {
  try {
    const res = await fetch(`${BACKEND_BASE}/api/chat/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(msg),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.message || null;
  } catch (err) {
    console.warn("Failed to persist message to server DB (offline?):", err);
    return null;
  }
}

/**
 * Calls backend image generation API
 */
export async function generateImageApi(
  payload: {
    prompt: string;
    aspectRatio?: string;
    quality?: string;
    style?: string;
    model?: string;
    conversationId?: string;
    messageId?: string;
    generationId?: string;
  },
  signal?: AbortSignal
): Promise<any> {
  const res = await fetch(`${BACKEND_BASE}/api/images/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error || "Image generation request failed");
  }
  return await res.json();
}

/**
 * Cancels an active image generation
 */
export async function cancelImageApi(id: string): Promise<any> {
  try {
    const res = await fetch(`${BACKEND_BASE}/api/images/cancel/${encodeURIComponent(id)}`, {
      method: "POST",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Polls status of an active or pending image generation
 */
export async function fetchImageStatusApi(id: string): Promise<any> {
  try {
    const res = await fetch(`${BACKEND_BASE}/api/images/status/${encodeURIComponent(id)}`);
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    return data?.imageGeneration || null;
  } catch {
    return null;
  }
}

/**
 * Persists or updates a conversation to the backend DB
 */
export async function syncConversationToServer(conv: {
  id?: string;
  title?: string;
  workspaceId?: string;
  parentConversationId?: string;
  branchedFromMessageId?: string;
}): Promise<any> {
  try {
    const res = await fetch(`${BACKEND_BASE}/api/chat/conversations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(conv),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.conversation || null;
  } catch (err) {
    console.warn("Failed to sync conversation to server DB:", err);
    return null;
  }
}

/**
 * Checks if a conversation has an active generation on the server
 */
export async function fetchActiveGeneration(conversationId: string): Promise<any> {
  try {
    const res = await fetch(
      `${BACKEND_BASE}/api/chat/generations/active?conversationId=${encodeURIComponent(conversationId)}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.activeGeneration || null;
  } catch {
    return null;
  }
}

/**
 * Fetches single conversation and its messages from server
 */
export async function fetchConversationFromServer(id: string): Promise<any> {
  try {
    const res = await fetch(`${BACKEND_BASE}/api/chat/conversations/${encodeURIComponent(id)}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Fetches all conversations from server DB with local fallback
 */
export async function fetchConversationsFromServer(): Promise<any[]> {
  try {
    const res = await fetch(`${BACKEND_BASE}/api/chat/conversations`);
    if (!res.ok) return getChats();
    const data = await res.json();
    if (data?.success && Array.isArray(data.conversations)) {
      return data.conversations;
    }
    return getChats();
  } catch {
    return getChats();
  }
}

/**
 * Clears all conversations from server database
 */
export async function clearAllConversationsFromServer(): Promise<boolean> {
  try {
    const res = await fetch(`${BACKEND_BASE}/api/chat/conversations`, {
      method: "DELETE",
    });
    return res.ok;
  } catch {
    return false;
  }
}

