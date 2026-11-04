import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import {
  X,
  Copy,
  Check,
  Download,
  FileText,
  Globe,
  Lock,
  MessageSquare,
} from "lucide-react";
import AntigravityLogo from "./AntigravityLogo";

interface ShareModalProps {
  chat: {
    title?: string;
    messages?: Array<{ role: string; text: string; sources?: any[] }>;
    updatedAt?: number;
  } | null;
  onClose: () => void;
}

export default function ShareModal({ chat, onClose }: ShareModalProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);
  const [isPublic, setIsPublic] = useState(true);

  // Generate a mock clean shareable URL
  const shareUrl = useMemo(() => {
    if (!chat) return "";
    const hash = Math.random().toString(36).substring(2, 10);
    return `${window.location.origin}/share/${hash}`;
  }, [chat]);

  if (!chat) return null;

  const messages = chat.messages || [];
  const messageCount = messages.length;
  const title = chat.title || "Untitled Conversation";

  // Formatted markdown string
  const markdownContent = useMemo(() => {
    let md = `# ${title}\n\n*Exported from ZyroChat AI Workspace on ${new Date().toLocaleString()}*\n\n---\n\n`;
    messages.forEach((msg) => {
      const author = msg.role === "user" ? "**User**" : "**ZyroChat**";
      md += `${author}:\n\n${msg.text}\n\n---\n\n`;
    });
    return md;
  }, [title, messages]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(markdownContent);
    setCopiedMarkdown(true);
    setTimeout(() => setCopiedMarkdown(false), 2500);
  };

  const handleDownloadMarkdown = () => {
    const blob = new Blob([markdownContent], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadJSON = () => {
    const data = JSON.stringify(
      {
        title,
        exportedAt: new Date().toISOString(),
        messages,
      },
      null,
      2
    );
    const blob = new Blob([data], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.16 }}
      className="fixed inset-0 z-modal flex items-center justify-center bg-slate-950/70 p-2 sm:p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        transition={{ type: "spring", bounce: 0.1, duration: 0.25 }}
        className="flex max-h-[min(90vh,90dvh)] w-full max-w-[min(512px,calc(100vw-20px))] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#11141d]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-3.5 sm:px-6 py-3 sm:py-3.5 dark:border-slate-800/80 gap-2">
          <div className="flex items-center gap-2.5">
            <AntigravityLogo size={26} />
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>Share Conversation</span>
                <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-medium text-cyan-600 dark:text-cyan-400">
                  Public Link
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[280px] sm:max-w-md">
                {title}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition cursor-pointer"
            aria-label="Close share dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
          {/* Share Link Box */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
              <Globe size={12} />
              <span>Shareable Snapshot Link</span>
            </label>
            <div className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50 p-2 dark:border-slate-800 dark:bg-[#151924]">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="w-full bg-transparent text-xs text-slate-700 font-mono select-all outline-none dark:text-slate-300"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold shrink-0 transition cursor-pointer ${
                  copiedLink
                    ? "bg-emerald-500 text-white"
                    : "bg-cyan-500 text-white hover:bg-cyan-600 dark:bg-cyan-600 dark:hover:bg-cyan-500"
                }`}
              >
                {copiedLink ? (
                  <>
                    <Check size={13} />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={13} />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Sharing Scope & Privacy */}
          <div className="rounded-xl border border-slate-200/70 p-3 dark:border-slate-800/80 bg-slate-50/40 dark:bg-[#141724]/40 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                {isPublic ? <Globe size={14} /> : <Lock size={14} />}
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {isPublic ? "Anyone with the link can view" : "Private link"}
                </p>
                <p className="text-[10px] text-slate-400">
                  Messages up to this point will be visible. New messages will not sync.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsPublic(!isPublic)}
              className="text-[11px] font-medium text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer"
            >
              {isPublic ? "Public" : "Private"}
            </button>
          </div>

          {/* Conversation Summary Preview */}
          <div className="rounded-xl border border-slate-200/70 p-3.5 dark:border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span className="font-semibold uppercase tracking-wider">Conversation Preview</span>
              <span className="flex items-center gap-1">
                <MessageSquare size={12} />
                {messageCount} messages
              </span>
            </div>
            <div className="max-h-40 overflow-y-auto space-y-2 pr-1 text-slate-700 dark:text-slate-300">
              {messages.slice(0, 4).map((m, i) => (
                <div
                  key={i}
                  className={`rounded-lg p-2 text-xs ${
                    m.role === "user"
                      ? "bg-slate-100/80 dark:bg-slate-800/60"
                      : "bg-cyan-500/5 dark:bg-cyan-500/10 border border-cyan-500/10"
                  }`}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-0.5">
                    {m.role === "user" ? "User" : "ZyroChat"}
                  </p>
                  <p className="line-clamp-2 leading-relaxed">{m.text}</p>
                </div>
              ))}
              {messageCount > 4 && (
                <p className="text-center text-[10px] text-slate-400 py-1">
                  + {messageCount - 4} more message{messageCount - 4 === 1 ? "" : "s"}
                </p>
              )}
            </div>
          </div>

          {/* Export Options */}
          <div className="space-y-2">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Export & Formats
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleCopyMarkdown}
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50 p-2.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-[#151924]/80 dark:text-slate-200 dark:hover:bg-[#181c2b] cursor-pointer transition"
              >
                {copiedMarkdown ? (
                  <Check size={14} className="text-emerald-500" />
                ) : (
                  <Copy size={14} className="text-cyan-500" />
                )}
                <span>{copiedMarkdown ? "Copied MD!" : "Copy Markdown"}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadMarkdown}
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50 p-2.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-[#151924]/80 dark:text-slate-200 dark:hover:bg-[#181c2b] cursor-pointer transition"
              >
                <FileText size={14} className="text-cyan-500" />
                <span>Save as .md</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadJSON}
                className="col-span-2 flex items-center justify-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50 p-2.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-[#151924]/80 dark:text-slate-200 dark:hover:bg-[#181c2b] cursor-pointer transition"
              >
                <Download size={14} className="text-cyan-500" />
                <span>Download Complete JSON Snapshot</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 sm:px-6 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#0e1017]/50">
          <span className="text-[10px] text-slate-400">
            Powered by ZyroChat Workspace
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}
