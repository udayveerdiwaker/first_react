import Sidebar from "./components/Sidebar";
import ChatBox from "./components/ChatBox";
import { useState, useEffect } from "react";
import { getChats, saveChats } from "./store/chatStore";

export default function App() {
  const [chat, setChat] = useState<any[]>([]);
  const [chats, setChats] = useState<any[]>([]);
  const [chatIndex, setChatIndex] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "ZyroChat";

    try {
      let stored = getChats();

      // 🔥 Migrate old chats without titles (use keywords only, no API during load)
      if (stored && stored.length > 0) {
        stored = stored.map((chat: any) => {
          if (!chat.title && chat.messages && chat.messages.length > 0) {
            // Extract title from first user message using keywords
            const firstUserMsg = chat.messages.find(
              (m: any) => m.role === "user"
            );
            if (firstUserMsg) {
              // Use simple keyword extraction for migration
              const words = firstUserMsg.text
                .split(/\s+/)
                .slice(0, 5)
                .join(" ");
              chat.title = words.substring(0, 50) || "New Chat";
            } else {
              chat.title = "New Chat";
            }
          }
          return {
            ...chat,
            title: chat.title || "New Chat",
            updatedAt:
              typeof chat.updatedAt === "number"
                ? chat.updatedAt
                : Date.now(),
          };
        });
        saveChats(stored);
      }

      if (stored && stored.length > 0) {
        const latestIndex = stored.reduce(
          (bestIndex: number, current: any, index: number) =>
            (current.updatedAt || 0) > (stored[bestIndex]?.updatedAt || 0)
              ? index
              : bestIndex,
          0
        );

        setChats(stored);
        setChat([...(stored[latestIndex]?.messages || [])]);
        setChatIndex(latestIndex);
      }
    } catch (err) {
      console.error("Failed to load chats");
    } finally {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-[#020617] via-[#0f172a] to-black text-white">
        Loading ZyroChat...
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-[#020617] via-[#020617] to-black text-white">
      {/* SIDEBAR */}
      <Sidebar
        chats={chats}
        setChat={setChat}
        setChats={setChats}
        setChatIndex={setChatIndex}
        chatIndex={chatIndex}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      {/* CHAT */}
      <ChatBox
        chat={chat}
        setChat={setChat}
        chats={chats}
        setChats={setChats}
        chatIndex={chatIndex}
        setChatIndex={setChatIndex}
        setSidebarOpen={setSidebarOpen}
      />
    </div>
  );
}
