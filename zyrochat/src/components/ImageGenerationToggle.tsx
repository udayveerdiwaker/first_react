import { useState, useRef, useEffect } from "react";
import { Sparkles, ChevronDown, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export type AspectRatioOption = "1:1" | "16:9" | "9:16" | "4:3";

interface ImageGenerationToggleProps {
  active: boolean;
  onToggle: () => void;
  aspectRatio: AspectRatioOption;
  onAspectRatioChange: (ratio: AspectRatioOption) => void;
  disabled?: boolean;
}

const ASPECT_RATIOS: { value: AspectRatioOption; label: string; desc: string }[] = [
  { value: "1:1", label: "1:1", desc: "Square (Social, Avatars)" },
  { value: "16:9", label: "16:9", desc: "Landscape (Cinematic, Banners)" },
  { value: "9:16", label: "9:16", desc: "Portrait (Stories, Wallpaper)" },
  { value: "4:3", label: "4:3", desc: "Standard (Photography, Prints)" },
];

export default function ImageGenerationToggle({
  active,
  onToggle,
  aspectRatio,
  onAspectRatioChange,
  disabled = false,
}: ImageGenerationToggleProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <div className="flex items-center">
        {/* Main Mode Toggle Button */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            if (!disabled) {
              onToggle();
            }
          }}
          className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-medium transition-all cursor-pointer select-none ${
            active
              ? "border-purple-500/80 bg-purple-500/15 text-purple-600 dark:text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.25)]"
              : "border-slate-200/80 bg-slate-50 text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:border-slate-800 dark:bg-[#151924] dark:text-slate-400 dark:hover:border-slate-700 dark:hover:text-slate-200"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
          title={active ? "Image Generation is active" : "Enable Image Generation mode"}
          aria-label="Toggle Image Generation"
        >
          <Sparkles
            size={13}
            className={`shrink-0 ${
              active
                ? "text-purple-500 dark:text-purple-400 animate-pulse"
                : "text-slate-400"
            }`}
          />
          <span className="font-medium">
            {active ? `Image (${aspectRatio})` : "Image"}
          </span>
        </button>

        {/* Aspect Ratio Options Dropdown Trigger (visible when active) */}
        {active && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => setMenuOpen(!menuOpen)}
            className="ml-0.5 flex h-6 w-6 items-center justify-center rounded-lg text-purple-600 hover:bg-purple-100/60 dark:text-purple-300 dark:hover:bg-purple-950/40 transition cursor-pointer"
            title="Choose aspect ratio"
            aria-label="Choose aspect ratio"
            aria-haspopup="listbox"
            aria-expanded={menuOpen}
          >
            <ChevronDown
              size={12}
              className={`transition-transform duration-150 ${menuOpen ? "rotate-180" : ""}`}
            />
          </button>
        )}
      </div>

      {/* Upward-Opening Aspect Ratio Menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 6 }}
            transition={{ duration: 0.12 }}
            className="absolute bottom-full left-0 z-dropdown mb-2 w-64 max-w-[calc(100vw-24px)] origin-bottom-left rounded-2xl border border-slate-200 bg-white p-2 shadow-xl backdrop-blur-md dark:border-slate-800 dark:bg-[#12151e]"
          >
            <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800/70 mb-1.5 flex items-center justify-between">
              <span>Aspect Ratio</span>
              <span className="text-[9px] text-purple-500 font-normal">AI Image</span>
            </div>

            <div className="space-y-1">
              {ASPECT_RATIOS.map((item) => {
                const isSelected = item.value === aspectRatio;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => {
                      onAspectRatioChange(item.value);
                      setMenuOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-left text-xs transition cursor-pointer ${
                      isSelected
                        ? "bg-purple-500/10 text-purple-600 font-semibold dark:bg-purple-500/20 dark:text-purple-300"
                        : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-[#171a26]"
                    }`}
                  >
                    <div>
                      <span className="font-semibold">{item.label}</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-2 block sm:inline">
                        {item.desc}
                      </span>
                    </div>
                    {isSelected && (
                      <Check size={13} className="text-purple-500 shrink-0" />
                    )}
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
