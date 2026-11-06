import { useState, useEffect, useRef, useMemo } from "react";
import {
  X,
  RotateCcw,
  Copy,
  Check,
  Download,
  Maximize2,
  Minimize2,
  Code2,
  Eye,
  FileText,
  Search,
  History,
  Sparkles,
  Bug,
  Lightbulb,
  TestTube,
  FileSpreadsheet,
  Archive,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { WorkspaceArtifact, ArtifactVersion } from "../utils/artifactManager";
import {
  saveArtifact,
  restoreArtifactVersion,
  getLocalArtifacts,
} from "../utils/artifactManager";
import {
  exportTableToExcel,
  exportTableToCSV,
  exportTableToJSON,
  exportTableToPDF,
  exportArtifactsZip,
  triggerBrowserDownload,
} from "../utils/exportEngine";
import { EXTENSION_TO_MIME_MAP } from "../utils/artifactConfig";
import MarkdownRenderer from "./MarkdownRenderer";

interface WorkspacePanelProps {
  artifact: WorkspaceArtifact | null;
  onClose: () => void;
  onUpdateArtifact?: (updated: WorkspaceArtifact) => void;
  isMobile?: boolean;
}

export default function WorkspacePanel({
  artifact: initialArtifact,
  onClose,
  onUpdateArtifact,
  isMobile = false,
}: WorkspacePanelProps) {
  const [currentArtifact, setCurrentArtifact] = useState<WorkspaceArtifact | null>(initialArtifact);
  const [activeTab, setActiveTab] = useState<"preview" | "code" | "document" | "data">("code");
  const [content, setContent] = useState(initialArtifact?.content || "");
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  // Search & Navigation in Editor
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [goToLineText, setGoToLineText] = useState("");
  const [highlightedLineRange, setHighlightedLineRange] = useState<{ start: number; end: number } | null>(null);

  // Version History Drawer
  const [versionDrawerOpen, setVersionDrawerOpen] = useState(false);
  const [selectedCompareVersion, setSelectedCompareVersion] = useState<ArtifactVersion | null>(null);

  // Download Center Menu
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (initialArtifact) {
      setCurrentArtifact(initialArtifact);
      setContent(initialArtifact.content);
      const lang = (initialArtifact.language || "").toLowerCase();

      if (lang === "html" || lang === "svg") {
        setActiveTab("preview");
      } else if (lang === "md" || lang === "markdown") {
        setActiveTab("document");
      } else if (lang === "csv" || lang === "json") {
        setActiveTab("data");
      } else {
        setActiveTab("code");
      }
    }
  }, [initialArtifact]);

  // Listen for target jump event from in-chat file references (e.g. auth.php:142-158)
  useEffect(() => {
    const handleTargetJump = (e: Event) => {
      const custom = e as CustomEvent<{ filename: string; lineStart?: number; lineEnd?: number }>;
      const { filename, lineStart, lineEnd } = custom.detail || {};

      if (filename && currentArtifact) {
        // If matches or close match
        if (
          currentArtifact.filename.toLowerCase() === filename.toLowerCase() ||
          currentArtifact.title.toLowerCase().includes(filename.toLowerCase())
        ) {
          setActiveTab("code");
          if (typeof lineStart === "number") {
            setHighlightedLineRange({
              start: lineStart,
              end: lineEnd || lineStart,
            });
            setTimeout(() => {
              if (textareaRef.current) {
                const lines = content.split("\n");
                let charPos = 0;
                for (let i = 0; i < Math.min(lineStart - 1, lines.length); i++) {
                  charPos += lines[i].length + 1;
                }
                textareaRef.current.focus();
                textareaRef.current.setSelectionRange(charPos, charPos + (lines[lineStart - 1]?.length || 0));
              }
            }, 150);
          }
        }
      }
    };

    window.addEventListener("zyrochat:open-workspace-target", handleTargetJump);
    return () => window.removeEventListener("zyrochat:open-workspace-target", handleTargetJump);
  }, [currentArtifact, content]);

  // Keyboard shortcut Ctrl+F / Cmd+F to toggle search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
        setVersionDrawerOpen(false);
        setDownloadMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const lines = useMemo(() => content.split("\n"), [content]);

  const searchMatchesCount = useMemo(() => {
    if (!currentArtifact || !searchQuery.trim()) return 0;
    const q = searchQuery.toLowerCase();
    return lines.filter((l) => l.toLowerCase().includes(q)).length;
  }, [currentArtifact, searchQuery, lines]);

  if (!currentArtifact) return null;

  const lang = (currentArtifact.language || "text").toLowerCase();
  const isHtmlLike =
    lang === "html" ||
    lang === "svg" ||
    content.includes("<!DOCTYPE") ||
    content.includes("<html");
  const isDataFile = lang === "csv" || lang === "json";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    const updated = saveArtifact(
      {
        ...currentArtifact,
        content: newContent,
      },
      "User edit"
    );
    setCurrentArtifact(updated);
    if (onUpdateArtifact) {
      onUpdateArtifact(updated);
    }
  };

  const handleRestoreVersion = (verNum: number) => {
    const restored = restoreArtifactVersion(currentArtifact.id, verNum);
    if (restored) {
      setCurrentArtifact(restored);
      setContent(restored.content);
      setSelectedCompareVersion(null);
      setVersionDrawerOpen(false);
      if (onUpdateArtifact) onUpdateArtifact(restored);
    }
  };

  const handleDownloadOriginal = () => {
    const ext = currentArtifact.filename.split(".").pop() || "txt";
    const mime = EXTENSION_TO_MIME_MAP[ext] || "text/plain;charset=utf-8";
    const blob = new Blob([content], { type: mime });
    triggerBrowserDownload(blob, currentArtifact.filename);
    setDownloadMenuOpen(false);
  };

  const handleDownloadAllZip = () => {
    const all = getLocalArtifacts();
    exportArtifactsZip(all.length > 0 ? all : [currentArtifact], "zyrochat-project.zip");
    setDownloadMenuOpen(false);
  };

  const handleExportTable = (type: "excel" | "csv" | "json" | "pdf") => {
    setDownloadMenuOpen(false);
    let headers: string[] = [];
    let rows: (string | number)[][] = [];

    if (lang === "csv") {
      const parsedLines = content.split("\n").map((l) => l.split(","));
      if (parsedLines.length > 0) {
        headers = parsedLines[0].map((h) => h.trim());
        rows = parsedLines.slice(1).map((r) => r.map((c) => c.trim()));
      }
    } else if (lang === "json") {
      try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === "object") {
          headers = Object.keys(parsed[0]);
          rows = parsed.map((item) => headers.map((h) => item[h]));
        }
      } catch {
        // Fallback to line-by-line format
      }
    }

    if (headers.length === 0) {
      headers = ["Line", "Content"];
      rows = lines.map((l, idx) => [idx + 1, l]);
    }

    const baseName = currentArtifact.filename.replace(/\.[^/.]+$/, "");
    if (type === "excel") exportTableToExcel(headers, rows, baseName);
    if (type === "csv") exportTableToCSV(headers, rows, baseName);
    if (type === "json") exportTableToJSON(headers, rows, baseName);
    if (type === "pdf") exportTableToPDF(headers, rows, currentArtifact.title);
  };

  const handleAiAction = (actionPrompt: string) => {
    const full = `${actionPrompt} in \`${currentArtifact.filename}\`:\n\n\`\`\`${currentArtifact.language}\n${content.slice(0, 4000)}\n\`\`\``;
    window.dispatchEvent(
      new CustomEvent("zyrochat:use-prompt", {
        detail: { prompt: full },
      })
    );
  };

  const handleJumpToLine = () => {
    const target = parseInt(goToLineText.trim(), 10);
    if (!isNaN(target) && target >= 1 && target <= lines.length) {
      setHighlightedLineRange({ start: target, end: target });
      if (textareaRef.current) {
        let charPos = 0;
        for (let i = 0; i < target - 1; i++) {
          charPos += lines[i].length + 1;
        }
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(charPos, charPos + (lines[target - 1]?.length || 0));
      }
      setGoToLineText("");
    }
  };

  // Sandboxed HTML document
  const buildIframeDoc = () => {
    if (content.includes("<!DOCTYPE html>") || content.includes("<html")) {
      return content;
    }
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 1.5rem;
      background: #ffffff;
      color: #0f172a;
    }
    @media (prefers-color-scheme: dark) {
      body { background: #0b0f19; color: #f8fafc; }
    }
  </style>
</head>
<body>
  ${content}
</body>
</html>`;
  };

  return (
    <div
      className={`flex flex-col border-l border-slate-200/80 bg-white dark:border-slate-800/80 dark:bg-[#0c0e15] shadow-2xl transition-all duration-200 ${
        isFullscreen
          ? "fixed inset-0 z-modal w-full h-full h-[100dvh]"
          : "fixed inset-0 z-workspace w-full h-full h-[100dvh] sm:left-auto sm:w-[480px] sm:max-w-full sm:border-l sm:shadow-2xl lg:static lg:z-auto lg:h-full lg:w-[420px] xl:w-[540px] 2xl:w-[620px] shrink-0"
      }`}
    >
      {/* 1. Header Toolbar */}
      <div className="flex items-center justify-between border-b border-slate-200/80 px-4 py-2.5 bg-slate-50/80 dark:border-slate-800/80 dark:bg-[#10131c]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-500 border border-cyan-500/20 shrink-0">
            {isHtmlLike ? <Eye size={14} /> : <Code2 size={14} />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-xs font-bold text-slate-800 dark:text-slate-100">
                {currentArtifact.filename}
              </span>
              <span className="rounded bg-slate-200/80 px-1.5 py-0.5 text-[9px] font-mono font-semibold uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {currentArtifact.language}
              </span>
              <button
                type="button"
                onClick={() => setVersionDrawerOpen(!versionDrawerOpen)}
                className="flex items-center gap-1 rounded bg-cyan-500/15 px-1.5 py-0.5 text-[9px] font-bold text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/25 transition cursor-pointer"
                title="View Version History"
              >
                <History size={10} />
                <span>v{currentArtifact.version}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setSearchOpen(!searchOpen)}
            className={`rounded-lg p-1.5 transition cursor-pointer ${
              searchOpen
                ? "bg-cyan-500/20 text-cyan-500"
                : "text-slate-400 hover:bg-slate-200/70 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            }`}
            title="Search & Go to Line (Ctrl+F)"
          >
            <Search size={14} />
          </button>

          {isHtmlLike && activeTab === "preview" && (
            <button
              type="button"
              onClick={() => setIframeKey((k) => k + 1)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/70 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer"
              title="Reload preview"
            >
              <RotateCcw size={14} />
            </button>
          )}

          <button
            type="button"
            onClick={handleCopy}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/70 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer"
            title="Copy code"
          >
            {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
          </button>

          {/* Download Center Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setDownloadMenuOpen(!downloadMenuOpen)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/70 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer"
              title="Download Center"
            >
              <Download size={14} />
            </button>
            <AnimatePresence>
              {downloadMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  className="absolute right-0 top-full z-dropdown mt-1 w-48 max-w-[calc(100vw-24px)] overflow-hidden rounded-2xl border border-slate-200 bg-white p-1 shadow-xl backdrop-blur-md dark:border-slate-800 dark:bg-[#141824]"
                  onMouseLeave={() => setDownloadMenuOpen(false)}
                >
                  <button
                    type="button"
                    onClick={handleDownloadOriginal}
                    className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/80 cursor-pointer font-medium"
                  >
                    <Code2 size={13} className="text-cyan-500" />
                    <span>Download Original ({currentArtifact.filename.split(".").pop()?.toUpperCase()})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExportTable("excel")}
                    className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/80 cursor-pointer"
                  >
                    <FileSpreadsheet size={13} className="text-emerald-500" />
                    <span>Excel Workbook (.xlsx)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExportTable("csv")}
                    className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/80 cursor-pointer"
                  >
                    <FileText size={13} className="text-blue-500" />
                    <span>CSV Format (.csv)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExportTable("json")}
                    className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/80 cursor-pointer"
                  >
                    <Code2 size={13} className="text-amber-500" />
                    <span>JSON Data (.json)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExportTable("pdf")}
                    className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/80 cursor-pointer"
                  >
                    <FileText size={13} className="text-rose-500" />
                    <span>Printable PDF (.pdf)</span>
                  </button>

                  <hr className="my-1 border-slate-100 dark:border-slate-800" />

                  <button
                    type="button"
                    onClick={handleDownloadAllZip}
                    className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-xs text-cyan-600 hover:bg-cyan-50 dark:text-cyan-400 dark:hover:bg-cyan-950/30 cursor-pointer font-medium"
                  >
                    <Archive size={13} />
                    <span>Download All (ZIP)</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {!isMobile && (
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/70 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer"
              title={isFullscreen ? "Restore size" : "Maximize workspace"}
            >
              {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-500/10 hover:text-red-500 cursor-pointer"
            title="Close workspace panel"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* In-Editor Search & Go To Line Bar */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex items-center justify-between gap-2 border-b border-cyan-500/30 bg-cyan-500/5 px-3 py-1.5 text-xs dark:bg-cyan-950/30"
          >
            <div className="flex items-center gap-2 flex-1">
              <Search size={12} className="text-cyan-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Find in code (Ctrl+F)..."
                autoFocus
                className="w-44 rounded-lg border border-slate-300 bg-white px-2 py-0.5 text-xs text-slate-800 outline-none focus:border-cyan-500 dark:border-slate-700 dark:bg-[#12151e] dark:text-white"
              />
              {searchQuery && (
                <span className="text-[10px] text-slate-400">
                  {searchMatchesCount} match{searchMatchesCount === 1 ? "" : "es"}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="1"
                max={lines.length}
                value={goToLineText}
                onChange={(e) => setGoToLineText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleJumpToLine()}
                placeholder="Line #"
                className="w-16 rounded-lg border border-slate-300 bg-white px-1.5 py-0.5 text-xs text-slate-800 outline-none focus:border-cyan-500 dark:border-slate-700 dark:bg-[#12151e] dark:text-white"
              />
              <button
                type="button"
                onClick={handleJumpToLine}
                className="rounded-lg bg-cyan-600 px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-cyan-500 cursor-pointer"
              >
                Go
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Mode Tabs (Preview / Code / Document / Table Data) */}
      <div className="flex items-center justify-between border-b border-slate-200/70 bg-slate-100/50 px-3 py-1.5 text-xs dark:border-slate-800/70 dark:bg-[#090b10]">
        <div className="flex items-center gap-1">
          {isHtmlLike && (
            <button
              type="button"
              onClick={() => setActiveTab("preview")}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition cursor-pointer ${
                activeTab === "preview"
                  ? "bg-white text-cyan-600 shadow-sm dark:bg-[#161a26] dark:text-cyan-400 font-semibold"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <Eye size={13} />
              <span>Preview</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab("code")}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition cursor-pointer ${
              activeTab === "code"
                ? "bg-white text-cyan-600 shadow-sm dark:bg-[#161a26] dark:text-cyan-400 font-semibold"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <Code2 size={13} />
            <span>Code Editor</span>
          </button>

          {(lang === "md" || lang === "markdown") && (
            <button
              type="button"
              onClick={() => setActiveTab("document")}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition cursor-pointer ${
                activeTab === "document"
                  ? "bg-white text-cyan-600 shadow-sm dark:bg-[#161a26] dark:text-cyan-400 font-semibold"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <FileText size={13} />
              <span>Document</span>
            </button>
          )}

          {isDataFile && (
            <button
              type="button"
              onClick={() => setActiveTab("data")}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition cursor-pointer ${
                activeTab === "data"
                  ? "bg-white text-cyan-600 shadow-sm dark:bg-[#161a26] dark:text-cyan-400 font-semibold"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <FileSpreadsheet size={13} />
              <span>Table Data</span>
            </button>
          )}
        </div>

        {/* AI Quick Actions Bar */}
        <div className="flex items-center gap-1 overflow-x-auto text-[11px]">
          <button
            type="button"
            onClick={() => handleAiAction("Explain this code step-by-step")}
            className="flex items-center gap-1 rounded-md px-2 py-0.5 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 dark:text-slate-400 transition cursor-pointer"
            title="Explain artifact"
          >
            <Lightbulb size={11} className="text-amber-500" />
            <span>Explain</span>
          </button>
          <button
            type="button"
            onClick={() => handleAiAction("Find bugs and edge cases in")}
            className="flex items-center gap-1 rounded-md px-2 py-0.5 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 dark:text-slate-400 transition cursor-pointer"
            title="Find bugs"
          >
            <Bug size={11} className="text-red-500" />
            <span>Fix</span>
          </button>
          <button
            type="button"
            onClick={() => handleAiAction("Improve and optimize")}
            className="flex items-center gap-1 rounded-md px-2 py-0.5 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 dark:text-slate-400 transition cursor-pointer"
            title="Improve code"
          >
            <Sparkles size={11} className="text-cyan-500" />
            <span>Improve</span>
          </button>
          <button
            type="button"
            onClick={() => handleAiAction("Generate unit tests for")}
            className="flex items-center gap-1 rounded-md px-2 py-0.5 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 dark:text-slate-400 transition cursor-pointer"
            title="Generate unit tests"
          >
            <TestTube size={11} className="text-purple-500" />
            <span>Tests</span>
          </button>
        </div>
      </div>

      {/* 3. Panel Body */}
      <div className="relative flex-1 overflow-hidden">
        {/* Version History Drawer */}
        <AnimatePresence>
          {versionDrawerOpen && (
            <motion.div
              initial={{ x: 280, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 280, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="absolute right-0 top-0 bottom-0 z-dropdown w-72 max-w-[calc(100vw-24px)] border-l border-slate-200 bg-white/95 p-3 shadow-2xl backdrop-blur-md dark:border-slate-800 dark:bg-[#10131d]/95 flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800 dark:text-slate-100">
                  <History size={13} className="text-cyan-500" />
                  <span>Version History</span>
                </div>
                <button
                  type="button"
                  onClick={() => setVersionDrawerOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X size={13} />
                </button>
              </div>

              {selectedCompareVersion && (
                <div className="mt-2 flex items-center justify-between rounded-lg bg-cyan-500/10 px-2 py-1.5 text-[11px] text-cyan-600 dark:text-cyan-400">
                  <span>Selected v{selectedCompareVersion.version} ({selectedCompareVersion.lineCount} lines)</span>
                  <button
                    type="button"
                    onClick={() => setSelectedCompareVersion(null)}
                    className="text-cyan-500 hover:text-cyan-700 ml-1"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}

              <div className="flex-1 overflow-y-auto py-2 space-y-2">
                {currentArtifact.versions?.map((v) => {
                  const isCurrent = v.version === currentArtifact.version;
                  return (
                    <div
                      key={v.version}
                      className={`rounded-xl border p-2.5 text-xs transition ${
                        isCurrent
                          ? "border-cyan-500/50 bg-cyan-500/10 dark:bg-cyan-950/20"
                          : "border-slate-200/80 bg-slate-50/50 dark:border-slate-800 dark:bg-[#141824]"
                      }`}
                    >
                      <div className="flex items-center justify-between font-semibold">
                        <span className="text-cyan-600 dark:text-cyan-400">
                          Version {v.version} {isCurrent && "(Active)"}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(v.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                        {v.summary || "Snapshot"} • {v.lineCount} lines
                      </p>
                      {!isCurrent && (
                        <div className="mt-2 flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleRestoreVersion(v.version)}
                            className="rounded-lg bg-cyan-600 px-2 py-1 text-[10px] font-semibold text-white hover:bg-cyan-500 transition cursor-pointer"
                          >
                            Restore
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedCompareVersion(v)}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 transition cursor-pointer"
                          >
                            Compare
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Live Preview Tab */}
        {activeTab === "preview" && isHtmlLike && (
          <div className="h-full w-full bg-white dark:bg-[#06080d]">
            <iframe
              key={iframeKey}
              title="Workspace Live Preview"
              srcDoc={buildIframeDoc()}
              sandbox="allow-scripts allow-modals allow-same-origin"
              className="h-full w-full border-0"
            />
          </div>
        )}

        {/* Code Editor Tab with Gutter & Line Numbers */}
        {activeTab === "code" && (
          <div className="flex h-full bg-[#0b0e14]">
            {/* Line Numbers Gutter */}
            <div className="w-12 shrink-0 select-none overflow-hidden bg-[#090b10] py-3 pr-2 font-mono text-[11px] text-right text-slate-600 border-r border-white/5">
              {lines.map((_, idx) => {
                const lineNum = idx + 1;
                const isHighlighted =
                  highlightedLineRange &&
                  lineNum >= highlightedLineRange.start &&
                  lineNum <= highlightedLineRange.end;
                return (
                  <div
                    key={idx}
                    className={`leading-relaxed px-1 ${
                      isHighlighted
                        ? "bg-cyan-500/30 text-cyan-300 font-bold rounded"
                        : ""
                    }`}
                  >
                    {lineNum}
                  </div>
                );
              })}
            </div>

            {/* Code Content */}
            <div className="flex-1 flex flex-col min-w-0">
              <div className="flex-1 overflow-auto p-3">
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => handleContentChange(e.target.value)}
                  spellCheck={false}
                  className="h-full w-full resize-none bg-transparent font-mono text-xs leading-relaxed text-slate-200 outline-none placeholder:text-slate-600"
                  placeholder="Write or edit code here..."
                />
              </div>

              <div className="flex items-center justify-between border-t border-white/5 bg-[#090b10] px-3 py-1.5 text-[11px] text-slate-400">
                <span>
                  Lines: {lines.length} • Size: {(new Blob([content]).size / 1024).toFixed(1)} KB
                </span>
                <span>UTF-8 • {currentArtifact.language || "plaintext"}</span>
              </div>
            </div>
          </div>
        )}

        {/* Document Markdown Tab */}
        {activeTab === "document" && (
          <div className="h-full overflow-y-auto p-5 bg-white dark:bg-[#0c0e15] prose max-w-none dark:prose-invert">
            <MarkdownRenderer text={content} />
          </div>
        )}

        {/* Table Data Viewer Tab (for CSV/JSON) */}
        {activeTab === "data" && (
          <div className="h-full overflow-auto p-4 bg-white dark:bg-[#0c0e15]">
            {lang === "csv" ? (
              <table className="min-w-full border-collapse text-left text-xs border border-slate-200 dark:border-slate-800">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800">
                    {lines[0]?.split(",").map((h, i) => (
                      <th key={i} className="border border-slate-200 dark:border-slate-800 p-2 font-bold">
                        {h.trim()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lines.slice(1).map((row, rIdx) => (
                    <tr key={rIdx} className="even:bg-slate-50 dark:even:bg-slate-900/40">
                      {row.split(",").map((cell, cIdx) => (
                        <td key={cIdx} className="border border-slate-200 dark:border-slate-800 p-2 text-slate-600 dark:text-slate-300">
                          {cell.trim()}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <pre className="font-mono text-xs text-slate-300 bg-[#0a0c10] p-4 rounded-xl overflow-auto h-full">
                {(() => {
                  try {
                    return JSON.stringify(JSON.parse(content), null, 2);
                  } catch {
                    return content;
                  }
                })()}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
