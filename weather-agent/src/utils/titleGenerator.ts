/**
 * Generate a concise, GPT-style title from user input
 * Uses smart extraction algorithm to create meaningful titles
 */

// Enhanced local title generation
function generateChatTitleLocal(input: string): string {
  if (!input.trim()) return "New Chat";

  const cleaned = input.trim();

  // Common words to filter out
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

  // Try to find action words (verbs that indicate intent)
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

  // Extract first sentence or up to first punctuation
  let sentence = cleaned.match(/^[^.!?]+/)?.[0] || cleaned;
  sentence = sentence.replace(/\s+/g, " ").trim();

  // Split into words
  const words = sentence
    .split(/\s+/)
    .map((word) => word.toLowerCase().replace(/[^\w]/g, ""))
    .filter((word) => word.length > 0);

  // Look for action words first
  let titleWords: string[] = [];
  for (let i = 0; i < words.length; i++) {
    if (actionWords.includes(words[i])) {
      // Found action word, take it and next few words
      titleWords = words
        .slice(i, i + 5)
        .filter(
          (w) => !stopWords.has(w) || w === "python" || w === "javascript"
        );
      break;
    }
  }

  // If no action words found, use keyword extraction
  if (titleWords.length === 0) {
    titleWords = words
      .filter((word) => !stopWords.has(word) && word.length > 2)
      .slice(0, 6);
  }

  // If still empty, take first few words (even short ones)
  if (titleWords.length === 0) {
    titleWords = words.slice(0, 4);
  }

  // If still empty after all attempts, use a generic based on length
  if (titleWords.length === 0) {
    if (cleaned.length > 3) {
      return cleaned.substring(0, 40).trim() || "New Chat";
    }
    return "New Chat";
  }

  let title: string = titleWords.join(" ");

  // Truncate if too long (50 chars)
  if (title.length > 50) {
    title = title.substring(0, 50).trim();
    // Add ellipsis if truncated mid-word
    if (title.length === 50) {
      title = title.substring(0, 47) + "...";
    }
  }

  // Capitalize first letter and ensure title is not empty
  title = title.charAt(0).toUpperCase() + title.slice(1);
  return title.trim() || "New Chat";
}

// Main function - use local generation directly for speed and reliability
export async function generateChatTitle(input: string): Promise<string> {
  if (!input.trim()) return "New Chat";

  // Use smart local generation directly (no API call to avoid network issues)
  return generateChatTitleLocal(input);
}
