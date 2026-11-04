import {
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";
import type { Dispatch, SetStateAction } from "react";
import { createPortal } from "react-dom";
import {
  RotateCcw,
  Check,
  Trash2,
  Copy,
  Edit2,
  X,
  ThumbsUp,
  ThumbsDown,
  Share2,
  Menu,
  Moon,
  Sun,
  Download,
  Play,
  User,
  Brain,
  Code2,
  Search,
  FileText,
  Sparkles,
  Globe,
  Volume2,
  VolumeX,
  ExternalLink,
  PanelRightOpen,
  PanelRightClose,
  GitBranch,
  AlertTriangle,
  Clock,
} from "lucide-react";
import ChatInput from "./ChatInput";
import { formatHourDisplay } from "./HourSelector";
import MarkdownRenderer from "./MarkdownRenderer";
import ModeSelector from "./dropdown";
import AntigravityLogo from "./AntigravityLogo";
import WorkspacePanel from "./WorkspacePanel";
import GeneratedImageViewer from "./GeneratedImageViewer";
import type { AspectRatioOption } from "./ImageGenerationToggle";
import { runSmartAgentStream, reconnectGenerationStream } from "../agent/smartAgent";
import { generateChatTitle } from "../utils/titleGenerator";
import { classifyIntent } from "../agent/intentRouter";
import {
  saveChats,
  saveMessageToServer,
  syncConversationToServer,
  fetchActiveGeneration,
  getConversationDraft,
  saveConversationDraft,
  clearConversationDraft,
  generateImageApi,
  cancelImageApi,
  fetchImageStatusApi,
} from "../store/chatStore";
import ChatErrorBoundary from "./ChatErrorBoundary";
import {
  getProjects,
  getActiveProjectId,
  getMemories,
  isMemoryEnabled,
} from "../store/workspaceStore";
import { motion, AnimatePresence } from "framer-motion";
import type {
  Attachment,
  ChatMessage,
  SourceCitation,
  ToolStatusInfo,
  WorkspaceArtifact,
  ImageGenerationInfo,
} from "../agent/types";

type Message = ChatMessage;

interface ChatSession {
  id?: string;
  title: string;
  messages: Message[];
  updatedAt?: number;
  parentConversationId?: string | null;
  parentTitle?: string | null;
  parentBranchMessageId?: string | null;
}

const UserAvatar = () => (
  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-slate-700 dark:bg-[#1c2130] dark:text-slate-300 border border-slate-300/40 dark:border-slate-700/50 select-none">
    <User size={12} className="stroke-[2.5]" />
  </div>
);

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
  const activeConvId =
    chatIndex !== null && chats[chatIndex]
      ? chats[chatIndex].id || `conv-${chatIndex}`
      : null;

  // Active generation ID for stop/cancel tracking
  const currentGenerationIdRef = useRef<string | null>(null);

  // Autosaved draft input across page reloads (scoped to conversation)
  const [input, setInput] = useState<string>(() => {
    return getConversationDraft(activeConvId);
  });

  // Switch draft when conversation changes
  useEffect(() => {
    setInput(getConversationDraft(activeConvId));
  }, [activeConvId]);

  // Preserve draft in localStorage whenever it changes
  useEffect(() => {
    saveConversationDraft(activeConvId, input);
  }, [input, activeConvId]);

  // Offline / Network monitoring
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [networkToast, setNetworkToast] = useState<string | null>(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setNetworkToast("Connection restored.");
      setTimeout(() => setNetworkToast(null), 3500);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setNetworkToast("You appear to be offline. Drafts are safely preserved.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Search result message scroll & highlight
  const [highlightedMsgIdx, setHighlightedMsgIdx] = useState<number | null>(null);

  // Submitting debounce lock
  const isSubmittingRef = useRef(false);

  const [loading, setLoading] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [stoppedByUser, setStoppedByUser] = useState(false);
  const [pendingEdit, setPendingEdit] = useState<{
    text: string;
    index: number;
  } | null>(null);
  const [shouldRegenerate, setShouldRegenerate] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [mode, setMode] = useState<string>(
    () =>
      localStorage.getItem("app-mode") ||
      localStorage.getItem("antigravity-mode") ||
      localStorage.getItem("zyrochat-mode") ||
      "auto"
  );
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [toolStatus, setToolStatus] = useState<ToolStatusInfo | null>(null);
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [activeArtifact, setActiveArtifact] = useState<WorkspaceArtifact | null>(null);

  // Response feedback state
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [feedbackMessageIdx, setFeedbackMessageIdx] = useState<number | null>(null);
  const [feedbackCategory, setFeedbackCategory] = useState("inaccurate");
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [externalPromptToEdit, setExternalPromptToEdit] = useState<string | null>(null);

  // Listen for workspace open requests from code blocks or tools
  useEffect(() => {
    const handleOpenWorkspace = (e: Event) => {
      const custom = e as CustomEvent<WorkspaceArtifact>;
      if (custom.detail) {
        setActiveArtifact(custom.detail);
        setWorkspaceOpen(true);
      }
    };
    const handleUsePrompt = (e: Event) => {
      const custom = e as CustomEvent<{ prompt: string }>;
      if (custom.detail?.prompt) {
        setInput(custom.detail.prompt);
      }
    };
    const handleScrollToMessage = (e: Event) => {
      const custom = e as CustomEvent<{ messageIndex: number }>;
      if (typeof custom.detail?.messageIndex === "number") {
        const targetIdx = custom.detail.messageIndex;
        setHighlightedMsgIdx(targetIdx);
        setTimeout(() => {
          const el = document.getElementById(`msg-container-${targetIdx}`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 120);
        setTimeout(() => setHighlightedMsgIdx(null), 3000);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setExportMenuOpen(false);
        setFeedbackModalOpen(false);
        setEditingIndex(null);
      }
    };

    window.addEventListener("zyrochat:open-workspace", handleOpenWorkspace);
    window.addEventListener("zyrochat:use-prompt", handleUsePrompt);
    window.addEventListener("zyrochat:scroll-to-message", handleScrollToMessage);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("zyrochat:open-workspace", handleOpenWorkspace);
      window.removeEventListener("zyrochat:use-prompt", handleUsePrompt);
      window.removeEventListener("zyrochat:scroll-to-message", handleScrollToMessage);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Text-to-speech voice playback
  const handleSpeak = useCallback(
    (text: string, idx: number) => {
      if (!("speechSynthesis" in window)) return;

      if (speakingIdx === idx) {
        window.speechSynthesis.cancel();
        setSpeakingIdx(null);
        return;
      }

      window.speechSynthesis.cancel();
      const plainText = text
        .replace(/```[\s\S]*?```/g, " [Code block omitted] ")
        .replace(/`([^`]+)`/g, "$1")
        .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1")
        .replace(/[#*_~]/g, "");

      const utterance = new SpeechSynthesisUtterance(plainText);

      // Apply saved voice preferences
      const savedVoiceURI = localStorage.getItem("zyrochat-speech-voice");
      if (savedVoiceURI) {
        const voices = window.speechSynthesis.getVoices();
        const match = voices.find((v) => v.voiceURI === savedVoiceURI);
        if (match) utterance.voice = match;
      }
      const savedRate = localStorage.getItem("zyrochat-speech-rate");
      if (savedRate) {
        utterance.rate = parseFloat(savedRate);
      }

      utterance.onend = () => setSpeakingIdx(null);
      utterance.onerror = () => setSpeakingIdx(null);
      setSpeakingIdx(idx);
      window.speechSynthesis.speak(utterance);
    },
    [speakingIdx]
  );

  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [hasNewBelow, setHasNewBelow] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const userScrolledRef = useRef(false);
  const isNewChatRef = useRef(false);
  const responseChatIndexRef = useRef<number | null>(null);
  const viewedChatIndexRef = useRef<number | null>(null);
  const isLoadedRef = useRef(false);

  useEffect(() => {
    isLoadedRef.current = false;
    const timer = setTimeout(() => {
      isLoadedRef.current = true;
    }, 150);
    return () => clearTimeout(timer);
  }, [chatIndex]);

  const nearBottomThreshold = 120;
  const interactionLocked = loading || pendingEdit !== null || shouldRegenerate;

  useEffect(() => {
    const savedTheme = (localStorage.getItem("app-theme") ||
      localStorage.getItem("antigravity-theme") ||
      localStorage.getItem("zyrochat-theme")) as "light" | "dark" | null;
    const preferredDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const nextTheme = savedTheme || (preferredDark ? "dark" : "light");

    setTheme(nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
  }, []);

  useEffect(() => {
    localStorage.setItem("app-mode", mode);
  }, [mode]);

  useEffect(() => {
    setInteractionLocked(interactionLocked);
  }, [interactionLocked, setInteractionLocked]);

  useEffect(() => {
    if (userScrolledRef.current) {
      setHasNewBelow(true);
      setShowScrollDown(true);
      return;
    }

    const timer = setTimeout(() => {
      const lastMessage = chat[chat.length - 1];
      const isStreaming = lastMessage?.loading || (lastMessage?.role === "bot" && loading);

      bottomRef.current?.scrollIntoView({
        behavior: isStreaming ? "auto" : "smooth",
      });
    }, 50);

    return () => clearTimeout(timer);
  }, [chat.length, chat[chat.length - 1]?.text, chat[chat.length - 1]?.imageGeneration?.status, loading]);

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
      setPendingEdit(null);
      setShouldRegenerate(false);
    } else {
      setEditingIndex(null);
      setEditText("");
      setPendingEdit(null);
      setShouldRegenerate(false);
      setStoppedByUser(false);

      // Refresh Recovery: Check server for active generation or interrupted state
      if (activeConvId) {
        fetchActiveGeneration(activeConvId)
          .then((activeGen) => {
            if (activeGen && (activeGen.status === "streaming" || activeGen.status === "pending")) {
              currentGenerationIdRef.current = activeGen.id;
              setLoading(true);

              setChat((prev) => {
                const updated = [...prev];
                const lastIdx = updated.length - 1;
                if (lastIdx >= 0 && updated[lastIdx].role === "bot") {
                  updated[lastIdx] = {
                    ...updated[lastIdx],
                    loading: true,
                    status: "streaming" as const,
                    generationId: activeGen.id,
                    text: activeGen.bufferedText || updated[lastIdx].text,
                  };
                }
                return updated;
              });

              reconnectGenerationStream(
                activeGen.id,
                (streamText) => {
                  setChat((prev) => {
                    const updated = [...prev];
                    const lastIdx = updated.length - 1;
                    if (lastIdx >= 0 && updated[lastIdx].role === "bot") {
                      updated[lastIdx] = {
                        ...updated[lastIdx],
                        text: streamText,
                        loading: false,
                        status: "streaming" as const,
                      };
                    }
                    return updated;
                  });
                },
                abortRef.current?.signal
              )
                .then((finalText) => {
                  setLoading(false);
                  setChat((prev) => {
                    const updated = [...prev];
                    const lastIdx = updated.length - 1;
                    if (lastIdx >= 0 && updated[lastIdx].role === "bot") {
                      updated[lastIdx] = {
                        ...updated[lastIdx],
                        text: finalText,
                        loading: false,
                        status: "completed" as const,
                      };
                    }
                    if (chatIndex !== null) {
                      touchChatSession(chatIndex, updated);
                    }
                    return updated;
                  });
                })
                .catch((streamErr) => {
                  console.warn("Generation reconnection finished or failed:", streamErr);
                  setLoading(false);
                });
            } else {
              setLoading(false);
              // Resolve any dangling loading bot message as interrupted (excluding image generations)
              setChat((prev) => {
                let changed = false;
                const updated: Message[] = prev.map((msg, idx) => {
                  if (idx === prev.length - 1 && msg.role === "bot" && (msg.loading || msg.status === "streaming")) {
                    if (msg.imageGeneration) {
                      return msg; // Let image generation poller resolve status
                    }
                    changed = true;
                    return {
                      ...msg,
                      loading: false,
                      status: "interrupted" as const,
                      error: true,
                      text: msg.text || "Response interrupted.",
                    };
                  }
                  return msg;
                });
                if (changed && chatIndex !== null) {
                  touchChatSession(chatIndex, updated);
                }
                return updated;
              });
            }
          })
          .catch(() => {
            setLoading(false);
          });
      } else {
        setLoading(false);
      }
    }

    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [chatIndex, activeConvId, touchChatSession]);

  // Refresh Recovery & Polling for in-flight Image Generations
  useEffect(() => {
    const pendingImages = chat.filter(
      (m) =>
        m.imageGeneration &&
        (m.imageGeneration.status === "generating" ||
          m.imageGeneration.status === "pending")
    );

    if (pendingImages.length === 0) return;

    let isMounted = true;
    const interval = setInterval(async () => {
      for (const msg of pendingImages) {
        if (!msg.imageGeneration?.id) continue;
        try {
          const res = await fetchImageStatusApi(msg.imageGeneration.id);
          if (
            res?.generation &&
            res.generation.status !== "generating" &&
            res.generation.status !== "pending" &&
            isMounted
          ) {
            setChat((prev) => {
              const next = prev.map((m) =>
                m.id === msg.id
                  ? {
                      ...m,
                      loading: false,
                      status: res.generation.status,
                      error: res.generation.status === "failed",
                      imageGeneration: res.generation,
                    }
                  : m
              );
              if (chatIndex !== null) {
                touchChatSession(chatIndex, next);
              }
              return next;
            });
          }
        } catch {
          // Keep polling until status is resolved or unmounted
        }
      }
    }, 2000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [chat, chatIndex, touchChatSession]);

  const handleCopyMessage = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
  }, []);

  const exportChatAsMarkdown = useCallback(() => {
    if (!chat.length) return;

    const title =
      (chatIndex !== null && chats[chatIndex]?.title) ||
      "Conversation";
    const markdown = [
      `# ${title}`,
      "",
      `- Exported: ${new Date().toLocaleString()}`,
      `- Mode: ${mode}`,
      "",
      ...chat.map((message) => {
        const speaker = message.role === "user" ? "User" : "Assistant";
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
        .toLowerCase() || "conversation";

    anchor.href = url;
    anchor.download = `${safeFileName}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [chat, chatIndex, chats, mode]);

  const exportChatAsTXT = useCallback(() => {
    if (!chat.length) return;

    const title =
      (chatIndex !== null && chats[chatIndex]?.title) ||
      "Conversation";
    const textContent = [
      `=== ${title} ===`,
      `Exported: ${new Date().toLocaleString()}`,
      `Mode: ${mode}`,
      "",
      ...chat.map((message) => {
        const speaker = message.role === "user" ? "User" : "Assistant";
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
        .toLowerCase() || "conversation";

    anchor.href = url;
    anchor.download = `${safeFileName}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [chat, chatIndex, chats, mode]);

  const exportChatAsPDF = useCallback(() => {
    window.print();
  }, []);

  const handleLikeMessage = useCallback(
    (index: number) => {
      const isLiking = !chat[index]?.liked;
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

      if (isLiking) {
        const BACKEND_URL =
          import.meta.env.VITE_BACKEND_URL?.replace(/\/$/, "") || "http://localhost:5000";
        fetch(`${BACKEND_URL}/api/feedback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId: (chatIndex !== null && (chats[chatIndex] as any)?.id) || "local",
            messageIndex: index,
            rating: "positive",
          }),
        }).catch(() => {});
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
      setFeedbackMessageIdx(index);
      setFeedbackModalOpen(true);
      setFeedbackSent(false);
    },
    [chat, chatIndex, chats, setChat, setChats]
  );

  const handleSubmitFeedback = async () => {
    if (feedbackMessageIdx === null) return;
    try {
      const BACKEND_URL =
        import.meta.env.VITE_BACKEND_URL?.replace(/\/$/, "") || "http://localhost:5000";
      await fetch(`${BACKEND_URL}/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: (chatIndex !== null && (chats[chatIndex] as any)?.id) || "local",
          messageIndex: feedbackMessageIdx,
          rating: "negative",
          category: feedbackCategory,
          comment: feedbackComment,
        }),
      });
    } catch (err) {
      console.warn("Feedback error:", err);
    }
    setFeedbackSent(true);
    setTimeout(() => {
      setFeedbackModalOpen(false);
      setFeedbackComment("");
    }, 850);
  };

  const handleBranchConversation = useCallback(
    async (messageIndex: number) => {
      const branchedMessages = chat.slice(0, messageIndex + 1);
      const parentTitle =
        (chatIndex !== null && chats[chatIndex]?.title) || "Conversation";
      const parentId =
        (chatIndex !== null && (chats[chatIndex] as any)?.id) || "local-" + Date.now();
      const newTitle = `Branch: ${parentTitle} (msg ${messageIndex + 1})`;

      const BACKEND_URL =
        import.meta.env.VITE_BACKEND_URL?.replace(/\/$/, "") || "http://localhost:5000";

      let serverBranchId = "branch-" + Date.now();
      try {
        const res = await fetch(`${BACKEND_URL}/api/conversations/${parentId}/branch`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messageIndex,
            newTitle,
            messages: branchedMessages,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.branchId) serverBranchId = data.branchId;
        }
      } catch (_) {}

      const newSession: ChatSession = {
        id: serverBranchId,
        title: newTitle,
        messages: branchedMessages,
        updatedAt: Date.now(),
        parentConversationId: parentId,
        parentTitle: parentTitle,
        parentBranchMessageId: String(messageIndex),
      };

      const updatedChats = [newSession, ...chats];
      setChats(updatedChats);
      saveChats(updatedChats);
      setChat(branchedMessages);
      setChatIndex(0);
    },
    [chat, chatIndex, chats, setChat, setChatIndex, setChats]
  );

  const handleShareMessage = useCallback((text: string) => {
    if (navigator.share) {
      navigator.share({
        title: "Conversation Message",
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
      _currentChats: ChatSession[],
      generationId?: string,
      userMessageId?: string,
      assistantMessageId?: string,
      conversationId?: string,
      hour?: string,
      timezone?: string
    ) => {
      void _currentChats;

      responseChatIndexRef.current = currentChatIndex;
      userScrolledRef.current = false;
      setLoading(true);
      setStoppedByUser(false);
      currentGenerationIdRef.current = generationId || null;

      const updatedChat = [...chatHistory];

      try {
        if (responseChatIndexRef.current === currentChatIndex) {
          setChat([
            ...updatedChat,
            {
              id: assistantMessageId,
              role: "bot",
              text: "",
              loading: true,
              status: "streaming",
              error: false,
              generationId,
            },
          ]);
        }

        abortRef.current = new AbortController();
        let fullReply = "";
        let capturedSources: SourceCitation[] = [];

        try {
          const activeProjId = getActiveProjectId();
          const activeProj = activeProjId
            ? getProjects().find((p) => p.id === activeProjId)
            : null;

          const activeMemories = isMemoryEnabled()
            ? getMemories().map((m) => `${m.key}: ${m.value}`)
            : [];

          await runSmartAgentStream(
            userInput,
            updatedChat,
            mode,
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
                  id: assistantMessageId,
                  role: "bot",
                  text: fullReply,
                  loading: false,
                  status: "streaming",
                  error: false,
                  generationId,
                  sources:
                    capturedSources.length > 0 ? capturedSources : undefined,
                },
              ]);
            },
            abortRef.current.signal,
            {
              webSearchActive: webSearchEnabled,
              projectInstructions: activeProj?.instructions,
              memories: activeMemories,
              generationId,
              conversationId,
              userMessageId,
              assistantMessageId,
              hour,
              timezone,
              onToolStatus: (status) => setToolStatus(status),
              onSourcesFound: (sources) => {
                capturedSources = sources;
              },
            }
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
                  id: assistantMessageId,
                  role: "bot",
                  text: fullReply,
                  loading: false,
                  status: "cancelled",
                  error: false,
                  generationId,
                  sources:
                    capturedSources.length > 0 ? capturedSources : undefined,
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
            setToolStatus(null);
            currentGenerationIdRef.current = null;
            return;
          }
          throw streamError;
        } finally {
          setToolStatus(null);
        }

        setLoading(false);
        currentGenerationIdRef.current = null;

        if (responseChatIndexRef.current === currentChatIndex) {
          const botMessage: Message = {
            id: assistantMessageId,
            role: "bot",
            text: fullReply || "Unable to generate response",
            loading: false,
            status: fullReply ? "completed" : "failed",
            error: !fullReply,
            generationId,
            sources:
              capturedSources.length > 0 ? capturedSources : undefined,
          };
          const finalChat: Message[] = [...updatedChat, botMessage];
          const newMessages = finalChat.map((msg) => ({ ...msg }));

          if (currentChatIndex === viewedChatIndexRef.current) {
            setChat(finalChat);
          }

          if (currentChatIndex !== null) {
            touchChatSession(currentChatIndex, newMessages);
          }

          // Persist completed message to backend DB
          if (conversationId && assistantMessageId) {
            saveMessageToServer({
              id: assistantMessageId,
              conversationId,
              role: "bot",
              text: fullReply,
              status: fullReply ? "completed" : "failed",
              generationId,
              sources: capturedSources,
            });
          }

          // Auto-read response aloud if enabled in settings
          if (typeof window !== "undefined" && localStorage.getItem("zyrochat-pref-auto-read") === "true" && fullReply) {
            handleSpeak(fullReply, finalChat.length - 1);
          }
        }
      } catch (error: Error | unknown) {
        const err = error as { name?: string; message?: string };
        if (err?.name !== "AbortError" && !stoppedByUser) {
          console.error("Response error:", error);
          if (
            responseChatIndexRef.current === currentChatIndex &&
            currentChatIndex === viewedChatIndexRef.current
          ) {
            const rawMessage = err?.message || "";
            let userFriendlyError = "Failed to generate response. Please try again.";

            if (
              rawMessage.includes("Backend is not reachable") ||
              rawMessage.includes("Failed to fetch") ||
              rawMessage.includes("NetworkError") ||
              rawMessage.includes("Connection interrupted") ||
              rawMessage.toLowerCase().includes("network")
            ) {
              userFriendlyError =
                "Connection interrupted. Unable to reach the server. Please check your connection or ensure the backend is running, then click Retry.";
            } else if (rawMessage.includes("429")) {
              userFriendlyError =
                "Rate limit reached from AI provider. Please wait a few moments and retry.";
            } else if (rawMessage.includes("401")) {
              userFriendlyError =
                "Authentication failed. Please check your OpenRouter API key configuration in backend/.env.";
            } else if (rawMessage) {
              userFriendlyError = rawMessage;
            }

            const errorMessage: Message = {
              id: assistantMessageId,
              role: "bot",
              text: userFriendlyError,
              loading: false,
              status: "interrupted",
              error: true,
              generationId,
            };
            const errorChat = [...updatedChat, errorMessage];
            setChat(errorChat);
            if (currentChatIndex !== null) {
              touchChatSession(currentChatIndex, errorChat);
            }
            if (conversationId && assistantMessageId) {
              saveMessageToServer({
                id: assistantMessageId,
                conversationId,
                role: "bot",
                text: userFriendlyError,
                status: "interrupted",
                generationId,
              });
            }
          }
        }
        setLoading(false);
        currentGenerationIdRef.current = null;
      }
    },
    [mode, setChat, setChats, stoppedByUser, touchChatSession, webSearchEnabled]
  );

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

      const continuationPrompt =
        "Continue the response from where it was cut off. Do not repeat any previous text, start exactly with the next character/word, and continue seamlessly.";

      try {
        await runSmartAgentStream(
          continuationPrompt,
          chat,
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
    if (pendingEdit && !loading) {
      generateResponse(pendingEdit.text, chat, chatIndex, chats);
      setPendingEdit(null);
    }
  }, [pendingEdit, chat, loading, generateResponse, chatIndex, chats]);

  useEffect(() => {
    if (shouldRegenerate && !loading && chat.length > 0) {
      const lastUser = [...chat].reverse().find((m) => m.role === "user");
      if (lastUser) {
        generateResponse(lastUser.text, chat, chatIndex, chats);
      }
      setShouldRegenerate(false);
    }
  }, [shouldRegenerate, chat, loading, generateResponse, chatIndex, chats]);

  const handleStop = useCallback(() => {
    setStoppedByUser(true);
    if (currentGenerationIdRef.current) {
      cancelImageApi(currentGenerationIdRef.current).catch(() => {});
      const backendUrl = (
        (typeof import.meta !== "undefined" && import.meta.env?.VITE_BACKEND_URL) ||
        "http://localhost:5000"
      ).replace(/\/$/, "");
      fetch(`${backendUrl}/api/chat/generations/${encodeURIComponent(currentGenerationIdRef.current)}/cancel`, {
        method: "POST",
      }).catch(() => {});
    }
    if (abortRef.current) {
      abortRef.current.abort();
    }
    setLoading(false);
  }, []);

  const handleSendImage = useCallback(
    async (
      promptText: string,
      options?: { aspectRatio?: AspectRatioOption }
    ) => {
      if (loading || isSubmittingRef.current || interactionLocked) return;
      const cleanPrompt = promptText.trim();
      if (!cleanPrompt) return;

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setNetworkToast("You appear to be offline. Reconnect to generate images.");
        return;
      }

      isSubmittingRef.current = true;
      setLoading(true);
      setStoppedByUser(false);
      abortRef.current = new AbortController();

      const now = Date.now();
      const convId =
        chatIndex !== null && chats[chatIndex]
          ? chats[chatIndex].id || `conv-${chatIndex}`
          : `conv-${now}-${Math.random().toString(36).slice(2, 7)}`;
      const userMsgId = `msg-usr-${now}`;
      const botMsgId = `msg-bot-${now}`;
      const genId = `gen-img-${now}-${Math.random().toString(36).slice(2, 8)}`;
      const aspectRatio = options?.aspectRatio || "1:1";
      currentGenerationIdRef.current = genId;

      clearConversationDraft(convId);
      clearConversationDraft("new");

      const userMessage: Message = {
        id: userMsgId,
        role: "user",
        text: cleanPrompt,
        status: "completed",
        createdAt: now,
      };

      const initialImageGen: ImageGenerationInfo = {
        id: genId,
        prompt: cleanPrompt,
        aspectRatio,
        status: "generating",
      };

      const pendingBotMessage: Message = {
        id: botMsgId,
        role: "bot",
        text: "",
        loading: true,
        status: "generating" as any,
        generationId: genId,
        imageGeneration: initialImageGen,
        createdAt: now,
      };

      // Immediately save initial user and bot messages to server DB
      saveMessageToServer({
        id: userMsgId,
        conversationId: convId,
        role: "user",
        text: cleanPrompt,
        status: "completed",
      });

      saveMessageToServer({
        id: botMsgId,
        conversationId: convId,
        role: "bot",
        text: "",
        status: "generating",
        generationId: genId,
        imageGeneration: initialImageGen,
      });

      let currentChatIdx = chatIndex;
      if (chatIndex === null) {
        const title = `Image: ${cleanPrompt.slice(0, 24)}${cleanPrompt.length > 24 ? "..." : ""}`;
        const newChat: ChatSession = {
          id: convId,
          title,
          messages: [userMessage, pendingBotMessage],
          updatedAt: now,
        };
        const updatedChats = [...chats, newChat];
        currentChatIdx = updatedChats.length - 1;
        isNewChatRef.current = true;
        setChatIndex(currentChatIdx);
        setChats(updatedChats);
        saveChats(updatedChats);
        syncConversationToServer({ id: convId, title });
      } else {
        const updatedChat = [...chat, userMessage, pendingBotMessage];
        setChat(updatedChat);
        const updatedChats = chats.map((c: ChatSession, idx: number) =>
          idx === chatIndex
            ? { ...c, id: c.id || convId, messages: updatedChat, updatedAt: now }
            : c
        );
        setChats(updatedChats);
        saveChats(updatedChats);
      }

      try {
        const result = await generateImageApi(
          {
            prompt: cleanPrompt,
            aspectRatio,
            conversationId: convId,
            messageId: botMsgId,
            generationId: genId,
          },
          abortRef.current.signal
        );

        const completedImageGen: ImageGenerationInfo = {
          id: result.generationId || genId,
          prompt: result.prompt || cleanPrompt,
          aspectRatio: (result.aspectRatio as AspectRatioOption) || aspectRatio,
          status: "completed",
          imageUrl: result.imageUrl,
          width: result.width,
          height: result.height,
          revisedPrompt: result.revisedPrompt,
        };

        const completedBotMsg: Message = {
          ...pendingBotMessage,
          loading: false,
          status: "completed",
          imageGeneration: completedImageGen,
        };

        // Update server database record
        saveMessageToServer({
          id: botMsgId,
          conversationId: convId,
          role: "bot",
          text: "",
          status: "completed",
          generationId: genId,
          imageGeneration: completedImageGen,
        });

        // Update active chat and sessions
        setChat((prev) =>
          prev.map((msg) => (msg.id === botMsgId ? completedBotMsg : msg))
        );

        if (currentChatIdx !== null) {
          setChats((prev) => {
            const next = prev.map((c, idx) => {
              if (idx === currentChatIdx) {
                const nextMsgs = (c.messages || []).map((m) =>
                  m.id === botMsgId ? completedBotMsg : m
                );
                return { ...c, messages: nextMsgs, updatedAt: Date.now() };
              }
              return c;
            });
            saveChats(next);
            return next;
          });
        }
      } catch (err: any) {
        const isCancelled =
          stoppedByUser ||
          abortRef.current?.signal.aborted ||
          err?.name === "AbortError";

        if (isCancelled) {
          const cancelledImageGen: ImageGenerationInfo = {
            id: genId,
            prompt: cleanPrompt,
            aspectRatio,
            status: "cancelled",
            error: "Image generation cancelled by user",
          };

          const cancelledBotMsg: Message = {
            ...pendingBotMessage,
            loading: false,
            status: "cancelled",
            error: false,
            imageGeneration: cancelledImageGen,
          };

          saveMessageToServer({
            id: botMsgId,
            conversationId: convId,
            role: "bot",
            text: "",
            status: "cancelled",
            generationId: genId,
            imageGeneration: cancelledImageGen,
          });

          setChat((prev) =>
            prev.map((msg) => (msg.id === botMsgId ? cancelledBotMsg : msg))
          );

          if (currentChatIdx !== null) {
            setChats((prev) => {
              const next = prev.map((c, idx) => {
                if (idx === currentChatIdx) {
                  const nextMsgs = (c.messages || []).map((m) =>
                    m.id === botMsgId ? cancelledBotMsg : m
                  );
                  return { ...c, messages: nextMsgs, updatedAt: Date.now() };
                }
                return c;
              });
              saveChats(next);
              return next;
            });
          }
        } else {
          console.error("Image generation API error:", err);
          const failedImageGen: ImageGenerationInfo = {
            id: genId,
            prompt: cleanPrompt,
            aspectRatio,
            status: "failed",
            error: err?.message || "Image generation failed. Please try again.",
          };

          const failedBotMsg: Message = {
            ...pendingBotMessage,
            loading: false,
            status: "failed",
            error: true,
            imageGeneration: failedImageGen,
          };

          saveMessageToServer({
            id: botMsgId,
            conversationId: convId,
            role: "bot",
            text: "",
            status: "failed",
            generationId: genId,
            imageGeneration: failedImageGen,
          });

          setChat((prev) =>
            prev.map((msg) => (msg.id === botMsgId ? failedBotMsg : msg))
          );

          if (currentChatIdx !== null) {
            setChats((prev) => {
              const next = prev.map((c, idx) => {
                if (idx === currentChatIdx) {
                  const nextMsgs = (c.messages || []).map((m) =>
                    m.id === botMsgId ? failedBotMsg : m
                  );
                  return { ...c, messages: nextMsgs, updatedAt: Date.now() };
                }
                return c;
              });
              saveChats(next);
              return next;
            });
          }
        }
      } finally {
        currentGenerationIdRef.current = null;
        setLoading(false);
        isSubmittingRef.current = false;
      }
    },
    [
      loading,
      interactionLocked,
      chatIndex,
      chats,
      chat,
      setChat,
      setChatIndex,
      setChats,
      stoppedByUser,
    ]
  );

  const handleSend = useCallback(
    async (
      overrideInput?: string,
      overrideFiles?: Attachment[],
      overrideHour?: string | null,
      overrideTimezone?: string
    ) => {
      // Prevent duplicate sends on rapid clicks
      if (loading || isSubmittingRef.current || interactionLocked) return;
      const textToSend = typeof overrideInput === "string" ? overrideInput : input;
      const filesToSend = overrideFiles || [];
      if (!textToSend.trim() && filesToSend.length === 0) return;

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setNetworkToast("You appear to be offline. Reconnect to send.");
        return;
      }

      const userInput = textToSend;

      // 1. Manual Image Mode Override
      if (mode === "image") {
        setInput("");
        handleSendImage(userInput);
        return;
      }

      // Explicit /image command
      if (/^\/image\b/i.test(userInput.trim())) {
        const cleanImgPrompt = userInput.trim().replace(/^\/image\s*/i, "");
        setInput("");
        handleSendImage(cleanImgPrompt);
        return;
      }

      // 2. Smart Auto Mode Intent Routing (also active in chat mode for natural queries)
      if (mode === "auto" || mode === "chat") {
        const intentResult = classifyIntent(userInput, chat, filesToSend);
        if (intentResult.intent === "IMAGE_GENERATION") {
          setInput("");
          handleSendImage(intentResult.extractedPrompt, {
            aspectRatio: intentResult.aspectRatio,
          });
          return;
        }
      }

      isSubmittingRef.current = true;
      try {
        setInput("");

        const now = Date.now();
        const convId =
          chatIndex !== null && chats[chatIndex]
            ? chats[chatIndex].id || `conv-${chatIndex}`
            : `conv-${now}-${Math.random().toString(36).slice(2, 7)}`;
        const userMsgId = `msg-usr-${now}`;
        const botMsgId = `msg-bot-${now}`;
        const genId = `gen-${now}-${Math.random().toString(36).slice(2, 8)}`;

        clearConversationDraft(convId);
        clearConversationDraft("new");

        const userMessage: Message = {
          id: userMsgId,
          role: "user",
          text: userInput,
          attachments: filesToSend,
          status: "completed",
          createdAt: now,
          hour: overrideHour || undefined,
          timezone: overrideTimezone || undefined,
        };

        const pendingBotMessage: Message = {
          id: botMsgId,
          role: "bot",
          text: "",
          loading: true,
          status: "streaming",
          generationId: genId,
          createdAt: now,
        };

        // Immediately persist user & pending bot message to backend DB before network streaming begins
        saveMessageToServer({
          id: userMsgId,
          conversationId: convId,
          role: "user",
          text: userInput,
          status: "completed",
          attachments: filesToSend,
          hour: overrideHour || undefined,
          timezone: overrideTimezone || undefined,
        });

        saveMessageToServer({
          id: botMsgId,
          conversationId: convId,
          role: "bot",
          text: "",
          status: "streaming",
          generationId: genId,
        });

        if (chatIndex === null) {
          const newChat: ChatSession = {
            id: convId,
            title: "New Chat",
            messages: [userMessage, pendingBotMessage],
            updatedAt: now,
          };
          const updatedChats = [...chats, newChat];
          const newIndex = updatedChats.length - 1;

          isNewChatRef.current = true;
          setChatIndex(newIndex);
          setChats(updatedChats);
          saveChats(updatedChats);
          syncConversationToServer({ id: convId, title: "New Chat" });

          generateChatTitle(userInput)
            .then((title) => {
              setChats((prevChats: ChatSession[]) => {
                const updated = prevChats.map((c: ChatSession, idx: number) =>
                  idx === newIndex ? { ...c, title, updatedAt: Date.now() } : c
                );
                saveChats(updated);
                syncConversationToServer({ id: convId, title });
                return updated;
              });
            })
            .catch(() => {});

          await generateResponse(
            userInput,
            [userMessage],
            newIndex,
            updatedChats,
            genId,
            userMsgId,
            botMsgId,
            convId,
            overrideHour || undefined,
            overrideTimezone || undefined
          );
        } else {
          const updatedChat = [...chat, userMessage, pendingBotMessage];
          setChat(updatedChat);
          const updatedChats = chats.map((c: ChatSession, idx: number) =>
            idx === chatIndex
              ? { ...c, id: c.id || convId, messages: updatedChat, updatedAt: now }
              : c
          );
          setChats(updatedChats);
          saveChats(updatedChats);

          await generateResponse(
            userInput,
            [...chat, userMessage],
            chatIndex,
            updatedChats,
            genId,
            userMsgId,
            botMsgId,
            convId,
            overrideHour || undefined,
            overrideTimezone || undefined
          );
        }
      } finally {
        isSubmittingRef.current = false;
      }
    },
    [
      input,
      loading,
      interactionLocked,
      mode,
      handleSendImage,
      chat,
      generateResponse,
      chatIndex,
      chats,
      setChat,
      setChatIndex,
      setChats,
    ]
  );

  const handleRegenerateImage = useCallback(
    (prompt: string, aspectRatio?: AspectRatioOption) => {
      handleSendImage(prompt, { aspectRatio });
    },
    [handleSendImage]
  );

  const toggleTheme = useCallback(() => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("app-theme", nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
  }, [theme]);

  const isEmptyChat = chat.length === 0;
  const totalMessages = chat.length;
  const botMessages = chat.filter((msg) => msg.role === "bot").length;
  const userMessages = chat.filter((msg) => msg.role === "user").length;

  const scrollToBottom = useCallback(() => {
    userScrolledRef.current = false;
    setHasNewBelow(false);
    setShowScrollDown(false);
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col bg-[#f8fafc] dark:bg-[#090a0f] overflow-hidden">
      {/* Network Status Toast */}
      <AnimatePresence>
        {networkToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-14 left-1/2 -translate-x-1/2 z-toast flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-lg backdrop-blur-md border ${
              isOnline
                ? "bg-emerald-950/90 text-emerald-300 border-emerald-500/30"
                : "bg-amber-950/90 text-amber-300 border-amber-500/30"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                isOnline ? "bg-emerald-400" : "bg-amber-400 animate-pulse"
              }`}
            />
            <span>{networkToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. MAIN HEADER */}
      <header className="sticky top-0 z-header flex items-center justify-between border-b border-slate-200/80 bg-white/95 px-3 py-2 backdrop-blur-md dark:border-slate-800/80 dark:bg-[#090a0f]/95 sm:px-6">
        {/* Left Side: Mobile Menu + Brand + Title + LIVE */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <button
            onClick={() => setSidebarOpen && setSidebarOpen(true)}
            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white sm:hidden"
            title="Toggle sidebar"
            aria-label="Toggle sidebar"
          >
            <Menu size={18} />
          </button>

          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-400">
              ZyroChat
            </span>
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="truncate text-xs font-semibold text-slate-900 dark:text-white sm:text-sm">
                {chatIndex !== null && chats[chatIndex]
                  ? chats[chatIndex].title
                  : "New Conversation"}
              </h1>
              <span className="hidden items-center gap-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[9px] font-semibold tracking-wider text-cyan-700 dark:text-cyan-300 sm:inline-flex uppercase">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                Live
              </span>
            </div>
            {chatIndex !== null && chats[chatIndex]?.parentTitle && (
              <button
                type="button"
                onClick={() => {
                  const targetId = chats[chatIndex].parentConversationId;
                  const targetTitle = chats[chatIndex].parentTitle;
                  const pIdx = chats.findIndex(
                    (c) => (c.id && c.id === targetId) || c.title === targetTitle
                  );
                  if (pIdx !== -1) {
                    setChat(chats[pIdx].messages);
                    setChatIndex(pIdx);
                  }
                }}
                className="flex items-center gap-1 text-[10px] text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer truncate max-w-xs text-left"
                title={`Jump to parent conversation: ${chats[chatIndex].parentTitle}`}
              >
                <GitBranch size={10} className="shrink-0" />
                <span className="truncate">Branched from: {chats[chatIndex].parentTitle}</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Side: [Workspace Panel] [AI Mode ▼] [Export] [Theme] */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Workspace Panel Toggle */}
          <button
            type="button"
            onClick={() => setWorkspaceOpen(!workspaceOpen)}
            className={`flex h-8 items-center gap-1.5 rounded-xl border px-2.5 text-xs font-medium transition cursor-pointer ${
              workspaceOpen
                ? "border-cyan-500/60 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.2)]"
                : "border-slate-200/80 bg-white text-slate-600 shadow-sm hover:border-slate-300 dark:border-slate-800 dark:bg-[#12151e] dark:text-slate-300 dark:hover:border-slate-700"
            }`}
            title={workspaceOpen ? "Close Workspace panel" : "Open side-by-side Workspace"}
          >
            {workspaceOpen ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
            <span className="hidden md:inline">Workspace</span>
          </button>

          <ModeSelector mode={mode} setMode={setMode} dropDirection="down" align="right" compactOnMobile={true} />

          {!isEmptyChat && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setExportMenuOpen(!exportMenuOpen)}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 dark:border-slate-800 dark:bg-[#12151e] dark:text-slate-300 dark:hover:border-slate-700 dark:hover:text-white cursor-pointer"
                title="Export conversation"
                aria-label="Export conversation"
              >
                <Download size={14} />
              </button>
              <AnimatePresence>
                {exportMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -6 }}
                    transition={{ duration: 0.12 }}
                    className="absolute right-0 z-dropdown mt-1.5 w-44 origin-top-right overflow-hidden rounded-2xl border border-slate-200 bg-white p-1 shadow-xl backdrop-blur dark:border-slate-800 dark:bg-[#12151e]"
                    onMouseLeave={() => setExportMenuOpen(false)}
                  >
                    <button
                      onClick={() => {
                        exportChatAsMarkdown();
                        setExportMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/80 cursor-pointer"
                    >
                      Markdown (.md)
                    </button>
                    <button
                      onClick={() => {
                        exportChatAsTXT();
                        setExportMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/80 cursor-pointer"
                    >
                      Plain Text (.txt)
                    </button>
                    <button
                      onClick={() => {
                        exportChatAsPDF();
                        setExportMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/80 cursor-pointer"
                    >
                      PDF Transcript (.pdf)
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 dark:border-slate-800 dark:bg-[#12151e] dark:text-slate-300 dark:hover:border-slate-700 dark:hover:text-white cursor-pointer"
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </div>
      </header>

      {/* 3. CONVERSATION INFORMATION: Subtle compact metadata strip */}
      {!isEmptyChat && (
        <div className="border-b border-slate-200/50 bg-slate-50/40 px-4 py-1.5 text-[11px] text-slate-400 dark:border-slate-800/50 dark:bg-[#0c0e14]/40 dark:text-slate-500 select-none">
          <div className="mx-auto flex max-w-3xl xl:max-w-4xl items-center gap-2">
            <span className="capitalize font-medium text-slate-700 dark:text-slate-300">
              {mode} mode
            </span>
            <span>•</span>
            <span>{totalMessages} messages</span>
            <span className="hidden xs:inline">•</span>
            <span className="hidden xs:inline">{userMessages} prompts</span>
            <span className="hidden xs:inline">•</span>
            <span className="hidden xs:inline">{botMessages} replies</span>
          </div>
        </div>
      )}

      {/* Workspace & Chat Side-by-Side Flex Container */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Primary Chat Column */}
        <div className="relative flex flex-1 flex-col overflow-hidden">
          {/* 4. CHAT AREA & MESSAGES */}
          <div
            ref={containerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto scroll-smooth px-3 py-3 sm:px-6 sm:py-4"
          >
        <div className="mx-auto flex w-full max-w-3xl xl:max-w-4xl flex-col pb-3 sm:pb-4">
          {isEmptyChat ? (
            /* 10. EMPTY CHAT SCREEN */
            <div className="relative flex flex-col items-center justify-center py-8 sm:py-12 md:py-16 text-center px-4 max-w-2xl mx-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="relative mb-5 flex items-center justify-center"
              >
                <AntigravityLogo size={52} glow />
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08, duration: 0.3 }}
                className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white"
              >
                How can I help you today?
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.14, duration: 0.3 }}
                className="mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-lg leading-relaxed text-center"
              >
                Ask questions, create content, analyze information, write code, or explore ideas.
              </motion.p>

              {/* 6 Suggestion Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-8 w-full">
                {[
                  {
                    title: "Explain something",
                    prompt: "Explain quantum computing and its real-world applications in simple terms",
                    desc: "Break down complex concepts into intuitive analogies.",
                    icon: Brain,
                  },
                  {
                    title: "Help me write",
                    prompt: "Write a polished executive announcement for a new product launch",
                    desc: "Draft high-converting copy, essays, emails, and proposals.",
                    icon: Edit2,
                  },
                  {
                    title: "Write code",
                    prompt: "Write a clean TypeScript utility to validate and format timestamps",
                    desc: "Generate modular snippets, review bugs, or design systems.",
                    icon: Code2,
                  },
                  {
                    title: "Analyze a file",
                    prompt: "What key metrics, trends, and outliers should I look for in a business report?",
                    desc: "Synthesize document contents, datasets, and structured reports.",
                    icon: FileText,
                  },
                  {
                    title: "Create a business plan",
                    prompt: "Draft a comprehensive go-to-market strategy and revenue model for a SaaS startup",
                    desc: "Outline value propositions, customer acquisition, and pricing.",
                    icon: Sparkles,
                  },
                  {
                    title: "Research a topic",
                    prompt: "Research the latest breakthroughs and commercial state of solid-state battery technology",
                    desc: "Explore multi-source factual overviews and industry trends.",
                    icon: Search,
                  },
                ].map((card) => {
                  const Icon = card.icon;
                  return (
                    <button
                      key={card.title}
                      type="button"
                      onClick={() => handleSend(card.prompt)}
                      className="flex flex-col items-start text-left p-3.5 rounded-xl border border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800/80 dark:bg-[#12151e]/60 dark:hover:border-slate-700 dark:hover:bg-[#151924] transition-colors cursor-pointer group"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-[#1a1e2b] text-cyan-600 dark:text-cyan-400 mb-2 group-hover:scale-105 transition-transform">
                        <Icon size={14} />
                      </div>
                      <h2 className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-slate-950 dark:group-hover:text-white">
                        {card.title}
                      </h2>
                      <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500 leading-normal">
                        {card.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4 sm:gap-5">
              <AnimatePresence initial={false}>
                {chat.map((msg: Message, idx: number) => {
                  const isEditing = editingIndex === idx;
                  const isUser = msg.role === "user";
                  const hasImageGen = Boolean(msg.imageGeneration);

                  return (
                    <motion.div
                      key={idx}
                      id={`msg-container-${idx}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0, overflow: "hidden" }}
                      transition={{ duration: 0.18 }}
                      className={`flex w-full transition-all duration-300 ${
                        highlightedMsgIdx === idx
                          ? "ring-2 ring-cyan-500/80 rounded-2xl p-1 bg-cyan-500/10 shadow-[0_0_15px_rgba(6,182,212,0.25)]"
                          : ""
                      } ${hasImageGen ? "justify-center" : isUser ? "justify-end" : "justify-start"}`}
                    >
                      <ChatErrorBoundary fallbackText="Message could not be rendered properly.">
                        {/* Message Body Container */}
                        <div
                          className={`flex flex-col gap-1 min-w-0 ${
                            hasImageGen
                              ? "w-full max-w-full items-center"
                              : isUser
                              ? "items-end max-w-[95%] sm:max-w-[85%] md:max-w-[80%]"
                              : "items-start w-full max-w-[95%] sm:max-w-[85%] md:max-w-[80%]"
                          }`}
                        >
                        {/* Speaker Label & Avatar header */}
                        <div className={`flex items-center gap-1.5 px-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 ${hasImageGen ? "self-center justify-center mb-0.5" : ""}`}>
                          {isUser ? (
                            <>
                              <span>You</span>
                              <UserAvatar />
                            </>
                          ) : (
                            <>
                              <AntigravityLogo size={16} />
                              <span className="text-cyan-600 dark:text-cyan-400">
                                ZyroChat
                              </span>
                            </>
                          )}
                        </div>

                        {/* Content Area */}
                        {isEditing ? (
                          <div className="w-full min-w-[280px] sm:min-w-[340px] space-y-2 mt-1">
                            <textarea
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              placeholder="Edit your message..."
                              className="w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-900 outline-none transition focus:border-cyan-500 dark:border-slate-700 dark:bg-[#12151e] dark:text-white"
                              rows={3}
                            />
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={handleSaveEdit}
                                className="flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 cursor-pointer"
                              >
                                <Check size={13} /> Save
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingIndex(null);
                                  setEditText("");
                                }}
                                className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                              >
                                <X size={13} /> Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div
                            className={`group relative ${
                              hasImageGen
                                ? "w-full flex flex-col items-center justify-center text-left py-0 px-0 text-slate-900 dark:text-slate-100"
                                : isUser
                                ? "rounded-2xl rounded-tr-sm bg-slate-100/90 border border-slate-200/80 px-4 py-2.5 text-xs text-slate-900 dark:bg-[#161a26] dark:border-slate-800 dark:text-slate-100"
                                : "w-full text-left py-0.5 px-0.5 text-slate-900 dark:text-slate-100"
                            }`}
                          >
                            {msg.imageGeneration ? (
                              <div className="w-full flex flex-col items-center justify-center">
                                <div className="not-prose w-full flex justify-center">
                                  <GeneratedImageViewer
                                    imageGeneration={msg.imageGeneration}
                                    onRegenerate={handleRegenerateImage}
                                    onEditPrompt={(prompt) => {
                                      setExternalPromptToEdit(prompt);
                                    }}
                                    onCancel={handleStop}
                                  />
                                </div>
                                {msg.text && msg.text.trim() && (
                                  <div className="prose max-w-none dark:prose-invert text-[14px] leading-relaxed mt-2 text-center">
                                    <MarkdownRenderer
                                      text={msg.text}
                                      isStreaming={idx === chat.length - 1 && loading}
                                    />
                                  </div>
                                )}
                              </div>
                            ) : msg.loading ? (
                              <div className="space-y-2 py-2">
                                {toolStatus && (
                                  <div className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-600 dark:text-cyan-400 animate-pulse">
                                    <Globe size={13} className="animate-spin [animation-duration:6s]" />
                                    <span>{toolStatus.label}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-2">
                                  <span className="h-2 w-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:-0.3s]" />
                                  <span className="h-2 w-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:-0.15s]" />
                                  <span className="h-2 w-2 rounded-full bg-cyan-400 animate-bounce" />
                                  <span className="text-[11px] font-medium tracking-wider text-cyan-600 dark:text-cyan-400 uppercase ml-1">
                                    {toolStatus ? "Working on response..." : "Thinking..."}
                                  </span>
                                </div>
                              </div>
                            ) : msg.error || msg.status === "interrupted" || msg.status === "failed" ? (
                              <div className="space-y-2.5 max-w-2xl">
                                {msg.text && msg.text !== "Response interrupted." && msg.text !== "Unable to generate response" && (
                                  <div className="prose max-w-none dark:prose-invert text-[14px] leading-relaxed opacity-95">
                                    <MarkdownRenderer
                                      text={msg.text}
                                      isStreaming={false}
                                    />
                                  </div>
                                )}
                                <div className="space-y-2 py-2 px-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 dark:border-amber-500/20 dark:bg-amber-950/20 max-w-lg">
                                  <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300 font-medium">
                                    <AlertTriangle size={15} className="shrink-0 mt-0.5 text-amber-500" />
                                    <span>
                                      {msg.status === "interrupted"
                                        ? "Response interrupted. Click Retry to continue."
                                        : msg.text || "Unable to generate response."}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 pl-6">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const chatWithoutError = chat.filter((_, i) => i !== idx);
                                        setChat(chatWithoutError);
                                        const lastUserMsg = [...chatWithoutError].reverse().find((m) => m.role === "user");
                                        if (lastUserMsg) {
                                          generateResponse(lastUserMsg.text, chatWithoutError, chatIndex, chats);
                                        }
                                      }}
                                      className="flex items-center gap-1.5 rounded-lg border border-amber-400/40 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-50 dark:border-amber-700/50 dark:bg-[#1a1715] dark:text-amber-200 dark:hover:bg-amber-950/40 cursor-pointer shadow-xs transition-colors"
                                    >
                                      <RotateCcw size={12} />
                                      <span>Retry</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div>
                                {msg.role === "bot" ? (
                                  /* Clean document-style response area */
                                  <div className="prose max-w-none dark:prose-invert text-[14px] leading-relaxed">
                                    {/* Generated AI Image Bubble */}
                                    {msg.imageGeneration && (
                                      <div className="not-prose w-full flex justify-center mb-1">
                                        <GeneratedImageViewer
                                          imageGeneration={msg.imageGeneration}
                                          onRegenerate={handleRegenerateImage}
                                          onEditPrompt={(prompt) => {
                                            setExternalPromptToEdit(prompt);
                                          }}
                                          onCancel={handleStop}
                                        />
                                      </div>
                                    )}

                                    {msg.text && (
                                      <MarkdownRenderer
                                        text={msg.text}
                                        isStreaming={idx === chat.length - 1 && loading}
                                      />
                                    )}

                                    {/* Web Search Sources Cards */}
                                    {msg.sources && msg.sources.length > 0 && (
                                      <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 not-prose">
                                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-cyan-600 dark:text-cyan-400 mb-2">
                                          <Globe size={13} />
                                          <span>Sources ({msg.sources.length})</span>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                          {msg.sources.map((src, sIdx) => (
                                            <a
                                              key={sIdx}
                                              href={src.url}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="flex items-start gap-2.5 p-2 rounded-xl border border-slate-200/80 bg-white hover:border-cyan-500/50 hover:shadow-sm dark:border-slate-800 dark:bg-[#11141e] dark:hover:border-cyan-500/40 transition group"
                                            >
                                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-[10px] font-bold">
                                                {sIdx + 1}
                                              </span>
                                              <div className="min-w-0 flex-1">
                                                <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate group-hover:text-cyan-500">
                                                  {src.title}
                                                </p>
                                                <span className="text-[10px] text-slate-400 truncate block">
                                                  {src.source || src.url}
                                                </span>
                                              </div>
                                              <ExternalLink size={12} className="text-slate-400 group-hover:text-cyan-500 shrink-0 mt-0.5" />
                                            </a>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <>
                                    <p className="whitespace-pre-wrap text-xs leading-relaxed break-words">
                                      {msg.text}
                                    </p>
                                    {msg.hour && (
                                      <div className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-medium text-cyan-700 dark:text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-md w-fit border border-cyan-500/20 select-none">
                                        <Clock size={11} className="shrink-0 text-cyan-600 dark:text-cyan-400" />
                                        <span>Target: {formatHourDisplay(msg.hour)}</span>
                                        {msg.timezone && (
                                          <span className="text-[10px] text-cyan-600/70 dark:text-cyan-400/70">
                                            ({msg.timezone})
                                          </span>
                                        )}
                                      </div>
                                    )}
                                    {msg.attachments && msg.attachments.length > 0 && (
                                      <div className="flex flex-wrap gap-2 mt-2 select-none">
                                        {msg.attachments.map((file, i) => {
                                          const isImg = file.type?.startsWith("image/");
                                          return (
                                            <div
                                              key={i}
                                              className="overflow-hidden rounded-xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-[#12151e]"
                                            >
                                              {isImg && file.url ? (
                                                <a
                                                  href={file.url}
                                                  target="_blank"
                                                  rel="noreferrer"
                                                  className="block max-w-[200px]"
                                                >
                                                  <img
                                                    src={file.url}
                                                    alt={file.name}
                                                    className="max-h-24 max-w-full object-cover"
                                                  />
                                                </a>
                                              ) : (
                                                <div className="flex items-center gap-2 p-2 text-xs text-slate-700 dark:text-slate-300">
                                                  <FileText size={13} className="text-slate-400" />
                                                  <div className="flex flex-col min-w-0">
                                                    <span className="font-semibold truncate max-w-28 text-slate-800 dark:text-slate-200">
                                                      {file.name}
                                                    </span>
                                                    <span className="text-[9px] text-slate-400">
                                                      {(file.size / 1024).toFixed(1)} KB
                                                    </span>
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            )}

                            {/* 8. MESSAGE ACTIONS: Subtly displayed controls */}
                            {!msg.loading && (
                              <div
                                className={`mt-1 flex items-center gap-1 pt-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity ${
                                  hasImageGen ? "justify-center" : isUser ? "justify-end" : "justify-start"
                                }`}
                              >
                                {isUser ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleEditMessage(idx)}
                                      className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition cursor-pointer"
                                      title="Edit prompt"
                                      aria-label="Edit prompt"
                                    >
                                      <Edit2 size={12} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleCopyMessage(msg.text)}
                                      className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition cursor-pointer"
                                      title="Copy prompt"
                                      aria-label="Copy prompt"
                                    >
                                      <Copy size={12} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleSend(msg.text, msg.attachments)}
                                      className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition cursor-pointer"
                                      title="Resend prompt"
                                      aria-label="Resend prompt"
                                    >
                                      <RotateCcw size={12} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleBranchConversation(idx)}
                                      className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-cyan-600 dark:hover:bg-slate-800 dark:hover:text-cyan-400 transition cursor-pointer"
                                      title="Branch conversation from here"
                                      aria-label="Branch conversation from here"
                                    >
                                      <GitBranch size={12} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteMessage(idx)}
                                      className="rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400 transition cursor-pointer"
                                      title="Delete message"
                                      aria-label="Delete message"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleCopyMessage(msg.text)}
                                      className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition cursor-pointer"
                                      title="Copy response"
                                      aria-label="Copy response"
                                    >
                                      <Copy size={13} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleSpeak(msg.text, idx)}
                                      className={`inline-flex items-center gap-1 rounded-lg px-1.5 py-1 text-xs transition cursor-pointer ${
                                        speakingIdx === idx
                                          ? "text-cyan-500 bg-cyan-500/10 font-medium"
                                          : "text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                                      }`}
                                      title={speakingIdx === idx ? "Stop speaking" : "Read aloud"}
                                      aria-label="Read aloud"
                                    >
                                      {speakingIdx === idx ? (
                                        <>
                                          <div className="flex items-end gap-0.5 h-3 w-3">
                                            <span className="w-0.5 bg-cyan-500 animate-pulse h-full" />
                                            <span className="w-0.5 bg-cyan-500 animate-pulse h-2/3" />
                                            <span className="w-0.5 bg-cyan-500 animate-pulse h-4/5" />
                                          </div>
                                          <span className="text-[10px] hidden sm:inline font-medium">Playing</span>
                                          <VolumeX size={12} className="ml-0.5" />
                                        </>
                                      ) : (
                                        <Volume2 size={13} />
                                      )}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleBranchConversation(idx)}
                                      className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-cyan-600 dark:hover:bg-slate-800 dark:hover:text-cyan-400 transition cursor-pointer"
                                      title="Branch conversation from here"
                                      aria-label="Branch conversation from here"
                                    >
                                      <GitBranch size={13} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleLikeMessage(idx)}
                                      className={`rounded-lg p-1 transition cursor-pointer ${
                                        msg.liked
                                          ? "text-cyan-600 dark:text-cyan-400 bg-cyan-500/10"
                                          : "text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                                      }`}
                                      title="Helpful"
                                      aria-label="Helpful"
                                    >
                                      <ThumbsUp size={13} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDislikeMessage(idx)}
                                      className={`rounded-lg p-1 transition cursor-pointer ${
                                        msg.disliked
                                          ? "text-red-500 bg-red-500/10"
                                          : "text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                                      }`}
                                      title="Not helpful"
                                      aria-label="Not helpful"
                                    >
                                      <ThumbsDown size={13} />
                                    </button>

                                    {idx === chat.length - 1 && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={handleRegenerate}
                                          disabled={loading}
                                          className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 disabled:opacity-40 transition cursor-pointer"
                                          title="Regenerate"
                                          aria-label="Regenerate"
                                        >
                                          <RotateCcw size={13} />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={handleContinue}
                                          disabled={loading}
                                          className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 disabled:opacity-40 transition cursor-pointer"
                                          title="Continue generating"
                                          aria-label="Continue generating"
                                        >
                                          <Play size={12} />
                                        </button>
                                      </>
                                    )}

                                    <button
                                      type="button"
                                      onClick={() => handleShareMessage(msg.text)}
                                      className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition cursor-pointer"
                                      title="Share"
                                      aria-label="Share"
                                    >
                                      <Share2 size={13} />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleDeleteMessage(idx)}
                                      className="rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400 transition cursor-pointer"
                                      title="Delete"
                                      aria-label="Delete"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </ChatErrorBoundary>
                  </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

        {/* 6. CHAT INPUT: Floating Message Composer with Mode & Tools and Docked Floating Controls */}
        <ChatInput
          input={input}
          setInput={setInput}
          onSend={handleSend}
          onStop={handleStop}
          loading={loading}
          interactionLocked={interactionLocked}
          webSearchEnabled={webSearchEnabled}
          setWebSearchEnabled={setWebSearchEnabled}
          mode={mode}
          setMode={setMode}
          onSendImage={handleSendImage}
          externalPromptToEdit={externalPromptToEdit}
          onClearExternalPrompt={() => setExternalPromptToEdit(null)}
          showScrollDown={showScrollDown}
          onScrollToBottom={scrollToBottom}
          hasNewBelow={hasNewBelow}
        />
      </div>

      {/* Side-by-Side Workspace Panel */}
      {workspaceOpen && (
        <WorkspacePanel
          artifact={activeArtifact}
          onClose={() => setWorkspaceOpen(false)}
          onUpdateArtifact={(updated) => setActiveArtifact(updated)}
          isMobile={typeof window !== "undefined" && window.innerWidth < 768}
        />
      )}

      {/* Response Feedback Dialog Modal */}
      <AnimatePresence>
        {feedbackModalOpen &&
          typeof document !== "undefined" &&
          createPortal(
            <div
              className="fixed inset-0 z-modal flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
              onClick={() => setFeedbackModalOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-[#12151e]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <ThumbsDown size={14} className="text-red-500" />
                    <span>Provide Response Feedback</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setFeedbackModalOpen(false)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <X size={15} />
                  </button>
                </div>

                {feedbackSent ? (
                  <div className="py-6 text-center text-xs text-cyan-600 dark:text-cyan-400 font-medium">
                    Thank you! Your feedback helps calibrate response quality.
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      What was wrong with this response?
                    </p>
                    <div className="space-y-1.5">
                      {[
                        { id: "inaccurate", label: "Factually inaccurate / Hallucination" },
                        { id: "instructions_missed", label: "Did not follow prompt instructions" },
                        { id: "too_verbose", label: "Too long / Too verbose" },
                        { id: "bad_formatting", label: "Syntax or code formatting issue" },
                        { id: "other", label: "Other problem" },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setFeedbackCategory(opt.id)}
                          className={`w-full rounded-lg border p-2 text-left text-xs transition cursor-pointer ${
                            feedbackCategory === opt.id
                              ? "border-cyan-500 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-medium"
                              : "border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>

                    <textarea
                      rows={2}
                      placeholder="Optional details or desired correction..."
                      value={feedbackComment}
                      onChange={(e) => setFeedbackComment(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-transparent p-2 text-xs text-slate-800 outline-none focus:border-cyan-500 dark:border-slate-800 dark:text-slate-200 resize-none"
                    />

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setFeedbackModalOpen(false)}
                        className="rounded-lg px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSubmitFeedback}
                        className="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-500 cursor-pointer"
                      >
                        Submit Feedback
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>,
            document.body
          )}
      </AnimatePresence>
    </div>
    </div>
  );
}
