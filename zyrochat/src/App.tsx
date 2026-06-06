import Sidebar from "./components/Sidebar";
import ChatBox from "./components/ChatBox";
import { useState, useEffect } from "react";
import { getChats, saveChats } from "./store/chatStore";

/**
 * Root application component.
 *
 * This component manages:
 * 1. Global chat state (current chat messages, all chats list, active chat index)
 * 2. Loading state for initialization
 * 3. Sidebar visibility (for mobile responsive design)
 * 4. Interaction locking (prevents actions while AI is responding)
 *
 * On first load, it:
 * 1. Loads saved chats from localStorage
 * 2. Migrates old chats without titles (backward compatibility)
 * 3. Finds the most recently updated chat
 * 4. Opens that chat for the user
 * 5. Shows a loading screen until all this is done
 *
 * The component renders two main sub-components:
 * - Sidebar: Lists all saved conversations and lets user switch between them
 * - ChatBox: Main chat window where messages appear and user can type
 */
export default function App() {
  // Current conversation's messages
  const [chat, setChat] = useState<any[]>([]);

  // All saved conversations
  const [chats, setChats] = useState<any[]>([]);

  // Index of the currently active chat in the chats array
  const [chatIndex, setChatIndex] = useState<number | null>(null);

  // Whether the sidebar is visible (used for mobile responsiveness)
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Whether the app is still loading chats from localStorage
  const [loading, setLoading] = useState(true);

  // Whether the UI is locked during AI response streaming
  const [interactionLocked, setInteractionLocked] = useState(false);

  /**
   * Initialization effect - runs once when component mounts.
   *
   * This loads the user's saved chat history from browser storage and
   * restores their previous conversation state.
   */
  useEffect(() => {
    document.title = "ZyroChat";

    try {
      // Get all saved chats from localStorage
      let stored = getChats();

      /**
       * Migrate old chats that don't have titles.
       * This ensures backward compatibility - old saves will still work
       * with the new system that requires titles for every chat.
       */
      if (stored && stored.length > 0) {
        stored = stored.map((chat: any) => {
          // If this chat has no title, create one from its first message
          if (!chat.title && chat.messages && chat.messages.length > 0) {
            // Find the first user message (not bot replies)
            const firstUserMsg = chat.messages.find(
              (m: any) => m.role === "user"
            );
            if (firstUserMsg) {
              // Extract first 5 words, truncate to 50 chars for sidebar
              const words = firstUserMsg.text
                .split(/\s+/)
                .slice(0, 5)
                .join(" ");
              chat.title = words.substring(0, 50) || "New Chat";
            } else {
              chat.title = "New Chat";
            }
          }

          // Ensure every chat has a title and proper updatedAt timestamp
          return {
            ...chat,
            title: chat.title || "New Chat",
            updatedAt:
              typeof chat.updatedAt === "number" ? chat.updatedAt : Date.now(),
          };
        });

        // Save the migrated chats back
        saveChats(stored);
      }

      // If there are saved chats, restore the most recent one
      if (stored && stored.length > 0) {
        // Find index of the chat with the newest updatedAt timestamp
        const latestIndex = stored.reduce(
          (bestIndex: number, current: any, index: number) =>
            (current.updatedAt || 0) > (stored[bestIndex]?.updatedAt || 0)
              ? index
              : bestIndex,
          0
        );

        // Restore the chat state
        setChats(stored);
        setChat([...(stored[latestIndex]?.messages || [])]);
        setChatIndex(latestIndex);
      }
    } catch (err) {
      // If anything goes wrong loading, just continue with empty chats
      console.error("Failed to load chats");
    } finally {
      // Finished loading - hide the loading screen
      setLoading(false);
    }
  }, []); // Empty dependency array = run once on mount

  // While loading chats from storage, show a loading screen
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
          <h1 className="mt-2 text-xl font-semibold">
            Preparing your workspace
          </h1>
        </div>
      </div>
    );
  }

  // Main app layout after loading is complete
  // Fully responsive: sidebar is hidden on mobile, visible on desktop
  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.14),_transparent_24%),radial-gradient(circle_at_80%_0%,_rgba(16,185,129,0.12),_transparent_18%),linear-gradient(180deg,_#f8fbff_0%,_#eef4f8_100%)] text-white dark:bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.1),_transparent_24%),radial-gradient(circle_at_80%_0%,_rgba(16,185,129,0.1),_transparent_18%),linear-gradient(180deg,_#020617_0%,_#0f172a_100%)] sm:flex-row">
      {/* Subtle grid background pattern - responsive opacity */}
      <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] [background-size:44px_44px] sm:opacity-40" />

      {/* Left sidebar - shows list of saved chats - hidden on mobile */}
      <div className="hidden sm:flex sm:flex-col">
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
      </div>

      {/* Mobile sidebar overlay - visible only on mobile */}
      <div className="sm:hidden">
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
      </div>

      {/* Main chat window - shows messages and input - responsive flex-1 */}
      <div className="relative flex-1 overflow-hidden">
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
    </div>
  );
}
