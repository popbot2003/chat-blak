// ============================================
// MessageContent.jsx
// مكون عرض محتوى الرسالة (يدعم الكود البرمجي والتنسيق)
//
// Security:
//   - HTML is fully escaped before rendering.
//   - No dangerouslySetInnerHTML.
//   - No raw HTML from AI/user can execute.
//   - Only **bold** and line breaks are supported for now.
// ============================================

import CodeBlock from "./CodeBlock";

// Escape HTML entities to prevent XSS.
// Any HTML tag in the input becomes literal text.
function escapeHtml(str) {
  if (typeof str !== "string") return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Convert **bold** markers to <strong> AFTER escaping.
// Because input is already escaped, only our <strong> tags remain real.
function applyBold(escapedText) {
  return escapedText.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

// Convert newlines to <br/> AFTER escaping.
function applyLineBreaks(text) {
  return text.replace(/\n/g, "<br/>");
}

export default function MessageContent({ content }) {
  if (!content) return null;
  if (typeof content !== "string") {
    return <span>{JSON.stringify(content)}</span>;
  }

  // Remove leftover JSON fragments (same as before).
  const cleaned = content.replace(
    /\{"id":\s*"[^"]*",\s*"role":\s*"[^"]*"\}/g,
    ""
  );

  // Split into text and code blocks.
  const parts = [];
  const regex = /```(\w*)\n?([\s\S]*?)```/g;
  let last = 0;
  let match;

  while ((match = regex.exec(cleaned)) !== null) {
    if (match.index > last) {
      parts.push({ type: "text", content: cleaned.slice(last, match.index) });
    }
    parts.push({
      type: "code",
      language: match[1] || "code",
      content: match[2].trim(),
    });
    last = match.index + match[0].length;
  }

  if (last < cleaned.length) {
    parts.push({ type: "text", content: cleaned.slice(last) });
  }

  // Render.
  return parts.map((part, index) => {
    if (part.type === "code") {
      return (
        <CodeBlock key={index} lang={part.language} content={part.content} />
      );
    }

    // Text part: escape → bold → line breaks.
    const safe = applyLineBreaks(applyBold(escapeHtml(part.content)));

    return (
      <span
        key={index}
        dangerouslySetInnerHTML={{ __html: safe }}
      />
    );
  });
}
