
import { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { copyToClipboard } from "../utils/helpers";

export default function CodeBlock({ lang, content = "" }) {
  const [copied, setCopied] = useState(false);

  const language = (lang || "text").toLowerCase();

  const handleCopy = () => {
    copyToClipboard(content, () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="code-wrapper" dir="ltr">
      <div className="code-header">
        <div className="code-header-left">
          <span className="code-dot code-dot-red" />
          <span className="code-dot code-dot-yellow" />
          <span className="code-dot code-dot-green" />
          <span className="code-lang">{language}</span>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className={`code-copy-btn ${copied ? "copied" : ""}`}
          title="نسخ الكود"
        >
          {copied ? "✓ تم النسخ" : "نسخ الكود"}
        </button>
      </div>

      <div className="code-body">
        <SyntaxHighlighter
          language={language}
          style={vscDarkPlus}
          PreTag="pre"
          CodeTag="code"
          showLineNumbers={content.split("\n").length > 5}
          wrapLongLines={false}
          customStyle={{
            margin: 0,
            padding: "18px 20px",
            background: "transparent",
            fontSize: "13px",
            lineHeight: "1.75",
            direction: "ltr",
            textAlign: "left",
            minWidth: "fit-content",
          }}
          codeTagProps={{
            style: {
              fontFamily: "'Fira Code', 'Consolas', monospace",
              direction: "ltr",
              textAlign: "left",
            },
          }}
        >
          {content}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
