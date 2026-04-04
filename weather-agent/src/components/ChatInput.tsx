import { Mic, Plus, ArrowUp } from "lucide-react";
import { useRef, useEffect, useState } from "react";

export default function ChatInput({
  input,
  setInput,
  onSend,
  onStop,
  loading,
}: any) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [expanded, setExpanded] = useState(false);
  // 🔥 AUTO FOCUS
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // 🔥 AUTO RESIZE
  const handleInput = (e: any) => {
    setInput(e.target.value);

    const el = textareaRef.current;
    if (!el) return;

    el.style.height = "auto";

    const maxHeight = 180; //

    if (el.scrollHeight > 80) {
      setExpanded(true); // 🔥 corner change trigger
    } else {
      setExpanded(false);
    }

    if (el.scrollHeight <= maxHeight) {
      el.style.height = el.scrollHeight + "px";
    } else {
      el.style.height = maxHeight + "px";
    }
  };

  return (
    <div className="px-4 pb-4">
      {/* 🔥 MAIN INPUT BAR */}
      <div
        className={`
        flex items-center gap-3
        w-full max-w-3xl mx-auto
        bg-[#1f2937]/80
        backdrop-blur-xl
        border border-white/10
        px-4 py-3
        shadow-[0_0_40px_rgba(0,0,0,0.4)]
    ${expanded ? "rounded-2xl" : "rounded-full"}
    transition-all duration-200
  `}
      >
        {/* ➕ LEFT */}
        <button className="text-gray-400 hover:text-white">
          <Plus size={18} />
        </button>

        {/* 📝 INPUT */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInput}
          placeholder="Message Smart AI..."
          rows={1}
          className="
  flex-1 bg-transparent outline-none
  text-sm text-white placeholder-gray-400
  resize-none
  max-h-20
  overflow-y-auto
  
"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (loading) onStop();
              else if (input.trim()) onSend();
            }
          }}
        />

        {/* 🎤 MIC */}
        <button className="text-gray-400 hover:text-white">
          <Mic size={18} />
        </button>

        {/* 🚀 SEND BUTTON */}
        <button
          onClick={() => {
            if (loading) onStop();
            else if (input.trim()) onSend();
          }}
          disabled={!input.trim() && !loading}
          className="
            w-9 h-9 flex items-center justify-center
            rounded-full
            bg-white text-black
            transition
            hover:scale-105
            disabled:opacity-40
          "
        >
          {loading ? (
            <div className="w-3 h-3 bg-black rounded-sm" /> // ⏹️ stop
          ) : (
            <ArrowUp size={16} />
          )}
        </button>
      </div>

      {/* 🔥 FOOTER TEXT */}
      <p className="text-center text-xs text-gray-400 mt-3">
        Smart AI can make mistakes. Check important info.{" "}
        <span className="underline cursor-pointer">See Cookie Preferences</span>
      </p>
    </div>
  );
}
