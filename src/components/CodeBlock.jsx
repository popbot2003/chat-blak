import { useState } from "react";

export default function CodeBlock({ lang, content }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      const textarea = document.createElement("textarea");
      textarea.value = content;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="code-wrapper">
      <div className="code-header">
        <span className="code-lang">{lang}</span>
        <button onClick={copy} className="code-copy-btn">
          {copied ? "✓ تم النسخ" : "📋 نسخ"}
        </button>
      </div>
      <pre className="code-pre">
        <code className="code-content">{content}</code>
      </pre>
    </div>
  );
        }
