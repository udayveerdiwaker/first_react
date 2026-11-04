import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Mail,
  HardDrive,
  Github,
  MessageSquare,
  Shield,
  Play,
  Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";

interface ConnectorItem {
  provider: "gmail" | "drive" | "github" | "slack";
  name: string;
  description: string;
  status: "connected" | "not_connected";
  scopes: string[];
  accountName?: string;
  accountEmail?: string;
  supportedOperations: string[];
}

interface ConnectorsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ConnectorsModal({ isOpen, onClose }: ConnectorsModalProps) {
  const [connectors, setConnectors] = useState<ConnectorItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTest, setActiveTest] = useState<{ provider: string; result: any } | null>(null);
  const [testLoading, setTestLoading] = useState(false);

  const BACKEND_URL =
    import.meta.env.VITE_BACKEND_URL?.replace(/\/$/, "") || "http://localhost:5000";

  const fetchConnectors = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/connectors`);
      if (res.ok) {
        const data = await res.json();
        setConnectors(data.connectors || []);
      }
    } catch (err) {
      console.warn("Failed to fetch connectors:", err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchConnectors();
    }
  }, [isOpen]);

  const handleToggleConnect = async (provider: string, currentStatus: string) => {
    const endpoint = currentStatus === "connected" ? "disconnect" : "connect";
    setLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/api/connectors/${provider}/${endpoint}`, {
        method: "POST",
      });
      if (res.ok) {
        fetchConnectors();
      }
    } catch (err) {
      console.error("Connector toggle failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleTestOperation = async (provider: string, operation: string) => {
    setTestLoading(true);
    setActiveTest(null);

    try {
      const res = await fetch(`${BACKEND_URL}/api/connectors/${provider}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operation }),
      });
      const data = await res.json();
      if (res.ok) {
        setActiveTest({ provider, result: data.result });
      }
    } catch (err: any) {
      setActiveTest({ provider, result: { error: err.message } });
    } finally {
      setTestLoading(false);
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case "gmail": return <Mail size={20} className="text-red-400" />;
      case "drive": return <HardDrive size={20} className="text-amber-400" />;
      case "github": return <Github size={20} className="text-slate-100" />;
      case "slack": return <MessageSquare size={20} className="text-purple-400" />;
      default: return <Sparkles size={20} className="text-cyan-400" />;
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-modal flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/75 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="flex flex-col w-full max-w-4xl h-[min(85vh,85dvh)] max-h-[100dvh] rounded-2xl border border-slate-700/60 bg-[#0f131f] text-slate-100 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-800 bg-[#131826] gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Shield size={18} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-white flex flex-wrap items-center gap-2">
                Connected Apps & Integrations
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-300 border border-emerald-500/30">
                  Read-Only Scoped
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Grant ZyroChat read-only search and summarization access. Passwords are never stored.
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-6 bg-[#0c101a]">
          {/* Policy Banner */}
          <div className="flex items-start gap-3 p-4 rounded-xl border border-cyan-500/30 bg-cyan-950/20 text-xs text-slate-300">
            <Shield size={16} className="text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-cyan-300">Safe Connector Architecture:</span>
              <p className="mt-0.5 text-slate-400 leading-relaxed">
                Connectors only request minimal read-only permissions for search and summarization. The AI cannot send emails, delete files, push code, or send messages automatically.
              </p>
            </div>
          </div>

          {/* Connectors Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {connectors.map((c) => {
              const isConnected = c.status === "connected";

              return (
                <div
                  key={c.provider}
                  className="p-5 rounded-2xl border border-slate-800 bg-[#111624] space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800/90 border border-slate-700">
                          {getProviderIcon(c.provider)}
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-white">{c.name}</h3>
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                              isConnected ? "text-emerald-400" : "text-slate-500"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                isConnected ? "bg-emerald-400" : "bg-slate-600"
                              }`}
                            />
                            {isConnected ? "Connected" : "Not connected"}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleToggleConnect(c.provider, c.status)}
                        disabled={loading}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          isConnected
                            ? "border border-red-500/30 bg-red-950/20 text-red-400 hover:bg-red-900/40"
                            : "bg-cyan-600 text-white hover:bg-cyan-500 shadow-md"
                        }`}
                      >
                        {isConnected ? "Disconnect" : "Connect"}
                      </button>
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed">
                      {c.description}
                    </p>

                    <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-500 space-y-1">
                      <span className="font-semibold text-slate-400">Requested Scopes:</span>
                      <div className="flex flex-wrap gap-1">
                        {c.scopes?.map((scope, idx) => (
                          <span
                            key={idx}
                            className="rounded px-1.5 py-0.5 bg-slate-900 border border-slate-800 font-mono text-[10px] text-slate-400 truncate max-w-[200px]"
                          >
                            {scope.split("/").pop()}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Operations actions if connected */}
                  {isConnected && (
                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                      <button
                        onClick={() =>
                          handleTestOperation(
                            c.provider,
                            c.supportedOperations?.[0] || "test"
                          )
                        }
                        disabled={testLoading}
                        className="flex items-center gap-1 text-xs font-semibold text-cyan-400 hover:text-cyan-300"
                      >
                        <Play size={12} />
                        <span>Test {c.supportedOperations?.[0]?.replace(/_/g, " ")}</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Test Action Output Viewer */}
          {activeTest && (
            <div className="p-4 rounded-xl border border-slate-800 bg-[#111624] space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                <span>Connector Test Result ({activeTest.provider})</span>
                <button
                  onClick={() => setActiveTest(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <X size={14} />
                </button>
              </div>
              <pre className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-300 font-mono text-[11px] overflow-x-auto max-h-44">
                {JSON.stringify(activeTest.result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
