/**
 * Artifact & Voice Configuration and Threshold Constants
 * 
 * Centralized, user-tunable thresholds for automatic artifact creation,
 * file formats, preview capabilities, and voice activity detection.
 */

export interface ArtifactThresholdConfig {
  charThreshold: number;
  lineThreshold: number;
  tokenThreshold: number;
  voiceSilenceTimeoutMs: number;
  voiceLanguage: string;
  autoReadResponses: boolean;
}

export const DEFAULT_ARTIFACT_CONFIG: ArtifactThresholdConfig = {
  charThreshold: 1200,          // Code or text > 1200 characters becomes an artifact
  lineThreshold: 30,            // Code or text > 30 lines becomes an artifact
  tokenThreshold: 300,          // Code or text > ~300 tokens becomes an artifact
  voiceSilenceTimeoutMs: 2500,  // 2.5s pause before voice transitions to review
  voiceLanguage: "auto",        // Auto language detection or specified locale
  autoReadResponses: false,     // Text-to-speech auto playback
};

const STORAGE_KEY = "zyrochat-artifact-config";

export function getArtifactConfig(): ArtifactThresholdConfig {
  if (typeof window === "undefined" || !window.localStorage) {
    return { ...DEFAULT_ARTIFACT_CONFIG };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_ARTIFACT_CONFIG };
    const parsed = JSON.parse(raw);
    return {
      charThreshold: Number(parsed.charThreshold) || DEFAULT_ARTIFACT_CONFIG.charThreshold,
      lineThreshold: Number(parsed.lineThreshold) || DEFAULT_ARTIFACT_CONFIG.lineThreshold,
      tokenThreshold: Number(parsed.tokenThreshold) || DEFAULT_ARTIFACT_CONFIG.tokenThreshold,
      voiceSilenceTimeoutMs: Number(parsed.voiceSilenceTimeoutMs) || DEFAULT_ARTIFACT_CONFIG.voiceSilenceTimeoutMs,
      voiceLanguage: typeof parsed.voiceLanguage === "string" ? parsed.voiceLanguage : DEFAULT_ARTIFACT_CONFIG.voiceLanguage,
      autoReadResponses: Boolean(parsed.autoReadResponses),
    };
  } catch {
    return { ...DEFAULT_ARTIFACT_CONFIG };
  }
}

export function saveArtifactConfig(config: Partial<ArtifactThresholdConfig>): ArtifactThresholdConfig {
  const current = getArtifactConfig();
  const updated = { ...current, ...config };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("zyrochat:artifact-config-changed", { detail: updated }));
  } catch (e) {
    console.warn("Failed to persist artifact config:", e);
  }
  return updated;
}

// Comprehensive supported artifact file extensions
export const SUPPORTED_ARTIFACT_EXTENSIONS = [
  "html",
  "css",
  "js",
  "ts",
  "jsx",
  "tsx",
  "py",
  "php",
  "sql",
  "json",
  "csv",
  "md",
  "txt",
  "xml",
  "yaml",
  "yml",
] as const;

export type SupportedExtension = (typeof SUPPORTED_ARTIFACT_EXTENSIONS)[number];

// Mapping of programming languages to clean file extensions
export const LANGUAGE_TO_EXTENSION_MAP: Record<string, string> = {
  javascript: "js",
  js: "js",
  typescript: "ts",
  ts: "ts",
  jsx: "jsx",
  tsx: "tsx",
  html: "html",
  css: "css",
  python: "py",
  py: "py",
  php: "php",
  sql: "sql",
  json: "json",
  csv: "csv",
  markdown: "md",
  md: "md",
  txt: "txt",
  text: "txt",
  xml: "xml",
  yaml: "yaml",
  yml: "yml",
  svg: "svg",
  c: "c",
  cpp: "cpp",
  java: "java",
  go: "go",
  rust: "rs",
  rs: "rs",
  bash: "sh",
  sh: "sh",
};

// Mapping of file extensions to MIME types for downloads
export const EXTENSION_TO_MIME_MAP: Record<string, string> = {
  html: "text/html;charset=utf-8",
  css: "text/css;charset=utf-8",
  js: "application/javascript;charset=utf-8",
  ts: "application/typescript;charset=utf-8",
  jsx: "text/jsx;charset=utf-8",
  tsx: "text/tsx;charset=utf-8",
  py: "text/x-python;charset=utf-8",
  php: "text/x-php;charset=utf-8",
  sql: "application/sql;charset=utf-8",
  json: "application/json;charset=utf-8",
  csv: "text/csv;charset=utf-8",
  md: "text/markdown;charset=utf-8",
  txt: "text/plain;charset=utf-8",
  xml: "application/xml;charset=utf-8",
  yaml: "application/x-yaml;charset=utf-8",
  yml: "application/x-yaml;charset=utf-8",
  svg: "image/svg+xml;charset=utf-8",
};

/**
 * Checks whether an artifact can be safely previewed in the UI (HTML sandbox, Markdown, JSON, CSV)
 * Prevents arbitrary or non-visual execution.
 */
export function isSafePreviewable(langOrExt: string): boolean {
  const clean = (langOrExt || "").toLowerCase();
  return [
    "html",
    "svg",
    "md",
    "markdown",
    "json",
    "csv",
  ].includes(clean);
}
