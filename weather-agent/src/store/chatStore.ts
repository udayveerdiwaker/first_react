export function getChats() {
  return JSON.parse(localStorage.getItem("chats") || "[]");
}

export function saveChats(chats: any) {
  localStorage.setItem("chats", JSON.stringify(chats));
}
