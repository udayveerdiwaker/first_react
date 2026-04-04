import { useState, useRef, useEffect } from "react";
import { runSmartAgentStream } from "../agent/smartAgent";
import { saveChats } from "../store/chatStore";
import { ArrowDown } from "lucide-react";
import ChatInput from "./ChatInput";
import { Menu } from "lucide-react";
import ModeSelector from "./dropdown";
// import ReactMarkdown from "react-markdown";
// import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
// import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import MarkdownRenderer from "./MarkdownRenderer";
// import "@fontsource/inter";

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
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState("normal");
  const containerRef = useRef<HTMLDivElement>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const typingRef = useRef({ active: true });
  const [autoScroll, setAutoScroll] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    typingRef.current.active = false;
  }, [chatIndex]);
  useEffect(() => {
    if (autoScroll) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [autoScroll, chat]);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // 🔥 Scroll to bottom when chat changes
    el.scrollTo({
      top: el.scrollHeight,
      behavior: "auto", // instant (ChatGPT style)
    });
  }, [chatIndex]);

  // 🔥 SEND / EDIT LOGIC (CLEAN)
  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const updatedChat = [...chat];

    const userInput = input;

    updatedChat.push({ role: "user", text: userInput });

    setChat(updatedChat);
    setInput("");

    // add loading bot message
    setChat((prev: any) => [
      ...updatedChat,
      { role: "bot", text: "", loading: true },
    ]);

    setLoading(true);

    abortRef.current = new AbortController();

    let reply = await runSmartAgentStream(
      userInput,
      updatedChat,
      mode,
      (chunk: string) => {
        setChat((prev: any) => {
          const updated = [...prev];

          updated[updated.length - 1] = {
            role: "bot",
            text: chunk,
            loading: false,
          };

          return updated;
        });
      },
      abortRef.current.signal
    );

    setLoading(false);

    if (!reply || reply.includes("❌")) {
      reply = "❌ Something went wrong.";
    }

    // final fix update
    setChat((prev: any) => {
      const updated = [...prev];
      updated[updated.length - 1] = {
        role: "bot",
        text: reply,
        loading: false,
      };
      return updated;
    });
    // 💾 SAVE TO SIDEBAR
    const updatedChats = [...chats];

    if (chatIndex === null) {
      updatedChats.push({
        title: userInput.slice(0, 25),
        messages: [...updatedChat, { role: "bot", text: reply }],
      });
      setChatIndex(updatedChats.length - 1);
    } else {
      updatedChats[chatIndex].messages = [
        ...updatedChat,
        { role: "bot", text: reply },
      ];
    }

    setChats(updatedChats);
    saveChats(updatedChats);
  };
  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;

    // 🔥 show button only when user scrolls UP
    setShowScrollDown(distanceFromBottom > 150);
  };
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;

    setShowScrollDown(distanceFromBottom > 150);
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
          {/* <ModeSelector mode={mode} setMode={setMode} /> */}
        </div>
      </div>

      {/* 💬 CHAT AREA */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto bg-[#0b0f19] px-4 py-6"
      >
        {/* 🔥 CENTER CONTAINER (IMPORTANT) */}
        <div className="max-w-3xl mx-auto w-full space-y-6">
          {/* {chat.map((msg: any, i: number) => ( */}
          {chat.map((msg: any, i: number) => (
            <div key={i + msg.text}>
              <div
                className={`flex gap-4 ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {/* 🤖 AI Avatar */}
                {msg.role === "bot" && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-xs font-bold">
                    AI
                  </div>
                )}

                {/* 💬 MESSAGE */}
                <div
                  className={`
    max-w-[75%] px-4 py-3 rounded-2xl text-[15px] leading-relaxed
    ${
      msg.role === "user"
        ? "bg-blue-600 text-white ml-auto"
        : "bg-white/5 border border-white/10 backdrop-blur"
    }
  `}
                >
                  {/* 🔥 BOT MESSAGE */}
                  {msg.role === "bot" ? (
                    msg.loading ? (
                      // ✅ Typing animation INSIDE bubble
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></span>
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></span>
                      </div>
                    ) : (
                      <MarkdownRenderer text={msg.text} />
                    )
                  ) : (
                    msg.text
                  )}
                </div>
              </div>
            </div>
          ))}
          {/* 🔽 SCROLL BUTTON (CENTER FIXED POSITION) */}
          <div className="flex items-center justify-center my-6">
            <div className="flex-1 h-px bg-white/10"></div>
            {showScrollDown && (
              <button
                onClick={() => {
                  containerRef.current?.scrollTo({
                    top: containerRef.current.scrollHeight,
                    behavior: "smooth",
                  });
                }}
                className="fixed
        w-10 h-10 flex bottom-30 items-center justify-center
        rounded-full
        bg-[#1f2937]/70 backdrop-blur-md
        border border-white/10
        shadow-md shadow-black/40
        text-white
        hover:bg-[#3a3a3a]
        transition
      "
              >
                <ArrowDown size={18} />
              </button>
            )}

            <div className="flex-1 h-px bg-white/10"></div>
          </div>
          <div ref={bottomRef} />
        </div>
      </div>
      {/* ⌨️ INPUT AREA */}
      <div className="sticky bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent">
        <ChatInput
          input={input}
          setInput={setInput}
          onSend={handleSend}
          onStop={() => {
            abortRef.current?.abort(); // 🔥 STOP
            setLoading(false);
          }}
          loading={loading}
        />
      </div>
    </div>
  );
}
