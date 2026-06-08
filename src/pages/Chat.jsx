import { useState, useRef, useEffect } from "react";
import "../App.css";
import MessageContent from "../components/MessageContent";
import TypingDots from "../components/TypingDots";
import { supabase } from '../lib/supabase';
import { SYSTEM_PROMPT, DEFAULT_SETTINGS } from '../config/constants';

const CODE_SYSTEM_PROMPT = `أنت بلاك، مساعد برمجة متخصص وخبير.
عند كتابة أي كود:
- اكتب الكود كامل وقابل للتشغيل فوراً بدون أي اختصار
- لا تكتب placeholder أو تعليقات زي "// add your logic here"
- راجع الكود في ذهنك قبل ما تكتبه وتأكد إنه صح
- اذكر المكتبات المطلوبة صراحة
- لو الكود طويل، اكتبه كله في بلوك واحد
- اشرح بشكل مختصر بعد الكود فقط لو لزم
- ردودك بالعربية والكود بالإنجليزي طبعاً`;

function cleanResponse(text) {
  if (!text) return "";
  return text.replace(/[а-яёА-ЯЁ]+/g, '').replace(/[ \t]+/g, ' ').trim();
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
  const [showModelMenu, setShowModelMenu] = useState(false);
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
  const retryCountRef = useRef(0);
  const typingTimerRef = useRef(null);
  const lastRequestTimeRef = useRef(0);
  const requestCountRef = useRef({ minute: 0, minuteStart: Date.now(), tokens: 0, tokenStart: Date.now() });
  const userSettingsRef = useRef(userSettings);
  const queueRef = useRef([]);
  const processingRef = useRef(false);
  const messagesRef = useRef(messages);
  const currentChatIdRef = useRef(currentChatId);

  useEffect(function() { keysRef.current = keys; }, [keys]);
  useEffect(function() { userSettingsRef.current = userSettings; }, [userSettings]);
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
      const { data } = await supabase.from('profiles').select('rate_limit_rpm, rate_limit_tpm, daily_limit, cooldown_seconds, smart_mode, selected_model').eq('id', user.id).single();
      if (data) {
        setUserSettings({
          rateLimitRPM: data.rate_limit_rpm || DEFAULT_SETTINGS.rateLimitRPM,
          rateLimitTPM: data.rate_limit_tpm || DEFAULT_SETTINGS.rateLimitTPM,
          dailyLimit: data.daily_limit || DEFAULT_SETTINGS.dailyLimit,
          cooldownSeconds: data.cooldown_seconds || DEFAULT_SETTINGS.cooldownSeconds,
          smartMode: data.smart_mode !== false,
          selectedModel: data.selected_model || DEFAULT_SETTINGS.selectedModel
        });
      }
    } catch (err) { console.error("❌ loadUserSettings:", err); }
  }

  async function loadUserKeys() {
    try {
      const { data } = await supabase.from('user_keys').select('*').eq('user_id', user.id).eq('is_active', true);
      const savedKeys = [];
      if (data && data.length > 0) {
        data.forEach(function(key) {
          savedKeys.push({ id: 'uk-' + key.id, key: key.key_value, used: key.used_today || 0, dailyLimit: key.daily_limit || userSettings.dailyLimit });
        });
      }
      setKeys(savedKeys);
    } catch (err) { console.error("❌ loadUserKeys:", err); }
  }

  function pickBestKey() {
    const available = keysRef.current.filter(function(k) { return k.used < k.dailyLimit; });
    if (available.length === 0) return null;
    if (userSettingsRef.current.smartMode && available.length > 1) {
      available.sort(function(a, b) { return a.used - b.used; });
      const poolSize = Math.max(1, Math.floor(available.length / 2));
      const pool = available.slice(0, poolSize);
      return pool[Math.floor(Math.random() * pool.length)];
    }
    return available[Math.floor(Math.random() * available.length)];
  }

  function canMakeRequest() {
    const settings = userSettingsRef.current;
    const now = Date.now();
    if (now - lastRequestTimeRef.current < settings.cooldownSeconds * 1000) {
      return { allowed: false, reason: 'cooldown', waitMs: settings.cooldownSeconds * 1000 - (now - lastRequestTimeRef.current) };
    }
    if (now - requestCountRef.current.minuteStart > 60000) {
      requestCountRef.current = { minute: 0, minuteStart: now, tokens: requestCountRef.current.tokens, tokenStart: requestCountRef.current.tokenStart };
    }
    if (requestCountRef.current.minute >= settings.rateLimitRPM) {
      return { allowed: false, reason: 'rpm', waitMs: 60000 - (now - requestCountRef.current.minuteStart) };
    }
    if (now - requestCountRef.current.tokenStart > 60000) {
      requestCountRef.current = { minute: requestCountRef.current.minute, minuteStart: requestCountRef.current.minuteStart, tokens: 0, tokenStart: now };
    }
    if (requestCountRef.current.tokens >= settings.rateLimitTPM) {
      return { allowed: false, reason: 'tpm', waitMs: 60000 - (now - requestCountRef.current.tokenStart) };
    }
    return { allowed: true };
  }

  function processQueue() {
    if (processingRef.current || queueRef.current.length === 0) return;
    const check = canMakeRequest();
    if (!check.allowed) { setTimeout(function() { processQueue(); }, check.waitMs + 100); return; }
    processingRef.current = true;
    const nextRequest = queueRef.current.shift();
    executeRequest(nextRequest.text, nextRequest.isRetry);
  }

  function getActiveSystemPrompt() {
    return userSettingsRef.current.selectedModel === 'code-mode' ? CODE_SYSTEM_PROMPT : SYSTEM_PROMPT;
  }

  function getActiveModel() {
    return userSettingsRef.current.selectedModel === 'code-mode' ? 'llama-3.3-70b-versatile' : userSettingsRef.current.selectedModel;
  }

  async function executeRequest(text, isRetry) {
    const selectedKey = pickBestKey();
    if (!selectedKey) {
      setMessages(function(p) { return [...p, { role: "assistant", content: "🚫 خلصت كل المفاتيح النهارده 😅🖤", id: Date.now() }]; });
      processingRef.current = false; processQueue(); return;
    }

    const userMsg = { role: "user", content: text, id: Date.now() };
    const updated = isRetry ? messagesRef.current : [...messagesRef.current, userMsg];
    if (!isRetry) { setMessages(updated); setInput(""); setAttachedFiles([]); }
    setLoading(true); setStreamingText("");
    const now = Date.now();
    lastRequestTimeRef.current = now;
    requestCountRef.current.minute++;
    requestCountRef.current.tokens += 500;
    try {
      const clean = updated.map(function(m) { return { role: m.role, content: m.content }; });
      
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + selectedKey.key },
        body: JSON.stringify({
          model: getActiveModel(),
          messages: [{ role: "system", content: getActiveSystemPrompt() }, ...clean.slice(-40)],
          temperature: userSettingsRef.current.selectedModel === 'code-mode' ? 0.3 : 0.8,
          max_tokens: 2000,
          stream: false
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error?.code === "rate_limit_exceeded") {
          const uk = keysRef.current.map(function(k) { return k.id === selectedKey.id ? { ...k, used: k.dailyLimit } : k; });
          setKeys(uk); await saveKeyUsage(selectedKey.id, selectedKey.dailyLimit);
          processingRef.current = false;
          if (retryCountRef.current < keysRef.current.length * 2) { retryCountRef.current++; setTimeout(function() { executeRequest(text, true); }, 1000); return; }
          retryCountRef.current = 0;
          setMessages(function(p) { return [...p, { role: "assistant", content: "كل المفاتيح خلصت 😅", id: Date.now() }]; });
          setLoading(false); processQueue(); return;
        }
        throw new Error(data.error?.message || "خطأ");
      }
      retryCountRef.current = 0;
      const realTokens = data.usage.total_tokens;
      requestCountRef.current.tokens += realTokens - 500;
      const reply = cleanResponse(data.choices?.[0]?.message?.content || "");
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      let i = 0;
      function type() {
        if (i <= reply.length) { setStreamingText(reply.slice(0, i)); i++; typingTimerRef.current = setTimeout(type, 15); }
        else {
          setStreamingText("");
          const finalMessages = [...messagesRef.current, { role: "assistant", content: reply, id: Date.now() }];
          setMessages(finalMessages);
          setLoading(false);
          setTimeout(function() { inputRef.current?.focus(); }, 100);
          processingRef.current = false;
          processQueue();
        }
      }
      type();
      const newUsed = selectedKey.used + realTokens;
      const uk = keysRef.current.map(function(k) { return k.id === selectedKey.id ? { ...k, used: newUsed } : k; });
      setKeys(uk); await saveKeyUsage(selectedKey.id, newUsed);
    } catch (err) {
      setMessages(function(p) { return [...p, { role: "assistant", content: "خطأ: " + err.message, id: Date.now() }]; });
      processingRef.current = false; processQueue();
    }
  }

  async function sendMessage(overrideText, isRetry) {
    if (loading && !isRetry) return;
    const text = (overrideText || input).trim();
    if (!text && !isRetry) return;
    queueRef.current.push({ text: text, isRetry: isRetry || false });
    if (!isRetry) { setInput(""); setAttachedFiles([]); }
    processQueue();
  }

  async function changeModel(modelName) {
    const newSettings = { ...userSettings, selectedModel: modelName };
    setUserSettings(newSettings);
    await supabase.from('profiles').update({ selected_model: modelName }).eq('id', user.id);
    alert("✅ تم تغيير النموذج");
  }

  async function saveKeyUsage(keyId, newUsed) {
    try {
      if (typeof keyId === 'string' && keyId.startsWith('uk-')) {
        await supabase.from('user_keys').update({ used_today: newUsed }).eq('id', parseInt(keyId.replace('uk-', '')));
      }
      
      const today = new Date().toISOString().slice(0, 10);
      
      const { data: existing } = await supabase
        .from('user_usage')
        .select('id')
        .eq('user_id', user.id)
        .eq('date', today)
        .limit(1);
      
      if (existing && existing.length > 0) {
        await supabase
          .from('user_usage')
          .update({ tokens_used: newUsed })
          .eq('id', existing[0].id);
      } else {
        await supabase
          .from('user_usage')
          .insert({ user_id: user.id, tokens_used: newUsed, date: today });
      }
    } catch (err) { console.error("❌ saveKeyUsage:", err); }
  }

  async function loadChatsFromSupabase() {
    try {
      const { data: chats, error } = await supabase.from('chats').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(20);
      if (error) { console.error("❌ loadChats:", error); return; }
      if (chats && chats.length > 0) { setAllChats(chats.map(function(c) { return { id: c.id, title: c.title || "محادثة", date: c.updated_at, messageCount: c.messages?.length || 0 }; })); }
    } catch (err) { console.error("❌ loadChats:", err); }
  }

  async function saveChatToSupabase() {
    const currentMessages = messagesRef.current;
    if (!currentMessages || currentMessages.length <= 1) return;
    const title = currentMessages.find(function(m) { return m.role === "user"; })?.content?.slice(0, 50) || "محادثة";
    const chatId = currentChatIdRef.current;
    try {
      const { error } = await supabase.from('chats').upsert({ id: chatId, user_id: user.id, title: title, messages: currentMessages.slice(-40), updated_at: new Date().toISOString() });
      if (error) console.error("❌ saveChat:", error);
    } catch (err) { console.error("❌ saveChat:", err); }
  }

  function getModelEmoji() {
    if (userSettings.selectedModel === 'llama-3.1-8b-instant') return '🟢';
    if (userSettings.selectedModel === 'code-mode') return '🔵';
    return '🟣';
  }

  function getModelLabel() {
    if (userSettings.selectedModel === 'llama-3.1-8b-instant') return '🟢 سريع';
    if (userSettings.selectedModel === 'code-mode') return '🔵 مبرمج';
    return '🟣 ذكي';
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
          <span style={{ fontSize: "10px", opacity: 0.5, marginRight: "8px" }}>{getModelEmoji()} RPM:{userSettings.rateLimitRPM}</span>
          <button onClick={newChat} className="header-btn" title="محادثة جديدة" style={{ fontSize: "20px" }}>➕</button>
          <button onClick={function() { setShowMenu(!showMenu); }} className="header-btn" style={{ fontSize: "22px" }}>{showMenu ? "✕" : "☰"}</button>
        </div>
        {showMenu && (
          <>
            <div onClick={function() { setShowMenu(false); }} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 200, background: "rgba(0,0,0,0.5)" }} />
            <div style={{ position: "absolute", top: "60px", right: "10px", background: isDark ? "#1a1a2e" : "#fff", borderRadius: "16px", padding: "8px", zIndex: 201, display: "flex", flexDirection: "column", gap: "2px", minWidth: "220px", boxShadow: "0 10px 40px rgba(0,0,0,0.3)" }}>
              <div style={{ padding: "8px 16px", fontSize: "12px", opacity: 0.5 }}>⚙️ إعداداتك</div>
              <div style={{ padding: "4px 16px", fontSize: "11px", opacity: 0.4 }}>
                🎯 نموذج: {getModelLabel()}<br/>
                ⏱️ تبريد: {userSettings.cooldownSeconds}ث<br/>
                📊 RPM: {userSettings.rateLimitRPM}<br/>
                💰 يومي: {userSettings.dailyLimit.toLocaleString()}
              </div>
              <hr style={{ borderColor: "rgba(255,255,255,0.1)", margin: "8px 0" }} />
              <button onClick={function() { setShowModelMenu(!showModelMenu); }} className="menu-item">🎯 تغيير النموذج ▸</button>
              {showModelMenu && (
                <div style={{ paddingRight: "12px", borderLeft: "2px solid rgba(108,92,231,0.3)", marginRight: "8px" }}>
                  <button onClick={function() { changeModel('llama-3.1-8b-instant'); setShowModelMenu(false); setShowMenu(false); }} className="menu-item" style={{ fontSize: "13px" }}>🟢 سريع (8b)</button>
                  <button onClick={function() { changeModel('llama-3.3-70b-versatile'); setShowModelMenu(false); setShowMenu(false); }} className="menu-item" style={{ fontSize: "13px" }}>🟣 ذكي (70b)</button>
                  <button onClick={function() { changeModel('code-mode'); setShowModelMenu(false); setShowMenu(false); }} className="menu-item" style={{ fontSize: "13px" }}>🔵 مبرمج (70b + كود)</button>
                </div>
              )}
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
        <textarea ref={inputRef} value={input} onChange={function(e) { setInput(e.target.value); }} onKeyDown={handleKeyDown} placeholder={loading ? "بلاك بيكتب..." : userSettings.selectedModel === 'code-mode' ? "اكتب سؤالك البرمجي..." : "اكتب لبلاك..."} rows={1} className="textarea" disabled={loading && !streamingText} />
        <button onClick={function() { sendMessage(); }} className="send-btn" style={{ opacity: !input.trim() || loading ? 0.4 : 1, background: loading ? "#f87171" : "" }}>{loading ? "⏳" : "↑"}</button>
      </div>
    </div>
  );
    }
