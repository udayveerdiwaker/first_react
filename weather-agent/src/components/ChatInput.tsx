import { ArrowUp, Square } from "lucide-react";
import { useRef, useEffect, useState } from "react";
import React from "react";

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  loading: boolean;
  centered?: boolean;
}

export default function ChatInput({
  input,
  setInput,
  onSend,
  onStop,
  loading,
  centered = false,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [input]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setInput(newValue);

    const el = textareaRef.current;
    if (!el) return;

    el.style.height = "auto";

    const maxHeight = centered ? 160 : 128;

    if (!newValue.trim()) {
      setExpanded(false);
    } else {
      const isExpanded = el.scrollHeight > 88;
      if (isExpanded !== expanded) {
        setExpanded(isExpanded);
      }
    }

    el.style.height =
      el.scrollHeight <= maxHeight ? `${el.scrollHeight}px` : `${maxHeight}px`;
  };

  const containerClass = centered
    ? "w-full max-w-3xl"
    : "sticky bottom-0 z-20 border-t border-slate-200/70 bg-white/78 px-3 pb-2.5 pt-2.5 backdrop-blur-2xl dark:border-slate-800/80 dark:bg-slate-950/70 sm:px-5";

  const innerClass = centered ? "w-full" : "mx-auto w-full max-w-4xl";

  return (
    <div className={containerClass}>
      <div className={innerClass}>
        {centered && (
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-base font-semibold text-white shadow-[0_18px_50px_-24px_rgba(15,23,42,0.55)] dark:bg-white dark:text-slate-950">
              Z
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Meet ZyroChat
            </h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 sm:text-base">
              Ask ZyroChat about weather, news, calculations, and more.
            </p>
          </div>
        )}

        <div
          className={`relative overflow-hidden rounded-[28px] border bg-white/96 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.45)] transition-all duration-200 dark:bg-slate-900/96 ${
            centered
              ? "border-slate-200/90 dark:border-slate-700/80"
              : "border-slate-200/80 dark:border-slate-700/80"
          } ${
            expanded
              ? "ring-2 ring-slate-200 dark:ring-slate-700"
              : "focus-within:border-slate-300 dark:focus-within:border-slate-600"
          }`}
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-300/80 to-transparent dark:via-slate-600/80" />

          <div className="flex items-end gap-3 px-3 py-2.5 sm:px-4 sm:py-3">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInput}
              placeholder="Message ZyroChat"
              rows={1}
              className={`min-h-[24px] flex-1 resize-none overflow-y-auto bg-transparent px-1 py-1 text-slate-900 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500 ${
                centered
                  ? "max-h-40 text-[15px] leading-7 sm:text-base"
                  : "max-h-32 text-[14px] leading-6 sm:text-[15px]"
              }`}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (loading) onStop();
                  else if (input.trim()) onSend();
                }
              }}
            />

            <button
              onClick={() => {
                if (loading) onStop();
                else if (input.trim()) onSend();
              }}
              disabled={!input.trim() && !loading}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white shadow-md transition-all duration-200 hover:scale-105 hover:bg-slate-800 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:hover:scale-100 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200 dark:disabled:bg-slate-700 dark:disabled:text-slate-500"
              title={
                loading
                  ? "Stop generating"
                  : "Send message (Shift+Enter for new line)"
              }
            >
              {loading ? (
                <Square size={15} fill="currentColor" />
              ) : (
                <ArrowUp size={18} strokeWidth={2.5} />
              )}
            </button>
          </div>

          <div className="flex items-center justify-between border-t border-slate-200/80 px-4 py-2 text-[11px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <span>Shift + Enter for a new line</span>
            <span>AI can make mistakes</span>
          </div>
        </div>
      </div>
    </div>
  );
}
