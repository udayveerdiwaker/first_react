/**
 * Centralized Server Error Logger and Response Dispatcher
 */

const crypto = require("crypto");
const db = require("../db");

/**
 * Logs an error to the database and dispatches a sanitized user-facing error response.
 * Guarantees zero internal stack traces, DB queries, or secret keys are exposed.
 */
function handleApiError(
  err,
  req,
  res,
  service = "api",
  customUserMessage = "Something went wrong. Please try again.",
  customCode = null
) {
  const errorId = `err-${crypto.randomUUID()}`;
  const now = Date.now();

  const technicalRecord = {
    id: errorId,
    errorId,
    service,
    endpoint: `${req.method} ${req.originalUrl || req.path}`,
    userId: req.user?.id || "anonymous",
    workspaceId: req.body?.workspaceId || req.query?.workspaceId || "ws-default",
    message: err?.message || String(err),
    stack: err?.stack || "",
    timestamp: now,
  };

  try {
    db.table("system_errors").insert(technicalRecord);
  } catch (logErr) {
    console.error("Failed to write to system_errors table:", logErr);
  }

  console.error(`[ERROR ${errorId}] [${service}] ${technicalRecord.endpoint}:`, err?.message || err);

  if (res.headersSent) {
    return;
  }

  const statusCode = Number(err?.status || err?.statusCode) || 500;
  const errorCode =
    customCode ||
    err?.code ||
    (statusCode === 400
      ? "BAD_REQUEST"
      : statusCode === 401
      ? "UNAUTHORIZED"
      : statusCode === 403
      ? "FORBIDDEN"
      : statusCode === 404
      ? "NOT_FOUND"
      : statusCode === 429
      ? "RATE_LIMIT_EXCEEDED"
      : "INTERNAL_SERVER_ERROR");

  const userMessage =
    typeof customUserMessage === "string" && customUserMessage.trim()
      ? customUserMessage
      : "Something went wrong. Please try again.";

  return res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message: userMessage,
      errorId,
    },
    errorId,
    retryAllowed: statusCode !== 400 && statusCode !== 401 && statusCode !== 403 && statusCode !== 404,
    service,
    timestamp: now,
  });
}

module.exports = {
  handleApiError,
};

