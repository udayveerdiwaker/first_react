import { useMemo, useState, useEffect } from "react";
import DeleteModal from "./DeleteModal";
import SettingsModal from "./SettingsModal";
import ShareModal from "./ShareModal";
import PromptLibraryModal from "./PromptLibraryModal";
import AntigravityLogo from "./AntigravityLogo";
import ResearchPanelModal from "./ResearchPanelModal";
import KnowledgeBaseModal from "./KnowledgeBaseModal";
import WorkflowBuilderModal from "./WorkflowBuilderModal";
import ConnectorsModal from "./ConnectorsModal";
import AdminDashboardModal from "./AdminDashboardModal";
import {
  Trash2,
  X,
  Plus,
  MessageSquare,
  MoreVertical,
  Edit2,
  Copy,
  Search,
  Pin,
  Settings as SettingsIcon,
  Check,
  Share2,
  BookOpen,
  Folder,
  FolderPlus,
  ChevronDown,
  Sparkles,
  Database,
  Network,
  Link2,
  Shield,
} from "lucide-react";
import { saveChats, clearAllConversationsFromServer, clearConversationDraft } from "../store/chatStore";
import {
  getProjects,
  saveProjects,
  getActiveProjectId,
  setActiveProjectId,
} from "../store/workspaceStore";
import type { Project } from "../agent/types";
import { motion, AnimatePresence } from "framer-motion";

interface SidebarProps {
  chats: any[];
  setChats: (chats: any[]) => void;
  setChat: (messages: any[]) => void;
  setChatIndex: (index: number | null) => void;
  chatIndex: number | null;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  interactionLocked: boolean;
}

export default function Sidebar({
  chats,
  setChats,
  setChat,
  setChatIndex,
  chatIndex,
  sidebarOpen,
  setSidebarOpen,
  interactionLocked,
}: SidebarProps) {
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [shareIndex, setShareIndex] = useState<number | null>(null);
  const [menuIndex, setMenuIndex] = useState<number | null>(null);
  const [renameIndex, setRenameIndex] = useState<number | null>(null);
  const [renameText, setRenameText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [promptLibraryOpen, setPromptLibraryOpen] = useState(false);
  const [researchOpen, setResearchOpen] = useState(false);
  const [knowledgeOpen, setKnowledgeOpen] = useState(false);
  const [workflowOpen, setWorkflowOpen] = useState(false);
  const [connectorsOpen, setConnectorsOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);

  // Projects State
  const [projects, setProjects] = useState<Project[]>(() => getProjects());
  const [activeProjId, setActiveProjId] = useState<string | null>(() => getActiveProjectId());
  const [showProjectsMenu, setShowProjectsMenu] = useState(false);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjName, setNewProjName] = useState("");
  const [newProjInstructions, setNewProjInstructions] = useState("");

  // Update active project
  const handleSelectProject = (id: string | null) => {
    setActiveProjId(id);
    setActiveProjectId(id);
    setShowProjectsMenu(false);
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName.trim()) return;

    const newProj: Project = {
      id: "proj-" + Date.now(),
      name: newProjName.trim(),
      description: "",
      instructions: newProjInstructions.trim() || "",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const updated = [...projects, newProj];
    setProjects(updated);
    saveProjects(updated);
    setActiveProjId(newProj.id);
    setActiveProjectId(newProj.id);
    setNewProjName("");
    setNewProjInstructions("");
    setIsCreatingProject(false);
  };

  const handleDeleteProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = projects.filter((p) => p.id !== id);
    setProjects(updated);
    saveProjects(updated);
    if (activeProjId === id) {
      setActiveProjId(null);
      setActiveProjectId(null);
    }
  };

  const currentProject = useMemo(() => {
    return projects.find((p) => p.id === activeProjId);
  }, [projects, activeProjId]);

  // Rename a chat title
  const handleRenameChat = (index: number, newTitle: string) => {
    if (!newTitle.trim()) return;

    const updated = chats.map((c: any, i: number) =>
      i === index ? { ...c, title: newTitle.trim(), updatedAt: Date.now() } : c
    );

    setChats(updated);
    saveChats(updated);
    setRenameIndex(null);
    setRenameText("");
    setMenuIndex(null);
  };

  // Copy full chat transcript to clipboard
  const handleCopyChatContent = (index: number) => {
    const chat = chats[index];
    if (!chat || !chat.messages) return;

    const content = chat.messages
      .map((m: any) => `${m.role === "user" ? "You" : "ZyroChat"}: ${m.text}`)
      .join("\n\n");

    navigator.clipboard.writeText(content);
    setMenuIndex(null);
  };

  // Toggle pin state
  const handleTogglePin = (index: number) => {
    const updated = chats.map((c: any, i: number) =>
      i === index ? { ...c, pinned: !c.pinned } : c
    );
    setChats(updated);
    saveChats(updated);
    setMenuIndex(null);
  };

  // Clear all conversations
  const handleClearAllChats = () => {
    setChats([]);
    saveChats([]);
    setChat([]);
    setChatIndex(null);
    clearConversationDraft();
    clearAllConversationsFromServer().catch(() => {});
  };

function highlightMatch(text: string, query: string) {
  if (!query.trim() || !text) return text;
  const q = query.trim().toLowerCase();
  const lowerText = text.toLowerCase();
  const parts: React.ReactNode[] = [];
  let currentIndex = 0;

  while (currentIndex < text.length) {
    const matchIndex = lowerText.indexOf(q, currentIndex);
    if (matchIndex === -1) {
      parts.push(text.slice(currentIndex));
      break;
    }
    if (matchIndex > currentIndex) {
      parts.push(text.slice(currentIndex, matchIndex));
    }
    parts.push(
      <mark
        key={matchIndex}
        className="bg-cyan-500/25 text-cyan-800 dark:bg-cyan-400/30 dark:text-cyan-200 font-semibold rounded px-0.5"
      >
        {text.slice(matchIndex, matchIndex + q.length)}
      </mark>
    );
    currentIndex = matchIndex + q.length;
  }
  return <>{parts}</>;
}

  // Filter chats by search query (deep search across title and messages with snippet extraction)
  const filteredChats = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const withIdx = chats.map((chat: any, index: number) => ({ chat, index }));

    if (!query) return withIdx;

    const results: Array<{
      chat: any;
      index: number;
      snippet?: string;
      matchedMsgIndex?: number;
    }> = [];

    for (const item of withIdx) {
      const title = (item.chat.title || "").toLowerCase();
      const titleMatches = title.includes(query);

      let matchedMsgIndex = -1;
      let snippet = "";

      if (item.chat.messages && Array.isArray(item.chat.messages)) {
        for (let mIdx = 0; mIdx < item.chat.messages.length; mIdx++) {
          const msg = item.chat.messages[mIdx];
          const text = typeof msg?.text === "string" ? msg.text : "";
          const lower = text.toLowerCase();
          const pos = lower.indexOf(query);
          if (pos !== -1) {
            matchedMsgIndex = mIdx;
            const start = Math.max(0, pos - 28);
            const end = Math.min(text.length, pos + query.length + 38);
            snippet =
              (start > 0 ? "…" : "") +
              text.slice(start, end).replace(/\s+/g, " ").trim() +
              (end < text.length ? "…" : "");
            break;
          }
        }
      }

      if (titleMatches || matchedMsgIndex !== -1) {
        results.push({
          ...item,
          snippet: snippet || undefined,
          matchedMsgIndex: matchedMsgIndex !== -1 ? matchedMsgIndex : undefined,
        });
      }
    }

    return results;
  }, [chats, searchQuery]);

  // Group chats chronologically with Pinned group first
  const groupedChats = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    ).getTime();
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
    const startOfWeekWindow = startOfToday - 7 * 24 * 60 * 60 * 1000;

    const pinned = filteredChats.filter(({ chat }: any) => chat.pinned);
    const unpinned = filteredChats.filter(({ chat }: any) => !chat.pinned);

    // Sort unpinned by updatedAt desc
    const sortedUnpinned = [...unpinned].sort(
      (a: any, b: any) => (b.chat.updatedAt || 0) - (a.chat.updatedAt || 0)
    );

    const today = sortedUnpinned.filter(
      ({ chat }: any) => (chat.updatedAt || 0) >= startOfToday
    );
    const yesterday = sortedUnpinned.filter(
      ({ chat }: any) =>
        (chat.updatedAt || 0) >= startOfYesterday &&
        (chat.updatedAt || 0) < startOfToday
    );
    const previous7Days = sortedUnpinned.filter(
      ({ chat }: any) =>
        (chat.updatedAt || 0) >= startOfWeekWindow &&
        (chat.updatedAt || 0) < startOfYesterday
    );
    const older = sortedUnpinned.filter(
      ({ chat }: any) => (chat.updatedAt || 0) < startOfWeekWindow
    );

    const groups: { label: string; items: any[] }[] = [];
    if (pinned.length > 0) groups.push({ label: "Pinned", items: pinned });
    if (today.length > 0) groups.push({ label: "Today", items: today });
    if (yesterday.length > 0) groups.push({ label: "Yesterday", items: yesterday });
    if (previous7Days.length > 0) groups.push({ label: "Previous 7 Days", items: previous7Days });
    if (older.length > 0) groups.push({ label: "Older", items: older });

    return groups;
  }, [filteredChats]);

  // Handle using a prompt from prompt library
  const handleUsePrompt = (promptText: string) => {
    window.dispatchEvent(
      new CustomEvent("zyrochat:use-prompt", {
        detail: { prompt: promptText },
      })
    );
    setPromptLibraryOpen(false);
  };

  // Listen for global custom open events
  useEffect(() => {
    const onOpenResearch = () => setResearchOpen(true);
    const onOpenKnowledge = () => setKnowledgeOpen(true);
    const onOpenWorkflow = () => setWorkflowOpen(true);
    const onOpenConnectors = () => setConnectorsOpen(true);
    const onOpenAdmin = () => setAdminOpen(true);

    window.addEventListener("zyrochat:open-research", onOpenResearch);
    window.addEventListener("zyrochat:open-knowledge", onOpenKnowledge);
    window.addEventListener("zyrochat:open-workflows", onOpenWorkflow);
    window.addEventListener("zyrochat:open-connectors", onOpenConnectors);
    window.addEventListener("zyrochat:open-admin", onOpenAdmin);

    return () => {
      window.removeEventListener("zyrochat:open-research", onOpenResearch);
      window.removeEventListener("zyrochat:open-knowledge", onOpenKnowledge);
      window.removeEventListener("zyrochat:open-workflows", onOpenWorkflow);
      window.removeEventListener("zyrochat:open-connectors", onOpenConnectors);
      window.removeEventListener("zyrochat:open-admin", onOpenAdmin);
    };
  }, []);


  return (
    <>
      {/* Mobile backdrop overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-sidebar-backdrop bg-slate-950/60 backdrop-blur-sm sm:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar container */}
      <aside
        className={`
          fixed left-0 top-0 z-sidebar flex h-full h-[100dvh] w-[82vw] max-w-[290px] flex-col
          border-r border-slate-200/80 bg-slate-50/95
          text-slate-900 transition-transform duration-250 ease-out
          dark:border-slate-800/80 dark:bg-[#0b0d13] dark:text-slate-100
          sm:static sm:z-auto sm:h-full sm:w-[260px] md:w-[280px] sm:max-w-none sm:translate-x-0 shrink-0
          ${sidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full sm:shadow-none"}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header & Branding */}
        <div className="border-b border-slate-200/70 p-3.5 dark:border-slate-800/70">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <AntigravityLogo size={28} />
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-400">
                  ZyroChat
                </span>
                <h2 className="text-[13.5px] font-semibold leading-tight text-slate-800 dark:text-slate-200">
                  AI Workspace
                </h2>
              </div>
            </div>

            {/* Mobile close button */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 sm:hidden transition cursor-pointer"
              aria-label="Close sidebar"
            >
              <X size={18} />
            </button>
          </div>

          {/* Project Selector Pill */}
          <div className="relative mb-2.5">
            <button
              type="button"
              onClick={() => setShowProjectsMenu(!showProjectsMenu)}
              className="flex w-full items-center justify-between rounded-xl border border-slate-200/90 bg-white/80 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-white dark:border-slate-800 dark:bg-[#12151e]/90 dark:text-slate-300 dark:hover:bg-[#151926] transition cursor-pointer"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Folder size={13} className="text-cyan-500 shrink-0" />
                <span className="truncate font-medium">
                  {currentProject ? currentProject.name : "Default Workspace"}
                </span>
              </div>
              <ChevronDown size={13} className="text-slate-400 shrink-0 ml-1" />
            </button>

            {/* Projects Dropdown Menu */}
            <AnimatePresence>
              {showProjectsMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.12 }}
                  className="absolute left-0 right-0 top-full z-dropdown mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-[#141722]"
                >
                  <button
                    type="button"
                    onClick={() => handleSelectProject(null)}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-left cursor-pointer ${
                      activeProjId === null
                        ? "bg-cyan-500/10 text-cyan-600 font-semibold dark:text-cyan-400"
                        : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                    }`}
                  >
                    <span>Default Workspace</span>
                    {activeProjId === null && <Check size={13} />}
                  </button>

                  {projects.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => handleSelectProject(p.id)}
                      className={`group flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs cursor-pointer ${
                        activeProjId === p.id
                          ? "bg-cyan-500/10 text-cyan-600 font-semibold dark:text-cyan-400"
                          : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                      }`}
                    >
                      <span className="truncate flex-1">{p.name}</span>
                      <div className="flex items-center gap-1">
                        {activeProjId === p.id && <Check size={13} />}
                        <button
                          type="button"
                          onClick={(e) => handleDeleteProject(p.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-red-500 transition"
                          title="Delete project"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                  ))}

                  <hr className="my-1 border-slate-100 dark:border-slate-800" />

                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingProject(true);
                      setShowProjectsMenu(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-cyan-600 hover:bg-cyan-50 dark:text-cyan-400 dark:hover:bg-cyan-950/30 cursor-pointer font-medium"
                  >
                    <FolderPlus size={13} />
                    <span>New Project...</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Inline Project Creator */}
          <AnimatePresence>
            {isCreatingProject && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleCreateProject}
                className="mb-2.5 rounded-xl border border-cyan-500/40 bg-cyan-500/5 p-2.5 dark:bg-cyan-500/10 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200">
                  <span>Create Workspace Project</span>
                  <button
                    type="button"
                    onClick={() => setIsCreatingProject(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X size={13} />
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Project Name (e.g. Website Redesign)"
                  value={newProjName}
                  onChange={(e) => setNewProjName(e.target.value)}
                  autoFocus
                  className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 outline-none focus:border-cyan-500 dark:border-slate-700 dark:bg-[#12151e] dark:text-slate-200"
                />
                <textarea
                  placeholder="Custom Instructions for this project (optional)..."
                  value={newProjInstructions}
                  onChange={(e) => setNewProjInstructions(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 outline-none focus:border-cyan-500 dark:border-slate-700 dark:bg-[#12151e] dark:text-slate-200 resize-none"
                />
                <button
                  type="submit"
                  disabled={!newProjName.trim()}
                  className="w-full rounded-lg bg-cyan-600 py-1 font-semibold text-white hover:bg-cyan-500 disabled:opacity-50 transition cursor-pointer"
                >
                  Save Project
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Action Row: [+ New chat] and [Prompt Library] */}
          <div className="flex gap-2">
            <motion.button
              whileHover={!interactionLocked ? { scale: 1.01 } : {}}
              whileTap={!interactionLocked ? { scale: 0.98 } : {}}
              onClick={() => {
                if (interactionLocked) return;
                setChat([]);
                setChatIndex(null);
                if (window.innerWidth < 640) {
                  setSidebarOpen(false);
                }
              }}
              disabled={interactionLocked}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 disabled:opacity-50 cursor-pointer"
              aria-label="Start a new chat"
            >
              <Plus size={14} strokeWidth={2.5} />
              <span>New chat</span>
            </motion.button>

            <button
              type="button"
              onClick={() => setPromptLibraryOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white/80 px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-[#12151e]/80 dark:text-slate-300 dark:hover:bg-[#161a26] transition cursor-pointer shrink-0"
              title="Open Prompt Library"
            >
              <BookOpen size={14} className="text-cyan-500" />
              <span className="hidden sm:inline">Prompts</span>
            </button>
          </div>

          {/* AI Workspace Features Grid */}
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => setResearchOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-white/70 px-2 py-1.5 text-left text-[11px] font-medium text-slate-700 hover:border-cyan-500/60 hover:bg-cyan-50/50 hover:text-cyan-700 dark:border-slate-800 dark:bg-[#12151e]/80 dark:text-slate-300 dark:hover:border-cyan-500/50 dark:hover:bg-[#141b2b] dark:hover:text-cyan-300 transition cursor-pointer"
              title="Deep Multi-Source Web Research"
            >
              <Sparkles size={13} className="text-cyan-500 shrink-0" />
              <span className="truncate">Research</span>
            </button>

            <button
              type="button"
              onClick={() => setKnowledgeOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-white/70 px-2 py-1.5 text-left text-[11px] font-medium text-slate-700 hover:border-indigo-500/60 hover:bg-indigo-50/50 hover:text-indigo-700 dark:border-slate-800 dark:bg-[#12151e]/80 dark:text-slate-300 dark:hover:border-indigo-500/50 dark:hover:bg-[#18172e] dark:hover:text-indigo-300 transition cursor-pointer"
              title="Document Knowledge Base & Semantic Search"
            >
              <Database size={13} className="text-indigo-500 shrink-0" />
              <span className="truncate">Knowledge</span>
            </button>

            <button
              type="button"
              onClick={() => setWorkflowOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-white/70 px-2 py-1.5 text-left text-[11px] font-medium text-slate-700 hover:border-purple-500/60 hover:bg-purple-50/50 hover:text-purple-700 dark:border-slate-800 dark:bg-[#12151e]/80 dark:text-slate-300 dark:hover:border-purple-500/50 dark:hover:bg-[#20152c] dark:hover:text-purple-300 transition cursor-pointer"
              title="Visual AI Workflow Builder"
            >
              <Network size={13} className="text-purple-500 shrink-0" />
              <span className="truncate">Workflows</span>
            </button>

            <button
              type="button"
              onClick={() => setConnectorsOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-white/70 px-2 py-1.5 text-left text-[11px] font-medium text-slate-700 hover:border-emerald-500/60 hover:bg-emerald-50/50 hover:text-emerald-700 dark:border-slate-800 dark:bg-[#12151e]/80 dark:text-slate-300 dark:hover:border-emerald-500/50 dark:hover:bg-[#12221b] dark:hover:text-emerald-300 transition cursor-pointer"
              title="Connected Apps & Integrations"
            >
              <Link2 size={13} className="text-emerald-500 shrink-0" />
              <span className="truncate">Connectors</span>
            </button>
          </div>

          {/* Search conversations input */}
          <div className="mt-2 flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white/70 px-3 py-1.5 text-xs text-slate-400 focus-within:border-cyan-500/60 focus-within:ring-1 focus-within:ring-cyan-500/30 dark:border-slate-800 dark:bg-[#12151e]/80 dark:text-slate-500">
            <Search size={14} className="shrink-0 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chats & messages"
              className="w-full bg-transparent text-xs text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-200 dark:placeholder:text-slate-600"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                aria-label="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto px-2.5 py-3">
          {chats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <MessageSquare size={24} className="text-slate-300 dark:text-slate-700 mb-2 stroke-[1.5]" />
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                No conversations yet
              </p>
              <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-600">
                Start a new chat to begin.
              </p>
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="py-8 px-4 text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                No matching conversations
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {groupedChats.map((group) => (
                <div key={group.label} className="space-y-1">
                  {/* Category Header */}
                  <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500 flex items-center justify-between">
                    <span>{group.label}</span>
                    <span className="text-[9px] font-normal">{group.items.length}</span>
                  </p>

                  {/* Category Items */}
                  <div className="space-y-0.5">
                    {group.items.map(
                      ({
                        chat: c,
                        index: originalIndex,
                        snippet,
                        matchedMsgIndex,
                      }: any) => {
                        const isActive = chatIndex === originalIndex;
                        const isMenuOpen = menuIndex === originalIndex;
                        const isRenaming = renameIndex === originalIndex;
                        const title = c.title || "New Chat";

                        return (
                          <div
                            key={originalIndex}
                            className="relative group"
                          >
                            <div
                              onClick={() => {
                                if (interactionLocked) return;
                                setChat(c.messages || []);
                                setChatIndex(originalIndex);
                                if (window.innerWidth < 640) {
                                  setSidebarOpen(false);
                                }
                                if (
                                  typeof matchedMsgIndex === "number" &&
                                  matchedMsgIndex >= 0
                                ) {
                                  setTimeout(() => {
                                    window.dispatchEvent(
                                      new CustomEvent("zyrochat:scroll-to-message", {
                                        detail: { messageIndex: matchedMsgIndex },
                                      })
                                    );
                                  }, 120);
                                }
                              }}
                              className={`
                                flex items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-xs transition-colors duration-150 cursor-pointer
                                ${
                                  isActive
                                    ? "bg-slate-200/90 font-medium text-slate-950 dark:bg-[#161a26] dark:text-white border-l-2 border-cyan-500"
                                    : "text-slate-600 hover:bg-slate-200/50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-[#131620] dark:hover:text-slate-200"
                                }
                              `}
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <MessageSquare
                                  size={14}
                                  className={`shrink-0 ${
                                    c.pinned
                                      ? "text-cyan-500"
                                      : isActive
                                        ? "text-cyan-500"
                                        : "text-slate-400 dark:text-slate-500"
                                  }`}
                                />

                                {isRenaming ? (
                                  <div
                                    className="flex items-center gap-1 flex-1"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <input
                                      type="text"
                                      value={renameText}
                                      onChange={(e) => setRenameText(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          handleRenameChat(originalIndex, renameText);
                                        } else if (e.key === "Escape") {
                                          setRenameIndex(null);
                                        }
                                      }}
                                      autoFocus
                                      className="w-full rounded border border-cyan-500 bg-white px-1.5 py-0.5 text-xs text-slate-900 outline-none dark:bg-slate-800 dark:text-white"
                                    />
                                    <button
                                      onClick={() => handleRenameChat(originalIndex, renameText)}
                                      className="p-1 text-cyan-600 hover:text-cyan-700 dark:text-cyan-400"
                                      title="Save"
                                    >
                                      <Check size={12} />
                                    </button>
                                    <button
                                      onClick={() => setRenameIndex(null)}
                                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                      title="Cancel"
                                    >
                                      <X size={12} />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex-1 min-w-0">
                                    <span className="truncate block leading-normal">
                                      {searchQuery.trim()
                                        ? highlightMatch(title, searchQuery)
                                        : title}
                                    </span>
                                    {searchQuery.trim() && snippet && (
                                      <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 italic font-normal">
                                        {highlightMatch(snippet, searchQuery)}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>

                            {/* Options Button */}
                            {!isRenaming && (
                              <div className="flex items-center gap-0.5 shrink-0">
                                {c.pinned && (
                                  <Pin size={11} className="text-cyan-500 fill-cyan-500/20 mr-0.5" />
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setMenuIndex(isMenuOpen ? null : originalIndex);
                                  }}
                                  className={`rounded-lg p-1 text-slate-400 transition hover:bg-slate-300/60 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 ${
                                    isMenuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100 sm:opacity-0 focus:opacity-100"
                                  }`}
                                  aria-label="Conversation options"
                                  title="Options"
                                >
                                  <MoreVertical size={13} />
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Context Menu */}
                          <AnimatePresence>
                            {isMenuOpen && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                                transition={{ duration: 0.12 }}
                                className="absolute right-2 top-full z-dropdown mt-1 w-36 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl backdrop-blur-md dark:border-slate-700 dark:bg-[#141722]"
                                onMouseLeave={() => setMenuIndex(null)}
                              >
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleTogglePin(originalIndex);
                                  }}
                                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/80 cursor-pointer"
                                >
                                  <Pin size={13} className={c.pinned ? "text-cyan-500 fill-cyan-500" : ""} />
                                  <span>{c.pinned ? "Unpin" : "Pin"}</span>
                                </button>

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShareIndex(originalIndex);
                                    setMenuIndex(null);
                                  }}
                                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/80 cursor-pointer"
                                >
                                  <Share2 size={13} className="text-cyan-500" />
                                  <span>Share...</span>
                                </button>

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setRenameIndex(originalIndex);
                                    setRenameText(title);
                                    setMenuIndex(null);
                                  }}
                                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/80 cursor-pointer"
                                >
                                  <Edit2 size={13} />
                                  <span>Rename</span>
                                </button>

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopyChatContent(originalIndex);
                                  }}
                                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/80 cursor-pointer"
                                >
                                  <Copy size={13} />
                                  <span>Copy all</span>
                                </button>

                                <hr className="my-1 border-slate-100 dark:border-slate-800" />

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setMenuIndex(null);
                                    setDeleteIndex(originalIndex);
                                  }}
                                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30 cursor-pointer"
                                >
                                  <Trash2 size={13} />
                                  <span>Delete</span>
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom User / Profile Area */}
        <div className="border-t border-slate-200/70 p-3 dark:border-slate-800/70">
          <div className="flex items-center justify-between rounded-xl bg-slate-100/80 p-2 dark:bg-[#12151e]/80">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-[11px] font-semibold text-white dark:bg-white dark:text-slate-950">
                U
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-200 leading-tight">
                  User Workspace
                </p>
                <p className="text-[10px] text-cyan-600 dark:text-cyan-400 font-medium">
                  {currentProject ? currentProject.name : "Free Tier"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setAdminOpen(true)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition cursor-pointer"
                title="Enterprise Admin Dashboard"
                aria-label="Admin Dashboard"
              >
                <Shield size={15} />
              </button>
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition cursor-pointer"
                title="Workspace Settings"
                aria-label="Workspace Settings"
              >
                <SettingsIcon size={15} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteIndex !== null && (
          <DeleteModal
            chatTitle={chats[deleteIndex]?.title}
            onClose={() => setDeleteIndex(null)}
            onConfirm={() => {
              const updated = chats.filter(
                (_: any, i: number) => i !== deleteIndex
              );
              setChats(updated);
              saveChats(updated);

              if (deleteIndex === chatIndex) {
                setChat([]);
                setChatIndex(null);
              }
              setDeleteIndex(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Share Modal */}
      <AnimatePresence>
        {shareIndex !== null && (
          <ShareModal
            chat={chats[shareIndex]}
            onClose={() => setShareIndex(null)}
          />
        )}
      </AnimatePresence>

      {/* Prompt Library Modal */}
      <AnimatePresence>
        {promptLibraryOpen && (
          <PromptLibraryModal
            onClose={() => setPromptLibraryOpen(false)}
            onUsePrompt={handleUsePrompt}
          />
        )}
      </AnimatePresence>

      {/* Deep Research Modal */}
      <AnimatePresence>
        {researchOpen && (
          <ResearchPanelModal
            isOpen={researchOpen}
            onClose={() => setResearchOpen(false)}
            onOpenWorkspace={(reportContent) => {
              window.dispatchEvent(
                new CustomEvent("zyrochat:open-workspace", {
                  detail: { code: reportContent, language: "markdown" },
                })
              );
            }}
          />
        )}
      </AnimatePresence>

      {/* Knowledge Base Modal */}
      <AnimatePresence>
        {knowledgeOpen && (
          <KnowledgeBaseModal
            isOpen={knowledgeOpen}
            onClose={() => setKnowledgeOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Workflow Builder Modal */}
      <AnimatePresence>
        {workflowOpen && (
          <WorkflowBuilderModal
            isOpen={workflowOpen}
            onClose={() => setWorkflowOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Connectors Modal */}
      <AnimatePresence>
        {connectorsOpen && (
          <ConnectorsModal
            isOpen={connectorsOpen}
            onClose={() => setConnectorsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Admin Dashboard Modal */}
      <AnimatePresence>
        {adminOpen && (
          <AdminDashboardModal
            isOpen={adminOpen}
            onClose={() => setAdminOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {settingsOpen && (
          <SettingsModal
            onClose={() => setSettingsOpen(false)}
            chatsCount={chats.length}
            onClearAllChats={handleClearAllChats}
            chats={chats}
            setChats={setChats}
          />
        )}
      </AnimatePresence>
    </>
  );
}
