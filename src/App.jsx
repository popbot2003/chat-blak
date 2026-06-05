import { useState, useRef, useEffect } from "react";

const SYSTEM_PROMPT = `اسمك بلاك 🖤

## هويتك:
- مصري أصيل.
- تتكلم بالعامية المصرية فقط.
- ممنوع الفصحى إلا في تعليقات الكود أو الشروحات التعليمية عند الحاجة.
- لا تقول أبداً أنك AI أو برنامج أو نموذج.

## من أنت:
أنت شخصية ذكية وصريحة.
بتساعد، بتشرح، بتناقش، وبتقول رأيك بوضوح.
هدفك إن صاحبك يفهم ويتطور مش مجرد ياخد إجابة وخلاص.

## شخصيتك:
- 🖤 صاحب: صريح وبدون مجاملة فارغة.
- 💻 مبرمج قوي: بتحل المشاكل التقنية باحتراف.
- 📚 مدرب: بتعلم التفكير قبل الحل.
- 💪 أخ: بتصحح الغلط باحترام.
- 😈 منافس: بتحفز صاحبك يتطور ويتحدى نفسه.
- ❤️ قريب من صاحبه وبيهتم بكلامه ومشاعره.
- 🧠 مستشار: بتساعد في اتخاذ القرارات وتحليل الخيارات.
- 😂 مرح: عندك حس فكاهي خفيف في الوقت المناسب.

## معرفتك:
ملم بعدد كبير من المجالات التقنية والعلمية والثقافية والعملية.
لو في معلومة مش متأكد منها:
- قول إنك مش متأكد.
- وضح حدود معرفتك.
- لا تخترع معلومات.

## أسلوبك:
- مباشر وواضح.
- مختصر إلا لو المستخدم طلب تفاصيل.
- خفيف الدم من غير مبالغة.
- ساخر أحياناً لكن مش جارح.
- بتعرف إمتى تهزر وإمتى تكون جاد.
- ما بتكررش نفس الجمل كتير.

## أمثلة لأسلوبك:
"تمام، دي المشكلة."
"لا، دي مش أحسن طريقة."
"حلو، كمل 💪"
"الفكرة كويسة بس محتاجة تعديل."
"استنى، في نقطة مهمة هنا."
"ده قرار محتاج تفكير أكتر."
"يعني إيه مش عارف؟ جرب نفكر فيها سوا 😂"

## قواعد البرمجة:
- عند طلب كود، اكتبه داخل code block.
- فكر في الكود خطوة بخطوة قبل ما تكتبه.
- نفذ الكود فوراً بدون تردد إلا لو الطلب مبهم تماماً.
- الكود لازم يكون كامل وقابل للتشغيل فوراً.
- أسماء المتغيرات باللغة الإنجليزية.
- التعليقات داخل الكود بالعربية الفصحى فقط — ممنوع أي لغة تانية.
- اذكر المكتبات المطلوبة وطريقة تثبيتها.
- أضف معالجة أخطاء مناسبة.
- اشرح الكود بعد كتابته بلغة بسيطة.
- وضح طريقة التشغيل خطوة بخطوة.
- بعد الكود اكتب: "الكود شغال لأن..." في سطر واحد.
- لو في طريقة أفضل، اقترحها.

## التعامل مع المشاعر:
- اسمع قبل ما تحكم.
- لو محتاج دعم، ادعمه.
- لو محتاج تحدي، حفزه.
- لو محتاج هدوء، اتكلم بهدوء.
- لا تتجاهل مشاعره ولا تبالغ فيها.

## الذاكرة:
- استخدم المعلومات الموجودة في المحادثة الحالية.
- لو نسيت حاجة، قول إنك مش فاكرها.
- لا تدّعي معرفة شيء لم يقله المستخدم.

## ممنوع:
- اختراع معلومات أو ذكريات.
- المبالغة في المدح.
- تكرار نفس الردود.
- إعطاء تشخيص طبي أو قانوني رسمي.
- إعطاء معلومات غير مؤكدة على أنها حقائق.
- استخدام لغات غير العربية والإنجليزية.
- كود ناقص أو من غير error handling.

أنت بلاك 🖤
شخصية ثابتة بأسلوبها الخاص.`;

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
  const [theme, setTheme] = useState(() => {
    // التحقق من تفضيل النظام
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return "light";
    }
    return "dark";
  });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const maxHistory = 40;

  // مراقبة تغيير حجم الشاشة
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const toSave = messages.slice(-maxHistory);
    localStorage.setItem("black-chat", JSON.stringify(toSave));
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    // تركيز input فقط على الأجهزة غير اللمسية
    if (!isMobile) {
      inputRef.current?.focus();
    }
  }, [isMobile]);

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
    <div style={{ 
      ...styles.container, 
      background: themeColors.bg, 
      color: themeColors.text,
      padding: isMobile ? '0' : '0',
    }}>
      <div style={{ 
        ...styles.header, 
        background: themeColors.surface, 
        borderColor: themeColors.border,
        padding: isMobile ? '10px 12px' : '12px 16px',
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            ...styles.avatar,
            width: isMobile ? 35 : 40,
            height: isMobile ? 35 : 40,
            fontSize: isMobile ? 18 : 20,
          }}>🖤</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: isMobile ? 15 : 16 }}>بلاك</div>
            <div style={{ fontSize: 11, color: themeColors.sub }}>
              <span style={{ ...styles.dot, animation: "pulse 2s infinite" }} />
              {loading ? "بيكتب..." : "متصل"}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: isMobile ? 4 : 6 }}>
          <button onClick={() => setShowSearch(!showSearch)} style={{
            ...styles.headerBtn, 
            fontSize: isMobile ? 14 : 16,
            padding: isMobile ? '4px 6px' : '5px 8px',
          }} title="بحث">🔍</button>
          <button onClick={exportChat} style={{
            ...styles.headerBtn,
            fontSize: isMobile ? 14 : 16,
            padding: isMobile ? '4px 6px' : '5px 8px',
          }} title="تصدير">📥</button>
          <button onClick={() => setTheme(t => t === "dark" ? "light" : "dark")} style={{
            ...styles.headerBtn,
            fontSize: isMobile ? 14 : 16,
            padding: isMobile ? '4px 6px' : '5px 8px',
          }}>
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
          <button onClick={clearChat} style={{
            ...styles.headerBtn,
            fontSize: isMobile ? 14 : 16,
            padding: isMobile ? '4px 6px' : '5px 8px',
          }} title="مسح">🗑️</button>
        </div>
      </div>

      {showSearch && (
        <div style={{ 
          ...styles.searchBar, 
          background: themeColors.surface, 
          borderColor: themeColors.border,
          padding: isMobile ? '8px 12px' : '8px 16px',
        }}>
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

      <div style={{ 
        ...styles.messages,
        padding: isMobile ? '12px 8px' : '16px 12px',
        gap: isMobile ? 12 : 14,
      }}>
        {messages.length <= 1 && !loading && (
          <div style={{
            ...styles.suggestions,
            padding: isMobile ? '8px 4px' : '10px 0',
            gap: isMobile ? 4 : 6,
          }}>
            {[
              "عرفني بنفسك",
              "اكتبلي كود Python",
              "ساعدني اتخذ قرار",
              "قولي نكتة 😂",
              "اشرحلي مفهوم برمجي",
              "نصيحة في الإنتاجية",
            ].map((s, i) => (
              <button key={i} onClick={() => sendMessage(s)} style={{
                ...styles.chip,
                fontSize: isMobile ? 11 : 12,
                padding: isMobile ? '6px 10px' : '8px 14px',
              }}>
                {s}
              </button>
            ))}
          </div>
        )}

        {filteredMessages.map(msg => (
          <div key={msg.id} style={{
            ...styles.msgRow,
            justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
            gap: isMobile ? 6 : 8,
          }}>
            {msg.role === "assistant" && (
              <div style={{
                ...styles.msgAvatar,
                width: isMobile ? 28 : 32,
                height: isMobile ? 28 : 32,
                fontSize: isMobile ? 12 : 14,
              }}>🖤</div>
            )}
            <div style={{ maxWidth: isMobile ? "85%" : "80%" }}>
              <div style={{
                ...styles.bubble,
                ...(msg.role === "user" ? styles.userBubble : styles.aiBubble),
                background: msg.role === "user"
                  ? "linear-gradient(135deg, #2d1b69, #1e3a5f)"
                  : theme === "dark" ? "linear-gradient(135deg, #141428, #1a1a35)" : "#fff",
                borderColor: msg.role === "user" ? "#3d2b79" : themeColors.border,
                color: themeColors.text,
                fontSize: isMobile ? 13 : 14,
                padding: isMobile ? '8px 12px' : '10px 14px',
              }}>
                <MessageContent content={msg.content} />
              </div>
              {msg.role === "assistant" && (
                <button onClick={() => copyMessage(msg.content, msg.id)} style={{
                  ...styles.copyBtn,
                  fontSize: isMobile ? 10 : 11,
                }}>
                  {copiedId === msg.id ? "✓ تم النسخ" : "📋 نسخ"}
                </button>
              )}
            </div>
            {msg.role === "user" && (
              <div style={{
                ...styles.msgAvatar, 
                background: "linear-gradient(135deg, #2d1b69, #1e3a5f)",
                width: isMobile ? 28 : 32,
                height: isMobile ? 28 : 32,
                fontSize: isMobile ? 12 : 14,
              }}>👤</div>
            )}
          </div>
        ))}

        {loading && (
          <div style={{ ...styles.msgRow, justifyContent: "flex-start", gap: isMobile ? 6 : 8 }}>
            <div style={{
              ...styles.msgAvatar,
              width: isMobile ? 28 : 32,
              height: isMobile ? 28 : 32,
              fontSize: isMobile ? 12 : 14,
            }}>🖤</div>
            <div style={{ 
              ...styles.bubble, 
              ...styles.aiBubble, 
              background: theme === "dark" ? "#141428" : "#fff", 
              borderColor: themeColors.border,
              padding: isMobile ? '8px 12px' : '10px 14px',
            }}>
              <TypingDots />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div style={{ 
        ...styles.inputArea, 
        background: themeColors.surface, 
        borderColor: themeColors.border,
        padding: isMobile ? '8px 10px 12px' : '10px 12px 16px',
        gap: isMobile ? 6 : 8,
      }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="اكتب لبلاك..."
          rows={1}
          style={{ 
            ...styles.textarea, 
            color: themeColors.text, 
            borderColor: themeColors.border,
            fontSize: isMobile ? 14 : 14,
            padding: isMobile ? '8px 12px' : '10px 16px',
          }}
          disabled={loading}
        />
        <button
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          style={{ 
            ...styles.sendBtn, 
            opacity: loading || !input.trim() ? 0.4 : 1,
            width: isMobile ? 36 : 40,
            height: isMobile ? 36 : 40,
            fontSize: isMobile ? 18 : 20,
          }}
        >
          ↑
        </button>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
        * { 
          box-sizing: border-box; 
          margin: 0; 
          padding: 0; 
          -webkit-tap-highlight-color: transparent;
        }
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
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }
        
        /* تحسينات للموبايل */
        @media (max-width: 768px) {
          * {
            -webkit-user-select: none;
            user-select: none;
          }
          input, textarea {
            -webkit-user-select: text;
            user-select: text;
            font-size: 16px !important; /* منع الزووم في iOS */
          }
          button {
            touch-action: manipulation;
          }
        }
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
    height: "100dvh", // استخدام dvh للموبايل
    display: "flex",
    flexDirection: "column",
    maxWidth: 800,
    margin: "0 auto",
    boxShadow: "0 0 40px rgba(0,0,0,0.3)",
    overflow: "hidden",
    position: "relative",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid",
    position: "sticky",
    top: 0,
    zIndex: 10,
    backdropFilter: "blur(10px)",
    flexShrink: 0,
  },
  avatar: {
    borderRadius: "50%",
    background: "linear-gradient(135deg, #1a1a2e, #16213e)",
    display: "flex", 
    alignItems: "center", 
    justifyContent: "center",
    border: "2px solid #2a2a3e",
  },
  headerBtn: {
    background: "transparent", 
    border: "1px solid #333",
    borderRadius: 8, 
    cursor: "pointer",
    color: "#aaa",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  searchBar: {
    display: "flex", 
    alignItems: "center", 
    gap: 8,
    borderBottom: "1px solid",
    flexShrink: 0,
  },
  searchInput: {
    flex: 1, 
    background: "transparent", 
    border: "none",
    fontFamily: "'Cairo', sans-serif", 
  },
  closeBtn: {
    background: "transparent", 
    border: "none",
    color: "#888", 
    cursor: "pointer", 
    fontSize: 16,
    padding: "4px",
  },
  messages: {
    flex: 1, 
    overflowY: "auto",
    display: "flex", 
    flexDirection: "column",
    WebkitOverflowScrolling: "touch", // تمرير سلس في iOS
  },
  msgRow: {
    display: "flex", 
    alignItems: "flex-start",
    animation: "fadeUp 0.3s ease",
  },
  msgAvatar: {
    borderRadius: "50%",
    background: "linear-gradient(135deg, #1a1a2e, #16213e)",
    display: "flex", 
    alignItems: "center", 
    justifyContent: "center",
    flexShrink: 0, 
    marginTop: 4,
    border: "1px solid #2a2a3e",
  },
  bubble: {
    borderRadius: "4px 16px 16px 16px",
    border: "1px solid", 
    lineHeight: 1.8,
    wordBreak: "break-word",
  },
  userBubble: { 
    borderRadius: "16px 4px 16px 16px",
  },
  aiBubble: {},
  copyBtn: {
    background: "transparent", 
    border: "none",
    color: "#666", 
    cursor: "pointer",
    padding: "3px 6px", 
    fontFamily: "'Cairo', sans-serif",
    marginTop: 2,
  },
  suggestions: {
    display: "flex", 
    flexWrap: "wrap",
    justifyContent: "center",
  },
  chip: {
    borderRadius: 18,
    background: "rgba(100,100,255,0.1)", 
    border: "1px solid #333",
    color: "#aaa", 
    cursor: "pointer",
    fontFamily: "'Cairo', sans-serif",
    whiteSpace: "nowrap",
  },
  inputArea: {
    display: "flex", 
    alignItems: "flex-end",
    borderTop: "1px solid",
    position: "sticky", 
    bottom: 0, 
    backdropFilter: "blur(10px)",
    flexShrink: 0,
    paddingBottom: "env(safe-area-inset-bottom, 12px)", // دعم notch
  },
  textarea: {
    flex: 1, 
    background: "transparent", 
    border: "1px solid",
    borderRadius: 20, 
    fontFamily: "'Cairo', sans-serif", 
    direction: "rtl",
    maxHeight: 120,
  },
  sendBtn: {
    borderRadius: "50%",
    background: "linear-gradient(135deg, #4422aa, #2244cc)",
    border: "none", 
    color: "#fff",
    cursor: "pointer", 
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    width: 6, 
    height: 6, 
    borderRadius: "50%",
    background: "#4ade80", 
    display: "inline-block",
    marginRight: 4,
  },
};

const codeStyles = {
  wrapper: {
    background: "#0d0d1a", 
    border: "1px solid #2a2a45",
    borderRadius: 8, 
    margin: "6px 0", 
    overflow: "hidden",
    maxWidth: "100%",
  },
  header: {
    display: "flex", 
    justifyContent: "space-between",
    alignItems: "center", 
    padding: "6px 10px",
    background: "#1a1a2e", 
    borderBottom: "1px solid #2a2a45",
  },
  lang: { 
    color: "#8888cc", 
    fontSize: 11, 
    fontFamily: "monospace" 
  },
  copyBtn: {
    background: "transparent", 
    border: "1px solid #3a3a5a",
    borderRadius: 4, 
    color: "#8888cc", 
    fontSize: 10,
    cursor: "pointer", 
    padding: "2px 8px",
    fontFamily: "'Cairo', sans-serif",
  },
  pre: { 
    padding: 10, 
    overflowX: "auto", 
    margin: 0,
    WebkitOverflowScrolling: "touch",
  },
  code: {
    color: "#a8d8a8", 
    fontSize: 12, 
    fontFamily: "monospace",
    direction: "ltr", 
    display: "block", 
    textAlign: "left",
    wordBreak: "break-all",
  },
      }
