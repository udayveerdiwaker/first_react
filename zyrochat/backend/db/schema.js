/**
 * ZyroChat Database Schema & Default Seed Data
 */

const DEFAULT_SCHEMAS = {
  users: {
    id: "string",
    email: "string",
    name: "string",
    role: "string", // 'admin' | 'member'
    status: "string", // 'active' | 'suspended'
    passwordHash: "string",
    createdAt: "number",
    updatedAt: "number",
  },
  workspaces: {
    id: "string",
    name: "string",
    description: "string",
    ownerId: "string",
    isDefault: "boolean",
    createdAt: "number",
    updatedAt: "number",
  },
  workspace_members: {
    id: "string",
    workspaceId: "string",
    userId: "string",
    role: "string", // 'owner' | 'admin' | 'member' | 'viewer'
    createdAt: "number",
  },
  projects: {
    id: "string",
    workspaceId: "string",
    name: "string",
    description: "string",
    instructions: "string",
    createdAt: "number",
    updatedAt: "number",
  },
  conversations: {
    id: "string",
    workspaceId: "string",
    userId: "string",
    title: "string",
    parentConversationId: "string", // For branched conversations
    branchedFromMessageId: "string",
    createdAt: "number",
    updatedAt: "number",
  },
  messages: {
    id: "string",
    conversationId: "string",
    role: "string", // 'user' | 'bot'
    text: "string",
    status: "string", // 'pending' | 'sending' | 'streaming' | 'completed' | 'failed' | 'cancelled' | 'interrupted'
    generationId: "string",
    requestId: "string",
    error: "string",
    sources: "array",
    attachments: "array",
    hour: "string", // Target/scheduled time (e.g. "09:00", "14:30")
    timezone: "string", // Client/user timezone (e.g. "Asia/Kolkata", "UTC")
    imageGeneration: "object", // Associated generated image metadata
    createdAt: "number",
    updatedAt: "number",
  },
  image_generations: {
    id: "string",
    userId: "string",
    workspaceId: "string",
    conversationId: "string",
    messageId: "string",
    generationId: "string",
    provider: "string",
    model: "string",
    prompt: "string",
    revisedPrompt: "string",
    aspectRatio: "string",
    quality: "string",
    style: "string",
    status: "string", // 'pending' | 'generating' | 'completed' | 'failed' | 'cancelled'
    imageUrl: "string",
    localPath: "string",
    mimeType: "string",
    width: "number",
    height: "number",
    fileSize: "number",
    error: "string",
    createdAt: "number",
    completedAt: "number",
  },
  generations: {
    id: "string",
    conversationId: "string",
    userMessageId: "string",
    assistantMessageId: "string",
    status: "string", // 'pending' | 'streaming' | 'completed' | 'failed' | 'cancelled' | 'interrupted'
    prompt: "string",
    mode: "string",
    partialText: "string",
    error: "string",
    createdAt: "number",
    updatedAt: "number",
  },
  knowledge_bases: {
    id: "string",
    workspaceId: "string",
    name: "string",
    description: "string",
    category: "string", // 'Company' | 'College' | 'Project' | 'Personal' | 'Custom'
    documentCount: "number",
    createdAt: "number",
    updatedAt: "number",
  },
  knowledge_documents: {
    id: "string",
    knowledgeBaseId: "string",
    title: "string",
    fileName: "string",
    fileSize: "number",
    mimeType: "string",
    chunkCount: "number",
    isIndexed: "boolean",
    createdAt: "number",
  },
  knowledge_chunks: {
    id: "string",
    documentId: "string",
    knowledgeBaseId: "string",
    chunkIndex: "number",
    content: "string",
    tokenCount: "number",
    pageNumber: "number",
    section: "string",
    createdAt: "number",
  },
  workflows: {
    id: "string",
    workspaceId: "string",
    name: "string",
    description: "string",
    nodes: "array",
    edges: "array",
    status: "string", // 'active' | 'paused' | 'draft'
    createdBy: "string",
    createdAt: "number",
    updatedAt: "number",
  },
  workflow_runs: {
    id: "string",
    workflowId: "string",
    status: "string", // 'queued' | 'running' | 'completed' | 'failed'
    inputs: "object",
    outputs: "object",
    logs: "array",
    durationMs: "number",
    createdAt: "number",
  },
  connectors: {
    id: "string",
    userId: "string",
    provider: "string", // 'gmail' | 'drive' | 'github' | 'slack'
    status: "string", // 'connected' | 'not_connected'
    accountName: "string",
    accountEmail: "string",
    scopes: "array",
    metadata: "object",
    createdAt: "number",
    updatedAt: "number",
  },
  research_sessions: {
    id: "string",
    userId: "string",
    topic: "string",
    status: "string", // 'planning' | 'searching' | 'analyzing' | 'completed' | 'failed'
    plan: "array",
    sources: "array",
    findings: "array",
    report: "string",
    progress: "number",
    createdAt: "number",
    updatedAt: "number",
  },
  usage_events: {
    id: "string",
    userId: "string",
    workspaceId: "string",
    type: "string", // 'chat' | 'research' | 'workflow' | 'search' | 'tool'
    model: "string",
    inputTokens: "number",
    outputTokens: "number",
    estimatedCost: "number",
    timestamp: "number",
  },
  audit_logs: {
    id: "string",
    userId: "string",
    workspaceId: "string",
    action: "string",
    targetType: "string",
    targetId: "string",
    details: "object",
    ip: "string",
    timestamp: "number",
  },
  feedback: {
    id: "string",
    userId: "string",
    conversationId: "string",
    messageIndex: "number",
    rating: "number", // 1 for helpful, -1 for unhelpful
    category: "string",
    comment: "string",
    timestamp: "number",
  },
  artifacts: {
    id: "string",
    userId: "string",
    workspaceId: "string",
    title: "string",
    filename: "string",
    type: "string", // 'html' | 'code' | 'markdown' | 'data'
    content: "string",
    language: "string",
    sizeBytes: "number",
    lineCount: "number",
    version: "number",
    createdAt: "number",
    updatedAt: "number",
  },
  artifact_versions: {
    id: "string",
    artifactId: "string",
    userId: "string",
    version: "number",
    content: "string",
    summary: "string",
    lineCount: "number",
    sizeBytes: "number",
    createdAt: "number",
  },
  system_errors: {
    id: "string",
    errorId: "string",
    service: "string",
    endpoint: "string",
    message: "string",
    stack: "string",
    timestamp: "number",
  },
};

/**
 * Returns default seed data for initial setup
 */
function getInitialSeedData() {
  const now = Date.now();
  const defaultWorkspaceId = "ws-default";
  const defaultAdminId = "usr-admin";

  return {
    users: [
      {
        id: defaultAdminId,
        email: "admin@zyrochat.local",
        name: "ZyroChat Administrator",
        role: "admin",
        status: "active",
        passwordHash: "zyrochat_admin_seed",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "usr-member-1",
        email: "alex@zyrochat.local",
        name: "Alex Rivera",
        role: "member",
        status: "active",
        passwordHash: "zyrochat_member_seed",
        createdAt: now,
        updatedAt: now,
      }
    ],
    workspaces: [
      {
        id: defaultWorkspaceId,
        name: "Main Workspace",
        description: "Default collaborative enterprise workspace for ZyroChat.",
        ownerId: defaultAdminId,
        isDefault: true,
        createdAt: now,
        updatedAt: now,
      },
    ],
    workspace_members: [
      {
        id: "wsm-1",
        workspaceId: defaultWorkspaceId,
        userId: defaultAdminId,
        role: "owner",
        createdAt: now,
      },
      {
        id: "wsm-2",
        workspaceId: defaultWorkspaceId,
        userId: "usr-member-1",
        role: "member",
        createdAt: now,
      }
    ],
    projects: [],
    conversations: [],
    messages: [],
    knowledge_bases: [
      {
        id: "kb-company-policy",
        workspaceId: defaultWorkspaceId,
        name: "Company Knowledge",
        description: "Official policies, onboarding handbook, and engineering architecture documentation.",
        category: "Company",
        documentCount: 2,
        createdAt: now - 86400000 * 2,
        updatedAt: now - 86400000,
      },
      {
        id: "kb-tech-guidelines",
        workspaceId: defaultWorkspaceId,
        name: "Engineering Guidelines",
        description: "Coding standards, security checklist, and deployment protocols.",
        category: "Project",
        documentCount: 1,
        createdAt: now - 86400000,
        updatedAt: now,
      }
    ],
    knowledge_documents: [
      {
        id: "doc-1",
        knowledgeBaseId: "kb-company-policy",
        title: "Company Security & Remote Work Policy",
        fileName: "security_policy_2026.pdf",
        fileSize: 245000,
        mimeType: "application/pdf",
        chunkCount: 3,
        isIndexed: true,
        createdAt: now - 86400000 * 2,
      },
      {
        id: "doc-2",
        knowledgeBaseId: "kb-company-policy",
        title: "Employee Onboarding & Benefits Guide",
        fileName: "employee_handbook.docx",
        fileSize: 184000,
        mimeType: "application/docx",
        chunkCount: 2,
        isIndexed: true,
        createdAt: now - 86400000,
      },
      {
        id: "doc-3",
        knowledgeBaseId: "kb-tech-guidelines",
        title: "Engineering Best Practices & TypeScript Protocols",
        fileName: "ts_architecture_guidelines.md",
        fileSize: 95000,
        mimeType: "text/markdown",
        chunkCount: 2,
        isIndexed: true,
        createdAt: now,
      }
    ],
    knowledge_chunks: [
      {
        id: "chunk-1-1",
        documentId: "doc-1",
        knowledgeBaseId: "kb-company-policy",
        chunkIndex: 0,
        content: "Section 1: Data Protection & Password Policy. All employees must configure multi-factor authentication (MFA) across company portals. Passwords must be at least 14 characters long and rotated every 90 days. Never store credentials in plain text files or shared repositories.",
        tokenCount: 46,
        pageNumber: 1,
        section: "Data Protection & Access",
        createdAt: now - 86400000 * 2,
      },
      {
        id: "chunk-1-2",
        documentId: "doc-1",
        knowledgeBaseId: "kb-company-policy",
        chunkIndex: 1,
        content: "Section 2: Remote Work & Device Security. Workspaces and devices accessing internal company repositories must have disk encryption active (FileVault or BitLocker). Public Wi-Fi connections require the company VPN tunnel at all times.",
        tokenCount: 42,
        pageNumber: 2,
        section: "Remote Connectivity",
        createdAt: now - 86400000 * 2,
      },
      {
        id: "chunk-2-1",
        documentId: "doc-2",
        knowledgeBaseId: "kb-company-policy",
        chunkIndex: 0,
        content: "Benefits & Leave Structure: Full-time employees receive 24 days paid time off annually, along with 10 statutory regional holidays. Health insurance includes dental, vision, and comprehensive emergency coverage starting on day one.",
        tokenCount: 41,
        pageNumber: 4,
        section: "Time Off & Healthcare",
        createdAt: now - 86400000,
      },
      {
        id: "chunk-3-1",
        documentId: "doc-3",
        knowledgeBaseId: "kb-tech-guidelines",
        chunkIndex: 0,
        content: "TypeScript Architecture: Strict typing is mandatory across all frontend and backend services. The use of 'any' is forbidden without explicit peer review. Components must handle loading, error, and empty boundary states gracefully.",
        tokenCount: 40,
        pageNumber: 1,
        section: "Coding Standards",
        createdAt: now,
      }
    ],
    workflows: [
      {
        id: "wf-market-brief",
        workspaceId: defaultWorkspaceId,
        name: "Market Research & Executive Briefing",
        description: "Takes an industry query, conducts organic web research, synthesizes competitive findings, and outputs a formatted markdown brief.",
        nodes: [
          { id: "node-1", type: "Input", title: "Target Topic", config: { defaultValue: "Indian EdTech Market 2026" } },
          { id: "node-2", type: "WebSearch", title: "Web Research", config: { maxResults: 5 } },
          { id: "node-3", type: "AI", title: "Synthesize Findings", config: { promptTemplate: "Summarize key market trends and competitors from the search results." } },
          { id: "node-4", type: "Output", title: "Executive Report", config: { format: "markdown" } },
        ],
        edges: [
          { from: "node-1", to: "node-2" },
          { from: "node-2", to: "node-3" },
          { from: "node-3", to: "node-4" },
        ],
        status: "active",
        createdBy: defaultAdminId,
        createdAt: now - 86400000,
        updatedAt: now,
      }
    ],
    workflow_runs: [],
    connectors: [
      {
        id: "conn-gmail",
        userId: defaultAdminId,
        provider: "gmail",
        status: "connected",
        accountName: "Work Email",
        accountEmail: "admin@zyrochat.local",
        scopes: ["https://www.googleapis.com/auth/gmail.readonly"],
        metadata: { unreadCount: 3, lastSync: now - 1800000 },
        createdAt: now - 86400000 * 3,
        updatedAt: now,
      },
      {
        id: "conn-drive",
        userId: defaultAdminId,
        provider: "drive",
        status: "connected",
        accountName: "Google Drive Enterprise",
        accountEmail: "admin@zyrochat.local",
        scopes: ["https://www.googleapis.com/auth/drive.readonly"],
        metadata: { totalFiles: 28, lastSync: now - 3600000 },
        createdAt: now - 86400000 * 3,
        updatedAt: now,
      },
      {
        id: "conn-github",
        userId: defaultAdminId,
        provider: "github",
        status: "connected",
        accountName: "zyrochat-team",
        accountEmail: "dev@zyrochat.local",
        scopes: ["repo:read", "read:user"],
        metadata: { repoCount: 12, lastSync: now - 1200000 },
        createdAt: now - 86400000 * 2,
        updatedAt: now,
      },
      {
        id: "conn-slack",
        userId: defaultAdminId,
        provider: "slack",
        status: "not_connected",
        accountName: "",
        accountEmail: "",
        scopes: ["channels:read", "channels:history"],
        metadata: {},
        createdAt: now - 86400000,
        updatedAt: now,
      }
    ],
    research_sessions: [
      {
        id: "res-edtech-sample",
        userId: defaultAdminId,
        topic: "Top 10 competitors in the Indian education market",
        status: "completed",
        plan: [
          { query: "top EdTech companies India market share 2026", status: "completed" },
          { query: "Byju PhysicsWallah Unacademy market comparison India", status: "completed" },
          { query: "government initiatives Indian online education technology", status: "completed" }
        ],
        sources: [
          { title: "India EdTech Market Analysis & Competitive Landscape", url: "https://example.com/reports/india-edtech", snippet: "Analysis of market consolidation, hybrid tuition models, and valuation metrics across leading Indian learning platforms." },
          { title: "National Education Technology Trends & Growth", url: "https://example.com/trends/education", snippet: "Government push for digital skilling and regional vernacular education initiatives across tier-2 and tier-3 cities." }
        ],
        findings: [
          "PhysicsWallah and hybrid coaching centers lead offline-online blended enrollment in 2026.",
          "Vernacular language learning and vocational skill courses are the fastest-growing market sub-sectors.",
          "Sustainable unit economics and hybrid offline centers have largely replaced hyper-funded acquisition strategies."
        ],
        report: "# Deep Research Report: Indian Education & EdTech Market\n\n## Executive Summary\nThe Indian education sector in 2026 is characterized by a strong shift toward hybrid omnichannel models, test-preparation consolidation, and regional language skilling.\n\n## Key Competitors\n1. **PhysicsWallah (PW)**: Market leader in affordable hybrid coaching.\n2. **Unacademy**: Dominant in civil services and test preparation.\n3. **Allen Digital**: Premier traditional offline player with strong online reach.\n4. **Vedantu**: K-12 interactive live tutoring.\n5. **upGrad**: Higher education and executive upskilling.\n\n## Limitations\nMarket valuation data is subject to private funding round estimates and evolving regulatory disclosure.",
        progress: 100,
        createdAt: now - 86400000 * 2,
        updatedAt: now - 86400000 * 2,
      }
    ],
    usage_events: [
      {
        id: "use-1",
        userId: defaultAdminId,
        workspaceId: defaultWorkspaceId,
        type: "chat",
        model: "openrouter/free",
        inputTokens: 350,
        outputTokens: 420,
        estimatedCost: 0.0,
        timestamp: now - 3600000 * 5,
      },
      {
        id: "use-2",
        userId: defaultAdminId,
        workspaceId: defaultWorkspaceId,
        type: "research",
        model: "openrouter/free",
        inputTokens: 1200,
        outputTokens: 1800,
        estimatedCost: 0.0015,
        timestamp: now - 3600000 * 2,
      }
    ],
    audit_logs: [
      {
        id: "aud-1",
        userId: defaultAdminId,
        workspaceId: defaultWorkspaceId,
        action: "workspace_created",
        targetType: "workspace",
        targetId: defaultWorkspaceId,
        details: { name: "Main Workspace" },
        ip: "127.0.0.1",
        timestamp: now - 86400000 * 3,
      },
      {
        id: "aud-2",
        userId: defaultAdminId,
        workspaceId: defaultWorkspaceId,
        action: "connector_connected",
        targetType: "connector",
        targetId: "conn-github",
        details: { provider: "github" },
        ip: "127.0.0.1",
        timestamp: now - 86400000 * 2,
      }
    ],
    feedback: [],
    artifacts: [],
    artifact_versions: [],
    generations: [],
    system_errors: [],
  };
}

module.exports = {
  DEFAULT_SCHEMAS,
  getInitialSeedData,
};
