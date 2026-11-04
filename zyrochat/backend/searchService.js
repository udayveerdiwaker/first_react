/**
 * Web Search Service for ZyroChat
 * 
 * Provides live search retrieval without requiring paid API keys.
 * Strategy:
 * 1. Queries DuckDuckGo HTML search for organic web results
 * 2. Parses result titles, URLs, and snippet previews
 * 3. Falls back to Wikipedia / Open knowledge APIs for encyclopedic topics if needed
 * 4. Returns structured results array: { title, url, snippet, source }
 */

/**
 * Strips HTML tags and decodes common entities
 */
function cleanText(text = "") {
  return text
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extracts domain name from a URL
 */
function getDomain(urlStr = "") {
  try {
    const parsed = new URL(urlStr);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return "web";
  }
}

/**
 * Searches DuckDuckGo HTML
 */
async function searchDuckDuckGo(query) {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
    signal: AbortSignal.timeout(6000),
  });

  if (!response.ok) {
    throw new Error(`DuckDuckGo returned HTTP ${response.status}`);
  }

  const html = await response.text();
  const results = [];

  // Match result blocks: <a class="result__url" href="...uddg=URL..."> and <a class="result__snippet">
  const resultBlockRegex = /<div class="result__body">([\s\S]*?)<\/div>\s*<\/div>/g;
  let block;

  while ((block = resultBlockRegex.exec(html)) !== null && results.length < 5) {
    const blockHtml = block[1];

    // Extract Title & Raw Link
    const titleMatch = /<a class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i.exec(
      blockHtml
    );
    // Extract Snippet
    const snippetMatch = /<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/i.exec(
      blockHtml
    );

    if (titleMatch) {
      let resultUrl = titleMatch[1];
      // Decode DuckDuckGo redirect link /l/?uddg=...
      const uddgMatch = /uddg=([^&]+)/.exec(resultUrl);
      if (uddgMatch) {
        try {
          resultUrl = decodeURIComponent(uddgMatch[1]);
        } catch {
          // ignore
        }
      }

      const rawTitle = titleMatch[2];
      const rawSnippet = snippetMatch ? snippetMatch[1] : "";

      const title = cleanText(rawTitle);
      const snippet = cleanText(rawSnippet);

      if (title && resultUrl && !resultUrl.includes("duckduckgo.com")) {
        results.push({
          title,
          url: resultUrl,
          snippet: snippet || title,
          source: getDomain(resultUrl),
        });
      }
    }
  }

  return results;
}

/**
 * Searches Wikipedia API as high-reliability encyclopedia fallback
 */
async function searchWikipedia(query) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
    query
  )}&format=json&origin=*`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": "ZyroChatWorkspace/3.0 (https://zyrochat.local)",
    },
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) return [];

  const data = await response.json();
  const list = data?.query?.search || [];

  return list.slice(0, 4).map((item) => ({
    title: item.title,
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(
      item.title.replace(/\s+/g, "_")
    )}`,
    snippet: cleanText(item.snippet),
    source: "wikipedia.org",
  }));
}

/**
 * Main Web Search entrypoint with multi-stage fallback
 */
async function executeWebSearch(query) {
  if (!query || !query.trim()) {
    return { results: [], formatted: "No query provided for search." };
  }

  const cleanQuery = query.trim();
  let results = [];

  // 1. Try DuckDuckGo
  try {
    results = await searchDuckDuckGo(cleanQuery);
  } catch (err) {
    console.warn("DuckDuckGo search error:", err.message);
  }

  // 2. If DDG yielded fewer than 2 results, supplement with Wikipedia
  if (results.length < 2) {
    try {
      const wikiResults = await searchWikipedia(cleanQuery);
      // Deduplicate by URL
      const existingUrls = new Set(results.map((r) => r.url));
      for (const wr of wikiResults) {
        if (!existingUrls.has(wr.url)) {
          results.push(wr);
          existingUrls.add(wr.url);
        }
      }
    } catch (wikiErr) {
      console.warn("Wikipedia fallback search error:", wikiErr.message);
    }
  }

  // Cap at top 5 results
  results = results.slice(0, 5);

  if (results.length === 0) {
    return {
      results: [],
      formatted: `No current web results found for "${cleanQuery}".`,
    };
  }

  // Format textual summary for AI context injection
  const formatted = results
    .map(
      (r, idx) =>
        `[${idx + 1}] "${r.title}" (${r.source})\nURL: ${r.url}\nSummary: ${r.snippet}`
    )
    .join("\n\n");

  return { results, formatted };
}

module.exports = {
  executeWebSearch,
};
