/**
 * AI Workflow Builder REST API Routes
 */

const express = require("express");
const router = express.Router();
const db = require("../db");
const { runWorkflow } = require("../services/workflowEngine");
const { logAudit } = require("../services/auditService");

/**
 * GET /api/workflows
 * Lists all workflows for the active workspace
 */
router.get("/", (req, res) => {
  const workspaceId = req.query.workspaceId || "ws-default";
  const workflows = db.table("workflows").find({ workspaceId });
  res.json({ workflows });
});

/**
 * POST /api/workflows
 * Creates a new visual workflow
 */
router.post("/", (req, res) => {
  const { name, description = "", nodes = [], edges = [], workspaceId = "ws-default" } = req.body || {};

  if (!name || typeof name !== "string") {
    return res.status(400).json({ error: "Workflow name is required" });
  }

  const wf = db.table("workflows").insert({
    workspaceId,
    name: name.trim(),
    description: description.trim(),
    nodes,
    edges,
    status: "active",
    createdBy: req.user?.id || "usr-admin",
  });

  logAudit("workflow_created", "workflow", wf.id, { name: wf.name }, req);

  res.status(201).json({ success: true, workflow: wf });
});

/**
 * GET /api/workflows/:id
 * Retrieves a workflow by ID
 */
router.get("/:id", (req, res) => {
  const { id } = req.params;
  const wf = db.table("workflows").findById(id);
  if (!wf) {
    return res.status(404).json({ error: "Workflow not found" });
  }
  res.json({ workflow: wf });
});

/**
 * PUT /api/workflows/:id
 * Updates an existing workflow
 */
router.put("/:id", (req, res) => {
  const { id } = req.params;
  const { name, description, nodes, edges, status } = req.body || {};

  const updates = {};
  if (name) updates.name = name.trim();
  if (description !== undefined) updates.description = description.trim();
  if (nodes) updates.nodes = nodes;
  if (edges) updates.edges = edges;
  if (status) updates.status = status;

  const updated = db.table("workflows").update(id, updates);
  if (!updated) {
    return res.status(404).json({ error: "Workflow not found" });
  }

  res.json({ success: true, workflow: updated });
});

/**
 * POST /api/workflows/:id/duplicate
 * Duplicates a workflow
 */
router.post("/:id/duplicate", (req, res) => {
  const { id } = req.params;
  const original = db.table("workflows").findById(id);
  if (!original) {
    return res.status(404).json({ error: "Original workflow not found" });
  }

  const duplicated = db.table("workflows").insert({
    workspaceId: original.workspaceId,
    name: `${original.name} (Copy)`,
    description: original.description,
    nodes: original.nodes,
    edges: original.edges,
    status: "draft",
    createdBy: req.user?.id || "usr-admin",
  });

  res.status(201).json({ success: true, workflow: duplicated });
});

/**
 * POST /api/workflows/:id/run
 * Executes a workflow with user inputs
 */
router.post("/:id/run", async (req, res) => {
  const { id } = req.params;
  const { inputs = {} } = req.body || {};

  const wf = db.table("workflows").findById(id);
  if (!wf) {
    return res.status(404).json({ error: "Workflow not found" });
  }

  if (wf.status === "paused") {
    return res.status(400).json({ error: "Workflow is paused and cannot be executed" });
  }

  try {
    const executionResult = await runWorkflow(wf, inputs);

    // Save run record in database
    const runRecord = db.table("workflow_runs").insert({
      workflowId: id,
      status: executionResult.success ? "completed" : "failed",
      inputs,
      outputs: executionResult.outputs,
      logs: executionResult.logs,
      durationMs: executionResult.durationMs,
    });

    logAudit("workflow_executed", "workflow", id, { success: executionResult.success }, req);

    res.json({
      success: executionResult.success,
      runId: runRecord.id,
      outputs: executionResult.outputs,
      logs: executionResult.logs,
      durationMs: executionResult.durationMs,
    });
  } catch (error) {
    console.error("Workflow run error:", error);
    res.status(500).json({ error: error.message || "Execution failed" });
  }
});

/**
 * DELETE /api/workflows/:id
 * Deletes a workflow
 */
router.delete("/:id", (req, res) => {
  const { id } = req.params;
  const deleted = db.table("workflows").delete(id);
  if (!deleted) {
    return res.status(404).json({ error: "Workflow not found" });
  }
  res.json({ success: true });
});

module.exports = router;
