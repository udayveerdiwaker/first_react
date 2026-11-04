/**
 * Smart Artifact Context Identification & Chunking Engine
 * 
 * Analyzes user prompts for artifact references, applies smart line-range extraction,
 * performs keyword/symbol search chunking, handles multi-file disambiguation,
 * and formats context for LLM prompt injection.
 */

import { getLocalArtifacts } from "./artifactManager";
import type { WorkspaceArtifact } from "./artifactManager";

export interface ArtifactContextResult {
  referencedArtifact?: WorkspaceArtifact;
  contextPrompt?: string;
  disambiguationMessage?: string;
  matchedRange?: { start: number; end: number };
}

/**
 * Extracts line range mentions from user input.
 * Supports patterns like:
 * - [auth.php:142-158]
 * - lines 10 to 45 / lines 10-45
 * - line 25
 * - L10-L45
 */
export function extractLineRange(text: string): { start: number; end: number } | null {
  // Pattern 1: [filename:start-end] or filename:start-end
  const colonMatch = text.match(/:(\d+)(?:[-–—:](\d+))?/);
  if (colonMatch) {
    const start = parseInt(colonMatch[1], 10);
    const end = colonMatch[2] ? parseInt(colonMatch[2], 10) : start;
    if (!isNaN(start) && start > 0) {
      return { start, end: Math.max(start, isNaN(end) ? start : end) };
    }
  }

  // Pattern 2: "lines 142 to 158" or "lines 142-158"
  const linesMatch = text.match(/\blines?\s+(\d+)(?:\s*(?:to|-|through)\s*(\d+))?/i);
  if (linesMatch) {
    const start = parseInt(linesMatch[1], 10);
    const end = linesMatch[2] ? parseInt(linesMatch[2], 10) : start;
    if (!isNaN(start) && start > 0) {
      return { start, end: Math.max(start, isNaN(end) ? start : end) };
    }
  }

  // Pattern 3: "L142-L158" or "L142"
  const lMatch = text.match(/\bL(\d+)(?:-L?(\d+))?\b/i);
  if (lMatch) {
    const start = parseInt(lMatch[1], 10);
    const end = lMatch[2] ? parseInt(lMatch[2], 10) : start;
    if (!isNaN(start) && start > 0) {
      return { start, end: Math.max(start, isNaN(end) ? start : end) };
    }
  }

  return null;
}

/**
 * Extracts a smart window around a target line range with padding and line numbers
 */
export function extractLineWindow(
  content: string,
  start: number,
  end: number,
  padding: number = 3
): { text: string; actualStart: number; actualEnd: number } {
  const lines = content.split("\n");
  const total = lines.length;

  const actualStart = Math.max(1, start - padding);
  const actualEnd = Math.min(total, end + padding);

  const chunkLines = lines.slice(actualStart - 1, actualEnd);
  const formatted = chunkLines
    .map((line, idx) => {
      const lineNum = actualStart + idx;
      const isTarget = lineNum >= start && lineNum <= end;
      const prefix = isTarget ? ">" : " ";
      return `${prefix} ${String(lineNum).padStart(4, " ")} | ${line}`;
    })
    .join("\n");

  return {
    text: formatted,
    actualStart,
    actualEnd,
  };
}

/**
 * Finds a relevant keyword / function / symbol inside the content and returns a chunk around it
 */
export function findKeywordChunk(
  content: string,
  keywords: string[],
  windowSize: number = 50
): { text: string; matchedKeyword: string; line: number } | null {
  const lines = content.split("\n");

  for (const kw of keywords) {
    if (!kw || kw.length < 3) continue;
    const cleanKw = kw.toLowerCase();

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes(cleanKw)) {
        const chunk = extractLineWindow(content, i + 1, i + 1, Math.floor(windowSize / 2));
        return {
          text: chunk.text,
          matchedKeyword: kw,
          line: i + 1,
        };
      }
    }
  }

  return null;
}

/**
 * Resolves artifact context from the user prompt and available artifacts.
 */
export function resolveArtifactContext(
  userInput: string,
  availableArtifacts?: WorkspaceArtifact[]
): ArtifactContextResult {
  const artifacts = availableArtifacts || getLocalArtifacts();
  if (!artifacts || artifacts.length === 0) {
    return {};
  }

  const cleanInput = userInput.trim();
  const lowerInput = cleanInput.toLowerCase();

  // 1. Check for explicit bracketed reference: [filename] or [filename:range]
  const bracketMatch = cleanInput.match(/\[([a-zA-Z0-9_\-./]+)(?::(\d+(?:[-–—]\d+)?))?\]/);
  let targetArtifact: WorkspaceArtifact | undefined;
  let targetFilename = "";

  if (bracketMatch) {
    targetFilename = bracketMatch[1].toLowerCase();
    targetArtifact = artifacts.find(
      (a) =>
        a.filename.toLowerCase() === targetFilename ||
        a.title.toLowerCase() === targetFilename ||
        a.id === bracketMatch[1]
    );
  }

  // 2. Check if user typed the exact filename of any artifact
  if (!targetArtifact) {
    for (const art of artifacts) {
      const artName = art.filename.toLowerCase();
      if (lowerInput.includes(artName)) {
        targetArtifact = art;
        break;
      }
    }
  }

  // 3. Check for general intent references: "this file", "this code", "the artifact", "my code", "fix this", "explain this"
  const hasGenericReference =
    /\b(this file|this code|the code|this artifact|the artifact|my file|my code|this script|the script|explain this|find bugs in this|fix this|review this|refactor this)\b/i.test(
      cleanInput
    );

  if (!targetArtifact && hasGenericReference) {
    if (artifacts.length === 1) {
      targetArtifact = artifacts[0];
    } else if (artifacts.length > 1) {
      // Multiple artifacts present without specific name -> generate disambiguation message
      const fileOptions = artifacts
        .slice(0, 5)
        .map((a) => `• [${a.filename}] (${a.language}, ${a.lineCount} lines)`)
        .join("\n");

      return {
        disambiguationMessage: `You have multiple files in your workspace. Which file would you like me to analyze?\n\n${fileOptions}\n\nPlease reply with the filename or click on any file above.`,
      };
    }
  }

  // If no artifact was matched, return empty
  if (!targetArtifact) {
    return {};
  }

  // 4. Perform Smart Chunking
  const content = targetArtifact.content || "";
  const totalLines = targetArtifact.lineCount || content.split("\n").length;
  const lineRange = extractLineRange(cleanInput);

  let contextBody = "";
  let linesInfo = "";

  if (lineRange) {
    // Specific lines targeted by user
    const chunk = extractLineWindow(content, lineRange.start, lineRange.end, 3);
    contextBody = chunk.text;
    linesInfo = `Lines ${chunk.actualStart}-${chunk.actualEnd} of ${totalLines} (Focus: ${lineRange.start}-${lineRange.end})`;
  } else {
    // Check if user mentioned a specific function or keyword
    const symbolMatches = cleanInput.match(/\b(?:function|def|class|const|let|var|method|endpoint)\s+([a-zA-Z0-9_$]+)/i);
    const candidateKeywords = [
      symbolMatches ? symbolMatches[1] : "",
      ...cleanInput
        .replace(/[^\w\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 4 && !["explain", "please", "function", "analyze", "review"].includes(w.toLowerCase())),
    ].filter(Boolean);

    let keywordChunk: { text: string; matchedKeyword: string; line: number } | null = null;
    if (totalLines > 150 && candidateKeywords.length > 0) {
      keywordChunk = findKeywordChunk(content, candidateKeywords, 50);
    }

    if (keywordChunk) {
      contextBody = keywordChunk.text;
      linesInfo = `Chunk around keyword "${keywordChunk.matchedKeyword}" at line ${keywordChunk.line} of ${totalLines}`;
    } else if (totalLines <= 150) {
      // Full file with line numbers
      contextBody = content
        .split("\n")
        .map((line, idx) => `  ${String(idx + 1).padStart(4, " ")} | ${line}`)
        .join("\n");
      linesInfo = `All ${totalLines} lines`;
    } else {
      // Large file without specific focus: first 120 lines + indicator
      const headLines = content.split("\n").slice(0, 120);
      contextBody =
        headLines
          .map((line, idx) => `  ${String(idx + 1).padStart(4, " ")} | ${line}`)
          .join("\n") +
        `\n\n  ... [${totalLines - 120} more lines truncated. Reference specific lines with [${targetArtifact.filename}:start-end] to focus]`;
      linesInfo = `First 120 of ${totalLines} lines`;
    }
  }

  const contextPrompt = `[REFERENCED WORKSPACE ARTIFACT]
Filename: ${targetArtifact.filename} (${targetArtifact.language.toUpperCase()})
Scope: ${linesInfo}
\`\`\`${targetArtifact.language}
${contextBody}
\`\`\`
[END REFERENCED WORKSPACE ARTIFACT]`;

  return {
    referencedArtifact: targetArtifact,
    contextPrompt,
    matchedRange: lineRange || undefined,
  };
}