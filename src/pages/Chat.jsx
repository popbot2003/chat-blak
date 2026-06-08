import { useState, useRef, useEffect } from "react";
import "../App.css";
import MessageContent from "../components/MessageContent";
import TypingDots from "../components/TypingDots";
import { supabase } from '../lib/supabase';
import { SYSTEM_PROMPT, DEFAULT_SETTINGS } from '../config/constants';

async function searchDuckDuckGo(query) {
  try {
    const res = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`);
    const data = await res.json();
    const results = [];
    if (data.Abstract) results.push(data.Abstract);
    if (data.Answer) results.unshift(data.Answer);
    if (data.RelatedTopics) {
      data.RelatedTopics.slice(0, 3).forEach(function(t) { if (t.Text) results.push(t.Text); });
    }
    return results.length > 0 ? results.join("\n") : null;
  } catch (err) { return null; }
}

function cleanResponse(text) { if (!text) return ""; return text.replace(/[ \t]+/g, ' ').trim(); }

async function readFileAsText(file) {
  return new Promise(function(resolve) {
    const reader = new FileReader();
    reader.onload = function() { resolve(reader.result); };
    reader.onerror = function() { resolve("❌ خطأ في قراءة الملف"); };
    if (file.type.startsWith("image/")) { reader.readAsDataURL(); resolve("🖼️ صورة: " + file.name); return; }
    if (file.type === "application/pdf") { reader.readAsArrayBuffer(); resolve("📄 PDF: " + file.name); return; }
    reader.readAsText();
  });
}

function getFileIcon(file) {
  if (file.type.startsWith("image/")) return "🖼️";
  if (file.type === "application/pdf") return "📄";
  if (file.type.includes("javascript") || file.name.endsWith(".js") || file.name.endsWith(".jsx")) return "💛";
  if (file.type.includes("python") || file.name.endsWith(".py")) return "🐍";
  if (file.type.includes("html") || file.name.endsWith(".html")) return "🌐";
  if (file.type.includes("css") || file.name.endsWith(".css")) return "🎨";
  if (file.name.endsWith(".json")) return "📋";
  if (file.name.endsWith(".csv")) return "📊";
  if (file.name.endsWith(".md")) return "📝";
  return "📎";
}

function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  if (diff < 60000) return "الآن";
  if (diff < 3600000) return "منذ " + Math.floor(diff / 60000) + " د";
  return date.toLocaleDateString("ar-EG");
}

export default function Chat({ user, onLogout }) {
  const [keys, setKeys] = useState([]);
  const [allChats, setAllChats] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(Date.now().toString());
  const [showHistory, setShowHistory] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [messages, setMessages] = useState([{ role: "assistant", content: "أهلاً.. أنا بلاك 🖤\nاتكلم، أنا هنا. تقدر ترفع ملفات كمان 📎", id: Date.now() }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [copiedId, setCopiedId] = useState(null);
  const [theme, setTheme] = useState("dark");
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const keysRef = useRef(keys);
  const typingTimerRef = useRef(null);
  const messagesRef = useRef(messages);
  const currentChatIdRef = useRef(currentChatId);

  useEffect(function() { keysRef.current = keys; }, [keys]);
  useEffect(function() { messagesRef.current = messages; }, [messages]);
  useEffect(function() { currentChatIdRef.current = currentChatId; }, [currentChatId]);
  useEffect(function() { loadAllData(); inputRef.current?.focus(); }, []);
  useEffect(function() { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, streamingText]);
  useEffect(function() { if (!isLoaded || messages.length <= 1) return; const t = setTimeout(function() { saveChatToSupabase(); }, 3000); return function() { clearTimeout(t); }; }, [messages, isLoaded]);
  useEffect(function() { function h() { saveChatToSupabase(); } window.addEventListener("beforeunload", h); return function() { window.removeEventListener("beforeunload", h); }; }, [isLoaded]);

  async function loadAllData() { await loadUserKeys(); await loadChatsFromSupabase(); setIsLoaded(true); }

  async function loadUserKeys() {
    try {
      const { data } = await supabase.from('user_keys').select('*').eq('user_id', user.id).eq('is_active', true);
      const sk = [];
      if (data && data.length > 0) { data.forEach(function(k) { sk.push({ id: 'uk-' + k.id, key: k.key_value, used: k.used_today || 0, dailyLimit: k.daily_limit || 5000 }); }); }
      setKeys(sk);
    } catch (err) {}
  }

  function pickBestKey() {
    const avail = keysRef.current.filter(function(k) { return k.used < k.dailyLimit; });
    if (avail.length === 0) return null;
    return avail[Math.floor(Math.random() * avail.length)];
  }

  async function executeRequest(text, isRetry) {
    const key = pickBestKey();
    if (!key) { setMessages(function(p) { return [...p, { role: "assistant", content: "🚫 خلصت كل المفاتيح 😅🖤", id: Date.now() }]; }); return; }
    const um = { role: "user", content: text, id: Date.now() };
    const upd = isRetry ? messagesRef.current : [...messagesRef.current, um];
    if (!isRetry) { setMessages(upd); setInput(""); setAttachedFiles([]); }
    setLoading(true); setStreamingText("");
    try {
      let et = text;
      const sr = await searchDuckDuckGo(text);
      if (sr) et = text + "\n\n[نتائج البحث]:\n" + sr + "\n\nاستخدم النتائج في إجابتك.";
      const cl = upd.map(function(m) { return { role: m.role, content: m.content }; });
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + key.key },
        body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages: [{ role: "system", content: SYSTEM_PROMPT }, ...cl.slice(-39), { role: "user", content: et }], temperature: 0.3, max_tokens: 2000, stream: false }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error?.code === "rate_limit_exceeded") {
          const uk = keysRef.current.map(function(k) { return k.id === key.id ? { ...k, used: k.dailyLimit } : k; });
          setKeys(uk); await saveKeyUsage(key.id, key.dailyLimit);
          if (!isRetry) { setTimeout(function() { executeRequest(text, true); }, 1000); return; }
          setMessages(function(p) { return [...p, { role: "assistant", content: "كل المفاتيح خلصت 😅", id: Date.now() }]; }); setLoading(false); return;
        }
        throw new Error(data.error?.message || "خطأ");
      }
      const reply = cleanResponse(data.choices?.[0]?.message?.content || "");
      const tokens = data.usage?.total_tokens || 500;
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      let i = 0;
      function type() { if (i <= reply.length) { setStreamingText(reply.slice(0, i)); i++; typingTimerRef.current = setTimeout(type, 15); } else { setStreamingText(""); setMessages(function(p) { return [...p, { role: "assistant", content: reply, id: Date.now() }]; }); setLoading(false); setTimeout(function() { inputRef.current?.focus(); }, 100); } }
      type();
      const nu = key.used + tokens;
      const uk = keysRef.current.map(function(k) { return k.id === key.id ? { ...k, used: nu } : k; });
      setKeys(uk); await saveKeyUsage(key.id, nu);
    } catch (err) { setMessages(function(p) { return [...p, { role: "assistant", content: "خطأ: " + err.message, id: Date.now() }]; }); setLoading(false); }
  }

  async function sendMessage(ot, isRetry) {
    if (loading && !isRetry) return;
    const text = (ot || input).trim();
    if (!text && attachedFiles.length === 0 && !isRetry) return;
    let ft = text;
    if (attachedFiles.length > 0) { ft = (text || "الملفات المرفقة:") + attachedFiles.map(function(f) { return "\n\n📎 " + f.name + "\n```\n" + f.content + "\n```"; }).join(""); }
    executeRequest(ft, isRetry);
  }

  async function saveKeyUsage(kid, nu) {
    try {
      if (typeof kid === 'string' && kid.startsWith('uk-')) { await supabase.from('user_keys').update({ used_today: nu }).eq('id', parseInt(kid.replace('uk-', ''))); }
      const today = new Date().toISOString().slice(0, 10);
      const { data: ex } = await supabase.from('user_usage').select('id').eq('user_id', user.id).eq('date', today).limit(1);
      if (ex && ex.length > 0) await supabase.from('user_usage').update({ tokens_used: nu }).eq('id', ex[0].id);
      else await supabase.from('user_usage').insert({ user_id: user.id, tokens_used: nu, date: today });
    } catch (err) {}
  }

  async function loadChatsFromSupabase() {
    try {
      const { data: chats } = await supabase.from('chats').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(20);
      if (chats && chats.length > 0) setAllChats(chats.map(function(c) { return { id: c.id, title: c.title || "محادثة", date: c.updated_at, messageCount: c.messages?.length || 0 }; }));
    } catch (err) {}
  }

  async function saveChatToSupabase() {
    const cm = messagesRef.current; if (!cm || cm.length <= 1) return;
    const title = cm.find(function(m) { return m.role === "user"; })?.content?.slice(0, 50) || "محادثة";
    try { await supabase.from('chats').upsert({ id: currentChatIdRef.current, user_id: user.id, title: title, messages: cm.slice(-40), updated_at: new Date().toISOString() }); } catch (err) {}
  }

  async function newChat() { await saveChatToSupabase(); const id = Date.now().toString(); currentChatIdRef.current = id; setCurrentChatId(id); setMessages([{ role: "assistant", content: "محادثة جديدة 🖤", id: Date.now() }]); setShowMenu(false); setShowHistory(false); setInput(""); setAttachedFiles([]); }
  async function openChat(chatId) { await saveChatToSupabase(); const { data } = await supabase.from('chats').select('*').eq('id', chatId).single(); if (data?.messages) { currentChatIdRef.current = chatId; setCurrentChatId(chatId); setMessages(data.messages.slice(-40)); } setShowHistory(false); setShowMenu(false); setInput(""); setAttachedFiles([]); }
  function copyMessage(content, id) { navigator.clipboard.writeText(content).then(function() { setCopiedId(id); setTimeout(function() { setCopiedId(null); }, 2000); }).catch(function() { const ta = document.createElement("textarea"); ta.value = content; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta); setCopiedId(id); setTimeout(function() { setCopiedId(null); }, 2000); }); }
  async function handleFileUpload(e) { const files = Array.from(e.target.files || []); if (files.length === 0) return; setLoading(true); const nf = []; for (const file of files) { try { nf.push({ id: Date.now() + Math.random(), name: file.name, type: file.type, size: file.size, icon: getFileIcon(file), content: await readFileAsText(file) }); } catch (err) { nf.push({ id: Date.now() + Math.random(), name: file.name, type: file.type, size: file.size, icon: "❌", content: "خطأ" }); } } setAttachedFiles(function(p) { return [...p, ...nf]; }); setLoading(false); inputRef.current?.focus(); }
  function removeFile(fid) { setAttachedFiles(function(p) { return p.filter(function(f) { return f.id !== fid; }); }); }
  function handleKeyDown(e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }

  const totalLimit = keys.reduce(function(s, k) { return s + k.dailyLimit; }, 0);
  const totalUsed = keys.reduce(function(s, k) { return s + k.used; }, 0);
  const tokenPercent = totalLimit > 0 ? ((totalUsed / totalLimit) * 100).toFixed(1) : "0.0";
  const availKeys = keys.filter(function(k) { return k.used < k.dailyLimit; }).length;
  const tokenColor = tokenPercent < 50 ? "#4ade80" : tokenPercent < 80 ? "#facc15" : "#f87171";
  const isDark = theme === "dark";

  if (!isLoaded) return <div style={{ height: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f0f1a", color: "#e0e0e0" }}><div>🖤 جاري التحميل...</div></div>;
  if (isLoaded && keys.length === 0) return (<div style={{ height: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f0f1a", color: "#e0e0e0", fontFamily: "system-ui, sans-serif", textAlign: "center", padding: "20px" }}><div><div style={{ fontSize: "80px", marginBottom: "20px" }}>🔑</div><h2>مفيش مفاتيح</h2><button onClick={loadAllData} style={{ padding: "14px 40px", background: "linear-gradient(135deg, #6c5ce7, #8b5cf6)", color: "#fff", border: "none", borderRadius: "12px", cursor: "pointer", fontSize: "16px", fontWeight: "bold", margin: "15px auto", display: "block" }}>🔄 تحديث</button><button onClick={onLogout} style={{ padding: "10px 25px", background: "transparent", color: "#f87171", border: "1px solid rgba(248,113,113,0.3)", borderRadius: "10px", cursor: "pointer", fontSize: "14px" }}>🚪 خروج</button></div></div>);

  return (
    <div className={`container ${isDark ? "dark" : "light"}`}>
      <div className="header"><div className="header-left"><div className="avatar">🖤</div><div><div className="header-name">بلاك</div><div className="header-status"><span className="status-dot" />{loading ? "بيكتب..." : "متصل"}</div></div></div><div className="header-right"><button onClick={newChat} className="header-btn" style={{ fontSize: "20px" }}>➕</button><button onClick={function() { setShowMenu(!showMenu); }} className="header-btn" style={{ fontSize: "22px" }}>{showMenu ? "✕" : "☰"}</button></div>
        {showMenu && (<><div onClick={function() { setShowMenu(false); }} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 200, background: "rgba(0,0,0,0.5)" }} /><div style={{ position: "absolute", top: "60px", right: "10px", background: isDark ? "#1a1a2e" : "#fff", borderRadius: "16px", padding: "8px", zIndex: 201, display: "flex", flexDirection: "column", gap: "2px", minWidth: "220px", boxShadow: "0 10px 40px rgba(0,0,0,0.3)" }}><button onClick={function() { setShowHistory(!showHistory); setShowMenu(false); }} className="menu-item">💬 سجل المحادثات</button><button onClick={function() { setTheme(function(t) { return t === "dark" ? "light" : "dark"; }); }} className="menu-item">{isDark ? "☀️ النهاري" : "🌙 الليلي"}</button><button onClick={function() { onLogout(); }} className="menu-item" style={{ color: "#f87171" }}>🚪 خروج</button></div></>)}
      </div>
      <div className="token-bar"><div className="token-info"><span>⚡ {totalUsed.toLocaleString()} / {totalLimit.toLocaleString()} token ({availKeys}/{keys.length})</span><span style={{ color: tokenColor }}>{tokenPercent}%</span></div><div className="token-track"><div className="token-fill" style={{ width: tokenPercent + "%", background: tokenColor }} /></div></div>
      {showHistory && (<div className="search-bar" style={{ flexDirection: "column", alignItems: "stretch", gap: "8px", maxHeight: "250px", overflowY: "auto" }}><div style={{ display: "flex", justifyContent: "space-between" }}><strong>📝 السجل</strong><button onClick={function() { setShowHistory(false); }} className="close-btn">✕</button></div>{allChats.length === 0 ? <div style={{ textAlign: "center", opacity: 0.6, padding: "10px" }}>مفيش محادثات</div> : allChats.map(function(c) { return (<div key={c.id} onClick={function() { openChat(c.id); }} style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", borderRadius: "12px", cursor: "pointer", background: c.id === currentChatId ? "rgba(108,92,231,0.2)" : "rgba(255,255,255,0.03)" }}><div style={{ flex: 1 }}><div style={{ fontSize: "14px", fontWeight: 500 }}>{c.title}</div><div style={{ fontSize: "11px", opacity: 0.5 }}>{formatDate(c.date)} · {c.messageCount} رسالة</div></div><button onClick={function(e) { e.stopPropagation(); supabase.from('chats').delete().eq('id', c.id).then(loadChatsFromSupabase); }} style={{ background: "transparent", border: "none", color: "inherit", fontSize: "16px", cursor: "pointer", opacity: 0.5 }}>🗑️</button></div>); })}</div>)}
      <div className="messages">
        {messages.map(function(msg) { return (<div key={msg.id} className={`msg-row ${msg.role === "user" ? "msg-row-user" : "msg-row-ai"}`}>{msg.role === "assistant" && <div className="avatar-small">🖤</div>}<div className="msg-content-wrapper"><div className={`bubble ${msg.role === "user" ? "bubble-user" : isDark ? "bubble-ai" : "bubble-ai-light"}`}><MessageContent content={msg.content} /></div>{msg.role === "assistant" && <button onClick={function() { copyMessage(msg.content, msg.id); }} className="copy-msg-btn">{copiedId === msg.id ? "✓" : "📋"}</button>}</div>{msg.role === "user" && <div className="avatar-small avatar-user">👤</div>}</div>); })}
        {streamingText && <div className="msg-row msg-row-ai"><div className="avatar-small">🖤</div><div className={`bubble ${isDark ? "bubble-ai" : "bubble-ai-light"}`}><MessageContent content={streamingText} /></div></div>}
        {loading && !streamingText && <div className="msg-row msg-row-ai"><div className="avatar-small">🖤</div><div className={`bubble ${isDark ? "bubble-ai" : "bubble-ai-light"}`}><TypingDots /></div></div>}
        <div ref={bottomRef} />
      </div>
      {attachedFiles.length > 0 && (<div style={{ display: "flex", gap: "8px", padding: "8px 20px", flexWrap: "wrap" }}>{attachedFiles.map(function(f) { return <div key={f.id} style={{ display: "flex", alignItems: "center", gap: "6px", background: "rgba(108,92,231,0.15)", borderRadius: "10px", padding: "6px 10px", fontSize: "12px" }}><span>{f.icon}</span><span style={{ maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span><button onClick={function() { removeFile(f.id); }} style={{ background: "transparent", border: "none", color: "inherit", cursor: "pointer" }}>✕</button></div>; })}</div>)}
      <div className="input-area">
        <button onClick={function() { fileInputRef.current?.click(); }} className="header-btn" style={{ fontSize: "20px", padding: "8px" }}>📎</button>
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} multiple style={{ display: "none" }} accept=".txt,.js,.jsx,.ts,.tsx,.py,.html,.css,.json,.csv,.md,.xml,.yaml,.yml,.pdf,image/*" />
        <textarea ref={inputRef} value={input} onChange={function(e) { setInput(e.target.value); }} onKeyDown={handleKeyDown} placeholder={loading ? "بلاك بيكتب..." : attachedFiles.length > 0 ? "اكتب سؤالك عن الملفات..." : "اكتب لبلاك..."} rows={1} className="textarea" disabled={loading && !streamingText} />
        <button onClick={function() { sendMessage(); }} className="send-btn" style={{ opacity: (!input.trim() && attachedFiles.length === 0) || loading ? 0.4 : 1, background: loading ? "#f87171" : "" }}>{loading ? "⏳" : "↑"}</button>
      </div>
    </div>
  );
}
