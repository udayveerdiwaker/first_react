/**
 * Intent Router & Smart Auto Mode Classifier
 * Intelligently classifies user queries to Image Generation, Web Search, Coding, or Chat.
 * Supports aspect ratio extraction and context-aware image refinements.
 */

import type { ChatMessage as Message } from "./types";

export type IntentType =
  | "IMAGE_GENERATION"
  | "WEB_SEARCH"
  | "CODING"
  | "NORMAL_CHAT";

export type AspectRatioOption = "1:1" | "16:9" | "9:16" | "4:3";

export interface IntentResult {
  intent: IntentType;
  confidence: number;
  extractedPrompt: string;
  aspectRatio?: AspectRatioOption;
  isRefinement?: boolean;
  rationale: string;
}

/**
 * Extracts aspect ratio flags from natural language prompt and returns cleaned prompt.
 */
export function extractAspectRatio(text: string): {
  aspectRatio: AspectRatioOption | undefined;
  cleanedPrompt: string;
} {
  let cleaned = text;
  let detectedRatio: AspectRatioOption | undefined;

  // 16:9 Landscape / Widescreen patterns
  const widePatterns = [
    /\b(?:in\s+)?16:9\b/i,
    /\b(?:in\s+)?16x9\b/i,
    /\b(?:in\s+)?16\/9\b/i,
    /\b(?:in\s+)?landscape(?:\s+mode|\s+orientation)?\b/i,
    /\b(?:in\s+)?widescreen\b/i,
    /\b(?:desktop\s+)?wallpaper\b/i,
    /\b(?:youtube\s+)?thumbnail\b/i,
    /\bbanner\b/i,
  ];

  // 9:16 Portrait / Story patterns
  const tallPatterns = [
    /\b(?:in\s+)?9:16\b/i,
    /\b(?:in\s+)?9x16\b/i,
    /\b(?:in\s+)?9\/16\b/i,
    /\b(?:in\s+)?portrait(?:\s+mode|\s+orientation)?\b/i,
    /\b(?:in\s+)?vertical\b/i,
    /\b(?:phone\s+)?wallpaper\b/i,
    /\b(?:instagram\s+)?story\b/i,
    /\b(?:tiktok|reel)\b/i,
  ];

  // 4:3 Standard Photo patterns
  const fourThreePatterns = [
    /\b(?:in\s+)?4:3\b/i,
    /\b(?:in\s+)?4x3\b/i,
    /\b(?:in\s+)?4\/3\b/i,
    /\bstandard\s+photo\b/i,
  ];

  // 1:1 Square patterns
  const squarePatterns = [
    /\b(?:in\s+)?1:1\b/i,
    /\b(?:in\s+)?1x1\b/i,
    /\b(?:in\s+)?1\/1\b/i,
    /\bsquare\b/i,
    /\bavatar\b/i,
    /\bprofile\s+picture\b/i,
  ];

  for (const p of widePatterns) {
    if (p.test(cleaned)) {
      detectedRatio = "16:9";
      cleaned = cleaned.replace(p, " ").trim();
      break;
    }
  }

  if (!detectedRatio) {
    for (const p of tallPatterns) {
      if (p.test(cleaned)) {
        detectedRatio = "9:16";
        cleaned = cleaned.replace(p, " ").trim();
        break;
      }
    }
  }

  if (!detectedRatio) {
    for (const p of fourThreePatterns) {
      if (p.test(cleaned)) {
        detectedRatio = "4:3";
        cleaned = cleaned.replace(p, " ").trim();
        break;
      }
    }
  }

  if (!detectedRatio) {
    for (const p of squarePatterns) {
      if (p.test(cleaned)) {
        detectedRatio = "1:1";
        cleaned = cleaned.replace(p, " ").trim();
        break;
      }
    }
  }

  // Clean trailing punctuation or dangling prepositions like "in", "with"
  cleaned = cleaned
    .replace(/\s+(?:in|as|with)\s*$/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  return { aspectRatio: detectedRatio, cleanedPrompt: cleaned };
}

/**
 * Merges previous image prompt with user refinement delta
 */
export function mergeRefinementPrompt(previousPrompt: string, delta: string): string {
  const cleanPrev = previousPrompt.replace(/[.,;]+$/, "").trim();
  const cleanDelta = delta.trim();

  // Strip leading refinement filler phrases
  const strippedDelta = cleanDelta
    .replace(/^(?:make it|make this|change it to|add|turn it into|can you make it|now make it|modify it to|adjust it to)\s+/i, "")
    .trim();

  if (/^(?:add|with)\b/i.test(cleanDelta)) {
    return `${cleanPrev}, featuring ${strippedDelta}`;
  }

  if (/^(?:without|remove|no)\b/i.test(cleanDelta)) {
    return `${cleanPrev}, but without ${cleanDelta.replace(/^(?:without|remove|no)\s+/i, "")}`;
  }

  return `${cleanPrev}, modified: ${strippedDelta}`;
}

/**
 * Primary Intent Classification function
 */
export function classifyIntent(
  rawPrompt: string,
  history: Message[] = [],
  attachments: any[] = []
): IntentResult {
  const text = (rawPrompt || "").trim();
  const lower = text.toLowerCase();

  // 1. Multimodal / Attachments: vision or document handling
  if (Array.isArray(attachments) && attachments.length > 0) {
    return {
      intent: "NORMAL_CHAT",
      confidence: 0.9,
      extractedPrompt: text,
      rationale: "Prompt includes attachments for analysis.",
    };
  }

  // 2. Negative / Informational Filters for Image Generation
  // Questions about image generation or concepts should NEVER trigger generation
  const isMetaQuestion =
    /^(?:how\s+(?:do|does|can|to)|why\s+(?:do|does|is)|what\s+(?:is|are)|can\s+you\s+explain|tell\s+me\s+about|explain|who\s+made|difference\s+between)\b/i.test(
      lower
    ) ||
    /\b(?:how\s+to\s+(?:generate|draw|code|create|make)|works?|algorithm|tutorial|guide|documentation|api|prompt\s+engineering)\b/i.test(
      lower
    );

  const isCodeRelatedImage =
    /\b(?:<img>|image\s+tag|css|react|html|canvas|svg|pillow|pil|opencv|base64|url|src|aspect-ratio|tailwind|component|function|api)\b/i.test(
      lower
    );

  // 3. Context-Aware Image Refinement Detection
  // Check if last bot message in history generated an image
  const lastBotMessage = [...history].reverse().find((m) => m.role === "bot");
  const hasRecentImageGeneration = Boolean(
    lastBotMessage &&
      lastBotMessage.imageGeneration &&
      (lastBotMessage.imageGeneration.status === "completed" ||
        lastBotMessage.imageGeneration.status === "generating")
  );

  if (hasRecentImageGeneration && !isMetaQuestion && !isCodeRelatedImage) {
    const isRefinementQuery =
      /^(?:make\s+it|change\s+it|turn\s+it|add\s+|remove\s+|now\s+make|without\s+|more\s+|less\s+|replace\s+|regenerate|in\s+(?:16:9|9:16|4:3|1:1)|in\s+landscape|in\s+portrait|in\s+square|different\s+background|same\s+thing\s+but)\b/i.test(
        lower
      ) ||
      (/\b(?:the\s+image|this\s+image|the\s+picture|the\s+photo)\b/i.test(lower) &&
        text.split(/\s+/).length <= 15);

    if (isRefinementQuery) {
      const { aspectRatio, cleanedPrompt } = extractAspectRatio(text);
      const prevPrompt = lastBotMessage!.imageGeneration!.prompt;
      const merged = mergeRefinementPrompt(prevPrompt, cleanedPrompt);

      return {
        intent: "IMAGE_GENERATION",
        confidence: 0.94,
        extractedPrompt: merged,
        aspectRatio: aspectRatio || lastBotMessage!.imageGeneration!.aspectRatio || "1:1",
        isRefinement: true,
        rationale: "Detected contextual refinement for the previous image generation.",
      };
    }
  }

  // 4. Positive Image Generation Intent Detection
  if (!isMetaQuestion && !isCodeRelatedImage) {
    // Explicit prefixes
    const prefixMatch = lower.match(
      /^(?:\/image|image:|generate\s+image:|draw:|paint:|create\s+image:)\s*(.*)$/i
    );
    if (prefixMatch) {
      const { aspectRatio, cleanedPrompt } = extractAspectRatio(
        prefixMatch[1] || text
      );
      return {
        intent: "IMAGE_GENERATION",
        confidence: 0.99,
        extractedPrompt: cleanedPrompt || text,
        aspectRatio: aspectRatio || "1:1",
        rationale: "Explicit image command prefix detected.",
      };
    }

    // Direct Creation Phrases
    const isImageCreationPhrase =
      /\b(?:generate|create|render|draw|paint|illustrate|produce|make)\s+(?:an?\s+|me\s+an?\s+|us\s+an?\s+)?(?:image|picture|photo|photograph|illustration|drawing|artwork|poster|wallpaper|portrait|graphic|banner|avatar)\b/i.test(
        lower
      ) ||
      /\b(?:image|picture|photo|illustration|portrait|wallpaper)\s+of\b/i.test(
        lower
      ) ||
      /^(?:draw|paint|sketch)\s+(?:me\s+|us\s+)?an?\b/i.test(lower);

    if (isImageCreationPhrase) {
      const { aspectRatio, cleanedPrompt } = extractAspectRatio(text);

      // Clean leading conversational prefixes like "please generate an image of" -> actual subject
      const subjectPrompt = cleanedPrompt
        .replace(
          /^(?:please\s+|can\s+you\s+|could\s+you\s+)?(?:generate|create|render|draw|paint|illustrate|produce|make)\s+(?:an?\s+|me\s+an?\s+|us\s+an?\s+)?(?:image|picture|photo|photograph|illustration|drawing|artwork|poster|wallpaper|portrait|graphic|banner|avatar)\s+(?:of\s+|showing\s+|depicting\s+)?/i,
          ""
        )
        .replace(/^(?:draw|paint|sketch)\s+(?:me\s+|us\s+)?(?:an?\s+)?/i, "")
        .trim();

      return {
        intent: "IMAGE_GENERATION",
        confidence: 0.95,
        extractedPrompt: subjectPrompt || cleanedPrompt,
        aspectRatio: aspectRatio || "1:1",
        rationale: "Detected AI image creation request.",
      };
    }
  }

  // 5. Explicit Web Search Intent Detection
  const isWebSearchQuery =
    /\b(?:search\s+the\s+web\s+for|search\s+online\s+for|google|look\s+up\s+current|latest\s+news\s+on|who\s+won\s+the|today's\s+weather|current\s+weather|stock\s+price\s+of|recent\s+events\s+in)\b/i.test(
      lower
    ) ||
    (/^search:\s+/i.test(lower));

  if (isWebSearchQuery) {
    return {
      intent: "WEB_SEARCH",
      confidence: 0.9,
      extractedPrompt: text.replace(/^search:\s+/i, ""),
      rationale: "Prompt requests live external or real-time web information.",
    };
  }

  // 6. Coding & Software Development Intent Detection
  const hasCodeBlock = text.includes("```");
  const isCodingQuery =
    hasCodeBlock ||
    /\b(?:write\s+a\s+(?:python|javascript|typescript|react|sql|html|css|bash)\s+(?:script|function|component|query|code))\b/i.test(
      lower
    ) ||
    /\b(?:fix\s+this\s+error|debug\s+this|syntax\s+error|type\s+error|refactor\s+this\s+code)\b/i.test(
      lower
    );

  if (isCodingQuery) {
    return {
      intent: "CODING",
      confidence: 0.88,
      extractedPrompt: text,
      rationale: "Detected source code tokens or programming instructions.",
    };
  }

  // 7. Default to Normal Chat
  return {
    intent: "NORMAL_CHAT",
    confidence: 0.85,
    extractedPrompt: text,
    rationale: "Standard conversational inquiry.",
  };
}
