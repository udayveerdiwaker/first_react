import { useState } from "react";
import DeleteModal from "./DeleteModal";
import { Trash2, X, Search, Plus } from "lucide-react";
export default function Sidebar({
  chats,
  setChats,
  setChat,
  setChatIndex,
  chatIndex,
  sidebarOpen,
  setSidebarOpen,
}: any) {
  const [search, setSearch] = useState("");
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  // const handleDelete = (index: number) => {
  //   const updatedChats = chats.filter((_: any, i: number) => i !== index);

  //   setChats(updatedChats);
  //   localStorage.setItem("chats", JSON.stringify(updatedChats));

  //   setChat([]);
  //   setChatIndex(null);
  // };

  const filteredChats = chats.filter((c: any) =>
    c.title?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <div
        className={`
    fixed md:static top-0 left-0 h-full z-50
    w-72 bg-[#020617] text-white flex flex-col border-r border-white/10
    transform transition-transform duration-300
    ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
    md:translate-x-0
  `}
      >
        {/* 🔝 HEADER */}

        <div
          className={`
    fixed md:static top-0 left-0 h-full z-50
    w-72 bg-[#020617] text-white flex flex-col 
    border-r border-white/10
    transform transition-transform duration-300
    ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
    md:translate-x-0
  `}
        >
          {/* 🔝 HEADER */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="text-lg">💬</span>
              <h2 className="text-lg font-semibold">Chats</h2>
            </div>

            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition"
            >
              <X size={18} />
            </button>
          </div>

          {/* 📦 TOP ACTIONS */}
          <div className="p-4 space-y-3">
            {/* ➕ New Chat */}
            <button
              onClick={() => {
                setChat([]);
                setChatIndex(null);
              }}
              className="w-full flex items-center gap-2 px-4 py-3 rounded-xl 
      bg-gradient-to-r from-blue-600 to-indigo-600 
      hover:opacity-90 transition text-sm active:scale-95"
            >
              <Plus size={16} />
              New Chat
            </button>

            {/* 🔍 Search */}
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search chats..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg 
        bg-white/5 border border-white/10 text-sm 
        focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* 📜 CHAT LIST */}
          <div className="flex-1 overflow-y-auto px-2 space-y-1 custom-scroll">
            <h2 className="text-xs uppercase tracking-wider text-gray-500 px-2 mb-2">
              Chats
            </h2>

            {filteredChats.length === 0 && (
              <p className="text-center text-gray-500 text-sm mt-10">
                No chats found
              </p>
            )}

            {[...filteredChats].reverse().map((c: any) => {
              const originalIndex = chats.findIndex((chat: any) => chat === c);
              const title = c.title || "New Chat";

              return (
                <div
                  key={originalIndex}
                  onClick={() => {
                    setChat(c.messages);
                    setChatIndex(originalIndex);
                  }}
                  className={`
        group flex items-center justify-between px-3 py-3 
        rounded-xl cursor-pointer transition-all text-sm
        ${
          originalIndex === chatIndex
            ? "bg-white/10 text-white"
            : "text-gray-400 hover:bg-white/5 hover:text-white"
        }
      `}
                >
                  <div className="flex-1 truncate">{title}</div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteIndex(originalIndex); // ✅ FIXED
                    }}
                    className="opacity-0 group-hover:opacity-100 transition text-gray-400 hover:text-red-400"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}

            {/* Delete Modal */}
            {deleteIndex !== null && (
              <DeleteModal
                onClose={() => setDeleteIndex(null)}
                onConfirm={() => {
                  const updated = chats.filter(
                    (_: any, i: number) => i !== deleteIndex
                  );

                  setChats(updated);
                  localStorage.setItem("chats", JSON.stringify(updated));

                  setChat([]);
                  setChatIndex(null);
                  setDeleteIndex(null);
                }}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
