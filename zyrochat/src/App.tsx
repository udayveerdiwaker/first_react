import Sidebar from "./components/Sidebar";
import ChatBox from "./components/ChatBox";
import AntigravityLogo from "./components/AntigravityLogo";
import { useState, useEffect } from "react";
import { getChats, saveChats, fetchConversationsFromServer } from "./store/chatStore";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Root application component.
 *
 * Manages:
 * 1. Global chat state (active messages, conversation history, selected chat index)
 * 2. App initialization and migration
 * 3. Responsive sidebar drawer state
 * 4. Interaction locking during AI response streaming
 */
export default function App() {
  const [chat, setChat] = useState<any[]>([]);
  const [chats, setChats] = useState<any[]>([]);
  const [chatIndex, setChatIndex] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [interactionLocked, setInteractionLocked] = useState(false);

  useEffect(() => {
    document.title = "ZyroChat - Professional AI Workspace";

    try {
      let stored = getChats();

      if (stored && stored.length > 0) {
        stored = stored.map((chat: any) => {
          if (!chat.title && chat.messages && chat.messages.length > 0) {
            const firstUserMsg = chat.messages.find(
              (m: any) => m.role === "user"
            );
            if (firstUserMsg) {
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
              typeof chat.updatedAt === "number" ? chat.updatedAt : Date.now(),
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

      // Background sync with server database to ensure cross-device / refresh recovery persistence
      fetchConversationsFromServer().then((serverChats) => {
        if (serverChats && serverChats.length > 0) {
          setChats((prev) => {
            if (!prev || prev.length === 0) {
              const latestIndex = serverChats.reduce(
                (bestIndex: number, current: any, index: number) =>
                  (current.updatedAt || 0) > (serverChats[bestIndex]?.updatedAt || 0)
                    ? index
                    : bestIndex,
                0
              );
              setChat([...(serverChats[latestIndex]?.messages || [])]);
              setChatIndex(latestIndex);
              return serverChats;
            }
            return prev;
          });
        }
      }).catch(() => {});
    } catch (err) {
      console.error("Failed to load chats:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <AnimatePresence mode="wait">
      {loading ? (
        <motion.div
          key="loader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="relative flex h-screen items-center justify-center overflow-hidden bg-[#090a0f] text-white select-none"
        >
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
            className="flex flex-col items-center rounded-3xl border border-white/10 bg-[#11141d]/90 px-10 py-8 text-center shadow-2xl backdrop-blur-xl"
          >
            <div className="mb-4">
              <AntigravityLogo size={52} glow />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-400">
              ZyroChat
            </p>
            <h1 className="mt-2 text-base font-medium text-slate-300">
              Preparing your AI workspace
            </h1>
          </motion.div>
        </motion.div>
      ) : (
        <motion.div
          key="main-app"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25 }}
          className="relative flex h-screen h-[100dvh] w-full max-w-full overflow-hidden bg-[#f8fafc] text-slate-900 dark:bg-[#090a0f] dark:text-slate-100 sm:flex-row"
        >
          {/* Subtle background surface grid */}
          <div className="pointer-events-none absolute inset-0 opacity-15 [background-image:linear-gradient(rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.06)_1px,transparent_1px)] [background-size:48px_48px] dark:opacity-20 z-base" />

          {/* Sidebar - responsive drawer on mobile (<sm), static column on desktop (sm:) */}
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

          {/* Main chat window */}
          <div className="relative flex-1 min-w-0 h-full overflow-hidden">
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
        </motion.div>
      )}
    </AnimatePresence>
  );
}
