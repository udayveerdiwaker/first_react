import { Plus, Mic, Send } from "lucide-react";

export default function ChatInput({ input, setInput, onSend, loading }: any) {
  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-4">
      <div className="flex items-center gap-3 bg-[#1e293b]/80 backdrop-blur-lg border border-white/10 rounded-full px-4 py-2 shadow-lg">
        {/* ➕ */}
        <button className="text-gray-400 hover:text-white">
          <Plus size={18} />
        </button>

        {/* INPUT */}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything"
          className="flex-1 bg-transparent outline-none text-sm text-white placeholder-gray-400"
          onKeyDown={(e) => e.key === "Enter" && onSend()}
        />

        {/* 🎤 */}
        <button className="text-gray-400 hover:text-white">
          <Mic size={18} />
        </button>

        {/* SEND */}
        <button
          onClick={onSend}
          disabled={loading}
          className="bg-white text-black rounded-full p-2 hover:scale-105 transition"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
