import React, { useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Copy, Check } from "lucide-react";

const CodeBlockCopy = React.memo(
  ({ code, language }: { code: string; language: string }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(async () => {
      try {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      } catch (err) {
        console.error("Copy failed:", err);
      }
    }, [code]);

    return (
      <div className="group my-4 overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-950 shadow-[0_16px_45px_-30px_rgba(15,23,42,0.9)] dark:border-slate-800">
        <div className="flex items-center justify-between border-b border-white/10 bg-slate-900 px-3 py-2">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-slate-400">
            <span className="h-2 w-2 rounded-full bg-slate-600" />
            <span className="h-2 w-2 rounded-full bg-slate-600" />
            <span className="h-2 w-2 rounded-full bg-slate-600" />
            <span className="ml-2">{language}</span>
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
          {code}
        </SyntaxHighlighter>
      </div>
    );
  }
);

CodeBlockCopy.displayName = "CodeBlockCopy";

const MarkdownRenderer = React.memo(({ text }: { text: string }) => {
  return (
    <div className="markdown-output min-w-0">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ inline, className, children }: any) {
            if (inline) {
              return (
                <code className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[0.9em] text-fuchsia-700 dark:bg-slate-800 dark:text-fuchsia-300">
                  {children}
                </code>
              );
            }

            const match = /language-(\w+)/.exec(className || "");
            const code = String(children).replace(/\n$/, "");
            const language = match?.[1] || "text";

            return <CodeBlockCopy code={code} language={language} />;
          },

          h1: ({ children }) => (
            <h1 className="mb-3 mt-5 text-lg font-semibold tracking-tight text-slate-900 dark:text-white sm:text-xl">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-2 mt-4 text-base font-semibold tracking-tight text-slate-900 dark:text-white sm:text-lg">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-2 mt-4 text-[15px] font-semibold text-slate-800 dark:text-slate-100">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="mb-3 text-[14px] leading-6 text-slate-700 dark:text-slate-300 sm:text-[15px]">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="mb-3 list-disc space-y-1.5 pl-5 text-[14px] text-slate-700 dark:text-slate-300 sm:text-[15px]">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-3 list-decimal space-y-1.5 pl-5 text-[14px] text-slate-700 dark:text-slate-300 sm:text-[15px]">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="leading-6">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="my-4 rounded-r-2xl border-l-2 border-slate-300 bg-slate-50/80 py-2 pl-4 italic text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300">
              {children}
            </blockquote>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-slate-900 dark:text-white">
              {children}
            </strong>
          ),
          hr: () => (
            <hr className="my-4 border-slate-200 dark:border-slate-700" />
          ),
          table: ({ children }) => (
            <div className="my-4 overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
              <table className="min-w-full border-collapse text-left text-[13px] sm:text-sm">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-slate-100/90 dark:bg-slate-800/90">
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th className="whitespace-nowrap border-b border-slate-200 px-3 py-2 font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="whitespace-pre-wrap border-b border-slate-100 px-3 py-2 align-top text-slate-600 dark:border-slate-800 dark:text-slate-300">
              {children}
            </td>
          ),
          tr: ({ children }) => (
            <tr className="even:bg-slate-50/60 dark:even:bg-slate-800/30">
              {children}
            </tr>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 underline underline-offset-2 transition hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
            >
              {children}
            </a>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
});

MarkdownRenderer.displayName = "MarkdownRenderer";

export default MarkdownRenderer;
