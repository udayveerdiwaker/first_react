import { ArrowUp, Mic, MicOff, Square } from "lucide-react";
import { useRef, useEffect, useState } from "react";
import React from "react";

type SpeechRecognitionConstructor = new () => SpeechRecognition;

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message?: string;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  onSend: () => void;
  onStop?: () => void;
  loading: boolean;
  interactionLocked?: boolean;
  centered?: boolean;
}

// Chat input component.
// It lets the user type a message, send it, and use browser speech recognition
// to turn microphone input into text when the browser supports it.
export default function ChatInput({
  input,
  setInput,
  onSend,
  onStop,
  loading,
  interactionLocked = false,
  centered = false,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const speechBaseRef = useRef("");
  const finalTranscriptRef = useRef("");
  const speechStartingRef = useRef(false);
  const speechErrorRef = useRef(false);
  const speechStoppedByUserRef = useRef(false);
  const [expanded, setExpanded] = useState(false);
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [speechStatus, setSpeechStatus] = useState("");
  // const quickPrompts = [
  //   "What's the weather like in New York today?",
  //   "Give me a quick summary of the latest tech news.",
  //   "Plan my day based on today's forecast.",
  // ];

  useEffect(() => {
    // Keeps the typing box focused whenever the input value changes.
    // This makes it easy to keep typing after actions like sending or speech input.
    textareaRef.current?.focus();

    // When the input is programmatically cleared (e.g. after sending), collapse the height
    if (input === "") {
      const el = textareaRef.current;
      if (el) {
        el.style.height = "auto";
        setExpanded(false);
      }
    }
  }, [input]);

  useEffect(() => {
    // Automatically focus the input textarea when the user starts typing anywhere on the page
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // 1. If interaction is locked (e.g. AI is loading), do not steal focus
      if (interactionLocked) return;

      // 2. Ignore if the user is already typing in another input or editable area
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.getAttribute("contenteditable") === "true")
      ) {
        return;
      }

      // 3. Ignore system shortcuts and command keys (Ctrl, Alt, Meta/Cmd, Esc, Enter, Tab)
      if (e.ctrlKey || e.altKey || e.metaKey || e.key === "Escape" || e.key === "Enter" || e.key === "Tab") {
        return;
      }

      // 4. If a printable character (length is 1) is pressed, focus the chat textarea
      if (e.key.length === 1) {
        textareaRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [interactionLocked]);

  useEffect(() => {
    // Checks whether the current browser has the Web Speech API.
    // Chrome and Edge usually support it; unsupported browsers disable the mic.
    const SpeechRecognitionApi =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    setSpeechSupported(Boolean(SpeechRecognitionApi));

    return () => {
      // Stops speech recognition if the component is removed from the screen.
      // This prevents the microphone session from continuing in the background.
      recognitionRef.current?.abort();
    };
  }, []);

  // Handles normal typing in the textarea.
  // It updates the parent input state and grows the textarea height as text wraps.
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setInput(newValue);
    setSpeechStatus("");

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

  // Recalculates the textarea height after text is changed outside normal typing.
  // Speech input uses this because the text is inserted programmatically.
  const syncTextareaHeight = () => {
    requestAnimationFrame(() => {
      // Waits until React has placed the new text in the textarea,
      // then measures the real scroll height and applies the matching height.
      const el = textareaRef.current;
      if (!el) return;

      const maxHeight = centered ? 160 : 128;
      el.style.height = "auto";
      el.style.height =
        el.scrollHeight <= maxHeight ? `${el.scrollHeight}px` : `${maxHeight}px`;
      setExpanded(Boolean(el.value.trim()) && el.scrollHeight > 88);
    });
  };

  const getSpeechRecognitionApi = () =>
    window.SpeechRecognition || window.webkitSpeechRecognition;

  const checkMicrophonePermission = async () => {
    if (!navigator.mediaDevices?.getUserMedia) return true;

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    return true;
  };

  // Starts or stops microphone-to-text input.
  // When listening starts, it creates a browser speech recognizer and appends
  // recognized words to the existing message text.
  const toggleSpeechInput = async () => {
    if (!speechSupported || interactionLocked || speechStartingRef.current) {
      return;
    }

    if (listening) {
      speechStoppedByUserRef.current = true;
      recognitionRef.current?.stop();
      setListening(false);
      setSpeechStatus("Voice input stopped");
      return;
    }

    const SpeechRecognitionApi = getSpeechRecognitionApi();

    if (!SpeechRecognitionApi) {
      setSpeechSupported(false);
      setSpeechStatus("Voice input is not supported in this browser");
      return;
    }

    speechStartingRef.current = true;
    speechErrorRef.current = false;
    speechStoppedByUserRef.current = false;
    setSpeechStatus("Starting microphone...");

    try {
      await checkMicrophonePermission();
    } catch (err: any) {
      speechStartingRef.current = false;
      setListening(false);

      if (err?.name === "NotFoundError" || err?.name === "DevicesNotFoundError") {
        setSpeechStatus("No microphone was found");
      } else if (err?.name === "NotReadableError" || err?.name === "TrackStartError") {
        setSpeechStatus("Microphone is already in use");
      } else {
        setSpeechStatus("Microphone permission was blocked");
      }
      return;
    }

    const recognition = new SpeechRecognitionApi();
    speechBaseRef.current = input.trim();
    finalTranscriptRef.current = "";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = navigator.language || "en-US";

    recognition.onstart = () => {
      // The browser has successfully started listening to the microphone.
      speechStartingRef.current = false;
      setListening(true);
      setSpeechStatus("Listening...");
    };

    recognition.onresult = (event) => {
      // Speech recognition sends both final words and temporary guesses.
      // Final words are stored, while interim words are shown live as the user speaks.
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const transcript = result[0].transcript;

        if (result.isFinal) {
          finalTranscriptRef.current += `${transcript} `;
        } else {
          interimTranscript += transcript;
        }
      }

      const spokenText = `${finalTranscriptRef.current}${interimTranscript}`.trim();
      const nextInput = [speechBaseRef.current, spokenText]
        .filter(Boolean)
        .join(" ");

      setInput(nextInput);
      setSpeechStatus(spokenText ? "Listening..." : "Say something");
      syncTextareaHeight();
    };

    recognition.onerror = (event) => {
      // Converts browser speech errors into simple messages the user can understand.
      const messages: Record<string, string> = {
        "not-allowed": "Microphone permission was blocked",
        "service-not-allowed": "Speech service is blocked in this browser",
        "no-speech": "No speech detected",
        "audio-capture": "No microphone was found",
        network: "Speech service network error",
      };

      speechStartingRef.current = false;
      speechErrorRef.current = true;
      setListening(false);
      setSpeechStatus(messages[event.error] || "Voice input stopped");
    };

    recognition.onend = () => {
      // Runs when the browser stops listening.
      // If any final words were heard, the status confirms they were added.
      speechStartingRef.current = false;
      setListening(false);

      if (speechStoppedByUserRef.current) {
        setSpeechStatus("Voice input stopped");
      } else if (finalTranscriptRef.current.trim()) {
        setSpeechStatus("Voice added to message");
      } else if (!speechErrorRef.current) {
        setSpeechStatus("Voice input ended");
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      speechStartingRef.current = false;
      setListening(false);
      setSpeechStatus("Voice input could not start. Try again.");
    }
  };

  const containerClass = centered
    ? "w-full max-w-3xl"
    : "sticky bottom-0 z-20 border-t border-slate-200/70 bg-white/78 px-2.5 pb-3 pt-2.5 backdrop-blur-2xl dark:border-slate-800/80 dark:bg-slate-950/70 sm:px-4 sm:pb-3.5 md:px-5";

  const innerClass = centered ? "w-full" : "mx-auto w-full max-w-4xl";

  return (
    <div className={containerClass}>
      <div className={innerClass}>
        {centered && (
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-base font-semibold text-white shadow-[0_18px_50px_-24px_rgba(15,23,42,0.55)] dark:bg-white dark:text-slate-950">
              Z
            </div>
            <div className="mb-3 flex flex-wrap items-center justify-center gap-2 text-[11px] font-medium uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
              <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 dark:border-slate-700 dark:bg-slate-900/70">
                General
              </span>
              <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 dark:border-slate-700 dark:bg-slate-900/70">
                Coding
              </span>
              <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 dark:border-slate-700 dark:bg-slate-900/70">
                Creative
              </span>
            </div>
            <h2 className="text-[1.75rem] font-semibold tracking-tight text-slate-900 dark:text-white sm:text-[2.1rem]">
              {/* Your polished AI weather desk */}
              Something new created for ZyroChat
            </h2>
            <p className="mt-2 text-[13px] text-slate-500 dark:text-slate-400 sm:text-[15px]">
              Something new created for ZyroChat, showcasing the potential of AI
              in transforming how we interact with information and manage our
              daily lives.
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

          <div className="flex items-end gap-2 px-2.5 py-2 sm:gap-3 sm:px-3.5 sm:py-2.5">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInput}
              placeholder="Message ZyroChat"
              rows={1}
              disabled={interactionLocked}
              className={`min-h-9 flex-1 resize-none overflow-y-auto bg-transparent px-1 py-2 text-slate-900 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500 sm:py-1 ${
                centered
                  ? "max-h-40 text-[14px] leading-6 sm:text-[15px]"
                  : "max-h-32 text-[13px] leading-6 sm:text-[14px]"
              }`}
              onKeyDown={(e) => {
                // Enter sends the message, while Shift+Enter keeps the normal
                // textarea behavior and adds a new line.
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (!interactionLocked && input.trim()) onSend();
                }
              }}
            />

            <button
              type="button"
              onClick={toggleSpeechInput}
              disabled={interactionLocked || !speechSupported}
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-45 sm:h-10 sm:w-10 ${
                listening
                  ? "border-red-200 bg-red-50 text-red-600 shadow-[0_0_0_4px_rgba(248,113,113,0.14)] hover:bg-red-100 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300"
                  : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white hover:text-slate-950 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-700 dark:hover:text-white"
              }`}
              title={
                !speechSupported
                  ? "Voice input is not supported in this browser"
                  : listening
                  ? "Stop voice input"
                  : "Start voice input"
              }
              aria-label={listening ? "Stop voice input" : "Start voice input"}
            >
              {speechSupported ? (
                <Mic size={18} strokeWidth={2.3} className="sm:size-[16px]" />
              ) : (
                <MicOff size={18} strokeWidth={2.3} className="sm:size-[16px]" />
              )}
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
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white shadow-md transition-all duration-200 hover:scale-105 hover:bg-slate-800 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:hover:scale-100 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200 dark:disabled:bg-slate-700 dark:disabled:text-slate-500 sm:h-10 sm:w-10"
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
          )} */}

          <div className="flex items-center justify-between border-t border-slate-200/80 px-4 py-2 text-[10px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <span>Shift + Enter for a new line</span>
            <span>{speechStatus || "AI can make mistakes"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
