import {
  Brain,
  ChevronDown,
  Code2,
  Sparkles,
  Zap,
  BookOpen,
  Palette,
  Check,
  Wand2,
  Image as ImageIcon,
} from "lucide-react";
import { useMemo, useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const AI_MODES = [
  {
    value: "auto",
    label: "Auto",
    description: "Smart intent routing for chat, image generation & coding",
    icon: Wand2,
  },
  {
    value: "normal",
    label: "Normal",
    description: "General conversations & balanced productivity",
    icon: Brain,
  },
  {
    value: "image",
    label: "Image",
    description: "AI image generation (DALL-E 3 / Flux.1)",
    icon: ImageIcon,
  },
  {
    value: "fast",
    label: "Fast",
    description: "Short, direct, high-speed answers",
    icon: Zap,
  },
  {
    value: "deep",
    label: "Deep Think",
    description: "Complex reasoning, edge cases & step-by-step logic",
    icon: Sparkles,
  },
  {
    value: "creative",
    label: "Creative",
    description: "Writing, brainstorming, and creative ideation",
    icon: Palette,
  },
  {
    value: "coding",
    label: "Coding",
    description: "Software architecture, clean code & debugging",
    icon: Code2,
  },
  {
    value: "research",
    label: "Research",
    description: "In-depth synthesis with web source citations",
    icon: BookOpen,
  },
];

interface ModeSelectorProps {
  mode: string;
  setMode: (value: string) => void;
  dropDirection?: "up" | "down" | "auto";
  align?: "left" | "right" | "auto";
  compactOnMobile?: boolean;
}

export default function ModeSelector({
  mode,
  setMode,
  dropDirection = "down",
  align = "right",
  compactOnMobile = false,
}: ModeSelectorProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeMode = useMemo(
    () => AI_MODES.find((item) => item.value === mode) || AI_MODES[0],
    [mode]
  );
  const ActiveIcon = activeMode.icon;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard navigation for accessible selection
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setOpen(true);
        setFocusedIndex(AI_MODES.findIndex((m) => m.value === mode));
      }
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((prev) => (prev + 1) % AI_MODES.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((prev) => (prev - 1 + AI_MODES.length) % AI_MODES.length);
    } else if (e.key === "Enter" && focusedIndex >= 0 && focusedIndex < AI_MODES.length) {
      e.preventDefault();
      setMode(AI_MODES[focusedIndex].value);
      setOpen(false);
    }
  };

  const isUp = dropDirection === "up";
  const isLeft = align === "left";

  return (
    <div className="relative" ref={dropdownRef} onKeyDown={handleKeyDown}>
      <button
        type="button"
        onClick={() => {
          setOpen(!open);
          if (!open) {
            setFocusedIndex(AI_MODES.findIndex((m) => m.value === mode));
          }
        }}
        className="flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:border-slate-300 dark:border-slate-800 dark:bg-[#12151e] dark:text-slate-300 dark:hover:border-slate-700 dark:hover:text-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-500/40 shrink-0"
        aria-label="Select AI mode"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <ActiveIcon size={14} className="text-cyan-500 shrink-0" />
        <span className={compactOnMobile ? "hidden md:inline" : "hidden xs:inline sm:inline"}>
          {activeMode.label}
        </span>
        <ChevronDown
          size={13}
          className={`text-slate-400 transition-transform duration-150 shrink-0 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: isUp ? 6 : -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: isUp ? 6 : -6 }}
            transition={{ duration: 0.12 }}
            role="listbox"
            aria-label="AI Modes"
            className={`absolute z-dropdown w-64 max-w-[calc(100vw-24px)] rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl backdrop-blur-md dark:border-slate-800 dark:bg-[#12151e] sm:w-72 ${
              isUp ? "bottom-full mb-2" : "top-full mt-1.5"
            } ${
              isLeft ? "left-0 origin-bottom-left" : "right-0 origin-top-right"
            }`}
          >
            <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800/60 mb-1">
              AI Mode
            </div>
            {/* Scrollable list container with real visible scrollbar */}
            <div className="max-h-[min(320px,50vh)] overflow-y-auto space-y-0.5 pr-0.5 [scrollbar-width:thin] [scrollbar-color:rgba(156,163,175,0.4)_transparent]">
              {AI_MODES.map((item, idx) => {
                const ItemIcon = item.icon;
                const isSelected = item.value === mode;
                const isFocused = idx === focusedIndex;

                return (
                  <button
                    key={item.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      setMode(item.value);
                      setOpen(false);
                    }}
                    onMouseEnter={() => setFocusedIndex(idx)}
                    className={`flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2 text-left transition cursor-pointer ${
                      isSelected
                        ? "bg-cyan-50 text-cyan-900 dark:bg-cyan-950/40 dark:text-cyan-200 ring-1 ring-cyan-500/20"
                        : isFocused
                        ? "bg-slate-100/80 text-slate-800 dark:bg-[#171b26] dark:text-slate-200"
                        : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-[#171b26]"
                    }`}
                  >
                    <div
                      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${
                        isSelected
                          ? "bg-cyan-500/20 text-cyan-600 dark:text-cyan-400"
                          : "bg-slate-100 text-slate-400 dark:bg-[#1b2030] dark:text-slate-400"
                      }`}
                    >
                      <ItemIcon size={13} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold">{item.label}</span>
                        {isSelected && (
                          <Check size={13} className="text-cyan-600 dark:text-cyan-400 shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 leading-snug mt-0.5 line-clamp-2">
                        {item.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
