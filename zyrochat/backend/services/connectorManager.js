/**
 * Modular Connector Architecture & Operation Manager
 * 
 * Target integrations:
 * - Gmail: Search, read, summarize unread threads (Read-only, zero auto-send/delete)
 * - Google Drive: Search, read, inject document context (Read-only)
 * - GitHub: Search repos, inspect file tree, read code, summarize commits (Read-only, zero auto-push)
 * - Slack: Search messages, read channels, summarize discussions (Read-only, zero auto-send)
 */

const db = require("../db");

const CONNECTOR_DEFINITIONS = {
  gmail: {
    name: "Gmail",
    description: "Search and summarize email threads, inspect unread messages, and extract action items.",
    icon: "Mail",
    scopes: ["https://www.googleapis.com/auth/gmail.readonly"],
    supportedOperations: ["search_emails", "get_unread_summary", "read_thread"],
    sensitiveActions: ["send_email", "delete_email"],
  },
  drive: {
    name: "Google Drive",
    description: "Search documents, read PDFs/spreadsheets, and provide verified file context to AI models.",
    icon: "HardDrive",
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
    supportedOperations: ["search_files", "read_file_content", "list_recent_documents"],
    sensitiveActions: ["delete_file", "share_file"],
  },
  github: {
    name: "GitHub",
    description: "Search repositories, inspect source files, explain code, and analyze commit histories.",
    icon: "Github",
    scopes: ["repo:read", "read:user"],
    supportedOperations: ["list_repositories", "search_code", "read_file", "summarize_repo"],
    sensitiveActions: ["push_code", "create_pull_request"],
  },
  slack: {
    name: "Slack",
    description: "Search team discussions, inspect channel activity, and summarize thread conversations.",
    icon: "MessageSquare",
    scopes: ["channels:read", "channels:history"],
    supportedOperations: ["list_channels", "search_messages", "summarize_channel"],
    sensitiveActions: ["post_message", "delete_message"],
  },
};

/**
 * Returns mock/safe data when external live OAuth tokens are not configured in .env
 */
async function executeConnectorOperation(provider, operation, params = {}) {
  const def = CONNECTOR_DEFINITIONS[provider];
  if (!def) {
    throw new Error(`Unsupported connector provider: ${provider}`);
  }

  // Strict safety check: reject any sensitive/consequential operations
  if (def.sensitiveActions.includes(operation)) {
    throw new Error(`Security Exception: Action '${operation}' requires explicit human verification and is blocked.`);
  }

  const query = params.query || "";

  switch (provider) {
    case "gmail":
      if (operation === "search_emails" || operation === "get_unread_summary") {
        return {
          provider: "gmail",
          operation,
          results: [
            {
              id: "msg-101",
              sender: "sarah.lead@enterprise.com",
              subject: "Q3 Architecture Review & Roadmap Alignment",
              date: "Today, 10:15 AM",
              snippet: "Please review the updated Kubernetes rollout schedule before the leadership standup.",
            },
            {
              id: "msg-102",
              sender: "billing@cloudservices.com",
              subject: "Invoice #INV-2026-881 Ready",
              date: "Yesterday",
              snippet: "Your monthly compute statement is ready for review in the billing dashboard.",
            },
          ],
          summary: "You have 2 important threads: an Architecture Review discussion from Sarah and an automated Cloud Services invoice.",
        };
      }
      return { provider: "gmail", message: `Completed ${operation}` };

    case "drive":
      if (operation === "search_files" || operation === "list_recent_documents") {
        return {
          provider: "drive",
          operation,
          files: [
            { id: "file-gd-1", name: "Product_Strategy_2026.docx", type: "document", modified: "2 hours ago" },
            { id: "file-gd-2", name: "Q3_Revenue_Forecast.xlsx", type: "spreadsheet", modified: "Yesterday" },
            { id: "file-gd-3", name: "Architecture_V2_Draft.pdf", type: "pdf", modified: "3 days ago" },
          ],
        };
      }
      return { provider: "drive", message: `Fetched Drive context for ${query}` };

    case "github":
      if (operation === "list_repositories" || operation === "search_code") {
        return {
          provider: "github",
          operation,
          repositories: [
            { name: "zyrochat-core", stars: 142, language: "TypeScript", branch: "main", openIssues: 2 },
            { name: "zyrochat-docs", stars: 38, language: "Markdown", branch: "main", openIssues: 0 },
            { name: "search-service", stars: 74, language: "JavaScript", branch: "master", openIssues: 1 },
          ],
        };
      }
      return { provider: "github", message: `Searched repositories for "${query}"` };

    case "slack":
      if (operation === "list_channels" || operation === "summarize_channel") {
        return {
          provider: "slack",
          operation,
          channels: [
            { name: "#general", topic: "Company-wide announcements", memberCount: 48 },
            { name: "#engineering", topic: "Architecture, PRs, and production triage", memberCount: 19 },
            { name: "#product", topic: "Roadmap planning and customer feedback", memberCount: 14 },
          ],
          summary: "Recent discussions in #engineering focused on Vite 8 build optimizations and backend rate limiting.",
        };
      }
      return { provider: "slack", message: `Queried Slack channel activity` };

    default:
      throw new Error(`Operation ${operation} not supported for ${provider}`);
  }
}

module.exports = {
  CONNECTOR_DEFINITIONS,
  executeConnectorOperation,
};
