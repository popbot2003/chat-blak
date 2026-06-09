// ============================================
// CodeBlock.jsx
// مكون عرض الكود البرمجي مع زر نسخ
// ============================================

import { useState } from "react";
import { copyToClipboard } from "../utils/helpers";

export default function CodeBlock({ lang, content }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    copyToClipboard(content, () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="code-wrapper">
      <div className="code-header">
        <span className="code-lang">{lang || "code"}</span>
        <button onClick={handleCopy} className="code-copy-btn">
          {copied ? "✓ تم النسخ" : "📋 نسخ"}
        </button>
      </div>
      <pre className="code-pre">
        <code className="code-content">{content}</code>
      </pre>
    </div>
  );
}
