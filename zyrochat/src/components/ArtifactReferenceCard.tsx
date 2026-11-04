import { useState, useCallback } from "react";
import {
  FileCode,
  FileText,
  Database,
  Globe,
  Download,
  Copy,
  Check,
  Eye,
  ExternalLink,
  Sparkles,
  ChevronDown,
  Bug,
  Lightbulb,
  TestTube,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { WorkspaceArtifact } from "../utils/artifactManager";
import { triggerBrowserDownload } from "../utils/exportEngine";
import { EXTENSION_TO_MIME_MAP } from "../utils/artifactConfig";

interface ArtifactReferenceCardProps {
  artifact: WorkspaceArtifact;
  onSelectAction?: (prompt: string) => void;
}

export default function ArtifactReferenceCard({
  artifact,
  onSelectAction,
}: ArtifactReferenceCardProps) {
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const lang = (artifact.language || "text").toLowerCase();
  const isWeb = ["html", "svg", "css"].includes(lang);
  const isData = ["json", "csv", "sql"].includes(lang);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const handleOpenWorkspace = useCallback(() => {
    window.dispatchEvent(
      new CustomEvent("zyrochat:open-workspace", {
        detail: artifact,
      })
    );
  }, [artifact]);

  const handleCopy = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(artifact.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch (err) {
      console.error("Failed to copy artifact content:", err);
    }
  }, [artifact.content]);

  const handleDownload = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const ext = artifact.filename.split(".").pop() || "txt";
    const mime = EXTENSION_TO_MIME_MAP[ext] || "text/plain;charset=utf-8";
    const blob = new Blob([artifact.content], { type: mime });
    triggerBrowserDownload(blob, artifact.filename);
  }, [artifact]);

  const handleAction = (promptTemplate: string) => {
    setMenuOpen(false);
    const fullPrompt = `${promptTemplate} in \`${artifact.filename}\`:\n\n\`\`\`${artifact.language}\n${artifact.content.slice(0, 4000)}\n\`\`\``;
    if (onSelectAction) {
      onSelectAction(fullPrompt);
    } else {
      window.dispatchEvent(
        new CustomEvent("zyrochat:use-prompt", {
          detail: { prompt: fullPrompt },
        })
      );
    }
  };

  return (
    <div className="group relative my-3 overflow-hidden rounded-2xl border border-cyan-500/30 bg-gradient-to-b from-cyan-500/[0.04] to-transparent p-3.5 shadow-md backdrop-blur-sm transition-all hover:border-cyan-500/50 hover:shadow-cyan-500/5 dark:border-cyan-500/20 dark:from-cyan-950/20 dark:to-transparent">
      <div className="flex items-center justify-between gap-3">
        {/* Left Side: Icon + Title + Metadata */}
        <div
          onClick={handleOpenWorkspace}
          className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600 border border-cyan-500/20 shadow-inner dark:bg-cyan-500/15 dark:text-cyan-400">
            {isWeb ? (
              <Globe size={18} />
            ) : isData ? (
              <Database size={18} />
            ) : lang === "md" || lang === "markdown" ? (
              <FileText size={18} />
            ) : (
              <FileCode size={18} />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                {artifact.filename}
              </span>
              <span className="rounded-md bg-slate-200/80 px-1.5 py-0.5 text-[9px] font-mono font-semibold uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {artifact.language}
              </span>
              {artifact.version > 1 && (
                <span className="rounded-md bg-cyan-500/15 px-1.5 py-0.5 text-[9px] font-bold text-cyan-600 dark:text-cyan-400">
                  v{artifact.version}
                </span>
              )}
            </div>

            <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500">
              <span>{formatSize(artifact.sizeBytes)}</span>
              <span>•</span>
              <span>{artifact.lineCount} lines</span>
              <span>•</span>
              <span className="text-cyan-600 dark:text-cyan-400 font-medium flex items-center gap-1">
                <ExternalLink size={10} /> Click to open
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Quick Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleOpenWorkspace}
            className="flex items-center gap-1 rounded-xl bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-cyan-500 transition cursor-pointer"
            title="Open in Workspace"
          >
            <Eye size={13} />
            <span className="hidden sm:inline">Open</span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="rounded-xl border border-slate-200/80 bg-white/90 p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-[#141824]/90 dark:text-slate-300 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Copy code"
          >
            {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="rounded-xl border border-slate-200/80 bg-white/90 p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-[#141824]/90 dark:text-slate-300 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Download file"
          >
            <Download size={14} />
          </button>

          {/* AI Actions Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(!menuOpen);
              }}
              className="flex items-center gap-1 rounded-xl border border-slate-200/80 bg-white/90 px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-[#141824]/90 dark:text-slate-300 dark:hover:bg-slate-800 transition cursor-pointer"
              title="AI Artifact Actions"
            >
              <Sparkles size={13} className="text-cyan-500" />
              <ChevronDown size={12} />
            </button>

            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  className="absolute right-0 top-full z-dropdown mt-1 w-48 max-w-[calc(100vw-24px)] overflow-hidden rounded-2xl border border-slate-200 bg-white p-1 shadow-xl backdrop-blur-md dark:border-slate-800 dark:bg-[#131724]"
                  onMouseLeave={() => setMenuOpen(false)}
                >
                  <button
                    type="button"
                    onClick={() => handleAction("Explain step-by-step how this code works")}
                    className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/80 cursor-pointer"
                  >
                    <Lightbulb size={13} className="text-amber-500" />
                    <span>Explain Code</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAction("Analyze this code for potential bugs, edge cases, and vulnerabilities")}
                    className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/80 cursor-pointer"
                  >
                    <Bug size={13} className="text-red-500" />
                    <span>Find Bugs & Fix</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAction("Improve readability, optimize performance, and refactor")}
                    className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/80 cursor-pointer"
                  >
                    <Sparkles size={13} className="text-cyan-500" />
                    <span>Improve & Optimize</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAction("Generate comprehensive unit tests covering happy and error paths for")}
                    className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/80 cursor-pointer"
                  >
                    <TestTube size={13} className="text-purple-500" />
                    <span>Generate Tests</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
