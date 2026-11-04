import { useState, useEffect, Fragment } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Play,
  Copy,
  ArrowRight,
  GitBranch,
  Search,
  Sparkles,
  BookOpen,
  FileCode,
  Sliders,
  Terminal,
  Loader2,
} from "lucide-react";
import { motion } from "framer-motion";

interface WorkflowNode {
  id: string;
  type: "Input" | "WebSearch" | "KnowledgeBase" | "AI" | "Condition" | "Transform" | "Code" | "Output";
  title: string;
  config: Record<string, any>;
}

interface WorkflowEdge {
  from: string;
  to: string;
}

interface Workflow {
  id: string;
  name: string;
  description: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  status: "active" | "paused" | "draft";
}

interface WorkflowBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WorkflowBuilderModal({ isOpen, onClose }: WorkflowBuilderModalProps) {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [executionLogs, setExecutionLogs] = useState<string[]>([]);
  const [executionOutput, setExecutionOutput] = useState<any>(null);
  const [inputParam, setInputParam] = useState("Electric Vehicle market growth in 2026");

  const BACKEND_URL =
    import.meta.env.VITE_BACKEND_URL?.replace(/\/$/, "") || "http://localhost:5000";

  const fetchWorkflows = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/workflows`);
      if (res.ok) {
        const data = await res.json();
        setWorkflows(data.workflows || []);
        if (!selectedWorkflowId && data.workflows?.length > 0) {
          setSelectedWorkflowId(data.workflows[0].id);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch workflows:", err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchWorkflows();
    }
  }, [isOpen]);

  const activeWorkflow = workflows.find((w) => w.id === selectedWorkflowId);

  const handleRunWorkflow = async () => {
    if (!selectedWorkflowId || isRunning) return;

    setIsRunning(true);
    setExecutionLogs(["Initializing workflow execution pipeline..."]);
    setExecutionOutput(null);

    try {
      const res = await fetch(`${BACKEND_URL}/api/workflows/${selectedWorkflowId}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputs: { query: inputParam },
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setExecutionLogs(data.logs || []);
        setExecutionOutput(data.outputs);
      } else {
        setExecutionLogs((prev) => [...prev, `[ERROR] ${data.error || "Execution failed"}`]);
      }
    } catch (err: any) {
      setExecutionLogs((prev) => [...prev, `[NETWORK ERROR] ${err.message}`]);
    } finally {
      setIsRunning(false);
    }
  };

  const handleDuplicate = async () => {
    if (!selectedWorkflowId) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/workflows/${selectedWorkflowId}/duplicate`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setWorkflows((prev) => [data.workflow, ...prev]);
        setSelectedWorkflowId(data.workflow.id);
      }
    } catch (err) {
      console.error("Duplicate failed:", err);
    }
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case "Input": return <Sliders size={14} className="text-cyan-400" />;
      case "WebSearch": return <Search size={14} className="text-emerald-400" />;
      case "KnowledgeBase": return <BookOpen size={14} className="text-violet-400" />;
      case "AI": return <Sparkles size={14} className="text-amber-400" />;
      case "Condition": return <GitBranch size={14} className="text-pink-400" />;
      case "Code": return <FileCode size={14} className="text-blue-400" />;
      default: return <Terminal size={14} className="text-teal-400" />;
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-modal flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/75 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="flex flex-col w-full max-w-6xl h-[min(90vh,90dvh)] max-h-[100dvh] rounded-2xl border border-slate-700/60 bg-[#0f131f] text-slate-100 shadow-2xl overflow-hidden"
      >
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-800 bg-[#131826] gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500/20 to-teal-500/20 border border-cyan-500/30 text-cyan-400">
              <GitBranch size={18} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-white flex flex-wrap items-center gap-2">
                Visual AI Workflow Builder
                <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[11px] font-semibold text-cyan-300 border border-cyan-500/30">
                  Node Graph Engine
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Connect autonomous AI prompts, organic search, knowledge bases, and sandboxed code.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end shrink-0">
            <button
              onClick={handleDuplicate}
              disabled={!selectedWorkflowId}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
            >
              <Copy size={13} />
              <span>Duplicate</span>
            </button>
            <button
              onClick={handleRunWorkflow}
              disabled={isRunning || !selectedWorkflowId}
              className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-teal-600 px-3 sm:px-4 py-1.5 text-xs font-semibold text-white shadow-md hover:from-cyan-500 hover:to-teal-500 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isRunning ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
              <span>{isRunning ? "Running..." : "Run Workflow"}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors ml-1 cursor-pointer shrink-0"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Builder Body */}
        <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
          {/* Left Palette & Workflow Selector */}
          <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-800/80 bg-[#111624] p-3 sm:p-4 flex flex-col justify-between overflow-y-auto max-h-[30vh] md:max-h-none shrink-0">
            <div className="space-y-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Workflows
                </span>
                <div className="mt-2 space-y-1.5">
                  {workflows.map((wf) => (
                    <button
                      key={wf.id}
                      onClick={() => setSelectedWorkflowId(wf.id)}
                      className={`w-full text-left p-2.5 rounded-xl border transition-all text-xs ${
                        selectedWorkflowId === wf.id
                          ? "border-cyan-500/60 bg-cyan-500/10 text-white font-semibold"
                          : "border-slate-800 bg-[#0e121d] text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <p className="truncate">{wf.name}</p>
                      <span className="text-[10px] font-mono text-cyan-400/80 font-normal">
                        {wf.nodes?.length || 0} nodes
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Available Node Types
                </span>
                <div className="mt-2 space-y-1.5">
                  {[
                    { type: "Input", label: "User Input" },
                    { type: "WebSearch", label: "Web Search" },
                    { type: "KnowledgeBase", label: "Knowledge Base" },
                    { type: "AI", label: "AI Analysis" },
                    { type: "Condition", label: "Branch Condition" },
                    { type: "Code", label: "Sandboxed Code" },
                    { type: "Output", label: "Final Output" },
                  ].map((item) => (
                    <div
                      key={item.type}
                      className="flex items-center gap-2 p-2 rounded-lg border border-slate-800/80 bg-[#0d101a] text-xs text-slate-300"
                    >
                      {getNodeIcon(item.type)}
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Input Parameter Form */}
            <div className="pt-3 border-t border-slate-800 text-xs space-y-2">
              <span className="font-semibold text-slate-400">Workflow Input Query</span>
              <input
                type="text"
                value={inputParam}
                onChange={(e) => setInputParam(e.target.value)}
                placeholder="Topic or input query..."
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Center Canvas */}
          <div className="flex-1 flex flex-col min-w-0 bg-[#0a0d16] overflow-hidden">
            {/* Visual Canvas Area */}
            <div className="flex-1 overflow-auto p-4 sm:p-8 relative flex flex-col items-center justify-center">
              {activeWorkflow?.nodes && activeWorkflow.nodes.length > 0 ? (
                <div className="flex items-center justify-center gap-6 flex-wrap max-w-4xl py-6">
                  {activeWorkflow.nodes.map((node, idx) => (
                    <Fragment key={node.id}>
                      <div
                        onClick={() => setSelectedNodeId(node.id)}
                        className={`w-48 rounded-xl border p-4 shadow-lg transition-all cursor-pointer ${
                          selectedNodeId === node.id
                            ? "border-cyan-400 bg-cyan-950/30 ring-2 ring-cyan-500/20"
                            : "border-slate-800 bg-[#121624] hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs mb-2">
                          <span className="flex items-center gap-1.5 font-semibold text-slate-300">
                            {getNodeIcon(node.type)}
                            {node.type}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                            #{idx + 1}
                          </span>
                        </div>
                        <h4 className="text-xs font-semibold text-white truncate">
                          {node.title || node.type}
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                          {node.config?.promptTemplate || node.config?.defaultValue || "Connected in pipeline"}
                        </p>
                      </div>

                      {idx < activeWorkflow.nodes.length - 1 && (
                        <ArrowRight size={18} className="text-cyan-500/60 shrink-0" />
                      )}
                    </Fragment>
                  ))}
                </div>
              ) : (
                <div className="text-slate-500 text-xs">No nodes in this workflow.</div>
              )}
            </div>

            {/* Bottom Console: Logs & Output */}
            <div className="h-44 border-t border-slate-800 bg-[#0d1019] p-4 flex flex-col text-xs font-mono">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Terminal size={12} className="text-cyan-400" />
                  Execution Pipeline Console
                </span>
                {executionOutput && (
                  <span className="text-emerald-400 font-medium">Execution Succeeded</span>
                )}
              </div>
              <div className="flex-1 overflow-y-auto pt-2 space-y-1 text-slate-300">
                {executionLogs.length === 0 ? (
                  <div className="text-slate-600">Click "Run Workflow" to execute the pipeline...</div>
                ) : (
                  executionLogs.map((log, i) => (
                    <div key={i} className="text-[11px]">
                      {log.includes("[ERROR]") ? (
                        <span className="text-red-400">{log}</span>
                      ) : (
                        log
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
