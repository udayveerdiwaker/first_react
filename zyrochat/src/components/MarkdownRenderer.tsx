import React, { useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Copy, Check } from "lucide-react";

// Renders a single fenced code block with a copy button.
// React.memo prevents this block from re-rendering unless its code or language changes.
const CodeBlockCopy = React.memo(
  ({ code, language }: { code: string; language: string }) => {
    const [copied, setCopied] = useState(false);

    // Check if code ends with streaming cursor
    const hasCursor = code.endsWith("||STREAMING_CURSOR||");
    const cleanCode = hasCursor ? code.slice(0, -20) : code;

    // Copies the code text to the user's clipboard.
    // After a successful copy, it briefly changes the button label to "Copied".
    const handleCopy = useCallback(async () => {
      try {
        await navigator.clipboard.writeText(cleanCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      } catch (err) {
        console.error("Copy failed:", err);
      }
    }, [cleanCode]);

    return (
      <div className="group my-4 overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-950 shadow-[0_16px_45px_-30px_rgba(15,23,42,0.9)] dark:border-slate-800">
        <div className="flex items-center justify-between border-b border-white/10 bg-slate-900 px-3 py-2">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-slate-400">
            <span className="h-2 w-2 rounded-full bg-slate-600" />
            <span className="h-2 w-2 rounded-full bg-slate-600" />
            <span className="h-2 w-2 rounded-full bg-slate-600" />
            <span className="ml-2">{language}</span>
            {hasCursor && (
              <span className="ml-2.5 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                <span className="text-[9px] text-emerald-400 font-bold tracking-widest uppercase">Streaming...</span>
              </span>
            )}
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-lg bg-white/5 px-2 py-1 text-xs font-medium text-slate-400 transition hover:bg-white/10 hover:text-white"
            title={copied ? "Copied!" : "Copy code"}
          >
            {copied ? (
              <>
                <Check size={14} />
                Copied
              </>
            ) : (
              <>
                <Copy size={14} />
                Copy
              </>
            )}
          </button>
        </div>

        <SyntaxHighlighter
          style={vscDarkPlus}
          language={language}
          PreTag="div"
          customStyle={{
            margin: 0,
            padding: "14px 16px",
            background: "transparent",
            fontSize: "13px",
            lineHeight: "1.55",
          }}
        >
          {cleanCode}
        </SyntaxHighlighter>
      </div>
    );
  }
);

CodeBlockCopy.displayName = "CodeBlockCopy";

const MarkdownImage = React.memo(
  ({ src, alt }: { src?: string; alt?: string }) => {
    const [failed, setFailed] = useState(false);

    if (!src) return null;

    if (failed) {
      return (
        <span className="inline-block my-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
          Image could not load.{" "}
          <a
            href={src}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            Open in new tab
          </a>
        </span>
      );
    }

    return (
      <a href={src} target="_blank" rel="noreferrer" className="block">
        <img
          src={src}
          alt={alt || "Generated image"}
          loading="lazy"
          onError={() => setFailed(true)}
          className="my-4 max-h-[520px] w-full rounded-2xl border border-slate-200 object-contain shadow-[0_18px_45px_-28px_rgba(15,23,42,0.5)] dark:border-slate-700"
        />
      </a>
    );
  }
);

MarkdownImage.displayName = "MarkdownImage";

// Helper to recursively inject the animated typing cursor at the end of the children stream
const renderWithCursor = (content: React.ReactNode): React.ReactNode => {
  if (typeof content === "string") {
    if (content.endsWith("||STREAMING_CURSOR||")) {
      const mainText = content.substring(0, content.length - 20); // remove "||STREAMING_CURSOR||"
      return (
        <>
          {mainText}
          <span className="streaming-cursor" />
        </>
      );
    }
    return content;
  }

  if (Array.isArray(content)) {
    return content.map((child, index) => {
      // Only process the last child of the array to inject cursor at the very end
      if (index === content.length - 1) {
        return renderWithCursor(child);
      }
      return child;
    });
  }

  if (React.isValidElement(content)) {
    const element = content as React.ReactElement<any>;
    if (element.props && element.props.children) {
      return React.cloneElement(element, {
        ...element.props,
        children: renderWithCursor(element.props.children),
      });
    }
  }

  return content;
};

// Converts assistant markdown text into styled React elements.
// It supports GitHub-style markdown, syntax-highlighted code blocks, tables,
// links, lists, headings, and other common response formatting.
const MarkdownRenderer = React.memo(({ text, isStreaming }: { text: string; isStreaming?: boolean }) => {
  const textToRender = isStreaming ? `${text}||STREAMING_CURSOR||` : text;

  return (
    <div className="markdown-output min-w-0">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Handles both inline code and fenced code blocks.
          // Inline code gets a small pill style, while larger code blocks
          // use the copyable CodeBlockCopy component above.
          code({ inline, className, children }: any) {
            if (inline) {
              return (
                <code className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[0.9em] text-fuchsia-700 dark:bg-slate-800 dark:text-fuchsia-300">
                  {renderWithCursor(children)}
                </code>
              );
            }

            const match = /language-(\w+)/.exec(className || "");
            const code = String(children).replace(/\n$/, "");
            const language = match?.[1] || "text";

            return <CodeBlockCopy code={code} language={language} />;
          },

          // Renders level-one headings from markdown.
          h1: ({ children }) => (
            <h1 className="mb-3 mt-5 text-lg font-semibold tracking-tight text-slate-900 dark:text-white sm:text-xl">
              {renderWithCursor(children)}
            </h1>
          ),
          // Renders level-two headings from markdown.
          h2: ({ children }) => (
            <h2 className="mb-2 mt-4 text-base font-semibold tracking-tight text-slate-900 dark:text-white sm:text-lg">
              {renderWithCursor(children)}
            </h2>
          ),
          // Renders level-three headings from markdown.
          h3: ({ children }) => (
            <h3 className="mb-2 mt-4 text-[15px] font-semibold text-slate-800 dark:text-slate-100">
              {renderWithCursor(children)}
            </h3>
          ),
          // Renders normal paragraphs from markdown.
          p: ({ children }) => (
            <p className="mb-3 text-[14px] leading-6 text-slate-700 dark:text-slate-300 sm:text-[15px]">
              {renderWithCursor(children)}
            </p>
          ),
          // Renders unordered bullet lists from markdown.
          ul: ({ children }) => (
            <ul className="mb-3 list-disc space-y-1.5 pl-5 text-[14px] text-slate-700 dark:text-slate-300 sm:text-[15px]">
              {children}
            </ul>
          ),
          // Renders numbered lists from markdown.
          ol: ({ children }) => (
            <ol className="mb-3 list-decimal space-y-1.5 pl-5 text-[14px] text-slate-700 dark:text-slate-300 sm:text-[15px]">
              {children}
            </ol>
          ),
          // Renders each list item with consistent line height.
          li: ({ children }) => <li className="leading-6">{renderWithCursor(children)}</li>,
          // Renders quoted markdown text with a left border.
          blockquote: ({ children }) => (
            <blockquote className="my-4 rounded-r-2xl border-l-2 border-slate-300 bg-slate-50/80 py-2 pl-4 italic text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300">
              {renderWithCursor(children)}
            </blockquote>
          ),
          // Renders bold markdown text.
          strong: ({ children }) => (
            <strong className="font-semibold text-slate-900 dark:text-white">
              {renderWithCursor(children)}
            </strong>
          ),
          // Renders horizontal divider lines.
          hr: () => (
            <hr className="my-4 border-slate-200 dark:border-slate-700" />
          ),
          // Wraps markdown tables so wide tables can scroll on small screens.
          table: ({ children }) => (
            <div className="my-4 overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
              <table className="min-w-full border-collapse text-left text-[13px] sm:text-sm">
                {children}
              </table>
            </div>
          ),
          // Renders the table header area.
          thead: ({ children }) => (
            <thead className="bg-slate-100/90 dark:bg-slate-800/90">
              {children}
            </thead>
          ),
          // Renders table header cells.
          th: ({ children }) => (
            <th className="whitespace-nowrap border-b border-slate-200 px-3 py-2 font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">
              {children}
            </th>
          ),
          // Renders table body cells.
          td: ({ children }) => (
            <td className="whitespace-pre-wrap border-b border-slate-100 px-3 py-2 align-top text-slate-600 dark:border-slate-800 dark:text-slate-300">
              {renderWithCursor(children)}
            </td>
          ),
          // Renders table rows with alternating background colors.
          tr: ({ children }) => (
            <tr className="even:bg-slate-50/60 dark:even:bg-slate-800/30">
              {children}
            </tr>
          ),
          // Renders markdown links in a new browser tab.
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 underline underline-offset-2 transition hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
            >
              {renderWithCursor(children)}
            </a>
          ),
          // Renders generated images and other markdown images inside chat replies.
          img: ({ src, alt }) => (
            <MarkdownImage src={src} alt={alt || undefined} />
          ),
        }}
      >
        {textToRender}
      </ReactMarkdown>
    </div>
  );
});

MarkdownRenderer.displayName = "MarkdownRenderer";

export default MarkdownRenderer;
