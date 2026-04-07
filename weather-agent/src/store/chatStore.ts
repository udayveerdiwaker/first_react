function normalizeChats(chats: any[] = []) {
  return chats.map((chat) => ({
    ...chat,
    title: chat.title || "New Chat",
    updatedAt:
      typeof chat.updatedAt === "number" ? chat.updatedAt : Date.now(),
  }));
}

export function getChats() {
  const chats = JSON.parse(localStorage.getItem("chats") || "[]");
  return normalizeChats(chats);
}

export function saveChats(chats: any) {
  localStorage.setItem("chats", JSON.stringify(normalizeChats(chats)));
}
