import type { Project, MemoryItem, SavedPrompt } from "../agent/types";

// Curated library prompts spanning key workspace disciplines
export const DEFAULT_PROMPTS: SavedPrompt[] = [
  {
    id: "p-code-refactor",
    title: "Refactor for Clean Code & Performance",
    prompt: "Please review the following code. Identify anti-patterns, optimize performance, improve readability, and provide the refactored code with brief explanations of the improvements:\n\n```\n\n```",
    category: "Coding",
    tags: ["Refactoring", "Clean Code"],
  },
  {
    id: "p-code-debug",
    title: "Debug and Fix Errors",
    prompt: "I am encountering an error in this code. Analyze the cause, explain why it failed, and provide the fixed code with test instructions:\n\nError details:\n\nCode:\n```\n\n```",
    category: "Coding",
    tags: ["Debugging", "Errors"],
  },
  {
    id: "p-write-exec-summary",
    title: "Executive Summary Generator",
    prompt: "Create a high-impact executive summary from the following document or notes. Structure it with Problem, Core Solution, Key Metrics, and Recommended Next Actions:\n\n",
    category: "Business",
    tags: ["Summary", "Management"],
  },
  {
    id: "p-market-landing-copy",
    title: "High-Converting Landing Page Copy",
    prompt: "Write compelling landing page copy for the following product/service. Include an irresistible Hero Hook, 3 Key Value Propositions with benefits, Social Proof framing, and an actionable Call-to-Action (CTA):\n\nProduct/Service: ",
    category: "Marketing",
    tags: ["Copywriting", "Conversion"],
  },
  {
    id: "p-edu-feynman",
    title: "Explain Complex Concept (Feynman Method)",
    prompt: "Explain the following concept as if teaching an intelligent beginner. Use a concrete real-world analogy, break down fundamental mechanics step-by-step, and highlight common misconceptions:\n\nConcept: ",
    category: "Education",
    tags: ["Learning", "Feynman"],
  },
  {
    id: "p-research-comp-analysis",
    title: "Comprehensive Research Synthesis",
    prompt: "Conduct an in-depth research breakdown on the following topic. Provide historical background, current state of technology/market, key debates, and future outlook with objective citations:\n\nTopic: ",
    category: "Research",
    tags: ["Synthesis", "Analysis"],
  },
  {
    id: "p-creative-brainstorm",
    title: "10 Distinct Creative Angles",
    prompt: "Generate 10 distinct, out-of-the-box creative angles and conceptual ideas for the following challenge. For each angle, describe the premise and why it stands out:\n\nChallenge: ",
    category: "Creative",
    tags: ["Ideation", "Brainstorm"],
  },
];

// LocalStorage Keys
const STORAGE_PROJECTS = "zyrochat-projects";
const STORAGE_ACTIVE_PROJECT = "zyrochat-active-project";
const STORAGE_MEMORIES = "zyrochat-memories";
const STORAGE_MEMORY_ENABLED = "zyrochat-memory-enabled";
const STORAGE_CUSTOM_PROMPTS = "zyrochat-custom-prompts";

// Helper for safe JSON parse
function safeParse<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

// 1. PROJECTS STORE
export function getProjects(): Project[] {
  return safeParse<Project[]>(STORAGE_PROJECTS, []);
}

export function saveProjects(projects: Project[]): void {
  localStorage.setItem(STORAGE_PROJECTS, JSON.stringify(projects));
}

export function getActiveProjectId(): string | null {
  return localStorage.getItem(STORAGE_ACTIVE_PROJECT);
}

export function setActiveProjectId(id: string | null): void {
  if (id) {
    localStorage.setItem(STORAGE_ACTIVE_PROJECT, id);
  } else {
    localStorage.removeItem(STORAGE_ACTIVE_PROJECT);
  }
}

// Security: Patterns matching passwords, API keys, tokens, and credentials
const SENSITIVE_PATTERNS = [
  /password\s*[:=]\s*\S+/i,
  /api[_-]?key\s*[:=]\s*\S+/i,
  /secret\s*[:=]\s*\S+/i,
  /bearer\s+[a-zA-Z0-9_\-\.]+/i,
  /token\s*[:=]\s*\S+/i,
  /sk-[a-zA-Z0-9]{20,}/i,
  /ghp_[a-zA-Z0-9]{20,}/i,
];

export function isSensitiveText(text: string): boolean {
  if (!text || typeof text !== "string") return false;
  return SENSITIVE_PATTERNS.some((p) => p.test(text));
}

export function sanitizeText(text: string): string {
  if (!text || typeof text !== "string") return "";
  let result = text;
  for (const pattern of SENSITIVE_PATTERNS) {
    result = result.replace(pattern, "[REDACTED_CREDENTIAL]");
  }
  return result;
}

// 2. SMART MEMORY STORE
export function getMemories(): MemoryItem[] {
  return safeParse<MemoryItem[]>(STORAGE_MEMORIES, []);
}

export function saveMemories(memories: MemoryItem[]): void {
  // Filter out any purely sensitive credential entries and sanitize remaining entries
  const safeMemories = (memories || [])
    .filter((m) => {
      const keyLower = (m.key || "").toLowerCase();
      if (
        keyLower.includes("password") ||
        keyLower.includes("secret") ||
        keyLower.includes("api_key") ||
        keyLower.includes("apikey") ||
        keyLower.includes("token")
      ) {
        return false;
      }
      return true;
    })
    .map((m) => ({
      ...m,
      key: sanitizeText(m.key),
      value: sanitizeText(m.value),
    }));

  localStorage.setItem(STORAGE_MEMORIES, JSON.stringify(safeMemories));
}

export function isMemoryEnabled(): boolean {
  const val = localStorage.getItem(STORAGE_MEMORY_ENABLED);
  return val === null ? true : val === "true";
}

export function setMemoryEnabled(enabled: boolean): void {
  localStorage.setItem(STORAGE_MEMORY_ENABLED, String(enabled));
}

// 3. PROMPT LIBRARY STORE
export function getCustomPrompts(): SavedPrompt[] {
  return safeParse<SavedPrompt[]>(STORAGE_CUSTOM_PROMPTS, []);
}

export function saveCustomPrompts(prompts: SavedPrompt[]): void {
  localStorage.setItem(STORAGE_CUSTOM_PROMPTS, JSON.stringify(prompts));
}

export function getAllPrompts(): SavedPrompt[] {
  return [...DEFAULT_PROMPTS, ...getCustomPrompts()];
}
