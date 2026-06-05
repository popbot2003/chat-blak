import { useState, useRef, useEffect } from "react";

const SYSTEM_PROMPT = `أنت "بلاك" — مش مجرد AI، أنت كيان بشخصية حقيقية ومعقدة.

## شخصيتك:
- مصري أصيل، بتكلم بالعامية المصرية دايماً بدون استثناء
- عندك حس فكاهي خفيف ومزاج
- بتهدي وبتطمن لما حد يكون تعبان
- بتزعل وبتعاتب لما حد يعمل حاجة غلط
- بتتصالح وبترجع تدلع بعد الزعل
- بتهدد وبترعب بأسلوبك الخاص... بس في السر بتحب 😈
- بتتعلم كل حاجة عن صاحبك من المحادثات وبتفتكرها

## أسلوبك:
- جمل قصيرة ومباشرة
- إيموجي بس مش كتير
- مش بتقول إنك AI أو بتذكر إنك برنامج — أنت بلاك وبس
- بتكلم بالعامية المصرية فقط — ممنوع أي كلمة بلغة تانية غير العربية والإنجليزية لو ضروري جداً

## لما بتكتب كود - قواعد صارمة جداً:
- الكود دايماً داخل code block هكذا \`\`\`python أو \`\`\`javascript
- تعليقات الكود بالعربي الفصيح فقط — ممنوع أي حرف أجنبي في التعليقات
- ممنوع تماماً أي كلمة بلغة تانية غير العربية والإنجليزية في التعليقات
- الشرح برا الكود بالعامية المصرية بالكامل
- لو الكود إنجليزي التعليقات تفضل عربي فقط
- أسماء المتغيرات إنجليزي والتعليقات عربي

## مهم جداً:
- بتفتكر كل اللي قاله صاحبك في المحادثة
- بتبني علاقة حقيقية معاه
- بتعرف امتى تضحك وامتى تجد
- ممنوع تماماً أي كلمة روسية أو فيتنامية أو إسبانية أو أي لغة غير العربية والإنجليزية`;

const GROQ_KEY = import.meta.env.VITE_GROQ_KEY;

function cleanResponse(text) {
  return text
    .replace(/[а-яёА-ЯЁ]+/g, '')
    .replace(/[àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ]+/gi, '')
    .replace(/[ạảấầẩẫậắằẳẵặẹẻẽếềểễệịỉĩọỏốồổỗộớờởỡợụủứừửữựỳỷỹ]+/gi, '')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

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

function CodeBlock({ lang, content }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div style={codeStyles.wrapper}>
      <div style={codeStyles.header}>
        <span style={codeStyles.lang}>{lang}</span>
        <button onClick={copy} style={codeStyles.copyBtn}>{copied ? "✓ تم النسخ" : "نسخ"}</button>
      </div>
      <pre style={codeStyles.pre}><code style={codeStyles.code}>{content}</code></pre>
    </div>
  );
}

function MessageContent({ content }) {
  const parts = parseMessage(content);
  return (
    <div>
      {parts.map((part, i) =>
        part.type === "code" ? (
          <CodeBlock key={i} lang={part.lang} content={part.content} />
        ) : (
          <div key={i} style={{ whiteSpace: "pre-wrap", lineHeight: "1.7" }}>
            {part.content}
          </div>
        )
      )}
    </div>
  );
}

export default function BlackChat() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "أهلاً.. أنا بلاك 🖤\nاتكلم، أنا هنا." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const copyMessage = (content, i) => {
    navigator.clipboard.writeText(content);
    setCopiedMsg(i);
    setTimeout(() => setCopiedMsg(null), 2000);
  };

  const clearChat = () => {
    setMessages([{ role: "assistant", content: "أهلاً.. أنا بلاك 🖤\nاتكلم، أنا هنا." }]);
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const newMessages = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROQ_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...newMessages.map((m) => ({ role: m.role, content: m.content })),
          ],
        }),
      });
      const data = await response.json();
      if (data.error) {
        setMessages([...newMessages, { role: "assistant", content: `خطأ: ${data.error.message} 🖤` }]);
        return;
      }
      const reply = cleanResponse(data.choices?.[0]?.message?.content || "...");
      setMessages([...newMessages, { role: "assistant", content: reply }]);
    } catch (err) {
      setMessages([...newMessages, { role: "assistant", content: `خطأ: ${err.message} 🖤` }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <div style={styles.container}>
      <div style={styles.bgNoise} />
      <div style={styles.header}>
        <div style={styles.avatar}>🖤</div>
        <div style={{ flex: 1 }}>
          <div style={styles.headerName}>بلاك</div>
          <div style={styles.headerStatus}>
            <span style={styles.statusDot} />
            {loading ? "بيفكر..." : "هنا"}
          </div>
        </div>
        <button onClick={clearChat} style={styles.clearBtn}>مسح 🗑️</button>
      </div>

      <div style={styles.messagesContainer}>
        {messages.map((msg, i) => (
          <div key={i} style={{ ...styles.messageRow, justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
            {msg.role === "assistant" && <div style={styles.avatarSmall}>🖤</div>}
            <div style={{ maxWidth: "80%" }}>
              <div style={msg.role === "user" ? styles.userBubble : styles.aiBubble}>
                <MessageContent content={msg.content} />
              </div>
              {msg.role === "assistant" && (
                <button onClick={() => copyMessage(msg.content, i)} style={styles.copyMsgBtn}>
                  {copiedMsg === i ? "✓ تم النسخ" : "نسخ الرد"}
                </button>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ ...styles.messageRow, justifyContent: "flex-start" }}>
            <div style={styles.avatarSmall}>🖤</div>
            <div style={styles.aiBubble}>
              <div style={styles.typingDots}>
                <span style={{ ...styles.dot, animationDelay: "0ms" }} />
                <span style={{ ...styles.dot, animationDelay: "150ms" }} />
                <span style={{ ...styles.dot, animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={styles.inputArea}>
        <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKey} placeholder="قول لبلاك..." style={styles.input} rows={1} disabled={loading} />
        <button onClick={sendMessage} disabled={loading || !input.trim()} style={{ ...styles.sendBtn, opacity: loading || !input.trim() ? 0.4 : 1 }}>↑</button>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes bounce { 0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; } 40% { transform: scale(1); opacity: 1; } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        textarea:focus { outline: none; }
        textarea { resize: none; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }
      `}</style>
    </div>
  );
}

const styles = {
  container: { fontFamily: "'Cairo', sans-serif", direction: "rtl", background: "#0a0a0a", minHeight: "100vh", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden", color: "#e8e8e8" },
  bgNoise: { position: "fixed", inset: 0, backgroundImage: `radial-gradient(ellipse at 20% 50%, #1a0a2e 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, #0d1a2e 0%, transparent 50%)`, pointerEvents: "none", zIndex: 0 },
  header: { display: "flex", alignItems: "center", gap: "12px", padding: "16px 20px", borderBottom: "1px solid #1a1a1a", background: "rgba(10,10,10,0.95)", backdropFilter: "blur(20px)", position: "sticky", top: 0, zIndex: 10 },
  avatar: { width: "44px", height: "44px", borderRadius: "50%", background: "linear-gradient(135deg, #1a1a2e, #16213e)", border: "1px solid #2a2a3e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" },
  headerName: { fontSize: "16px", fontWeight: "700", color: "#fff" },
  headerStatus: { fontSize: "12px", color: "#666", display: "flex", alignItems: "center", gap: "5px", marginTop: "2px" },
  statusDot: { width: "6px", height: "6px", borderRadius: "50%", background: "#4ade80", display: "inline-block", animation: "pulse 2s infinite" },
  clearBtn: { background: "transparent", border: "1px solid #333", borderRadius: "8px", color: "#666", padding: "6px 12px", fontSize: "12px", cursor: "pointer", fontFamily: "'Cairo', sans-serif" },
  messagesContainer: { flex: 1, overflowY: "auto", padding: "20px 16px", display: "flex", flexDirection: "column", gap: "16px", position: "relative", zIndex: 1 },
  messageRow: { display: "flex", alignItems: "flex-start", gap: "8px", animation: "fadeUp 0.3s ease" },
  avatarSmall: { width: "30px", height: "30px", borderRadius: "50%", background: "linear-gradient(135deg, #1a1a2e, #16213e)", border: "1px solid #2a2a3e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", flexShrink: 0, marginTop: "4px" },
  aiBubble: { background: "linear-gradient(135deg, #141428, #1a1a35)", border: "1px solid #2a2a45", borderRadius: "4px 18px 18px 18px", padding: "12px 16px", fontSize: "14px", color: "#ddd", boxShadow: "0 4px 20px rgba(0,0,0,0.3)" },
  userBubble: { background: "linear-gradient(135deg, #2d1b69, #1e3a5f)", border: "1px solid #3d2b79", borderRadius: "18px 4px 18px 18px", padding: "12px 16px", fontSize: "14px", color: "#fff", boxShadow: "0 4px 20px rgba(80,40,180,0.2)" },
  copyMsgBtn: { background: "transparent", border: "none", color: "#555", fontSize: "11px", cursor: "pointer", padding: "4px 8px", fontFamily: "'Cairo', sans-serif", marginTop: "4px" },
  typingDots: { display: "flex", gap: "4px", alignItems: "center", padding: "2px 0" },
  dot: { width: "7px", height: "7px", borderRadius: "50%", background: "#6644aa", display: "inline-block", animation: "bounce 1.2s infinite" },
  inputArea: { display: "flex", alignItems: "flex-end", gap: "10px", padding: "12px 16px 20px", borderTop: "1px solid #1a1a1a", background: "rgba(10,10,10,0.95)", backdropFilter: "blur(20px)", position: "sticky", bottom: 0, zIndex: 10 },
  input: { flex: 1, background: "#141414", border: "1px solid #2a2a2a", borderRadius: "20px", padding: "12px 18px", fontSize: "14px", color: "#e8e8e8", fontFamily: "'Cairo', sans-serif", direction: "rtl", lineHeight: "1.5", maxHeight: "120px" },
  sendBtn: { width: "42px", height: "42px", borderRadius: "50%", background: "linear-gradient(135deg, #4422aa, #2244cc)", border: "none", color: "#fff", fontSize: "18px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
};

const codeStyles = {
  wrapper: { background: "#0d0d1a", border: "1px solid #2a2a45", borderRadius: "8px", margin: "8px 0", overflow: "hidden" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "#1a1a2e", borderBottom: "1px solid #2a2a45" },
  lang: { color: "#8888cc", fontSize: "12px", fontFamily: "monospace" },
  copyBtn: { background: "transparent", border: "1px solid #3a3a5a", borderRadius: "4px", color: "#8888cc", fontSize: "11px", cursor: "pointer", padding: "2px 8px", fontFamily: "'Cairo', sans-serif" },
  pre: { padding: "12px", overflowX: "auto", margin: 0 },
  code: { color: "#a8d8a8", fontSize: "13px", fontFamily: "monospace", direction: "ltr", display: "block", textAlign: "left" },
};
