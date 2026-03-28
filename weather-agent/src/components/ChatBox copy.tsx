import { useState, useRef, useEffect } from "react";
import { runSmartAgent } from "../agent/smartAgent";
import { saveChats } from "../store/chatStore";
import { Copy, Pencil, Plus, RefreshCcw, Trash2 } from "lucide-react";
import ChatInput from "./ChatInput";
import ReactMarkdown from "react-markdown";
export default function ChatBox({
  chat,
  setChat,
  chats,
  setChats,
  chatIndex,
  setChatIndex,
}: any) {
  const [input, setInput] = useState("");
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const typeText = async (text: string, setChat: any) => {
    let current = "";

    for (let char of text) {
      current += char;

      setChat((prev: any) => {
        const last = [...prev];
        last[last.length - 1] = {
          role: "bot",
          text: current,
        };
        return last;
      });

      await new Promise((r) => setTimeout(r, 10));
    }
  };

  // 🔥 SEND / EDIT LOGIC (GPT STYLE)
  // const handleSend = async (e?: React.FormEvent) => {
  //   if (e) e.preventDefault();
  //   if (!input.trim()) return;

  //   let updatedChat = [...chat];

  //   if (editIndex !== null) {
  //     // ✅ EDIT MODE
  //     updatedChat[editIndex].text = input;

  //     // 👉 remove future messages (GPT behavior)
  //     updatedChat = updatedChat.slice(0, editIndex + 1);

  //     setEditIndex(null);
  //   } else {
  //     // ✅ NEW MESSAGE
  //     updatedChat.push({ role: "user", text: input });
  //   }

  //   setChat(updatedChat);
  //   setInput("");

  //   // 🔄 typing effect
  //   const typingChat = [...updatedChat, { role: "bot", text: "Typing..." }];
  //   setChat(typingChat);

  //   // const reply = await runSmartAgent(input);
  //   setLoading(true);
  //   const reply = await runSmartAgent(input);
  //   setLoading(false);
  //   // const finalChat = [
  //   //   ...updatedChat,
  //   //   {
  //   //     role: "bot",
  //   //     text: reply.content,
  //   //     type: reply.type,
  //   //   },
  //   // ];

  //   await typeText(reply, setChat);
  //   const finalChat = [...updatedChat, { role: "bot", text: reply }];
  //   setChat(finalChat);

  //   // 💾 SAVE CHAT
  //   let updatedChats = [...chats];

  //   if (chatIndex === null) {
  //     const newChatObj = {
  //       title: input.slice(0, 25),
  //       messages: finalChat,
  //     };
  //     updatedChats.push(newChatObj);
  //     setChatIndex(updatedChats.length - 1);
  //   } else {
  //     updatedChats[chatIndex].messages = finalChat;
  //   }

  //   setChats(updatedChats);
  //   saveChats(updatedChats);
  // };
  const handleSend = async () => {
    if (!input.trim()) return;

    let updatedChat = [...chat];

    if (editIndex !== null) {
      updatedChat[editIndex].text = input;
      updatedChat = updatedChat.slice(0, editIndex + 1);
      setEditIndex(null);
    } else {
      updatedChat.push({ role: "user", text: input });
    }

    setChat(updatedChat);

    const userInput = input; // ⚠️ save before clearing
    setInput("");

    // 🔄 Typing placeholder
    setChat([...updatedChat, { role: "bot", text: "Typing..." }]);

    setLoading(true);
    const reply = await runSmartAgent(userInput);
    setLoading(false);

    // 🔥 Typing animation
    await typeText(reply, setChat);

    const finalChat = [...updatedChat, { role: "bot", text: reply }];
    setChat(finalChat);

    // 💾 SAVE CHAT
    let updatedChats = [...chats];

    if (chatIndex === null) {
      const newChatObj = {
        title: userInput.slice(0, 25),
        messages: finalChat,
      };
      updatedChats.push(newChatObj);
      setChatIndex(updatedChats.length - 1);
    } else {
      updatedChats[chatIndex].messages = finalChat;
    }

    setChats(updatedChats);
    saveChats(updatedChats);
  };

  // 🔽 auto scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  return (
    <div className="flex flex-col h-screen flex-1 bg-gradient-to-br from-[#0f172a] via-[#020617] to-black text-white">
      {/* HEADER */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5 backdrop-blur">
        <h1 className="text-lg font-semibold">🤖 Smart AI</h1>

        {/* 🔥 New Chat Button */}
        <button
          onClick={() => {
            setChat([]);
            setChatIndex(null);
          }}
          className="
          flex items-center gap-2 text-sm bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg"
        >
          <Plus size={16} /> New Chat
        </button>
        {/* <button
          onClick={() => setChat([])}
          disabled={loading}
          className="flex items-center gap-2 text-sm bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg"
        >
          <Trash2 size={16} />
          Clear
        </button> */}
      </div>

      {/* CHAT AREA */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {chat.map((msg: any, i: number) => (
          <div
            key={i}
            className={`group flex ${
              msg.role === "user" ? "justify-end" : "justify-start"
              // msg.role === "user" ? "🧑" : "🤖"
            }`}
          >
            <div className="relative max-w-[65%] group">
              {/* MESSAGE */}
              <div
                className={`px-4 py-3 rounded-2xl shadow ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-white/10 text-gray-200"
                }`}
              >
                <ReactMarkdown>{msg.text}</ReactMarkdown>

                {/* {msg.text} */}
              </div>
              {/* 🔥 ACTION BUTTONS */}
              <div className="absolute right-2 -bottom-6  flex gap-2">
                {/* Copy */}
                {/* <button
                  onClick={() => navigator.clipboard.writeText(msg.text)}
                  className="text-xs text-gray-400 text-blue-400"
                >
                  <Copy size={14} />
                </button> */}
              </div>
              {/* ✏️ EDIT BUTTON (ONLY USER) */}
              {/* {msg.role === "user" && (
                <div className="absolute right-2 -bottom-6 ">
                  <button
                    onClick={() => {
                      setInput(msg.text);
                      setEditIndex(i);
                    }}
                    className="text-xs text-gray-400 hover:text-blue-400"
                  >
                    <Pencil size={14} />
                  </button>
                </div>
              )} */}
            </div>
          </div>
        ))}

        {/* Editing Indicator */}
        {/* {editIndex !== null && (
          <p className="text-xs text-yellow-400">
            Editing message... (press Enter to update)
          </p>
        )} */}

        <div ref={bottomRef} />
        {/* <button
          onClick={() => navigator.clipboard.writeText(msg.text)}
          className="text-xs text-gray-400 hover:text-blue-400"
        >
          Copy
        </button>
        <button onClick={() => handleSend()} disabled={loading}>
          🔄 Regenerate
        </button>
        <button onClick={() => setChat([])} disabled={loading}>
          🗑 Clear Chat
        </button> */}
      </div>

      {/* INPUT AREA */}
      {/* <form
        onSubmit={handleSend}
        className="p-4 border-t border-white/10 bg-white/5 backdrop-blur flex gap-3"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="button"
          onClick={() => handleSend()}
          disabled={loading}
          className="px-3 py-2 bg-white/10 rounded-lg hover:bg-white/20"
        >
          <RefreshCcw size={16} />
        </button>
        <textarea
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className=" flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
          onInput={(e: any) => {
            e.target.style.height = "auto";
            e.target.style.height = e.target.scrollHeight + "px";
          }}
        />
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 transition"
        >
          {loading ? "Thinking..." : "➤"}
        </button>

      </form> */}
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
