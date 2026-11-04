import type { Attachment } from "../agent/types";

export interface ProcessedFile extends Attachment {
  content?: string;
  isTextBased?: boolean;
  status: "ready" | "processing" | "error";
  lineCount?: number;
  errorMessage?: string;
}

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB maximum

/**
 * Sanitizes filename to prevent directory traversal or control characters
 */
export function sanitizeFileName(name: string): string {
  return name
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
}

const TEXT_EXTENSIONS = new Set([
  "txt",
  "md",
  "markdown",
  "csv",
  "json",
  "js",
  "jsx",
  "ts",
  "tsx",
  "py",
  "html",
  "css",
  "scss",
  "sql",
  "sh",
  "yaml",
  "yml",
  "xml",
  "env",
  "toml",
  "ini",
]);

/**
 * Extracts extension from filename
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "";
}

/**
 * Checks if a file is readable as plain text
 */
export function isTextFile(file: File): boolean {
  if (file.type.startsWith("text/")) return true;
  if (file.type === "application/json" || file.type === "application/javascript") return true;
  const ext = getFileExtension(file.name);
  return TEXT_EXTENSIONS.has(ext);
}

/**
 * Processes an uploaded file in the browser safely.
 * Extracts text content if text-based, validates file size, and handles errors cleanly.
 */
export async function processUploadedFile(file: File): Promise<ProcessedFile> {
  const safeName = sanitizeFileName(file.name) || "attachment";
  const ext = getFileExtension(safeName);
  const isText = isTextFile(file);

  // File size validation: reject files larger than 10MB
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      name: safeName,
      size: file.size,
      type: file.type,
      status: "error",
      errorMessage: `File exceeds 10 MB limit (${(file.size / (1024 * 1024)).toFixed(1)} MB).`,
    };
  }

  return new Promise((resolve) => {
    // 1. Text-based files (Code, TXT, CSV, JSON, Markdown)
    if (isText) {
      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result || "");
        const lines = text.split("\n").length;
        resolve({
          name: file.name,
          size: file.size,
          type: file.type || `text/${ext || "plain"}`,
          content: text,
          isTextBased: true,
          status: "ready",
          lineCount: lines,
        });
      };
      reader.onerror = () => {
        resolve({
          name: file.name,
          size: file.size,
          type: file.type,
          status: "error",
          errorMessage: "Failed to read text file. The file may be corrupt or permission is denied.",
        });
      };
      reader.readAsText(file);
      return;
    }

    // 2. Images (PNG, JPEG, WebP, SVG, GIF)
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          name: file.name,
          size: file.size,
          type: file.type,
          url: String(reader.result || ""),
          isTextBased: false,
          status: "ready",
        });
      };
      reader.onerror = () => {
        resolve({
          name: file.name,
          size: file.size,
          type: file.type,
          status: "error",
          errorMessage: "Failed to process image file. The file format may be invalid or corrupt.",
        });
      };
      reader.readAsDataURL(file);
      return;
    }

    // 3. Binary Documents (PDF, DOCX, XLSX)
    // Read snippet or metadata
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        name: file.name,
        size: file.size,
        type: file.type || `application/${ext}`,
        url: String(reader.result || ""),
        isTextBased: false,
        status: "ready",
      });
    };
    reader.onerror = () => {
      resolve({
        name: file.name,
        size: file.size,
        type: file.type,
        status: "error",
        errorMessage: "Failed to read document file. The file may be corrupt or password-protected.",
      });
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Quick analysis prompt shortcuts for uploaded files
 */
export const FILE_QUICK_ACTIONS = [
  { label: "Summarize this", prompt: "Please summarize the key points and executive takeaways from the attached file." },
  { label: "Explain this", prompt: "Please explain the content, purpose, and logic of this file in clear terms." },
  { label: "Find errors", prompt: "Please analyze the attached file for any errors, bugs, syntax flaws, or inconsistencies, and provide recommended fixes." },
  { label: "Extract key info", prompt: "Extract the most important facts, numbers, structured data, and key takeaways from this document." },
  { label: "Create report", prompt: "Create a formal, structured analysis report based on this file, complete with actionable recommendations." },
];
