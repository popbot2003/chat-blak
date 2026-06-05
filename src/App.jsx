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

// ==================== أدوات مساعدة ====================
function cleanResponse(text) {
  if (!text) return "";
  return text
    .replace(/[а-яёА-ЯЁ]+/g, '')
    .replace(/[àáâãäåæçèéêëìíîïðñòóôõöøùúûýþÿ]+/gi, '')
    .replace(/[ạảấầẩẫậắằẳẵặẹẻẽếềểễệịỉĩọỏốồổỗộớờởỡợụủứừửữựỳỷỹ]+/gi, '')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function getPreview(text, length = 35) {
  return text.replace(/\n/g, ' ').slice(0, length) + (text.length > length ? '...' : '');
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

// ==================== مكونات ====================
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
        <button onClick={copy} style={codeStyles.copyBtn}>
          {copied ? "✓ تم النسخ" : "نسخ"}
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
  if (parts.length === 0) return <div style={{ whiteSpace: "pre-wrap", lineHeight: "1.7" }}>{content}</div>;
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

function TypingDots() {
  return (
    <div style={{ display: "flex", gap: "4px", alignItems: "center", padding: "4px 0" }}>
      <span style={{ ...dotBase, animationDelay: "0ms" }} />
      <span style={{ ...dotBase, animationDelay: "150ms" }} />
      <span style={{ ...dotBase, animationDelay: "300ms" }} />
    </div>
  );
}

// ==================== المكون الرئيسي ====================
export default function BlackChat() {
  const [chats, setChats] = useState(() => {
    try {
      const saved = localStorage.getItem("black-chats");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    // دردشة افتراضية أولى
    return [{
      id: generateId(),
      title: "دردشة ١",
      messages: [
        { role: "assistant", content: "أهلاً.. أنا بلاك 🖤\nاتكلم، أنا هنا.", id: generateId() }
      ],
      createdAt: Date.now(),
    }];
  });

  const [activeChatId, setActiveChatId] = useState(() => chats[0]?.id || "");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [editingChatId, setEditingChatId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [theme, setTheme] = useState(() => localStorage.getItem("black-theme") || "dark");
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // الدردشة النشطة
  const activeChat = chats.find(c => c.id === activeChatId) || chats[0];
  const messages = activeChat?.messages || [];

  // حفظ كل الدردشات
  useEffect(() => {
    localStorage.setItem("black-chats", JSON.stringify(chats));
  }, [chats]);

  // حفظ الثيم
  useEffect(() => {
    localStorage.setItem("black-theme", theme);
  }, [theme]);

  // تمرير تلقائي
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // تركيز الإدخال
  useEffect(() => {
    inputRef.current?.focus();
  }, [activeChatId]);

  const updateActiveChat = (updater) => {
    setChats(prev => prev.map(c => c.id === activeChatId ? updater(c) : c));
  };

  const createNewChat = () => {
    const newChat = {
      id: generateId(),
      title: `دردشة ${chats.length + 1}`,
      messages: [
        { role: "assistant", content: "أهلاً.. أنا بلاك 🖤\nاتكلم، أنا هنا.", id: generateId() }
      ],
      createdAt: Date.now(),
    };
    setChats(prev => [newChat, ...prev]);
    setActiveChatId(newChat.id);
  };

  const deleteChat = (chatId) => {
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;
    if (!window.confirm(`متأكد إنك عايز تمسح "${chat.title}"؟ بلاك هيزعل 😢`)) return;
    
    setChats(prev => {
      const filtered = prev.filter(c => c.id !== chatId);
      if (filtered.length === 0) {
        // إنشاء دردشة جديدة لو مفيش دردشات
        const fresh = {
          id: generateId(),
          title: "دردشة ١",
          messages: [{ role: "assistant", content: "أهلاً.. أنا بلاك 🖤\nاتكلم، أنا هنا.", id: generateId() }],
          createdAt: Date.now(),
        };
        setActiveChatId(fresh.id);
        return [fresh];
      }
      return filtered;
    });
    
    if (activeChatId === chatId) {
      setActiveChatId(chats.filter(c => c.id !== chatId)[0]?.id);
    }
  };

  const startRename = (chatId, currentTitle) => {
    setEditingChatId(chatId);
    setEditTitle(currentTitle);
  };

  const confirmRename = () => {
    if (editTitle.trim()) {
      setChats(prev => prev.map(c => c.id === editingChatId ? { ...c, title: editTitle.trim() } : c));
    }
    setEditingChatId(null);
    setEditTitle("");
  };

  const copyMessage = (content, id) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const clearActiveChat = () => {
    if (!window.confirm("متأكد إنك عايز تمسح كل رسايل الدردشة دي؟ 😢")) return;
    updateActiveChat(c => ({
      ...c,
      messages: [{ role: "assistant", content: "مسحت كل حاجة... طب ليه كده؟ 😢\nعموماً، أنا هنا لو احتجتني 🖤", id: generateId() }]
    }));
  };

  const exportChat = () => {
    const text = messages.map(m =>
      `${m.role === "user" ? "👤 أنت" : "🖤 بلاك"}:\n${m.content}`
    ).join("\n\n---\n\n");
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeChat?.title || 'black-chat'}-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading || !activeChat) return;

    const userMsg = { role: "user", content: text, id: generateId() };
    
    // تحديث العنوان تلقائياً من أول رسالة مستخدم
    updateActiveChat(c => {
      const isFirstUserMsg = c.messages.filter(m => m.role === "user").length === 0;
      return {
        ...c,
        title: isFirstUserMsg ? getPreview(text, 30) : c.title,
        messages: [...c.messages, userMsg]
      };
    });
    
    setInput("");
    setLoading(true);

    // تجهيز التاريخ
    const currentMessages = [...(activeChat?.messages || []), userMsg];
    
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
            ...currentMessages.map(m => ({ role: m.role, content: m.content })),
          ],
          temperature: 0.9,
          max_tokens: 2000,
        }),
      });

      const data = await response.json();

      if (data.error) {
        updateActiveChat(c => ({
          ...c,
          messages: [...c.messages, {
            role: "assistant",
            content: `فيه مشكلة يا صاحبي: ${data.error.message}\nبس متقلقش، أنا موجود 🖤`,
            id: generateId()
          }]
        }));
        return;
      }

      const reply = cleanResponse(data.choices?.[0]?.message?.content || "...");
      updateActiveChat(c => ({
        ...c,
        messages: [...c.messages, {
          role: "assistant",
          content: reply,
          id: generateId()
        }]
      }));

    } catch (err) {
      updateActiveChat(c => ({
        ...c,
        messages: [...c.messages, {
          role: "assistant",
          content: `النت فيه مشكلة: ${err.message}\nجرب تاني يا حبيبي 🖤`,
          id: generateId()
        }]
      }));
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

  // البحث في كل الدردشات
  const searchResults = searchTerm ? chats.filter(c =>
    c.messages.some(m => m.content.includes(searchTerm))
  ).map(c => ({
    ...c,
    matchedMessages: c.messages.filter(m => m.content.includes(searchTerm))
  })) : [];

  // ألوان الثيم
  const themeColors = theme === "dark"
    ? { bg: "#0a0a0a", surface: "rgba(10,10,10,0.95)", sidebarBg: "#0d0d0d", border: "#1a1a1a", text: "#e8e8e8", sub: "#666", accent: "#6644aa", userBubble: "linear-gradient(135deg, #2d1b69, #1e3a5f)", aiBubble: "linear-gradient(135deg, #141428, #1a1a35)", hoverBg: "#1a1a1a", activeBg: "#1a1a2e" }
    : { bg: "#f5f5f5", surface: "rgba(255,255,255,0.95)", sidebarBg: "#f0f0f0", border: "#e0e0e0", text: "#1a1a1a", sub: "#888", accent: "#6644aa", userBubble: "linear-gradient(135deg, #6644aa, #8866cc)", aiBubble: "#ffffff", hoverBg: "#e8e8e8", activeBg: "#e0e0f0" };

  return (
    <div style={{ ...styles.container, background: themeColors.bg, color: themeColors.text }}>
      <div style={styles.bgNoise} />

      {/* الشريط الجانبي */}
      {showSidebar && (
        <div style={{ ...styles.sidebar, background: themeColors.sidebarBg, borderColor: themeColors.border }}>
          <div style={styles.sidebarHeader}>
            <span style={{ fontWeight: 700, fontSize: 16, color: themeColors.text }}>🖤 بلاك</span>
            <button onClick={() => setShowSidebar(false)} style={{ ...styles.iconBtn, color: themeColors.sub }}>✕</button>
          </div>

          <button onClick={createNewChat} style={styles.newChatBtn}>
            + دردشة جديدة
          </button>

          {/* قائمة الدردشات */}
          <div style={styles.chatList}>
            {chats.map(chat => (
              <div
                key={chat.id}
                onClick={() => setActiveChatId(chat.id)}
                style={{
                  ...styles.chatItem,
                  background: chat.id === activeChatId ? themeColors.activeBg : "transparent",
                  color: themeColors.text,
                }}
                onMouseEnter={e => e.currentTarget.style.background = themeColors.hoverBg}
                onMouseLeave={e => {
                  if (chat.id !== activeChatId) e.currentTarget.style.background = "transparent";
                }}
              >
                {editingChatId === chat.id ? (
                  <input
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    onBlur={confirmRename}
                    onKeyDown={e => { if (e.key === "Enter") confirmRename(); }}
                    autoFocus
                    style={styles.renameInput}
                    onClick={e => e.stopPropagation()}
                  />
                ) : (
                  <span style={styles.chatTitle}>{chat.title}</span>
                )}
                <div style={styles.chatActions}>
                  <button
                    onClick={(e) => { e.stopPropagation(); startRename(chat.id, chat.title); }}
                    style={{ ...styles.iconBtnSm, color: themeColors.sub }}
                    title="تعديل الاسم"
                  >✏️</button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteChat(chat.id); }}
                    style={{ ...styles.iconBtnSm, color: "#ef4444" }}
                    title="حذف"
                  >🗑️</button>
                </div>
              </div>
            ))}
          </div>

          <div style={{ padding: "10px", borderTop: `1px solid ${themeColors.border}`, fontSize: 12, color: themeColors.sub }}>
            {chats.length} دردشة
          </div>
        </div>
      )}

      {/* المنطقة الرئيسية */}
      <div style={styles.main}>
        {/* الهيدر */}
        <div style={{ ...styles.header, background: themeColors.surface, borderColor: themeColors.border }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {!showSidebar && (
              <button onClick={() => setShowSidebar(true)} style={{ ...styles.iconBtn, color: themeColors.text }}>☰</button>
            )}
            <div style={styles.avatar}>🖤</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: themeColors.text }}>{activeChat?.title || "بلاك"}</div>
              <div style={{ fontSize: 12, color: themeColors.sub, display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
                <span style={{ ...styles.statusDot, background: loading ? "#fbbf24" : "#4ade80" }} />
                {loading ? "بيفكر..." : "متصل"}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => setShowSearch(!showSearch)} style={{ ...styles.headerBtn, color: themeColors.text }}>🔍</button>
            <button onClick={exportChat} style={{ ...styles.headerBtn, color: themeColors.text }}>📥</button>
            <button onClick={() => setTheme(t => t === "dark" ? "light" : "dark")} style={{ ...styles.headerBtn, color: themeColors.text }}>
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
            <button onClick={clearActiveChat} style={{ ...styles.headerBtn, color: "#ef4444" }}>🗑️</button>
          </div>
        </div>

        {/* شريط البحث */}
        {showSearch && (
          <div style={{ ...styles.searchBar, background: themeColors.surface, borderColor: themeColors.border }}>
            <span>🔍</span>
            <input
              style={{ ...styles.searchInput, color: themeColors.text }}
              placeholder="دور في كل الدردشات..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              autoFocus
            />
            {searchTerm && (
              <span style={{ color: themeColors.sub, fontSize: 12 }}>
                {searchResults.length} نتيجة
              </span>
            )}
            <button onClick={() => { setShowSearch(false); setSearchTerm(""); }} style={{ ...styles.closeBtn, color: themeColors.sub }}>✕</button>
          </div>
        )}

        {/* نتائج البحث */}
        {searchTerm && searchResults.length > 0 && (
          <div style={{ ...styles.searchResults, background: themeColors.surface, borderColor: themeColors.border }}>
            {searchResults.map(chat => (
              <div key={chat.id} style={{ marginBottom: 16 }}>
                <div
                  onClick={() => { setActiveChatId(chat.id); setSearchTerm(""); setShowSearch(false); }}
                  style={{ ...styles.searchChatTitle, color: themeColors.accent, cursor: "pointer" }}
                >
                  📁 {chat.title} ({chat.matchedMessages.length})
                </div>
                {chat.matchedMessages.slice(0, 3).map(msg => (
                  <div key={msg.id} style={{ ...styles.searchMsg, color: themeColors.sub }}>
                    {getPreview(msg.content, 80)}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* منطقة الرسائل */}
        <div style={styles.messages}>
          {messages.map(msg => (
            <div key={msg.id} style={{
              ...styles.msgRow,
              justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
            }}>
              {msg.role === "assistant" && <div style={styles.msgAvatar}>🖤</div>}
              <div style={{ maxWidth: "80%" }}>
                <div style={{
                  ...styles.bubble,
                  background: msg.role === "user" ? themeColors.userBubble : themeColors.aiBubble,
                  borderColor: msg.role === "user" ? "#3d2b79" : themeColors.border,
                  color: msg.role === "user" ? "#fff" : themeColors.text,
                  borderRadius: msg.role === "user" ? "18px 4px 18px 18px" : "4px 18px 18px 18px",
                  boxShadow: msg.role === "user" ? "0 4px 20px rgba(80,40,180,0.2)" : "0 4px 20px rgba(0,0,0,0.3)",
                }}>
                  <MessageContent content={msg.content} />
                </div>
                {msg.role === "assistant" && (
                  <button onClick={() => copyMessage(msg.content, msg.id)} style={{ ...styles.copyMsgBtn, color: themeColors.sub }}>
                    {copiedId === msg.id ? "✓ تم النسخ" : "نسخ الرد"}
                  </button>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ ...styles.msgRow, justifyContent: "flex-start" }}>
              <div style={styles.msgAvatar}>🖤</div>
              <div style={{ ...styles.bubble, background: themeColors.aiBubble, borderColor: themeColors.border, boxShadow: "0 4px 20px rgba(0,0,0,0.3)" }}>
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
            placeholder="قول لبلاك..."
            rows={1}
            style={{ ...styles.textarea, color: themeColors.text, borderColor: themeColors.border, background: theme === "dark" ? "#141414" : "#ffffff" }}
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            style={{ ...styles.sendBtn, opacity: loading || !input.trim() ? 0.4 : 1 }}
          >↑</button>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes bounce { 0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; } 40% { transform: scale(1); opacity: 1; } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes slideIn { from { transform: translateX(-100%); } to { transform: translateX(0); } }
        textarea:focus { outline: none; }
        textarea { resize: none; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }
      `}</style>
    </div>
  );
}

// ==================== الأنماط ====================
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
    position: "relative",
    overflow: "hidden",
  },
  bgNoise: {
    position: "fixed",
    inset: 0,
    backgroundImage: `radial-gradient(ellipse at 20% 50%, #1a0a2e 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, #0d1a2e 0%, transparent 50%)`,
    pointerEvents: "none",
    zIndex: 0,
  },
  sidebar: {
    width: 280,
    minWidth: 280,
    borderLeft: "1px solid",
    display: "flex",
    flexDirection: "column",
    zIndex: 20,
    animation: "slideIn 0.3s ease",
    maxHeight: "100vh",
  },
  sidebarHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px",
    borderBottom: "1px solid #1a1a1a",
  },
  newChatBtn: {
    margin: "12px",
    padding: "10px",
    background: "linear-gradient(135deg, #4422aa, #2244cc)",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    fontFamily: "'Cairo', sans-serif",
    fontSize: 14,
    fontWeight: 600,
  },
  chatList: {
    flex: 1,
    overflowY: "auto",
    padding: "8px",
  },
  chatItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 12px",
    borderRadius: 8,
    cursor: "pointer",
    marginBottom: 4,
    transition: "all 0.2s",
  },
  chatTitle: {
    flex: 1,
    fontSize: 13,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  chatActions: {
    display: "flex",
    gap: 4,
    opacity: 0.7,
  },
  iconBtn: {
    background: "transparent",
    border: "none",
    cursor: "pointer",
    fontSize: 16,
    padding: 4,
  },
  iconBtnSm: {
    background: "transparent",
    border: "none",
    cursor: "pointer",
    fontSize: 12,
    padding: 2,
  },
  renameInput: {
    flex: 1,
    background: "#1a1a2e",
    border: "1px solid #6644aa",
    borderRadius: 4,
    color: "#fff",
    padding: "4px 8px",
    fontSize: 13,
    fontFamily: "'Cairo', sans-serif",
  },
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    position: "relative",
    zIndex: 1,
    minWidth: 0,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 20px",
    borderBottom: "1px solid",
    position: "sticky",
    top: 0,
    zIndex: 10,
    backdropFilter: "blur(20px)",
  },
  avatar: {
    width: 40, height: 40, borderRadius: "50%",
    background: "linear-gradient(135deg, #1a1a2e, #16213e)",
    border: "1px solid #2a2a3e",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 18,
  },
  headerBtn: {
    background: "transparent",
    border: "1px solid #333",
    borderRadius: 8,
    padding: "6px 10px",
    cursor: "pointer",
    fontSize: 14,
    fontFamily: "'Cairo', sans-serif",
  },
  statusDot: {
    width: 6, height: 6, borderRadius: "50%",
    display: "inline-block",
    animation: "pulse 2s infinite",
  },
  searchBar: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "10px 20px", borderBottom: "1px solid",
  },
  searchInput: {
    flex: 1, background: "transparent", border: "none",
    fontFamily: "'Cairo', sans-serif", fontSize: 14,
  },
  closeBtn: {
    background: "transparent", border: "none",
    cursor: "pointer", fontSize: 18, padding: 4,
  },
  searchResults: {
    position: "absolute",
    top: 120,
    left: 20,
    right: 20,
    maxHeight: 300,
    overflowY: "auto",
    padding: 16,
    borderRadius: 12,
    border: "1px solid",
    zIndex: 30,
    boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
  },
  searchChatTitle: {
    fontWeight: 700,
    marginBottom: 8,
    fontSize: 14,
  },
  searchMsg: {
    padding: "4px 8px",
    fontSize: 12,
    borderBottom: "1px solid #1a1a1a",
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
    display: "flex", alignItems: "flex-start", gap: 8,
    animation: "fadeUp 0.3s ease",
  },
  msgAvatar: {
    width: 30, height: 30, borderRadius: "50%",
    background: "linear-gradient(135deg, #1a1a2e, #16213e)",
    border: "1px solid #2a2a3e",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 13, flexShrink: 0, marginTop: 4,
  },
  bubble: {
    padding: "12px 16px", border: "1px solid",
    fontSize: 14, lineHeight: 1.7, wordBreak: "break-word",
  },
  copyMsgBtn: {
    background: "transparent", border: "none",
    fontSize: 11, cursor: "pointer", padding: "4px 8px",
    fontFamily: "'Cairo', sans-serif", marginTop: 4,
  },
  inputArea: {
    display: "flex", alignItems: "flex-end", gap: 10,
    padding: "12px 16px 20px", borderTop: "1px solid",
    position: "sticky", bottom: 0, backdropFilter: "blur(20px)",
  },
  textarea: {
    flex: 1, border: "1px solid", borderRadius: 20,
    padding: "12px 18px", fontSize: 14,
    fontFamily: "'Cairo', sans-serif", direction: "rtl",
    maxHeight: 120, lineHeight: 1.5,
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: "50%",
    background: "linear-gradient(135deg, #4422aa, #2244cc)",
    border: "none", color: "#fff", fontSize: 18,
    cursor: "pointer", display: "flex",
    alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
};

const codeStyles = {
  wrapper: {
    background: "#0d0d1a", border: "1px solid #2a2a45",
    borderRadius: 8, margin: "8px 0", overflow: "hidden",
  },
  header: {
    display: "flex", justifyContent: "space-between",
    alignItems: "center", padding: "8px 12px",
    background: "#1a1a2e", borderBottom: "1px solid #2a2a45",
  },
  lang: { color: "#8888cc", fontSize: 12, fontFamily: "monospace" },
  copyBtn: {
    background: "transparent", border: "1px solid #3a3a5a",
    borderRadius: 4, color: "#8888cc", fontSize: 11,
    cursor: "pointer", padding: "2px 8px",
    fontFamily: "'Cairo', sans-serif",
  },
  pre: { padding: 12, overflowX: "auto", margin: 0 },
  code: {
    color: "#a8d8a8", fontSize: 13,
    fontFamily: "monospace", direction: "ltr",
    display: "block", textAlign: "left",
  },
};
