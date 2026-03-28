import { Droplet } from "lucide-react";
import { useState } from "react";

const modes = [
  { value: "normal", label: "Normal" },
  { value: "coding", label: "Coding" },
  { value: "teaching", label: "Teaching" },
  { value: "fun", label: "Fun" },
];

export default function ModeSelector({ mode, setMode }: any) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      {/* BUTTON */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 backdrop-blur-md text-sm transition"
      >
        Mode {modes.find((m) => m.value === mode)?.label}
        <span>
          <Droplet size={16} />
        </span>
      </button>

      {/* DROPDOWN */}
      {open && (
        <div className="absolute mt-2 w-40 bg-[#020617] border border-white/10 rounded-xl shadow-lg overflow-hidden z-100">
          {modes.map((m) => (
            <div
              key={m.value}
              onClick={() => {
                setMode(m.value);
                setOpen(false);
              }}
              className="px-4 py-2 hover:bg-white/10 cursor-pointer text-sm"
            >
              {m.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
