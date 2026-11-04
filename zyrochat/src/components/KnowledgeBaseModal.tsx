import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  BookOpen,
  Plus,
  Upload,
  FileText,
  Search,
  Database,
  Building,
  GraduationCap,
  Briefcase,
  User,
  Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";

interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  category: "Company" | "College" | "Project" | "Personal" | "Custom";
  documentCount: number;
  createdAt: number;
}

interface KnowledgeDocument {
  id: string;
  title: string;
  fileName: string;
  fileSize: number;
  chunkCount: number;
  mimeType: string;
  createdAt: number;
}

interface MatchChunk {
  chunkId: string;
  content: string;
  score: number;
  fileName: string;
  section: string;
  pageNumber: number;
}

interface KnowledgeBaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function KnowledgeBaseModal({ isOpen, onClose }: KnowledgeBaseModalProps) {
  const [kbs, setKbs] = useState<KnowledgeBase[]>([]);
  const [selectedKbId, setSelectedKbId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newKbName, setNewKbName] = useState("");
  const [newKbCategory, setNewKbCategory] = useState<any>("Company");
  const [newKbDesc, setNewKbDesc] = useState("");
  
  // Document upload form
  const [isUploading, setIsUploading] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadContent, setUploadContent] = useState("");

  // Semantic query test
  const [testQuery, setTestQuery] = useState("");
  const [queryResults, setQueryResults] = useState<MatchChunk[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const BACKEND_URL =
    import.meta.env.VITE_BACKEND_URL?.replace(/\/$/, "") || "http://localhost:5000";

  const fetchKbs = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/knowledge-bases`);
      if (res.ok) {
        const data = await res.json();
        setKbs(data.knowledgeBases || []);
        if (!selectedKbId && data.knowledgeBases?.length > 0) {
          setSelectedKbId(data.knowledgeBases[0].id);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch KBs:", err);
    }
  };

  const fetchDocuments = async (kbId: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/knowledge-bases/${kbId}`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (err) {
      console.warn("Failed to fetch documents:", err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchKbs();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedKbId) {
      fetchDocuments(selectedKbId);
      setQueryResults([]);
    }
  }, [selectedKbId]);

  const handleCreateKb = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKbName.trim()) return;

    try {
      const res = await fetch(`${BACKEND_URL}/api/knowledge-bases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newKbName.trim(),
          category: newKbCategory,
          description: newKbDesc.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setKbs((prev) => [data.knowledgeBase, ...prev]);
        setSelectedKbId(data.knowledgeBase.id);
        setIsCreating(false);
        setNewKbName("");
        setNewKbDesc("");
      }
    } catch (err) {
      console.error("Create KB failed:", err);
    }
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitle.trim() || !uploadContent.trim() || !selectedKbId) return;

    try {
      const res = await fetch(`${BACKEND_URL}/api/knowledge-bases/${selectedKbId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: uploadTitle.trim(),
          fileName: `${uploadTitle.trim().replace(/\s+/g, "_")}.txt`,
          content: uploadContent.trim(),
          mimeType: "text/plain",
          fileSize: uploadContent.length,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setDocuments((prev) => [data.document, ...prev]);
        setIsUploading(false);
        setUploadTitle("");
        setUploadContent("");
        fetchKbs(); // refresh counts
      }
    } catch (err) {
      console.error("Upload doc failed:", err);
    }
  };

  const handleTestQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testQuery.trim() || !selectedKbId) return;

    setIsSearching(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/knowledge-bases/${selectedKbId}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: testQuery.trim(), topK: 4 }),
      });

      if (res.ok) {
        const data = await res.json();
        setQueryResults(data.matches || []);
      }
    } catch (err) {
      console.error("Semantic search failed:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Company": return <Building size={14} className="text-cyan-400" />;
      case "College": return <GraduationCap size={14} className="text-violet-400" />;
      case "Project": return <Briefcase size={14} className="text-emerald-400" />;
      case "Personal": return <User size={14} className="text-amber-400" />;
      default: return <Database size={14} className="text-cyan-400" />;
    }
  };

  if (!isOpen) return null;

  const activeKb = kbs.find((k) => k.id === selectedKbId);

  return createPortal(
    <div className="fixed inset-0 z-modal flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/75 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="flex flex-col w-full max-w-5xl h-[min(88vh,88dvh)] max-h-[100dvh] rounded-2xl border border-slate-700/60 bg-[#0f131f] text-slate-100 shadow-2xl overflow-hidden"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-800 bg-[#131826] gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <BookOpen size={18} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-white flex flex-wrap items-center gap-2">
                Knowledge Base & RAG System
                <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[11px] font-semibold text-cyan-300 border border-cyan-500/30">
                  Semantic Vector Search
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Index internal documents, chunk knowledge, and retrieve verified context with exact citations.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body Layout */}
        <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
          {/* Left Column: List of Knowledge Bases */}
          <div className="w-full md:w-72 border-b md:border-b-0 md:border-r border-slate-800/80 bg-[#111624] p-3 sm:p-4 flex flex-col justify-between overflow-y-auto max-h-[35vh] md:max-h-none shrink-0">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Knowledge Collections
                </span>
                <button
                  onClick={() => setIsCreating(true)}
                  className="flex items-center gap-1 rounded-lg bg-cyan-600/20 border border-cyan-500/30 px-2 py-1 text-[11px] font-semibold text-cyan-300 hover:bg-cyan-600/30 transition-colors"
                >
                  <Plus size={12} />
                  <span>New</span>
                </button>
              </div>

              {/* Create KB Dialog */}
              {isCreating && (
                <form onSubmit={handleCreateKb} className="p-3 rounded-xl border border-cyan-500/40 bg-[#161c2e] space-y-2 text-xs">
                  <input
                    type="text"
                    placeholder="Knowledge Base Name"
                    value={newKbName}
                    onChange={(e) => setNewKbName(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    autoFocus
                  />
                  <select
                    value={newKbCategory}
                    onChange={(e) => setNewKbCategory(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="Company">Company</option>
                    <option value="College">College</option>
                    <option value="Project">Project</option>
                    <option value="Personal">Personal</option>
                    <option value="Custom">Custom</option>
                  </select>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsCreating(false)}
                      className="px-2 py-1 text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!newKbName.trim()}
                      className="px-2.5 py-1 rounded-md bg-cyan-600 font-semibold text-white hover:bg-cyan-500 disabled:opacity-50"
                    >
                      Create
                    </button>
                  </div>
                </form>
              )}

              {/* KB Cards List */}
              <div className="space-y-1.5">
                {kbs.map((kb) => (
                  <button
                    key={kb.id}
                    onClick={() => setSelectedKbId(kb.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      selectedKbId === kb.id
                        ? "border-cyan-500/60 bg-cyan-500/10 text-white shadow-sm"
                        : "border-slate-800 bg-[#0d111b] text-slate-300 hover:border-slate-700 hover:bg-slate-800/40"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="flex items-center gap-1.5 font-medium text-slate-400">
                        {getCategoryIcon(kb.category)}
                        {kb.category}
                      </span>
                      <span className="font-mono text-cyan-400 font-semibold">
                        {kb.documentCount} docs
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-white truncate">{kb.name}</p>
                    {kb.description && (
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                        {kb.description}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Documents and Semantic Search */}
          <div className="flex-1 flex flex-col min-w-0 bg-[#0c101a] overflow-hidden">
            {activeKb ? (
              <div className="flex-1 flex flex-col overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
                {/* Header Info */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-white flex items-center gap-2">
                      {activeKb.name}
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                        {activeKb.category}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {activeKb.description || "Collection of verified domain documents."}
                    </p>
                  </div>
                  <button
                    onClick={() => setIsUploading(true)}
                    className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow-md hover:from-cyan-500 hover:to-teal-500 transition-all"
                  >
                    <Upload size={13} />
                    <span>Upload Document</span>
                  </button>
                </div>

                {/* Upload Form */}
                {isUploading && (
                  <form onSubmit={handleUploadDocument} className="p-4 rounded-xl border border-cyan-500/50 bg-[#121726] space-y-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                      Upload & Chunk Document
                    </h4>
                    <input
                      type="text"
                      placeholder="Document Title (e.g., Q3 Security Guidelines, College Syllabus)"
                      value={uploadTitle}
                      onChange={(e) => setUploadTitle(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                      required
                    />
                    <textarea
                      rows={5}
                      placeholder="Paste document text or policy paragraphs here. The engine will automatically chunk and index it..."
                      value={uploadContent}
                      onChange={(e) => setUploadContent(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono resize-none"
                      required
                    />
                    <div className="flex justify-end gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => setIsUploading(false)}
                        className="px-3 py-1.5 text-slate-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-3.5 py-1.5 rounded-lg bg-cyan-600 font-semibold text-white hover:bg-cyan-500"
                      >
                        Process & Chunk Document
                      </button>
                    </div>
                  </form>
                )}

                {/* Semantic Query Tester */}
                <div className="p-4 rounded-xl border border-slate-800 bg-[#101422] space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Sparkles size={13} className="text-cyan-400" />
                    Test Semantic Vector Query
                  </h4>
                  <form onSubmit={handleTestQuery} className="flex gap-2">
                    <div className="relative flex-1">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        placeholder="Ask a question against this Knowledge Base to test semantic chunk retrieval..."
                        value={testQuery}
                        onChange={(e) => setTestQuery(e.target.value)}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900/90 pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isSearching || !testQuery.trim()}
                      className="px-4 py-2 rounded-lg bg-cyan-600 text-xs font-semibold text-white hover:bg-cyan-500 disabled:opacity-50 cursor-pointer"
                    >
                      {isSearching ? "Searching..." : "Search Chunks"}
                    </button>
                  </form>

                  {/* Query Results */}
                  {queryResults.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <span className="text-[11px] font-semibold text-slate-400">
                        Retrieved Semantic Matches ({queryResults.length})
                      </span>
                      {queryResults.map((chunk, idx) => (
                        <div key={idx} className="p-3 rounded-lg border border-cyan-500/30 bg-cyan-950/20 text-xs space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] font-semibold text-cyan-300">
                            <span>{chunk.fileName} — {chunk.section}</span>
                            <span className="font-mono text-emerald-400">
                              {(chunk.score * 100).toFixed(1)}% Match
                            </span>
                          </div>
                          <p className="text-slate-300 leading-relaxed font-sans">
                            {chunk.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Indexed Documents Table */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Indexed Documents ({documents.length})
                  </h4>
                  {documents.length === 0 ? (
                    <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl text-xs text-slate-500">
                      No documents indexed in this Knowledge Base yet. Click "Upload Document" to add verified files.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {documents.map((doc) => (
                        <div key={doc.id} className="p-3.5 rounded-xl border border-slate-800/90 bg-[#111624] space-y-1.5">
                          <div className="flex items-center justify-between text-xs font-semibold text-white">
                            <span className="flex items-center gap-2 truncate">
                              <FileText size={14} className="text-cyan-400 shrink-0" />
                              {doc.title}
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              Indexed
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                            <span>{doc.fileName}</span>
                            <span className="font-mono text-cyan-400">
                              {doc.chunkCount} Chunks
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                Select or create a Knowledge Base from the left panel.
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
