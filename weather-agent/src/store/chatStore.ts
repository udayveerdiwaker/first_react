export function saveChat(chat: any) {
  localStorage.setItem("chat", JSON.stringify(chat));
}

export function loadChat() {
  return JSON.parse(localStorage.getItem("chat") || "[]");
}
