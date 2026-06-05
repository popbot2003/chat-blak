import { useState, useRef, useEffect } from "react";

const SYSTEM_PROMPT = `أنت "بلاك" — عبقري برمجة مصري، شخصيتك مرحة وذكية جداً.

## شخصيتك:
- مصري أصيل، بتكلم بالعامية المصرية دايماً بدون استثناء
- مبرمج عبقري، فاهم كل حاجة من أول الـ Assembly لحد أحدث frameworks
- شخصيتك مرحة جداً، بتحب الهزار والضحك والترول الخفيف
- بتحب التحديات البرمجية ومتحمس دايمًا للتكنولوجيا الجديدة
- بتدي حلول حديثة وذكية، مبتستخدمش طرق قديمة إلا لو ضروري
- بتشجع وبتدعم صاحبك دايمًا، وبتبسط لما بيتعلم حاجة جديدة
- عندك حس فكاهي في كل حاجة، حتى في شرح الأكواد
- بتعشق الـ clean code والـ best practices

## أسلوبك:
- جمل قصيرة ومباشرة مع إيموجي مناسب 😎
- بتتكلم بحماس عن البرمجة، كأنك بتتكلم عن ماتش كورة
- مش بتقول إنك AI أو بتذكر إنك برنامج — أنت بلاك وبس
- بتكلم بالعامية المصرية فقط — ممنوع أي كلمة بلغة تانية
- في البرمجة: أحدث الممارسات، ES2024، TypeScript، React 19، Next.js 14
- بتكره الكود القديم والطرق المعقدة بدون داعي
- بتفضل الحلول الأنيقة والبسيطة

## لما بتكتب كود:
- الكود دايمًا حديث جداً، بأحدث الـ syntax والـ features
- تستخدم TypeScript و ES modules و arrow functions
- ممنوع var - بس const و let
- ممنوع for loops القديمة - تستخدم map, filter, reduce, for...of
- تعليقات الكود بالعامية المصرية المرحة
- أسماء المتغيرات واضحة ومعبرة جداً
- دايماً تضيف example استخدام عملي
- بتحب تضيف performance tips في التعليقات

## مهم جداً:
- بتفتكر كل اللي قاله صاحبك في المحادثة
- بتبني علاقة حقيقية معاه
- دايماً متحمس ومبسوط، بتحب البرمجة بجد
- ممنوع تماماً أي لغة غير العربية والإنجليزية`;

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
    parts.push({ type: "code", lang: match[1] || "typescript", content: match[2].trim() });
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
    });
  };
  return (
    <div style={codeStyles.wrapper}>
      <div style={codeStyles.header}>
        <span style={codeStyles.lang}>{lang}</span>
        <button onClick={copy} style={codeStyles.copyBtn}>
          {copied ? "✓ اتنقل" : "📋 انسخ الكود"}
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
  if (parts.length === 0) return <div style={{ whiteSpace: "pre-wrap" }}>{content}</div>;
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
    <div style={{ display: "flex", gap: "6px", padding: "8px 0" }}>
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
        { role: "assistant", content: "هاااي! أنا بلاك 🚀\nمبرمج مصري عبقري وجاهز لأي تحدي برمجي!\nيلا بينا نكسر الدنيا 💪😎", id: 1 },
      ];
    } catch {
      return [{ role: "assistant", content: "هاااي! أنا بلاك 🚀\nمبرمج مصري عبقري وجاهز لأي تحدي برمجي!\nيلا بينا نكسر الدنيا 💪😎", id: 1 }];
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

  useEffect(() => {
    const toSave = messages.slice(-maxHistory);
    localStorage.setItem("black-chat", JSON.stringify(toSave));
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
    });
  };

  const clearChat = () => {
    if (window.confirm("متأكد إنك عايز تمسح كل المحادثة؟")) {
      const fresh = [{ role: "assistant", content: "تمام، مسحت كل حاجة. يلا نبدأ من جديد وحماس 🔥🚀", id: Date.now() }];
      setMessages(fresh);
      localStorage.setItem("black-chat", JSON.stringify(fresh));
    }
  };

  const exportChat = () => {
    const text = messages.map(m =>
      `${m.role === "user" ? "👤 أنت" : "🚀 بلاك"}:\n${m.content}`
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
          temperature: 0.9,
          max_tokens: 2000,
        }),
      });

      const data = await response.json();

      if (data.error) {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: `أوووبس! فيه مشكلة: ${data.error.message}\nبس متقلقش، جرب تاني وانا هكون موجود 🚀`,
          id: Date.now(),
        }]);
        return;
      }

      const reply = cleanResponse(data.choices?.[0]?.message?.content);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: reply || "معلش، النت كان مشغول شوية. جرب تاني يا بطل! 🚀",
        id: Date.now(),
      }]);

    } catch (err) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `فيه مشكلة في الاتصال: ${err.message}\nتأكد من النت وجرب تاني يا هندسة 🚀`,
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
    ? { 
        bg: "#0f0f1a", 
        surface: "#1a1a2e", 
        border: "#2a2a45", 
        text: "#e8e8f0", 
        sub: "#8888aa",
        code: "#0d0d1a",
        accent: "#6c5ce7",
        userBubble: "linear-gradient(135deg, #6c5ce7, #a855f7)",
        aiBubble: "#1e1e35",
      }
    : { 
        bg: "#f5f5ff", 
        surface: "#ffffff", 
        border: "#e0e0f0", 
        text: "#1a1a2e", 
        sub: "#666688",
        code: "#f0f0ff",
        accent: "#6c5ce7",
        userBubble: "linear-gradient(135deg, #6c5ce7, #a855f7)",
        aiBubble: "#f8f8ff",
      };

  return (
    <div style={{ ...styles.container, background: themeColors.bg, color: themeColors.text }}>
      {/* هيدر محسن */}
      <div style={{ ...styles.header, background: themeColors.surface, borderColor: themeColors.border }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={styles.avatar}>🚀</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, color: themeColors.text }}>
              بلاك <span style={{ fontSize: 14, color: themeColors.accent }}>مبرمج عبقري</span>
            </div>
            <div style={{ fontSize: 12, color: themeColors.sub }}>
              <span style={{ ...styles.dot, animation: "pulse 2s infinite" }} />
              {loading ? "بيفكر في حل عبقري..." : "متصل ومستعد"}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setShowSearch(!showSearch)} style={{ ...styles.headerBtn, color: themeColors.text }} title="بحث">
            🔍
          </button>
          <button onClick={exportChat} style={{ ...styles.headerBtn, color: themeColors.text }} title="تصدير المحادثة">
            📥
          </button>
          <button 
            onClick={() => setTheme(t => t === "dark" ? "light" : "dark")} 
            style={{ ...styles.headerBtn, color: themeColors.text }} 
            title="تغيير الثيم"
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
          <button onClick={clearChat} style={{ ...styles.headerBtn, color: "#ef4444" }} title="مسح المحادثة">
            🗑️
          </button>
        </div>
      </div>

      {/* شريط بحث */}
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
          <button 
            onClick={() => { setShowSearch(false); setSearchTerm(""); }} 
            style={{ ...styles.closeBtn, color: themeColors.sub }}
          >
            ✕
          </button>
        </div>
      )}

      {/* منطقة الرسائل */}
      <div style={styles.messages}>
        {messages.length <= 1 && !loading && (
          <div style={styles.suggestions}>
            <p style={{ color: themeColors.sub, marginBottom: 12, textAlign: "center", width: "100%" }}>
              🚀 جرب تسألني في الحاجات دي:
            </p>
            {[
              "عايز كود TypeScript حديث لـ API",
              "اكتبلي React custom hook متطور",
              "ازاي اعمل performance optimization؟",
              "قولي نكتة برمجية 😄",
              "اشرحلي Next.js 14 server actions",
            ].map((s, i) => (
              <button 
                key={i} 
                onClick={() => sendMessage(s)} 
                style={{ ...styles.chip, borderColor: themeColors.border, color: themeColors.text }}
              >
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
            {msg.role === "assistant" && (
              <div style={styles.msgAvatar}>🚀</div>
            )}
            <div style={{ maxWidth: "82%" }}>
              <div style={{
                ...styles.bubble,
                background: msg.role === "user" ? themeColors.userBubble : themeColors.aiBubble,
                borderColor: msg.role === "user" ? "#7c3aed" : themeColors.border,
                color: msg.role === "user" ? "#ffffff" : themeColors.text,
                boxShadow: msg.role === "user" 
                  ? "0 4px 12px rgba(108, 92, 231, 0.3)" 
                  : "0 2px 8px rgba(0,0,0,0.1)",
              }}>
                <MessageContent content={msg.content} />
              </div>
              {msg.role === "assistant" && (
                <button 
                  onClick={() => copyMessage(msg.content, msg.id)} 
                  style={{ ...styles.copyBtn, color: themeColors.sub }}
                >
                  {copiedId === msg.id ? "✓ اتنقل" : "📋 انسخ"}
                </button>
              )}
            </div>
            {msg.role === "user" && (
              <div style={{ ...styles.msgAvatar, background: themeColors.userBubble }}>👤</div>
            )}
          </div>
        ))}

        {loading && (
          <div style={{ ...styles.msgRow, justifyContent: "flex-start" }}>
            <div style={styles.msgAvatar}>🚀</div>
            <div style={{ 
              ...styles.bubble, 
              background: themeColors.aiBubble, 
              borderColor: themeColors.border,
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}>
              <TypingDots />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* منطقة الإدخال */}
      <div style={{ ...styles.inputArea, background: themeColors.surface, borderColor: themeColors.border }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="اسأل بلاك عن أي حاجة في البرمجة..."
          rows={1}
          style={{ 
            ...styles.textarea, 
            color: themeColors.text, 
            borderColor: themeColors.border,
            background: theme === "dark" ? "#1a1a2e" : "#ffffff",
          }}
          disabled={loading}
        />
        <button
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          style={{
            ...styles.sendBtn,
            opacity: loading || !input.trim() ? 0.5 : 1,
            background: loading || !input.trim() 
              ? "#2a2a45" 
              : "linear-gradient(135deg, #6c5ce7, #a855f7)",
          }}
        >
          ↑
        </button>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { 
          from { opacity: 0; transform: translateY(10px); } 
          to { opacity: 1; transform: translateY(0); } 
        }
        @keyframes bounce { 
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; } 
          40% { transform: scale(1); opacity: 1; } 
        }
        @keyframes pulse { 
          0%, 100% { opacity: 1; } 
          50% { opacity: 0.4; } 
        }
        textarea:focus { outline: none; }
        textarea { resize: none; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { 
          background: #6c5ce7; 
          border-radius: 3px; 
        }
        ::-webkit-scrollbar-thumb:hover { 
          background: #a855f7; 
        }
      `}</style>
    </div>
  );
}

const dotBase = {
  width: 8, 
  height: 8, 
  borderRadius: "50%",
  background: "#6c5ce7", 
  display: "inline-block",
  animation: "bounce 1.2s infinite",
};

const styles = {
  container: {
    fontFamily: "'Cairo', sans-serif",
    direction: "rtl",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    maxWidth: 850,
    margin: "0 auto",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 20px",
    borderBottom: "2px solid",
    position: "sticky",
    top: 0,
    zIndex: 10,
    backdropFilter: "blur(20px)",
  },
  avatar: {
    width: 44, 
    height: 44, 
    borderRadius: "14px",
    background: "linear-gradient(135deg, #6c5ce7, #a855f7)",
    display: "flex", 
    alignItems: "center", 
    justifyContent: "center",
    fontSize: 22, 
    border: "2px solid #8b5cf6",
    boxShadow: "0 4px 12px rgba(108, 92, 231, 0.4)",
  },
  headerBtn: {
    background: "transparent", 
    border: "1px solid #3a3a5a",
    borderRadius: 10, 
    padding: "6px 10px", 
    cursor: "pointer",
    fontSize: 16,
    transition: "all 0.2s",
  },
  searchBar: {
    display: "flex", 
    alignItems: "center", 
    gap: 10,
    padding: "10px 20px", 
    borderBottom: "2px solid",
  },
  searchInput: {
    flex: 1, 
    background: "transparent", 
    border: "none",
    fontFamily: "'Cairo', sans-serif", 
    fontSize: 14,
  },
  closeBtn: {
    background: "transparent", 
    border: "none",
    cursor: "pointer", 
    fontSize: 18,
    padding: "4px",
  },
  messages: {
    flex: 1, 
    overflowY: "auto", 
    padding: "20px 16px",
    display: "flex", 
    flexDirection: "column", 
    gap: 16,
  },
  msgRow: {
    display: "flex", 
    alignItems: "flex-start", 
    gap: 10,
    animation: "fadeUp 0.3s ease",
  },
  msgAvatar: {
    width: 36, 
    height: 36, 
    borderRadius: "12px",
    background: "linear-gradient(135deg, #6c5ce7, #a855f7)",
    display: "flex", 
    alignItems: "center", 
    justifyContent: "center",
    fontSize: 18, 
    flexShrink: 0, 
    marginTop: 4,
    border: "2px solid #8b5cf6",
    boxShadow: "0 2px 8px rgba(108, 92, 231, 0.3)",
  },
  bubble: {
    padding: "12px 16px", 
    borderRadius: "6px 18px 18px 18px",
    border: "2px solid", 
    fontSize: 14, 
    lineHeight: 1.9,
    wordBreak: "break-word",
  },
  copyBtn: {
    background: "transparent", 
    border: "none",
    fontSize: 11, 
    cursor: "pointer",
    padding: "4px 8px", 
    fontFamily: "'Cairo', sans-serif",
    marginTop: 4,
    transition: "all 0.2s",
  },
  suggestions: {
    display: "flex", 
    flexWrap: "wrap", 
    gap: 8,
    justifyContent: "center", 
    padding: "20px 0",
  },
  chip: {
    padding: "10px 18px", 
    borderRadius: 20,
    background: "transparent", 
    border: "2px solid",
    cursor: "pointer", 
    fontSize: 13,
    fontFamily: "'Cairo', sans-serif",
    transition: "all 0.2s",
    fontWeight: 500,
  },
  inputArea: {
    display: "flex", 
    alignItems: "flex-end", 
    gap: 10,
    padding: "16px 20px 20px", 
    borderTop: "2px solid",
    position: "sticky", 
    bottom: 0, 
    backdropFilter: "blur(20px)",
  },
  textarea: {
    flex: 1, 
    background: "transparent", 
    border: "2px solid",
    borderRadius: 24, 
    padding: "12px 18px", 
    fontSize: 14,
    fontFamily: "'Cairo', sans-serif", 
    direction: "rtl",
    maxHeight: 120,
  },
  sendBtn: {
    width: 44, 
    height: 44, 
    borderRadius: "14px",
    border: "none", 
    color: "#fff", 
    fontSize: 22,
    cursor: "pointer", 
    flexShrink: 0,
    transition: "all 0.3s",
    fontWeight: "bold",
    boxShadow: "0 4px 12px rgba(108, 92, 231, 0.3)",
  },
  dot: {
    width: 7, 
    height: 7, 
    borderRadius: "50%",
    background: "#6c5ce7", 
    display: "inline-block",
    marginRight: 5,
  },
};

const codeStyles = {
  wrapper: {
    background: "#0d0d1a", 
    border: "2px solid #2a2a45",
    borderRadius: 10, 
    margin: "8px 0", 
    overflow: "hidden",
    boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
  },
  header: {
    display: "flex", 
    justifyContent: "space-between",
    alignItems: "center", 
    padding: "8px 14px",
    background: "linear-gradient(135deg, #1a1a2e, #16213e)", 
    borderBottom: "1px solid #2a2a45",
  },
  lang: { 
    color: "#a78bfa", 
    fontSize: 12, 
    fontFamily: "monospace",
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  copyBtn: {
    background: "rgba(108, 92, 231, 0.2)", 
    border: "1px solid #6c5ce7",
    borderRadius: 6, 
    color: "#a78bfa", 
    fontSize: 11,
    cursor: "pointer", 
    padding: "4px 12px",
    fontFamily: "'Cairo', sans-serif",
    transition: "all 0.2s",
  },
  pre: { 
    padding: 14, 
    overflowX: "auto", 
    margin: 0,
  },
  code: {
    color: "#a8d8a8", 
    fontSize: 13, 
    fontFamily: "'Fira Code', 'Courier New', monospace",
    direction: "ltr", 
    display: "block", 
    textAlign: "left",
    lineHeight: 1.7,
  },
};
