import { Plus, Mic, Send } from "lucide-react";
import { useState } from "react";

export default function ChatInput({ input, setInput, onSend, loading }: any) {
  const [listening, setListening] = useState(false);
  const handleStop = () => {
    abortRef.current?.abort();
    setLoading(false);
  };
  // 🎤 Voice Input
  const handleVoice = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition not supported");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";

    recognition.start();
    setListening(true);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setListening(false);
    };

    recognition.onerror = () => {
      setListening(false);
    };
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-4">
      <div className="flex items-center gap-3 bg-[#1e293b]/80 backdrop-blur-lg border border-white/10 rounded-2xl px-4 py-2 shadow-lg">
        {/* ➕ Attach / Quick Actions */}
        <button
          onClick={() => setInput("Weather in Delhi")}
          className="text-gray-400 hover:text-white"
        >
          <Plus size={18} />
        </button>

        {/* INPUT */}
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything..."
          rows={1}
          className="flex-1 bg-transparent outline-none text-sm text-white placeholder-gray-400 resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
        />

        {/* 🎤 Voice */}
        <button
          onClick={handleVoice}
          className={`${
            listening ? "text-green-400 animate-pulse" : "text-gray-400"
          } hover:text-white`}
        >
          <Mic size={18} />
        </button>

        {/* SEND */}
        {/* <button
          onClick={onSend}
          disabled={loading || !input.trim()}
          className={`rounded-full p-2 transition ${
            loading
              ? "bg-gray-500 cursor-not-allowed"
              : "bg-white text-black hover:scale-105"
          }`}
        >
          {loading ? "..." : <Send size={16} />}
        </button> */}

        <button
          onClick={loading ? stop : onSend}
          className={`rounded-full p-2 transition ${
            loading
              ? "bg-red-500 text-white animate-pulse"
              : "bg-white text-black hover:scale-105"
          }`}
        >
          {loading ? "⏹" : <Send size={16} />}
        </button>
      </div>
    </div>
  );
}
