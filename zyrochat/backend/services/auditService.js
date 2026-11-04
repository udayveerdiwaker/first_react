/**
 * Server-Side Audit Logging Service
 */

const db = require("../db");

/**
 * Records an audit trail log entry
 * @param {string} action - Action verb (e.g., 'member_added', 'file_deleted', 'workflow_executed')
 * @param {string} targetType - Entity type ('workspace', 'user', 'file', 'connector', 'workflow')
 * @param {string} targetId - Identifier of targeted entity
 * @param {object} details - Additional metadata or payload
 * @param {object} req - Express request object for IP and user resolution
 */
function logAudit(action, targetType, targetId, details = {}, req = null) {
  const userId = req?.user?.id || "usr-admin";
  const workspaceId = req?.body?.workspaceId || req?.params?.workspaceId || "ws-default";
  const ip = req?.ip || req?.socket?.remoteAddress || "127.0.0.1";

  const entry = {
    userId,
    workspaceId,
    action,
    targetType,
    targetId: String(targetId || ""),
    details,
    ip,
    timestamp: Date.now(),
  };

  try {
    return db.table("audit_logs").insert(entry);
  } catch (err) {
    console.error("Failed to insert audit log:", err);
    return null;
  }
}

module.exports = {
  logAudit,
};
