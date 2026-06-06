import CodeBlock from "./CodeBlock";

function parseMessage(content) {
  const parts = [];
  const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;
  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", content: content.slice(lastIndex, match.index) });
    }
    parts.push({ type: "code", lang: match[1] || "code", content: match[2].trim() });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) {
    parts.push({ type: "text", content: content.slice(lastIndex) });
  }
  return parts;
}

export default function MessageContent({ content }) {
  const parts = parseMessage(content);
  if (parts.length === 0) return <div>{content}</div>;
  return (
    <div>
      {parts.map((part, i) =>
        part.type === "code" ? (
          <CodeBlock key={i} lang={part.lang} content={part.content} />
        ) : (
          <div key={i} className="msg-text">
            {part.content}
          </div>
        )
      )}
    </div>
  );
    }
