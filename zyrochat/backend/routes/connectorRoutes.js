/**
 * App Connectors REST API Routes
 */

const express = require("express");
const router = express.Router();
const db = require("../db");
const { CONNECTOR_DEFINITIONS, executeConnectorOperation } = require("../services/connectorManager");
const { logAudit } = require("../services/auditService");

/**
 * GET /api/connectors
 * Returns all connector configurations and active statuses
 */
router.get("/", (req, res) => {
  const userId = req.user?.id || "usr-admin";
  const userConnectors = db.table("connectors").find({ userId });

  const response = Object.entries(CONNECTOR_DEFINITIONS).map(([key, def]) => {
    const existing = userConnectors.find((c) => c.provider === key);
    return {
      provider: key,
      ...def,
      status: existing ? existing.status : "not_connected",
      accountName: existing?.accountName || "",
      accountEmail: existing?.accountEmail || "",
      connectedAt: existing?.createdAt || null,
      lastSync: existing?.metadata?.lastSync || null,
    };
  });

  res.json({ connectors: response });
});

/**
 * POST /api/connectors/:provider/connect
 * Connects an external service
 */
router.post("/:provider/connect", (req, res) => {
  const { provider } = req.params;
  const def = CONNECTOR_DEFINITIONS[provider];
  if (!def) {
    return res.status(404).json({ error: "Unsupported connector" });
  }

  const userId = req.user?.id || "usr-admin";
  const existing = db.table("connectors").findOne({ userId, provider });

  let connectorRecord = null;
  if (existing) {
    connectorRecord = db.table("connectors").update(existing.id, {
      status: "connected",
      metadata: { lastSync: Date.now() },
    });
  } else {
    connectorRecord = db.table("connectors").insert({
      userId,
      provider,
      status: "connected",
      accountName: `${def.name} Account`,
      accountEmail: req.user?.email || "user@zyrochat.local",
      scopes: def.scopes,
      metadata: { lastSync: Date.now() },
    });
  }

  logAudit("connector_connected", "connector", provider, { provider }, req);

  res.json({ success: true, connector: connectorRecord });
});

/**
 * POST /api/connectors/:provider/disconnect
 * Disconnects an external service
 */
router.post("/:provider/disconnect", (req, res) => {
  const { provider } = req.params;
  const userId = req.user?.id || "usr-admin";

  const existing = db.table("connectors").findOne({ userId, provider });
  if (existing) {
    db.table("connectors").update(existing.id, {
      status: "not_connected",
    });
  }

  logAudit("connector_disconnected", "connector", provider, { provider }, req);

  res.json({ success: true });
});

/**
 * POST /api/connectors/:provider/execute
 * Executes a safe read-only connector action
 */
router.post("/:provider/execute", async (req, res) => {
  const { provider } = req.params;
  const { operation, params = {} } = req.body || {};

  try {
    const result = await executeConnectorOperation(provider, operation, params);
    res.json({ success: true, result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
