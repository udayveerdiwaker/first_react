import React from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Copy } from "lucide-react";
import { useState } from "react";

const MarkdownRenderer = React.memo(({ text }: { text: string }) => {
  // const [copied, setCopied] = useState(false);
  // const [codeText, setCodeText] = useState("");
  // const handleCopy = async () => {
  //   try {
  //     await navigator.clipboard.writeText(codeText);

  //     setCopied(true);

  //     setTimeout(() => {
  //       setCopied(false);
  //     }, 1500);
  //   } catch {
  //     console.log("Copy failed");
  //   }
  // };
  return (
    <ReactMarkdown
      components={{
        // 🔥 CODE BLOCK (GPT STYLE)
        code({ inline, className, children }: any) {
          const match = /language-(\w+)/.exec(className || "");
          const code = String(children).replace(/\n$/, "");
          const language = match?.[1] || "javascript";

          // 🔥 separate copy state per block
          // eslint-disable-next-line react-hooks/rules-of-hooks
          const [copiedLocal, setCopiedLocal] = useState(false);

          const handleCopyLocal = async () => {
            try {
              await navigator.clipboard.writeText(code);
              setCopiedLocal(true);
              setTimeout(() => setCopiedLocal(false), 1500);
            } catch {
              /* empty */
            }
          };

          if (!inline) {
            return (
              <div className="group my-5 rounded-2xl border border-white/10 bg-[#0b1220] overflow-hidden shadow-lg">
                {/* 🔥 HEADER */}
                <div className="flex items-center justify-between px-4 py-2 bg-[#0f172a] border-b border-white/10">
                  <div className="flex items-center gap-2 text-gray-400 text-xs">
                    <span className="opacity-70">●</span>
                    <span className="opacity-70">●</span>
                    <span className="opacity-70">●</span>
                    <span className="ml-2 uppercase tracking-wide text-[11px]">
                      {language}
                    </span>
                  </div>

                  {/* 🔥 COPY BUTTON (GPT STYLE) */}
                  <button
                    onClick={handleCopyLocal}
                    className="
              opacity-0 group-hover:opacity-100
              transition text-xs
              text-gray-400 hover:text-white
              flex items-center gap-1
            "
                  >
                    {copiedLocal ? "Copied" : <Copy size={14} />}
                  </button>
                </div>

                {/* 🔥 CODE CONTENT */}
                <SyntaxHighlighter
                  style={vscDarkPlus}
                  language={language}
                  PreTag="div"
                  customStyle={{
                    margin: 0,
                    padding: "16px",
                    background: "transparent",
                    fontSize: "13.5px",
                    lineHeight: "1.6",
                  }}
                >
                  {code}
                </SyntaxHighlighter>
              </div>
            );
          }

          // 🔥 INLINE CODE (GPT STYLE)
          return (
            <code className="bg-white/10 px-1.5 py-0.5 rounded text-pink-400 text-sm">
              {children}
            </code>
          );
        },

        // 🔥 HEADINGS (clean hierarchy)
        h1: ({ children }) => (
          <h1 className="text-xl font-semibold mt-6 mb-3 text-white tracking-tight">
            {children}
          </h1>
        ),

        h2: ({ children }) => (
          <h2 className="text-lg font-semibold mt-5 mb-2 text-white tracking-tight">
            {children}
          </h2>
        ),

        h3: ({ children }) => (
          <h3 className="text-base font-semibold mt-4 mb-2 text-gray-100">
            {children}
          </h3>
        ),

        // 🔥 PARAGRAPH (better readability)
        p: ({ children }) => (
          <p className="text-[15px] text-gray-300 leading-7 mb-3">{children}</p>
        ),

        // 🔥 LISTS (GPT style — simple, no icons)
        ul: ({ children }) => (
          <ul className="list-disc pl-5 space-y-2 text-gray-300">{children}</ul>
        ),

        ol: ({ children }) => (
          <ol className="list-decimal pl-5 space-y-2 text-gray-300">
            {children}
          </ol>
        ),

        li: ({ children }) => (
          <li className="text-[15px] leading-6">{children}</li>
        ),

        // 🔥 BLOCKQUOTE (subtle, not heavy card)
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-gray-600 pl-4 italic text-gray-400 my-4">
            {children}
          </blockquote>
        ),

        // 🔥 STRONG TEXT
        strong: ({ children }) => (
          <strong className="text-white font-semibold">{children}</strong>
        ),

        // 🔥 TABLE (clean GPT style)
        table: ({ children }) => (
          <div className="overflow-x-auto my-4">
            <table className="w-full text-sm border-collapse">{children}</table>
          </div>
        ),

        th: ({ children }) => (
          <th className="text-left px-3 py-2 text-gray-200 font-medium border-b border-white/10">
            {children}
          </th>
        ),

        td: ({ children }) => (
          <td className="px-3 py-2 text-gray-300 border-b border-white/5">
            {children}
          </td>
        ),

        // 🔥 LINKS (GPT style subtle)
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            className="text-blue-400 hover:text-blue-300 underline underline-offset-2"
          >
            {children}
          </a>
        ),
      }}
    >
      {text}
    </ReactMarkdown>
  );
});

export default MarkdownRenderer;
