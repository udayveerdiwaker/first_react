import { loadChat } from "../store/chatStore";

export default function Sidebar({ setChat }: any) {
  const chats = loadChat();

  return (
    <div className="w-64 bg-black text-white p-4 border-r border-gray-700">
      <h2 className="font-bold mb-4">Chats</h2>

      {chats.map((c: any, i: number) => (
        <div
          key={i}
          className="p-2 hover:bg-gray-800 cursor-pointer rounded"
          onClick={() => setChat(c)}
        >
          Chat {i + 1}
        </div>
      ))}
    </div>
  );
}
