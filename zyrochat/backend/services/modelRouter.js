/**
 * Intelligent Task Classifier & Model Router Service
 */

const { MODEL_ROUTER_CONFIG, DEFAULT_FALLBACK_MODEL } = require("../config/models");

/**
 * Classifies a user prompt into a task category with confidence score and reasoning
 * @param {string} prompt - User message text
 * @param {Array} attachments - Optional list of file attachments
 * @returns {object} Classification result { category, model, confidence, rationale }
 */
function routePrompt(prompt = "", attachments = []) {
  const clean = String(prompt || "").trim();
  const lower = clean.toLowerCase();

  // 1. Multimodal Vision detection
  const hasImages = Array.isArray(attachments) && attachments.some((a) => a.type?.startsWith("image/") || a.mimeType?.startsWith("image/"));
  if (hasImages) {
    return {
      category: "vision",
      model: MODEL_ROUTER_CONFIG.vision,
      confidence: 0.95,
      rationale: "Prompt contains image attachments requiring computer vision.",
    };
  }

  // 1b. AI Image Generation detection
  const isMetaImageQuestion = /^(?:how\s+(?:do|does|can|to)|why|what\s+is|can\s+you\s+explain|explain)\b/i.test(clean);
  const imageKeywords = /\b(generate|create|render|draw|paint|illustrate)\s+(?:an?\s+)?(?:image|picture|photo|illustration|drawing|artwork|poster|wallpaper|portrait)\b/i;
  if (!isMetaImageQuestion && (imageKeywords.test(clean) || /^(?:\/image|image:)\s+/i.test(clean))) {
    return {
      category: "image_generation",
      model: "image-generation-provider",
      confidence: 0.95,
      rationale: "Detected AI image generation intent.",
    };
  }

  // 2. Coding & Software Development
  const codingKeywords = /\b(code|function|react|typescript|javascript|python|sql|html|css|bug|error|refactor|class|api|component|debug|algorithm|syntax|npm|git)\b/i;
  const hasCodeBlock = clean.includes("```") || clean.includes("const ") || clean.includes("def ") || clean.includes("import ");
  if (hasCodeBlock || codingKeywords.test(clean)) {
    return {
      category: "coding",
      model: MODEL_ROUTER_CONFIG.coding,
      confidence: 0.88,
      rationale: "Detected source code tokens, programming terminology, or code block syntax.",
    };
  }

  // 3. Deep Research & Market Analysis
  const researchKeywords = /\b(research|market analysis|competitors|literature review|comprehensive survey|academic report|citations|sources on)\b/i;
  if (researchKeywords.test(clean)) {
    return {
      category: "research",
      model: MODEL_ROUTER_CONFIG.research,
      confidence: 0.90,
      rationale: "Query demands multi-source structured research, citations, and comparative analysis.",
    };
  }

  // 4. Mathematical & Logical Reasoning
  const reasoningKeywords = /\b(calculate|equation|prove|theorem|logic puzzle|riddle|step by step deduction|probability|evaluate)\b/i;
  const hasMathSymbols = /[=+\-*/^]{2,}/.test(clean) || /\b\d+\s*[\+\-\*\/]\s*\d+\b/.test(clean);
  if (reasoningKeywords.test(clean) || hasMathSymbols) {
    return {
      category: "reasoning",
      model: MODEL_ROUTER_CONFIG.reasoning,
      confidence: 0.85,
      rationale: "Contains mathematical formulations or explicit step-by-step logic requirements.",
    };
  }

  // 5. Creative Ideation & Storytelling
  const creativeKeywords = /\b(write a story|poem|narrative|novel|creative writing|brainstorm catchy|slogan|metaphor|lyric)\b/i;
  if (creativeKeywords.test(clean)) {
    return {
      category: "creative",
      model: MODEL_ROUTER_CONFIG.creative,
      confidence: 0.82,
      rationale: "Identified creative copywriting, narrative generation, or metaphorical ideation intent.",
    };
  }

  // 6. Data Analysis & Tabulation
  const dataKeywords = /\b(csv|table|matrix|data summary|statistics|metrics breakdown|dataset|percentages)\b/i;
  if (dataKeywords.test(clean)) {
    return {
      category: "dataAnalysis",
      model: MODEL_ROUTER_CONFIG.dataAnalysis,
      confidence: 0.80,
      rationale: "Structured data tabulation, matrix generation, or numerical summary requested.",
    };
  }

  // 7. Fast Chat for quick queries
  const isShortQuery = clean.split(/\s+/).length <= 6 && !clean.includes("?");
  const isGreeting = /^(hi|hello|hey|good morning|good evening|thanks|thank you)\b/i.test(clean);
  if (isShortQuery || isGreeting) {
    return {
      category: "fast",
      model: MODEL_ROUTER_CONFIG.fast,
      confidence: 0.78,
      rationale: "Short prompt or standard greeting suitable for lowest-latency fast model.",
    };
  }

  // 8. General fallback
  return {
    category: "general",
    model: MODEL_ROUTER_CONFIG.general || DEFAULT_FALLBACK_MODEL,
    confidence: 0.70,
    rationale: "Everyday conversational reasoning and balanced productivity query.",
  };
}

module.exports = {
  routePrompt,
};
