import React from "react";

export default function MessageContent({ content }) {
  if (!content) return null;

  const parseContent = (text) => {
    const parts = [];
    const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      // النص قبل الكود
      if (match.index > lastIndex) {
        const before = text.slice(lastIndex, match.index);
        parts.push({ type: "text", content: formatText(before) });
      }

      // الكود
      const language = match[1] || "";
      const code = match[2].trim();
      parts.push({ type: "code", language, code });

      lastIndex = match.index + match[0].length;
    }

    // النص المتبقي
    if (lastIndex < text.length) {
      const remaining = text.slice(lastIndex);
      parts.push({ type: "text", content: formatText(remaining) });
    }

    return parts;
  };

  const formatText = (text) => {
    if (!text) return "";
    return text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\n/g, "<br/>");
  };

  // لو المحتوى مش string (حالة نادرة)
  if (typeof content !== "string") {
    if (Array.isArray(content)) {
      return content.map((item, i) => (
        <MessageContent key={i} content={typeof item === "string" ? item : JSON.stringify(item)} />
      ));
    }
    if (typeof content === "object") {
      return <MessageContent content={JSON.stringify(content)} />;
    }
    return <span>{String(content)}</span>;
  }

  // لو المحتوى فيه "id" أو "role" اعرضه كنص عادي
  const cleaned = content.replace(/\{"id":\s*"[^"]*",\s*"role":\s*"[^"]*"\}/g, "");

  const parsed = parseContent(cleaned);

  if (parsed.length === 0) {
    return <span>{cleaned}</span>;
  }

  return (
    <>
      {parsed.map((part, index) => {
        if (part.type === "code") {
          return (
            <pre key={index}>
              {part.language && <div style={{ fontSize: "10px", opacity: 0.5, marginBottom: "4px" }}>{part.language}</div>}
              <code>{part.code}</code>
            </pre>
          );
        }
        return (
          <span key={index} dangerouslySetInnerHTML={{ __html: part.content }} />
        );
      })}
    </>
  );
}
