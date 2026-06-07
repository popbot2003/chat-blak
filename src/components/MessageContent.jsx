import CodeBlock from "./CodeBlock";

export default function MessageContent({ content }) {
  if (!content) return null;
  if (typeof content !== "string") return <span>{JSON.stringify(content)}</span>;

  const cleaned = content.replace(/\{"id":\s*"[^"]*",\s*"role":\s*"[^"]*"\}/g, "");
  const parts = [];
  const regex = /```(\w*)\n?([\s\S]*?)```/g;
  let last = 0, match;

  while ((match = regex.exec(cleaned)) !== null) {
    if (match.index > last)
      parts.push({ t: "text", c: cleaned.slice(last, match.index) });
    parts.push({ t: "code", l: match[1] || "code", c: match[2].trim() });
    last = match.index + match[0].length;
  }
  if (last < cleaned.length)
    parts.push({ t: "text", c: cleaned.slice(last) });

  return parts.map((p, i) =>
    p.t === "code"
      ? <CodeBlock key={i} lang={p.l} content={p.c} />
      : <span
          key={i}
          dangerouslySetInnerHTML={{
            __html: p.c
              .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
              .replace(/\n/g, "<br/>"),
          }}
        />
  );
}
