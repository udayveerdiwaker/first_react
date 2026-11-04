import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Shield,
  Users,
  MessageSquare,
  Sparkles,
  FileText,
  Search,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Activity,
  UserCheck,
  Loader2,
} from "lucide-react";
import { motion } from "framer-motion";

interface AdminMetrics {
  totalUsers: number;
  activeUsers: number;
  totalMessages: number;
  aiRequests: number;
  filesProcessed: number;
  researchSessions: number;
  toolCalls: number;
  totalErrors: number;
  estimatedCost: number;
}

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "active" | "suspended";
  createdAt: number;
  requestCount: number;
}

interface AuditLogItem {
  id: string;
  userId: string;
  action: string;
  targetType: string;
  targetId: string;
  details: Record<string, any>;
  ip: string;
  timestamp: number;
}

interface AdminDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminDashboardModal({ isOpen, onClose }: AdminDashboardModalProps) {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [healthChecks, setHealthChecks] = useState<Record<string, any>>({});
  const [users, setUsers] = useState<UserItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "audit" | "health">("overview");
  const [userSearch, setUserSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const BACKEND_URL =
    import.meta.env.VITE_BACKEND_URL?.replace(/\/$/, "") || "http://localhost:5000";

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [mRes, hRes, uRes, aRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/admin/metrics`),
        fetch(`${BACKEND_URL}/api/admin/system-health`),
        fetch(`${BACKEND_URL}/api/admin/users`),
        fetch(`${BACKEND_URL}/api/admin/audit-logs`),
      ]);

      if (mRes.ok) {
        const d = await mRes.json();
        setMetrics(d.metrics);
      }
      if (hRes.ok) {
        const d = await hRes.json();
        setHealthChecks(d.checks || {});
      }
      if (uRes.ok) {
        const d = await uRes.json();
        setUsers(d.users || []);
      }
      if (aRes.ok) {
        const d = await aRes.json();
        setAuditLogs(d.auditLogs || []);
      }
    } catch (err) {
      console.warn("Failed to fetch admin dashboard metrics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAdminData();
    }
  }, [isOpen]);

  const handleToggleUserStatus = async (user: UserItem) => {
    const action = user.status === "active" ? "suspend" : "restore";
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/users/${user.id}/${action}`, {
        method: "POST",
      });
      if (res.ok) {
        fetchAdminData();
      }
    } catch (err) {
      console.error(`Failed to ${action} user:`, err);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-modal flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="flex flex-col w-full max-w-6xl h-[min(90vh,90dvh)] max-h-[100dvh] rounded-2xl border border-slate-700/60 bg-[#0f131f] text-slate-100 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 sm:px-6 py-3 sm:py-4 gap-3 border-b border-slate-800 bg-[#131826]">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Shield size={18} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-white flex flex-wrap items-center gap-2">
                Enterprise Admin & Governance Dashboard
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[11px] font-semibold text-amber-300 border border-amber-500/30">
                  Authorized Admin
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Operational metrics, user controls, security audit trails, and infrastructure health monitoring.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end overflow-x-auto shrink-0">
            {loading && <Loader2 size={16} className="animate-spin text-amber-400 mr-1" />}
            <div className="flex rounded-lg bg-slate-900/80 p-0.5 border border-slate-800 text-xs">
              {(["overview", "users", "health", "audit"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-2.5 sm:px-3 py-1 rounded-md font-medium capitalize transition-colors ${
                    activeTab === tab
                      ? "bg-amber-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors shrink-0"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-6 bg-[#0c101a]">
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* 9 Metrics KPI Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-3.5">
                {[
                  { label: "Total Users", val: metrics?.totalUsers ?? 0, icon: <Users size={16} className="text-cyan-400" /> },
                  { label: "Active Users", val: metrics?.activeUsers ?? 0, icon: <UserCheck size={16} className="text-emerald-400" /> },
                  { label: "Total Messages", val: metrics?.totalMessages ?? 0, icon: <MessageSquare size={16} className="text-violet-400" /> },
                  { label: "AI Requests", val: metrics?.aiRequests ?? 0, icon: <Sparkles size={16} className="text-amber-400" /> },
                  { label: "Files Processed", val: metrics?.filesProcessed ?? 0, icon: <FileText size={16} className="text-blue-400" /> },
                  { label: "Research Sessions", val: metrics?.researchSessions ?? 0, icon: <Search size={16} className="text-teal-400" /> },
                  { label: "Tool Calls", val: metrics?.toolCalls ?? 0, icon: <Activity size={16} className="text-pink-400" /> },
                  { label: "System Errors", val: metrics?.totalErrors ?? 0, icon: <AlertTriangle size={16} className="text-red-400" /> },
                  {
                    label: "Estimated API Cost",
                    val: `$${(metrics?.estimatedCost ?? 0).toFixed(4)}`,
                    icon: <DollarSign size={16} className="text-emerald-400" />,
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-slate-800/90 bg-[#111624] space-y-2 shadow-sm"
                  >
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>{item.label}</span>
                      {item.icon}
                    </div>
                    <p className="text-xl font-bold text-white font-mono">{item.val}</p>
                  </div>
                ))}
              </div>

              {/* Infrastructure Summary */}
              <div className="p-5 rounded-xl border border-slate-800 bg-[#111624] space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Activity size={14} className="text-cyan-400" />
                  Live Operational Infrastructure
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  {Object.entries(healthChecks).map(([key, val]: any) => (
                    <div key={key} className="p-3 rounded-lg border border-slate-800 bg-slate-900/60 space-y-1">
                      <div className="flex items-center justify-between font-medium capitalize text-slate-300">
                        <span>{key.replace(/([A-Z])/g, " $1")}</span>
                        <span className={`text-[11px] font-semibold ${val.status === "Healthy" ? "text-emerald-400" : "text-amber-400"}`}>
                          {val.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-1">{val.details}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "users" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="relative w-72">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search users by name or email..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <span className="text-xs text-slate-400">{users.length} registered accounts</span>
              </div>

              <div className="rounded-xl border border-slate-800 bg-[#111624] overflow-x-auto min-w-0 max-w-full text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800 font-semibold">
                    <tr>
                      <th className="p-3">User</th>
                      <th className="p-3">Role</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Requests</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {users
                      .filter(
                        (u) =>
                          u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
                          u.email.toLowerCase().includes(userSearch.toLowerCase())
                      )
                      .map((u) => (
                        <tr key={u.id} className="hover:bg-slate-800/30">
                          <td className="p-3 font-medium text-white">
                            <div>{u.name}</div>
                            <div className="text-[11px] text-slate-500">{u.email}</div>
                          </td>
                          <td className="p-3">
                            <span className="capitalize font-mono text-[11px] text-slate-300">
                              {u.role}
                            </span>
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                u.status === "active"
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                  : "bg-red-500/10 text-red-400 border-red-500/20"
                              }`}
                            >
                              {u.status}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-cyan-400">{u.requestCount}</td>
                          <td className="p-3 text-right">
                            {u.role !== "admin" && (
                              <button
                                onClick={() => handleToggleUserStatus(u)}
                                className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors ${
                                  u.status === "active"
                                    ? "border-red-500/30 text-red-400 hover:bg-red-950/30"
                                    : "border-emerald-500/30 text-emerald-400 hover:bg-emerald-950/30"
                                }`}
                              >
                                {u.status === "active" ? "Suspend" : "Restore"}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "health" && (
            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Component Health & Diagnostic Probes
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {Object.entries(healthChecks).map(([key, val]: any) => (
                  <div key={key} className="p-4 rounded-xl border border-slate-800 bg-[#111624] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-white capitalize">
                        {key.replace(/([A-Z])/g, " $1")}
                      </span>
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                        <CheckCircle2 size={14} />
                        {val.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{val.details}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "audit" && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Security Audit Log Stream ({auditLogs.length})
              </h3>
              <div className="rounded-xl border border-slate-800 bg-[#111624] overflow-x-auto min-w-0 max-w-full text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800 font-semibold">
                    <tr>
                      <th className="p-3">Timestamp</th>
                      <th className="p-3">Action</th>
                      <th className="p-3">Target</th>
                      <th className="p-3">IP Address</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/30">
                        <td className="p-3 text-slate-400">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="p-3 text-cyan-400 font-semibold">{log.action}</td>
                        <td className="p-3 text-slate-300">
                          {log.targetType}: {log.targetId}
                        </td>
                        <td className="p-3 text-slate-500">{log.ip}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
