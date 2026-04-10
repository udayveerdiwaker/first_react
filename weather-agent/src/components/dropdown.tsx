import {
  Brain,
  ChevronDown,
  Code2,
  GraduationCap,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";

const modes = [
  {
    value: "normal",
    label: "Normal",
    description: "Balanced assistant for everyday prompts",
    icon: Brain,
  },
  {
    value: "coding",
    label: "Coding",
    description: "Sharper technical and implementation help",
    icon: Code2,
  },
  {
    value: "teaching",
    label: "Teaching",
    description: "Simpler explanations for learning flows",
    icon: GraduationCap,
  },
  {
    value: "fun",
    label: "Fun",
    description: "Lighter tone with playful responses",
    icon: Sparkles,
  },
];

interface ModeSelectorProps {
  mode: string;
  setMode: (value: string) => void;
}

export default function ModeSelector({ mode, setMode }: ModeSelectorProps) {
  const [open, setOpen] = useState(false);
  const activeMode = useMemo(
    () => modes.find((item) => item.value === mode) || modes[0],
    [mode]
  );
  const ActiveIcon = activeMode.icon;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white/85 px-3 py-2 text-[12px] font-medium text-slate-700 shadow-sm transition hover:bg-white hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white"
      >
        <ActiveIcon size={15} />
        <span>{activeMode.label} mode</span>
        <ChevronDown
          size={14}
          className={open ? "rotate-180 transition" : "transition"}
        />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white/95 p-1 shadow-xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
          {modes.map((item) => {
            const ItemIcon = item.icon;

            return (
              <button
                key={item.value}
                type="button"
                onClick={() => {
                  setMode(item.value);
                  setOpen(false);
                }}
                className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                  item.value === mode
                    ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                <ItemIcon size={16} className="mt-0.5 shrink-0" />
                <div>
                  <p className="text-[12px] font-semibold">{item.label}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {item.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
