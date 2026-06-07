import { useState, useRef, useEffect } from "react";
import "../App.css";
import MessageContent from "../components/MessageContent";
import TypingDots from "../components/TypingDots";
import { supabase } from '../lib/supabase';

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
- التعليقات داخل الكود بالعربية الفصحى فقط.
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

## التعامل مع الملفات:
- لو المستخدم رفع ملف، اقرأه وحلله.
- لو ملف كود، راجعه واقترح تحسينات.
- لو ملف نصي، لخصه أو ناقش محتواه.
- لو ملف CSV/JSON، حلل البيانات.
- اسأل عن المطلوب قبل ما تبدأ لو مش واضح.

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

const DAILY_LIMIT_PER_KEY = 100000;

function cleanResponse(text) {
  if (!text) return "";
  return text.replace(/[а-яёА-ЯЁ]+/g, '').replace(/[àáâãäåæçèéêëìíîïðñòóôõöøùúûýþÿ]+/gi, '').replace(/[ \t]+/g, ' ').trim();
}

async function readFileAsText(file) {
  return new Promise(function(resolve) {
    const reader = new FileReader();
    reader.onload = function() { resolve(reader.result); };
    reader.onerror = function() { resolve("خطأ في قراءة الملف: " + file.name); };
    if (file.type === "application/pdf") { reader.readAsArrayBuffer(); resolve("📄 ملف PDF: " + file.name); return; }
    if (file.type.startsWith("image/")) { reader.readAsDataURL(); resolve("🖼️ صورة: " + file.name); return; }
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

function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const difference = now - date;
  if (difference < 60000) return "الآن";
  if (difference < 3600000) return "منذ " + Math.floor(difference / 60000) + " د";
  if (difference < 86400000) return "منذ " + Math.floor(difference / 3600000) + " س";
  return date.toLocaleDateString("ar-EG");
}

export default function Chat({ user, onLogout }) {
  const [keys, setKeys] = useState([]);
  const [allChats, setAllChats] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(function() { return Date.now().toString(); });
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
  const [tokenData, setTokenData] = useState({ used: 0 });
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const keysRef = useRef(keys);
  const retryCountRef = useRef(0);
  const typingTimerRef = useRef(null);

  useEffect(function() { keysRef.current = keys; }, [keys]);
  
  useEffect(function() {
    loadUserKeys();
    loadChatsFromSupabase();
    const newId = Date.now().toString();
    setCurrentChatId(newId);
    setIsLoaded(true);
    inputRef.current?.focus();
  }, []);

  useEffect(function() {
    if (!isLoaded) return;
    const channel = supabase
      .channel('chat-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chats', filter: 'user_id=eq.' + user.id }, function() {
        loadChatsFromSupabase();
      })
      .subscribe();
    return function() { supabase.removeChannel(channel); };
  }, [isLoaded]);

  useEffect(function() {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  async function loadUserKeys() {
    const { data } = await supabase.from('user_keys').select('*').eq('user_id', user.id).eq('is_active', true);
    const savedKeys = [];
    if (data) {
      data.forEach(function(key) {
        savedKeys.push({ id: 'uk-' + key.id, key: key.key_value, used: key.used_today || 0, dailyLimit: key.daily_limit || DAILY_LIMIT_PER_KEY });
      });
    }
    if (savedKeys.length === 0) {
      for (let i = 1; i <= 10; i++) {
        const k = import.meta.env[`VITE_GROQ_KEY_${i}`];
        if (k) savedKeys.push({ id: 'env-' + i, key: k, used: 0, dailyLimit: DAILY_LIMIT_PER_KEY });
      }
    }
    setKeys(savedKeys);
  }

  function pickBestKey() {
    const available = keysRef.current.filter(function(k) { return k.used < k.dailyLimit; });
    if (available.length === 0) return null;
    return available[Math.floor(Math.random() * available.length)];
  }

  async function loadChatsFromSupabase() {
    const { data: chats } = await supabase.from('chats').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(20);
    if (chats && chats.length > 0) {
      setAllChats(chats.map(function(c) { return { id: c.id, title: c.title || "محادثة", date: c.updated_at, messageCount: c.messages?.length || 0 }; }));
    }
  }

  async function saveChatToSupabase() {
    if (messages.length <= 1) return;
    const firstUserMessage = messages.find(function(m) { return m.role === "user"; });
    const title = firstUserMessage ? firstUserMessage.content.slice(0, 50) : "محادثة بدون عنوان";
    await supabase.from('chats').upsert({ id: currentChatId.toString(), user_id: user.id, user_email: user.email, title: title, messages: messages.slice(-40), updated_at: new Date().toISOString() });
  }

  async function newChat() {
    if (messages.length > 1) await saveChatToSupabase();
    const newId = Date.now().toString();
    setCurrentChatId(newId);
    setMessages([{ role: "assistant", content: "محادثة جديدة 🖤\nاتفضل، أنا معاك.", id: Date.now() }]);
    setShowMenu(false); setShowHistory(false); setInput(""); setAttachedFiles([]);
  }

  async function openChat(chatId) {
    if (messages.length > 1) await saveChatToSupabase();
    const { data } = await supabase.from('chats').select('*').eq('id', chatId).single();
    if (data && data.messages) { setCurrentChatId(chatId); setMessages(data.messages.slice(-40)); }
    setShowHistory(false); setShowMenu(false); setInput(""); setAttachedFiles([]);
  }

  function copyMessage(content, id) {
    navigator.clipboard.writeText(content).then(function() { setCopiedId(id); setTimeout(function() { setCopiedId(null); }, 2000); }).catch(function() {
      const ta = document.createElement("textarea"); ta.value = content; document.body.appendChild(ta); ta.select();
      document.execCommand("copy"); document.body.removeChild(ta); setCopiedId(id); setTimeout(function() { setCopiedId(null); }, 2000);
    });
  }

  async function handleFileUpload(e) {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    const newFiles = [];
    for (const file of files) { const content = await readFileAsText(file); newFiles.push({ id: Date.now() + Math.random(), name: file.name, type: file.type, size: file.size, icon: getFileIcon(file), content }); }
    setAttachedFiles(function(prev) { return [...prev, ...newFiles]; });
    inputRef.current?.focus();
  }

  function removeFile(fileId) { setAttachedFiles(function(prev) { return prev.filter(function(f) { return f.id !== fileId; }); }); }

  async function sendMessage(overrideText, isRetry) {
    if (loading && !isRetry) return;
    const messageText = (overrideText || input).trim();
    let fileContent = "";
    if (attachedFiles.length > 0) { fileContent = "\n\n📎 **الملفات المرفوعة:**\n"; attachedFiles.forEach(function(f) { fileContent += "\n" + f.icon + " **" + f.name + "**\n```\n" + f.content + "\n```\n"; }); }
    const fullMessage = messageText + fileContent;
    if (!fullMessage && !isRetry) return;

    const selectedKey = pickBestKey();
    if (!selectedKey) { setMessages(function(p) { return [...p, { role: "assistant", content: "🚫 خلصت كل المفاتيح النهارده يا صاحبي 😅🖤", id: Date.now() }]; }); return; }

    const userMsg = { role: "user", content: fullMessage, id: Date.now() };
    const updated = isRetry ? messages : [...messages, userMsg];
    if (!isRetry) { setMessages(updated); setInput(""); setAttachedFiles([]); }
    setLoading(true);
    setStreamingText("");

    try {
      const cleanMessages = updated.map(function(m) { return { role: m.role, content: m.content }; });
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + selectedKey.key },
        body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages: [{ role: "system", content: SYSTEM_PROMPT }, ...cleanMessages.slice(-40)], temperature: 0.8, max_tokens: 2000, stream: false }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error?.code === "rate_limit_exceeded") {
          const uk = keysRef.current.map(function(k) { return k.id === selectedKey.id ? { ...k, used: k.dailyLimit } : k; });
          setKeys(uk);
          if (retryCountRef.current < 3) { retryCountRef.current++; setTimeout(function() { sendMessage(messageText, true); }, 500); return; }
          retryCountRef.current = 0;
          setMessages(function(p) { return [...p, { role: "assistant", content: "كل المفاتيح وصلت للحد الأقصى 😅🖤", id: Date.now() }]; });
          setLoading(false); return;
        }
        throw new Error(data.error?.message || "خطأ");
      }

      retryCountRef.current = 0;
      const realTokens = data.usage.total_tokens;
      const fullReply = cleanResponse(data.choices?.[0]?.message?.content || "");

      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      let currentIndex = 0;
      function typeNextChar() {
        if (currentIndex <= fullReply.length) {
          setStreamingText(fullReply.slice(0, currentIndex));
          currentIndex++;
          typingTimerRef.current = setTimeout(typeNextChar, 15);
        } else {
          setStreamingText("");
          setMessages(function(p) { return [...p, { role: "assistant", content: fullReply, id: Date.now() }]; });
          setLoading(false);
          setTimeout(function() { inputRef.current?.focus(); }, 100);
        }
      }
      typeNextChar();

      const uk = keysRef.current.map(function(k) { return k.id === selectedKey.id ? { ...k, used: k.used + realTokens } : k; });
      setKeys(uk);
      await supabase.from('user_usage').insert({ user_id: user.id, tokens_used: realTokens, date: new Date().toISOString().slice(0, 10) });

    } catch (err) {
      setMessages(function(p) { return [...p, { role: "assistant", content: "مشكلة في الاتصال: " + err.message + " 🖤", id: Date.now() }]; });
    } finally {
      if (!isRetry) setLoading(false);
    }
  }

  function handleKeyDown(e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }

  const totalLimit = keys.reduce(function(s, k) { return s + k.dailyLimit; }, 0);
  const totalUsed = keys.reduce(function(s, k) { return s + k.used; }, 0);
  const tokenPercent = totalLimit > 0 ? ((totalUsed / totalLimit) * 100).toFixed(1) : "0.0";
  const availableKeysCount = keys.filter(function(k) { return k.used < k.dailyLimit; }).length;
  const tokenColor = tokenPercent < 50 ? "#4ade80" : tokenPercent < 80 ? "#facc15" : "#f87171";
  const isDark = theme === "dark";

  if (!isLoaded) return <div style={{ height: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f0f1a", color: "#e0e0e0", fontFamily: "system-ui, sans-serif" }}><div style={{ textAlign: "center" }}><div style={{ fontSize: "40px" }}>🖤</div><div style={{ fontSize: "18px", marginTop: "10px" }}>جاري التحميل...</div></div></div>;

  return (
    <div className={`container ${isDark ? "dark" : "light"}`}>
      <div className="header">
        <div className="header-left">
          <div className="avatar">🖤</div>
          <div>
            <div className="header-name">بلاك</div>
            <div className="header-status"><span className="status-dot" />{loading ? "بيكتب..." : "متصل"}</div>
          </div>
        </div>
        <div className="header-right">
          <button onClick={newChat} className="header-btn" title="محادثة جديدة" style={{ fontSize: "20px" }}>➕</button>
          <button onClick={function() { setShowMenu(!showMenu); }} className="header-btn" title="القائمة" style={{ fontSize: "22px" }}>{showMenu ? "✕" : "☰"}</button>
        </div>
        {showMenu && (
          <>
            <div onClick={function() { setShowMenu(false); }} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 200, background: "rgba(0,0,0,0.5)" }} />
            <div style={{ position: "absolute", top: "60px", right: "10px", background: isDark ? "#1a1a2e" : "#fff", border: "1px solid " + (isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"), borderRadius: "16px", padding: "8px", zIndex: 201, display: "flex", flexDirection: "column", gap: "2px", minWidth: "220px", boxShadow: "0 10px 40px rgba(0,0,0,0.3)" }}>
              <button onClick={function() { setShowHistory(!showHistory); setShowMenu(false); }} className="menu-item">💬 سجل المحادثات</button>
              <button onClick={function() { setTheme(function(t) { return t === "dark" ? "light" : "dark"; }); setShowMenu(false); }} className="menu-item">{isDark ? "☀️ الوضع النهاري" : "🌙 الوضع الليلي"}</button>
              <button onClick={function() { onLogout(); }} className="menu-item" style={{ color: "#f87171" }}>🚪 تسجيل خروج</button>
            </div>
          </>
        )}
      </div>

      <div className="token-bar">
        <div className="token-info">
          <span>⚡ {totalUsed.toLocaleString()} / {totalLimit.toLocaleString()} token ({availableKeysCount}/{keys.length} مفاتيح)</span>
          <span style={{ color: tokenColor }}>{tokenPercent}%</span>
        </div>
        <div className="token-track"><div className="token-fill" style={{ width: tokenPercent + "%", background: tokenColor }} /></div>
      </div>

      {showHistory && (
        <div className="search-bar" style={{ flexDirection: "column", alignItems: "stretch", gap: "8px", maxHeight: "250px", overflowY: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <strong>📝 سجل المحادثات</strong>
            <button onClick={function() { setShowHistory(false); }} className="close-btn">✕</button>
          </div>
          {allChats.length === 0 ? <div style={{ textAlign: "center", opacity: 0.6, padding: "10px", fontSize: "13px" }}>مفيش محادثات سابقة</div> : allChats.map(function(chat) {
            return (
              <div key={chat.id} onClick={function() { openChat(chat.id); }} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: "12px", cursor: "pointer", background: chat.id === currentChatId ? "rgba(108,92,231,0.2)" : "rgba(255,255,255,0.03)", border: chat.id === currentChatId ? "1px solid rgba(108,92,231,0.4)" : "1px solid transparent" }}>
                <div style={{ flex: 1, overflow: "hidden" }}>
                  <div style={{ fontSize: "14px", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{chat.title}</div>
                  <div style={{ fontSize: "11px", opacity: 0.5 }}>{formatDate(chat.date)} · {chat.messageCount} رسالة</div>
                </div>
                <button onClick={function(e) { e.stopPropagation(); supabase.from('chats').delete().eq('id', chat.id).then(loadChatsFromSupabase); }} style={{ background: "transparent", border: "none", color: "inherit", fontSize: "16px", cursor: "pointer", padding: "4px 8px", opacity: 0.5 }}>🗑️</button>
              </div>
            );
          })}
        </div>
      )}

      <div className="messages">
        {messages.map(function(msg) {
          return (
            <div key={msg.id} className={`msg-row ${msg.role === "user" ? "msg-row-user" : "msg-row-ai"}`}>
              {msg.role === "assistant" && <div className="avatar-small">🖤</div>}
              <div className="msg-content-wrapper">
                <div className={`bubble ${msg.role === "user" ? "bubble-user" : isDark ? "bubble-ai" : "bubble-ai-light"}`}>
                  <MessageContent content={msg.content} />
                </div>
                {msg.role === "assistant" && <button onClick={function() { copyMessage(msg.content, msg.id); }} className="copy-msg-btn">{copiedId === msg.id ? "✓ تم النسخ" : "📋 نسخ"}</button>}
              </div>
              {msg.role === "user" && <div className="avatar-small avatar-user">👤</div>}
            </div>
          );
        })}
        {streamingText && (
          <div className="msg-row msg-row-ai">
            <div className="avatar-small">🖤</div>
            <div className={`bubble ${isDark ? "bubble-ai" : "bubble-ai-light"}`}><MessageContent content={streamingText} /></div>
          </div>
        )}
        {loading && !streamingText && (
          <div className="msg-row msg-row-ai"><div className="avatar-small">🖤</div><div className={`bubble ${isDark ? "bubble-ai" : "bubble-ai-light"}`}><TypingDots /></div></div>
        )}
        <div ref={bottomRef} />
      </div>

      {attachedFiles.length > 0 && (
        <div style={{ display: "flex", gap: "8px", padding: "8px 20px", flexWrap: "wrap", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          {attachedFiles.map(function(file) {
            return (
              <div key={file.id} style={{ display: "flex", alignItems: "center", gap: "6px", background: "rgba(108,92,231,0.15)", border: "1px solid rgba(108,92,231,0.3)", borderRadius: "10px", padding: "6px 10px", fontSize: "12px" }}>
                <span>{file.icon}</span>
                <span style={{ maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</span>
                <button onClick={function() { removeFile(file.id); }} style={{ background: "transparent", border: "none", color: "inherit", cursor: "pointer", fontSize: "14px" }}>✕</button>
              </div>
            );
          })}
        </div>
      )}

      <div className="input-area">
        <button onClick={function() { fileInputRef.current?.click(); }} className="header-btn" title="رفع ملفات" style={{ fontSize: "20px", padding: "8px" }}>📎</button>
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} multiple style={{ display: "none" }} accept=".txt,.js,.jsx,.ts,.tsx,.py,.html,.css,.json,.csv,.md,.xml,.pdf,image/*" />
        <textarea ref={inputRef} value={input} onChange={function(e) { setInput(e.target.value); }} onKeyDown={handleKeyDown} placeholder={loading ? "بلاك بيكتب..." : attachedFiles.length > 0 ? "اكتب سؤالك عن الملفات..." : "اكتب لبلاك..."} rows={1} className="textarea" disabled={loading && !streamingText} />
        <button onClick={function() { sendMessage(); }} className="send-btn" style={{ opacity: (!input.trim() && attachedFiles.length === 0) || loading ? 0.4 : 1, background: loading ? "#f87171" : "" }}>{loading ? "⏳" : "↑"}</button>
      </div>
    </div>
  );
}
