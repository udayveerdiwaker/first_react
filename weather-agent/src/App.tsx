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
  const [interactionLocked, setInteractionLocked] = useState(false);

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
      <div className="relative flex h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_28%),radial-gradient(circle_at_80%_20%,_rgba(16,185,129,0.14),_transparent_22%),linear-gradient(180deg,_#020617_0%,_#0f172a_100%)] text-white">
        <div className="animate-float absolute left-10 top-16 h-32 w-32 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="animate-float absolute bottom-16 right-12 h-40 w-40 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="rounded-[28px] border border-white/10 bg-white/5 px-8 py-6 text-center shadow-[0_30px_120px_-50px_rgba(15,23,42,0.9)] backdrop-blur-xl">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-lg font-semibold text-slate-950">
            Z
          </div>
          <p className="text-sm uppercase tracking-[0.28em] text-cyan-200/70">
            ZyroChat
          </p>
          <h1 className="mt-2 text-xl font-semibold">Preparing your workspace</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.14),_transparent_24%),radial-gradient(circle_at_80%_0%,_rgba(16,185,129,0.12),_transparent_18%),linear-gradient(180deg,_#f8fbff_0%,_#eef4f8_100%)] text-white dark:bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.1),_transparent_24%),radial-gradient(circle_at_80%_0%,_rgba(16,185,129,0.1),_transparent_18%),linear-gradient(180deg,_#020617_0%,_#0f172a_100%)]">
      <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] [background-size:44px_44px]" />
      {/* SIDEBAR */}
      <Sidebar
        chats={chats}
        setChat={setChat}
        setChats={setChats}
        setChatIndex={setChatIndex}
        chatIndex={chatIndex}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        interactionLocked={interactionLocked}
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
        setInteractionLocked={setInteractionLocked}
      />
    </div>
  );
}
