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
  Download,
  Play,
} from "lucide-react";
import ChatInput from "./ChatInput";
import MarkdownRenderer from "./MarkdownRenderer";
import ModeSelector from "./dropdown";

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
  setInteractionLocked: (locked: boolean) => void;
}

// Main chat window component.
// It displays messages, sends user prompts to the AI agent, streams bot replies,
// manages editing/regeneration, and keeps saved chat history in sync.
export default function ChatBox({
  chat,
  setChat,
  chats,
  setChats,
  chatIndex,
  setChatIndex,
  setSidebarOpen,
  setInteractionLocked,
}: ChatBoxProps) {
  // const quickModes = [
  //   "Give me a fast weather brief for today.",
  //   "Compare weather, news, and my schedule in one summary.",
  //   "Help me plan outfits and travel around today's forecast.",
  // ];
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
  const [mode, setMode] = useState<string>(
    () => localStorage.getItem("zyrochat-mode") || "normal"
  );
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

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
  const interactionLocked = loading || pendingEdit !== null || shouldRegenerate;

  useEffect(() => {
    // Loads the saved theme when the chat window first appears.
    // If no theme is saved, it follows the user's system dark-mode preference.
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
    // Saves the selected assistant mode so it stays the same after refresh.
    localStorage.setItem("zyrochat-mode", mode);
  }, [mode]);

  // Lock cross-chat actions while a reply is still streaming or being regenerated.
  useEffect(() => {
    setInteractionLocked(interactionLocked);
  }, [interactionLocked, setInteractionLocked]);

  useEffect(() => {
    // Auto-scrolls to the latest message unless the user has manually scrolled up.
    // If the user is reading older messages, it shows the scroll-down button instead.
    if (userScrolledRef.current) {
      setHasNewBelow(true);
      setShowScrollDown(true);
      return;
    }

    const timer = setTimeout(() => {
      // During active streaming, we use 'auto' scroll behavior to avoid animation lag.
      // For static page changes or new messages, we use 'smooth' scroll behavior.
      const lastMessage = chat[chat.length - 1];
      const isStreaming = lastMessage?.loading || (lastMessage?.role === "bot" && loading);

      bottomRef.current?.scrollIntoView({
        behavior: isStreaming ? "auto" : "smooth",
      });
    }, 50);

    return () => clearTimeout(timer);
  }, [chat.length, chat[chat.length - 1]?.text, loading]);

  // Tracks whether the user is near the bottom of the chat.
  // This decides whether new messages should auto-scroll or show a "new below" indicator.
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
    // Runs when the user switches to a different saved chat.
    // It resets temporary UI state so menus, edits, and loading flags do not leak
    // from the previous conversation.
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

  // Copies one message to the clipboard.
  // It is used by the message action bar under each chat bubble.
  const handleCopyMessage = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
  }, []);

  // Downloads the current conversation as a Markdown file.
  // The export includes the chat title, time, mode, and every message.
  const exportChatAsMarkdown = useCallback(() => {
    if (!chat.length) return;

    const title =
      (chatIndex !== null && chats[chatIndex]?.title) ||
      "ZyroChat Conversation";
    const markdown = [
      `# ${title}`,
      "",
      `- Exported: ${new Date().toLocaleString()}`,
      `- Mode: ${mode}`,
      "",
      ...chat.map((message) => {
        // Converts each saved message into a readable Markdown section.
        const speaker = message.role === "user" ? "User" : "ZyroChat";
        return `## ${speaker}\n\n${message.text}\n`;
      }),
    ].join("\n");

    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const safeFileName =
      title
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-")
        .toLowerCase() || "zyrochat-conversation";

    anchor.href = url;
    anchor.download = `${safeFileName}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [chat, chatIndex, chats, mode]);

  // Downloads the current conversation as a plain TXT file.
  const exportChatAsTXT = useCallback(() => {
    if (!chat.length) return;

    const title =
      (chatIndex !== null && chats[chatIndex]?.title) ||
      "ZyroChat Conversation";
    const textContent = [
      `=== ${title} ===`,
      `Exported: ${new Date().toLocaleString()}`,
      `Mode: ${mode}`,
      "",
      ...chat.map((message) => {
        const speaker = message.role === "user" ? "User" : "ZyroChat";
        return `[${speaker}]:\n${message.text}\n`;
      }),
    ].join("\n");

    const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const safeFileName =
      title
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-")
        .toLowerCase() || "zyrochat-conversation";

    anchor.href = url;
    anchor.download = `${safeFileName}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [chat, chatIndex, chats, mode]);

  // Exports the conversation as a clean PDF using the browser's print engine.
  const exportChatAsPDF = useCallback(() => {
    window.print();
  }, []);

  // Updates one saved chat's timestamp and, optionally, its messages.
  // This keeps the sidebar order and local storage aligned with the latest reply.
  const touchChatSession = useCallback(
    (index: number, messages?: Message[]) => {
      setChats((prevChats: ChatSession[]) => {
        // React state is treated as immutable, so this creates a new array
        // instead of changing the old saved chat list directly.
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

  // Toggles the "liked" state for a bot message.
  // Liking a message also clears "disliked" so both states cannot be active.
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

  // Toggles the "disliked" state for a bot message.
  // Disliking a message also clears "liked" for the same reason.
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

  // Shares a message through the browser share sheet when available.
  // If sharing is unavailable, it falls back to copying the text.
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

  // Deletes one message from the current conversation.
  // It also updates the saved chat entry so refresh does not bring the message back.
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

  // Starts editing a user message.
  // Only user messages can be edited because bot messages are generated output.
  const handleEditMessage = useCallback(
    (index: number) => {
      if (chat[index]?.role === "user") {
        setEditingIndex(index);
        setEditText(chat[index].text);
      }
    },
    [chat]
  );

  // Saves an edited user message.
  // The chat is trimmed back to that edited message, then a new AI response is generated.
  const handleSaveEdit = useCallback(async () => {
    if (editingIndex === null || !editText.trim()) return;

    const newChat = chat.slice(0, editingIndex);
    newChat.push({ role: "user", text: editText });

    setChat(newChat);
    setEditingIndex(null);
    setPendingEdit({ text: editText, index: editingIndex });
    setEditText("");
  }, [editingIndex, editText, chat, setChat]);

  // Regenerates the latest assistant reply.
  // It finds the last user message, removes everything after it, and asks again.
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

  // Sends a user message to the smart agent and streams the assistant response.
  // It handles loading state, aborts, errors, scroll indicators, and saving history.
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
            mode,
            (chunk: string) => {
              // Runs every time the model streams more text.
              // The UI is updated with the growing reply so the answer appears live.
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
              if (fullReply.trim()) {
                const partialMessage: Message = {
                  role: "bot",
                  text: fullReply,
                  loading: false,
                  error: false,
                };
                const finalChat = [...updatedChat, partialMessage];
                setChat(finalChat);
                if (currentChatIndex !== null) {
                  touchChatSession(currentChatIndex, finalChat);
                }
              } else {
                setChat(updatedChat);
              }
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
    [mode, setChat, setChats, stoppedByUser, touchChatSession]
  );

  // Continues generating the last assistant response if it got cut off.
  const handleContinue = useCallback(async () => {
    if (chatIndex === null || chat.length === 0 || loading || interactionLocked) return;

    const lastMsgIdx = chat.length - 1;
    if (chat[lastMsgIdx].role !== "bot") return;

    const originalText = chat[lastMsgIdx].text;

    responseChatIndexRef.current = chatIndex;
    userScrolledRef.current = false;
    setLoading(true);
    setStoppedByUser(false);

    try {
      abortRef.current = new AbortController();
      let continuationReply = "";

      const continuationPrompt = "Continue the response from where it was cut off. Do not repeat any previous text, start exactly with the next character/word, and continue seamlessly.";

      try {
        await runSmartAgentStream(
          continuationPrompt,
          chat, // Send full chat including the partial bot message so it has context
          mode,
          (chunk: string) => {
            if (chatIndex !== viewedChatIndexRef.current) return;

            continuationReply = chunk;
            if (userScrolledRef.current) {
              setHasNewBelow(true);
              setShowScrollDown(true);
            }
            setChat((prevChat) => {
              const updated = [...prevChat];
              if (updated[lastMsgIdx]) {
                updated[lastMsgIdx] = {
                  ...updated[lastMsgIdx],
                  text: originalText + continuationReply,
                  loading: false,
                  error: false,
                };
              }
              return updated;
            });
          },
          abortRef.current.signal
        );
      } catch (streamError: Error | unknown) {
        const error = streamError as { name?: string };
        if (error?.name === "AbortError" || stoppedByUser) {
          setLoading(false);
          if (chatIndex !== null) {
            setChat((prevChat) => {
              touchChatSession(chatIndex, prevChat);
              return prevChat;
            });
          }
          return;
        }
        throw streamError;
      }

      setLoading(false);

      if (responseChatIndexRef.current === chatIndex) {
        const finalChatText = originalText + continuationReply;
        const updatedChat = chat.map((msg, idx) =>
          idx === lastMsgIdx
            ? { ...msg, text: finalChatText, loading: false, error: false }
            : msg
        );

        if (chatIndex === viewedChatIndexRef.current) {
          setChat(updatedChat);
        }

        touchChatSession(chatIndex, updatedChat);
      }
    } catch (error: Error | unknown) {
      console.error("Continuation error:", error);
      setLoading(false);
    }
  }, [chat, chatIndex, loading, interactionLocked, mode, touchChatSession, stoppedByUser]);

  useEffect(() => {
    // After a user edits a message, this effect waits until the UI is ready,
    // then generates a fresh response for the edited text.
    if (pendingEdit && !loading) {
      generateResponse(pendingEdit.text, chat, chatIndex, chats);
      setPendingEdit(null);
    }
  }, [pendingEdit, chat, loading, generateResponse, chatIndex, chats]);

  useEffect(() => {
    // After the user clicks regenerate, this effect finds the most recent
    // user prompt and asks the AI to answer it again.
    if (shouldRegenerate && !loading && chat.length > 0) {
      const lastUserIndex = (() => {
        // Searches backward because the latest user message is usually near the end.
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

  // Stops the current AI generation/streaming immediately.
  const handleStop = useCallback(() => {
    setStoppedByUser(true);
    if (abortRef.current) {
      abortRef.current.abort();
    }
    setLoading(false);
  }, []);

  // Sends the current text from the input box.
  // It creates a new saved chat when needed, clears the input, and starts streaming.
  const handleSend = useCallback(async () => {
    if (!input.trim() || interactionLocked) return;

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
          // When title generation finishes, update only the new chat title.
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
    interactionLocked,
    chat,
    generateResponse,
    chatIndex,
    chats,
    setChatIndex,
    setChats,
    touchChatSession,
  ]);

  // Switches between light and dark themes.
  // It saves the choice in local storage and toggles the html "dark" class.
  const toggleTheme = useCallback(() => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("zyrochat-theme", nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
  }, [theme]);

  const isEmptyChat = chat.length === 0;
  const totalMessages = chat.length;
  const botMessages = chat.filter((msg) => msg.role === "bot").length;
  const userMessages = chat.filter((msg) => msg.role === "user").length;
  // Scrolls the chat back to the newest message.
  // It also clears the "new messages below" indicator.
  const scrollToBottom = useCallback(() => {
    userScrolledRef.current = false;
    setHasNewBelow(false);
    setShowScrollDown(false);
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  return (
    <div className="relative flex h-screen flex-1 flex-col bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.14),_transparent_32%),linear-gradient(180deg,_#f8fafc_0%,_#f1f5f9_100%)] dark:bg-[radial-gradient(circle_at_top,_rgba(51,65,85,0.34),_transparent_28%),linear-gradient(180deg,_#020617_0%,_#0f172a_100%)]">
      {/* Header - fully responsive */}
      <div className="sticky top-0 z-20 flex flex-col gap-2 border-b border-slate-200/70 bg-white/75 px-3 py-2 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/65 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 sm:py-3">
        {/* Mobile header - hamburger and title */}
        <div className="flex items-center justify-between sm:flex-1">
          <button
            onClick={() => setSidebarOpen && setSidebarOpen(true)}
            className="rounded-xl p-2.5 text-slate-600 transition hover:bg-slate-200/70 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white sm:hidden"
            title="Toggle sidebar"
          >
            <Menu size={20} className="text-slate-900 dark:text-white" />
          </button>
          <div className="flex min-w-0 flex-1 flex-col items-center sm:items-start">
            <span className="text-[10px] font-medium uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500 sm:text-[11px]">
              ZyroChat
            </span>
            <div className="flex min-w-0 items-center gap-1 sm:gap-2">
              <h1 className="truncate text-sm font-semibold text-slate-900 dark:text-white sm:text-base">
                {chatIndex !== null && chats[chatIndex]
                  ? chats[chatIndex].title
                  : "New Chat"}
              </h1>
              <span className="hidden rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300 sm:inline-flex">
                Live
              </span>
            </div>
          </div>
        </div>

        {/* Header actions - responsive layout */}
        <div className="flex items-center justify-end gap-1 sm:gap-2">
          <ModeSelector mode={mode} setMode={setMode} />
          {!isEmptyChat && (
            <div className="relative">
              <button
                onClick={() => setExportMenuOpen(!exportMenuOpen)}
                className="rounded-xl p-2.5 text-slate-600 transition hover:bg-slate-200/70 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                title="Export conversation"
                aria-label="Export conversation"
              >
                <Download size={16} className="sm:size-[17px]" />
              </button>
              {exportMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-40 overflow-hidden rounded-2xl border border-slate-200 bg-white/95 p-1 shadow-xl backdrop-blur dark:border-slate-800 dark:bg-slate-800/95 z-50 animate-fade-in"
                  onMouseLeave={() => setExportMenuOpen(false)}
                >
                  <button
                    onClick={() => {
                      exportChatAsMarkdown();
                      setExportMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[13px] text-slate-700 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    Markdown (.md)
                  </button>
                  <button
                    onClick={() => {
                      exportChatAsTXT();
                      setExportMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[13px] text-slate-700 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    Plain Text (.txt)
                  </button>
                  <button
                    onClick={() => {
                      exportChatAsPDF();
                      setExportMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[13px] text-slate-700 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    PDF Transcript (.pdf)
                  </button>
                </div>
              )}
            </div>
          )}
          <button
            onClick={toggleTheme}
            className="rounded-xl p-2.5 text-slate-600 transition hover:bg-slate-200/70 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? <Sun size={16} className="sm:size-[18px]" /> : <Moon size={16} className="sm:size-[18px]" />}
          </button>
        </div>
      </div>

      {/* Stats bar - responsive and hidden on small mobile */}
      {!isEmptyChat && (
        <div className="border-b border-slate-200/60 bg-white/55 px-3 py-1.5 backdrop-blur-xl dark:border-slate-800/70 dark:bg-slate-950/35 sm:px-6 sm:py-2">
          <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-1.5 sm:gap-2">
            <div className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-300 sm:px-3 sm:py-1 sm:text-[11px]">
              {mode} mode
            </div>
            <div className="hidden rounded-full border border-slate-200 bg-white/80 px-2 py-0.5 text-[10px] text-slate-600 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300 sm:inline-flex sm:px-3 sm:py-1 sm:text-[11px]">
              {totalMessages} messages
            </div>
            <div className="hidden rounded-full border border-slate-200 bg-white/80 px-2 py-0.5 text-[10px] text-slate-600 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300 sm:inline-flex sm:px-3 sm:py-1 sm:text-[11px]">
              {userMessages} prompts
            </div>
            <div className="hidden rounded-full border border-slate-200 bg-white/80 px-2 py-0.5 text-[10px] text-slate-600 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300 sm:inline-flex sm:px-3 sm:py-1 sm:text-[11px]">
              {botMessages} replies
            </div>
          </div>
        </div>
      )}

      {isEmptyChat ? (
        <div className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6">
          <div className="w-full max-w-5xl">
            {/* <div className="mb-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[26px] border border-white/70 bg-white/75 p-4 shadow-[0_24px_60px_-44px_rgba(15,23,42,0.38)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/60">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-300">
                  Forecast
                </p>
                <p className="mt-2 text-[13px] text-slate-600 dark:text-slate-300">
                  Real-time weather answers, quick summaries, and location-based
                  guidance.
                </p>
              </div>
              <div className="rounded-[26px] border border-white/70 bg-white/75 p-4 shadow-[0_24px_60px_-44px_rgba(15,23,42,0.38)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/60">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-600 dark:text-emerald-300">
                  Assist
                </p>
                <p className="mt-2 text-[13px] text-slate-600 dark:text-slate-300">
                  Use it like a personal desk for planning, headlines, and fast
                  calculations.
                </p>
              </div>
              <div className="rounded-[26px] border border-white/70 bg-white/75 p-4 shadow-[0_24px_60px_-44px_rgba(15,23,42,0.38)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/60">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-fuchsia-600 dark:text-fuchsia-300">
                  Flow
                </p>
                <p className="mt-2 text-[13px] text-slate-600 dark:text-slate-300">
                  Clean conversation history, dark mode, and an input area built
                  for longer prompts.
                </p>
              </div>
            </div> */}
            <ChatInput
              input={input}
              setInput={setInput}
              onSend={handleSend}
              onStop={handleStop}
              loading={loading}
              centered
            />
          </div>
        </div>
      ) : (
        <>
          <div
            ref={containerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto scroll-smooth px-2.5 py-3 sm:px-5 sm:py-6 md:px-5"
          >
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 sm:gap-4 pb-24">
              {chat.map((msg: Message, idx: number) => {
                // Prepares display flags for each message row.
                // The index is used for editing, deleting, and action buttons.
                const isEditing = editingIndex === idx;

                return (
                  <div
                    key={idx}
                    className="flex w-full justify-start border-b border-slate-100/50 dark:border-slate-800/20 last:border-0 py-2 sm:py-3"
                  >
                    <div
                      className="group relative w-full p-2.5 sm:p-3 md:p-4 text-slate-900 dark:text-white"
                    >
                      <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-medium tracking-wide text-slate-400 dark:text-slate-500 sm:mb-2.5 sm:gap-2 sm:text-[11px]">
                        <span
                          className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] sm:h-7 sm:w-7 ${
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
                                // Leaves edit mode and discards the temporary edit text.
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
                            <div className="flex flex-col gap-3 py-2.5 max-w-2xl">
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1.5">
                                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.3s]" />
                                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.15s]" />
                                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-bounce" />
                                </div>
                                <span className="text-[11px] font-semibold tracking-wider text-emerald-600 dark:text-emerald-400 uppercase">
                                  Formulating response...
                                </span>
                              </div>
                              <div className="space-y-2.5">
                                <div className="h-3 w-[85%] rounded-full animate-shimmer" />
                                <div className="h-3 w-[65%] rounded-full animate-shimmer" />
                              </div>
                            </div>
                          ) : msg.error ? (
                            <p className="text-[12px]">{msg.text}</p>
                          ) : (
                            <div
                              className={
                                msg.role === "bot"
                                  ? "prose max-w-none dark:prose-invert"
                                  : ""
                              }
                            >
                              {msg.role === "bot" ? (
                                <MarkdownRenderer
                                  text={msg.text}
                                  isStreaming={idx === chat.length - 1 && loading}
                                />
                              ) : (
                                <p className="whitespace-pre-wrap text-[13px] leading-6 sm:text-[14px]">
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
                                <>
                                  <button
                                    onClick={handleRegenerate}
                                    disabled={loading}
                                    className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                                    title="Regenerate response"
                                  >
                                    <RotateCcw size={16} />
                                  </button>
                                  <button
                                    onClick={handleContinue}
                                    disabled={loading}
                                    className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                                    title="Continue generating"
                                  >
                                    <Play size={15} />
                                  </button>
                                </>
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
                              onClick={() => {
                                // Toggles the small menu for this specific message.
                                setMessageMenuIndex(
                                  messageMenuIndex === idx ? null : idx
                                );
                              }}
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
                                        // Starts editing this user message and closes the menu.
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
                                    // Deletes this message and closes the menu afterward.
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
              className="absolute bottom-28 right-4 z-30 flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-700 shadow-[0_12px_35px_-12px_rgba(15,23,42,0.45)] transition-all hover:scale-105 hover:shadow-xl active:scale-95 dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-200 sm:bottom-32 sm:right-6"
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
            interactionLocked={interactionLocked}
          />
        </>
      )}
    </div>
  );
}
