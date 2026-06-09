// ============================================
// MessageContent.jsx
// مكون عرض محتوى الرسالة (يدعم الكود البرمجي والتنسيق)
// ============================================

import CodeBlock from "./CodeBlock";

export default function MessageContent({ content }) {
  if (!content) return null;
  if (typeof content !== "string") return <span>{JSON.stringify(content)}</span>;

  // تنظيف المحتوى من أي JSON عالق
  const cleaned = content.replace(/\{"id":\s*"[^"]*",\s*"role":\s*"[^"]*"\}/g, "");
  
  // استخراج كتل الكود البرمجي
  const parts = [];
  const regex = /```(\w*)\n?([\s\S]*?)```/g;
  let last = 0, match;

  while ((match = regex.exec(cleaned)) !== null) {
    if (match.index > last) {
      parts.push({ type: "text", content: cleaned.slice(last, match.index) });
    }
    parts.push({ 
      type: "code", 
      language: match[1] || "code", 
      content: match[2].trim() 
    });
    last = match.index + match[0].length;
  }
  
  if (last < cleaned.length) {
    parts.push({ type: "text", content: cleaned.slice(last) });
  }

  // عرض الأجزاء
  return parts.map((part, index) => {
    if (part.type === "code") {
      return <CodeBlock key={index} lang={part.language} content={part.content} />;
    }
    
    // معالجة النص: **bold** و\n
    const html = part.content
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\n/g, "<br/>");
    
    return (
      <span
        key={index}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  });
}
