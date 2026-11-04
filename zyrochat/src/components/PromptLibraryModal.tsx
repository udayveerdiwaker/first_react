import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Search,
  Plus,
  Trash2,
  Sparkles,
  ArrowRight,
  BookOpen,
} from "lucide-react";
import { motion } from "framer-motion";
import type { SavedPrompt } from "../agent/types";
import {
  getAllPrompts,
  getCustomPrompts,
  saveCustomPrompts,
} from "../store/workspaceStore";

interface PromptLibraryModalProps {
  onClose: () => void;
  onUsePrompt: (promptText: string) => void;
}

const CATEGORIES = [
  "All",
  "Coding",
  "Writing",
  "Marketing",
  "Business",
  "Education",
  "Research",
  "Creative",
];

export default function PromptLibraryModal({
  onClose,
  onUsePrompt,
}: PromptLibraryModalProps) {
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [prompts, setPrompts] = useState<SavedPrompt[]>(() => getAllPrompts());
  const [customPrompts, setCustomPrompts] = useState<SavedPrompt[]>(() =>
    getCustomPrompts()
  );

  // Creating a new custom prompt
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("Writing");
  const [newPromptText, setNewPromptText] = useState("");

  const filteredPrompts = useMemo(() => {
    return prompts.filter((p) => {
      const matchesCategory =
        activeCategory === "All" || p.category === activeCategory;
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.prompt.toLowerCase().includes(q) ||
        (p.tags && p.tags.some((t) => t.toLowerCase().includes(q)));
      return matchesCategory && matchesSearch;
    });
  }, [prompts, activeCategory, searchQuery]);

  const handleSaveCustom = () => {
    if (!newTitle.trim() || !newPromptText.trim()) return;

    const newPrompt: SavedPrompt = {
      id: `custom-${Date.now()}`,
      title: newTitle.trim(),
      category: newCategory,
      prompt: newPromptText.trim(),
      tags: ["Custom"],
    };

    const updated = [newPrompt, ...customPrompts];
    setCustomPrompts(updated);
    saveCustomPrompts(updated);
    setPrompts(getAllPrompts());

    setNewTitle("");
    setNewPromptText("");
    setIsCreating(false);
  };

  const handleDeleteCustom = (id: string) => {
    const updated = customPrompts.filter((p) => p.id !== id);
    setCustomPrompts(updated);
    saveCustomPrompts(updated);
    setPrompts(getAllPrompts());
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.16 }}
      className="fixed inset-0 z-modal flex items-center justify-center bg-slate-950/70 p-2 sm:p-4 md:p-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 8 }}
        transition={{ type: "spring", bounce: 0.12, duration: 0.25 }}
        className="flex h-full max-h-[min(85vh,85dvh)] w-full max-w-3xl flex-col rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#11141d] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200/80 px-4 sm:px-6 py-3 sm:py-4 dark:border-slate-800/80 gap-2">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
              <BookOpen size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Prompt Library
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Curated prompt templates and custom workflow shortcuts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCreating(!isCreating)}
              className="flex items-center gap-1.5 rounded-xl bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-400 transition cursor-pointer shadow-sm"
            >
              <Plus size={14} />
              <span>New Prompt</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Search & Category Filter */}
        <div className="border-b border-slate-200/60 p-4 dark:border-slate-800/60 space-y-3 bg-slate-50/50 dark:bg-[#0c0e15]">
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, prompt keyword, or tag..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-cyan-500 dark:border-slate-800 dark:bg-[#141824] dark:text-slate-200"
            />
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`rounded-lg px-3 py-1 font-medium transition cursor-pointer shrink-0 ${
                  activeCategory === cat
                    ? "bg-slate-900 text-white dark:bg-cyan-500 dark:text-slate-950 font-semibold shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Create Prompt Form Drawer */}
        {isCreating && (
          <div className="border-b border-cyan-500/20 bg-cyan-500/5 p-4 dark:border-cyan-500/10 dark:bg-cyan-950/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-cyan-600 dark:text-cyan-400">
                Create Custom Prompt
              </span>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="text-slate-400 hover:text-slate-600 text-xs"
              >
                Cancel
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Prompt title (e.g. SEO Auditor)"
                className="sm:col-span-2 rounded-xl border border-slate-200 bg-white p-2 text-xs text-slate-800 dark:border-slate-800 dark:bg-[#141824] dark:text-white outline-none"
              />
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white p-2 text-xs text-slate-800 dark:border-slate-800 dark:bg-[#141824] dark:text-white outline-none"
              >
                {CATEGORIES.filter((c) => c !== "All").map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              value={newPromptText}
              onChange={(e) => setNewPromptText(e.target.value)}
              placeholder="Enter your prompt instructions..."
              rows={3}
              className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-800 dark:border-slate-800 dark:bg-[#141824] dark:text-white outline-none resize-none"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSaveCustom}
                disabled={!newTitle.trim() || !newPromptText.trim()}
                className="rounded-xl bg-cyan-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-cyan-400 disabled:opacity-50 cursor-pointer"
              >
                Save to Library
              </button>
            </div>
          </div>
        )}

        {/* Prompt List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredPrompts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Sparkles size={28} className="text-slate-400 mb-2 opacity-60" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                No prompts found
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Try selecting a different category or adjusting your search term.
              </p>
            </div>
          ) : (
            filteredPrompts.map((p) => {
              const isCustom = p.id.startsWith("custom-");
              return (
                <div
                  key={p.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 hover:border-cyan-500/40 hover:shadow-sm dark:border-slate-800 dark:bg-[#131622] dark:hover:border-cyan-500/30 transition group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                        {p.title}
                      </span>
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        {p.category}
                      </span>
                      {isCustom && (
                        <span className="rounded-md bg-cyan-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-cyan-600 dark:text-cyan-400">
                          Custom
                        </span>
                      )}
                    </div>
                    <p className="line-clamp-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
                      {p.prompt}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                    {isCustom && (
                      <button
                        type="button"
                        onClick={() => handleDeleteCustom(p.id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30 transition cursor-pointer"
                        title="Delete custom prompt"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        onUsePrompt(p.prompt);
                        onClose();
                      }}
                      className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400 transition cursor-pointer shadow-sm"
                    >
                      <span>Use Prompt</span>
                      <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}
