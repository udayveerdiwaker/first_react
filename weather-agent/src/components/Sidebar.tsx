import { useMemo, useState } from "react";
import DeleteModal from "./DeleteModal";
import {
  Trash2,
  X,
  Plus,
  MessageSquare,
  MoreVertical,
  Edit2,
  Copy,
  Search,
} from "lucide-react";
import { saveChats } from "../store/chatStore";

// Sidebar component.
// It shows saved chats, lets the user search and rename them,
// and provides actions like starting, copying, or deleting a conversation.
export default function Sidebar({
  chats,
  setChats,
  setChat,
  setChatIndex,
  chatIndex,
  sidebarOpen,
  setSidebarOpen,
  interactionLocked,
}: any) {
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [menuIndex, setMenuIndex] = useState<number | null>(null);
  const [renameIndex, setRenameIndex] = useState<number | null>(null);
  const [renameText, setRenameText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Renames a chat and saves the updated chat list to local storage.
  // Empty names are ignored so the sidebar does not show blank chat titles.
  const handleRenameChat = (index: number, newTitle: string) => {
    if (!newTitle.trim()) return;

    const updated = chats.map((c: any, i: number) =>
      i === index ? { ...c, title: newTitle, updatedAt: Date.now() } : c
    );

    setChats(updated);
    saveChats(updated);
    setRenameIndex(null);
    setRenameText("");
    setMenuIndex(null);
  };

  // Copies every message in one chat as plain text.
  // User messages are labeled "You" and assistant messages are labeled "AI".
  const handleCopyChatContent = (index: number) => {
    const chat = chats[index];
    if (!chat || !chat.messages) return;

    const content = chat.messages
      .map((m: any) => `${m.role === "user" ? "You" : "AI"}: ${m.text}`)
      .join("\n\n");

    navigator.clipboard.writeText(content);
    setMenuIndex(null);
  };

  const sortedChats = chats
    // Adds the original array index so sorting does not lose where each chat lives
    // in the real saved chat list.
    .map((chat: any, index: number) => ({ chat, index }))
    .sort(
      // Newer conversations should appear first in the sidebar.
      (a: any, b: any) => (b.chat.updatedAt || 0) - (a.chat.updatedAt || 0)
    );

  // Filters chats by the search box.
  // It checks both the chat title and all message text, so users can search
  // by topic even if the title does not contain the word.
  const filteredChats = sortedChats.filter(({ chat }: any) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;

    const title = (chat.title || "").toLowerCase();
    const preview = (chat.messages || [])
      .map((message: any) => message.text || "")
      .join(" ")
      .toLowerCase();

    return title.includes(query) || preview.includes(query);
  });

  // Groups chats into date sections for a ChatGPT-like history list.
  // useMemo keeps this calculation from running again unless the filtered list changes.
  const groupedChats = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    ).getTime();
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
    const startOfWeekWindow = startOfToday - 7 * 24 * 60 * 60 * 1000;

    const today = filteredChats.filter(
      ({ chat }: any) => (chat.updatedAt || 0) >= startOfToday
    );
    const yesterday = filteredChats.filter(
      ({ chat }: any) =>
        (chat.updatedAt || 0) >= startOfYesterday &&
        (chat.updatedAt || 0) < startOfToday
    );
    const previous7Days = filteredChats.filter(
      ({ chat }: any) =>
        (chat.updatedAt || 0) >= startOfWeekWindow &&
        (chat.updatedAt || 0) < startOfYesterday
    );
    const older = filteredChats.filter(
      ({ chat }: any) => (chat.updatedAt || 0) < startOfWeekWindow
    );

    return [
      { label: "Today", items: today },
      { label: "Yesterday", items: yesterday },
      { label: "Previous 7 Days", items: previous7Days },
      { label: "Older", items: older },
    ].filter((group) => group.items.length > 0);
  }, [filteredChats]);

  return (
    <>
      {sidebarOpen && (
        // On small screens, clicking the dark overlay closes the sidebar.
        <div
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-[2px] md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Prevents clicks inside the sidebar from bubbling to the mobile overlay. */}
      <div
        className={`
          fixed left-0 top-0 z-50 flex h-full w-[85vw] flex-col
          border-r border-slate-200/70 bg-[linear-gradient(180deg,_rgba(255,255,255,0.92)_0%,_rgba(248,250,252,0.98)_100%)]
          text-slate-900 shadow-[0_20px_80px_-50px_rgba(15,23,42,0.45)]
          backdrop-blur-xl transition-transform duration-300
          dark:border-slate-800 dark:bg-[linear-gradient(180deg,_rgba(2,6,23,0.96)_0%,_rgba(15,23,42,0.98)_100%)] dark:text-white
          sm:static sm:w-[288px] sm:translate-x-0 sm:shadow-none
          md:w-[288px]
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-slate-200/70 px-4 py-4 dark:border-slate-800">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white shadow-md dark:bg-white dark:text-slate-950">
                Z
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">
                  ZyroChat
                </p>
                <h2 className="text-[15px] font-semibold">Conversations</h2>
              </div>
            </div>

            <button
              onClick={() => setSidebarOpen(false)}
              className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white md:hidden"
              title="Close sidebar"
              aria-label="Close sidebar"
            >
              <X size={18} />
            </button>
          </div>

          <button
            onClick={() => {
              // Starts a fresh chat only when no response is currently streaming.
              if (interactionLocked) return;
              setChat([]);
              setChatIndex(null);
            }}
            disabled={interactionLocked}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-[13px] font-semibold text-white shadow-md transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
            aria-label="Start a new chat"
            title="Start a new chat"
          >
            <Plus size={18} strokeWidth={2.5} />
            New chat
          </button>

          <div className="mt-3 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 text-[13px] text-slate-400 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-500">
            <Search size={15} />
            {/* Keeps the search box controlled by React state.
            Every typed character immediately filters the visible chat list. */}
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search recent ZyroChat sessions"
              className="w-full bg-transparent text-[13px] text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-200 dark:placeholder:text-slate-500"
            />
          </div>

          {/* <div className="mt-3 rounded-3xl border border-slate-200/80 bg-white/75 p-3 shadow-[0_20px_50px_-38px_rgba(15,23,42,0.45)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/70">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-300">
              <Sparkles size={13} />
              Workspace Pulse
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="rounded-2xl bg-slate-100/80 px-2.5 py-2 dark:bg-slate-800/80">
                <p className="text-[10px] text-slate-400 dark:text-slate-500">
                  Chats
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                  {workspaceStats.totalChats}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-100/80 px-2.5 py-2 dark:bg-slate-800/80">
                <p className="text-[10px] text-slate-400 dark:text-slate-500">
                  Msgs
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                  {workspaceStats.totalMessages}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-100/80 px-2.5 py-2 dark:bg-slate-800/80">
                <p className="text-[10px] text-slate-400 dark:text-slate-500">
                  Today
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                  {workspaceStats.todayChats}
                </p>
              </div>
            </div>
          </div> */}
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-3">
          {chats.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300/80 px-4 py-10 text-center dark:border-slate-700">
              <MessageSquare
                size={24}
                className="mx-auto mb-3 text-slate-400 dark:text-slate-500"
              />
              <p className="text-[13px] font-medium text-slate-600 dark:text-slate-300">
                No ZyroChat sessions yet
              </p>
              <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                Start a new chat to see it here.
              </p>
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300/80 px-4 py-10 text-center dark:border-slate-700">
              <MessageSquare
                size={24}
                className="mx-auto mb-3 text-slate-400 dark:text-slate-500"
              />
              <p className="text-[13px] font-medium text-slate-600 dark:text-slate-300">
                No matching sessions
              </p>
              <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                Try a different title or message keyword.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {groupedChats.map((group) => (
                // Renders one date group such as Today, Yesterday, or Older.
                <div key={group.label}>
                  <div className="mb-1 px-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                      {group.label}
                    </p>
                  </div>

                  <div className="space-y-1">
                    {group.items.map(
                      ({ chat: c, index: originalIndex }: any) => {
                        // Builds the display state for one chat row.
                        // originalIndex points back to the real chat in the saved array.
                        const title = c.title || "New Chat";
                        const isActive = originalIndex === chatIndex;
                        const isRenaming = renameIndex === originalIndex;
                        const isMenuOpen = menuIndex === originalIndex;

                        return (
                          <div key={originalIndex} className="group relative">
                            <div
                              className={`cursor-pointer rounded-xl px-3 py-2.5 transition-all ${
                                isActive
                                  ? "bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-950"
                                  : "text-slate-700 hover:bg-slate-100/90 dark:text-slate-300 dark:hover:bg-slate-900/80"
                              }`}
                              onClick={() => {
                                // Opens this conversation unless another action is locked.
                                // The messages are copied into active chat state for display.
                                if (interactionLocked) return;
                                setChat([
                                  ...(chats[originalIndex]?.messages || []),
                                ]);
                                setChatIndex(originalIndex);
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <MessageSquare
                                  size={14}
                                  className={
                                    isActive
                                      ? "text-white/80 dark:text-slate-700"
                                      : "text-slate-400 dark:text-slate-500"
                                  }
                                />
                                <div className="min-w-0 flex-1">
                                  {isRenaming ? (
                                    <input
                                      autoFocus
                                      type="text"
                                      value={renameText}
                                      onChange={(e) => {
                                        // Updates the temporary rename text while typing.
                                        setRenameText(e.target.value);
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                      onBlur={() => {
                                        // Saves the rename when the input loses focus.
                                        handleRenameChat(
                                          originalIndex,
                                          renameText
                                        );
                                      }}
                                      onKeyDown={(e) => {
                                        // Enter saves the new title.
                                        // Escape cancels rename mode without saving.
                                        e.stopPropagation();
                                        if (e.key === "Enter")
                                          handleRenameChat(
                                            originalIndex,
                                            renameText
                                          );
                                        if (e.key === "Escape") {
                                          setRenameIndex(null);
                                          setRenameText("");
                                        }
                                      }}
                                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[12px] text-slate-900 outline-none focus:border-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:focus:border-slate-500"
                                      placeholder="Chat name"
                                      aria-label="Edit chat name"
                                    />
                                  ) : (
                                    <p className="truncate text-[12px] font-medium">
                                      {title}
                                    </p>
                                  )}
                                </div>

                                <button
                                  onClick={(e) => {
                                    // Opens or closes the action menu for this one chat.
                                    e.stopPropagation();
                                    setMenuIndex(
                                      menuIndex === originalIndex
                                        ? null
                                        : originalIndex
                                    );
                                  }}
                                  className={`rounded-xl p-1.5 transition ${
                                    isActive
                                      ? "text-white/80 hover:bg-white/10 hover:text-white dark:text-slate-600 dark:hover:bg-slate-200 dark:hover:text-slate-950"
                                      : "text-slate-400 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-white"
                                  } opacity-100 md:opacity-0 md:group-hover:opacity-100`}
                                  title="Chat options"
                                >
                                  <MoreVertical size={14} />
                                </button>
                              </div>
                            </div>

                            {isMenuOpen && (
                              <div
                                className="absolute left-2 right-2 top-full z-40 mt-1 overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/95"
                                onMouseLeave={() => setMenuIndex(null)}
                              >
                                <button
                                  onClick={(e) => {
                                    // Switches this row into rename mode and pre-fills
                                    // the input with the current title.
                                    e.stopPropagation();
                                    setRenameIndex(originalIndex);
                                    setRenameText(title);
                                    setMenuIndex(null);
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] text-slate-700 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                                >
                                  <Edit2 size={14} />
                                  Rename
                                </button>

                                <button
                                  onClick={(e) => {
                                    // Copies the full conversation text to the clipboard.
                                    e.stopPropagation();
                                    handleCopyChatContent(originalIndex);
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] text-slate-700 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                                >
                                  <Copy size={14} />
                                  Copy all
                                </button>

                                <hr className="border-slate-200 dark:border-slate-700" />

                                <button
                                  onClick={(e) => {
                                    // Opens the confirmation modal before permanently
                                    // removing this chat from local history.
                                    e.stopPropagation();
                                    setMenuIndex(null);
                                    setDeleteIndex(originalIndex);
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                                >
                                  <Trash2 size={14} />
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-slate-200/70 px-4 py-3 dark:border-slate-800">
          <div className="rounded-2xl bg-slate-100/80 px-3 py-3 text-[11px] text-slate-500 dark:bg-slate-900/80 dark:text-slate-400">
            <p className="font-medium text-slate-700 dark:text-slate-200">
              ZyroChat v1.0
            </p>
            <p className="mt-1">
              Your recent ZyroChat sessions are stored locally.
            </p>
          </div>
        </div>

        {deleteIndex !== null && (
          <DeleteModal
            onClose={() => setDeleteIndex(null)}
            onConfirm={() => {
              // Removes the selected chat, saves the shorter list,
              // and clears the main chat window if the active chat was deleted.
              const updated = chats.filter(
                (_: any, i: number) => i !== deleteIndex
              );

              setChats(updated);
              saveChats(updated);

              if (deleteIndex === chatIndex) {
                setChat([]);
                setChatIndex(null);
              }

              setDeleteIndex(null);
            }}
          />
        )}
      </div>
    </>
  );
}
