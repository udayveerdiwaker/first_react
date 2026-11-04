import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import {
  X,
  Moon,
  Sun,
  Monitor,
  Trash2,
  Shield,
  Info,
  Database,
  Download,
  Upload,
  Cpu,
  Sliders,
  Check,
  CheckCircle2,
  AlertCircle,
  Brain,
  Volume2,
  Plus,
  BarChart3,
  Activity,
  Zap,
  Sparkles,
  Layers,
  RotateCcw,
} from "lucide-react";
import AntigravityLogo from "./AntigravityLogo";
import { saveChats } from "../store/chatStore";
import {
  getMemories,
  saveMemories,
  isMemoryEnabled,
  setMemoryEnabled,
  getProjects,
} from "../store/workspaceStore";
import type { MemoryItem } from "../agent/types";
import {
  getArtifactConfig,
  saveArtifactConfig,
  DEFAULT_ARTIFACT_CONFIG,
} from "../utils/artifactConfig";
import type { ArtifactThresholdConfig } from "../utils/artifactConfig";

interface SettingsModalProps {
  onClose: () => void;
  chatsCount: number;
  onClearAllChats: () => void;
  chats?: any[];
  setChats?: (chats: any[]) => void;
}

type SettingsTab =
  | "general"
  | "personalization"
  | "chat"
  | "artifacts"
  | "memory"
  | "voice"
  | "data"
  | "about";

export default function SettingsModal({
  onClose,
  chatsCount,
  onClearAllChats,
  chats = [],
  setChats,
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const [confirmClear, setConfirmClear] = useState(false);
  const [artifactConfig, setArtifactConfig] = useState<ArtifactThresholdConfig>(() =>
    getArtifactConfig()
  );

  const handleUpdateArtifactConfig = (partial: Partial<ArtifactThresholdConfig>) => {
    const updated = saveArtifactConfig(partial);
    setArtifactConfig({ ...updated });
  };
  const [backendStatus, setBackendStatus] = useState<"checking" | "online" | "offline">("checking");
  const [backendDetails, setBackendDetails] = useState<any>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Theme settings
  const [theme, setTheme] = useState<"dark" | "light" | "system">(() => {
    const saved =
      localStorage.getItem("zyrochat-theme") ||
      localStorage.getItem("app-theme") ||
      "dark";
    return saved as "dark" | "light" | "system";
  });

  // Reading density
  const [density, setDensity] = useState<"comfortable" | "compact">(() => {
    return (localStorage.getItem("zyrochat-density") || localStorage.getItem("app-density") || "comfortable") as "comfortable" | "compact";
  });

  // Default AI mode
  const [defaultMode, setDefaultMode] = useState<string>(() => {
    return localStorage.getItem("zyrochat-mode") || localStorage.getItem("app-mode") || "normal";
  });

  // Smooth streaming toggle
  const [smoothStreaming, setSmoothStreaming] = useState<boolean>(() => {
    const saved = localStorage.getItem("zyrochat-smooth-stream") || localStorage.getItem("app-smooth-stream");
    return saved === null ? true : saved === "true";
  });

  // Smart Memory State
  const [memories, setMemories] = useState<MemoryItem[]>(() => getMemories());
  const [memoryEnabledState, setMemoryEnabledState] = useState<boolean>(() => isMemoryEnabled());
  const [newMemoryText, setNewMemoryText] = useState("");
  const [newMemoryCategory, setNewMemoryCategory] = useState<"preference" | "work" | "tech">("preference");

  // Speech Synthesis Voice State
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>(() => {
    return localStorage.getItem("zyrochat-speech-voice") || "";
  });
  const [speechRate, setSpeechRate] = useState<number>(() => {
    const saved = localStorage.getItem("zyrochat-speech-rate");
    return saved ? parseFloat(saved) : 1;
  });
  const [autoReadResponses, setAutoReadResponses] = useState<boolean>(() => {
    return localStorage.getItem("zyrochat-speech-autoread") === "true";
  });

  // AI Personalization Preferences
  const [prefStyle, setPrefStyle] = useState<string>(
    () => localStorage.getItem("zyrochat-pref-style") || "Balanced"
  );
  const [prefLanguage, setPrefLanguage] = useState<string>(
    () => localStorage.getItem("zyrochat-pref-language") || "English"
  );
  const [prefExpertise, setPrefExpertise] = useState<string>(
    () => localStorage.getItem("zyrochat-pref-expertise") || "Advanced"
  );
  const [prefTone, setPrefTone] = useState<string>(
    () => localStorage.getItem("zyrochat-pref-tone") || "Professional"
  );

  const handleStyleChange = (val: string) => {
    setPrefStyle(val);
    localStorage.setItem("zyrochat-pref-style", val);
  };
  const handleLanguageChange = (val: string) => {
    setPrefLanguage(val);
    localStorage.setItem("zyrochat-pref-language", val);
  };
  const handleExpertiseChange = (val: string) => {
    setPrefExpertise(val);
    localStorage.setItem("zyrochat-pref-expertise", val);
  };
  const handleToneChange = (val: string) => {
    setPrefTone(val);
    localStorage.setItem("zyrochat-pref-tone", val);
  };

  // Fetch synthesis voices
  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const loadVoices = () => {
      const v = window.speechSynthesis.getVoices();
      if (v.length > 0) {
        setVoices(v);
        if (!selectedVoiceURI && v[0]) {
          setSelectedVoiceURI(v[0].voiceURI);
        }
      }
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, [selectedVoiceURI]);

  // Check backend health
  useEffect(() => {
    let isMounted = true;
    fetch("http://localhost:5000/api/health")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (isMounted) {
          setBackendStatus("online");
          setBackendDetails(data);
        }
      })
      .catch(() => {
        if (isMounted) setBackendStatus("offline");
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Compute analytics
  const analytics = useMemo(() => {
    let totalMessages = 0;
    let totalWords = 0;
    let botReplies = 0;

    chats.forEach((c) => {
      const msgs = c.messages || [];
      totalMessages += msgs.length;
      msgs.forEach((m: any) => {
        if (m.role === "assistant") botReplies++;
        if (m.text) {
          totalWords += m.text.trim().split(/\s+/).length;
        }
      });
    });

    const projects = getProjects();

    return {
      totalConversations: chats.length,
      totalMessages,
      botReplies,
      estimatedTokens: Math.round(totalWords * 1.3),
      memoriesCount: memories.length,
      projectsCount: projects.length,
    };
  }, [chats, memories]);

  // Handlers
  const handleThemeChange = (newTheme: "dark" | "light" | "system") => {
    setTheme(newTheme);
    localStorage.setItem("zyrochat-theme", newTheme);
    localStorage.setItem("app-theme", newTheme);

    const isDark =
      newTheme === "dark" ||
      (newTheme === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);

    document.documentElement.classList.toggle("dark", isDark);
  };

  const handleDensityChange = (newDensity: "comfortable" | "compact") => {
    setDensity(newDensity);
    localStorage.setItem("zyrochat-density", newDensity);
    localStorage.setItem("app-density", newDensity);
    document.documentElement.setAttribute("data-density", newDensity);
  };

  const handleDefaultModeChange = (mode: string) => {
    setDefaultMode(mode);
    localStorage.setItem("zyrochat-mode", mode);
    localStorage.setItem("app-mode", mode);
  };

  const handleStreamingToggle = (enabled: boolean) => {
    setSmoothStreaming(enabled);
    localStorage.setItem("zyrochat-smooth-stream", String(enabled));
  };

  const handleMemoryToggle = (enabled: boolean) => {
    setMemoryEnabledState(enabled);
    setMemoryEnabled(enabled);
  };

  const handleAddMemory = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMemoryText.trim()) return;

    const item: MemoryItem = {
      id: "mem-" + Date.now(),
      key: newMemoryCategory,
      value: newMemoryText.trim(),
      category: newMemoryCategory,
      createdAt: Date.now(),
    };

    const updated = [item, ...memories];
    setMemories(updated);
    saveMemories(updated);
    setNewMemoryText("");
  };

  const handleDeleteMemory = (id: string) => {
    const updated = memories.filter((m) => m.id !== id);
    setMemories(updated);
    saveMemories(updated);
  };

  const handleClearAllMemories = () => {
    setMemories([]);
    saveMemories([]);
  };

  const handleVoiceChange = (uri: string) => {
    setSelectedVoiceURI(uri);
    localStorage.setItem("zyrochat-speech-voice", uri);
  };

  const handleRateChange = (rate: number) => {
    setSpeechRate(rate);
    localStorage.setItem("zyrochat-speech-rate", rate.toString());
  };

  const handleAutoReadToggle = (enabled: boolean) => {
    setAutoReadResponses(enabled);
    localStorage.setItem("zyrochat-speech-autoread", String(enabled));
  };

  const testVoice = () => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance("Hello! ZyroChat voice playback is operating correctly.");
    if (selectedVoiceURI) {
      const v = voices.find((vox) => vox.voiceURI === selectedVoiceURI);
      if (v) utterance.voice = v;
    }
    utterance.rate = speechRate;
    window.speechSynthesis.speak(utterance);
  };

  // Export JSON backup
  const handleExportBackup = () => {
    if (!chats.length) return;
    const backupData = {
      version: "2.5.0",
      app: "ZyroChat",
      exportedAt: new Date().toISOString(),
      conversations: chats,
      memories,
    };
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(backupData, null, 2)
    )}`;
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", jsonString);
    downloadAnchor.setAttribute(
      "download",
      `zyrochat-backup-${new Date().toISOString().slice(0, 10)}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import JSON backup
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        const importedChats = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed.conversations)
          ? parsed.conversations
          : null;

        if (!importedChats) {
          throw new Error("Invalid backup format");
        }

        const merged = [...importedChats, ...chats];
        const uniqueChats = merged.filter(
          (c, index, self) =>
            index === self.findIndex((item) => (item.updatedAt || item.title) === (c.updatedAt || c.title))
        );

        saveChats(uniqueChats);
        if (setChats) {
          setChats(uniqueChats);
        }

        if (Array.isArray(parsed.memories)) {
          const mergedMemories = [...parsed.memories, ...memories];
          const uniqueMem = mergedMemories.filter(
            (m: any, index, self: any[]) =>
              index === self.findIndex((x: any) => (x.value || x.text) === (m.value || m.text))
          );
          setMemories(uniqueMem);
          saveMemories(uniqueMem);
        }

        setImportSuccess(`Successfully imported ${importedChats.length} conversation(s)!`);
        setImportError(null);
        setTimeout(() => setImportSuccess(null), 4000);
      } catch (err: any) {
        setImportError(err.message || "Failed to parse backup file");
        setImportSuccess(null);
        setTimeout(() => setImportError(null), 4000);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
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
        className="flex max-h-[min(92vh,92dvh)] w-full max-w-[min(576px,calc(100vw-16px))] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#11141d]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-3.5 sm:px-6 py-3 sm:py-3.5 dark:border-slate-800/80 gap-2">
          <div className="flex items-center gap-2.5">
            <AntigravityLogo size={26} />
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>ZyroChat Workspace Settings</span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Personalization, Smart Memory, AI Modes, and Data
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition cursor-pointer shrink-0"
            aria-label="Close settings"
          >
            <X size={18} />
          </button>
        </div>

        {/* Segmented Navigation Tabs */}
        <div className="flex border-b border-slate-100 px-2 sm:px-6 pt-2 dark:border-slate-800/80 overflow-x-auto no-scrollbar gap-1 shrink-0">
          {[
            { id: "general", label: "General", icon: Sliders },
            { id: "personalization", label: "Personalization", icon: Sparkles },
            { id: "chat", label: "AI Modes", icon: Cpu },
            { id: "artifacts", label: "Artifacts & Files", icon: Layers },
            { id: "memory", label: "Smart Memory", icon: Brain },
            { id: "voice", label: "Voice & Audio", icon: Volume2 },
            { id: "data", label: "Usage & Data", icon: Database },
            { id: "about", label: "System & Health", icon: Info },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as SettingsTab)}
                className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                  isActive
                    ? "border-cyan-500 text-cyan-600 dark:text-cyan-400 font-semibold"
                    : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
          {/* TAB 1: GENERAL */}
          {activeTab === "general" && (
            <div className="space-y-4">
              {/* Theme appearance */}
              <div className="space-y-2">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Theme Appearance
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "dark", label: "Dark", icon: Moon },
                    { id: "light", label: "Light", icon: Sun },
                    { id: "system", label: "System", icon: Monitor },
                  ].map((item) => {
                    const Icon = item.icon;
                    const selected = theme === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleThemeChange(item.id as any)}
                        className={`flex flex-col items-center justify-center gap-2 rounded-xl border p-3 transition cursor-pointer ${
                          selected
                            ? "border-cyan-500/80 bg-cyan-500/5 text-cyan-600 dark:border-cyan-500/80 dark:bg-cyan-500/10 dark:text-cyan-400 shadow-sm"
                            : "border-slate-200/80 bg-slate-50/50 text-slate-600 hover:border-slate-300 dark:border-slate-800 dark:bg-[#151924]/60 dark:text-slate-400 dark:hover:border-slate-700"
                        }`}
                      >
                        <Icon size={16} />
                        <span className="text-[11px] font-medium">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Message Density / Reading Size */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Message Layout Density
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleDensityChange("comfortable")}
                    className={`flex items-center justify-between rounded-xl border p-3 text-left transition cursor-pointer ${
                      density === "comfortable"
                        ? "border-cyan-500/80 bg-cyan-500/5 text-cyan-600 dark:border-cyan-500/80 dark:bg-cyan-500/10 dark:text-cyan-400"
                        : "border-slate-200/80 bg-slate-50/50 text-slate-600 hover:border-slate-300 dark:border-slate-800 dark:bg-[#151924]/60 dark:text-slate-400"
                    }`}
                  >
                    <div>
                      <p className="text-xs font-semibold">Comfortable</p>
                      <p className="text-[10px] text-slate-400">Standard relaxed spacing</p>
                    </div>
                    {density === "comfortable" && <Check size={14} className="text-cyan-500" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDensityChange("compact")}
                    className={`flex items-center justify-between rounded-xl border p-3 text-left transition cursor-pointer ${
                      density === "compact"
                        ? "border-cyan-500/80 bg-cyan-500/5 text-cyan-600 dark:border-cyan-500/80 dark:bg-cyan-500/10 dark:text-cyan-400"
                        : "border-slate-200/80 bg-slate-50/50 text-slate-600 hover:border-slate-300 dark:border-slate-800 dark:bg-[#151924]/60 dark:text-slate-400"
                    }`}
                  >
                    <div>
                      <p className="text-xs font-semibold">Compact</p>
                      <p className="text-[10px] text-slate-400">Higher screen density</p>
                    </div>
                    {density === "compact" && <Check size={14} className="text-cyan-500" />}
                  </button>
                </div>
              </div>

              {/* User Plan Card */}
              <div className="flex items-center justify-between rounded-xl border border-slate-200/70 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-[#151924]/60">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-xs font-semibold text-white dark:bg-white dark:text-slate-950">
                    U
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-white">User Workspace</p>
                    <p className="text-[10px] text-cyan-600 dark:text-cyan-400 font-medium">Professional Workspace Active</p>
                  </div>
                </div>
                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[10px] font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  Ready
                </span>
              </div>
            </div>
          )}

          {/* TAB 2: AI MODES */}
          {activeTab === "chat" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Default AI Mode for New Chats
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "normal", label: "Normal Mode", desc: "Balanced reasoning & practical answers" },
                    { id: "fast", label: "Fast Mode", desc: "Low-latency concise responses" },
                    { id: "deep", label: "Deep Think", desc: "Step-by-step rigorous analytical breakdown" },
                    { id: "creative", label: "Creative", desc: "Engaging, expressive & witty ideation" },
                    { id: "coding", label: "Coding Expert", desc: "Clean architecture, tests & debugging" },
                    { id: "research", label: "Deep Research", desc: "Multi-source synthesis & structured citations" },
                  ].map((m) => {
                    const isSelected = defaultMode === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleDefaultModeChange(m.id)}
                        className={`flex items-start justify-between rounded-xl border p-2.5 text-left transition cursor-pointer ${
                          isSelected
                            ? "border-cyan-500/80 bg-cyan-500/5 text-cyan-600 dark:border-cyan-500/80 dark:bg-cyan-500/10 dark:text-cyan-400 shadow-sm"
                            : "border-slate-200/80 bg-slate-50/50 text-slate-600 hover:border-slate-300 dark:border-slate-800 dark:bg-[#151924]/60 dark:text-slate-400"
                        }`}
                      >
                        <div>
                          <p className="text-xs font-semibold">{m.label}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">{m.desc}</p>
                        </div>
                        {isSelected && <Check size={14} className="text-cyan-500 mt-0.5 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Streaming pacing option */}
              <div className="flex items-center justify-between rounded-xl border border-slate-200/70 p-3 dark:border-slate-800/70">
                <div>
                  <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                    Smooth Typewriter Streaming
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Animate incoming words fluidly at 60fps pacing
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleStreamingToggle(!smoothStreaming)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    smoothStreaming ? "bg-cyan-500" : "bg-slate-300 dark:bg-slate-700"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      smoothStreaming ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Tools routing card */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-800/60 dark:bg-[#141724]/40 space-y-1">
                <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Zap size={13} className="text-cyan-500" />
                  <span>Integrated Real-Time Tools</span>
                </p>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Web Search (DuckDuckGo/Wikipedia), Live Code Sandbox Runner, Real-time Calculator, Weather, and Time detection are automatically activated when queries require fresh information.
                </p>
              </div>
            </div>
          )}

          {/* TAB: PERSONALIZATION */}
          {activeTab === "personalization" && (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  AI Response Personalization
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Customize how ZyroChat structures explanations, matches your language, and tunes its tone.
                </p>
              </div>

              {/* Response Style */}
              <div>
                <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1.5 block">
                  Response Style
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "Concise", label: "Concise", desc: "Bullets & direct takeaways" },
                    { id: "Balanced", label: "Balanced", desc: "Optimal depth & clarity" },
                    { id: "Detailed", label: "Detailed", desc: "In-depth with examples" },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleStyleChange(s.id)}
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                        prefStyle === s.id
                          ? "border-cyan-500 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 ring-1 ring-cyan-500/30"
                          : "border-slate-200/70 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <p className="text-xs font-semibold">{s.label}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">{s.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Language */}
              <div>
                <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1.5 block">
                  Preferred Language
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {["English", "Hindi", "Hinglish", "Spanish", "French", "German"].map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => handleLanguageChange(lang)}
                      className={`p-2 rounded-xl border text-xs font-medium text-center transition cursor-pointer ${
                        prefLanguage === lang
                          ? "border-cyan-500 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-semibold ring-1 ring-cyan-500/30"
                          : "border-slate-200/70 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>

              {/* Expertise Level */}
              <div>
                <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1.5 block">
                  Expertise Level
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: "Beginner", label: "Beginner", desc: "No jargon, intuitive" },
                    { id: "Intermediate", label: "Intermediate", desc: "Practical & clear" },
                    { id: "Advanced", label: "Advanced", desc: "Rigor & code snippets" },
                    { id: "Expert", label: "Expert", desc: "Deep system internals" },
                  ].map((lvl) => (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => handleExpertiseChange(lvl.id)}
                      className={`p-2 rounded-xl border text-left transition cursor-pointer ${
                        prefExpertise === lvl.id
                          ? "border-cyan-500 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 ring-1 ring-cyan-500/30"
                          : "border-slate-200/70 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <p className="text-xs font-semibold">{lvl.label}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">{lvl.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tone */}
              <div>
                <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1.5 block">
                  Tone of Voice
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: "Professional", label: "Professional", desc: "Objective & structured" },
                    { id: "Friendly", label: "Friendly", desc: "Warm & supportive" },
                    { id: "Casual", label: "Casual", desc: "Direct & relaxed" },
                    { id: "Academic", label: "Academic", desc: "Formal & cited" },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleToneChange(t.id)}
                      className={`p-2 rounded-xl border text-left transition cursor-pointer ${
                        prefTone === t.id
                          ? "border-cyan-500 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 ring-1 ring-cyan-500/30"
                          : "border-slate-200/70 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <p className="text-xs font-semibold">{t.label}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">{t.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Interactive Live Preview Card */}
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-[#141724]/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold tracking-wide uppercase text-cyan-600 dark:text-cyan-400 flex items-center gap-1.5">
                    <Sparkles size={12} />
                    Live Personality Preview
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {prefStyle} • {prefLanguage} • {prefExpertise} • {prefTone}
                  </span>
                </div>
                <div className="rounded-lg bg-white p-3 text-xs text-slate-700 dark:bg-slate-900/90 dark:text-slate-300 shadow-sm border border-slate-100 dark:border-slate-800 font-sans leading-relaxed">
                  {prefLanguage === "Hindi" && "यहाँ बताया गया है कि ZyroChat आपके लिए उत्तर कैसे तैयार करेगा:\n\n"}
                  {prefLanguage === "Hinglish" && "Aapke selected preferences ke according ZyroChat aise respond karega:\n\n"}
                  {prefLanguage === "Spanish" && "Así es como ZyroChat formateará las respuestas para usted:\n\n"}
                  {prefLanguage === "French" && "Voici comment ZyroChat formatera les réponses pour vous :\n\n"}
                  {prefLanguage === "German" && "So wird ZyroChat Antworten für Sie formatieren:\n\n"}
                  {prefLanguage === "English" && "Here is how ZyroChat will format answers for you:\n\n"}
                  {prefStyle === "Concise" ? (
                    <ul className="list-disc pl-4 space-y-1">
                      <li>Targeted overview calibrated for {prefExpertise.toLowerCase()} comprehension.</li>
                      <li>High signal-to-noise ratio delivered in a {prefTone.toLowerCase()} tone.</li>
                      <li>Key actionable points presented immediately.</li>
                    </ul>
                  ) : prefStyle === "Detailed" ? (
                    <p>
                      This comprehensive response explores foundational architecture, implementation trade-offs, and practical edge cases. Written specifically for an {prefExpertise.toLowerCase()} technical background using a {prefTone.toLowerCase()} approach to maximize retention and actionable execution.
                    </p>
                  ) : (
                    <p>
                      ZyroChat balances clear conceptual clarity with practical execution, calibrated specifically for {prefExpertise.toLowerCase()} expertise in an engaging {prefTone.toLowerCase()} tone.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: ARTIFACTS & WORKSPACE */}
          {activeTab === "artifacts" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200/70 p-3.5 dark:border-slate-800 bg-slate-50/50 dark:bg-[#141724]/50">
                <div className="flex items-center gap-2.5 mb-1.5">
                  <Layers size={16} className="text-cyan-500" />
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Automatic Artifact Creation Thresholds
                  </p>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  When ZyroChat generates substantial code, documents, or data exceeding these thresholds, it automatically creates an interactive workspace artifact with side-by-side editing, live preview, version history, and multi-format exports.
                </p>
              </div>

              {/* Line count threshold */}
              <div className="space-y-1.5 rounded-xl border border-slate-200/70 p-3.5 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Line Count Threshold
                  </label>
                  <span className="font-mono text-xs font-semibold text-cyan-600 dark:text-cyan-400">
                    {artifactConfig.lineThreshold} lines
                  </span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="100"
                  step="5"
                  value={artifactConfig.lineThreshold}
                  onChange={(e) =>
                    handleUpdateArtifactConfig({ lineThreshold: parseInt(e.target.value, 10) })
                  }
                  className="w-full accent-cyan-500 cursor-pointer"
                />
                <p className="text-[10px] text-slate-400">
                  Code or documents with at least {artifactConfig.lineThreshold} lines will open as an artifact.
                </p>
              </div>

              {/* Character threshold */}
              <div className="space-y-1.5 rounded-xl border border-slate-200/70 p-3.5 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Character Count Threshold
                  </label>
                  <span className="font-mono text-xs font-semibold text-cyan-600 dark:text-cyan-400">
                    {artifactConfig.charThreshold.toLocaleString()} chars
                  </span>
                </div>
                <input
                  type="range"
                  min="500"
                  max="4000"
                  step="100"
                  value={artifactConfig.charThreshold}
                  onChange={(e) =>
                    handleUpdateArtifactConfig({ charThreshold: parseInt(e.target.value, 10) })
                  }
                  className="w-full accent-cyan-500 cursor-pointer"
                />
                <p className="text-[10px] text-slate-400">
                  Outputs exceeding {artifactConfig.charThreshold} characters will become dedicated artifacts.
                </p>
              </div>

              {/* Token threshold */}
              <div className="space-y-1.5 rounded-xl border border-slate-200/70 p-3.5 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Token Count Threshold
                  </label>
                  <span className="font-mono text-xs font-semibold text-cyan-600 dark:text-cyan-400">
                    ~{artifactConfig.tokenThreshold} tokens
                  </span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="1000"
                  step="50"
                  value={artifactConfig.tokenThreshold}
                  onChange={(e) =>
                    handleUpdateArtifactConfig({ tokenThreshold: parseInt(e.target.value, 10) })
                  }
                  className="w-full accent-cyan-500 cursor-pointer"
                />
                <p className="text-[10px] text-slate-400">
                  Estimated tokens generated before materializing as an artifact.
                </p>
              </div>

              {/* Reset to defaults */}
              <div className="pt-1 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleUpdateArtifactConfig(DEFAULT_ARTIFACT_CONFIG)}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-[#151924] dark:text-slate-300 transition cursor-pointer"
                >
                  <RotateCcw size={12} />
                  <span>Reset Artifact Defaults</span>
                </button>
                <span className="text-[10px] text-slate-400">
                  Pure-JS Excel & ZIP Exports Active
                </span>
              </div>
            </div>
          )}

          {/* TAB 3: SMART MEMORY */}
          {activeTab === "memory" && (
            <div className="space-y-4">
              {/* Enable / Disable toggle */}
              <div className="flex items-center justify-between rounded-xl border border-slate-200/70 p-3.5 dark:border-slate-800 bg-slate-50/50 dark:bg-[#141724]/50">
                <div className="flex items-center gap-2.5">
                  <Brain size={16} className="text-cyan-500" />
                  <div>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Smart Memory Integration
                    </p>
                    <p className="text-[10px] text-slate-400">
                      ZyroChat retains your preferences and context across new conversations
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleMemoryToggle(!memoryEnabledState)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    memoryEnabledState ? "bg-cyan-500" : "bg-slate-300 dark:bg-slate-700"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      memoryEnabledState ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Add Memory Form */}
              <form onSubmit={handleAddMemory} className="space-y-2 rounded-xl border border-slate-200/70 p-3 dark:border-slate-800">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Add New Context or Preference
                </label>
                <div className="flex gap-2">
                  <select
                    value={newMemoryCategory}
                    onChange={(e) => setNewMemoryCategory(e.target.value as any)}
                    className="rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none dark:border-slate-700 dark:bg-[#141724] dark:text-slate-300"
                  >
                    <option value="preference">Preference</option>
                    <option value="tech">Tech Stack</option>
                    <option value="work">Work Role</option>
                  </select>
                  <input
                    type="text"
                    value={newMemoryText}
                    onChange={(e) => setNewMemoryText(e.target.value)}
                    placeholder="e.g. Always write responses in concise bullet points..."
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-cyan-500 dark:border-slate-700 dark:bg-[#141724] dark:text-slate-200"
                  />
                  <button
                    type="submit"
                    disabled={!newMemoryText.trim()}
                    className="flex items-center gap-1 rounded-xl bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-500 disabled:opacity-40 transition cursor-pointer"
                  >
                    <Plus size={13} />
                    <span>Add</span>
                  </button>
                </div>
              </form>

              {/* Stored Memory Items List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Active Memories ({memories.length})
                  </label>
                  {memories.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAllMemories}
                      className="text-[10px] text-red-500 hover:underline cursor-pointer"
                    >
                      Clear All Memories
                    </button>
                  )}
                </div>

                {memories.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-slate-400 dark:border-slate-800">
                    <Brain size={20} className="mx-auto mb-1 opacity-40" />
                    <p className="text-xs">No active memories stored</p>
                    <p className="text-[10px] mt-0.5">Add preferences above or chat naturally to store context.</p>
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                    {memories.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-slate-50/60 px-3 py-2 text-xs dark:border-slate-800 dark:bg-[#151924]/60"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="rounded-md bg-cyan-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-cyan-600 dark:text-cyan-400 shrink-0">
                            {m.category || "pref"}
                          </span>
                          <span className="truncate text-slate-700 dark:text-slate-300">
                            {m.value}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteMemory(m.id)}
                          className="rounded-lg p-1 text-slate-400 hover:text-red-500 transition cursor-pointer"
                          title="Delete memory"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: VOICE & AUDIO */}
          {activeTab === "voice" && (
            <div className="space-y-4">
              {/* Auto-read responses */}
              <div className="flex items-center justify-between rounded-xl border border-slate-200/70 p-3 dark:border-slate-800/70">
                <div>
                  <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                    Auto Read-Aloud Responses
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Automatically speak ZyroChat responses when finished generating
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleAutoReadToggle(!autoReadResponses)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    autoReadResponses ? "bg-cyan-500" : "bg-slate-300 dark:bg-slate-700"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      autoReadResponses ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Voice Selector */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Synthesis Voice
                </label>
                <select
                  value={selectedVoiceURI}
                  onChange={(e) => handleVoiceChange(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-800 outline-none dark:border-slate-800 dark:bg-[#151924] dark:text-slate-200"
                >
                  {voices.length === 0 && <option value="">Default System Voice</option>}
                  {voices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </select>
              </div>

              {/* Speech Rate Slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Playback Speed
                  </label>
                  <span className="font-mono text-xs font-semibold text-cyan-600 dark:text-cyan-400">
                    {speechRate}x
                  </span>
                </div>
                <input
                  type="range"
                  min="0.75"
                  max="1.5"
                  step="0.05"
                  value={speechRate}
                  onChange={(e) => handleRateChange(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>

              {/* Test voice button */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={testVoice}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-[#151924] dark:text-slate-200 dark:hover:bg-[#1a1f2d] transition cursor-pointer"
                >
                  <Volume2 size={14} className="text-cyan-500" />
                  <span>Test Voice Playback</span>
                </button>
              </div>

              {/* Voice Activity Detection (VAD) Silence Timeout */}
              <div className="space-y-1.5 rounded-xl border border-slate-200/70 p-3.5 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Voice Silence Timeout (VAD)
                  </label>
                  <span className="font-mono text-xs font-semibold text-cyan-600 dark:text-cyan-400">
                    {(artifactConfig.voiceSilenceTimeoutMs / 1000).toFixed(1)}s
                  </span>
                </div>
                <input
                  type="range"
                  min="1000"
                  max="5000"
                  step="250"
                  value={artifactConfig.voiceSilenceTimeoutMs}
                  onChange={(e) =>
                    handleUpdateArtifactConfig({ voiceSilenceTimeoutMs: parseInt(e.target.value, 10) })
                  }
                  className="w-full accent-cyan-500 cursor-pointer"
                />
                <p className="text-[10px] text-slate-400">
                  Duration of natural silence before voice recording pauses and opens the transcript Review Card (never auto-sends prematurely).
                </p>
              </div>

              {/* Speech Recognition Language */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Default Speech Recognition Language
                </label>
                <select
                  value={artifactConfig.voiceLanguage}
                  onChange={(e) =>
                    handleUpdateArtifactConfig({ voiceLanguage: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-800 outline-none dark:border-slate-800 dark:bg-[#151924] dark:text-slate-200 cursor-pointer"
                >
                  <option value="auto">Auto-detect Language</option>
                  <option value="en-US">English (US)</option>
                  <option value="en-IN">English (India)</option>
                  <option value="hi-IN">Hindi (हिन्दी)</option>
                  <option value="es-ES">Spanish (Español)</option>
                  <option value="fr-FR">French (Français)</option>
                  <option value="de-DE">German (Deutsch)</option>
                  <option value="zh-CN">Chinese (中文)</option>
                  <option value="ja-JP">Japanese (日本語)</option>
                </select>
              </div>
            </div>
          )}

          {/* TAB 5: USAGE & DATA */}
          {activeTab === "data" && (
            <div className="space-y-4">
              {/* Feedback banners */}
              {importSuccess && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={15} className="shrink-0" />
                  <span>{importSuccess}</span>
                </div>
              )}
              {importError && (
                <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-500">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {/* Usage Dashboard Statistics */}
              <div className="space-y-2">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                  <BarChart3 size={13} className="text-cyan-500" />
                  <span>Workspace Activity Analytics</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-2.5 dark:border-slate-800 dark:bg-[#151924]/60">
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">Chats</p>
                    <p className="text-base font-bold text-slate-800 dark:text-white mt-0.5">{analytics.totalConversations}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-2.5 dark:border-slate-800 dark:bg-[#151924]/60">
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">Total Turns</p>
                    <p className="text-base font-bold text-cyan-600 dark:text-cyan-400 mt-0.5">{analytics.totalMessages}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-2.5 dark:border-slate-800 dark:bg-[#151924]/60">
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">Est. Tokens</p>
                    <p className="text-base font-bold text-slate-800 dark:text-white mt-0.5">{analytics.estimatedTokens.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Backup & Export Options */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Backup & Portability
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleExportBackup}
                    disabled={!chatsCount}
                    className="flex items-center justify-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50 p-2.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40 dark:border-slate-800 dark:bg-[#151924]/80 dark:text-slate-200 dark:hover:bg-[#181c2b] cursor-pointer"
                  >
                    <Download size={14} className="text-cyan-500" />
                    <span>Export JSON</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50 p-2.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-[#151924]/80 dark:text-slate-200 dark:hover:bg-[#181c2b] cursor-pointer"
                  >
                    <Upload size={14} className="text-cyan-500" />
                    <span>Import Backup</span>
                  </button>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImportBackup}
                    accept=".json"
                    className="hidden"
                  />
                </div>
              </div>

              {/* Clear all chats */}
              <div className="rounded-xl border border-red-200/60 bg-red-50/20 p-3 dark:border-red-950/40 dark:bg-red-950/10 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-red-600 dark:text-red-400">
                      Clear All Conversations
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Permanently wipe all conversations from local memory
                    </p>
                  </div>
                  {confirmClear ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          onClearAllChats();
                          setConfirmClear(false);
                          onClose();
                        }}
                        className="rounded-lg bg-red-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-red-700 cursor-pointer"
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmClear(false)}
                        className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmClear(true)}
                      className="flex items-center gap-1 rounded-xl border border-red-200 bg-red-50/80 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400 cursor-pointer"
                    >
                      <Trash2 size={13} />
                      <span>Clear All</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: SYSTEM & HEALTH */}
          {activeTab === "about" && (
            <div className="space-y-4">
              {/* Server connection status */}
              <div className="rounded-xl border border-slate-200/70 p-3.5 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Activity size={14} className="text-cyan-500" />
                      <span>Backend & MCP Server</span>
                    </p>
                    <p className="text-[10px] text-slate-400">http://localhost:5000/api</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        backendStatus === "online"
                          ? "bg-emerald-500 animate-pulse"
                          : backendStatus === "checking"
                          ? "bg-amber-500"
                          : "bg-red-500"
                      }`}
                    />
                    <span
                      className={`text-[11px] font-medium capitalize ${
                        backendStatus === "online"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : backendStatus === "checking"
                          ? "text-amber-500"
                          : "text-red-500"
                      }`}
                    >
                      {backendStatus}
                    </span>
                  </div>
                </div>

                {backendDetails && (
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/60 text-[10px] text-slate-500">
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      Search: {backendDetails.webSearch || "enabled"}
                    </span>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      MCP: {backendDetails.mcp || "enabled"}
                    </span>
                  </div>
                )}
              </div>

              {/* Privacy summary */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 dark:border-slate-800/60 dark:bg-[#141724]/40 space-y-1.5">
                <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                  <Shield size={14} className="text-cyan-500" />
                  <span>Privacy & Zero-Tracking</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Your chat logs, memories, files, and project settings remain stored strictly in your browser's local sandbox storage. No telemetry or tracking scripts are deployed.
                </p>
              </div>

              {/* Version info */}
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                <span>Application Version</span>
                <span className="font-mono font-medium text-slate-600 dark:text-slate-300">ZyroChat Workspace v2.5.0</span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 sm:px-6 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#0e1017]/50">
          <span className="text-[10px] text-slate-400">
            Changes saved automatically
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}
