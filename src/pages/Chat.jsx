// ============================================
// Chat.jsx
// صفحة الدردشة الرئيسية
// ============================================

import { useState, useRef, useEffect } from "react";
import "../App.css";
import MessageContent from "../components/MessageContent";
import TypingDots from "../components/TypingDots";
import { supabase } from '../lib/supabase';
import { SYSTEM_PROMPT, GROQ_MODEL, GROQ_MAX_TOKENS, GROQ_TEMPERATURE, CHAT_HISTORY_LIMIT, SAVE_CHAT_DELAY_MS } from '../config/constants';
import { formatDate, copyToClipboard, getUsagePercent, getUsageColor, isNewDay, debounce } from '../utils/helpers';
import { checkUserDailyLimit } from '../utils/validators';

// ========== دوال مساعدة ==========

async function searchDuckDuckGo(query) {
  try {
    const res = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`);
    const data = await res.json();
    const results = [];
    if (data.Abstract) results.push(data.Abstract);
    if (data.Answer) results.unshift(data.Answer);
    if (data.RelatedTopics) {
      data.RelatedTopics.slice(0, 3).forEach(function(t) { 
        if (t.Text) results.push(t.Text); 
      });
    }
    return results.length > 0 ? results.join("\n") : null;
  } catch (err) { 
    return null; 
  }
}

function cleanResponse(text) { 
  if (!text) return ""; 
  return text.replace(/[ \t]+/g, ' ').trim(); 
}

async function readFileAsText(file) {
  return new Promise(function(resolve) {
    const reader = new FileReader();
    reader.onload = function() { resolve(reader.result); };
    reader.onerror = function() { resolve("❌ خطأ في قراءة الملف"); };
    if (file.type.startsWith("image/")) { 
      reader.readAsDataURL(); 
      resolve("🖼️ صورة: " + file.name); 
      return; 
    }
    if (file.type === "application/pdf") { 
      reader.readAsArrayBuffer(); 
      resolve("📄 PDF: " + file.name); 
      return; 
    }
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

// ========== المكون الرئيسي ==========

export default function Chat({ user, onLogout }) {
  const [apiKeys, setApiKeys] = useState([]);
  const [allChats, setAllChats] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(Date.now().toString());
  const [showHistory, setShowHistory] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [messages, setMessages] = useState([{ 
    role: "assistant", 
    content: "أهلاً.. أنا بلاك 🖤\nاتكلم، أنا هنا. تقدر ترفع ملفات كمان 📎", 
    id: Date.now() 
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [copiedId, setCopiedId] = useState(null);
  const [theme, setTheme] = useState("dark");
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentUser, setCurrentUser] = useState(user);
  
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const apiKeysRef = useRef(apiKeys);
  const messagesRef = useRef(messages);
  const currentChatIdRef = useRef(currentChatId);
  const currentUserRef = useRef(currentUser);

  // تحديث refs
  useEffect(() => { apiKeysRef.current = apiKeys; }, [apiKeys]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { currentChatIdRef.current = currentChatId; }, [currentChatId]);
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);

  // تحميل البيانات عند بدء التشغيل
  useEffect(() => { 
    loadAllData(); 
    inputRef.current?.focus(); 
  }, []);

  // التمرير للأسفل عند رسائل جديدة
  useEffect(() => { 
    bottomRef.current?.scrollIntoView({ behavior: "smooth" }); 
  }, [messages, streamingText]);

  // حفظ المحادثة تلقائياً (باستخدام debounce)
  useEffect(() => {
    if (!isLoaded || messages.length <= 1) return;
    const save = debounce(() => saveChatToSupabase(), SAVE_CHAT_DELAY_MS);
    save();
  }, [messages, isLoaded]);

  // حفظ قبل إغلاق الصفحة
  useEffect(() => {
    window.addEventListener("beforeunload", () => saveChatToSupabase());
    return () => window.removeEventListener("beforeunload", () => saveChatToSupabase());
  }, [isLoaded]);

  // ========== دوال تحميل البيانات ==========

  async function loadAllData() { 
    await loadApiKeys(); 
    await loadChatsFromSupabase();
    await refreshUserData();
    setIsLoaded(true); 
  }

  async function loadApiKeys() {
    try {
      const { data } = await supabase
        .from('api_keys')
        .select('*')
        .eq('is_active', true);
      
      const keys = [];
      if (data && data.length > 0) {
        data.forEach(key => {
          keys.push({ 
            id: key.id, 
            key: key.key_value, 
            used: key.used_today || 0, 
            dailyLimit: key.daily_limit || 1000000 
          });
        });
      }
      setApiKeys(keys);
    } catch (err) {
      console.error("خطأ في تحميل المفاتيح:", err);
    }
  }

  async function refreshUserData() {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (data) {
        // إعادة ضبط الاستهلاك إذا تغير اليوم
        if (isNewDay(data.last_reset_date)) {
          const today = new Date().toISOString().slice(0, 10);
          await supabase
            .from('profiles')
            .update({ used_today: 0, last_reset_date: today })
            .eq('id', user.id);
          data.used_today = 0;
          data.last_reset_date = today;
        }
        setCurrentUser(data);
        localStorage.setItem("black-user", JSON.stringify(data));
      }
    } catch (err) {
      console.error("خطأ في تحديث بيانات المستخدم:", err);
    }
  }

  async function loadChatsFromSupabase() {
    try {
      const { data: chats } = await supabase
        .from('chats')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(20);
      
      if (chats && chats.length > 0) {
        setAllChats(chats.map(c => ({ 
          id: c.id, 
          title: c.title || "محادثة", 
          date: c.updated_at, 
          messageCount: c.messages?.length || 0 
        })));
      }
    } catch (err) {
      console.error("خطأ في تحميل المحادثات:", err);
    }
  }

  async function saveChatToSupabase() {
    const currentMessages = messagesRef.current;
    if (!currentMessages || currentMessages.length <= 1) return;
    
    const title = currentMessages.find(m => m.role === "user")?.content?.slice(0, 50) || "محادثة";
    
    try {
      await supabase.from('chats').upsert({ 
        id: currentChatIdRef.current, 
        user_id: user.id, 
        title: title, 
        messages: currentMessages.slice(-CHAT_HISTORY_LIMIT), 
        updated_at: new Date().toISOString() 
      });
    } catch (err) {
      console.error("خطأ في حفظ المحادثة:", err);
    }
  }

  // ========== دوال المفاتيح والحدود ==========

  function pickBestKey() {
    const available = apiKeysRef.current.filter(k => k.used < k.dailyLimit);
    if (available.length === 0) return null;
    // اختيار المفتاح الأقل استهلاكاً نسبياً
    return available.sort((a, b) => (a.used / a.dailyLimit) - (b.used / b.dailyLimit))[0];
  }

  async function updateKeyUsage(keyId, tokens) {
    try {
      const key = apiKeysRef.current.find(k => k.id === keyId);
      if (!key) return;
      
      const newUsed = key.used + tokens;
      await supabase
        .from('api_keys')
        .update({ used_today: newUsed })
        .eq('id', keyId);
      
      setApiKeys(prev => prev.map(k => k.id === keyId ? { ...k, used: newUsed } : k));
    } catch (err) {
      console.error("خطأ في تحديث استهلاك المفتاح:", err);
    }
  }

  async function updateUserUsage(tokens) {
    try {
      const newUsed = (currentUserRef.current?.used_today || 0) + tokens;
      await supabase
        .from('profiles')
        .update({ used_today: newUsed })
        .eq('id', user.id);
      
      setCurrentUser(prev => ({ ...prev, used_today: newUsed }));
    } catch (err) {
      console.error("خطأ في تحديث استهلاك المستخدم:", err);
    }
  }

  // ========== دوال الدردشة ==========

  async function executeRequest(text, isRetry = false) {
    // التحقق من حد المستخدم
    const limitCheck = checkUserDailyLimit(currentUserRef.current);
    if (!limitCheck.canChat) {
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: limitCheck.reason, 
        id: Date.now() 
      }]);
      setLoading(false);
      return;
    }

    const key = pickBestKey();
    if (!key) {
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "🚫 جميع المفاتيح العامة وصلت للحد اليومي. راجع المدير 🖤", 
        id: Date.now() 
      }]);
      setLoading(false);
      return;
    }

    const userMessage = { role: "user", content: text, id: Date.now() };
    const updatedMessages = isRetry ? messagesRef.current : [...messagesRef.current, userMessage];
    
    if (!isRetry) {
      setMessages(updatedMessages);
      setInput("");
      setAttachedFiles([]);
    }
    
    setLoading(true);
    setStreamingText("");

    try {
      // تحسين النص بالبحث
      let enhancedText = text;
      const searchResult = await searchDuckDuckGo(text);
      if (searchResult) {
        enhancedText = text + "\n\n[نتائج البحث]:\n" + searchResult + "\n\nاستخدم النتائج في إجابتك.";
      }

      // تحضير رسائل API
      const chatMessages = updatedMessages.map(m => ({ role: m.role, content: m.content }));
      
      // استدعاء Groq API
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          "Authorization": "Bearer " + key.key 
        },
        body: JSON.stringify({ 
          model: GROQ_MODEL, 
          messages: [
            { role: "system", content: SYSTEM_PROMPT }, 
            ...chatMessages.slice(-CHAT_HISTORY_LIMIT), 
            { role: "user", content: enhancedText }
          ], 
          temperature: GROQ_TEMPERATURE, 
          max_tokens: GROQ_MAX_TOKENS, 
          stream: false 
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error?.code === "rate_limit_exceeded") {
          // تجاوز حد المفتاح → نضع استهلاكه كحد أقصى
          await updateKeyUsage(key.id, key.dailyLimit);
          if (!isRetry) {
            setTimeout(() => executeRequest(text, true), 1000);
            return;
          }
        }
        throw new Error(data.error?.message || "خطأ في الاستجابة");
      }

      const reply = cleanResponse(data.choices?.[0]?.message?.content || "");
      const tokensUsed = data.usage?.total_tokens || 500;

      // تحديث الاستهلاك
      await updateKeyUsage(key.id, tokensUsed);
      await updateUserUsage(tokensUsed);
      await refreshUserData();

      // تأثير الكتابة
      let i = 0;
      function type() {
        if (i <= reply.length) {
          setStreamingText(reply.slice(0, i));
          i++;
          setTimeout(type, 15);
        } else {
          setStreamingText("");
          setMessages(prev => [...prev, { role: "assistant", content: reply, id: Date.now() }]);
          setLoading(false);
          setTimeout(() => inputRef.current?.focus(), 100);
        }
      }
      type();

    } catch (err) {
      console.error("خطأ في executeRequest:", err);
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "❌ حدث خطأ: " + err.message, 
        id: Date.now() 
      }]);
      setLoading(false);
    }
  }

  async function sendMessage(overrideText, isRetry = false) {
    if (loading && !isRetry) return;
    
    const text = (overrideText || input).trim();
    if (!text && attachedFiles.length === 0 && !isRetry) return;
    
    let finalText = text;
    if (attachedFiles.length > 0) {
      finalText = (text || "الملفات المرفقة:") + 
        attachedFiles.map(f => "\n\n📎 " + f.name + "\n```\n" + f.content + "\n```").join("");
    }
    
    executeRequest(finalText, isRetry);
  }

  // ========== دوال المحادثات ==========

  async function newChat() {
    await saveChatToSupabase();
    const newId = Date.now().toString();
    setCurrentChatId(newId);
    setMessages([{ 
      role: "assistant", 
      content: "محادثة جديدة 🖤\nاتكلم، أنا هنا.", 
      id: Date.now() 
    }]);
    setShowMenu(false);
    setShowHistory(false);
    setInput("");
    setAttachedFiles([]);
  }

  async function openChat(chatId) {
    await saveChatToSupabase();
    const { data } = await supabase
      .from('chats')
      .select('*')
      .eq('id', chatId)
      .single();
    
    if (data?.messages) {
      setCurrentChatId(chatId);
      setMessages(data.messages.slice(-CHAT_HISTORY_LIMIT));
    }
    setShowHistory(false);
    setShowMenu(false);
    setInput("");
    setAttachedFiles([]);
  }

  function copyMessage(content, id) {
    copyToClipboard(content, () => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  // ========== دوال الملفات ==========

  async function handleFileUpload(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    setLoading(true);
    const newFiles = [];
    
    for (const file of files) {
      try {
        newFiles.push({
          id: Date.now() + Math.random(),
          name: file.name,
          type: file.type,
          size: file.size,
          icon: getFileIcon(file),
          content: await readFileAsText(file)
        });
      } catch (err) {
        newFiles.push({
          id: Date.now() + Math.random(),
          name: file.name,
          type: file.type,
          size: file.size,
          icon: "❌",
          content: "خطأ"
        });
      }
    }
    
    setAttachedFiles(prev => [...prev, ...newFiles]);
    setLoading(false);
    inputRef.current?.focus();
  }

  function removeFile(fileId) {
    setAttachedFiles(prev => prev.filter(f => f.id !== fileId));
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  // ========== حسابات العرض ==========
  
  const totalLimit = apiKeys.reduce((sum, k) => sum + k.dailyLimit, 0);
  const totalUsed = apiKeys.reduce((sum, k) => sum + k.used, 0);
  const tokenPercent = totalLimit > 0 ? (totalUsed / totalLimit) * 100 : 0;
  const tokenColor = getUsageColor(tokenPercent);
  const isDark = theme === "dark";
  const userPercent = getUsagePercent(currentUser?.used_today || 0, currentUser?.daily_limit || 5000);
  const userColor = getUsageColor(userPercent);
  const remainingTokens = (currentUser?.daily_limit || 5000) - (currentUser?.used_today || 0);

  // شاشة تحميل
  if (!isLoaded) {
    return <div style={{ height: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f0f1a", color: "#e0e0e0" }}>🖤 جاري التحميل...</div>;
  }

  // لا توجد مفاتيح
  if (isLoaded && apiKeys.length === 0) {
    return (
      <div style={{ height: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f0f1a", color: "#e0e0e0", fontFamily: "system-ui, sans-serif", textAlign: "center", padding: "20px" }}>
        <div>
          <div style={{ fontSize: "80px", marginBottom: "20px" }}>🔑</div>
          <h2>لا توجد مفاتيح API عامة</h2>
          <p style={{ marginBottom: "20px" }}>يرجى إضافة مفاتيح في لوحة التحكم</p>
          <button onClick={loadApiKeys} style={{ padding: "14px 40px", background: "linear-gradient(135deg, #6c5ce7, #8b5cf6)", color: "#fff", border: "none", borderRadius: "12px", cursor: "pointer", fontSize: "16px", fontWeight: "bold", margin: "15px auto", display: "block" }}>🔄 تحديث</button>
          <button onClick={onLogout} style={{ padding: "10px 25px", background: "transparent", color: "#f87171", border: "1px solid rgba(248,113,113,0.3)", borderRadius: "10px", cursor: "pointer", fontSize: "14px" }}>🚪 خروج</button>
        </div>
      </div>
    );
  }

  // ========== واجهة المستخدم الرئيسية ==========
  
  return (
    <div className={`container ${isDark ? "dark" : "light"}`}>
      {/* الهيدر */}
      <div className="header">
        <div className="header-left">
          <div className="avatar">🖤</div>
          <div>
            <div className="header-name">بلاك</div>
            <div className="header-status">
              <span className="status-dot" />
              {loading ? "بيكتب..." : "متصل"}
            </div>
          </div>
        </div>
        <div className="header-right">
          <button onClick={newChat} className="header-btn" style={{ fontSize: "20px" }}>➕</button>
          <button onClick={() => setShowMenu(!showMenu)} className="header-btn" style={{ fontSize: "22px" }}>
            {showMenu ? "✕" : "☰"}
          </button>
        </div>
        
        {/* القائمة المنسدلة */}
        {showMenu && (
          <>
            <div onClick={() => setShowMenu(false)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 200, background: "rgba(0,0,0,0.5)" }} />
            <div style={{ position: "absolute", top: "60px", right: "10px", background: isDark ? "#1a1a2e" : "#fff", borderRadius: "16px", padding: "8px", zIndex: 201, display: "flex", flexDirection: "column", gap: "2px", minWidth: "220px", boxShadow: "0 10px 40px rgba(0,0,0,0.3)" }}>
              
              {/* بطاقة استهلاك المستخدم */}
              <div style={{ padding: "12px", margin: "4px", background: "rgba(108,92,231,0.1)", borderRadius: "12px", border: "1px solid rgba(108,92,231,0.2)" }}>
                <div style={{ fontSize: "13px", fontWeight: "bold", marginBottom: "8px" }}>📊 استهلاك اليوم</div>
                <div style={{ fontSize: "12px", marginBottom: "4px" }}>
                  استهلكت: <strong>{currentUser?.used_today?.toLocaleString() || 0}</strong> / {currentUser?.daily_limit?.toLocaleString() || 5000} توكن
                </div>
                <div style={{ fontSize: "12px", marginBottom: "8px" }}>
                  متبقي: <strong style={{ color: remainingTokens < 1000 ? "#f87171" : "#4ade80" }}>{remainingTokens.toLocaleString()}</strong> توكن ({Math.floor(100 - userPercent)}%)
                </div>
                <div style={{ width: "100%", height: "6px", background: "rgba(255,255,255,0.1)", borderRadius: "3px", overflow: "hidden" }}>
                  <div style={{ width: userPercent + "%", height: "100%", background: userColor, transition: "width 0.3s" }} />
                </div>
                <div style={{ fontSize: "10px", opacity: 0.5, marginTop: "6px" }}>
                  🔄 يتجدد كل يوم الساعة 12 صباحاً
                </div>
              </div>
              
              <button onClick={() => { setShowHistory(!showHistory); setShowMenu(false); }} className="menu-item">💬 سجل المحادثات</button>
              <button onClick={() => setTheme(t => t === "dark" ? "light" : "dark")} className="menu-item">{isDark ? "☀️ النهاري" : "🌙 الليلي"}</button>
              <button onClick={onLogout} className="menu-item" style={{ color: "#f87171" }}>🚪 خروج</button>
            </div>
          </>
        )}
      </div>
      
      {/* شريط التوكن */}
      <div className="token-bar">
        <div className="token-info">
          <span>📊 {currentUser?.used_today?.toLocaleString() || 0} / {currentUser?.daily_limit?.toLocaleString() || 5000} توكن</span>
          <span style={{ color: userColor }}>{userPercent.toFixed(0)}%</span>
        </div>
        <div className="token-track">
          <div className="token-fill" style={{ width: userPercent + "%", background: userColor }} />
        </div>
        {currentUser?.used_today >= currentUser?.daily_limit && (
          <div style={{ fontSize: "11px", color: "#f87171", marginTop: "4px" }}>
            ⚠️ وصلت للحد النهاردة! بكره هتقدر تكمل.
          </div>
        )}
      </div>
      
      {/* سجل المحادثات */}
      {showHistory && (
        <div className="search-bar" style={{ flexDirection: "column", alignItems: "stretch", gap: "8px", maxHeight: "250px", overflowY: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <strong>📝 السجل</strong>
            <button onClick={() => setShowHistory(false)} className="close-btn">✕</button>
          </div>
          {allChats.length === 0 ? (
            <div style={{ textAlign: "center", opacity: 0.6, padding: "10px" }}>مفيش محادثات</div>
          ) : (
            allChats.map(c => (
              <div key={c.id} onClick={() => openChat(c.id)} style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", borderRadius: "12px", cursor: "pointer", background: c.id === currentChatId ? "rgba(108,92,231,0.2)" : "rgba(255,255,255,0.03)" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "14px", fontWeight: 500 }}>{c.title}</div>
                  <div style={{ fontSize: "11px", opacity: 0.5 }}>{formatDate(c.date)} · {c.messageCount} رسالة</div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); supabase.from('chats').delete().eq('id', c.id).then(loadChatsFromSupabase); }} style={{ background: "transparent", border: "none", color: "inherit", fontSize: "16px", cursor: "pointer", opacity: 0.5 }}>🗑️</button>
              </div>
            ))
          )}
        </div>
      )}
      
      {/* الرسائل */}
      <div className="messages">
        {messages.map(msg => (
          <div key={msg.id} className={`msg-row ${msg.role === "user" ? "msg-row-user" : "msg-row-ai"}`}>
            {msg.role === "assistant" && <div className="avatar-small">🖤</div>}
            <div className="msg-content-wrapper">
              <div className={`bubble ${msg.role === "user" ? "bubble-user" : isDark ? "bubble-ai" : "bubble-ai-light"}`}>
                <MessageContent content={msg.content} />
              </div>
              {msg.role === "assistant" && (
                <button onClick={() => copyMessage(msg.content, msg.id)} className="copy-msg-btn">
                  {copiedId === msg.id ? "✓" : "📋"}
                </button>
              )}
            </div>
            {msg.role === "user" && <div className="avatar-small avatar-user">👤</div>}
          </div>
        ))}
        {streamingText && (
          <div className="msg-row msg-row-ai">
            <div className="avatar-small">🖤</div>
            <div className={`bubble ${isDark ? "bubble-ai" : "bubble-ai-light"}`}>
              <MessageContent content={streamingText} />
            </div>
          </div>
        )}
        {loading && !streamingText && (
          <div className="msg-row msg-row-ai">
            <div className="avatar-small">🖤</div>
            <div className={`bubble ${isDark ? "bubble-ai" : "bubble-ai-light"}`}>
              <TypingDots />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      
      {/* الملفات المرفقة */}
      {attachedFiles.length > 0 && (
        <div style={{ display: "flex", gap: "8px", padding: "8px 20px", flexWrap: "wrap" }}>
          {attachedFiles.map(f => (
            <div key={f.id} style={{ display: "flex", alignItems: "center", gap: "6px", background: "rgba(108,92,231,0.15)", borderRadius: "10px", padding: "6px 10px", fontSize: "12px" }}>
              <span>{f.icon}</span>
              <span style={{ maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
              <button onClick={() => removeFile(f.id)} style={{ background: "transparent", border: "none", color: "inherit", cursor: "pointer" }}>✕</button>
            </div>
          ))}
        </div>
      )}
      
      {/* منطقة الكتابة */}
      <div className="input-area">
        <button onClick={() => fileInputRef.current?.click()} className="header-btn" style={{ fontSize: "20px", padding: "8px" }}>📎</button>
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} multiple style={{ display: "none" }} accept=".txt,.js,.jsx,.ts,.tsx,.py,.html,.css,.json,.csv,.md,.xml,.yaml,.yml,.pdf,image/*" />
        <textarea 
          ref={inputRef} 
          value={input} 
          onChange={e => setInput(e.target.value)} 
          onKeyDown={handleKeyDown} 
          placeholder={loading ? "بلاك بيكتب..." : attachedFiles.length > 0 ? "اكتب سؤالك عن الملفات..." : "اكتب لبلاك..."} 
          rows={1} 
          className="textarea" 
          disabled={loading && !streamingText} 
        />
        <button 
          onClick={() => sendMessage()} 
          className="send-btn" 
          style={{ 
            opacity: (!input.trim() && attachedFiles.length === 0) || loading ? 0.4 : 1, 
            background: loading ? "#f87171" : "" 
          }}
        >
          {loading ? "⏳" : "↑"}
        </button>
      </div>
    </div>
  );
}
