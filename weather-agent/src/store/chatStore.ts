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
 * Retrieves all saved chats from browser localStorage.
 *
 * This function:
 * 1. Reads the "chats" key from localStorage (browser's persistent storage)
 * 2. Parses the JSON (or returns empty array if nothing saved)
 * 3. Normalizes the data to fix any incomplete entries
 * 4. Returns the cleaned chat history
 *
 * Used at app startup to restore the user's previous conversations.
 *
 * @returns Array of all saved chat objects
 */
export function getChats() {
  const chats = JSON.parse(localStorage.getItem("chats") || "[]");
  return normalizeChats(chats);
}

/**
 * Saves all chats to browser localStorage.
 *
 * This function:
 * 1. Takes the current chat list
 * 2. Normalizes it to ensure consistency
 * 3. Converts to JSON string
 * 4. Saves to "chats" key in localStorage
 *
 * Called whenever a chat is modified (new message, renamed, etc.)
 * to persist changes so they survive page refreshes.
 *
 * @param chats - Array of chat objects to save
 */
export function saveChats(chats: any) {
  localStorage.setItem("chats", JSON.stringify(normalizeChats(chats)));
}
