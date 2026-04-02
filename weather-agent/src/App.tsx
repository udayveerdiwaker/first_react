import Sidebar from "./components/Sidebar";
import ChatBox from "./components/ChatBox";
import { useState, useEffect } from "react";
import { getChats } from "./store/chatStore";

export default function App() {
  const [chat, setChat] = useState<any[]>([]);
  const [chats, setChats] = useState<any[]>([]);
  const [chatIndex, setChatIndex] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = getChats();

      if (stored && stored.length > 0) {
        setChats(stored);
        setChat(stored[stored.length - 1]?.messages || []);
        setChatIndex(stored.length - 1);
      }
    } catch (err) {
      console.error("Failed to load chats");
    } finally {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center text-white">
        Loading AI...
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
