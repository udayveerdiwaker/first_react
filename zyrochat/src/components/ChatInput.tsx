import {
  ArrowUp,
  ArrowDown,
  Mic,
  Square,
  Paperclip,
  FileText,
  X,
  Laptop,
  Code2,
  Camera,
  Image as ImageIcon,
  Globe,
  Sparkles,
} from "lucide-react";
import { useRef, useEffect, useState, useMemo } from "react";
import type React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { processUploadedFile, FILE_QUICK_ACTIONS } from "../utils/fileExtractor";
import type { ProcessedFile } from "../utils/fileExtractor";
import VoiceInputPanel from "./VoiceInputPanel";
import ModeSelector from "./dropdown";
import HourSelector from "./HourSelector";
import ImageGenerationToggle from "./ImageGenerationToggle";
import type { AspectRatioOption } from "./ImageGenerationToggle";

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  onSend: (overrideInput?: string, overrideFiles?: any[], hour?: string | null, timezone?: string) => void;
  onStop?: () => void;
  loading: boolean;
  interactionLocked?: boolean;
  webSearchEnabled?: boolean;
  setWebSearchEnabled?: (enabled: boolean) => void;
  mode?: string;
  setMode?: (mode: string) => void;
  onSendImage?: (prompt: string, options?: { aspectRatio?: AspectRatioOption }) => void;
  externalPromptToEdit?: string | null;
  onClearExternalPrompt?: () => void;
  showScrollDown?: boolean;
  onScrollToBottom?: () => void;
  hasNewBelow?: boolean;
}

export default function ChatInput({
  input,
  setInput,
  onSend,
  onStop,
  loading,
  interactionLocked = false,
  webSearchEnabled = false,
  setWebSearchEnabled,
  mode,
  setMode,
  onSendImage,
  externalPromptToEdit,
  onClearExternalPrompt,
  showScrollDown = false,
  onScrollToBottom,
  hasNewBelow = false,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const attachmentMenuRef = useRef<HTMLDivElement>(null);

  const [attachedFiles, setAttachedFiles] = useState<ProcessedFile[]>([]);
  const [uploadMenuOpen, setUploadMenuOpen] = useState(false);
  const [fileWarning, setFileWarning] = useState<string | null>(null);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [voicePanelOpen, setVoicePanelOpen] = useState(false);
  const [selectedHour, setSelectedHour] = useState<string | null>(null);
  const [imageMode, setImageMode] = useState(mode === "image");
  const [imageAspectRatio, setImageAspectRatio] = useState<AspectRatioOption>("1:1");

  // Sync mode with imageMode
  useEffect(() => {
    if (mode === "image") {
      setImageMode(true);
    } else if (mode && mode !== "auto") {
      setImageMode(false);
    }
  }, [mode]);

  // Sync external prompt when user chooses to edit an image prompt
  useEffect(() => {
    if (externalPromptToEdit) {
      setInput(externalPromptToEdit);
      setImageMode(true);
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
      onClearExternalPrompt?.();
    }
  }, [externalPromptToEdit, onClearExternalPrompt, setInput]);

  const userTimezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch {
      return "UTC";
    }
  }, []);

  // Resize textarea dynamically with max-height internal scroll & cursor preservation
  useEffect(() => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;

    textareaRef.current.style.height = "auto";
    const scrollHeight = textareaRef.current.scrollHeight;
    const maxHeight = 190;
    const minHeight = 40;
    const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);

    textareaRef.current.style.height = `${newHeight}px`;
    textareaRef.current.style.overflowY = scrollHeight > maxHeight ? "auto" : "hidden";

    if (document.activeElement === textareaRef.current && start !== null && end !== null) {
      textareaRef.current.setSelectionRange(start, end);
    }
  }, [input]);

  // Close upload menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        attachmentMenuRef.current &&
        !attachmentMenuRef.current.contains(e.target as Node)
      ) {
        setUploadMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setIsProcessingFiles(true);
      const filesArray = Array.from(e.target.files);

      // Check duplicates
      const uniqueFiles: File[] = [];
      let duplicateCount = 0;
      for (const file of filesArray) {
        const isDuplicate = attachedFiles.some(
          (af) => af.name === file.name && af.size === file.size
        );
        if (isDuplicate) {
          duplicateCount++;
        } else {
          uniqueFiles.push(file);
        }
      }

      if (duplicateCount > 0) {
        setFileWarning(`${duplicateCount} duplicate file(s) omitted.`);
        setTimeout(() => setFileWarning(null), 4000);
      }

      const processed = await Promise.all(
        uniqueFiles.map((f) => processUploadedFile(f))
      );

      const errors = processed.filter((f) => f.status === "error");
      if (errors.length > 0) {
        setFileWarning(
          errors[0].errorMessage ||
          "One or more files could not be processed."
        );
        setTimeout(() => setFileWarning(null), 5000);
      }

      const valid = processed.filter((f) => f.status !== "error");
      if (valid.length > 0) {
        setAttachedFiles((prev) => [...prev, ...valid]);
      }

      setIsProcessingFiles(false);
      setUploadMenuOpen(false);
      e.target.value = "";
    }
  };

  const removeFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (customText?: string) => {
    // Prevent duplicate submissions and concurrent requests
    if (loading || interactionLocked) return;

    const textToSend = typeof customText === "string" ? customText : input;
    if (!textToSend.trim() && attachedFiles.length === 0) return;

    if (voicePanelOpen) {
      setVoicePanelOpen(false);
    }

    if (imageMode && onSendImage) {
      onSendImage(textToSend, { aspectRatio: imageAspectRatio });
      setAttachedFiles([]);
      setInput("");
      setImageMode(false);
      if (textareaRef.current) {
        textareaRef.current.style.height = "40px";
        textareaRef.current.style.overflowY = "hidden";
      }
      return;
    }

    onSend(textToSend, attachedFiles, selectedHour, userTimezone);
    setAttachedFiles([]);
    setInput("");
    setSelectedHour(null);

    if (textareaRef.current) {
      textareaRef.current.style.height = "40px";
      textareaRef.current.style.overflowY = "hidden";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!loading) {
        handleSubmit();
      }
    }
  };

  return (
    <div className="sticky bottom-0 z-composer w-full px-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1 sm:px-6 sm:pb-3 pointer-events-none">
      <div className="mx-auto max-w-3xl xl:max-w-4xl pointer-events-auto relative">
        {/* Floating Action Controls Docked Dynamically Above Composer Card */}
        <div className="absolute -top-11 left-0 right-0 flex items-center justify-between px-1 pointer-events-none z-floating-button">
          {/* Centered Stop Generation Button */}
          <div className="flex-1 flex justify-start pointer-events-auto">
            <AnimatePresence>
              {loading && (
                <motion.button
                  type="button"
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  onClick={onStop}
                  className="flex items-center gap-1.5 rounded-full border border-slate-200/90 bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-md backdrop-blur-md transition hover:bg-slate-50 hover:border-red-400 dark:border-slate-800/90 dark:bg-[#12151e]/95 dark:text-slate-200 dark:hover:bg-[#161a26] cursor-pointer select-none"
                  aria-label="Stop generation"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                  <Square size={10} className="fill-current text-slate-500 dark:text-slate-400" />
                  <span>Stop generation</span>
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Right-aligned Jump to Latest Messages Button */}
          <div className="pointer-events-auto">
            <AnimatePresence>
              {showScrollDown && (
                <motion.button
                  type="button"
                  initial={{ opacity: 0, scale: 0.9, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 8 }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={onScrollToBottom}
                  className="flex items-center gap-1.5 rounded-full border border-slate-200/90 bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xl backdrop-blur-md transition hover:border-cyan-500/50 dark:border-slate-800/90 dark:bg-[#11141d]/95 dark:text-slate-200 cursor-pointer"
                  aria-label="Scroll to latest messages"
                >
                  <ArrowDown size={13} className="text-cyan-500" />
                  <span>{hasNewBelow ? "New messages" : "Latest messages"}</span>
                  {hasNewBelow && (
                    <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-ping ml-0.5" />
                  )}
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Professional Voice Input Panel with Visualizer & Review */}
        <VoiceInputPanel
          isOpen={voicePanelOpen}
          onClose={() => setVoicePanelOpen(false)}
          onSend={(transcript) => {
            if (imageMode && onSendImage) {
              onSendImage(transcript, { aspectRatio: imageAspectRatio });
              setAttachedFiles([]);
              setInput("");
              setImageMode(false);
              setVoicePanelOpen(false);
              return;
            }
            onSend(transcript, attachedFiles, selectedHour, userTimezone);
            setAttachedFiles([]);
            setInput("");
            setSelectedHour(null);
            setVoicePanelOpen(false);
          }}
          onInsert={(transcript) => {
            setInput(input ? `${input.trim()} ${transcript}` : transcript);
            setVoicePanelOpen(false);
          }}
        />

        {/* Floating Composer Container Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="relative rounded-2xl border border-slate-200/90 bg-white/95 shadow-[0_8px_30px_rgb(0,0,0,0.06)] backdrop-blur-md transition-all focus-within:border-cyan-500/60 focus-within:ring-1 focus-within:ring-cyan-500/20 dark:border-slate-800/90 dark:bg-[#11141d]/95 dark:shadow-[0_12px_40px_rgba(0,0,0,0.4)]"
        >
          {/* Active AI Image Mode Indicator Pill */}
          {imageMode && (
            <div className="flex items-center justify-between border-b border-purple-500/20 bg-purple-500/10 px-3.5 py-1 text-[11px] font-semibold tracking-wider text-purple-600 dark:text-purple-300">
              <div className="flex items-center gap-1.5">
                <Sparkles size={12} className="animate-pulse text-purple-500" />
                <span>AI IMAGE GENERATION MODE ({imageAspectRatio})</span>
                <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400 ml-1">
                  — Real AI Image Generator
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setImageMode(false);
                  if (mode === "image") setMode?.("auto");
                }}
                className="text-purple-500 hover:text-purple-700 dark:hover:text-purple-200 text-[10px] font-medium underline cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Active Web Search Indicator Pill */}
          {webSearchEnabled && (
            <div className="flex items-center gap-1.5 border-b border-cyan-500/20 bg-cyan-500/10 px-3.5 py-1 text-[11px] font-semibold tracking-wider text-cyan-600 dark:text-cyan-400">
              <Globe size={12} className="animate-spin [animation-duration:8s]" />
              <span>WEB SEARCH ON</span>
              <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400 ml-1">
                — ZyroChat will cite live external sources
              </span>
            </div>
          )}

          {/* File Processing Indicator */}
          {isProcessingFiles && (
            <div className="flex items-center gap-2 border-b border-cyan-500/20 bg-cyan-500/10 px-3.5 py-1.5 text-xs text-cyan-600 dark:text-cyan-400">
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
              <span>Processing and extracting file contents...</span>
            </div>
          )}

          {/* File Warning Banner */}
          {fileWarning && (
            <div className="flex items-center justify-between border-b border-amber-500/30 bg-amber-500/10 px-3.5 py-1.5 text-xs text-amber-600 dark:text-amber-400">
              <span>{fileWarning}</span>
              <button
                type="button"
                onClick={() => setFileWarning(null)}
                className="text-amber-500 hover:text-amber-700 ml-2"
              >
                <X size={13} />
              </button>
            </div>
          )}

          {/* File attachment preview chips */}
          {attachedFiles.length > 0 && (
            <div className="border-b border-slate-100 p-2.5 dark:border-slate-800/80 space-y-2">
              <div className="flex flex-wrap gap-2">
                {attachedFiles.map((file, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 dark:border-slate-800 dark:bg-[#171a25] dark:text-slate-300"
                  >
                    <FileText size={13} className="text-cyan-500 shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <span className="truncate max-w-[140px] font-medium text-[11px]">
                        {file.name}
                      </span>
                      <span className="text-[9px] text-slate-400">
                        {(file.size / 1024).toFixed(1)} KB
                        {file.lineCount ? ` • ${file.lineCount} lines` : ""}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="ml-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      aria-label="Remove attachment"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Quick Prompt Pills for Files */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
                <Sparkles size={12} className="text-amber-500 shrink-0" />
                <span className="text-slate-400 shrink-0">Ask:</span>
                {FILE_QUICK_ACTIONS.map((action, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSubmit(action.prompt)}
                    className="rounded-lg border border-slate-200/80 bg-white px-2 py-0.5 text-slate-600 hover:border-cyan-500/50 hover:bg-cyan-50/50 hover:text-cyan-600 dark:border-slate-800 dark:bg-[#131620] dark:text-slate-300 dark:hover:border-cyan-500/40 dark:hover:bg-cyan-950/30 dark:hover:text-cyan-300 shrink-0 transition cursor-pointer"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Main Typing Area */}
          <div className="px-3.5 pt-3 pb-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
              }}
              onKeyDown={handleKeyDown}
              placeholder={
                imageMode
                  ? "Describe the image you want to generate in detail..."
                  : "Ask anything, analyze files, or search the web..."
              }
              disabled={interactionLocked}
              rows={1}
              className="w-full resize-none bg-transparent text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 outline-none leading-relaxed dark:text-slate-100 dark:placeholder:text-slate-500 [scrollbar-width:thin] [scrollbar-color:rgba(156,163,175,0.4)_transparent]"
            />
          </div>

          {/* Controls row */}
          <div className="flex items-center justify-between px-3 pb-2.5 flex-wrap gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Optional integrated AI Mode Selector */}
              {mode && setMode && (
                <ModeSelector mode={mode} setMode={setMode} dropDirection="up" align="left" />
              )}

              {/* AI Image Generation Mode Toggle */}
              {onSendImage && (
                <ImageGenerationToggle
                  active={imageMode}
                  onToggle={() => setImageMode(!imageMode)}
                  aspectRatio={imageAspectRatio}
                  onAspectRatioChange={setImageAspectRatio}
                  disabled={interactionLocked}
                />
              )}

              {/* Target / Scheduled Hour Selector */}
              <HourSelector
                selectedHour={selectedHour}
                onChange={setSelectedHour}
                timezone={userTimezone}
                dropDirection="up"
                disabled={interactionLocked}
              />

              {/* Web Search Toggle Button */}
              {setWebSearchEnabled && (
                <button
                  type="button"
                  onClick={() => setWebSearchEnabled(!webSearchEnabled)}
                  className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-medium transition-all cursor-pointer ${webSearchEnabled
                    ? "border-cyan-500 bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.25)]"
                    : "border-slate-200/80 bg-slate-50 text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:border-slate-800 dark:bg-[#151924] dark:text-slate-400 dark:hover:border-slate-700 dark:hover:text-slate-200"
                    }`}
                  title={
                    webSearchEnabled
                      ? "Web search is active"
                      : "Enable real-time Web Search"
                  }
                >
                  <Globe
                    size={13}
                    className={
                      webSearchEnabled
                        ? "text-cyan-500 animate-spin [animation-duration:10s]"
                        : ""
                    }
                  />
                  <span>Search</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {/* Attachment Button & Popup */}
              <div className="relative" ref={attachmentMenuRef}>
                <input
                  type="file"
                  id="file-upload-doc"
                  className="hidden"
                  onChange={handleFileChange}
                  multiple
                />
                <input
                  type="file"
                  id="file-upload-image"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                  multiple
                />
                <input
                  type="file"
                  id="file-upload-code"
                  accept=".js,.ts,.tsx,.jsx,.py,.html,.css,.json,.md,.sql,.sh,.c,.cpp"
                  className="hidden"
                  onChange={handleFileChange}
                  multiple
                />
                <input
                  type="file"
                  id="file-upload-camera"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleFileChange}
                />

                <button
                  type="button"
                  onClick={() =>
                    !interactionLocked && setUploadMenuOpen(!uploadMenuOpen)
                  }
                  disabled={interactionLocked}
                  className={`flex h-8 w-8 items-center justify-center rounded-xl border transition-colors cursor-pointer ${uploadMenuOpen
                    ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400"
                    : "border-slate-200/80 bg-slate-50 text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:border-slate-800 dark:bg-[#151924] dark:text-slate-400 dark:hover:border-slate-700 dark:hover:text-slate-200"
                    }`}
                  title="Attach files or code"
                  aria-label="Attach files"
                >
                  <Paperclip size={15} />
                </button>

                <AnimatePresence>
                  {uploadMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 6 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 6 }}
                      transition={{ duration: 0.12 }}
                      className="absolute bottom-full right-0 z-dropdown mb-2 w-48 max-w-[calc(100vw-24px)] rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl backdrop-blur-md dark:border-slate-800 dark:bg-[#12151e]"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          document.getElementById("file-upload-doc")?.click();
                        }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-[#171b26] cursor-pointer"
                      >
                        <Laptop size={14} className="text-slate-400" />
                        <span>Upload document</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          document.getElementById("file-upload-image")?.click();
                        }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-[#171b26] cursor-pointer"
                      >
                        <ImageIcon size={14} className="text-slate-400" />
                        <span>Upload image</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          document.getElementById("file-upload-code")?.click();
                        }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-[#171b26] cursor-pointer"
                      >
                        <Code2 size={14} className="text-slate-400" />
                        <span>Attach code file</span>
                      </button>

                      <button
                        onClick={() => {
                          if (loading) {
                            onStop?.();
                          } else if (!interactionLocked && input.trim()) {
                            onSend();
                          }
                        }}
                        disabled={!loading && (interactionLocked || !input.trim())}
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-all duration-200 active:scale-95 sm:h-10 sm:w-10 ${loading
                          ? "bg-red-600 text-white shadow-[0_0_12px_rgba(239,68,68,0.45)] hover:scale-105 hover:bg-red-500 animate-pulse"
                          : "bg-slate-900 text-white shadow-md hover:scale-105 hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:hover:scale-100 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200 dark:disabled:bg-slate-700 dark:disabled:text-slate-500"
                          }`}
                        title={
                          loading
                            ? "Stop generating"
                            : interactionLocked
                              ? "Wait for the current response to finish"
                              : "Send message (Shift+Enter for new line)"
                        }
                      >
                        {loading ? (
                          <Square size={16} fill="currentColor" className="sm:size-[15px]" />
                        ) : (
                          <ArrowUp size={18} strokeWidth={2.5} className="sm:size-[18px]" />
                        )}
                      </button>
                    </div>

          {/* {centered && (
            <div className="flex flex-wrap gap-2 px-4 pb-3">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => {
                    setInput(prompt);
                    onQuickPrompt?.(prompt);
                  }}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] text-slate-600 transition hover:border-slate-300 hover:bg-white hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:hover:text-white"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          {/* Bottom helper row */}
                  <div className="flex items-center justify-between border-t border-slate-100/80 px-3.5 py-1.5 text-[10px] text-slate-400 dark:border-slate-800/60 dark:text-slate-500 select-none font-normal">
                    <span>Shift + Enter for new line</span>
                    <span className="hidden xs:inline">
                      ZyroChat AI Workspace • Fast & Reliable
                    </span>
                  </div>
                </form>
              </div>
            </div>
            );
}
