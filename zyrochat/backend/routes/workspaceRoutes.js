/**
 * Workspace & Collaborative Team API Routes
 */

const express = require("express");
const router = express.Router();
const db = require("../db");
const { logAudit } = require("../services/auditService");
const { requireWorkspaceRole } = require("../middleware/auth");

/**
 * GET /api/workspaces
 * Lists workspaces where the user is a member
 */
router.get("/", (req, res) => {
  const userId = req.user?.id || "usr-admin";

  // Admins see all workspaces; members see their assigned workspaces
  let workspaces = [];
  if (req.user?.role === "admin") {
    workspaces = db.table("workspaces").find();
  } else {
    const memberships = db.table("workspace_members").find({ userId });
    const wsIds = memberships.map((m) => m.workspaceId);
    workspaces = db.table("workspaces").find((w) => wsIds.includes(w.id));
  }

  res.json({ workspaces });
});

/**
 * POST /api/workspaces
 * Creates a new workspace and sets the creator as Owner
 */
router.post("/", (req, res) => {
  const { name, description = "" } = req.body || {};

  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "Workspace name is required" });
  }

  const userId = req.user?.id || "usr-admin";

  const ws = db.table("workspaces").insert({
    name: name.trim(),
    description: description.trim(),
    ownerId: userId,
    isDefault: false,
  });

  // Automatically assign creator as Owner
  db.table("workspace_members").insert({
    workspaceId: ws.id,
    userId,
    role: "owner",
  });

  logAudit("workspace_created", "workspace", ws.id, { name: ws.name }, req);

  res.status(201).json({ success: true, workspace: ws });
});

/**
 * GET /api/workspaces/:id
 * Fetches workspace details, members, projects, and knowledge bases
 */
router.get("/:id", (req, res) => {
  const { id } = req.params;
  const ws = db.table("workspaces").findById(id);
  if (!ws) {
    return res.status(404).json({ error: "Workspace not found" });
  }

  const members = db.table("workspace_members").find({ workspaceId: id }).map((m) => {
    const user = db.table("users").findById(m.userId);
    return {
      ...m,
      userName: user?.name || "Unknown User",
      userEmail: user?.email || "",
    };
  });

  const projects = db.table("projects").find({ workspaceId: id });
  const knowledgeBases = db.table("knowledge_bases").find({ workspaceId: id });

  res.json({
    workspace: ws,
    members,
    projects,
    knowledgeBases,
  });
});

/**
 * POST /api/workspaces/:id/members
 * Adds a new member to a workspace (Requires Owner or Admin role)
 */
router.post("/:id/members", requireWorkspaceRole(["owner", "admin"]), (req, res) => {
  const { id } = req.params;
  const { email, role = "member" } = req.body || {};

  if (!email || !email.includes("@")) {
    return res.status(400).json({ error: "Valid user email is required" });
  }

  const validRoles = ["owner", "admin", "member", "viewer"];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: `Invalid role. Must be one of [${validRoles.join(", ")}]` });
  }

  // Find or create user
  let user = db.table("users").findOne({ email: email.trim().toLowerCase() });
  if (!user) {
    user = db.table("users").insert({
      email: email.trim().toLowerCase(),
      name: email.split("@")[0],
      role: "member",
      status: "active",
      passwordHash: "invited_user",
    });
  }

  // Check existing membership
  const existing = db.table("workspace_members").findOne({ workspaceId: id, userId: user.id });
  if (existing) {
    return res.status(400).json({ error: "User is already a member of this workspace" });
  }

  const member = db.table("workspace_members").insert({
    workspaceId: id,
    userId: user.id,
    role,
  });

  logAudit("member_added", "user", user.id, { workspaceId: id, role }, req);

  res.status(201).json({
    success: true,
    member: {
      ...member,
      userName: user.name,
      userEmail: user.email,
    },
  });
});

/**
 * PATCH /api/workspaces/:id/members/:memberId
 * Updates member role (Requires Owner or Admin role)
 */
router.patch("/:id/members/:memberId", requireWorkspaceRole(["owner", "admin"]), (req, res) => {
  const { id, memberId } = req.params;
  const { role } = req.body || {};

  const validRoles = ["owner", "admin", "member", "viewer"];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(", ")}` });
  }

  const member = db.table("workspace_members").findById(memberId);
  if (!member || member.workspaceId !== id) {
    return res.status(404).json({ error: "Workspace member not found" });
  }

  const updated = db.table("workspace_members").update(memberId, { role });
  logAudit("permission_changed", "workspace_member", memberId, { newRole: role }, req);

  res.json({ success: true, member: updated });
});

/**
 * DELETE /api/workspaces/:id/members/:memberId
 * Removes a member from workspace
 */
router.delete("/:id/members/:memberId", requireWorkspaceRole(["owner", "admin"]), (req, res) => {
  const { id, memberId } = req.params;
  const member = db.table("workspace_members").findById(memberId);
  if (!member || member.workspaceId !== id) {
    return res.status(404).json({ error: "Member not found in workspace" });
  }

  db.table("workspace_members").delete(memberId, true);
  logAudit("member_removed", "workspace_member", memberId, { workspaceId: id }, req);

  res.json({ success: true });
});

module.exports = router;
