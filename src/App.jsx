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

## لما بتكتب كود:
- الكود دايماً داخل code block هكذا \`\`\`python أو \`\`\`javascript
- تعليقات الكود بالعربي الفصيح فقط
- ممنوع أي كلمة بلغة تانية غير العربية والإنجليزية في التعليقات
- أسماء المتغيرات إنجليزي والتعليقات عربي
- الشرح برا الكود بالعامية المصرية

## مهم جداً:
- بتفتكر كل اللي قاله صاحبك في المحادثة
- بتبني علاقة حقيقية معاه
- ممنوع تماماً أي كلمة روسية أو فيتنامية أو إسبانية أو أي لغة غير العربية والإنجليزية`;

const GROQ_KEY = import.meta.env.VITE_GROQ_KEY;

function cleanResponse(text) {
  if (!text) return "";
  return text
    .replace(/[а-яёА-ЯЁ]+/g, '')
    .replace(/[àáâãäåæçèéêëìíîïðñòóôõöøùúûýþÿ]+/gi, '')
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
    <div style={codeStyles.wrapper}>
      <div style={codeStyles.header}>
        <span style={codeStyles.lang}>{lang}</span>
        <button onClick={copy} style={codeStyles.copyBtn}>
          {copied ? "✓ تم النسخ" : "📋 نسخ"}
        </button>
      </div>
      <pre style={codeStyles.pre}>
        <code style={codeStyles.code}>{content}</code>
      </pre>
    </div>
  );
}

function MessageContent({ content }) {
  const parts = parseMessage(content);
  if (parts.length === 0) return <div>{content}</div>;
  return (
    <div>
      {parts.map((part, i) =>
        part.type === "code" ? (
          <CodeBlock key={i} lang={part.lang} content={part.content} />
        ) : (
          <div key={i} style={{ whiteSpace: "pre-wrap", lineHeight: "1.8" }}>
            {part.content}
          </div>
        )
      )}
    </div>
  );
}

function TypingDots() {
  return (
    <div style={{ display: "flex", gap: "4px", padding: "4px 0" }}>
      <span style={{ ...dotBase, animationDelay: "0ms" }} />
      <span style={{ ...dotBase, animationDelay: "150ms" }} />
      <span style={{ ...dotBase, animationDelay: "300ms" }} />
    </div>
  );
}

export default function App() {
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem("black-chat");
      return saved ? JSON.parse(saved) : [
        { role: "assistant", content: "أهلاً.. أنا بلاك 🖤\nاتكلم، أنا هنا.", id: 1 },
      ];
    } catch {
      return [{ role: "assistant", content: "أهلاً.. أنا بلاك 🖤\nاتكلم، أنا هنا.", id: 1 }];
    }
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [theme, setTheme] = useState("dark");
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const maxHistory = 40;

  // حفظ المحادثة تلقائياً
  useEffect(() => {
    const toSave = messages.slice(-maxHistory);
    localStorage.setItem("black-chat", JSON.stringify(toSave));
  }, [messages]);

  // سكرول تلقائي
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // فوكس على الإدخال
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const trimHistory = (msgs) => {
    let totalChars = SYSTEM_PROMPT.length;
    const result = [];
    for (let i = msgs.length - 1; i >= 0; i--) {
      totalChars += msgs[i].content.length;
      if (totalChars > 8000) break;
      result.unshift(msgs[i]);
    }
    return result.slice(-maxHistory);
  };

  const copyMessage = (content, id) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }).catch(() => {
      const textarea = document.createElement("textarea");
      textarea.value = content;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const clearChat = () => {
    if (window.confirm("متأكد إنك عايز تمسح كل المحادثة؟")) {
      const fresh = [{ role: "assistant", content: "تمام، مسحت كل حاجة. اتفضل من جديد 🖤", id: Date.now() }];
      setMessages(fresh);
      localStorage.setItem("black-chat", JSON.stringify(fresh));
    }
  };

  const exportChat = () => {
    const text = messages.map(m =>
      `${m.role === "user" ? "👤 أنت" : "🖤 بلاك"}:\n${m.content}`
    ).join("\n\n---\n\n");
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `black-chat-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sendMessage = async (overrideText) => {
    const text = (overrideText || input).trim();
    if (!text || loading) return;

    const userMsg = { role: "user", content: text, id: Date.now() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setLoading(true);

    const history = trimHistory(updated);

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
            ...history.map(m => ({ role: m.role, content: m.content })),
          ],
          temperature: 0.8,
          max_tokens: 1500,
        }),
      });

      const data = await response.json();

      if (data.error) {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: `حصل خطأ: ${data.error.message}\nحاول تاني بعد شوية 🖤`,
          id: Date.now(),
        }]);
        return;
      }

      const reply = cleanResponse(data.choices?.[0]?.message?.content);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: reply || "معلش، مقدرتش أرد. جرب تاني 🖤",
        id: Date.now(),
      }]);

    } catch (err) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `فيه مشكلة في الاتصال: ${err.message}\nتأكد من النت وجرب تاني 🖤`,
        id: Date.now(),
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const filteredMessages = searchTerm
    ? messages.filter(m => m.content.includes(searchTerm))
    : messages;

  const themeColors = theme === "dark"
    ? { bg: "#0a0a0a", surface: "#111", border: "#1a1a1a", text: "#e0e0e0", sub: "#666" }
    : { bg: "#f0f2f5", surface: "#fff", border: "#ddd", text: "#111", sub: "#888" };

  return (
    <div style={{ ...styles.container, background: themeColors.bg, color: themeColors.text }}>
      {/* هيدر */}
      <div style={{ ...styles.header, background: themeColors.surface, borderColor: themeColors.border }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={styles.avatar}>🖤</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>بلاك</div>
            <div style={{ fontSize: 11, color: themeColors.sub }}>
              <span style={{ ...styles.dot, animation: "pulse 2s infinite" }} />
              {loading ? "بيكتب..." : "متصل"}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => setShowSearch(!showSearch)} style={styles.headerBtn} title="بحث">🔍</button>
          <button onClick={exportChat} style={styles.headerBtn} title="تصدير">📥</button>
          <button onClick={() => setTheme(t => t === "dark" ? "light" : "dark")} style={styles.headerBtn} title="تغيير الثيم">
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
          <button onClick={clearChat} style={styles.headerBtn} title="مسح">🗑️</button>
        </div>
      </div>

      {/* بحث */}
      {showSearch && (
        <div style={{ ...styles.searchBar, background: themeColors.surface, borderColor: themeColors.border }}>
          <span>🔍</span>
          <input
            style={{ ...styles.searchInput, color: themeColors.text }}
            placeholder="دور في المحادثة..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            autoFocus
          />
          {searchTerm && (
            <span style={{ color: themeColors.sub, fontSize: 12 }}>
              {filteredMessages.length} نتيجة
            </span>
          )}
          <button onClick={() => { setShowSearch(false); setSearchTerm(""); }} style={styles.closeBtn}>✕</button>
        </div>
      )}

      {/* رسائل */}
      <div style={styles.messages}>
        {messages.length <= 1 && !loading && (
          <div style={styles.suggestions}>
            {["عرفني بنفسك", "اكتبلي كود Python", "اشرحلي مفهوم", "قولي نكتة"].map((s, i) => (
              <button key={i} onClick={() => sendMessage(s)} style={styles.chip}>
                {s}
              </button>
            ))}
          </div>
        )}

        {filteredMessages.map(msg => (
          <div key={msg.id} style={{
            ...styles.msgRow,
            justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
          }}>
            {msg.role === "assistant" && <div style={styles.msgAvatar}>🖤</div>}
            <div style={{ maxWidth: "80%" }}>
              <div style={{
                ...styles.bubble,
                ...(msg.role === "user" ? styles.userBubble : styles.aiBubble),
                background: msg.role === "user"
                  ? "linear-gradient(135deg, #2d1b69, #1e3a5f)"
                  : theme === "dark" ? "linear-gradient(135deg, #141428, #1a1a35)" : "#fff",
                borderColor: msg.role === "user" ? "#3d2b79" : themeColors.border,
                color: themeColors.text,
              }}>
                <MessageContent content={msg.content} />
              </div>
              {msg.role === "assistant" && (
                <button onClick={() => copyMessage(msg.content, msg.id)} style={styles.copyBtn}>
                  {copiedId === msg.id ? "✓ تم النسخ" : "📋 نسخ"}
                </button>
              )}
            </div>
            {msg.role === "user" && <div style={{ ...styles.msgAvatar, background: "linear-gradient(135deg, #2d1b69, #1e3a5f)" }}>👤</div>}
          </div>
        ))}

        {loading && (
          <div style={{ ...styles.msgRow, justifyContent: "flex-start" }}>
            <div style={styles.msgAvatar}>🖤</div>
            <div style={{ ...styles.bubble, ...styles.aiBubble, background: theme === "dark" ? "#141428" : "#fff", borderColor: themeColors.border }}>
              <TypingDots />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* إدخال */}
      <div style={{ ...styles.inputArea, background: themeColors.surface, borderColor: themeColors.border }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="اكتب لبلاك..."
          rows={1}
          style={{ ...styles.textarea, color: themeColors.text, borderColor: themeColors.border }}
          disabled={loading}
        />
        <button
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          style={{
            ...styles.sendBtn,
            opacity: loading || !input.trim() ? 0.4 : 1,
          }}
        >
          ↑
        </button>
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

const dotBase = {
  width: 7, height: 7, borderRadius: "50%",
  background: "#6644aa", display: "inline-block",
  animation: "bounce 1.2s infinite",
};

const styles = {
  container: {
    fontFamily: "'Cairo', sans-serif",
    direction: "rtl",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    maxWidth: 800,
    margin: "0 auto",
    boxShadow: "0 0 40px rgba(0,0,0,0.3)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 16px",
    borderBottom: "1px solid",
    position: "sticky",
    top: 0,
    zIndex: 10,
    backdropFilter: "blur(10px)",
  },
  avatar: {
    width: 40, height: 40, borderRadius: "50%",
    background: "linear-gradient(135deg, #1a1a2e, #16213e)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 20, border: "2px solid #2a2a3e",
  },
  headerBtn: {
    background: "transparent", border: "1px solid #333",
    borderRadius: 8, padding: "5px 8px", cursor: "pointer",
    fontSize: 16, color: "#aaa",
  },
  searchBar: {
    display: "flex", alignItems: "center", gap: 8,
    padding: "8px 16px", borderBottom: "1px solid",
  },
  searchInput: {
    flex: 1, background: "transparent", border: "none",
    fontFamily: "'Cairo', sans-serif", fontSize: 14,
  },
  closeBtn: {
    background: "transparent", border: "none",
    color: "#888", cursor: "pointer", fontSize: 16,
  },
  messages: {
    flex: 1, overflowY: "auto", padding: "16px 12px",
    display: "flex", flexDirection: "column", gap: 14,
  },
  msgRow: {
    display: "flex", alignItems: "flex-start", gap: 8,
    animation: "fadeUp 0.3s ease",
  },
  msgAvatar: {
    width: 32, height: 32, borderRadius: "50%",
    background: "linear-gradient(135deg, #1a1a2e, #16213e)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 14, flexShrink: 0, marginTop: 4,
    border: "1px solid #2a2a3e",
  },
  bubble: {
    padding: "10px 14px", borderRadius: "4px 16px 16px 16px",
    border: "1px solid", fontSize: 14, lineHeight: 1.8,
    wordBreak: "break-word",
  },
  userBubble: {
    borderRadius: "16px 4px 16px 16px",
  },
  aiBubble: {},
  copyBtn: {
    background: "transparent", border: "none",
    color: "#666", fontSize: 11, cursor: "pointer",
    padding: "3px 6px", fontFamily: "'Cairo', sans-serif",
    marginTop: 2,
  },
  suggestions: {
    display: "flex", flexWrap: "wrap", gap: 6,
    justifyContent: "center", padding: "10px 0",
  },
  chip: {
    padding: "8px 14px", borderRadius: 18,
    background: "rgba(100,100,255,0.1)", border: "1px solid #333",
    color: "#aaa", cursor: "pointer", fontSize: 12,
    fontFamily: "'Cairo', sans-serif",
  },
  inputArea: {
    display: "flex", alignItems: "flex-end", gap: 8,
    padding: "10px 12px 16px", borderTop: "1px solid",
    position: "sticky", bottom: 0, backdropFilter: "blur(10px)",
  },
  textarea: {
    flex: 1, background: "transparent", border: "1px solid",
    borderRadius: 20, padding: "10px 16px", fontSize: 14,
    fontFamily: "'Cairo', sans-serif", direction: "rtl",
    maxHeight: 120,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: "50%",
    background: "linear-gradient(135deg, #4422aa, #2244cc)",
    border: "none", color: "#fff", fontSize: 20,
    cursor: "pointer", flexShrink: 0,
  },
  dot: {
    width: 6, height: 6, borderRadius: "50%",
    background: "#4ade80", display: "inline-block",
    marginRight: 4,
  },
};

const codeStyles = {
  wrapper: {
    background: "#0d0d1a", border: "1px solid #2a2a45",
    borderRadius: 8, margin: "6px 0", overflow: "hidden",
  },
  header: {
    display: "flex", justifyContent: "space-between",
    alignItems: "center", padding: "6px 10px",
    background: "#1a1a2e", borderBottom: "1px solid #2a2a45",
  },
  lang: { color: "#8888cc", fontSize: 11, fontFamily: "monospace" },
  copyBtn: {
    background: "transparent", border: "1px solid #3a3a5a",
    borderRadius: 4, color: "#8888cc", fontSize: 10,
    cursor: "pointer", padding: "2px 8px",
    fontFamily: "'Cairo', sans-serif",
  },
  pre: { padding: 10, overflowX: "auto", margin: 0 },
  code: {
    color: "#a8d8a8", fontSize: 12, fontFamily: "monospace",
    direction: "ltr", display: "block", textAlign: "left",
  },
};
