import { useState, useRef, useEffect } from "react";
import { runAgent } from "../agent/agent";

export default function ChatBox() {
  const [input, setInput] = useState("");
  const [chat, setChat] = useState<{ role: "user" | "bot"; text: string }>([]);

  const bottomRef = useRef<HTMLDivElement>(null);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;

    const userInput = input;
    setInput("");

    setChat((prev) => [...prev, { role: "user", text: userInput }]);

    // typing effect
    setChat((prev) => [...prev, { role: "bot", text: "..." }]);

    const reply = await runAgent(userInput);

    setChat((prev) => {
      const updated = [...prev];
      updated[updated.length - 1] = { role: "bot", text: reply };
      return updated;
    });
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-[#0f172a] via-[#020617] to-black text-white">
      {/* HEADER */}
      <div className="text-center py-4 text-xl font-semibold backdrop-blur-md bg-white/5 border-b border-white/10">
        🤖 Smart AI Agent
      </div>

      {/* CHAT AREA */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {chat.map((msg, i) => (
          <div
            key={i}
            className={`flex ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[70%] px-4 py-3 rounded-2xl backdrop-blur-md border border-white/10 shadow-lg transition-all duration-300 ${
                msg.role === "user"
                  ? "bg-blue-600/80 text-white rounded-br-none"
                  : "bg-white/10 text-gray-200 rounded-bl-none"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* INPUT AREA */}
      <form
        onSubmit={handleSend}
        className="p-4 flex gap-3 backdrop-blur-xl bg-white/5 border-t border-white/10"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything..."
          className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
        />

        <button
          type="submit"
          className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 transition-all shadow-lg hover:scale-105 active:scale-95"
        >
          Send
        </button>
      </form>
    </div>
  );
}
