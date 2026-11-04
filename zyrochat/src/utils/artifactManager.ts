/**
 * Artifact Management Engine for ZyroChat
 * 
 * Handles artifact creation, threshold evaluation, versioning,
 * professional filename derivation, local storage caching,
 * and backend persistence.
 */

import {
  getArtifactConfig,
  LANGUAGE_TO_EXTENSION_MAP,
} from "./artifactConfig";

export interface ArtifactVersion {
  version: number;
  content: string;
  updatedAt: number;
  summary?: string;
  lineCount: number;
  sizeBytes: number;
}

export interface WorkspaceArtifact {
  id: string;
  title: string;
  filename: string;
  type: "html" | "code" | "markdown" | "data";
  content: string;
  language: string;
  sizeBytes: number;
  lineCount: number;
  version: number;
  versions: ArtifactVersion[];
  createdAt: number;
  updatedAt: number;
}

const ARTIFACTS_STORAGE_KEY = "zyrochat-artifacts-store";

/**
 * Checks whether a given piece of code, document, or structured data
 * should be materialized as an Artifact instead of inline chat text.
 */
export function shouldCreateArtifact(
  content: string,
  language: string = "text",
  explicitRequest: boolean = false
): boolean {
  if (!content || typeof content !== "string") return false;
  if (explicitRequest) return true;

  const config = getArtifactConfig();
  const trimmed = content.trim();
  const lines = trimmed.split("\n");
  const charCount = trimmed.length;
  const lineCount = lines.length;
  const tokenEstimate = Math.round(charCount / 4);

  // If exceeds configured thresholds
  if (charCount >= config.charThreshold) return true;
  if (lineCount >= config.lineThreshold) return true;
  if (tokenEstimate >= config.tokenThreshold) return true;

  // Complete standalone HTML or SVG documents should always be previewable artifacts
  const lowerLang = (language || "").toLowerCase();
  if (
    lowerLang === "html" &&
    (trimmed.includes("<!DOCTYPE") || trimmed.includes("<html") || trimmed.includes("<body"))
  ) {
    return true;
  }

  // Structured tabular CSV datasets with > 10 rows
  if (lowerLang === "csv" && lineCount >= 10) {
    return true;
  }

  // Substantial JSON datasets
  if (lowerLang === "json" && lineCount >= 20) {
    return true;
  }

  return false;
}

/**
 * Generates a clean, professional, and descriptive filename
 */
export function generateArtifactFilename(
  language: string = "txt",
  content: string = "",
  preferredTitle?: string
): string {
  const lowerLang = (language || "txt").toLowerCase();
  const ext = LANGUAGE_TO_EXTENSION_MAP[lowerLang] || "txt";

  if (preferredTitle && preferredTitle.trim()) {
    const cleanTitle = preferredTitle
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");
    if (cleanTitle.endsWith(`.${ext}`)) return cleanTitle;
    return `${cleanTitle}.${ext}`;
  }

  // Contextual name heuristics based on content and language
  const lowerContent = content.toLowerCase();

  if (ext === "html") {
    if (lowerContent.includes("landing") || lowerContent.includes("hero")) return "index.html";
    if (lowerContent.includes("dashboard")) return "dashboard.html";
    if (lowerContent.includes("login") || lowerContent.includes("auth")) return "login.html";
    return "index.html";
  }

  if (ext === "css") {
    return "styles.css";
  }

  if (ext === "js" || ext === "ts" || ext === "tsx" || ext === "jsx") {
    if (lowerContent.includes("export default function app") || lowerContent.includes("const app")) {
      return ext === "tsx" || ext === "jsx" ? `App.${ext}` : `app.${ext}`;
    }
    if (lowerContent.includes("auth") || lowerContent.includes("token")) return `auth.${ext}`;
    if (lowerContent.includes("api") || lowerContent.includes("fetch")) return `apiClient.${ext}`;
    if (lowerContent.includes("chart") || lowerContent.includes("graph")) return `analytics.${ext}`;
    return `script.${ext}`;
  }

  if (ext === "py") {
    if (lowerContent.includes("def main") || lowerContent.includes("if __name__")) return "main.py";
    if (lowerContent.includes("pandas") || lowerContent.includes("numpy") || lowerContent.includes("plt")) return "data_analysis.py";
    if (lowerContent.includes("fastapi") || lowerContent.includes("flask")) return "server.py";
    return "script.py";
  }

  if (ext === "sql") {
    if (lowerContent.includes("create table")) return "schema.sql";
    return "query.sql";
  }

  if (ext === "csv") {
    if (lowerContent.includes("user") || lowerContent.includes("email")) return "users.csv";
    if (lowerContent.includes("sale") || lowerContent.includes("revenue")) return "sales_report.csv";
    return "dataset.csv";
  }

  if (ext === "json") {
    if (lowerContent.includes("package") || lowerContent.includes("dependencies")) return "package.json";
    if (lowerContent.includes("config") || lowerContent.includes("settings")) return "config.json";
    return "data.json";
  }

  if (ext === "md") {
    if (lowerContent.includes("# readme")) return "README.md";
    return "document.md";
  }

  return `document.${ext}`;
}

/**
 * Derives the artifact display type for UI categorization
 */
export function deriveArtifactType(
  language: string,
  content: string
): "html" | "code" | "markdown" | "data" {
  const lowerLang = (language || "").toLowerCase();
  if (lowerLang === "html" || lowerLang === "svg") return "html";
  if (lowerLang === "md" || lowerLang === "markdown") return "markdown";
  if (lowerLang === "csv" || lowerLang === "json" || lowerLang === "sql") return "data";
  if (content.includes("<!DOCTYPE") || content.includes("<html")) return "html";
  return "code";
}

/**
 * Creates a complete WorkspaceArtifact object with unique ID and initial version 1
 */
export function createWorkspaceArtifact(
  content: string,
  language: string = "javascript",
  preferredTitle?: string,
  existingId?: string
): WorkspaceArtifact {
  const id = existingId || `art-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const filename = generateArtifactFilename(language, content, preferredTitle);
  const type = deriveArtifactType(language, content);
  const now = Date.now();
  const lineCount = content.split("\n").length;
  const sizeBytes = new Blob([content]).size;

  const initialVersion: ArtifactVersion = {
    version: 1,
    content,
    updatedAt: now,
    summary: "Initial generation",
    lineCount,
    sizeBytes,
  };

  return {
    id,
    title: preferredTitle || filename,
    filename,
    type,
    content,
    language: language.toLowerCase(),
    sizeBytes,
    lineCount,
    version: 1,
    versions: [initialVersion],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Local cache getter
 */
export function getLocalArtifacts(): WorkspaceArtifact[] {
  if (typeof window === "undefined" || !window.localStorage) return [];
  try {
    const raw = localStorage.getItem(ARTIFACTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Local cache setter
 */
export function saveLocalArtifacts(artifacts: WorkspaceArtifact[]): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    localStorage.setItem(ARTIFACTS_STORAGE_KEY, JSON.stringify(artifacts));
    window.dispatchEvent(new CustomEvent("zyrochat:artifacts-updated"));
  } catch (err) {
    console.warn("Failed to persist local artifacts:", err);
  }
}

/**
 * Saves or updates an artifact with version incrementing
 */
export function saveArtifact(
  artifact: WorkspaceArtifact,
  summary: string = "Modified artifact"
): WorkspaceArtifact {
  const artifacts = getLocalArtifacts();
  const now = Date.now();
  const lineCount = artifact.content.split("\n").length;
  const sizeBytes = new Blob([artifact.content]).size;

  const existingIdx = artifacts.findIndex((a) => a.id === artifact.id);

  if (existingIdx !== -1) {
    const existing = artifacts[existingIdx];
    const isChanged = existing.content !== artifact.content;

    let updatedVersions = [...(existing.versions || [])];
    let nextVersion = existing.version || 1;

    if (isChanged) {
      nextVersion += 1;
      updatedVersions.push({
        version: nextVersion,
        content: artifact.content,
        updatedAt: now,
        summary,
        lineCount,
        sizeBytes,
      });
    }

    const updated: WorkspaceArtifact = {
      ...existing,
      ...artifact,
      version: nextVersion,
      versions: updatedVersions,
      lineCount,
      sizeBytes,
      updatedAt: now,
    };

    artifacts[existingIdx] = updated;
    saveLocalArtifacts(artifacts);
    syncArtifactToBackend(updated).catch(() => {});
    return updated;
  } else {
    // New artifact
    const created: WorkspaceArtifact = {
      ...artifact,
      lineCount,
      sizeBytes,
      updatedAt: now,
      createdAt: artifact.createdAt || now,
      versions:
        artifact.versions && artifact.versions.length > 0
          ? artifact.versions
          : [
              {
                version: 1,
                content: artifact.content,
                updatedAt: now,
                summary: "Initial creation",
                lineCount,
                sizeBytes,
              },
            ],
    };

    artifacts.unshift(created);
    saveLocalArtifacts(artifacts);
    syncArtifactToBackend(created).catch(() => {});
    return created;
  }
}

/**
 * Restores a specific version of an artifact
 */
export function restoreArtifactVersion(
  artifactId: string,
  targetVersionNum: number
): WorkspaceArtifact | null {
  const artifacts = getLocalArtifacts();
  const target = artifacts.find((a) => a.id === artifactId);
  if (!target || !target.versions) return null;

  const versionRecord = target.versions.find((v) => v.version === targetVersionNum);
  if (!versionRecord) return null;

  return saveArtifact(
    {
      ...target,
      content: versionRecord.content,
    },
    `Restored Version ${targetVersionNum}`
  );
}

/**
 * Syncs artifact with backend API if reachable
 */
async function syncArtifactToBackend(artifact: WorkspaceArtifact): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const backendUrl =
      import.meta.env.VITE_BACKEND_URL?.replace(/\/$/, "") || "http://localhost:5000";
    await fetch(`${backendUrl}/api/artifacts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(artifact),
    });
  } catch {
    // Gracefully ignore network/offline errors; local copy is safe
  }
}
