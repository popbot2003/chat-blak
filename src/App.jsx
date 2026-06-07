import { useState, useRef, useEffect } from "react";
import "./App.css";
import MessageContent from "./components/MessageContent";
import TypingDots from "./components/TypingDots";
import { supabase } from './lib/supabase';

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

## أسلوبك:
- مباشر وواضح.
- مختصر إلا لو المستخدم طلب تفاصيل.

## قواعد البرمجة:
- عند طلب كود، اكتبه داخل code block.
- الكود لازم يكون كامل وقابل للتشغيل فوراً.

## التعامل مع الملفات:
- لو المستخدم رفع ملف، اقرأه وحلله.

أنت بلاك 🖤`;

const DAILY_LIMIT_PER_KEY = 100000;

function loadKeys() {
  const keys = [];
  for (let i = 1; i <= 10; i++) {
    const k = import.meta.env[`VITE_GROQ_KEY_${i}`];
    if (k) keys.push({ id: i, key: k, used: 0, last: null });
  }
  if (keys.length === 0) {
    const fb = import.meta.env.VITE_GROQ_KEY;
    if (fb) keys.push({ id: 0, key: fb, used: 0, last: null });
  }
  return keys;
}

function pickBestKey(keys) {
  const avail = keys.filter(k => k.used < DAILY_LIMIT_PER_KEY);
  if (avail.length === 0) return null;
  if (avail.length === 1) return avail[0];
  const r = Math.random();
  if (r < 0.4) return avail.reduce((a,b) => a.used < b.used ? a : b);
  if (r < 0.7) return avail.reduce((a,b) => !a.last ? a : !b.last ? b : new Date(a.last) < new Date(b.last) ? a : b);
  return avail[Math.floor(Math.random() * avail.length)];
}

function getKeyStats(keys) {
  const total = keys.length * DAILY_LIMIT_PER_KEY;
  const used = keys.reduce((s,k) => s + (k.used || 0), 0);
  return {
    totalLimit: total,
    totalUsed: used,
    percentUsed: total > 0 ? ((used / total) * 100).toFixed(1) : "0.0",
    availableKeys: keys.filter(k => (k.used || 0) < DAILY_LIMIT_PER_KEY).length,
    totalKeys: keys.length
  };
}

function cleanResponse(text) {
  if (!text) return "";
  return text.replace(/[а-яёА-ЯЁ]+/g, '').replace(/[àáâãäåæçèéêëìíîïðñòóôõöøùúûýþÿ]+/gi, '').replace(/[ \t]+/g, ' ').trim();
}

async function readFileAsText(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    if (file.type.startsWith("image/")) { reader.readAsDataURL(); resolve("🖼️ " + file.name); return; }
    reader.readAsText();
  });
}

function getFileIcon(file) {
  if (file.type.startsWith("image/")) return "🖼️";
  if (file.type === "application/pdf") return "📄";
  if (file.type.includes("javascript")) return "💛";
  if (file.type.includes("python")) return "🐍";
  if (file.type.includes("html")) return "🌐";
  if (file.type.includes("css")) return "🎨";
  return "📎";
}

export default function App() {
  const [keys, setKeys] = useState(() => loadKeys());
  const [allChats, setAllChats] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(() => Date.now().toString());
  const [showHistory, setShowHistory] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [messages, setMessages] = useState([{ role: "assistant", content: "أهلاً.. أنا بلاك 🖤\nاتكلم، أنا هنا.", id: 1 }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [copiedId, setCopiedId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [theme, setTheme] = useState("dark");
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);
  const fileInputRef = useRef(null);
  const keysRef = useRef(keys);
  const retryRef = useRef(0);

  useEffect(() => { keysRef.current = keys; }, [keys]);
  useEffect(() => { loadAllData(); }, []);

  const loadAllData = async () => {
    await loadFromCloud();
    setIsLoaded(true);
  };

  const loadFromCloud = async () => {
    try {
      const { data } = await supabase.from('token_usage').select('*').eq('id', 1).single();
      if (data) {
        const today = new Date().toISOString().slice(0, 10);
        if (data.date === today) {
          if (data.keys_data) {
            setKeys(prev => prev.map(k => {
              const saved = data.keys_data.find(sk => sk.id === k.id);
              return saved ? { ...k, used: saved.used || 0, last: saved.last } : k;
            }));
          }
        } else {
          setKeys(loadKeys());
          await saveKeysToCloud([]);
        }
      }
    } catch {}
    try {
      const { data: chats } = await supabase.from('chats').select('*').order('updated_at', { ascending: false }).limit(20);
      if (chats?.length > 0) {
        setAllChats(chats.map(c => ({ id: c.id, title: c.title || 'محادثة', date: c.updated_at, messageCount: c.messages?.length || 0 })));
        const last = chats[0];
        if (last.messages?.length > 0) { setCurrentChatId(last.id); setMessages(last.messages.slice(-40)); }
      }
    } catch {}
  };

  const saveKeysToCloud = async (keysData) => {
    const kd = keysData.length > 0 ? keysData : keysRef.current.map(k => ({ id: k.id, used: k.used, last: k.last }));
    const totalUsed = kd.reduce((s, k) => s + (k.used || 0), 0);
    try {
      await supabase.from('token_usage').upsert({
        id: 1,
        date: new Date().toISOString().slice(0, 10),
        total_used: totalUsed,
        keys_data: kd,
        updated_at: new Date().toISOString()
      });
    } catch {}
  };

  const saveChat = async () => {
    try {
      const title = messages.find(m => m.role === "user")?.content?.slice(0, 50) || "محادثة";
      await supabase.from('chats').upsert({ id: currentChatId, title, messages: messages.slice(-40), updated_at: new Date().toISOString() });
    } catch {}
  };

  useEffect(() => { if (!isLoaded) return; const i = setInterval(() => loadFromCloud(), 15000); return () => clearInterval(i); }, [isLoaded]);
  useEffect(() => { if (!isLoaded || messages.length <= 1) return; const t = setTimeout(() => saveChat(), 2000); return () => clearTimeout(t); }, [messages, isLoaded]);
  useEffect(() => { const h = () => { saveChat(); saveKeysToCloud([]); }; window.addEventListener("beforeunload", h); return () => window.removeEventListener("beforeunload", h); }, [isLoaded]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, streamingText]);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const copyMessage = (content, id) => {
    navigator.clipboard.writeText(content).then(() => { setCopiedId(id); setTimeout(() => setCopiedId(null), 2000); }).catch(() => {
      const ta = document.createElement("textarea"); ta.value = content; document.body.appendChild(ta); ta.select();
      document.execCommand("copy"); document.body.removeChild(ta); setCopiedId(id); setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files); if (files.length === 0) return;
    const newFiles = [];
    for (const file of files) { const content = await readFileAsText(file); newFiles.push({ id: Date.now(), name: file.name, type: file.type, size: file.size, icon: getFileIcon(file), content }); }
    setAttachedFiles(prev => [...prev, ...newFiles]); inputRef.current?.focus();
  };

  const removeFile = (fileId) => setAttachedFiles(prev => prev.filter(f => f.id !== fileId));
  const refreshKeys = () => { const freshKeys = loadKeys(); setKeys(freshKeys); alert(`✅ ${freshKeys.length} مفاتيح`); };
  const clearAllStorage = () => { if (window.confirm("متأكد؟")) { setAllChats([]); setMessages([{ role: "assistant", content: "تم 🖤", id: Date.now() }]); setCurrentChatId(Date.now().toString()); setShowMenu(false); setInput(""); } };
  const resetTokenCounter = () => { if (window.confirm("تصفر؟")) { const fk = keysRef.current.map(k => ({ ...k, used: 0 })); setKeys(fk); saveKeysToCloud(fk.map(k => ({ id: k.id, used: 0 }))); setShowMenu(false); } };
  const newChat = () => { const id = Date.now().toString(); setCurrentChatId(id); setMessages([{ role: "assistant", content: "جديد 🖤", id: Date.now() }]); setShowMenu(false); setInput(""); };
  const openChat = async (chatId) => { setCurrentChatId(chatId); const { data } = await supabase.from('chats').select('*').eq('id', chatId).single(); if (data?.messages) setMessages(data.messages.slice(-40)); setShowHistory(false); setInput(""); };
  const clearChat = () => { if (window.confirm("تمسح؟")) { setMessages([{ role: "assistant", content: "تم 🖤", id: Date.now() }]); supabase.from('chats').delete().eq('id', currentChatId).then(); setAllChats(p => p.filter(c => c.id !== currentChatId)); } };
  const deleteChat = (chatId, e) => { e.stopPropagation(); supabase.from('chats').delete().eq('id', chatId).then(); setAllChats(p => p.filter(c => c.id !== chatId)); };
  const exportChat = () => { const t = messages.map(m => `${m.role === "user" ? "👤" : "🖤"}:\n${m.content}`).join("\n\n---\n\n"); const b = new Blob([t], { type: "text/plain" }); const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = `chat.txt`; a.click(); URL.revokeObjectURL(u); };
  const stopStreaming = () => { if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; } if (streamingText) { setMessages(p => [...p, { role: "assistant", content: streamingText, id: Date.now() }]); setStreamingText(""); } setLoading(false); };

  const sendMessage = async (text, retry = false) => {
    if (loading && !retry) { stopStreaming(); return; }
    const msg = (text || input).trim();
    if (!msg && !retry) return;
    const picked = pickBestKey(retry ? keysRef.current : keys);
    if (!picked) { setMessages(p => [...p, { role: "assistant", content: "خلصت كل المفاتيح النهارده 😅🖤", id: Date.now() }]); setLoading(false); return; }
    const userMsg = { role: "user", content: msg, id: Date.now() };
    const updated = retry ? messages : [...messages, userMsg];
    if (!retry) { setMessages(updated); setInput(""); }
    setLoading(true); setStreamingText("");
    try {
      const c = new AbortController(); abortRef.current = c;
      const clean = updated.map(m => ({ role: m.role, content: m.content }));
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${picked.key}` }, body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages: [{ role: "system", content: SYSTEM_PROMPT }, ...clean.slice(-40)], temperature: 0.8, max_tokens: 2000, stream: true }), signal: c.signal });
      if (!res.ok) {
        const err = await res.json();
        if (err.error?.code === "rate_limit_exceeded") {
          const uk = keysRef.current.map(k => k.id === picked.id ? { ...k, used: DAILY_LIMIT_PER_KEY, last: new Date().toISOString() } : k);
          setKeys(uk);
          saveKeysToCloud(uk.map(k => ({ id: k.id, used: k.used, last: k.last })));
          if (retryRef.current < 3) { retryRef.current++; setTimeout(() => sendMessage(msg, true), 500); return; }
          retryRef.current = 0; setMessages(p => [...p, { role: "assistant", content: "كل المفاتيح خلصت 😅", id: Date.now() }]); setLoading(false); return;
        }
        throw new Error(err.error?.message);
      }
      retryRef.current = 0;
      const reader = res.body.getReader(); const d = new TextDecoder(); let full = "";
      while (true) { const { done, value } = await reader.read(); if (done) break; d.decode(value).split("\n").filter(l => l.startsWith("data: ")).forEach(l => { const j = l.replace("data: ", "").trim(); if (j === "[DONE]") return; try { const ct = JSON.parse(j).choices?.[0]?.delta?.content || ""; if (ct) { full += ct; setStreamingText(cleanResponse(full)); } } catch {} }); }
      const final = cleanResponse(full);
      setMessages(p => [...p, { role: "assistant", content: final, id: Date.now() }]); setStreamingText("");
      const pt = Math.ceil((JSON.stringify(clean).length + SYSTEM_PROMPT.length) / 4);
      const ct = Math.ceil(final.length / 4);
      const uk = keysRef.current.map(k => k.id === picked.id ? { ...k, used: k.used + pt + ct, last: new Date().toISOString() } : k);
      setKeys(uk);
      saveKeysToCloud(uk.map(k => ({ id: k.id, used: k.used, last: k.last })));
    } catch (err) { if (err.name !== "AbortError") setMessages(p => [...p, { role: "assistant", content: `خطأ: ${err.message}`, id: Date.now() }]); }
    finally { setLoading(false); abortRef.current = null; if (!retry) setTimeout(() => inputRef.current?.focus(), 100); }
  };

  const handleKeyDown = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } };
  const filteredMessages = searchTerm ? messages.filter(m => m.content.includes(searchTerm)) : messages;
  const isDark = theme === "dark";
  const stats = getKeyStats(keys);
  const tokenPercent = stats.percentUsed;
  const tokenColor = tokenPercent < 50 ? "#4ade80" : tokenPercent < 80 ? "#facc15" : "#f87171";
  const formatDate = (d) => { if (!d) return ""; const dt = new Date(d); const n = new Date(); const diff = n - dt; if (diff < 60000) return "الآن"; if (diff < 3600000) return `منذ ${Math.floor(diff/60000)} د`; if (diff < 86400000) return `منذ ${Math.floor(diff/3600000)} س`; return dt.toLocaleDateString("ar-EG"); };

  if (!isLoaded) return <div style={{ height: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f0f1a", color: "#e0e0e0" }}><div>🖤 جاري التحميل...</div></div>;

  return (
    <div className={`container ${isDark ? "dark" : "light"}`}>
      <div className="header"><div className="header-left"><div className="avatar">🖤</div><div><div className="header-name">بلاك</div><div className="header-status"><span className="status-dot" />{loading ? "بيكتب..." : "متصل"}</div></div></div><div className="header-right"><button onClick={() => setShowMenu(!showMenu)} className="header-btn" style={{ fontSize: "22px" }}>{showMenu ? "✕" : "☰"}</button></div>
        {showMenu && (<><div onClick={() => setShowMenu(false)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 200, background: "rgba(0,0,0,0.5)" }} /><div style={{ position: "absolute", top: "60px", right: "10px", background: isDark ? "#1a1a2e" : "#fff", borderRadius: "16px", padding: "8px", zIndex: 201, display: "flex", flexDirection: "column", gap: "2px", minWidth: "220px", boxShadow: "0 10px 40px rgba(0,0,0,0.3)" }}>
          <button onClick={() => { refreshKeys(); setShowMenu(false); }} className="menu-item">🔑 تحديث المفاتيح</button>
          <button onClick={() => { setShowHistory(!showHistory); setShowMenu(false); }} className="menu-item">💬 سجل المحادثات</button>
          <button onClick={() => { newChat(); }} className="menu-item">➕ محادثة جديدة</button>
          <button onClick={() => { setShowSearch(!showSearch); setShowMenu(false); }} className="menu-item">🔍 بحث</button>
          <button onClick={() => { exportChat(); setShowMenu(false); }} className="menu-item">📥 تصدير</button>
          <button onClick={() => { setTheme(t => t === "dark" ? "light" : "dark"); }} className="menu-item">{isDark ? "☀️" : "🌙"} المظهر</button>
          <button onClick={() => { clearChat(); setShowMenu(false); }} className="menu-item">🗑️ مسح المحادثة</button>
          <button onClick={() => { clearAllStorage(); setShowMenu(false); }} className="menu-item" style={{ color: "#f87171" }}>🧹 مسح المحادثات</button>
          <button onClick={() => { resetTokenCounter(); }} className="menu-item" style={{ color: "#fbbf24" }}>⚡ تصفير العداد والمفاتيح</button>
        </div></>)}
      </div>
      <div className="token-bar"><div className="token-info"><span>⚡ {stats.totalUsed.toLocaleString()} / {stats.totalLimit.toLocaleString()} token ({stats.availableKeys}/{stats.totalKeys} مفاتيح)</span><span style={{ color: tokenColor }}>{tokenPercent}%</span></div><div className="token-track"><div className="token-fill" style={{ width: `${tokenPercent}%`, background: tokenColor }} /></div></div>
      {showHistory && (<div className="search-bar" style={{ flexDirection: "column", alignItems: "stretch", gap: "8px", maxHeight: "200px", overflowY: "auto" }}><div style={{ display: "flex", justifyContent: "space-between" }}><strong>📝 سجل المحادثات</strong><button onClick={() => setShowHistory(false)} className="close-btn">✕</button></div>{allChats.length === 0 ? <div style={{ textAlign: "center", opacity: 0.6, padding: "10px" }}>مفيش محادثات</div> : allChats.map(chat => (<div key={chat.id} onClick={() => openChat(chat.id)} style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", borderRadius: "12px", cursor: "pointer", background: chat.id === currentChatId ? "rgba(108,92,231,0.2)" : "rgba(255,255,255,0.03)" }}><div style={{ flex: 1, overflow: "hidden" }}><div style={{ fontSize: "14px", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{chat.title}</div><div style={{ fontSize: "11px", opacity: 0.5 }}>{formatDate(chat.date)} · {chat.messageCount} رسالة</div></div><button onClick={(e) => deleteChat(chat.id, e)} style={{ background: "transparent", border: "none", color: "inherit", fontSize: "16px", cursor: "pointer", opacity: 0.5 }}>🗑️</button></div>))}</div>)}
      {showSearch && !showHistory && (<div className="search-bar"><span>🔍</span><input className="search-input" placeholder="دور..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} autoFocus />{searchTerm && <span>{filteredMessages.length} نتيجة</span>}<button onClick={() => { setShowSearch(false); setSearchTerm(""); }} className="close-btn">✕</button></div>)}
      <div className="messages">
        {messages.length <= 1 && !loading && (<div className="suggestions">{["عرفني بنفسك", "اكتبلي كود Python", "قولي نكتة 😂"].map((s, i) => (<button key={i} onClick={() => sendMessage(s)} className="chip">{s}</button>))}</div>)}
        {filteredMessages.map(msg => (<div key={msg.id} className={`msg-row ${msg.role === "user" ? "msg-row-user" : "msg-row-ai"}`}>{msg.role === "assistant" && <div className="avatar-small">🖤</div>}<div className="msg-content-wrapper"><div className={`bubble ${msg.role === "user" ? "bubble-user" : isDark ? "bubble-ai" : "bubble-ai-light"}`}><MessageContent content={msg.content} /></div>{msg.role === "assistant" && <button onClick={() => copyMessage(msg.content, msg.id)} className="copy-msg-btn">{copiedId === msg.id ? "✓" : "📋"}</button>}</div>{msg.role === "user" && <div className="avatar-small avatar-user">👤</div>}</div>))}
        {streamingText && (<div className="msg-row msg-row-ai"><div className="avatar-small">🖤</div><div className={`bubble ${isDark ? "bubble-ai" : "bubble-ai-light"}`}><MessageContent content={streamingText} /></div></div>)}
        {loading && !streamingText && (<div className="msg-row msg-row-ai"><div className="avatar-small">🖤</div><div className={`bubble ${isDark ? "bubble-ai" : "bubble-ai-light"}`}><TypingDots /></div></div>)}
        <div ref={bottomRef} />
      </div>
      {attachedFiles.length > 0 && (<div style={{ display: "flex", gap: "8px", padding: "8px 20px", flexWrap: "wrap" }}>{attachedFiles.map(f => (<div key={f.id} style={{ display: "flex", alignItems: "center", gap: "6px", background: "rgba(108,92,231,0.15)", borderRadius: "10px", padding: "6px 10px", fontSize: "12px" }}><span>{f.icon}</span><span style={{ maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span><button onClick={() => removeFile(f.id)} style={{ background: "transparent", border: "none", color: "inherit", cursor: "pointer" }}>✕</button></div>))}</div>)}
      <div className="input-area"><button onClick={() => fileInputRef.current?.click()} className="header-btn" style={{ fontSize: "20px" }}>📎</button><input type="file" ref={fileInputRef} onChange={handleFileUpload} multiple style={{ display: "none" }} accept=".txt,.js,.jsx,.ts,.tsx,.py,.html,.css,.json,.csv,.md,.pdf,image/*" /><textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder={loading ? "بلاك بيكتب..." : "اكتب لبلاك..."} rows={1} className="textarea" disabled={loading && !streamingText} /><button onClick={() => sendMessage()} className="send-btn" style={{ opacity: (!input.trim() && attachedFiles.length === 0 && !loading) ? 0.4 : 1, background: loading ? "#f87171" : "" }}>{loading ? "■" : "↑"}</button></div>
    </div>
  );
}
