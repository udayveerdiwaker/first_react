import { useState, useRef, useEffect } from "react";
import { runSmartAgent } from "../agent/smartAgent";
import { saveChats } from "../store/chatStore";
import { Plus } from "lucide-react";
import ChatInput from "./ChatInput";
import { Menu } from "lucide-react";
import ModeSelector from "./dropdown";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import MarkdownRenderer from "./MarkdownRenderer";

export default function ChatBox({
  chat,
  setChat,
  chats,
  setChats,
  chatIndex,
  setChatIndex,
  setSidebarOpen,
}: any) {
  const [input, setInput] = useState("");
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState("normal");
  const containerRef = useRef<HTMLDivElement>(null);
  // 🔥 Typing Animation (optimized)
  // const typeText = async (text: string) => {
  //   let current = "";

  //   for (let char of text) {
  //     current += char;

  //     setChat((prev: any) => {
  //       const updated = [...prev];
  //       updated[updated.length - 1] = {
  //         role: "bot",
  //         text: current,
  //       };
  //       return updated;
  //     });

  //     await new Promise((r) => setTimeout(r, 8)); // faster + smooth
  //   }
  // };

  const typeText = async (text: string) => {
    // 👇 Check tab visibility
    if (document.hidden) {
      // ❌ tab hidden → no animation
      setChat((prev: any) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "bot",
          text: text,
        };
        return updated;
      });
      return;
    }

    let current = "";

    for (let char of text) {
      current += char;

      setChat((prev: any) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "bot",
          text: current,
        };
        return updated;
      });

      await new Promise((r) => setTimeout(r, 10));
    }
  };

  // 🔥 SEND / EDIT LOGIC (CLEAN)
  const handleSend = async () => {
    if (!input.trim() || loading) return;

    let updatedChat = [...chat];

    // ✏️ Edit Mode
    if (editIndex !== null) {
      updatedChat[editIndex].text = input;
      updatedChat = updatedChat.slice(0, editIndex + 1);
      setEditIndex(null);
    } else {
      updatedChat.push({ role: "user", text: input });
    }

    setChat(updatedChat);

    const userInput = input;
    setInput("");

    // ⏳ Typing placeholder
    setChat([...updatedChat, { role: "bot", text: "..." }]);

    setLoading(true);
    // const reply = await runSmartAgent(userInput);
    const reply = await runSmartAgent(userInput, updatedChat, mode);
    setLoading(false);

    // ✨ Animate response
    // await typeText(reply);

    const finalChat = [...updatedChat, { role: "bot", text: reply }];
    setChat(finalChat);

    // 💾 Save Chats
    let updatedChats = [...chats];

    if (chatIndex === null) {
      updatedChats.push({
        title: userInput.slice(0, 25),
        messages: finalChat,
      });
      setChatIndex(updatedChats.length - 1);
    } else {
      updatedChats[chatIndex].messages = finalChat;
    }

    setChats(updatedChats);
    saveChats(updatedChats);
  };

  // 🔽 Auto Scroll
  // useEffect(() => {
  //   bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  // }, [chat]);
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      100;

    if (isNearBottom) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chat]);
  return (
    <div className="flex flex-col h-screen flex-1 bg-gradient-to-br from-[#0f172a] via-[#020617] to-black text-white">
      {/* 🔝 HEADER */}
      <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-white/10 bg-white/5 backdrop-blur z-50">
        {/* LEFT SIDE */}
        <div className="flex items-center gap-3">
          {/* ☰ Toggle (mobile only) */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-2 rounded-lg hover:bg-white/10 transition"
          >
            <Menu size={20} />
          </button>

          {/* Title */}
          <h1 className="text-sm md:text-lg font-semibold whitespace-nowrap">
            🤖 Smart AI
          </h1>
          <ModeSelector mode={mode} setMode={setMode} />
        </div>

        {/* RIGHT SIDE */}
        {/* <button
          onClick={() => {
            setChat([]);
            setChatIndex(null);
          }}
          className="flex items-center gap-2 text-xs md:text-sm bg-blue-600 hover:bg-blue-700 px-3 md:px-4 py-2 rounded-lg transition"
        >
          <Plus size={14} />
          New Chat
        </button> */}
      </div>

      {/* 💬 CHAT AREA */}
      <div className="flex-1 overflow-y-auto overflow-x-visible px-3 md:px-6 py-4 md:py-6 space-y-4 md:space-y-6">
        {" "}
        {chat.map((msg: any, i: number) => (
          <div
            key={i}
            className={`flex ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div className="max-w-[85%] md:max-w-[65%]">
              {/* Message Bubble */}
              <div
                className={`px-4 py-3 rounded-2xl shadow text-sm md:text-base transition-all duration-300 ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-white/10 text-gray-200 backdrop-blur"
                }`}
              >
                {/* <ReactMarkdown>{msg.text}</ReactMarkdown> */}
                <MarkdownRenderer text={msg.text} />
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* ⌨️ INPUT AREA */}
      <div className="sticky bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent">
        <ChatInput
          input={input}
          setInput={setInput}
          onSend={handleSend}
          loading={loading}
        />
      </div>
    </div>
  );
}
