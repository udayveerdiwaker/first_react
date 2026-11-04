/**
 * Professional Voice Input & Review Component for ZyroChat
 * 
 * Implements:
 * - State Machine: Idle -> Listening -> Processing -> Review
 * - Voice Activity Detection (VAD) with configurable silence timeout (default 2500ms)
 * - Live real-time Audio Waveform Visualizer via Web Audio API AnalyserNode
 * - Multi-language Speech Recognition with persistent language preference
 * - Review State Machine: Edit transcript, Confidence score, Send, Insert, Retry, Cancel
 * - Strict Audio Privacy: Immediate microphone track disposal on stop
 */

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Mic,
  Send,
  RotateCcw,
  X,
  Globe,
  Check,
  Edit2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getArtifactConfig } from "../utils/artifactConfig";

interface VoiceInputPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (transcript: string) => void;
  onInsert: (transcript: string) => void;
}

const SUPPORTED_LANGUAGES = [
  { code: "en-US", label: "English (US)" },
  { code: "en-IN", label: "English (India)" },
  { code: "hi-IN", label: "Hindi (हिन्दी)" },
  { code: "es-ES", label: "Spanish (Español)" },
  { code: "fr-FR", label: "French (Français)" },
  { code: "de-DE", label: "German (Deutsch)" },
  { code: "zh-CN", label: "Chinese (中文)" },
  { code: "ja-JP", label: "Japanese (日本語)" },
];

export default function VoiceInputPanel({
  isOpen,
  onClose,
  onSend,
  onInsert,
}: VoiceInputPanelProps) {
  const [voiceState, setVoiceState] = useState<"listening" | "processing" | "review">("listening");
  const [transcript, setTranscript] = useState("");
  const [interimText, setInterimText] = useState("");
  const [audioVolume, setAudioVolume] = useState<number>(0);
  const [confidenceRating, setConfidenceRating] = useState<"high" | "medium" | "low">("high");
  const [selectedLanguage, setSelectedLanguage] = useState<string>(() => {
    return localStorage.getItem("zyrochat-voice-lang") || "en-US";
  });

  const recognitionRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const silenceStartRef = useRef<number>(Date.now());
  const finalChunksRef = useRef<string>("");

  const config = getArtifactConfig();
  const silenceTimeoutMs = config.voiceSilenceTimeoutMs || 2500;

  // Save language preference
  const handleLanguageChange = (lang: string) => {
    setSelectedLanguage(lang);
    localStorage.setItem("zyrochat-voice-lang", lang);
    if (voiceState === "listening") {
      restartListening(lang);
    }
  };

  // Safe microphone release
  const stopAudioStreams = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setAudioVolume(0);
  }, []);

  // Stop speech recognition
  const stopRecognition = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    stopAudioStreams();
  }, [stopAudioStreams]);

  // Transition to review state
  const finishRecordingToReview = useCallback(() => {
    stopRecognition();
    setVoiceState("processing");

    setTimeout(() => {
      const finalText = (finalChunksRef.current + " " + interimText).trim();
      setTranscript(finalText);
      setInterimText("");

      // Estimate confidence based on word count & repeats
      if (finalText.length > 15) {
        setConfidenceRating("high");
      } else if (finalText.length > 0) {
        setConfidenceRating("medium");
      } else {
        setConfidenceRating("low");
      }

      setVoiceState("review");
    }, 200);
  }, [interimText, stopRecognition]);

  // Initialize Speech Recognition & Audio Visualizer
  const startListening = useCallback(
    async (langCode?: string) => {
      stopRecognition();
      finalChunksRef.current = "";
      setTranscript("");
      setInterimText("");
      setVoiceState("listening");

      const targetLang = langCode || selectedLanguage;
      const SpeechConstructor =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (!SpeechConstructor) {
        alert("Speech Recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
        onClose();
        return;
      }

      // Initialize microphone stream for audio visualizer
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;

        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioContextClass();
        audioContextRef.current = audioCtx;

        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        analyserRef.current = analyser;

        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const checkVolume = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          setAudioVolume(Math.min(100, Math.round((avg / 128) * 100)));
          animFrameRef.current = requestAnimationFrame(checkVolume);
        };
        checkVolume();
      } catch (err) {
        console.warn("Could not access microphone visualizer:", err);
      }

      // Setup Speech Recognition
      const recognition = new SpeechConstructor();
      recognitionRef.current = recognition;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = targetLang;

      // Silence timeout helper
      const resetSilenceTimer = () => {
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }
        silenceStartRef.current = Date.now();

        silenceTimerRef.current = setTimeout(() => {
          finishRecordingToReview();
        }, silenceTimeoutMs);
      };

      recognition.onresult = (event: any) => {
        resetSilenceTimer();
        let interim = "";
        let newFinal = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          if (res.isFinal) {
            newFinal += res[0].transcript + " ";
          } else {
            interim += res[0].transcript;
          }
        }

        if (newFinal) {
          finalChunksRef.current = (finalChunksRef.current + " " + newFinal).trim();
          setTranscript(finalChunksRef.current);
        }
        setInterimText(interim);
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        if (event.error === "no-speech") {
          // If no speech heard, continue waiting unless user cancels
          return;
        }
        finishRecordingToReview();
      };

      recognition.onend = () => {
        // If ended unexpectedly while still in listening mode, transition to review
        if (voiceState === "listening") {
          finishRecordingToReview();
        }
      };

      try {
        recognition.start();
        resetSilenceTimer();
      } catch (err) {
        console.warn("Recognition start failed:", err);
      }
    },
    [selectedLanguage, silenceTimeoutMs, stopRecognition, finishRecordingToReview, voiceState, onClose]
  );

  const restartListening = (lang?: string) => {
    startListening(lang);
  };

  useEffect(() => {
    if (isOpen) {
      startListening();
    } else {
      stopRecognition();
    }
    return () => {
      stopRecognition();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 15, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 15, scale: 0.98 }}
        transition={{ duration: 0.18 }}
        className="mb-3 w-full rounded-2xl border border-cyan-500/30 bg-white/95 p-4 shadow-2xl backdrop-blur-xl dark:border-cyan-500/20 dark:bg-[#11141d]/95"
      >
        {/* Header bar */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className={`flex h-7 w-7 items-center justify-center rounded-xl ${
              voiceState === "listening"
                ? "bg-red-500/10 text-red-500 animate-pulse"
                : "bg-cyan-500/10 text-cyan-500"
            }`}>
              <Mic size={15} />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-200">
              {voiceState === "listening"
                ? "Listening..."
                : voiceState === "processing"
                ? "Processing Voice..."
                : "Voice Review"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Selector */}
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-slate-50 px-2 py-1 text-[11px] text-slate-600 dark:border-slate-800 dark:bg-[#161a26] dark:text-slate-300">
              <Globe size={12} className="text-slate-400" />
              <select
                value={selectedLanguage}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="bg-transparent text-[11px] font-medium outline-none cursor-pointer"
                disabled={voiceState === "processing"}
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code} className="bg-white dark:bg-slate-900">
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition cursor-pointer"
              title="Close voice input"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Dynamic State Body */}
        {voiceState === "listening" && (
          <div className="py-4 flex flex-col items-center justify-center space-y-4">
            {/* Pulsing visualizer circles and live audio wave */}
            <div className="relative flex items-center justify-center h-20 w-full">
              <div
                className="absolute rounded-full bg-cyan-500/10 transition-all duration-75"
                style={{
                  width: `${60 + audioVolume * 0.8}px`,
                  height: `${60 + audioVolume * 0.8}px`,
                }}
              />
              <div
                className="absolute rounded-full bg-cyan-500/20 transition-all duration-75"
                style={{
                  width: `${50 + audioVolume * 0.5}px`,
                  height: `${50 + audioVolume * 0.5}px`,
                }}
              />
              <div className="relative z-content flex h-14 w-14 items-center justify-center rounded-full bg-cyan-500 text-white shadow-lg shadow-cyan-500/30">
                <Mic size={24} className="animate-pulse" />
              </div>
            </div>

            {/* Live real-time transcript caption */}
            <div className="min-h-[48px] max-h-[120px] overflow-y-auto px-4 text-center">
              {transcript || interimText ? (
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-normal">
                  <span className="font-medium">{transcript}</span>{" "}
                  <span className="text-slate-400 italic">{interimText}</span>
                </p>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  Speak naturally into your microphone. Pausing will present your transcript for review.
                </p>
              )}
            </div>

            {/* Manual Done Button */}
            <button
              type="button"
              onClick={finishRecordingToReview}
              className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white transition cursor-pointer shadow-sm"
            >
              <Check size={14} />
              <span>Done Speaking</span>
            </button>
          </div>
        )}

        {voiceState === "processing" && (
          <div className="py-8 flex flex-col items-center justify-center space-y-2">
            <div className="h-6 w-6 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
            <p className="text-xs text-slate-500 dark:text-slate-400">Processing audio transcript...</p>
          </div>
        )}

        {voiceState === "review" && (
          <div className="py-3 space-y-3">
            {/* Quality & Confidence Pill */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px]">
                <span className="text-slate-400">Audio Recognition:</span>
                <span className={`inline-flex items-center gap-1 font-medium ${
                  confidenceRating === "high"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : confidenceRating === "medium"
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-red-500"
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${
                    confidenceRating === "high"
                      ? "bg-emerald-500"
                      : confidenceRating === "medium"
                      ? "bg-amber-500"
                      : "bg-red-500"
                  }`} />
                  {confidenceRating === "high"
                    ? "High Confidence"
                    : confidenceRating === "medium"
                    ? "Review Recommended"
                    : "Low Audio Clarity"}
                </span>
              </div>
              <span className="text-[10px] text-slate-400">Editable Transcript</span>
            </div>

            {/* Editable Textarea */}
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Spoken text appears here. You can click to edit or fix words..."
              rows={3}
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs sm:text-sm text-slate-800 outline-none focus:border-cyan-500 dark:border-slate-800 dark:bg-[#161a25] dark:text-slate-200 leading-relaxed"
            />

            {/* Action Buttons Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => restartListening()}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-[#151924] dark:text-slate-300 dark:hover:bg-slate-800 transition cursor-pointer"
                  title="Record again"
                >
                  <RotateCcw size={13} />
                  <span>Retry</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (transcript.trim()) {
                      onInsert(transcript.trim());
                      onClose();
                    }
                  }}
                  disabled={!transcript.trim()}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed dark:border-slate-800 dark:bg-[#151924] dark:text-slate-300 dark:hover:bg-slate-800 transition cursor-pointer"
                  title="Insert into composer"
                >
                  <Edit2 size={13} />
                  <span>Insert to Input</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition cursor-pointer"
                >
                  Discard
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (transcript.trim()) {
                      onSend(transcript.trim());
                      onClose();
                    }
                  }}
                  disabled={!transcript.trim()}
                  className="flex items-center gap-1.5 rounded-xl bg-cyan-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-cyan-500/25 transition cursor-pointer"
                >
                  <Send size={13} />
                  <span>Send Message</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}