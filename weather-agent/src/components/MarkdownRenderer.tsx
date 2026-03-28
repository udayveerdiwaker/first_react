import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Copy } from "lucide-react";

export default function MarkdownRenderer({ text }: { text: string }) {
  return (
    <ReactMarkdown
      components={{
        // 🔥 CODE BLOCK
        code({ inline, className, children }: any) {
          const match = /language-(\w+)/.exec(className || "");
          const code = String(children).replace(/\n$/, "");

          if (!inline) {
            return (
              <div className="relative group my-4 overflow-x-auto">
                {/* COPY BUTTON */}
                <button
                  onClick={() => navigator.clipboard.writeText(code)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition bg-black/50 hover:bg-black/70 text-white text-xs px-2 py-1 rounded-md flex items-center gap-1"
                >
                  <Copy size={12} />
                  Copy
                </button>

                {/* CODE BLOCK */}
                <SyntaxHighlighter
                  style={vscDarkPlus}
                  language={match?.[1] || "javascript"}
                  PreTag="div"
                  customStyle={{
                    padding: "16px",
                    borderRadius: "12px",
                    background: "#0d1117",
                  }}
                >
                  {code}
                </SyntaxHighlighter>
              </div>
            );
          }

          // INLINE CODE
          return (
            <code className="bg-white/10 px-1.5 py-0.5 rounded text-pink-400 text-sm">
              {children}
            </code>
          );
        },

        // HEADINGS
        h1: ({ children }) => (
          <h1 className="text-xl font-bold mt-4 mb-2">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-lg font-semibold mt-3 mb-2">{children}</h2>
        ),

        // PARAGRAPH
        p: ({ children }) => (
          <p className="text-sm leading-relaxed mb-2">{children}</p>
        ),

        // LISTS
        ul: ({ children }) => (
          <ul className="list-disc pl-5 space-y-1">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal pl-5 space-y-1">{children}</ol>
        ),

        // STRONG
        strong: ({ children }) => (
          <strong className="text-white font-semibold">{children}</strong>
        ),

        // BLOCKQUOTE
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-blue-500 pl-3 italic text-gray-400 my-2">
            {children}
          </blockquote>
        ),
      }}
    >
      {text}
    </ReactMarkdown>
  );
}
