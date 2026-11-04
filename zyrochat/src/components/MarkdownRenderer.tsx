import React, { useState, useCallback, useMemo, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import {
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Play,
  Terminal,
  Code2,
  Download,
  Table as TableIcon,
  FileSpreadsheet,
  FileText,
  FileCode,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  exportTableToExcel,
  exportTableToCSV,
  exportTableToJSON,
  exportTableToPDF,
} from "../utils/exportEngine";
import {
  shouldCreateArtifact,
  createWorkspaceArtifact,
  saveArtifact,
  getLocalArtifacts,
} from "../utils/artifactManager";
import ArtifactReferenceCard from "./ArtifactReferenceCard";

// Renders a single fenced code block with a copy button or transforms into an Artifact Card if large.
// React.memo prevents this block from re-rendering unless its code or language changes.
const CodeBlockCopy = React.memo(
  ({ code, language, title }: { code: string; language: string; title?: string }) => {
    const [copied, setCopied] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(true);
    const [runOutput, setRunOutput] = useState<string | null>(null);
    const [isRunning, setIsRunning] = useState(false);
    const [showRawCode, setShowRawCode] = useState(false);

    // Check if code ends with streaming cursor
    const hasCursor = code.endsWith("||STREAMING_CURSOR||");
    const cleanCode = hasCursor ? code.slice(0, -20) : code;
    const lines = cleanCode.split("\n");
    const isLongCode = lines.length > 18;
    const shouldCollapse = isLongCode && isCollapsed && !hasCursor;

    const lowerLang = (language || "text").toLowerCase();

    // Check artifact threshold
    const isArtifactCandidate =
      !hasCursor && shouldCreateArtifact(cleanCode, lowerLang, Boolean(title));

    const artifactRef = useMemo(() => {
      if (!isArtifactCandidate) return null;
      const existing = getLocalArtifacts().find(
        (a) => a.content === cleanCode || (title && a.filename === title)
      );
      if (existing) return existing;
      const created = createWorkspaceArtifact(cleanCode, lowerLang, title);
      saveArtifact(created);
      return created;
    }, [isArtifactCandidate, cleanCode, lowerLang, title]);
    const isRunnable = ["javascript", "js", "typescript", "ts", "html"].includes(lowerLang);

    // Runs supported code scripts directly in the browser sandboxed context
    const handleRun = useCallback(() => {
      if (lowerLang === "html") {
        setRunOutput("HTML rendering started. Live preview active below.");
        return;
      }

      setIsRunning(true);
      setRunOutput(null);

      // Brief timeout to let button UI update
      setTimeout(() => {
        try {
          const logs: string[] = [];
          const customConsole = {
            log: (...args: any[]) => {
              logs.push(args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' '));
            },
            error: (...args: any[]) => {
              logs.push(`Error: ${args.join(' ')}`);
            },
            warn: (...args: any[]) => {
              logs.push(`Warning: ${args.join(' ')}`);
            },
            info: (...args: any[]) => {
              logs.push(`Info: ${args.join(' ')}`);
            }
          };

          // Wrap cleanCode execution in a sandboxed Function container
          const executeCode = new Function("console", cleanCode);
          executeCode(customConsole);

          setRunOutput(logs.length > 0 ? logs.join("\n") : "Code executed successfully with no console output.");
        } catch (err: any) {
          setRunOutput(`Runtime Error: ${err.message}`);
        } finally {
          setIsRunning(false);
        }
      }, 50);
    }, [cleanCode, lowerLang]);

    // Copies the code text to the user's clipboard.
    // After a successful copy, it briefly changes the button label to "Copied".
    const handleCopy = useCallback(async () => {
      try {
        await navigator.clipboard.writeText(cleanCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      } catch (err) {
        console.error("Copy failed:", err);
      }
    }, [cleanCode]);

    const handleDownload = useCallback(() => {
      const extMap: Record<string, string> = {
        javascript: "js",
        js: "js",
        typescript: "ts",
        ts: "ts",
        python: "py",
        py: "py",
        html: "html",
        css: "css",
        json: "json",
        sql: "sql",
        bash: "sh",
        sh: "sh",
        markdown: "md",
        md: "md",
        cpp: "cpp",
        c: "c",
        java: "java",
        go: "go",
        rust: "rs",
        yaml: "yml",
        yml: "yml",
      };
      const ext = extMap[lowerLang] || "txt";
      const blob = new Blob([cleanCode], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `code-snippet.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    }, [cleanCode, lowerLang]);

    if (isArtifactCandidate && artifactRef && !showRawCode) {
      return (
        <div className="my-3">
          <ArtifactReferenceCard artifact={artifactRef} />
          <button
            type="button"
            onClick={() => setShowRawCode(true)}
            className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-cyan-500 transition cursor-pointer px-1 mt-1"
          >
            <ChevronDown size={12} />
            <span>Show inline code ({lines.length} lines)</span>
          </button>
        </div>
      );
    }

    return (
      <div className="group my-4 overflow-hidden rounded-2xl border border-slate-200/80 bg-[#0a0c10] shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:border-slate-800/80 max-w-full min-w-0">
        {isArtifactCandidate && showRawCode && (
          <div className="flex items-center justify-between border-b border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-600 dark:text-cyan-400">
            <span className="font-semibold text-[11px]">Artifact Code View</span>
            <button
              type="button"
              onClick={() => setShowRawCode(false)}
              className="flex items-center gap-1 text-[10px] font-semibold hover:underline cursor-pointer"
            >
              <ChevronUp size={12} />
              <span>Collapse to Artifact Card</span>
            </button>
          </div>
        )}
        {/* Editor style header */}
        <div className="flex items-center justify-between border-b border-white/5 bg-[#111319] px-3 sm:px-4 py-2 sm:py-2.5 gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Window control dots */}
            <div className="flex items-center gap-1.5 mr-1 select-none shrink-0">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f56]/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#27c93f]/80" />
            </div>
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-slate-400 font-semibold select-none truncate">
              <span className="truncate">{language}</span>
              {hasCursor && (
                <span className="ml-2 flex items-center gap-1.5 shrink-0">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                  <span className="text-[9px] text-emerald-400 font-bold tracking-widest uppercase">Streaming...</span>
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {isRunnable && !hasCursor && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleRun}
                disabled={isRunning}
                className="flex items-center gap-1 rounded-lg bg-emerald-600/10 px-2 sm:px-2.5 py-1 text-xs font-semibold text-emerald-500 hover:bg-emerald-600/20 disabled:opacity-50 transition cursor-pointer select-none"
                title="Run script"
              >
                <Play size={11} fill="currentColor" />
                <span>{isRunning ? "Running..." : "Run"}</span>
              </motion.button>
            )}

            {!hasCursor && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent("zyrochat:open-workspace", {
                      detail: {
                        id: `art-${Date.now()}`,
                        title: `${language.toUpperCase()} Snippet`,
                        language: lowerLang,
                        type: ["html", "svg"].includes(lowerLang) ? "html" : "code",
                        content: cleanCode,
                      },
                    })
                  );
                }}
                className="flex items-center gap-1 rounded-lg bg-cyan-500/10 px-2 sm:px-2.5 py-1 text-xs font-semibold text-cyan-400 hover:bg-cyan-500/20 transition cursor-pointer select-none border border-cyan-500/20"
                title="Open in side-by-side Workspace"
              >
                <Code2 size={12} />
                <span className="hidden sm:inline">Workspace</span>
              </motion.button>
            )}

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleDownload}
              className="flex items-center gap-1.5 rounded-lg bg-white/5 px-2 sm:px-2.5 py-1 text-xs font-medium text-slate-400 transition hover:bg-white/10 hover:text-white cursor-pointer"
              title="Download code file"
            >
              <Download size={13} />
              <span className="hidden sm:inline">Download</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-lg bg-white/5 px-2 sm:px-2.5 py-1 text-xs font-medium text-slate-400 transition hover:bg-white/10 hover:text-white cursor-pointer"
              title={copied ? "Copied!" : "Copy code"}
            >
              {copied ? (
                <>
                  <Check size={13} />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy size={13} />
                  <span>Copy</span>
                </>
              )}
            </motion.button>
          </div>
        </div>

        {/* Code Content Box */}
        <motion.div
          animate={{ height: shouldCollapse ? 280 : "auto" }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="relative overflow-x-auto overflow-y-hidden w-full max-w-full"
        >
          <SyntaxHighlighter
            style={vscDarkPlus}
            language={language}
            PreTag="div"
            showLineNumbers={true}
            lineNumberStyle={{
              color: "rgba(148, 163, 184, 0.22)",
              minWidth: "2.25em",
              paddingRight: "1.25em",
              textAlign: "right",
              userSelect: "none",
            }}
            customStyle={{
              margin: 0,
              padding: "14px 16px 14px 4px",
              background: "transparent",
              fontSize: "13px",
              lineHeight: "1.65",
              overflowX: "auto",
              maxWidth: "100%",
            }}
          >
            {cleanCode}
          </SyntaxHighlighter>

          {/* Fade mask at bottom of collapsed blocks */}
          {shouldCollapse && (
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#0a0c10] via-[#0a0c10]/85 to-transparent pointer-events-none" />
          )}
        </motion.div>

        {/* Expand / Collapse Control bar */}
        {isLongCode && !hasCursor && (
          <div className="flex justify-center border-t border-white/5 bg-[#0a0c10] py-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer select-none"
            >
              {shouldCollapse ? (
                <>
                  <ChevronDown size={13} />
                  <span>Show all ({lines.length} lines)</span>
                </>
              ) : (
                <>
                  <ChevronUp size={13} />
                  <span>Show less</span>
                </>
              )}
            </motion.button>
          </div>
        )}

        {/* Sandboxed HTML iframe preview panel */}
        {lowerLang === "html" && runOutput !== null && (
          <div className="border-t border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex items-center justify-between pb-2 text-[10px] uppercase tracking-wider text-slate-500 font-bold select-none">
              <span>Live Preview</span>
              <button
                type="button"
                onClick={() => setRunOutput(null)}
                className="text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 cursor-pointer font-bold"
              >
                Close Preview
              </button>
            </div>
            <iframe
              title="HTML Preview"
              srcDoc={cleanCode}
              className="w-full min-h-[180px] rounded-xl border border-slate-200 bg-white dark:border-slate-750"
              sandbox="allow-scripts"
            />
          </div>
        )}

        {/* Text/JS Console Output block */}
        {lowerLang !== "html" && runOutput !== null && (
          <div className="border-t border-white/5 bg-[#07090d] p-3.5 font-mono text-xs">
            <div className="flex items-center justify-between pb-2 text-[10px] uppercase tracking-wider text-slate-500 font-bold select-none">
              <span className="flex items-center gap-1.5">
                <Terminal size={11} />
                <span>Console Output</span>
              </span>
              <button
                type="button"
                onClick={() => setRunOutput(null)}
                className="hover:text-slate-350 cursor-pointer font-bold"
              >
                Clear
              </button>
            </div>
            <pre className="whitespace-pre-wrap leading-relaxed text-slate-300 break-all">{runOutput}</pre>
          </div>
        )}
      </div>
    );
  }
);

CodeBlockCopy.displayName = "CodeBlockCopy";

const MarkdownImage = React.memo(
  ({ src, alt }: { src?: string; alt?: string }) => {
    const [failed, setFailed] = useState(false);

    if (!src) return null;

    if (failed) {
      return (
        <span className="inline-block my-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
          Image could not load.{" "}
          <a
            href={src}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            Open in new tab
          </a>
        </span>
      );
    }

    return (
      <a href={src} target="_blank" rel="noreferrer" className="block">
        <img
          src={src}
          alt={alt || "Generated image"}
          loading="lazy"
          onError={() => setFailed(true)}
          className="my-4 max-h-[520px] w-full max-w-full h-auto rounded-2xl border border-slate-200 object-contain shadow-[0_18px_45px_-28px_rgba(15,23,42,0.5)] dark:border-slate-700"
        />
      </a>
    );
  }
);

MarkdownImage.displayName = "MarkdownImage";

// Helper to recursively inject the animated typing cursor at the end of the children stream
const renderWithCursor = (content: React.ReactNode): React.ReactNode => {
  if (typeof content === "string") {
    if (content.endsWith("||STREAMING_CURSOR||")) {
      const mainText = content.substring(0, content.length - 20); // remove "||STREAMING_CURSOR||"
      return (
        <>
          {mainText}
          <span className="streaming-cursor" />
        </>
      );
    }
    return content;
  }

  if (Array.isArray(content)) {
    return content.map((child, index) => {
      // Only process the last child of the array to inject cursor at the very end
      if (index === content.length - 1) {
        return renderWithCursor(child);
      }
      return child;
    });
  }

  if (React.isValidElement(content)) {
    const element = content as React.ReactElement<any>;
    if (element.props && element.props.children) {
      return React.cloneElement(element, {
        ...element.props,
        children: renderWithCursor(element.props.children),
      });
    }
  }

  return content;
};

// Exportable Table wrapper with Excel, CSV, JSON, and PDF download actions
const ExportableTable = ({ children }: { children: React.ReactNode }) => {
  const tableRef = useRef<HTMLTableElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const getTableData = useCallback(() => {
    if (!tableRef.current) return { headers: [], rows: [] };
    const ths = Array.from(tableRef.current.querySelectorAll("thead th")).map(
      (th) => th.textContent?.trim() || ""
    );
    const trs = Array.from(tableRef.current.querySelectorAll("tbody tr"));
    const rows = trs.map((tr) =>
      Array.from(tr.querySelectorAll("td")).map((td) => td.textContent?.trim() || "")
    );
    return { headers: ths, rows };
  }, []);

  const handleExport = (type: "excel" | "csv" | "json" | "pdf") => {
    setMenuOpen(false);
    const { headers, rows } = getTableData();
    if (!headers.length && !rows.length) return;

    if (type === "excel") exportTableToExcel(headers, rows, "table_data");
    if (type === "csv") exportTableToCSV(headers, rows, "table_data");
    if (type === "json") exportTableToJSON(headers, rows, "table_data");
    if (type === "pdf") exportTableToPDF(headers, rows, "Table Data Export");
  };

  return (
    <div className="my-4 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/70 max-w-full min-w-0">
      <div className="flex items-center justify-between border-b border-slate-200/60 bg-slate-50/80 px-3.5 py-1.5 text-xs dark:border-slate-800 dark:bg-[#11141d]/80">
        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px] font-medium">
          <TableIcon size={13} className="text-cyan-500" />
          <span>Data Table</span>
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-1 rounded-lg border border-slate-200/80 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-[#151926] dark:text-slate-300 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <Download size={11} className="text-cyan-500" />
            <span>Export Table</span>
            <ChevronDown size={10} />
          </button>
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                className="absolute right-0 top-full z-dropdown mt-1 w-36 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl backdrop-blur dark:border-slate-800 dark:bg-[#141724]"
                onMouseLeave={() => setMenuOpen(false)}
              >
                <button
                  type="button"
                  onClick={() => handleExport("excel")}
                  className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1 text-left text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <FileSpreadsheet size={12} className="text-emerald-500" />
                  <span>Excel (.xlsx)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExport("csv")}
                  className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1 text-left text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <FileText size={12} className="text-blue-500" />
                  <span>CSV (.csv)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExport("json")}
                  className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1 text-left text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <FileCode size={12} className="text-amber-500" />
                  <span>JSON (.json)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExport("pdf")}
                  className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1 text-left text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <FileText size={12} className="text-rose-500" />
                  <span>PDF (.pdf)</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <div className="overflow-x-auto max-w-full min-w-0">
        <table ref={tableRef} className="min-w-full border-collapse text-left text-[13px] sm:text-sm">
          {children}
        </table>
      </div>
    </div>
  );
};

// Converts assistant markdown text into styled React elements.
// It supports GitHub-style markdown, syntax-highlighted code blocks, tables,
// links, lists, headings, and other common response formatting.
const MarkdownRenderer = React.memo(({ text, isStreaming }: { text: string; isStreaming?: boolean }) => {
  const textToRender = isStreaming ? `${text}||STREAMING_CURSOR||` : text;

  return (
    <div className="markdown-output min-w-0 max-w-full break-words [overflow-wrap:anywhere]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Handles both inline code and fenced code blocks.
          // Inline code gets a small pill style, while larger code blocks
          // use the copyable CodeBlockCopy component above.
          code({ inline, className, children }: any) {
            if (inline) {
              return (
                <code className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[0.9em] text-fuchsia-700 dark:bg-slate-800 dark:text-fuchsia-300">
                  {renderWithCursor(children)}
                </code>
              );
            }

            const match = /language-(\w+)/.exec(className || "");
            const titleMatch = /title=["']([^"']+)["']/.exec(className || "");
            const code = String(children).replace(/\n$/, "");
            const language = match?.[1] || "text";
            const title = titleMatch?.[1];

            return <CodeBlockCopy code={code} language={language} title={title} />;
          },

          // Renders level-one headings from markdown.
          h1: ({ children }) => (
            <h1 className="mb-3 mt-5 text-lg font-semibold tracking-tight text-slate-900 dark:text-white sm:text-xl">
              {renderWithCursor(children)}
            </h1>
          ),
          // Renders level-two headings from markdown.
          h2: ({ children }) => (
            <h2 className="mb-2 mt-4 text-base font-semibold tracking-tight text-slate-900 dark:text-white sm:text-lg">
              {renderWithCursor(children)}
            </h2>
          ),
          // Renders level-three headings from markdown.
          h3: ({ children }) => (
            <h3 className="mb-2 mt-4 text-[15px] font-semibold text-slate-800 dark:text-slate-100">
              {renderWithCursor(children)}
            </h3>
          ),
          // Renders normal paragraphs from markdown.
          p: ({ children }) => (
            <p className="mb-3 text-[14px] leading-6 text-slate-700 dark:text-slate-300 sm:text-[15px]">
              {renderWithCursor(children)}
            </p>
          ),
          // Renders unordered bullet lists from markdown.
          ul: ({ children }) => (
            <ul className="mb-3 list-disc space-y-1.5 pl-5 text-[14px] text-slate-700 dark:text-slate-300 sm:text-[15px]">
              {children}
            </ul>
          ),
          // Renders numbered lists from markdown.
          ol: ({ children }) => (
            <ol className="mb-3 list-decimal space-y-1.5 pl-5 text-[14px] text-slate-700 dark:text-slate-300 sm:text-[15px]">
              {children}
            </ol>
          ),
          // Renders each list item with consistent line height.
          li: ({ children }) => <li className="leading-6">{renderWithCursor(children)}</li>,
          // Renders quoted markdown text with a left border.
          blockquote: ({ children }) => (
            <blockquote className="my-4 rounded-r-2xl border-l-2 border-slate-300 bg-slate-50/80 py-2 pl-4 italic text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300">
              {renderWithCursor(children)}
            </blockquote>
          ),
          // Renders bold markdown text.
          strong: ({ children }) => (
            <strong className="font-semibold text-slate-900 dark:text-white">
              {renderWithCursor(children)}
            </strong>
          ),
          // Renders horizontal divider lines.
          hr: () => (
            <hr className="my-4 border-slate-200 dark:border-slate-700" />
          ),
          // Wraps markdown tables in ExportableTable.
          table: ({ children }) => (
            <ExportableTable>{children}</ExportableTable>
          ),
          // Renders the table header area.
          thead: ({ children }) => (
            <thead className="bg-slate-100/90 dark:bg-slate-800/90">
              {children}
            </thead>
          ),
          // Renders table header cells.
          th: ({ children }) => (
            <th className="whitespace-nowrap border-b border-slate-200 px-3 py-2 font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">
              {children}
            </th>
          ),
          // Renders table body cells.
          td: ({ children }) => (
            <td className="whitespace-pre-wrap border-b border-slate-100 px-3 py-2 align-top text-slate-600 dark:border-slate-800 dark:text-slate-300">
              {renderWithCursor(children)}
            </td>
          ),
          // Renders table rows with alternating background colors.
          tr: ({ children }) => (
            <tr className="even:bg-slate-50/60 dark:even:bg-slate-800/30">
              {children}
            </tr>
          ),
          // Renders markdown links in a new browser tab or dispatches workspace file open if referencing a file.
          a: ({ href, children }) => {
            const rawText = String(children || "").trim();
            const cleanRef = rawText.replace(/^[📄\s\[]+|[\]\s]+$/g, "");
            const fileRefMatch = /^(.+?\.(?:html|css|js|ts|jsx|tsx|py|php|sql|json|csv|md|txt))(?::(\d+)(?:-(\d+))?)?$/i.exec(
              href?.replace(/^#/, "") || cleanRef
            );

            if (fileRefMatch) {
              const filename = fileRefMatch[1];
              const lineStart = fileRefMatch[2] ? parseInt(fileRefMatch[2], 10) : undefined;
              const lineEnd = fileRefMatch[3] ? parseInt(fileRefMatch[3], 10) : undefined;

              return (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    window.dispatchEvent(
                      new CustomEvent("zyrochat:open-workspace-target", {
                        detail: { filename, lineStart, lineEnd },
                      })
                    );
                  }}
                  className="inline-flex items-center gap-1 rounded-md bg-cyan-500/15 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-cyan-600 hover:bg-cyan-500/25 dark:bg-cyan-500/20 dark:text-cyan-300 transition cursor-pointer my-0.5"
                  title={`Open ${filename}${lineStart ? ` at line ${lineStart}` : ""}`}
                >
                  <FileCode size={11} />
                  <span>{rawText || filename}</span>
                </button>
              );
            }

            return (
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300 underline underline-offset-2 transition-colors duration-150"
              >
                {renderWithCursor(children)}
              </a>
            );
          },
          // Renders generated images and other markdown images inside chat replies.
          img: ({ src, alt }) => (
            <MarkdownImage src={src} alt={alt || undefined} />
          ),
        }}
      >
        {textToRender}
      </ReactMarkdown>
    </div>
  );
});

MarkdownRenderer.displayName = "MarkdownRenderer";

export default MarkdownRenderer;
