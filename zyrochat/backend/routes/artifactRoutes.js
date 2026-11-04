/**
 * Artifact Management Routes for ZyroChat
 * 
 * Provides:
 * - CRUD operations for workspace artifacts
 * - Version tracking and history
 * - Version restoration
 * - Strict User Authorization checks (User A cannot access User B's artifacts)
 */

const express = require("express");
const router = express.Router();
const db = require("../db");
const { logAudit } = require("../services/auditService");

/**
 * GET /api/artifacts
 * Retrieves artifacts accessible to the authenticated user.
 */
router.get("/", (req, res) => {
  try {
    const userId = req.user?.id || "usr-admin";
    const workspaceId = req.query.workspaceId || "ws-default";

    // Retrieve user's artifacts or artifacts in user's workspace
    const userArtifacts = db.table("artifacts").find((art) => {
      if (req.user?.role === "admin") return true;
      return art.userId === userId;
    });

    // Populate versions for each artifact
    const populated = userArtifacts.map((art) => {
      const versions = db
        .table("artifact_versions")
        .find({ artifactId: art.id })
        .sort((a, b) => (b.version || 0) - (a.version || 0));
      return {
        ...art,
        versions: versions.length > 0 ? versions : [
          {
            version: art.version || 1,
            content: art.content,
            updatedAt: art.updatedAt || art.createdAt,
            summary: "Initial creation",
            lineCount: art.lineCount || 0,
            sizeBytes: art.sizeBytes || 0,
          }
        ],
      };
    });

    res.json({ artifacts: populated });
  } catch (err) {
    console.error("Failed to list artifacts:", err);
    res.status(500).json({ error: "Failed to list artifacts" });
  }
});

/**
 * POST /api/artifacts
 * Creates or updates an artifact with version management
 */
router.post("/", (req, res) => {
  try {
    const userId = req.user?.id || "usr-admin";
    const workspaceId = req.body?.workspaceId || "ws-default";
    const {
      id,
      title,
      filename,
      type,
      content,
      language,
      version = 1,
      versions,
      summary = "Updated artifact",
    } = req.body || {};

    if (!content && content !== "") {
      return res.status(400).json({ error: "Artifact content is required" });
    }

    const now = Date.now();
    const lineCount = typeof content === "string" ? content.split("\n").length : 0;
    const sizeBytes = Buffer.byteLength(content || "", "utf8");
    const targetId = id || `art-${now}-${Math.random().toString(36).slice(2, 8)}`;

    // Check if artifact already exists
    const existing = db.table("artifacts").findById(targetId);

    if (existing) {
      // Authorization check: User must own the artifact or be admin
      if (req.user?.role !== "admin" && existing.userId !== userId) {
        return res.status(403).json({ error: "Forbidden: You do not have permission to modify this artifact." });
      }

      const isChanged = existing.content !== content;
      const nextVersion = isChanged ? (existing.version || 1) + 1 : (existing.version || 1);

      const updated = db.table("artifacts").update(targetId, {
        title: title || existing.title,
        filename: filename || existing.filename,
        type: type || existing.type,
        content,
        language: language || existing.language,
        sizeBytes,
        lineCount,
        version: nextVersion,
        updatedAt: now,
      });

      // If content changed, record new version
      if (isChanged) {
        db.table("artifact_versions").insert({
          artifactId: targetId,
          userId,
          version: nextVersion,
          content,
          summary,
          lineCount,
          sizeBytes,
          createdAt: now,
        });
      }

      const allVersions = db
        .table("artifact_versions")
        .find({ artifactId: targetId })
        .sort((a, b) => (b.version || 0) - (a.version || 0));

      return res.json({
        success: true,
        artifact: {
          ...updated,
          versions: allVersions,
        },
      });
    }

    // Creating a new artifact
    const created = db.table("artifacts").insert({
      id: targetId,
      userId,
      workspaceId,
      title: title || filename || "Untitled Artifact",
      filename: filename || "document.txt",
      type: type || "code",
      content,
      language: (language || "text").toLowerCase(),
      sizeBytes,
      lineCount,
      version: 1,
      createdAt: now,
      updatedAt: now,
    });

    // Record version 1
    const v1 = db.table("artifact_versions").insert({
      artifactId: targetId,
      userId,
      version: 1,
      content,
      summary: summary || "Initial generation",
      lineCount,
      sizeBytes,
      createdAt: now,
    });

    try {
      logAudit("artifact_created", "artifact", targetId, { filename: created.filename }, req);
    } catch (e) {
      // Ignore
    }

    res.status(201).json({
      success: true,
      artifact: {
        ...created,
        versions: [v1],
      },
    });
  } catch (err) {
    console.error("Failed to save artifact:", err);
    res.status(500).json({ error: "Internal server error while saving artifact" });
  }
});

/**
 * GET /api/artifacts/:id
 * Fetches a single artifact with version history
 */
router.get("/:id", (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || "usr-admin";

    const artifact = db.table("artifacts").findById(id);
    if (!artifact) {
      return res.status(404).json({ error: "Artifact not found" });
    }

    // Security check: User must own the artifact or be admin
    if (req.user?.role !== "admin" && artifact.userId !== userId) {
      return res.status(403).json({ error: "Forbidden: You do not have access to this artifact." });
    }

    const versions = db
      .table("artifact_versions")
      .find({ artifactId: id })
      .sort((a, b) => (b.version || 0) - (a.version || 0));

    res.json({
      artifact: {
        ...artifact,
        versions: versions.length > 0 ? versions : [
          {
            version: artifact.version || 1,
            content: artifact.content,
            updatedAt: artifact.updatedAt,
            summary: "Initial creation",
            lineCount: artifact.lineCount,
            sizeBytes: artifact.sizeBytes,
          }
        ],
      },
    });
  } catch (err) {
    console.error("Failed to fetch artifact:", err);
    res.status(500).json({ error: "Failed to fetch artifact" });
  }
});

/**
 * POST /api/artifacts/:id/restore
 * Restores an artifact to a previous version number
 */
router.post("/:id/restore", (req, res) => {
  try {
    const { id } = req.params;
    const { version } = req.body || {};
    const userId = req.user?.id || "usr-admin";

    if (!version || typeof version !== "number") {
      return res.status(400).json({ error: "Valid target version number is required" });
    }

    const artifact = db.table("artifacts").findById(id);
    if (!artifact) {
      return res.status(404).json({ error: "Artifact not found" });
    }

    // Security check
    if (req.user?.role !== "admin" && artifact.userId !== userId) {
      return res.status(403).json({ error: "Forbidden: You do not have permission to restore this artifact." });
    }

    const targetVersion = db
      .table("artifact_versions")
      .findOne({ artifactId: id, version });

    if (!targetVersion) {
      return res.status(404).json({ error: `Version ${version} not found for this artifact.` });
    }

    const now = Date.now();
    const nextVersionNum = (artifact.version || 1) + 1;
    const lineCount = targetVersion.content.split("\n").length;
    const sizeBytes = Buffer.byteLength(targetVersion.content, "utf8");

    // Update artifact with restored content and increment version
    const updated = db.table("artifacts").update(id, {
      content: targetVersion.content,
      version: nextVersionNum,
      lineCount,
      sizeBytes,
      updatedAt: now,
    });

    // Record as new version
    db.table("artifact_versions").insert({
      artifactId: id,
      userId,
      version: nextVersionNum,
      content: targetVersion.content,
      summary: `Restored from version ${version}`,
      lineCount,
      sizeBytes,
      createdAt: now,
    });

    const allVersions = db
      .table("artifact_versions")
      .find({ artifactId: id })
      .sort((a, b) => (b.version || 0) - (a.version || 0));

    res.json({
      success: true,
      artifact: {
        ...updated,
        versions: allVersions,
      },
    });
  } catch (err) {
    console.error("Failed to restore artifact version:", err);
    res.status(500).json({ error: "Failed to restore artifact version" });
  }
});

/**
 * DELETE /api/artifacts/:id
 * Deletes an artifact and its associated versions
 */
router.delete("/:id", (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || "usr-admin";

    const artifact = db.table("artifacts").findById(id);
    if (!artifact) {
      return res.status(404).json({ error: "Artifact not found" });
    }

    // Security check
    if (req.user?.role !== "admin" && artifact.userId !== userId) {
      return res.status(403).json({ error: "Forbidden: You cannot delete this artifact." });
    }

    db.table("artifacts").delete(id, true);
    const versions = db.table("artifact_versions").find({ artifactId: id });
    for (const v of versions) {
      db.table("artifact_versions").delete(v.id, true);
    }

    res.json({ success: true, message: "Artifact deleted successfully" });
  } catch (err) {
    console.error("Failed to delete artifact:", err);
    res.status(500).json({ error: "Failed to delete artifact" });
  }
});

module.exports = router;