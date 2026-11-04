import { useState, useRef, useEffect, useMemo } from "react";
import { Clock, ChevronDown, Check, X, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface HourSelectorProps {
  selectedHour: string | null; // HH:mm (e.g. "14:00")
  onChange: (hour: string | null) => void;
  timezone?: string;
  dropDirection?: "up" | "down";
  disabled?: boolean;
}

/**
 * Format "HH:mm" (24-hour) to 12-hour display string (e.g. "02:00 PM")
 */
export function formatHourDisplay(timeStr?: string | null): string {
  if (!timeStr) return "";
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return timeStr;
  const h = parseInt(match[1], 10);
  const m = match[2];
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${String(displayH).padStart(2, "0")}:${m} ${period}`;
}

export default function HourSelector({
  selectedHour,
  onChange,
  timezone,
  dropDirection = "up",
  disabled = false,
}: HourSelectorProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const clientTimezone = useMemo(() => {
    if (timezone) return timezone;
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch {
      return "UTC";
    }
  }, [timezone]);

  // Compute preset relative hours based on current time
  const currentNow = new Date();
  const currentHourNum = currentNow.getHours();

  const presets = useMemo(() => {
    const pad = (n: number) => String(n).padStart(2, "0");
    const hNow = currentHourNum;
    const hPlus1 = (currentHourNum + 1) % 24;
    const hPlus2 = (currentHourNum + 2) % 24;
    const hPlus3 = (currentHourNum + 3) % 24;

    return [
      { label: "Now", value: `${pad(hNow)}:00` },
      { label: "+1h", value: `${pad(hPlus1)}:00` },
      { label: "+2h", value: `${pad(hPlus2)}:00` },
      { label: "+3h", value: `${pad(hPlus3)}:00` },
      { label: "9 AM", value: "09:00" },
      { label: "1 PM", value: "13:00" },
      { label: "5 PM", value: "17:00" },
      { label: "9 PM", value: "21:00" },
    ];
  }, [currentHourNum]);

  // All 24 standard hours
  const allHours = useMemo(() => {
    const hours: { value: string; display12: string; display24: string }[] = [];
    for (let h = 0; h < 24; h++) {
      const padH = String(h).padStart(2, "0");
      const value = `${padH}:00`;
      const period = h >= 12 ? "PM" : "AM";
      const h12 = h % 12 === 0 ? 12 : h % 12;
      const display12 = `${String(h12).padStart(2, "0")}:00 ${period}`;
      hours.push({
        value,
        display12,
        display24: value,
      });
    }
    return hours;
  }, []);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  };

  const isUp = dropDirection === "up";

  return (
    <div
      className="relative"
      ref={containerRef}
      onKeyDown={handleKeyDown}
    >
      {/* Trigger Button */}
      <div className="flex items-center">
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setOpen(!open)}
          className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-medium transition-all cursor-pointer select-none ${
            selectedHour
              ? "border-cyan-500/60 bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.18)]"
              : "border-slate-200/80 bg-slate-50 text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:border-slate-800 dark:bg-[#151924] dark:text-slate-400 dark:hover:border-slate-700 dark:hover:text-slate-200"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
          title={
            selectedHour
              ? `Scheduled hour: ${formatHourDisplay(selectedHour)} (${clientTimezone})`
              : "Schedule or attach target hour to message"
          }
          aria-label="Select target hour"
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <Clock
            size={13}
            className={`shrink-0 ${
              selectedHour
                ? "text-cyan-500 dark:text-cyan-400"
                : "text-slate-400"
            }`}
          />
          <span className="font-medium">
            {selectedHour ? formatHourDisplay(selectedHour) : "Hour"}
          </span>
          <ChevronDown
            size={12}
            className={`text-slate-400 transition-transform duration-150 shrink-0 ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>

        {/* Quick clear button if an hour is currently selected */}
        {selectedHour && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
            }}
            className="ml-1 flex h-6 w-6 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition cursor-pointer"
            title="Clear hour"
            aria-label="Clear selected hour"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: isUp ? 6 : -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: isUp ? 6 : -6 }}
            transition={{ duration: 0.12 }}
            className={`absolute z-dropdown w-72 max-w-[calc(100vw-24px)] rounded-2xl border border-slate-200 bg-white p-2.5 shadow-xl backdrop-blur-md dark:border-slate-800 dark:bg-[#12151e] ${
              isUp ? "bottom-full mb-2 origin-bottom-left" : "top-full mt-1.5 origin-top-left"
            } left-0`}
          >
            {/* Header: Title + Timezone + Clear */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800/70">
              <div className="min-w-0">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Clock size={12} className="text-cyan-500" />
                  Target Hour
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate block">
                  {clientTimezone}
                </span>
              </div>
              {selectedHour && (
                <button
                  type="button"
                  onClick={() => {
                    onChange(null);
                    setOpen(false);
                  }}
                  className="text-[11px] text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300 font-medium cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Quick Presets */}
            <div className="mb-2.5">
              <div className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mb-1.5 flex items-center gap-1">
                <Sparkles size={11} className="text-amber-500" />
                <span>Quick Presets</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {presets.map((p) => {
                  const isMatch = selectedHour === p.value;
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => {
                        onChange(p.value);
                        setOpen(false);
                      }}
                      className={`rounded-lg px-1.5 py-1 text-[11px] font-medium transition cursor-pointer border text-center ${
                        isMatch
                          ? "border-cyan-500 bg-cyan-500 text-white dark:border-cyan-500 dark:bg-cyan-500"
                          : "border-slate-200/80 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-slate-100 dark:border-slate-800 dark:bg-[#161a25] dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-[#1d2232]"
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Time Input (for exact minute-level choice) */}
            <div className="mb-2.5 flex items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50/80 px-2.5 py-1.5 dark:border-slate-800 dark:bg-[#161a25]">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 shrink-0 font-medium">
                Custom time:
              </span>
              <input
                type="time"
                value={selectedHour || ""}
                onChange={(e) => {
                  if (e.target.value) {
                    onChange(e.target.value);
                  }
                }}
                className="w-full bg-transparent text-xs font-medium text-slate-800 dark:text-slate-100 outline-none cursor-pointer"
              />
            </div>

            {/* 24-Hour Scrollable List */}
            <div className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mb-1">
              Select Hour (24h / 12h)
            </div>
            <div
              ref={listRef}
              className="max-h-44 overflow-y-auto space-y-0.5 pr-0.5 [scrollbar-width:thin] [scrollbar-color:rgba(156,163,175,0.4)_transparent]"
            >
              {allHours.map((item) => {
                const isSelected = selectedHour === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => {
                      onChange(item.value);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-left text-xs transition cursor-pointer ${
                      isSelected
                        ? "bg-cyan-500/10 text-cyan-600 font-semibold dark:bg-cyan-500/20 dark:text-cyan-400"
                        : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-[#171a26]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px]">{item.display24}</span>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500">
                        ({item.display12})
                      </span>
                    </div>
                    {isSelected && (
                      <Check size={13} className="text-cyan-500 shrink-0" />
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
