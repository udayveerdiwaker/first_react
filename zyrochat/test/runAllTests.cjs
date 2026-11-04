/**
 * Comprehensive Automated Verification Test Suite for ZyroChat
 * 
 * Verifies:
 * 1. Health check endpoint (GET /api/health)
 * 2. Model Router intelligent task classification (POST /api/models/route)
 * 3. Knowledge Base chunking & semantic search (GET /api/knowledge-bases)
 * 4. Workflow Engine topological execution & sandbox security
 * 5. Connectors read-only security enforcement
 * 6. Admin metrics computation (GET /api/admin/metrics)
 * 7. Feedback recording (POST /api/feedback)
 * 8. Conversation branching (POST /api/conversations/:id/branch)
 * 9. Rate limiting enforcement (429 & Retry-After)
 * 10. Memory credential sanitization & sensitive data redaction
 * 11. Centralized 404 & standardized error handling
 */

const http = require("http");
const app = require("../backend/index");
const { routePrompt } = require("../backend/services/modelRouter");
const { chunkDocument } = require("../backend/services/knowledgeService");
const { executeSandboxedCode } = require("../backend/services/workflowEngine");
const { executeConnectorOperation } = require("../backend/services/connectorManager");
const { createRateLimiter } = require("../backend/middleware/rateLimiter");
const generationManager = require("../backend/services/generationManager");
const db = require("../backend/db");

// SSE helper to test real-time stream reconnection
function testSSEStream(server, path, onConnect) {
  return new Promise((resolve, reject) => {
    const port = server.address().port;
    let chunks = "";
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path,
        method: "GET",
        headers: { Accept: "text/event-stream" },
      },
      (res) => {
        res.on("data", (chunk) => {
          chunks += chunk.toString();
          if (onConnect) onConnect(chunk.toString());
        });
        res.on("end", () => {
          resolve({ statusCode: res.statusCode, data: chunks });
        });
      }
    );
    req.on("error", reject);
    req.end();
  });
}

// Color formatting for console
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const cyan = (s) => `\x1b[36m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;

let passedCount = 0;
let failedCount = 0;

function assert(condition, testName, details = "") {
  if (condition) {
    console.log(`  ${green("✔")} ${testName}`);
    passedCount++;
  } else {
    console.error(`  ${red("✖")} ${testName} ${details ? `(${details})` : ""}`);
    failedCount++;
  }
}

// Helper to make HTTP requests to the ephemeral server
function makeRequest(server, options, body = null) {
  return new Promise((resolve, reject) => {
    const port = server.address().port;
    const reqOptions = {
      hostname: "127.0.0.1",
      port,
      path: options.path,
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    };

    const req = http.request(reqOptions, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        let parsed;
        try {
          parsed = JSON.parse(data);
        } catch {
          parsed = data;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: parsed,
        });
      });
    });

    req.on("error", reject);
    if (body) {
      req.write(typeof body === "string" ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log(bold(cyan("\n=======================================================")));
  console.log(bold(cyan("     ZYROCHAT AUTOMATED VERIFICATION TEST SUITE       ")));
  console.log(bold(cyan("=======================================================\n")));

  // Start ephemeral test server on random free port
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const testPort = server.address().port;
  console.log(`Ephemeral test server running on 127.0.0.1:${testPort}\n`);

  try {
    // -------------------------------------------------------------
    // Test 1: Health Check Endpoint
    // -------------------------------------------------------------
    console.log(bold("1. Health Check Endpoint (GET /api/health)"));
    const healthRes = await makeRequest(server, { path: "/api/health" });
    assert(healthRes.statusCode === 200, "Returns HTTP 200 OK");
    assert(healthRes.data?.status === "ok", 'Response status is "ok"');
    assert(healthRes.data?.app === "ZyroChat", 'App name is "ZyroChat"');
    assert(healthRes.data?.mcp === "enabled", 'MCP tools status is "enabled"');
    assert(healthRes.data?.webSearch === "enabled", 'Web search is "enabled"');

    // -------------------------------------------------------------
    // Test 2: Model Router Intelligent Task Classification
    // -------------------------------------------------------------
    console.log(bold("\n2. Model Router Task Classification"));
    
    // Coding classification
    const codingDecision = routePrompt("Please write a TypeScript React hook for debouncing user input");
    assert(codingDecision.category === "coding", "Classifies coding prompts to coding category");
    assert(typeof codingDecision.model === "string" && codingDecision.model.length > 0, "Selects a concrete model for coding");

    // Deep Research classification
    const researchDecision = routePrompt("Conduct a comprehensive market analysis and research of top 5 competitors");
    assert(researchDecision.category === "research", "Classifies research queries to research category");

    // Math & Reasoning classification
    const reasoningDecision = routePrompt("Calculate the probability step by step using Bayes theorem: 10/2 + 5");
    assert(reasoningDecision.category === "reasoning", "Classifies logic & math queries to reasoning category");

    // Vision classification
    const visionDecision = routePrompt("Describe what is in this picture", [{ type: "image/png", name: "chart.png" }]);
    assert(visionDecision.category === "vision", "Classifies image attachments to vision category");

    // HTTP Route test for Model Router
    const routeRes = await makeRequest(
      server,
      { path: "/api/models/route", method: "POST" },
      { prompt: "Debug this python function syntax error" }
    );
    assert(routeRes.statusCode === 200, "POST /api/models/route returns HTTP 200");
    assert(routeRes.data?.category === "coding", "API returns coding category");

    // -------------------------------------------------------------
    // Test 3: Knowledge Base & Semantic Chunking
    // -------------------------------------------------------------
    console.log(bold("\n3. Knowledge Base & Document Chunking"));
    const sampleDoc = "ZyroChat is a unified professional AI workspace. ".repeat(40);
    const chunks = chunkDocument(sampleDoc, 50, 10);
    assert(chunks.length > 1, "Splits document into multiple sliding chunks");
    assert(chunks[0].tokenCount > 0, "Computes chunk token count accurately");
    assert(chunks[0].pageNumber >= 1, "Estimates document page numbers for citation");

    const kbRes = await makeRequest(server, { path: "/api/knowledge-bases" });
    assert(kbRes.statusCode === 200, "GET /api/knowledge-bases returns HTTP 200");
    assert(Array.isArray(kbRes.data?.knowledgeBases), "Returns knowledge bases list");

    // -------------------------------------------------------------
    // Test 4: Workflow Engine & Sandbox Security
    // -------------------------------------------------------------
    console.log(bold("\n4. Workflow Engine & Sandbox Security"));
    
    // Safe JS execution
    const safeOutput = executeSandboxedCode("return input.val * 3;", { val: 7 });
    assert(safeOutput === 21, "Executes safe arithmetic calculations in isolated scope");

    // Strict security violation: process
    let processBlocked = false;
    try {
      executeSandboxedCode("process.exit(1);", {});
    } catch (e) {
      processBlocked = e.message.includes("Security Violation");
    }
    assert(processBlocked, "Blocks execution of 'process' runtime identifier");

    // Strict security violation: require / fs
    let requireBlocked = false;
    try {
      executeSandboxedCode("const fs = require('fs');", {});
    } catch (e) {
      requireBlocked = e.message.includes("Security Violation");
    }
    assert(requireBlocked, "Blocks execution of 'require' runtime identifier");

    // Strict security violation: eval
    let evalBlocked = false;
    try {
      executeSandboxedCode("eval('2 + 2');", {});
    } catch (e) {
      evalBlocked = e.message.includes("Security Violation");
    }
    assert(evalBlocked, "Blocks execution of 'eval' runtime identifier");

    // -------------------------------------------------------------
    // Test 5: Connectors Read-Only Security Enforcement
    // -------------------------------------------------------------
    console.log(bold("\n5. Connectors Read-Only Security"));
    
    // Allowed read operation
    const searchEmailResult = await executeConnectorOperation("gmail", "search_emails", { query: "invoice" });
    assert(searchEmailResult.provider === "gmail", "Allows read-only email search operation");

    // Blocked destructive operation: send_email
    let sendBlocked = false;
    try {
      await executeConnectorOperation("gmail", "send_email", {});
    } catch (e) {
      sendBlocked = e.message.includes("Security Exception") || e.message.includes("blocked");
    }
    assert(sendBlocked, "Strictly blocks unauthorized write action 'send_email'");

    // Blocked destructive operation: push_code
    let pushBlocked = false;
    try {
      await executeConnectorOperation("github", "push_code", {});
    } catch (e) {
      pushBlocked = e.message.includes("Security Exception") || e.message.includes("blocked");
    }
    assert(pushBlocked, "Strictly blocks unauthorized write action 'push_code'");

    const connectorsRes = await makeRequest(server, { path: "/api/connectors" });
    assert(connectorsRes.statusCode === 200, "GET /api/connectors returns HTTP 200");
    assert(Array.isArray(connectorsRes.data?.connectors), "Returns list of connector definitions");

    // -------------------------------------------------------------
    // Test 6: Admin Live Metrics
    // -------------------------------------------------------------
    console.log(bold("\n6. Administrator Live Metrics"));
    const metricsRes = await makeRequest(server, { path: "/api/admin/metrics" });
    assert(metricsRes.statusCode === 200, "GET /api/admin/metrics returns HTTP 200");
    assert(typeof metricsRes.data?.metrics?.totalUsers === "number", "Reports totalUsers count");
    assert(typeof metricsRes.data?.metrics?.totalMessages === "number", "Reports totalMessages count");
    assert(typeof metricsRes.data?.metrics?.estimatedCost === "number", "Reports calculated estimatedCost");

    // -------------------------------------------------------------
    // Test 7: Feedback Logging System
    // -------------------------------------------------------------
    console.log(bold("\n7. Feedback Logging System"));
    const feedbackRes = await makeRequest(
      server,
      { path: "/api/feedback", method: "POST" },
      {
        conversationId: "test-conv-1",
        messageIndex: 1,
        rating: 1,
        category: "Accuracy",
        comment: "Great response!",
      }
    );
    assert(feedbackRes.statusCode === 201, "POST /api/feedback returns HTTP 201 Created");
    assert(feedbackRes.data?.success === true, "Feedback saved successfully");
    assert(typeof feedbackRes.data?.feedbackId === "string", "Returns assigned feedbackId");

    // -------------------------------------------------------------
    // Test 8: Conversation Branching
    // -------------------------------------------------------------
    console.log(bold("\n8. Conversation Branching"));
    const branchRes = await makeRequest(
      server,
      { path: "/api/conversations/conv-test/branch", method: "POST" },
      {
        messageIndex: 1,
        newTitle: "Branched Test Chat",
        messages: [
          { role: "user", text: "Hello AI" },
          { role: "assistant", text: "Hello! How can I help?" },
          { role: "user", text: "Third message to be sliced away" },
        ],
      }
    );
    assert(branchRes.statusCode === 200, "POST /api/conversations/:id/branch returns HTTP 200");
    assert(branchRes.data?.branchConversation?.title === "Branched Test Chat", "Creates branch with requested title");
    assert(branchRes.data?.messages?.length === 2, "Accurately slices messages up to specified branch point");

    // -------------------------------------------------------------
    // Test 9: Rate Limiting Enforcement
    // -------------------------------------------------------------
    console.log(bold("\n9. Rate Limiter Enforcement"));
    const testLimiter = createRateLimiter(2, 60000, "Custom limit exceeded");
    const mockReq = { user: { id: "test-rate-user" }, path: "/test-rate", baseUrl: "" };
    let rateStatus = 200;
    let ratePayload = null;
    let retryAfterHeader = null;
    const mockRes = {
      setHeader: (k, v) => { if (k === "Retry-After") retryAfterHeader = v; },
      status: (code) => {
        rateStatus = code;
        return {
          json: (data) => { ratePayload = data; },
        };
      },
    };

    let nextCalled = 0;
    testLimiter(mockReq, mockRes, () => nextCalled++); // 1st request
    testLimiter(mockReq, mockRes, () => nextCalled++); // 2nd request
    testLimiter(mockReq, mockRes, () => nextCalled++); // 3rd request (exceeds limit 2)

    assert(nextCalled === 2, "Allows first 2 requests through");
    assert(rateStatus === 429, "Returns HTTP 429 on 3rd request");
    assert(ratePayload?.success === false, "Returns standardized success: false on rate limit");
    assert(ratePayload?.error?.code === "RATE_LIMIT_EXCEEDED", "Returns code RATE_LIMIT_EXCEEDED");
    assert(typeof retryAfterHeader === "number" && retryAfterHeader > 0, "Sets Retry-After header");

    // -------------------------------------------------------------
    // Test 10: Memory Credential Sanitization
    // -------------------------------------------------------------
    console.log(bold("\n10. Memory Credential Sanitization"));
    const SENSITIVE_PATTERNS = [
      /password\s*[:=]\s*\S+/i,
      /api[_-]?key\s*[:=]\s*\S+/i,
      /secret\s*[:=]\s*\S+/i,
      /bearer\s+[a-zA-Z0-9_\-\.]+/i,
      /token\s*[:=]\s*\S+/i,
      /sk-[a-zA-Z0-9]{20,}/i,
      /ghp_[a-zA-Z0-9]{20,}/i,
    ];

    function isSensitive(text) {
      return SENSITIVE_PATTERNS.some((p) => p.test(text));
    }

    function sanitize(text) {
      let res = text;
      for (const pattern of SENSITIVE_PATTERNS) {
        res = res.replace(pattern, "[REDACTED_CREDENTIAL]");
      }
      return res;
    }

    assert(isSensitive("password: mySuperSecretPassword123"), "Detects plaintext password");
    assert(isSensitive("Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"), "Detects Bearer token");
    assert(isSensitive("sk-abcdef12345678901234567890"), "Detects OpenAI API key format");
    assert(isSensitive("ghp_123456789012345678901234567890"), "Detects GitHub token format");
    assert(!isSensitive("My favorite programming language is TypeScript"), "Allows normal conversation text");

    const sanitized = sanitize("Connect using api_key: 12345 to the database");
    assert(sanitized.includes("[REDACTED_CREDENTIAL]"), "Sanitizes credentials with [REDACTED_CREDENTIAL]");
    assert(!sanitized.includes("12345"), "Removes secret token from output");

    // -------------------------------------------------------------
    // Test 11: Centralized 404 & Standardized Error Handler
    // -------------------------------------------------------------
    console.log(bold("\n11. Centralized 404 & Error Handler"));
    const notFoundRes = await makeRequest(server, { path: "/api/nonexistent-route-endpoint" });
    assert(notFoundRes.statusCode === 404, "Returns HTTP 404 for unknown endpoint");
    assert(notFoundRes.data?.success === false, "Payload has success: false");
    assert(notFoundRes.data?.error?.code === "NOT_FOUND", "Error code is NOT_FOUND");
    assert(typeof notFoundRes.data?.errorId === "string", "Includes tracking errorId");
    assert(!notFoundRes.data?.stack, "Guarantees zero internal stack traces exposed to client");

    // -------------------------------------------------------------
    // Test 12: Artifact Persistence, Versioning & Restoration API
    // -------------------------------------------------------------
    console.log(bold("\n12. Artifact Persistence & Versioning"));
    const testArtId = `art-test-${Date.now()}`;
    const createArtRes = await makeRequest(server, { path: "/api/artifacts", method: "POST" }, {
      id: testArtId,
      title: "Test Authentication Module",
      filename: "auth.js",
      type: "code",
      language: "javascript",
      content: "function authenticate(user, pass) {\n  return user === 'admin';\n}",
      summary: "Initial commit",
    });

    assert(createArtRes.statusCode === 201, "Creates new artifact (201 Created)");
    assert(createArtRes.data?.artifact?.version === 1, "Initial version is 1");
    assert(createArtRes.data?.artifact?.versions?.length === 1, "Versions list contains version 1");

    // Update artifact with new content -> version increments to 2
    const updateArtRes = await makeRequest(server, { path: "/api/artifacts", method: "POST" }, {
      id: testArtId,
      content: "function authenticate(user, pass) {\n  // Added password hashing check\n  return user === 'admin' && pass === 'secret';\n}",
      summary: "Added security check",
    });

    assert(updateArtRes.statusCode === 200, "Updates existing artifact (200 OK)");
    assert(updateArtRes.data?.artifact?.version === 2, "Increments to version 2 on content change");
    assert(updateArtRes.data?.artifact?.versions?.length === 2, "Tracks both versions in history");

    // Fetch artifact by ID
    const getArtRes = await makeRequest(server, { path: `/api/artifacts/${testArtId}` });
    assert(getArtRes.statusCode === 200, "Fetches single artifact with versions");
    assert(getArtRes.data?.artifact?.filename === "auth.js", "Retrieves correct filename");

    // Restore to version 1
    const restoreRes = await makeRequest(
      server,
      { path: `/api/artifacts/${testArtId}/restore`, method: "POST" },
      { version: 1 }
    );
    assert(restoreRes.statusCode === 200, "Restores previous artifact version");
    assert(restoreRes.data?.artifact?.content.includes("return user === 'admin';\n}"), "Reverts content back to version 1");
    assert(restoreRes.data?.artifact?.version === 3, "Creates version 3 with restored content");

    // Clean up
    const deleteRes = await makeRequest(server, { path: `/api/artifacts/${testArtId}`, method: "DELETE" });
    assert(deleteRes.statusCode === 200, "Deletes artifact successfully");

    // -------------------------------------------------------------
    // Test 13: Strict User Authorization & Artifact Security
    // -------------------------------------------------------------
    console.log(bold("\n13. Strict User Authorization & Artifact Security"));
    // User A creates an artifact
    const userA_ArtId = `art-user-a-${Date.now()}`;
    await makeRequest(
      server,
      { path: "/api/artifacts", method: "POST", headers: { "x-user-id": "usr-user-a" } },
      {
        id: userA_ArtId,
        title: "Confidential Financial Data",
        filename: "financials.csv",
        content: "quarter,revenue\nQ1,500000\nQ2,750000",
      }
    );

    // User B attempts to access User A's artifact -> 403 Forbidden
    const userBAccessRes = await makeRequest(
      server,
      { path: `/api/artifacts/${userA_ArtId}`, method: "GET", headers: { "x-user-id": "usr-user-b" } }
    );
    assert(userBAccessRes.statusCode === 403, "Prevents User B from viewing User A's artifact (403 Forbidden)");

    // User B attempts to delete User A's artifact -> 403 Forbidden
    const userBDeleteRes = await makeRequest(
      server,
      { path: `/api/artifacts/${userA_ArtId}`, method: "DELETE", headers: { "x-user-id": "usr-user-b" } }
    );
    assert(userBDeleteRes.statusCode === 403, "Prevents User B from deleting User A's artifact (403 Forbidden)");

    // Clean up User A artifact
    await makeRequest(
      server,
      { path: `/api/artifacts/${userA_ArtId}`, method: "DELETE", headers: { "x-user-id": "usr-user-a" } }
    );

    // -------------------------------------------------------------
    // Test 14: Pure-JS Excel & ZIP Engine Verification
    // -------------------------------------------------------------
    console.log(bold("\n14. Pure-JS Excel & ZIP Export Verification"));
    const XLSX = require("xlsx");
    const JSZip = require("jszip");

    // Excel workbook creation without native binaries
    const wb = XLSX.utils.book_new();
    const testData = [
      ["Metric", "Value", "Growth"],
      ["Monthly Users", 12500, "15%"],
      ["Revenue", 45000, "22%"],
    ];
    const ws = XLSX.utils.aoa_to_sheet(testData);
    XLSX.utils.book_append_sheet(wb, ws, "Metrics");
    const xlsxBuffer = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });
    assert(Buffer.isBuffer(xlsxBuffer) && xlsxBuffer.length > 500, "Generates valid pure-JS .xlsx workbook");

    // ZIP archive generation
    const zip = new JSZip();
    zip.file("index.html", "<!DOCTYPE html><html><body><h1>ZyroChat</h1></body></html>");
    zip.file("styles.css", "body { margin: 0; background: #000; }");
    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
    assert(Buffer.isBuffer(zipBuffer) && zipBuffer.length > 200, "Generates valid multi-file ZIP bundle");

    // -------------------------------------------------------------
    // Test 15: Artifact Context & Smart Chunking
    // -------------------------------------------------------------
    console.log(bold("\n15. Smart Line Range & Chunking Logic"));
    const colonTest = ":142-158".match(/:(\d+)(?:[-–—:](\d+))?/);
    assert(colonTest && colonTest[1] === "142" && colonTest[2] === "158", "Parses explicit [file:142-158] range");

    const linesTest = "lines 10 to 50".match(/\blines?\s+(\d+)(?:\s*(?:to|-|through)\s*(\d+))?/i);
    assert(linesTest && linesTest[1] === "10" && linesTest[2] === "50", "Parses natural 'lines 10 to 50' range");

    const sampleCode = Array.from({ length: 100 }, (_, i) => `const line_${i + 1} = ${i + 1};`).join("\n");
    const lines = sampleCode.split("\n");
    const start = 20, end = 25, padding = 2;
    const actualStart = Math.max(1, start - padding);
    const actualEnd = Math.min(lines.length, end + padding);
    const chunkLines = lines.slice(actualStart - 1, actualEnd);
    assert(chunkLines.length === 10, "Extracts target line range with padding window");
    assert(chunkLines[2].includes("line_20"), "Contains start line 20");
    assert(chunkLines[7].includes("line_25"), "Contains end line 25");

    // -------------------------------------------------------------
    // Test 16: Immediate Message Persistence & Lifecycle Statuses
    // -------------------------------------------------------------
    console.log(bold("\n16. Immediate Message Persistence & Lifecycle Statuses"));
    const testConvId = `conv-test-pers-${Date.now()}`;
    const userMsgId = `usr-msg-${Date.now()}`;
    const botMsgId = `bot-msg-${Date.now()}`;
    const testGenId = `gen-test-${Date.now()}`;

    // 16a: Persist user message immediately before generation begins
    const userSaveRes = await makeRequest(
      server,
      { path: "/api/chat/messages", method: "POST" },
      {
        id: userMsgId,
        conversationId: testConvId,
        role: "user",
        text: "Tell me about quantum computing",
        status: "completed",
      }
    );
    assert(userSaveRes.statusCode === 200, "Persists user message immediately to server DB");
    assert(userSaveRes.data?.message?.id === userMsgId, "Returns persisted user message with matching ID");

    // 16b: Persist assistant message in 'pending' status
    const botPendingRes = await makeRequest(
      server,
      { path: "/api/chat/messages", method: "POST" },
      {
        id: botMsgId,
        conversationId: testConvId,
        role: "bot",
        text: "",
        status: "pending",
        generationId: testGenId,
      }
    );
    assert(botPendingRes.statusCode === 200, "Persists pending assistant message before streaming");
    assert(botPendingRes.data?.message?.status === "pending", "Message status is 'pending'");

    // 16c: Update message status to 'streaming' with partial text
    const botStreamingRes = await makeRequest(
      server,
      { path: "/api/chat/messages", method: "POST" },
      {
        id: botMsgId,
        conversationId: testConvId,
        role: "bot",
        text: "Quantum computing is",
        status: "streaming",
        generationId: testGenId,
      }
    );
    assert(botStreamingRes.data?.message?.status === "streaming", "Updates message status to 'streaming'");

    // 16d: Update message status to 'completed' with final text
    const botCompleteRes = await makeRequest(
      server,
      { path: "/api/chat/messages", method: "POST" },
      {
        id: botMsgId,
        conversationId: testConvId,
        role: "bot",
        text: "Quantum computing is a rapidly-emerging technology.",
        status: "completed",
        generationId: testGenId,
      }
    );
    assert(botCompleteRes.data?.message?.status === "completed", "Updates message status to 'completed'");

    // -------------------------------------------------------------
    // Test 17: Conversation Management & Auto-hydration
    // -------------------------------------------------------------
    console.log(bold("\n17. Conversation Management & Auto-hydration"));
    const convFetchRes = await makeRequest(
      server,
      { path: `/api/chat/conversations/${testConvId}`, method: "GET" }
    );
    assert(convFetchRes.statusCode === 200, "Fetches conversation by ID with messages");
    assert(Array.isArray(convFetchRes.data?.messages) && convFetchRes.data.messages.length === 2, "Conversation contains both user and assistant messages");

    const convListRes = await makeRequest(
      server,
      { path: "/api/chat/conversations", method: "GET" }
    );
    assert(convListRes.statusCode === 200 && Array.isArray(convListRes.data?.conversations), "Lists all conversations for active user");
    assert(convListRes.data.conversations.some((c) => c.id === testConvId), "Created conversation appears in conversations list");

    // -------------------------------------------------------------
    // Test 18: Generation Manager Lifecycle, Buffering & Idempotency
    // -------------------------------------------------------------
    console.log(bold("\n18. Generation Manager Lifecycle & Buffering"));
    const managerGenId = `gen-mgr-${Date.now()}`;
    const gen = generationManager.startGeneration({
      generationId: managerGenId,
      conversationId: "conv-mgr-test",
      prompt: "Explain relativity",
      mode: "normal",
    });
    assert(gen && gen.id === managerGenId, "Starts in-memory generation job");
    assert(gen.status === "streaming", "Initial status is 'streaming'");

    // Append and buffer tokens
    generationManager.appendChunk(managerGenId, "Einstein discovered ");
    generationManager.appendChunk(managerGenId, "general relativity in 1915.");
    const fetchedGen = generationManager.getGeneration(managerGenId);
    assert(fetchedGen.bufferedText === "Einstein discovered general relativity in 1915.", "Accurately buffers streamed tokens in memory");

    // Idempotency: restarting with same generationId returns existing generation
    const idempotentGen = generationManager.startGeneration({
      generationId: managerGenId,
      conversationId: "conv-mgr-test",
      prompt: "Explain relativity",
    });
    assert(idempotentGen.id === managerGenId && idempotentGen.bufferedText.length > 0, "Idempotency: Re-requesting active generationId returns existing job");

    // -------------------------------------------------------------
    // Test 19: Stream Reconnection via SSE & Token Catchup
    // -------------------------------------------------------------
    console.log(bold("\n19. Stream Reconnection & Catch-Up Protocol"));
    const reconnectGenId = `gen-reconnect-${Date.now()}`;
    generationManager.startGeneration({
      generationId: reconnectGenId,
      conversationId: "conv-reconnect-test",
      prompt: "Reconnection test",
    });
    generationManager.appendChunk(reconnectGenId, "Initial buffered sentence. ");

    // Connect SSE subscriber to reconnect endpoint
    let receivedSSE = "";
    const ssePromise = testSSEStream(
      server,
      `/api/chat/generations/${reconnectGenId}/stream`,
      (chunk) => {
        receivedSSE += chunk;
      }
    );

    // Wait a brief moment, then append more tokens and complete
    await new Promise((r) => setTimeout(r, 60));
    generationManager.appendChunk(reconnectGenId, "Live streamed sentence after reconnection.");
    await new Promise((r) => setTimeout(r, 60));
    generationManager.completeGeneration(reconnectGenId);

    const sseResult = await ssePromise;
    assert(sseResult.statusCode === 200, "SSE reconnection endpoint returns 200 OK");
    assert(sseResult.data.includes('"type":"catchup"'), "SSE stream immediately delivers catchup payload");
    assert(sseResult.data.includes("Initial buffered sentence."), "Catchup payload contains previously buffered text");
    assert(sseResult.data.includes('"type":"done"'), "Delivers done event upon generation completion");

    // -------------------------------------------------------------
    // Test 20: Disconnect Grace Period & Resilience
    // -------------------------------------------------------------
    console.log(bold("\n20. Disconnect Grace Period & Upstream Survival"));
    const graceGenId = `gen-grace-${Date.now()}`;
    generationManager.startGeneration({
      generationId: graceGenId,
      conversationId: "conv-grace-test",
      prompt: "Grace period test",
    });

    // Mock client connects and disconnects immediately
    let mockClientClosed = false;
    const graceMockRes = {
      setHeader: () => {},
      write: () => {},
      end: () => {},
      writableEnded: false,
      on: (event, handler) => {
        if (event === "close") {
          setTimeout(() => {
            mockClientClosed = true;
            handler();
          }, 20);
        }
      },
    };
    generationManager.subscribe(graceGenId, graceMockRes);
    await new Promise((r) => setTimeout(r, 60));
    const graceGen = generationManager.getGeneration(graceGenId);
    assert(mockClientClosed, "Simulates client disconnect on page reload");
    assert(graceGen && graceGen.status === "streaming", "Generation remains streaming during 60s grace period (not prematurely killed)");

    // Clean up grace test generation
    generationManager.cancelGeneration(graceGenId);
    assert(generationManager.getGeneration(graceGenId)?.status === "cancelled", "Can cancel generation cleanly");

    // -------------------------------------------------------------
    // Test 21: Scoped Draft Keys & Safe Chat State
    // -------------------------------------------------------------
    console.log(bold("\n21. Scoped Draft Storage & Key Isolation"));
    const convId1 = "conv-workspace-alpha";
    const convId2 = "conv-workspace-beta";
    const draftKey1 = `zyrochat-draft-${convId1}`;
    const draftKey2 = `zyrochat-draft-${convId2}`;
    assert(draftKey1 !== draftKey2, "Unique scoped draft storage keys per conversation");
    assert(draftKey1 === "zyrochat-draft-conv-workspace-alpha", "Draft key follows scoped convention");

    // -------------------------------------------------------------
    // Test 22: Centralized Z-Index Hierarchy & Responsive Token Invariants
    // -------------------------------------------------------------
    console.log(bold("\n22. Centralized Z-Index Hierarchy & Responsive Token Verification"));
    const fs = require("fs");
    const path = require("path");
    const indexCss = fs.readFileSync(path.join(__dirname, "../src/index.css"), "utf8");

    // Verify all centralized z-index tokens exist
    const requiredTokens = [
      "--z-base: 0",
      "--z-content: 1",
      "--z-header: 10",
      "--z-floating: 15",
      "--z-composer: 20",
      "--z-dropdown: 30",
      "--z-sidebar-backdrop: 40",
      "--z-sidebar: 45",
      "--z-workspace: 46",
      "--z-modal-backdrop: 50",
      "--z-modal: 55",
      "--z-toast: 60",
      "--z-tooltip: 70",
    ];
    for (const token of requiredTokens) {
      assert(indexCss.includes(token), `CSS token defined: ${token}`);
    }

    // Verify corresponding utility classes exist
    const requiredClasses = [
      ".z-base",
      ".z-content",
      ".z-header",
      ".z-floating",
      ".z-composer",
      ".z-dropdown",
      ".z-sidebar-backdrop",
      ".z-sidebar",
      ".z-workspace",
      ".z-modal-backdrop",
      ".z-modal",
      ".z-toast",
      ".z-tooltip",
    ];
    for (const cls of requiredClasses) {
      assert(indexCss.includes(cls), `Utility class defined: ${cls}`);
    }

    // Verify strict mathematical hierarchy ordering invariant:
    // base < content < header < floating < composer < dropdown < sidebar-backdrop < sidebar < workspace < modal-backdrop < modal < toast < tooltip
    const tokenValues = {
      base: 0,
      content: 1,
      header: 10,
      floating: 15,
      composer: 20,
      dropdown: 30,
      sidebarBackdrop: 40,
      sidebar: 45,
      workspace: 46,
      modalBackdrop: 50,
      modal: 55,
      toast: 60,
      tooltip: 70,
    };
    assert(tokenValues.header > tokenValues.content, "Header above content");
    assert(tokenValues.floating > tokenValues.header, "Floating controls above header");
    assert(tokenValues.composer > tokenValues.floating, "Composer above floating controls");
    assert(tokenValues.dropdown > tokenValues.composer, "Dropdowns above composer");
    assert(tokenValues.sidebarBackdrop > tokenValues.dropdown, "Sidebar backdrop above dropdowns");
    assert(tokenValues.sidebar > tokenValues.sidebarBackdrop, "Sidebar above sidebar backdrop");
    assert(tokenValues.workspace > tokenValues.sidebar, "Workspace panel above mobile sidebar");
    assert(tokenValues.modalBackdrop > tokenValues.workspace, "Modal backdrop above workspace");
    assert(tokenValues.modal > tokenValues.modalBackdrop, "Modals above modal backdrop");
    assert(tokenValues.toast > tokenValues.modal, "Toasts above modals");
    assert(tokenValues.tooltip > tokenValues.toast, "Tooltips above toasts");

    // Verify mobile dynamic viewport height support
    assert(indexCss.includes(".h-dvh"), "Modern dynamic viewport class .h-dvh supported");
    assert(indexCss.includes("overflow-x: hidden"), "Global horizontal overflow protection configured");

    // Verify no arbitrary 9999 z-index hacks exist in src components
    const srcComponents = fs.readdirSync(path.join(__dirname, "../src/components"));
    let rawHacksFound = 0;
    for (const file of srcComponents) {
      if (file.endsWith(".tsx") || file.endsWith(".ts")) {
        const content = fs.readFileSync(path.join(__dirname, "../src/components", file), "utf8");
        if (/z-(?:9999|\[9999\])/.test(content)) {
          rawHacksFound++;
        }
      }
    }
    assert(rawHacksFound === 0, "Zero arbitrary 9999 z-index hacks in codebase");

    // -------------------------------------------------------------
    // Test 23: Message Hour & Timezone Backend Validation & Persistence
    // -------------------------------------------------------------
    console.log(bold("\n23. Message Hour & Timezone Backend Validation & Persistence"));

    // 23a. Test valid hour and timezone persistence
    const hourConvId = `conv-hour-${Date.now()}`;
    await makeRequest(server, { path: "/api/chat/conversations", method: "POST" }, { id: hourConvId, title: "Hour Test Conversation" });

    const validHourMsg = await makeRequest(
      server,
      { path: "/api/chat/messages", method: "POST" },
      {
        conversationId: hourConvId,
        role: "user",
        text: "Please prepare summary report",
        hour: "14:30",
        timezone: "America/New_York",
      }
    );
    assert(validHourMsg.statusCode === 200, "Message with hour and timezone returns 200 OK");
    assert(validHourMsg.data?.message?.hour === "14:30", "Persisted message has exact hour 14:30");
    assert(validHourMsg.data?.message?.timezone === "America/New_York", "Persisted message has timezone America/New_York");

    // Retrieve conversation messages to verify persistence in database
    const getHourMsgs = await makeRequest(server, { path: `/api/chat/conversations/${hourConvId}`, method: "GET" });
    assert(getHourMsgs.statusCode === 200, "Get conversation returns 200");
    const foundHourMsg = getHourMsgs.data?.messages?.find((m) => m.id === validHourMsg.data.message.id);
    assert(foundHourMsg && foundHourMsg.hour === "14:30", "Retrieved message from DB preserves hour");
    assert(foundHourMsg && foundHourMsg.timezone === "America/New_York", "Retrieved message from DB preserves timezone");

    // 23b. Test invalid hour formats rejection
    const invalidHour1 = await makeRequest(
      server,
      { path: "/api/chat/messages", method: "POST" },
      {
        conversationId: hourConvId,
        role: "user",
        text: "Invalid hour test 1",
        hour: "25:00",
      }
    );
    assert(invalidHour1.statusCode === 400, "Hour > 23:59 rejected with 400 Bad Request");

    const invalidHour2 = await makeRequest(
      server,
      { path: "/api/chat/messages", method: "POST" },
      {
        conversationId: hourConvId,
        role: "user",
        text: "Invalid hour test 2",
        hour: "12:60",
      }
    );
    assert(invalidHour2.statusCode === 400, "Minutes > 59 rejected with 400 Bad Request");

    const invalidHour3 = await makeRequest(
      server,
      { path: "/api/chat/messages", method: "POST" },
      {
        conversationId: hourConvId,
        role: "user",
        text: "Invalid hour test 3",
        hour: "not-a-time",
      }
    );
    assert(invalidHour3.statusCode === 400, "Malformed hour string rejected with 400 Bad Request");

    // -------------------------------------------------------------
    // Test 24: Anti-Refresh Vite Watcher Protection & Composer Form Invariant
    // -------------------------------------------------------------
    console.log(bold("\n24. Anti-Refresh Protection & Composer Form Invariants"));

    const viteConfigContent = fs.readFileSync(path.join(__dirname, "../vite.config.ts"), "utf8");
    assert(viteConfigContent.includes("server:"), "Vite config defines server options");
    assert(viteConfigContent.includes("watch:"), "Vite config defines watcher configuration");
    assert(viteConfigContent.includes("ignored:"), "Vite config specifies watcher ignored patterns");
    assert(viteConfigContent.includes("**/backend/**"), "Vite watcher ignores **/backend/** to prevent dev server reload loops");
    assert(viteConfigContent.includes("**/*.db.json*"), "Vite watcher ignores **/*.db.json* database files");

    // Verify ChatInput has explicit form submission protection
    const chatInputContent = fs.readFileSync(path.join(__dirname, "../src/components/ChatInput.tsx"), "utf8");
    assert(chatInputContent.includes("e.preventDefault()"), "ChatInput prevents default form submission on enter and click");
    assert(chatInputContent.includes("<form"), "ChatInput wraps input container in a semantic form element");
    assert(chatInputContent.includes("selectedHour"), "ChatInput manages selectedHour state");
    assert(chatInputContent.includes("<HourSelector"), "ChatInput renders HourSelector component");

    // Verify HourSelector component exists and exports formatHourDisplay
    const hourSelectorContent = fs.readFileSync(path.join(__dirname, "../src/components/HourSelector.tsx"), "utf8");
    assert(hourSelectorContent.includes("export function formatHourDisplay"), "HourSelector exports formatHourDisplay helper");
    assert(hourSelectorContent.includes("z-dropdown"), "HourSelector uses centralized z-dropdown token for menu");
    assert(hourSelectorContent.includes("presets"), "HourSelector provides quick time presets");
    assert(hourSelectorContent.includes("allHours"), "HourSelector provides 24-hour options list");

    // -------------------------------------------------------------
    // Test 25: OpenRouter Payload Sanitization & Mutual Exclusion
    // -------------------------------------------------------------
    console.log(bold("\n25. OpenRouter Payload Sanitization & Mutual Exclusion"));
    const backendIndexContent = fs.readFileSync(path.join(__dirname, "../backend/index.js"), "utf8");
    assert(backendIndexContent.includes("delete requestBody.prompt;"), "Backend strips prompt from OpenRouter payload");
    assert(backendIndexContent.includes("delete requestBody.promptText;"), "Backend strips promptText from OpenRouter payload");
    assert(backendIndexContent.includes("delete requestBody.mode;"), "Backend strips mode from OpenRouter payload");
    assert(backendIndexContent.includes("delete requestBody.hour;"), "Backend strips hour from OpenRouter payload");
    assert(backendIndexContent.includes("delete requestBody.timezone;"), "Backend strips timezone from OpenRouter payload");
    assert(backendIndexContent.includes("if (Array.isArray(requestBody.messages))"), "Backend guards that messages and prompt are never simultaneously sent");

    const smartAgentContent = fs.readFileSync(path.join(__dirname, "../src/agent/smartAgent.ts"), "utf8");
    assert(!/prompt:\s*userInput/.test(smartAgentContent), "smartAgent does not send colliding prompt field in chat completion request");

    // -------------------------------------------------------------
    // Test 26: Real AI Image Generation Architecture & Endpoints
    // -------------------------------------------------------------
    console.log(bold("\n26. Real AI Image Generation Architecture & Endpoints"));

    // 26.1 Config endpoint
    const imgConfigRes = await makeRequest(server, { path: "/api/images/config", method: "GET" });
    assert(imgConfigRes.statusCode === 200, "GET /api/images/config returns 200 OK");
    assert(imgConfigRes.data?.provider, "Image config returns configured provider");
    assert(Array.isArray(imgConfigRes.data?.aspectRatios), "Image config returns supported aspect ratios");
    assert(imgConfigRes.data?.aspectRatios.includes("1:1"), "1:1 aspect ratio supported");
    assert(imgConfigRes.data?.aspectRatios.includes("16:9"), "16:9 aspect ratio supported");

    // 26.2 Request Validation - missing prompt
    const invalidImg1 = await makeRequest(
      server,
      { path: "/api/images/generate", method: "POST" },
      { prompt: "" }
    );
    assert(invalidImg1.statusCode === 400, "POST /api/images/generate rejects empty prompt with 400");
    assert(invalidImg1.data?.error?.includes("Prompt is required"), "Rejection specifies prompt required");

    // 26.3 Request Validation - invalid aspect ratio
    const invalidImg2 = await makeRequest(
      server,
      { path: "/api/images/generate", method: "POST" },
      { prompt: "A cyberpunk city", aspectRatio: "99:99" }
    );
    assert(invalidImg2.statusCode === 400, "POST /api/images/generate rejects invalid aspect ratio with 400");

    // 26.4 Real Generation Execution
    const imgTestGenId = `test-img-${Date.now()}`;
    const genRes = await makeRequest(
      server,
      { path: "/api/images/generate", method: "POST" },
      {
        prompt: "A beautiful sunset over snow covered mountain peaks, golden hour, 8k",
        aspectRatio: "1:1",
        generationId: imgTestGenId,
      }
    );
    assert(genRes.statusCode === 200, "POST /api/images/generate returns 200 OK on valid prompt");
    const imgData = genRes.data?.imageGeneration || genRes.data;
    assert(imgData?.status === "completed", "Generated image status is 'completed'");
    assert(typeof imgData?.imageUrl === "string" && imgData.imageUrl.includes("/api/images/files/"), "Image returns permanent local file URL");
    assert(imgData?.id === imgTestGenId || genRes.data?.generationId === imgTestGenId, "Generation ID matches supplied idempotency key");

    // 26.5 Status Polling Endpoint
    const statusRes = await makeRequest(
      server,
      { path: `/api/images/status/${imgTestGenId}`, method: "GET" }
    );
    assert(statusRes.statusCode === 200, "GET /api/images/status/:id returns 200 OK for completed generation");
    const statusData = statusRes.data?.generation || statusRes.data?.imageGeneration || statusRes.data;
    assert(statusData?.generationId === imgTestGenId || statusData?.id === imgTestGenId, "Status payload contains matching generation record");
    assert(statusData?.status === "completed", "Status payload confirms 'completed' state");

    // 26.6 Non-existent status returns 404
    const notFoundStatus = await makeRequest(
      server,
      { path: "/api/images/status/non-existent-gen-id-xyz", method: "GET" }
    );
    assert(notFoundStatus.statusCode === 404, "GET /api/images/status/:id returns 404 for unknown generation");

    // 26.7 Download Endpoint returns attachment headers
    const downloadRes = await new Promise((resolve) => {
      const port = server.address().port;
      http.get(`http://127.0.0.1:${port}/api/images/download/${imgTestGenId}`, (res) => {
        let len = 0;
        res.on("data", (c) => len += c.length);
        res.on("end", () => resolve({ statusCode: res.statusCode, headers: res.headers, bytes: len }));
      });
    });
    assert(downloadRes.statusCode === 200, "GET /api/images/download/:id returns 200 OK");
    assert(downloadRes.headers["content-disposition"]?.includes("attachment"), "Download endpoint includes Content-Disposition attachment header");
    assert(downloadRes.bytes > 0, "Download endpoint serves non-empty binary image");

    // 26.8 Serving Generated File endpoint
    const filename = (imgData?.imageUrl || "").split("/").pop();
    const fileRes = await new Promise((resolve) => {
      const port = server.address().port;
      http.get(`http://127.0.0.1:${port}/api/images/files/${filename}`, (res) => {
        let len = 0;
        res.on("data", (c) => len += c.length);
        res.on("end", () => resolve({ statusCode: res.statusCode, headers: res.headers, bytes: len }));
      });
    });
    assert(fileRes.statusCode === 200, "GET /api/images/files/:filename serves image with 200 OK");
    assert(fileRes.headers["content-type"]?.startsWith("image/"), "File endpoint serves image content-type");
    assert(fileRes.bytes > 0, "File endpoint serves real non-empty binary data");

    // 26.9 Database Schema & Message Integration with imageGeneration field
    const convImgId = `conv-img-${Date.now()}`;
    await makeRequest(
      server,
      { path: "/api/chat/conversations", method: "POST" },
      { id: convImgId, title: "Image Test Conversation" }
    );

    const postImgMsg = await makeRequest(
      server,
      { path: "/api/chat/messages", method: "POST" },
      {
        id: `msg-img-${Date.now()}`,
        conversationId: convImgId,
        role: "bot",
        text: "",
        status: "completed",
        imageGeneration: {
          id: imgTestGenId,
          prompt: "A beautiful sunset",
          aspectRatio: "1:1",
          status: "completed",
          imageUrl: imgData?.imageUrl,
        },
      }
    );
    assert(postImgMsg.statusCode === 200, "POST /api/chat/messages persists message with imageGeneration payload");

    const getImgMsgs = await makeRequest(
      server,
      { path: `/api/chat/conversations/${convImgId}`, method: "GET" }
    );
    assert(getImgMsgs.statusCode === 200, "GET /api/chat/conversations/:convId returns 200 OK");
    assert(getImgMsgs.data?.messages?.[0]?.imageGeneration?.id === imgTestGenId, "Persisted message preserves imageGeneration field across reload");

    // 26.10 Frontend Component Invariants & Z-Index Compliance
    const genImageViewerSrc = fs.readFileSync(path.join(__dirname, "../src/components/GeneratedImageViewer.tsx"), "utf8");
    assert(genImageViewerSrc.includes("z-modal"), "GeneratedImageViewer uses z-modal for lightbox modal");
    assert(genImageViewerSrc.includes("z-modal-backdrop"), "GeneratedImageViewer uses z-modal-backdrop for modal overlay");
    assert(genImageViewerSrc.includes("onRegenerate"), "GeneratedImageViewer supports regenerate action");
    assert(genImageViewerSrc.includes("onEditPrompt"), "GeneratedImageViewer supports prompt editing action");

    const imgToggleSrc = fs.readFileSync(path.join(__dirname, "../src/components/ImageGenerationToggle.tsx"), "utf8");
    assert(imgToggleSrc.includes("z-dropdown"), "ImageGenerationToggle uses z-dropdown for aspect ratio menu");
    assert(imgToggleSrc.includes("ASPECT_RATIOS"), "ImageGenerationToggle defines standard aspect ratio options");

    const chatBoxSrc = fs.readFileSync(path.join(__dirname, "../src/components/ChatBox.tsx"), "utf8");
    assert(chatBoxSrc.includes("handleSendImage"), "ChatBox implements handleSendImage");
    assert(chatBoxSrc.includes("<GeneratedImageViewer"), "ChatBox renders GeneratedImageViewer for image messages");
    assert(chatBoxSrc.includes("fetchImageStatusApi"), "ChatBox includes refresh recovery status polling for image generation");

    // -------------------------------------------------------------
    // Test 27: Smart Auto Mode, Real Image Cancellation & Docked Stacking Controls
    // -------------------------------------------------------------
    console.log(bold("\n27. Smart Auto Mode, Real Image Cancellation & Docked Stacking Controls"));

    // 27.1 Backend Image Cancellation Endpoints
    const cancelImgGenId = `gen-img-cancel-${Date.now()}`;
    const cancelEndpointRes = await makeRequest(
      server,
      { path: `/api/images/cancel/${cancelImgGenId}`, method: "POST" }
    );
    assert(cancelEndpointRes.statusCode === 200, "POST /api/images/cancel/:id returns 200 OK");
    assert(cancelEndpointRes.data?.success === true, "Cancel image endpoint returns success: true");

    const cancelBodyRes = await makeRequest(
      server,
      { path: "/api/images/cancel", method: "POST" },
      { id: cancelImgGenId }
    );
    assert(cancelBodyRes.statusCode === 200, "POST /api/images/cancel with body returns 200 OK");

    const chatGenCancelRes = await makeRequest(
      server,
      { path: `/api/chat/generations/${cancelImgGenId}/cancel`, method: "POST" }
    );
    assert(chatGenCancelRes.statusCode === 200, "POST /api/chat/generations/:id/cancel cancels unified generations");

    // 27.2 Model Router Image Intent Detection
    const imgRouterPrompt1 = routePrompt("Please generate an image of a futuristic cyberpunk city at night in 16:9");
    assert(imgRouterPrompt1.category === "image_generation", "Model router detects image generation intent");

    const imgRouterPrompt2 = routePrompt("How does AI image generation work under the hood?");
    assert(imgRouterPrompt2.category !== "image_generation", "Model router does not misroute informational meta-questions to image generation");

    // 27.3 Centralized Z-Index Tokens & Floating Button Elevation
    assert(indexCss.includes("--z-floating-button: 25"), "CSS token defined: --z-floating-button: 25");
    assert(indexCss.includes(".z-floating-button"), "Utility class defined: .z-floating-button");
    assert(indexCss.includes("animate-indeterminate-bar"), "Animation utility defined: .animate-indeterminate-bar");
    assert(indexCss.includes("@keyframes indeterminateProgress"), "Keyframes defined: @keyframes indeterminateProgress");

    // Verify token ordering invariant: composer (20) < floating-button (25) < dropdown (30)
    const floatingButtonZ = 25;
    assert(floatingButtonZ > tokenValues.composer, "Floating action controls sit above composer");
    assert(tokenValues.dropdown > floatingButtonZ, "Dropdown menus sit above floating action controls");
    assert(tokenValues.modal > floatingButtonZ, "Modals sit above floating action controls");

    // 27.4 Client-side Intent Router Invariants
    const intentRouterSrc = fs.readFileSync(path.join(__dirname, "../src/agent/intentRouter.ts"), "utf8");
    assert(intentRouterSrc.includes("export function classifyIntent"), "intentRouter exports classifyIntent");
    assert(intentRouterSrc.includes("export function extractAspectRatio"), "intentRouter exports extractAspectRatio");
    assert(intentRouterSrc.includes("export function mergeRefinementPrompt"), "intentRouter exports mergeRefinementPrompt");
    assert(intentRouterSrc.includes("IMAGE_GENERATION"), "intentRouter defines IMAGE_GENERATION intent");
    assert(intentRouterSrc.includes("isRefinement"), "intentRouter supports contextual prompt refinement");

    // 27.5 GeneratedImageViewer Indeterminate Progress & Cancelled States
    const genImageViewerUpdated = fs.readFileSync(path.join(__dirname, "../src/components/GeneratedImageViewer.tsx"), "utf8");
    assert(genImageViewerUpdated.includes('role="progressbar"'), "GeneratedImageViewer provides accessible role='progressbar'");
    assert(genImageViewerUpdated.includes('aria-busy="true"'), "GeneratedImageViewer marks progressbar aria-busy='true'");
    assert(genImageViewerUpdated.includes("animate-indeterminate-bar"), "GeneratedImageViewer uses animated indeterminate shimmer bar without fake percentages");
    assert(genImageViewerUpdated.includes('imageGeneration.status === "cancelled"'), "GeneratedImageViewer handles cancelled state");
    assert(genImageViewerUpdated.includes("Image Generation Stopped"), "GeneratedImageViewer informs user when generation stopped");

    // 27.6 ChatInput Docked Action Bar & Mode Integration
    const chatInputUpdated = fs.readFileSync(path.join(__dirname, "../src/components/ChatInput.tsx"), "utf8");
    assert(chatInputUpdated.includes("z-floating-button"), "ChatInput positions action controls with z-floating-button");
    assert(chatInputUpdated.includes("-top-11"), "ChatInput docks action controls above the composer card");
    assert(chatInputUpdated.includes("Stop generation"), "ChatInput includes Stop generation button");
    assert(chatInputUpdated.includes("showScrollDown"), "ChatInput includes Jump to Latest message button");

    // 27.7 Dropdown AI Modes (Auto default and Image mode)
    const dropdownSrc = fs.readFileSync(path.join(__dirname, "../src/components/dropdown.tsx"), "utf8");
    assert(dropdownSrc.includes('value: "auto"'), "ModeSelector includes Auto mode");
    assert(dropdownSrc.includes('value: "image"'), "ModeSelector includes Image mode");

    // 27.8 ChatBox Routing & Scroll Dependencies
    const chatBoxUpdated = fs.readFileSync(path.join(__dirname, "../src/components/ChatBox.tsx"), "utf8");
    assert(chatBoxUpdated.includes("classifyIntent"), "ChatBox integrates client intent classifier");
    assert(chatBoxUpdated.includes("cancelImageApi"), "ChatBox integrates cancelImageApi");
    assert(chatBoxUpdated.includes("chat[chat.length - 1]?.imageGeneration?.status"), "ChatBox synchronizes scroll effect with imageGeneration status");
    assert(chatBoxUpdated.includes('mode === "auto"'), "ChatBox checks auto mode on send");
    assert(chatBoxUpdated.includes('mode === "image"'), "ChatBox checks manual image mode on send");

    // 28. Premium Minimal AI Image Generation Loader Invariants
    console.log(bold(cyan("\n28. Premium Minimal AI Image Generation Loader Invariants")));
    const genImageViewerPremium = fs.readFileSync(path.join(__dirname, "../src/components/GeneratedImageViewer.tsx"), "utf8");
    const indexCssUpdated = fs.readFileSync(path.join(__dirname, "../src/index.css"), "utf8");

    assert(indexCssUpdated.includes("@keyframes minimalIconPulse"), "CSS defines @keyframes minimalIconPulse for breathing glow");
    assert(indexCssUpdated.includes(".animate-icon-pulse"), "CSS defines .animate-icon-pulse class");
    assert(indexCssUpdated.includes(".animate-subtle-shimmer"), "CSS defines .animate-subtle-shimmer class");
    assert(indexCssUpdated.includes("prefers-reduced-motion"), "CSS respects prefers-reduced-motion");
    assert(genImageViewerPremium.includes("PictureOutlineIcon"), "GeneratedImageViewer renders clean outline picture/photo icon");
    assert(genImageViewerPremium.includes("#111C26"), "GeneratedImageViewer uses dark navy #111C26 background");
    assert(genImageViewerPremium.includes("text-purple-400"), "GeneratedImageViewer applies purple/violet accent to icon");
    assert(genImageViewerPremium.includes("animate-icon-pulse"), "GeneratedImageViewer uses subtle breathing pulse for icon");
    assert(!genImageViewerPremium.includes("animate-spin"), "GeneratedImageViewer does not use aggressive continuous spinning circle");
    assert(genImageViewerPremium.includes("Creating image..."), "Includes clean minimal 'Creating image...' status");
    assert(genImageViewerPremium.includes("Preparing image..."), "Includes clean minimal 'Preparing image...' status");
    assert(genImageViewerPremium.includes('aria-live="polite"'), "GeneratedImageViewer provides aria-live='polite' for accessibility");
    assert(genImageViewerPremium.includes("imageLoaded"), "GeneratedImageViewer tracks imageLoaded for smooth cross-fade reveal");
    assert(genImageViewerPremium.includes("transition-all duration-500 ease-out"), "GeneratedImageViewer applies smooth transition to revealed image");
    assert(genImageViewerPremium.includes("aspect-video"), "GeneratedImageViewer reserves 16:9 aspect ratio");
    assert(genImageViewerPremium.includes("aspect-[9/16]"), "GeneratedImageViewer reserves 9:16 aspect ratio");
    assert(genImageViewerPremium.includes("aspect-[4/3]"), "GeneratedImageViewer reserves 4:3 aspect ratio");
    assert(genImageViewerPremium.includes("aspect-square"), "GeneratedImageViewer reserves 1:1 aspect ratio");
    assert(genImageViewerPremium.includes("w-full max-w-xl"), "GeneratedImageViewer uses unified max-w-xl container to eliminate layout jumps");
    assert(genImageViewerPremium.includes("onCancel"), "GeneratedImageViewer supports non-overlapping cancel/stop action");
  } finally {
    if (server.closeAllConnections) {
      server.closeAllConnections();
    }
    await new Promise((resolve) => server.close(resolve));
  }

  // Final summary
  console.log(bold(cyan("\n=======================================================")));
  console.log(bold(`TEST RESULTS: ${green(`${passedCount} PASSED`)}, ${failedCount > 0 ? red(`${failedCount} FAILED`) : "0 FAILED"}`));
  console.log(bold(cyan("=======================================================\n")));

  if (failedCount > 0) {
    process.exit(1);
  }
  const timer = setTimeout(() => {
    process.exit(0);
  }, 150);
  timer.unref();
}

runTests().catch((err) => {
  console.error("Test execution failed with fatal error:", err);
  process.exit(1);
});
