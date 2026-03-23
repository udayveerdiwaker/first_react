import ChatBox from "./components/ChatBox";
import Sidebar from "./components/Sidebar";
import { useState } from "react";

export default function App() {
  const [chat, setChat] = useState([]);

  return (
    <div className="flex h-screen">
      <Sidebar setChat={setChat} />
      <ChatBox />
    </div>
  );
}
