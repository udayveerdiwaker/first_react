import { useState } from "react";
import DeleteModal from "./DeleteModal";
import { Trash2, Pencil, X, Search, Plus } from "lucide-react";
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

  const handleDelete = (index: number) => {
    const updatedChats = chats.filter((_: any, i: number) => i !== index);

    setChats(updatedChats);
    localStorage.setItem("chats", JSON.stringify(updatedChats));

    setChat([]);
    setChatIndex(null);
  };

  // const handleEdit = (index: number) => {
  //   const newTitle = prompt("Enter new chat title:");
  //   if (!newTitle) return;

  //   const updated = [...chats];

  //   // ✅ NEW SYSTEM (title field use karo)
  //   updated[index].title = newTitle;

  //   setChats(updated);
  //   localStorage.setItem("chats", JSON.stringify(updated));
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

        {/* 📦 CONTENT AREA */}
        <div className="p-4 space-y-3">
          {/* ➕ New Chat */}
          <button
            onClick={() => {
              setChat([]);
              setChatIndex(null);
            }}
            className="w-full flex items-center gap-2 px-4 py-3 rounded-xl 
      bg-white/5 hover:bg-white/10 border border-white/10 
      transition text-sm active:scale-95"
          >
            <Plus size={16} />
            New Chat
          </button>

          {/* 🔍 Search */}
          <input
            type="text"
            placeholder="Search chats..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-sm focus:outline-none"
          />
        </div>

        {/* 📜 CHAT LIST */}
        <div className="flex-1 overflow-y-auto px-2 space-y-1">
          {filteredChats.map((c: any, i: number) => {
            const title = c.title || "New Chat";

            return (
              <div
                key={i}
                className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition text-sm ${
                  i === chatIndex
                    ? "bg-blue-600 text-white"
                    : "hover:bg-white/10 text-gray-300"
                }`}
              >
                {/* Chat Title */}
                <div
                  onClick={() => {
                    setChat(c.messages);
                    setChatIndex(i);
                  }}
                  className="flex-1 truncate"
                >
                  {title}
                </div>

                {/* 🔥 Delete Button (hover only) */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteIndex(i);
                  }}
                  className=" transition text-gray-400 hover:text-red-400"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}
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
    </>
  );
}
