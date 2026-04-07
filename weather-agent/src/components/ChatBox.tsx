import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type Dispatch,
  type SetStateAction,
} from "react";
import { runSmartAgentStream } from "../agent/smartAgent";
import { saveChats } from "../store/chatStore";
import { generateChatTitle } from "../utils/titleGenerator";
import {
  ArrowDown,
  Copy,
  Edit2,
  RotateCcw,
  Trash2,
  Check,
  X,
  ThumbsUp,
  ThumbsDown,
  Share2,
  MoreVertical,
  Menu,
  Moon,
  Sun,
} from "lucide-react";
import ChatInput from "./ChatInput";
import MarkdownRenderer from "./MarkdownRenderer";

interface Message {
  role: "user" | "bot";
  text: string;
  loading?: boolean;
  error?: boolean;
  liked?: boolean;
  disliked?: boolean;
}

interface ChatSession {
  title: string;
  messages: Message[];
  updatedAt?: number;
}

interface ChatBoxProps {
  chat: Message[];
  setChat: Dispatch<SetStateAction<Message[]>>;
  chats: ChatSession[];
  setChats: Dispatch<SetStateAction<ChatSession[]>>;
  chatIndex: number | null;
  setChatIndex: (index: number | null) => void;
  setSidebarOpen: (open: boolean) => void;
}

export default function ChatBox({
  chat,
  setChat,
  chats,
  setChats,
  chatIndex,
  setChatIndex,
  setSidebarOpen,
}: ChatBoxProps) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [stoppedByUser, setStoppedByUser] = useState(false);
  const [messageMenuIndex, setMessageMenuIndex] = useState<number | null>(null);
  const [pendingEdit, setPendingEdit] = useState<{
    text: string;
    index: number;
  } | null>(null);
  const [shouldRegenerate, setShouldRegenerate] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [hasNewBelow, setHasNewBelow] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const userScrolledRef = useRef(false);
  const isNewChatRef = useRef(false);
  const responseChatIndexRef = useRef<number | null>(null);
  const viewedChatIndexRef = useRef<number | null>(null);
  const nearBottomThreshold = 120;

  useEffect(() => {
    const savedTheme = localStorage.getItem("zyrochat-theme") as
      | "light"
      | "dark"
      | null;
    const preferredDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    const nextTheme = savedTheme || (preferredDark ? "dark" : "light");

    setTheme(nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
  }, []);

  useEffect(() => {
    if (userScrolledRef.current) {
      setHasNewBelow(true);
      setShowScrollDown(true);
      return;
    }

    const timer = setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);

    return () => clearTimeout(timer);
  }, [chat.length]);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;

    if (distanceFromBottom > nearBottomThreshold) {
      userScrolledRef.current = true;
      setShowScrollDown(true);
    } else {
      userScrolledRef.current = false;
      setShowScrollDown(false);
      setHasNewBelow(false);
    }
  }, []);

  useEffect(() => {
    viewedChatIndexRef.current = chatIndex;

    userScrolledRef.current = false;
    setShowScrollDown(false);
    setHasNewBelow(false);

    if (isNewChatRef.current) {
      isNewChatRef.current = false;
      setStoppedByUser(false);
      setEditingIndex(null);
      setEditText("");
      setMessageMenuIndex(null);
      setPendingEdit(null);
      setShouldRegenerate(false);
    } else {
      setLoading(false);
      setEditingIndex(null);
      setEditText("");
      setMessageMenuIndex(null);
      setPendingEdit(null);
      setShouldRegenerate(false);
      setStoppedByUser(false);
    }

    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [chatIndex]);

  const handleCopyMessage = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
  }, []);

  const touchChatSession = useCallback(
    (index: number, messages?: Message[]) => {
      setChats((prevChats: ChatSession[]) => {
        if (!prevChats[index]) return prevChats;

        const updated = prevChats.map((chat, chatIdx) =>
          chatIdx === index
            ? {
                ...chat,
                updatedAt: Date.now(),
                ...(messages ? { messages } : {}),
              }
            : chat
        );

        saveChats(updated);
        return updated;
      });
    },
    [setChats]
  );

  const handleLikeMessage = useCallback(
    (index: number) => {
      const updatedChat = chat.map((msg: Message, i: number) =>
        i === index ? { ...msg, liked: !msg.liked, disliked: false } : msg
      );
      setChat(updatedChat);
      if (chatIndex !== null && chats[chatIndex]) {
        const updatedChats = chats.map((c: ChatSession) => ({ ...c }));
        updatedChats[chatIndex] = {
          ...updatedChats[chatIndex],
          messages: updatedChat,
        };
        setChats(updatedChats);
        saveChats(updatedChats);
      }
    },
    [chat, chatIndex, chats, setChat, setChats]
  );

  const handleDislikeMessage = useCallback(
    (index: number) => {
      const updatedChat = chat.map((msg: Message, i: number) =>
        i === index ? { ...msg, disliked: !msg.disliked, liked: false } : msg
      );
      setChat(updatedChat);
      if (chatIndex !== null && chats[chatIndex]) {
        const updatedChats = chats.map((c: ChatSession) => ({ ...c }));
        updatedChats[chatIndex] = {
          ...updatedChats[chatIndex],
          messages: updatedChat,
        };
        setChats(updatedChats);
        saveChats(updatedChats);
      }
    },
    [chat, chatIndex, chats, setChat, setChats]
  );

  const handleShareMessage = useCallback((text: string) => {
    if (navigator.share) {
      navigator.share({
        title: "Chat Message",
        text,
      });
    } else {
      navigator.clipboard.writeText(text);
    }
  }, []);

  const handleDeleteMessage = useCallback(
    (index: number) => {
      const newChat = chat.filter((_: Message, i: number) => i !== index);
      setChat(newChat);

      if (chatIndex !== null && chats[chatIndex]) {
        const updatedChats = chats.map((c: ChatSession) => ({ ...c }));
        updatedChats[chatIndex] = {
          ...updatedChats[chatIndex],
          messages: newChat,
        };
        setChats(updatedChats);
        saveChats(updatedChats);
      }
    },
    [chat, chatIndex, chats, setChat, setChats]
  );

  const handleEditMessage = useCallback(
    (index: number) => {
      if (chat[index]?.role === "user") {
        setEditingIndex(index);
        setEditText(chat[index].text);
      }
    },
    [chat]
  );

  const handleSaveEdit = useCallback(async () => {
    if (editingIndex === null || !editText.trim()) return;

    const newChat = chat.slice(0, editingIndex);
    newChat.push({ role: "user", text: editText });

    setChat(newChat);
    setEditingIndex(null);
    setPendingEdit({ text: editText, index: editingIndex });
    setEditText("");
  }, [editingIndex, editText, chat, setChat]);

  const handleRegenerate = useCallback(async () => {
    if (chat.length === 0) return;

    let lastUserIndex = -1;
    for (let i = chat.length - 1; i >= 0; i--) {
      if (chat[i].role === "user") {
        lastUserIndex = i;
        break;
      }
    }

    if (lastUserIndex === -1) return;

    const chatUpToUserMessage = chat.slice(0, lastUserIndex + 1);

    setChat(chatUpToUserMessage);
    setShouldRegenerate(true);
  }, [chat, setChat]);

  const generateResponse = useCallback(
    async (
      userInput: string,
      chatHistory: Message[],
      currentChatIndex: number | null,
      _currentChats: ChatSession[]
    ) => {
      void _currentChats;

      responseChatIndexRef.current = currentChatIndex;
      userScrolledRef.current = false;
      setLoading(true);
      setStoppedByUser(false);

      try {
        const updatedChat = [...chatHistory];

        if (responseChatIndexRef.current === currentChatIndex) {
          setChat([
            ...updatedChat,
            { role: "bot", text: "", loading: true, error: false },
          ]);
        }

        abortRef.current = new AbortController();
        let fullReply = "";

        try {
          await runSmartAgentStream(
            userInput,
            updatedChat,
            "normal",
            (chunk: string) => {
              if (currentChatIndex !== viewedChatIndexRef.current) {
                return;
              }

              fullReply = chunk;
              if (userScrolledRef.current) {
                setHasNewBelow(true);
                setShowScrollDown(true);
              }
              setChat([
                ...updatedChat,
                {
                  role: "bot",
                  text: fullReply,
                  loading: false,
                  error: false,
                },
              ]);
            },
            abortRef.current.signal
          );
        } catch (streamError: Error | unknown) {
          const error = streamError as { name?: string };
          if (error?.name === "AbortError" || stoppedByUser) {
            if (
              responseChatIndexRef.current === currentChatIndex &&
              currentChatIndex === viewedChatIndexRef.current
            ) {
              setChat(updatedChat);
            }
            setLoading(false);
            return;
          }
          throw streamError;
        }

        setLoading(false);

        if (responseChatIndexRef.current === currentChatIndex) {
          const botMessage: Message = {
            role: "bot",
            text: fullReply || "Unable to generate response",
            loading: false,
            error: !fullReply,
          };
          const finalChat: Message[] = [...updatedChat, botMessage];
          const newMessages = finalChat.map((msg) => ({ ...msg }));

          if (currentChatIndex === viewedChatIndexRef.current) {
            setChat(finalChat);
          }

          if (currentChatIndex !== null) {
            touchChatSession(currentChatIndex, newMessages);
          }
        }
      } catch (error: Error | unknown) {
        const err = error as { name?: string };
        if (err?.name !== "AbortError" && !stoppedByUser) {
          console.error("Response error:", error);
          if (
            responseChatIndexRef.current === currentChatIndex &&
            currentChatIndex === viewedChatIndexRef.current
          ) {
            const errorMessage: Message = {
              role: "bot",
              text: "Failed to generate response. Please try again.",
              loading: false,
              error: true,
            };
            setChat([...chatHistory, errorMessage]);
          }
        }
        setLoading(false);
      }
    },
    [setChat, setChats, stoppedByUser]
  );

  useEffect(() => {
    if (pendingEdit && !loading) {
      generateResponse(pendingEdit.text, chat, chatIndex, chats);
      setPendingEdit(null);
    }
  }, [pendingEdit, chat, loading, generateResponse, chatIndex, chats]);

  useEffect(() => {
    if (shouldRegenerate && !loading && chat.length > 0) {
      const lastUserIndex = (() => {
        for (let i = chat.length - 1; i >= 0; i--) {
          if (chat[i].role === "user") return i;
        }
        return -1;
      })();

      if (lastUserIndex >= 0) {
        generateResponse(chat[lastUserIndex].text, chat, chatIndex, chats);
      }
      setShouldRegenerate(false);
    }
  }, [shouldRegenerate, chat, loading, generateResponse, chatIndex, chats]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || loading) return;

    const userInput = input;
    setInput("");

    if (chatIndex === null) {
      const newChat: ChatSession = {
        title: "New Chat",
        messages: [{ role: "user", text: userInput }],
        updatedAt: Date.now(),
      };
      const updatedChats = [...chats, newChat];
      const newIndex = updatedChats.length - 1;

      isNewChatRef.current = true;

      setChatIndex(newIndex);
      setChats(updatedChats);
      saveChats(updatedChats);

      generateChatTitle(userInput)
        .then((title) => {
          setChats((prevChats: ChatSession[]) => {
            const updated = prevChats.map((c: ChatSession, idx: number) =>
              idx === newIndex ? { ...c, title, updatedAt: Date.now() } : c
            );
            saveChats(updated);
            return updated;
          });
        })
        .catch(() => {
          // Silently keep the fallback title.
        });

      await generateResponse(
        userInput,
        [{ role: "user", text: userInput }],
        newIndex,
        updatedChats
      );
    } else {
      await generateResponse(
        userInput,
        [...chat, { role: "user", text: userInput }],
        chatIndex,
        chats
      );
    }
  }, [
    input,
    loading,
    chat,
    generateResponse,
    chatIndex,
    chats,
    setChatIndex,
    setChats,
    touchChatSession,
  ]);

  const handleStop = useCallback(() => {
    setStoppedByUser(true);
    abortRef.current?.abort();
    setLoading(false);
  }, []);

  const toggleTheme = useCallback(() => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("zyrochat-theme", nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
  }, [theme]);

  const isEmptyChat = chat.length === 0;
  const scrollToBottom = useCallback(() => {
    userScrolledRef.current = false;
    setHasNewBelow(false);
    setShowScrollDown(false);
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  return (
    <div className="relative flex h-screen flex-1 flex-col bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.14),_transparent_32%),linear-gradient(180deg,_#f8fafc_0%,_#f1f5f9_100%)] dark:bg-[radial-gradient(circle_at_top,_rgba(51,65,85,0.34),_transparent_28%),linear-gradient(180deg,_#020617_0%,_#0f172a_100%)]">
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200/70 bg-white/75 px-4 py-3 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/65 sm:px-6">
        <button
          onClick={() => setSidebarOpen && setSidebarOpen(true)}
          className="rounded-xl p-2 text-slate-600 transition hover:bg-slate-200/70 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white md:hidden"
          title="Toggle sidebar"
        >
          <Menu size={20} className="text-slate-900 dark:text-white" />
        </button>
        <div className="flex min-w-0 flex-1 flex-col items-center md:items-start">
          <span className="text-[11px] font-medium uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">
            ZyroChat
          </span>
          <h1 className="truncate text-base font-semibold text-slate-900 dark:text-white sm:text-lg">
            {chatIndex !== null && chats[chatIndex]
              ? chats[chatIndex].title
              : "New Chat"}
          </h1>
        </div>
        <button
          onClick={toggleTheme}
          className="rounded-xl p-2 text-slate-600 transition hover:bg-slate-200/70 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      {isEmptyChat ? (
        <div className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6">
          <ChatInput
            input={input}
            setInput={setInput}
            onSend={handleSend}
            onStop={handleStop}
            loading={loading}
            centered
          />
        </div>
      ) : (
        <>
          <div
            ref={containerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto scroll-smooth px-3 py-4 sm:px-5 sm:py-6"
          >
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 pb-24">
            {chat.map((msg: Message, idx: number) => {
              const isEditing = editingIndex === idx;

              return (
                <div
                  key={idx}
                  className={`flex w-full ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`group relative w-full max-w-[52rem] p-3.5 sm:p-4 ${
                      msg.role === "user"
                        ? "max-w-xl rounded-[22px] rounded-br-md border border-slate-300/70 bg-white/94 text-slate-900 shadow-[0_12px_35px_-24px_rgba(15,23,42,0.4)] dark:border-slate-700/80 dark:bg-slate-800/95 dark:text-white"
                        : "rounded-[24px] border border-slate-200/80 bg-white/88 text-slate-900 shadow-[0_14px_40px_-30px_rgba(15,23,42,0.35)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/72 dark:text-white"
                    }`}
                  >
                    <div className="mb-2.5 flex items-center gap-2 text-[11px] font-medium tracking-wide text-slate-400 dark:text-slate-500">
                      <span
                        className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-[11px] ${
                          msg.role === "user"
                            ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950"
                            : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                        }`}
                      >
                        {msg.role === "user" ? "U" : "Z"}
                      </span>
                      <span>{msg.role === "user" ? "You" : "ZyroChat"}</span>
                    </div>

                    {isEditing ? (
                      <div className="space-y-3">
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          placeholder="Edit your message..."
                          title="Edit message"
                          className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-slate-500"
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={handleSaveEdit}
                            className="flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1.5 text-sm text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                          >
                            <Check size={16} /> Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingIndex(null);
                              setEditText("");
                            }}
                            className="flex items-center gap-1 rounded-full bg-slate-200 px-3 py-1.5 text-sm text-slate-900 transition hover:bg-slate-300 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600"
                          >
                            <X size={16} /> Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {msg.loading ? (
                          <div className="flex items-center gap-3">
                            <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" />
                            <span className="text-[13px] text-slate-500 dark:text-slate-400">
                              Generating response...
                            </span>
                          </div>
                        ) : msg.error ? (
                          <p className="text-[13px]">{msg.text}</p>
                        ) : (
                          <div
                            className={
                              msg.role === "bot"
                                ? "prose max-w-none dark:prose-invert"
                                : ""
                            }
                          >
                            {msg.role === "bot" ? (
                              <MarkdownRenderer text={msg.text} />
                            ) : (
                                <p className="whitespace-pre-wrap text-[14px] leading-6 sm:text-[15px]">
                                  {msg.text}
                                </p>
                              )}
                          </div>
                        )}
                      </>
                    )}

                    {!msg.loading && !isEditing && (
                      <div
                        className={`mt-3 flex items-center gap-0.5 border-t border-slate-200/80 pt-2.5 transition-opacity dark:border-slate-700/80 ${
                          msg.role === "bot"
                            ? "opacity-100"
                            : "opacity-0 group-hover:opacity-100"
                        }`}
                      >
                        <button
                          onClick={() => handleCopyMessage(msg.text)}
                          className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                          title="Copy message"
                        >
                          <Copy size={16} />
                        </button>

                        {msg.role === "bot" && (
                          <>
                            <button
                              onClick={() => handleLikeMessage(idx)}
                              className={`rounded-full p-2 transition ${
                                msg.liked
                                  ? "bg-green-100 text-green-500 dark:bg-green-900/30"
                                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                              }`}
                              title="Like this response"
                            >
                              <ThumbsUp size={16} />
                            </button>

                            <button
                              onClick={() => handleDislikeMessage(idx)}
                              className={`rounded-full p-2 transition ${
                                msg.disliked
                                  ? "bg-red-100 text-red-500 dark:bg-red-900/30"
                                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                              }`}
                              title="Dislike this response"
                            >
                              <ThumbsDown size={16} />
                            </button>

                            {idx === chat.length - 1 && (
                              <button
                                onClick={handleRegenerate}
                                disabled={loading}
                                className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                                title="Regenerate response"
                              >
                                <RotateCcw size={16} />
                              </button>
                            )}
                          </>
                        )}

                        <button
                          onClick={() => handleShareMessage(msg.text)}
                          className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                          title="Share message"
                        >
                          <Share2 size={16} />
                        </button>

                        <div className="relative ml-auto">
                          <button
                            onClick={() =>
                              setMessageMenuIndex(
                                messageMenuIndex === idx ? null : idx
                              )
                            }
                            className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                            title="More options"
                          >
                            <MoreVertical size={16} />
                          </button>

                          {messageMenuIndex === idx && (
                            <div className="absolute right-0 z-50 mt-2 w-40 rounded-2xl border border-slate-200 bg-white/95 p-1 shadow-xl backdrop-blur dark:border-slate-700 dark:bg-slate-800/95">
                              {msg.role === "user" && (
                                <>
                                  <button
                                    onClick={() => {
                                      handleEditMessage(idx);
                                      setMessageMenuIndex(null);
                                    }}
                                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                                  >
                                    <Edit2 size={14} />
                                    Edit
                                  </button>
                                  <hr className="border-slate-200 dark:border-slate-700" />
                                </>
                              )}

                              <button
                                onClick={() => {
                                  handleDeleteMessage(idx);
                                  setMessageMenuIndex(null);
                                }}
                                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                              >
                                <Trash2 size={14} />
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
          </div>

          {showScrollDown && (
            <button
              onClick={scrollToBottom}
              className="absolute bottom-24 left-1/2 z-20 flex h-11 w-11 -translate-x-1/2 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-700 shadow-[0_12px_35px_-12px_rgba(15,23,42,0.45)] transition-all hover:scale-105 hover:shadow-xl active:scale-95 dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-200"
              title="Scroll to bottom"
            >
              <ArrowDown size={18} />
              {hasNewBelow && (
                <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-emerald-500" />
              )}
            </button>
          )}

          <ChatInput
            input={input}
            setInput={setInput}
            onSend={handleSend}
            onStop={handleStop}
            loading={loading}
          />
        </>
      )}
    </div>
  );
}
