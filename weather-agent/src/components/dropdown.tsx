import {
  Brain,
  ChevronDown,
  Code2,
  GraduationCap,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";

/**
 * Array of all available assistant modes.
 * Each mode changes how the AI behaves: tone, explanations, focus, etc.
 *
 * Properties for each mode:
 * - value: Internal identifier (passed to AI as mode)
 * - label: Display name shown to user
 * - description: Explanation of what this mode does
 * - icon: Lucide icon component for visual representation
 */
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
  mode: string; // The currently selected mode
  setMode: (value: string) => void; // Function to change the mode
}

/**
 * Mode selector dropdown component.
 *
 * This component:
 * 1. Shows a button with the currently selected mode and its icon
 * 2. When clicked, opens a dropdown menu with all available modes
 * 3. Each mode can be clicked to switch to it
 * 4. Highlights the currently selected mode
 *
 * The dropdown closes after a selection is made for better UX.
 *
 * @param mode - The currently active mode value
 * @param setMode - Callback to change the mode
 */
export default function ModeSelector({ mode, setMode }: ModeSelectorProps) {
  // Tracks whether the dropdown menu is open
  const [open, setOpen] = useState(false);

  /**
   * Finds the full mode object for the current selection.
   * useMemo prevents recalculation unless mode changes.
   * Defaults to modes[0] (Normal) if mode doesn't match any option.
   */
  const activeMode = useMemo(
    () => modes.find((item) => item.value === mode) || modes[0],
    [mode]
  );
  const ActiveIcon = activeMode.icon;

  return (
    <div className="relative">
      {/* Main button showing the current mode */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white/85 px-3 py-2 text-[12px] font-medium text-slate-700 shadow-sm transition hover:bg-white hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white"
      >
        {/* Icon for the current mode */}
        <ActiveIcon size={15} />
        {/* Text showing current mode */}
        <span>{activeMode.label} mode</span>
        {/* Chevron that rotates when dropdown is open */}
        <ChevronDown
          size={14}
          className={open ? "rotate-180 transition" : "transition"}
        />
      </button>

      {/* Dropdown menu - only shown when open is true */}
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white/95 p-1 shadow-xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
          {/* Loop through all available modes */}
          {modes.map((item) => {
            // Get the icon component for this mode
            const ItemIcon = item.icon;

            return (
              <button
                key={item.value}
                type="button"
                onClick={() => {
                  // User selected this mode - update parent and close dropdown
                  setMode(item.value);
                  setOpen(false);
                }}
                // Highlight the currently selected mode
                className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                  item.value === mode
                    ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                {/* Mode icon */}
                <ItemIcon size={16} className="mt-0.5 shrink-0" />
                {/* Mode label and description */}
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
