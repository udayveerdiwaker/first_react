/**
 * Generates a concise, meaningful title from user's first message.
 *
 * This is designed to work entirely locally without API calls, ensuring:
 * - Instant title generation (no network latency)
 * - Works offline
 * - No token usage or API costs
 * - Reliable fallbacks if extraction fails
 *
 * The algorithm:
 * 1. Filters out common stop words (the, a, and, etc.)
 * 2. Looks for action verbs (explain, calculate, find, etc.)
 * 3. Uses keyword extraction to find important words
 * 4. Limits to 50 characters for sidebar display
 * 5. Falls back to "New Chat" if extraction fails
 *
 * Examples:
 * - "What's the weather in London?" → "Weather in London"
 * - "Explain quantum computing" → "Explain Quantum Computing"
 * - "How do I cook pasta?" → "Cook Pasta"
 */

// Enhanced local title generation
function generateChatTitleLocal(input: string): string {
  // Empty input gets a generic title
  if (!input.trim()) return "New Chat";

  const cleaned = input.trim();

  /**
   * Stop words - common English words that don't indicate intent.
   * These are filtered out when extracting meaningful title words.
   * Examples: "the", "a", "and", "is", "that", etc.
   */
  const stopWords = new Set([
    "the",
    "a",
    "an",
    "and",
    "or",
    "but",
    "in",
    "on",
    "at",
    "to",
    "for",
    "of",
    "with",
    "by",
    "from",
    "up",
    "about",
    "into",
    "through",
    "during",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",
    "have",
    "has",
    "had",
    "do",
    "does",
    "did",
    "will",
    "would",
    "could",
    "should",
    "may",
    "might",
    "must",
    "can",
    "this",
    "that",
    "these",
    "those",
    "i",
    "you",
    "he",
    "she",
    "it",
    "we",
    "they",
    "what",
    "which",
    "who",
    "when",
    "where",
    "why",
    "how",
    "please",
    "help",
    "me",
    "my",
    "your",
    "hi",
    "hello",
    "hey",
    "thanks",
    "thank",
    "okay",
    "ok",
    "sure",
    "yes",
    "no",
    "not",
    "just",
    "like",
    "so",
  ]);

  /**
   * Action verbs that indicate what the user wants to do.
   * When these words are found, they become the title foundation.
   * This helps create titles like:
   * - "explain quantum physics" → "Explain Quantum Physics"
   * - "calculate the area" → "Calculate Area"
   */
  const actionWords = [
    "explain",
    "calculate",
    "find",
    "show",
    "get",
    "tell",
    "write",
    "create",
    "generate",
    "translate",
    "compare",
    "analyze",
    "summarize",
    "convert",
    "check",
    "help",
    "fix",
    "improve",
    "optimize",
    "debug",
    "list",
    "count",
  ];

  // Extract the first sentence (up to the first . ! or ?)
  let sentence = cleaned.match(/^[^.!?]+/)?.[0] || cleaned;

  // Normalize whitespace (remove multiple spaces)
  sentence = sentence.replace(/\s+/g, " ").trim();

  // Split into individual words and clean them
  const words = sentence
    .split(/\s+/)
    .map((word) => word.toLowerCase().replace(/[^\w]/g, "")) // Remove punctuation
    .filter((word) => word.length > 0); // Remove empty strings

  // Priority 1: Look for action words (most indicative of intent)
  let titleWords: string[] = [];
  for (let i = 0; i < words.length; i++) {
    if (actionWords.includes(words[i])) {
      // Found an action word - take it and the next few words
      // Exception: keep technical terms like "python" and "javascript"
      titleWords = words
        .slice(i, i + 5)
        .filter(
          (w) => !stopWords.has(w) || w === "python" || w === "javascript"
        );
      break;
    }
  }

  // Priority 2: If no action words, use keyword extraction
  // Keep meaningful words (length > 2) that aren't stop words
  if (titleWords.length === 0) {
    titleWords = words
      .filter((word) => !stopWords.has(word) && word.length > 2)
      .slice(0, 6); // Limit to 6 words
  }

  // Priority 3: If still empty, take first few words (even short ones)
  if (titleWords.length === 0) {
    titleWords = words.slice(0, 4);
  }

  // Priority 4: Last resort - use substring of original input
  if (titleWords.length === 0) {
    if (cleaned.length > 3) {
      return cleaned.substring(0, 40).trim() || "New Chat";
    }
    return "New Chat";
  }

  // Join the selected words into a title
  let title: string = titleWords.join(" ");

  // Truncate to 50 characters for display in sidebar
  if (title.length > 50) {
    title = title.substring(0, 50).trim();
    // Add ellipsis if truncated mid-word
    if (title.length === 50) {
      title = title.substring(0, 47) + "...";
    }
  }

  // Capitalize first letter for proper formatting
  title = title.charAt(0).toUpperCase() + title.slice(1);
  return title.trim() || "New Chat";
}

/**
 * Main function to generate a chat title from user input.
 *
 * This is the public API called when a new chat is created.
 * It uses fast local generation entirely in JavaScript
 * without any backend calls or network requests.
 *
 * @param input - The user's first message
 * @returns Promise resolving to a generated title (50 chars max)
 */
export async function generateChatTitle(input: string): Promise<string> {
  // Empty input gets a generic title
  if (!input.trim()) return "New Chat";

  // Use smart local generation directly (fast, offline, reliable)
  // No API call - this keeps the app responsive even without backend access
  return generateChatTitleLocal(input);
}
