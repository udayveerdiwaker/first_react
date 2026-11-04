import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Search,
  Sparkles,
  BookOpen,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  Check,
  Loader2,
  ChevronRight,
  Globe,
} from "lucide-react";
import { motion } from "framer-motion";
import MarkdownRenderer from "./MarkdownRenderer";

interface ResearchSource {
  title: string;
  url: string;
  snippet: string;
}

interface ResearchSession {
  id: string;
  topic: string;
  status: "planning" | "searching" | "analyzing" | "completed" | "failed";
  plan: { query: string; status: string }[];
  sources: ResearchSource[];
  findings: string[];
  report: string;
  progress: number;
  createdAt: number;
}

interface ResearchPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenWorkspace?: (reportContent: string) => void;
}

export default function ResearchPanelModal({
  isOpen,
  onClose,
  onOpenWorkspace,
}: ResearchPanelModalProps) {
  const [topic, setTopic] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [activeSession, setActiveSession] = useState<ResearchSession | null>(null);
  const [savedSessions, setSavedSessions] = useState<ResearchSession[]>([]);
  const [activeTab, setActiveTab] = useState<"new" | "history">("new");
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const BACKEND_URL =
    import.meta.env.VITE_BACKEND_URL?.replace(/\/$/, "") || "http://localhost:5000";

  // Fetch saved sessions
  const fetchSessions = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/research/sessions`);
      if (res.ok) {
        const data = await res.json();
        setSavedSessions(data.sessions || []);
        if (!activeSession && data.sessions?.length > 0) {
          setActiveSession(data.sessions[0]);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch research sessions:", err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSessions();
    }
  }, [isOpen]);

  const handleStartResearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || isRunning) return;

    setIsRunning(true);
    setErrorMsg("");

    // Optimistic progress state
    const optimisticSession: ResearchSession = {
      id: "res-temp",
      topic: topic.trim(),
      status: "planning",
      plan: [
        { query: `${topic.trim()} market overview trends 2026`, status: "planning" },
        { query: `key competitors comparison ${topic.trim()}`, status: "pending" },
        { query: `${topic.trim()} limitations future outlook`, status: "pending" },
      ],
      sources: [],
      findings: [],
      report: "",
      progress: 25,
      createdAt: Date.now(),
    };
    setActiveSession(optimisticSession);

    try {
      const res = await fetch(`${BACKEND_URL}/api/research/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Research execution failed.");
      }

      const data = await res.json();
      if (data.session) {
        setActiveSession(data.session);
        setSavedSessions((prev) => [data.session, ...prev.filter((s) => s.id !== data.session.id)]);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to complete research.");
    } finally {
      setIsRunning(false);
    }
  };

  const handleCopyReport = () => {
    if (!activeSession?.report) return;
    navigator.clipboard.writeText(activeSession.report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadReport = () => {
    if (!activeSession?.report) return;
    const blob = new Blob([activeSession.report], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Deep_Research_${activeSession.topic.replace(/[^a-z0-9]/gi, "_").slice(0, 30)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-modal flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/70 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.2 }}
        className="flex flex-col w-full max-w-5xl h-[min(88vh,88dvh)] max-h-[100dvh] rounded-2xl border border-slate-700/60 bg-[#0f131f] text-slate-100 shadow-2xl overflow-hidden"
      >
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-800 bg-[#131826] gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-white flex flex-wrap items-center gap-2">
                Deep Research Engine
                <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[11px] font-semibold text-cyan-300 border border-cyan-500/30">
                  Autonomous Multi-Step
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Plans queries, gathers web sources, cross-references findings, and produces academic reports.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end shrink-0">
            <div className="flex rounded-lg bg-slate-900/80 p-0.5 border border-slate-800 text-xs">
              <button
                onClick={() => setActiveTab("new")}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  activeTab === "new" ? "bg-cyan-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                Research View
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  activeTab === "history" ? "bg-cyan-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                History ({savedSessions.length})
              </button>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors shrink-0"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        {activeTab === "new" ? (
          <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
            {/* Left Sidebar: Query input & step pipeline */}
            <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-slate-800/80 bg-[#111624] p-4 sm:p-5 flex flex-col justify-between overflow-y-auto max-h-[35vh] md:max-h-none shrink-0">
              <div>
                <form onSubmit={handleStartResearch} className="space-y-3">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Research Objective
                  </label>
                  <textarea
                    rows={3}
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g., Top 10 competitors in the Indian education market, EV battery supply chain risks 2026..."
                    className="w-full rounded-xl border border-slate-700/70 bg-[#0a0d14] px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 resize-none"
                  />
                  <button
                    type="submit"
                    disabled={isRunning || !topic.trim()}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 py-2 text-xs font-semibold text-white shadow-lg hover:from-cyan-500 hover:to-teal-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isRunning ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Researching...</span>
                      </>
                    ) : (
                      <>
                        <Search size={14} />
                        <span>Start Deep Research</span>
                      </>
                    )}
                  </button>
                </form>

                {errorMsg && (
                  <div className="mt-3 p-2.5 rounded-lg bg-red-950/40 border border-red-900/60 text-xs text-red-400">
                    {errorMsg}
                  </div>
                )}

                {/* Pipeline Progress Stages */}
                {activeSession && (
                  <div className="mt-6 pt-5 border-t border-slate-800 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-300">Live Research Pipeline</span>
                      <span className="font-mono text-cyan-400">{activeSession.progress}%</span>
                    </div>

                    <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-teal-400 transition-all duration-500"
                        style={{ width: `${activeSession.progress}%` }}
                      />
                    </div>

                    <div className="space-y-2 pt-2 text-xs">
                      <div className="flex items-center gap-2 text-slate-300">
                        <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                        <span>Planning structured queries</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-300">
                        {activeSession.progress >= 50 ? (
                          <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                        ) : isRunning ? (
                          <Loader2 size={13} className="text-cyan-400 animate-spin shrink-0" />
                        ) : (
                          <Clock size={13} className="text-slate-600 shrink-0" />
                        )}
                        <span>Searching organic web sources</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-300">
                        {activeSession.progress >= 80 ? (
                          <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                        ) : activeSession.progress >= 50 ? (
                          <Loader2 size={13} className="text-cyan-400 animate-spin shrink-0" />
                        ) : (
                          <Clock size={13} className="text-slate-600 shrink-0" />
                        )}
                        <span>Cross-checking empirical facts</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-300">
                        {activeSession.progress >= 100 ? (
                          <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                        ) : activeSession.progress >= 80 ? (
                          <Loader2 size={13} className="text-cyan-400 animate-spin shrink-0" />
                        ) : (
                          <Clock size={13} className="text-slate-600 shrink-0" />
                        )}
                        <span>Synthesizing structured report</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Verified Sources Pill Counter */}
              {activeSession && activeSession.sources?.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Globe size={12} className="text-cyan-400" />
                    {activeSession.sources.length} sources verified
                  </span>
                  <span className="text-emerald-400 font-medium">Real-time organic</span>
                </div>
              )}
            </div>

            {/* Right Main Pane: Full Report & Sources */}
            <div className="flex-1 flex flex-col min-w-0 bg-[#0c101a] overflow-hidden">
              {activeSession ? (
                <>
                  {/* Toolbar */}
                  <div className="flex flex-wrap items-center justify-between px-3 sm:px-6 py-2 sm:py-2.5 border-b border-slate-800 bg-[#0f1422] text-xs gap-2">
                    <span className="font-medium text-slate-300 truncate max-w-md">
                      {activeSession.topic}
                    </span>
                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                      <button
                        onClick={handleCopyReport}
                        className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
                      >
                        {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                        <span>{copied ? "Copied" : "Copy"}</span>
                      </button>
                      <button
                        onClick={handleDownloadReport}
                        className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
                      >
                        <Download size={12} />
                        <span>Download .md</span>
                      </button>
                      {onOpenWorkspace && (
                        <button
                          onClick={() => onOpenWorkspace(activeSession.report)}
                          className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-md bg-cyan-600/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-600/30 transition-colors cursor-pointer"
                        >
                          <BookOpen size={12} />
                          <span className="hidden sm:inline">Open in </span>Workspace
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Report Display */}
                  <div className="flex-1 overflow-y-auto p-4 sm:p-8 prose prose-invert max-w-none text-slate-200">
                    {activeSession.report ? (
                      <MarkdownRenderer text={activeSession.report} />
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-3">
                        <Loader2 size={28} className="animate-spin text-cyan-400" />
                        <p className="text-sm font-medium text-slate-400">
                          Conducting autonomous research...
                        </p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-500 space-y-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                    <Sparkles size={24} />
                  </div>
                  <h3 className="text-base font-semibold text-slate-300">
                    Start a Deep Research Session
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md">
                    Enter a research question in the left panel to begin multi-step queries, fact cross-checking, and structured executive synthesis.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* History Tab */
          <div className="flex-1 overflow-y-auto p-6 bg-[#0c101a]">
            {savedSessions.length === 0 ? (
              <div className="text-center py-16 text-slate-500 text-sm">
                No past research sessions found.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {savedSessions.map((session) => (
                  <div
                    key={session.id}
                    onClick={() => {
                      setActiveSession(session);
                      setActiveTab("new");
                    }}
                    className="p-4 rounded-xl border border-slate-800 bg-[#111624] hover:border-cyan-500/50 transition-all cursor-pointer space-y-2.5"
                  >
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {new Date(session.createdAt).toLocaleDateString()}
                      </span>
                      <span className="rounded-full bg-emerald-500/10 text-emerald-400 px-2 py-0.5 text-[10px] font-medium border border-emerald-500/20">
                        {session.status}
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold text-white line-clamp-2">
                      {session.topic}
                    </h4>
                    <p className="text-xs text-slate-400 line-clamp-2">
                      {session.findings?.[0] || "Structured research report available."}
                    </p>
                    <div className="pt-2 flex items-center justify-between text-[11px] text-cyan-400 font-medium">
                      <span>{session.sources?.length || 0} Sources Cited</span>
                      <span className="flex items-center gap-1">
                        View Report <ChevronRight size={12} />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>,
    document.body
  );
}
