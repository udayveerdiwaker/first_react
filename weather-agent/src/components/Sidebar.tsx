import { useState } from "react";
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

export default function Sidebar({
  chats,
  setChats,
  setChat,
  setChatIndex,
  chatIndex,
  sidebarOpen,
  setSidebarOpen,
}: any) {
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [menuIndex, setMenuIndex] = useState<number | null>(null);
  const [renameIndex, setRenameIndex] = useState<number | null>(null);
  const [renameText, setRenameText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const handleRenameChat = (index: number, newTitle: string) => {
    if (!newTitle.trim()) return;

    const updated = chats.map((c: any, i: number) =>
      i === index ? { ...c, title: newTitle, updatedAt: Date.now() } : c
    );

    setChats(updated);
    localStorage.setItem("chats", JSON.stringify(updated));
    setRenameIndex(null);
    setRenameText("");
    setMenuIndex(null);
  };

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
    .map((chat: any, index: number) => ({ chat, index }))
    .sort(
      (a: any, b: any) => (b.chat.updatedAt || 0) - (a.chat.updatedAt || 0)
    );

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

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-[2px] md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div
        className={`
          fixed left-0 top-0 z-50 flex h-full w-[288px] flex-col
          border-r border-slate-200/70 bg-[linear-gradient(180deg,_rgba(255,255,255,0.92)_0%,_rgba(248,250,252,0.98)_100%)]
          text-slate-900 shadow-[0_20px_80px_-50px_rgba(15,23,42,0.45)]
          backdrop-blur-xl transition-transform duration-300
          dark:border-slate-800 dark:bg-[linear-gradient(180deg,_rgba(2,6,23,0.96)_0%,_rgba(15,23,42,0.98)_100%)] dark:text-white
          md:static md:translate-x-0 md:shadow-none
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="border-b border-slate-200/70 px-4 py-4 dark:border-slate-800">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white shadow-md dark:bg-white dark:text-slate-950">
                Z
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">
                  ZyroChat
                </p>
                <h2 className="text-base font-semibold">Conversations</h2>
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
              setChat([]);
              setChatIndex(null);
              setSidebarOpen(false);
            }}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
            aria-label="Start a new chat"
            title="Start a new chat"
          >
            <Plus size={18} strokeWidth={2.5} />
            New chat
          </button>

          <div className="mt-3 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-500">
            <Search size={15} />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search recent ZyroChat sessions"
              className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-200 dark:placeholder:text-slate-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3">
          {chats.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300/80 px-4 py-10 text-center dark:border-slate-700">
              <MessageSquare
                size={24}
                className="mx-auto mb-3 text-slate-400 dark:text-slate-500"
              />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                No ZyroChat sessions yet
              </p>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                Start a new chat to see it here.
              </p>
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300/80 px-4 py-10 text-center dark:border-slate-700">
              <MessageSquare
                size={24}
                className="mx-auto mb-3 text-slate-400 dark:text-slate-500"
              />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                No matching sessions
              </p>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                Try a different title or message keyword.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredChats.map(({ chat: c, index: originalIndex }: any) => {
                const title = c.title || "New Chat";
                const isActive = originalIndex === chatIndex;
                const isRenaming = renameIndex === originalIndex;
                const isMenuOpen = menuIndex === originalIndex;
                const preview =
                  c.messages?.find((m: any) => m.role === "user")?.text ||
                  "Open this conversation";

                return (
                  <div key={originalIndex} className="group relative">
                    <div
                      className={`cursor-pointer rounded-2xl border px-3 py-3 transition-all ${
                        isActive
                          ? "border-slate-900 bg-slate-900 text-white shadow-md dark:border-white dark:bg-white dark:text-slate-950"
                          : "border-transparent bg-white/70 text-slate-700 hover:border-slate-200 hover:bg-white dark:bg-slate-900/50 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-900/80"
                      }`}
                      onClick={() => {
                        const updated = chats.map((chat: any, index: number) =>
                          index === originalIndex
                            ? { ...chat, updatedAt: Date.now() }
                            : chat
                        );
                        setChats(updated);
                        localStorage.setItem("chats", JSON.stringify(updated));
                        setChat([...(updated[originalIndex]?.messages || [])]);
                        setChatIndex(originalIndex);
                        setSidebarOpen(false);
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                            isActive
                              ? "bg-white/15 text-white dark:bg-slate-200 dark:text-slate-950"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          <MessageSquare size={16} />
                        </div>

                        <div className="min-w-0 flex-1">
                          {isRenaming ? (
                            <input
                              autoFocus
                              type="text"
                              value={renameText}
                              onChange={(e) => setRenameText(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              onBlur={() =>
                                handleRenameChat(originalIndex, renameText)
                              }
                              onKeyDown={(e) => {
                                e.stopPropagation();
                                if (e.key === "Enter")
                                  handleRenameChat(originalIndex, renameText);
                                if (e.key === "Escape") {
                                  setRenameIndex(null);
                                  setRenameText("");
                                }
                              }}
                              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:focus:border-slate-500"
                              placeholder="Chat name"
                              aria-label="Edit chat name"
                            />
                          ) : (
                            <>
                              <p className="truncate text-sm font-semibold">
                                {title}
                              </p>
                              <p
                                className={`mt-1 truncate text-xs ${
                                  isActive
                                    ? "text-white/70 dark:text-slate-600"
                                    : "text-slate-400 dark:text-slate-500"
                                }`}
                              >
                                {preview}
                              </p>
                            </>
                          )}
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuIndex(
                              menuIndex === originalIndex ? null : originalIndex
                            );
                          }}
                          className={`rounded-xl p-1.5 transition ${
                            isActive
                              ? "text-white/80 hover:bg-white/10 hover:text-white dark:text-slate-600 dark:hover:bg-slate-200 dark:hover:text-slate-950"
                              : "text-slate-400 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-white"
                          } opacity-100 md:opacity-0 md:group-hover:opacity-100`}
                          title="Chat options"
                        >
                          <MoreVertical size={15} />
                        </button>
                      </div>
                    </div>

                    {isMenuOpen && (
                      <div
                        className="absolute left-3 right-3 top-full z-40 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/95"
                        onMouseLeave={() => setMenuIndex(null)}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setRenameIndex(originalIndex);
                            setRenameText(title);
                            setMenuIndex(null);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          <Edit2 size={14} />
                          Rename
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyChatContent(originalIndex);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          <Copy size={14} />
                          Copy all
                        </button>

                        <hr className="border-slate-200 dark:border-slate-700" />

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuIndex(null);
                            setDeleteIndex(originalIndex);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-slate-200/70 px-4 py-3 dark:border-slate-800">
          <div className="rounded-2xl bg-slate-100/80 px-3 py-3 text-xs text-slate-500 dark:bg-slate-900/80 dark:text-slate-400">
            <p className="font-medium text-slate-700 dark:text-slate-200">
              ZyroChat v1.0
            </p>
            <p className="mt-1">Your recent ZyroChat sessions are stored locally.</p>
          </div>
        </div>

        {deleteIndex !== null && (
          <DeleteModal
            onClose={() => setDeleteIndex(null)}
            onConfirm={() => {
              const updated = chats.filter(
                (_: any, i: number) => i !== deleteIndex
              );

              setChats(updated);
              localStorage.setItem("chats", JSON.stringify(updated));

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
