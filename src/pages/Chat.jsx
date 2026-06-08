import { useState, useRef, useEffect } from "react";
import "../App.css";
import MessageContent from "../components/MessageContent";
import TypingDots from "../components/TypingDots";
import { supabase } from '../lib/supabase';
import { SYSTEM_PROMPT, DEFAULT_SETTINGS } from '../config/constants';

function cleanResponse(text) {
  if (!text) return "";
  return text.replace(/[ \t]+/g, ' ').trim();
}

async function readFileAsText(file) {
  return new Promise(function(resolve) {
    const reader = new FileReader();
    reader.onload = function() { resolve(reader.result); };
    if (file.type.startsWith("image/")) { resolve("🖼️ " + file.name); return; }
    reader.readAsText();
  });
}

function getFileIcon(file) {
  if (file.type.startsWith("image/")) return "🖼️";
  if (file.type.includes("javascript")) return "💛";
  if (file.type.includes("python")) return "🐍";
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
  const [messages, setMessages] = useState([{ role: "assistant", content: "أهلاً.. أنا بلاك 🖤\nاتكلم، أنا هنا.", id: Date.now() }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [copiedId, setCopiedId] = useState(null);
  const [theme, setTheme] = useState("dark");
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [userSettings, setUserSettings] = useState(DEFAULT_SETTINGS);
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
  
  useEffect(function() {
    loadAllData();
    inputRef.current?.focus();
  }, []);

  useEffect(function() {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  useEffect(function() {
    if (!isLoaded || messages.length <= 1) return;
    const timer = setTimeout(function() { saveChatToSupabase(); }, 3000);
    return function() { clearTimeout(timer); };
  }, [messages, isLoaded]);

  useEffect(function() {
    function handleBeforeUnload() { saveChatToSupabase(); }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return function() { window.removeEventListener("beforeunload", handleBeforeUnload); };
  }, [isLoaded]);

  async function loadAllData() {
    await loadUserSettings();
    await loadUserKeys();
    await loadChatsFromSupabase();
    setIsLoaded(true);
  }

  async function loadUserSettings() {
    try {
      const { data } = await supabase.from('profiles').select('cooldown_seconds, daily_limit').eq('id', user.id).single();
      if (data) {
        setUserSettings({
          ...DEFAULT_SETTINGS,
          cooldownSeconds: data.cooldown_seconds || DEFAULT_SETTINGS.cooldownSeconds,
          dailyLimit: data.daily_limit || DEFAULT_SETTINGS.dailyLimit,
        });
      }
    } catch (err) {}
  }

  async function loadUserKeys() {
    try {
      const { data } = await supabase.from('user_keys').select('*').eq('user_id', user.id).eq('is_active', true);
      const savedKeys = [];
      if (data && data.length > 0) {
        data.forEach(function(key) {
          savedKeys.push({ 
            id: 'uk-' + key.id, 
            key: key.key_value, 
            used: key.used_today || 0, 
            dailyLimit: key.daily_limit || 5000,
            keyType: key.key_type || 'groq'
          });
        });
      }
      setKeys(savedKeys);
    } catch (err) {}
  }

  function pickBestKey() {
    const available = keysRef.current.filter(function(k) { return k.used < k.dailyLimit; });
    if (available.length === 0) return null;
    return available[Math.floor(Math.random() * available.length)];
  }

  async function executeRequest(text, isRetry) {
    const selectedKey = pickBestKey();
    if (!selectedKey) {
      setMessages(function(p) { return [...p, { role: "assistant", content: "🚫 خلصت كل المفاتيح النهارده 😅🖤", id: Date.now() }]; });
      return;
    }

    const userMsg = { role: "user", content: text, id: Date.now() };
    const updated = isRetry ? messagesRef.current : [...messagesRef.current, userMsg];
    if (!isRetry) { setMessages(updated); setInput(""); setAttachedFiles([]); }
    setLoading(true); setStreamingText("");

    try {
      let reply = "";
      let tokens = 0;

      // ✅ Gemini API
      if (selectedKey.keyType === 'gemini') {
        const history = updated.slice(0, -1).map(function(m) {
          return { role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] };
        });

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${selectedKey.key}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
              contents: [...history, { role: "user", parts: [{ text: text }] }],
              generationConfig: { temperature: 0.7, maxOutputTokens: 2000 }
            }),
          }
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || "خطأ في Gemini");
        reply = cleanResponse(data.candidates?.[0]?.content?.parts?.[0]?.text || "");
        tokens = Math.ceil((text.length + reply.length) / 4);
      }
      // ✅ Groq API
      else {
        const clean = updated.map(function(m) { return { role: m.role, content: m.content }; });
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": "Bearer " + selectedKey.key },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "system", content: SYSTEM_PROMPT }, ...clean.slice(-40)],
            temperature: 0.7, max_tokens: 2000, stream: false
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || "خطأ في Groq");
        reply = cleanResponse(data.choices?.[0]?.message?.content || "");
        tokens = data.usage?.total_tokens || 500;
      }

      // عرض الرد حرف حرف
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      let i = 0;
      function type() {
        if (i <= reply.length) { setStreamingText(reply.slice(0, i)); i++; typingTimerRef.current = setTimeout(type, 15); }
        else {
          setStreamingText("");
          setMessages(function(p) { return [...p, { role: "assistant", content: reply, id: Date.now() }]; });
          setLoading(false);
          setTimeout(function() { inputRef.current?.focus(); }, 100);
        }
      }
      type();

      const newUsed = selectedKey.used + tokens;
      const uk = keysRef.current.map(function(k) { return k.id === selectedKey.id ? { ...k, used: newUsed } : k; });
      setKeys(uk);
      await saveKeyUsage(selectedKey.id, newUsed);

    } catch (err) {
      setMessages(function(p) { return [...p, { role: "assistant", content: "خطأ: " + err.message, id: Date.now() }]; });
      setLoading(false);
    }
  }

  async function sendMessage(overrideText, isRetry) {
    if (loading && !isRetry) return;
    const text = (overrideText || input).trim();
    if (!text && !isRetry) return;
    executeRequest(text, isRetry);
  }

  async function saveKeyUsage(keyId, newUsed) {
    try {
      if (typeof keyId === 'string' && keyId.startsWith('uk-')) {
        await supabase.from('user_keys').update({ used_today: newUsed }).eq('id', parseInt(keyId.replace('uk-', '')));
      }
      const today = new Date().toISOString().slice(0, 10);
      const { data: existing } = await supabase.from('user_usage').select('id').eq('user_id', user.id).eq('date', today).limit(1);
      if (existing && existing.length > 0) {
        await supabase.from('user_usage').update({ tokens_used: newUsed }).eq('id', existing[0].id);
      } else {
        await supabase.from('user_usage').insert({ user_id: user.id, tokens_used: newUsed, date: today });
      }
    } catch (err) {}
  }

  async function loadChatsFromSupabase() {
    try {
      const { data: chats } = await supabase.from('chats').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(20);
      if (chats && chats.length > 0) { setAllChats(chats.map(function(c) { return { id: c.id, title: c.title || "محادثة", date: c.updated_at, messageCount: c.messages?.length || 0 }; })); }
    } catch (err) {}
  }

  async function saveChatToSupabase() {
    const currentMessages = messagesRef.current;
    if (!currentMessages || currentMessages.length <= 1) return;
    const title = currentMessages.find(function(m) { return m.role === "user"; })?.content?.slice(0, 50) || "محادثة";
    try {
      await supabase.from('chats').upsert({ id: currentChatIdRef.current, user_id: user.id, title: title, messages: currentMessages.slice(-40), updated_at: new Date().toISOString() });
    } catch (err) {}
  }

  async function newChat() { await saveChatToSupabase(); const newId = Date.now().toString(); currentChatIdRef.current = newId; setCurrentChatId(newId); setMessages([{ role: "assistant", content: "محادثة جديدة 🖤", id: Date.now() }]); setShowMenu(false); setShowHistory(false); setInput(""); setAttachedFiles([]); }
  async function openChat(chatId) { await saveChatToSupabase(); const { data } = await supabase.from('chats').select('*').eq('id', chatId).single(); if (data?.messages) { currentChatIdRef.current = chatId; setCurrentChatId(chatId); setMessages(data.messages.slice(-40)); } setShowHistory(false); setShowMenu(false); setInput(""); setAttachedFiles([]); }
  function copyMessage(content, id) { navigator.clipboard.writeText(content).then(function() { setCopiedId(id); setTimeout(function() { setCopiedId(null); }, 2000); }).catch(function() { const ta = document.createElement("textarea"); ta.value = content; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta); setCopiedId(id); setTimeout(function() { setCopiedId(null); }, 2000); }); }
  async function handleFileUpload(e) { const files = Array.from(e.target.files); if (files.length === 0) return; const newFiles = []; for (const file of files) { newFiles.push({ id: Date.now() + Math.random(), name: file.name, type: file.type, size: file.size, icon: getFileIcon(file), content: await readFileAsText(file) }); } setAttachedFiles(function(prev) { return [...prev, ...newFiles]; }); inputRef.current?.focus(); }
  function removeFile(fileId) { setAttachedFiles(function(prev) { return prev.filter(function(f) { return f.id !== fileId; }); }); }
  function handleKeyDown(e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }

  const totalLimit = keys.reduce(function(s, k) { return s + k.dailyLimit; }, 0);
  const totalUsed = keys.reduce(function(s, k) { return s + k.used; }, 0);
  const tokenPercent = totalLimit > 0 ? ((totalUsed / totalLimit) * 100).toFixed(1) : "0.0";
  const availKeys = keys.filter(function(k) { return k.used < k.dailyLimit; }).length;
  const tokenColor = tokenPercent < 50 ? "#4ade80" : tokenPercent < 80 ? "#facc15" : "#f87171";
  const isDark = theme === "dark";

  if (!isLoaded) return <div style={{ height: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f0f1a", color: "#e0e0e0" }}><div>🖤 جاري التحميل...</div></div>;

  if (isLoaded && keys.length === 0) {
    return (
      <div style={{ height: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f0f1a", color: "#e0e0e0", fontFamily: "system-ui, sans-serif", textAlign: "center", padding: "20px" }}>
        <div>
          <div style={{ fontSize: "80px", marginBottom: "20px" }}>🔑</div>
          <h2 style={{ fontSize: "24px", marginBottom: "15px" }}>مفيش مفاتيح متاحة</h2>
          <p style={{ opacity: 0.7, fontSize: "16px", marginBottom: "10px" }}>تواصل مع المدير عشان يضيفلك مفتاح API</p>
          <p style={{ opacity: 0.5, fontSize: "14px", marginBottom: "30px" }}>لما المفتاح يتضاف، دوس على الزر بالأسفل</p>
          <button onClick={loadAllData} style={{ padding: "14px 40px", background: "linear-gradient(135deg, #6c5ce7, #8b5cf6)", color: "#fff", border: "none", borderRadius: "12px", cursor: "pointer", fontSize: "16px", fontWeight: "bold", marginBottom: "15px", display: "block", width: "100%", maxWidth: "300px", margin: "0 auto 15px auto" }}>🔄 تحديث</button>
          <button onClick={onLogout} style={{ padding: "10px 25px", background: "transparent", color: "#f87171", border: "1px solid rgba(248,113,113,0.3)", borderRadius: "10px", cursor: "pointer", fontSize: "14px" }}>🚪 تسجيل خروج</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`container ${isDark ? "dark" : "light"}`}>
      <div className="header">
        <div className="header-left"><div className="avatar">🖤</div><div><div className="header-name">بلاك</div><div className="header-status"><span className="status-dot" />{loading ? "بيكتب..." : "متصل"}</div></div></div>
        <div className="header-right">
          <button onClick={newChat} className="header-btn" title="محادثة جديدة" style={{ fontSize: "20px" }}>➕</button>
          <button onClick={function() { setShowMenu(!showMenu); }} className="header-btn" style={{ fontSize: "22px" }}>{showMenu ? "✕" : "☰"}</button>
        </div>
        {showMenu && (
          <>
            <div onClick={function() { setShowMenu(false); }} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 200, background: "rgba(0,0,0,0.5)" }} />
            <div style={{ position: "absolute", top: "60px", right: "10px", background: isDark ? "#1a1a2e" : "#fff", borderRadius: "16px", padding: "8px", zIndex: 201, display: "flex", flexDirection: "column", gap: "2px", minWidth: "220px", boxShadow: "0 10px 40px rgba(0,0,0,0.3)" }}>
              <button onClick={function() { setShowHistory(!showHistory); setShowMenu(false); }} className="menu-item">💬 سجل المحادثات</button>
              <button onClick={function() { setTheme(function(t) { return t === "dark" ? "light" : "dark"; }); }} className="menu-item">{isDark ? "☀️ الوضع النهاري" : "🌙 الوضع الليلي"}</button>
              <button onClick={function() { onLogout(); }} className="menu-item" style={{ color: "#f87171" }}>🚪 تسجيل خروج</button>
            </div>
          </>
        )}
      </div>
      <div className="token-bar"><div className="token-info"><span>⚡ {totalUsed.toLocaleString()} / {totalLimit.toLocaleString()} token ({availKeys}/{keys.length} مفاتيح)</span><span style={{ color: tokenColor }}>{tokenPercent}%</span></div><div className="token-track"><div className="token-fill" style={{ width: tokenPercent + "%", background: tokenColor }} /></div></div>
      {showHistory && (
        <div className="search-bar" style={{ flexDirection: "column", alignItems: "stretch", gap: "8px", maxHeight: "250px", overflowY: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}><strong>📝 سجل المحادثات</strong><button onClick={function() { setShowHistory(false); }} className="close-btn">✕</button></div>
          {allChats.length === 0 ? <div style={{ textAlign: "center", opacity: 0.6, padding: "10px" }}>مفيش محادثات</div> : allChats.map(function(c) { return (
            <div key={c.id} onClick={function() { openChat(c.id); }} style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", borderRadius: "12px", cursor: "pointer", background: c.id === currentChatId ? "rgba(108,92,231,0.2)" : "rgba(255,255,255,0.03)" }}>
              <div style={{ flex: 1, overflow: "hidden" }}><div style={{ fontSize: "14px", fontWeight: 500 }}>{c.title}</div><div style={{ fontSize: "11px", opacity: 0.5 }}>{formatDate(c.date)} · {c.messageCount} رسالة</div></div>
              <button onClick={function(e) { e.stopPropagation(); supabase.from('chats').delete().eq('id', c.id).then(loadChatsFromSupabase); }} style={{ background: "transparent", border: "none", color: "inherit", fontSize: "16px", cursor: "pointer", opacity: 0.5 }}>🗑️</button>
            </div>
          ); })}
        </div>
      )}
      <div className="messages">
        {messages.map(function(msg) { return (
          <div key={msg.id} className={`msg-row ${msg.role === "user" ? "msg-row-user" : "msg-row-ai"}`}>
            {msg.role === "assistant" && <div className="avatar-small">🖤</div>}
            <div className="msg-content-wrapper"><div className={`bubble ${msg.role === "user" ? "bubble-user" : isDark ? "bubble-ai" : "bubble-ai-light"}`}><MessageContent content={msg.content} /></div>{msg.role === "assistant" && <button onClick={function() { copyMessage(msg.content, msg.id); }} className="copy-msg-btn">{copiedId === msg.id ? "✓" : "📋"}</button>}</div>
            {msg.role === "user" && <div className="avatar-small avatar-user">👤</div>}
          </div>
        ); })}
        {streamingText && <div className="msg-row msg-row-ai"><div className="avatar-small">🖤</div><div className={`bubble ${isDark ? "bubble-ai" : "bubble-ai-light"}`}><MessageContent content={streamingText} /></div></div>}
        {loading && !streamingText && <div className="msg-row msg-row-ai"><div className="avatar-small">🖤</div><div className={`bubble ${isDark ? "bubble-ai" : "bubble-ai-light"}`}><TypingDots /></div></div>}
        <div ref={bottomRef} />
      </div>
      {attachedFiles.length > 0 && (
        <div style={{ display: "flex", gap: "8px", padding: "8px 20px", flexWrap: "wrap" }}>
          {attachedFiles.map(function(f) { return <div key={f.id} style={{ display: "flex", alignItems: "center", gap: "6px", background: "rgba(108,92,231,0.15)", borderRadius: "10px", padding: "6px 10px", fontSize: "12px" }}><span>{f.icon}</span><span style={{ maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span><button onClick={function() { removeFile(f.id); }} style={{ background: "transparent", border: "none", color: "inherit", cursor: "pointer" }}>✕</button></div>; })}
        </div>
      )}
      <div className="input-area">
        <button onClick={function() { fileInputRef.current?.click(); }} className="header-btn" style={{ fontSize: "20px" }}>📎</button>
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} multiple style={{ display: "none" }} accept=".txt,.js,.jsx,.ts,.tsx,.py,.html,.css,.json,.csv,.md,.pdf,image/*" />
        <textarea ref={inputRef} value={input} onChange={function(e) { setInput(e.target.value); }} onKeyDown={handleKeyDown} placeholder={loading ? "بلاك بيكتب..." : "اكتب لبلاك..."} rows={1} className="textarea" disabled={loading && !streamingText} />
        <button onClick={function() { sendMessage(); }} className="send-btn" style={{ opacity: !input.trim() || loading ? 0.4 : 1, background: loading ? "#f87171" : "" }}>{loading ? "⏳" : "↑"}</button>
      </div>
    </div>
  );
    }
