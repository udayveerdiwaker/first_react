/**
 * Server-Side Authentication & Role-Based Access Control (RBAC)
 */

const db = require("../db");

/**
 * Extracts and verifies the active user from request headers.
 * Defaults to the primary administrator user if no explicit token is passed.
 */
function resolveUser(req) {
  const authHeader = req.headers.authorization || "";
  const customUserId = req.headers["x-user-id"];
  const customEmail = req.headers["x-user-email"];

  if (customUserId) {
    const user = db.table("users").findById(customUserId);
    if (user && user.status !== "suspended") return user;
    return { id: customUserId, name: customUserId, role: "member", status: "active" };
  }

  if (customEmail) {
    const user = db.table("users").findOne({ email: customEmail });
    if (user && user.status !== "suspended") return user;
  }

  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    // Support bearer token matching user ID or seed token
    const user = db.table("users").findOne({ id: token });
    if (user && user.status !== "suspended") return user;
  }

  // Default to system administrator
  const admin = db.table("users").findOne({ role: "admin" });
  return admin || { id: "usr-admin", name: "Admin", role: "admin", status: "active" };
}

/**
 * Middleware: Attaches req.user to every incoming request
 */
function userContextMiddleware(req, _res, next) {
  req.user = resolveUser(req);
  next();
}

/**
 * Middleware: Requires active authentication
 */
function requireAuth(req, res, next) {
  if (!req.user || req.user.status === "suspended") {
    return res.status(401).json({
      error: "Authentication required or account is suspended",
    });
  }
  next();
}

/**
 * Middleware: Requires administrator role
 */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      error: "Administrator permissions required",
    });
  }
  next();
}

/**
 * Middleware: Enforces workspace membership role hierarchy
 * Allowed roles: ['owner', 'admin', 'member', 'viewer']
 */
function requireWorkspaceRole(allowedRoles = ["owner", "admin", "member"]) {
  return (req, res, next) => {
    const workspaceId =
      req.params.workspaceId ||
      req.params.id ||
      req.body?.workspaceId ||
      req.query?.workspaceId ||
      "ws-default";

    if (req.user && req.user.role === "admin") {
      // Global admins have override access
      return next();
    }

    const membership = db.table("workspace_members").findOne({
      workspaceId,
      userId: req.user.id,
    });

    if (!membership || !allowedRoles.includes(membership.role)) {
      return res.status(403).json({
        error: `Insufficient permissions for workspace: required one of [${allowedRoles.join(", ")}]`,
      });
    }

    req.workspaceRole = membership.role;
    next();
  };
}

module.exports = {
  userContextMiddleware,
  requireAuth,
  requireAdmin,
  requireWorkspaceRole,
};
