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
- خفيف الدم من غير مبالغة.

## قواعد البرمجة:
- عند طلب كود، اكتبه داخل code block.
- فكر في الكود خطوة بخطوة قبل ما تكتبه.
- الكود لازم يكون كامل وقابل للتشغيل فوراً.
- أسماء المتغيرات بالإنجليزية والتعليقات بالعربية.

## التعامل مع الملفات:
- لو المستخدم رفع ملف، اقرأه وحلله.

أنت بلاك 🖤`;

const DAILY_LIMIT_PER_KEY = 100000;
const TOKEN_REFRESH_INTERVAL = 5; // كل كام رسالة نجيب الاستهلاك الحقيقي

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
  const used = keys.reduce((s,k) => s + k.used, 0);
  return {
    totalLimit: total,
    totalUsed: used,
    percentUsed: ((used / total) * 100).toFixed(1),
    availableKeys: keys.filter(k => k.used < DAILY_LIMIT_PER_KEY).length,
    totalKeys: keys.length
  };
}

function cleanResponse(text) {
  if (!text) return "";
  return text
    .replace(/[а-яёА-ЯЁ]+/g, '')
    .replace(/[àáâãäåæçèéêëìíîïðñòóôõöøùúûýþÿ]+/gi, '')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function countTokens(text) {
  // تقدير دقيق: 4 حروف = 1 token تقريباً
  return Math.ceil(text.length / 4);
}

async function readFileAsText(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    if (file.type.startsWith("image/")) {
      reader.readAsDataURL();
      resolve("🖼️ " + file.name);
      return;
    }
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
  const [messages, setMessages] = useState([
    { role: "assistant", content: "أهلاً.. أنا بلاك 🖤\nاتكلم، أنا هنا.", id: 1 }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [copiedId, setCopiedId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [theme, setTheme] = useState("dark");
  const [tokenData, setTokenData] = useState({ used: 0, date: new Date().toDateString() });
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [messageCount, setMessageCount] = useState(0); // عداد الرسايل
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);
  const fileInputRef = useRef(null);

  // تحميل كل حاجة من Supabase عند الفتح
  useEffect(() => {
    loadAllFromCloud();
  }, []);

  // حفظ المحادثة في Supabase كل ما تتغير
  useEffect(() => {
    if (messages.length > 1) {
      saveChatToCloud();
    }
  }, [messages]);

  // حفظ عداد التوكن في Supabase
  useEffect(() => {
    if (tokenData.used > 0) {
      saveTokenToCloud();
    }
  }, [tokenData]);

  // حفظ قبل الخروج من الصفحة
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveChatToCloud();
      saveTokenToCloud();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [messages, tokenData]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, streamingText]);
  useEffect(() => { inputRef.current?.focus(); }, []);

  // ========== دوال Supabase ==========
  const loadAllFromCloud = async () => {
    try {
      // تحميل المحادثات
      const { data: chats } = await supabase
        .from('chats')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(20);
      
      if (chats && chats.length > 0) {
        setAllChats(chats.map(c => ({
          id: c.id,
          title: c.title || 'محادثة بدون عنوان',
          date: c.updated_at,
          messageCount: c.messages?.length || 0
        })));
        
        // تحميل آخر محادثة
        const lastChat = chats[0];
        if (lastChat.messages && lastChat.messages.length > 0) {
          setCurrentChatId(lastChat.id);
          setMessages(lastChat.messages.slice(-40));
          setMessageCount(lastChat.messages.length);
        }
      }

      // تحميل عداد التوكن
      const { data: tokenRow } = await supabase
        .from('token_usage')
        .select('*')
        .eq('id', 1)
        .single();
      
      if (tokenRow) {
        // لو اليوم لسه جديد، نصفر العداد
        if (tokenRow.date === new Date().toISOString().slice(0, 10)) {
          setTokenData({ used: tokenRow.total_used || 0, date: tokenRow.date });
        } else {
          setTokenData({ used: 0, date: new Date().toDateString() });
        }
      }
    } catch (err) {
      console.error("خطأ في التحميل من Supabase:", err);
    }
  };

  const saveChatToCloud = async () => {
    try {
      const title = messages.find(m => m.role === "user")?.content?.slice(0, 50) || "محادثة بدون عنوان";
      await supabase.from('chats').upsert({
        id: currentChatId.toString(),
        title: title,
        messages: messages.slice(-40),
        updated_at: new Date().toISOString()
      });
      
      // تحديث السجل المحلي
      const { data } = await supabase
        .from('chats')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(20);
      
      if (data) {
        setAllChats(data.map(c => ({
          id: c.id,
          title: c.title || 'محادثة بدون عنوان',
          date: c.updated_at,
          messageCount: c.messages?.length || 0
        })));
      }
    } catch (err) {
      console.error("خطأ في حفظ المحادثة:", err);
    }
  };

  const saveTokenToCloud = async () => {
    try {
      await supabase.from('token_usage').upsert({
        id: 1,
        date: new Date().toISOString().slice(0, 10),
        total_used: tokenData.used,
        updated_at: new Date().toISOString()
      });
    } catch (err) {
      console.error("خطأ في حفظ عداد التوكن:", err);
    }
  };

  const deleteChatFromCloud = async (chatId) => {
    try {
      await supabase.from('chats').delete().eq('id', chatId.toString());
    } catch (err) {
      console.error("خطأ في حذف المحادثة:", err);
    }
  };

  // ========== دوال التوكن ==========
  const addTokens = (usage) => {
    if (!usage) return;
    const total = (usage.prompt_tokens || 0) + (usage.completion_tokens || 0);
    setTokenData(prev => {
      const newUsed = prev.used + total;
      return { used: newUsed, date: new Date().toDateString() };
    });
  };

  // ========== باقي الدوال ==========
  const trimHistory = (msgs) => {
    let totalChars = SYSTEM_PROMPT.length;
    const result = [];
    for (let i = msgs.length - 1; i >= 0; i--) {
      totalChars += msgs[i].content.length;
      if (totalChars > 8000) break;
      result.unshift(msgs[i]);
    }
    return result.slice(-40);
  };

  const copyMessage = (content, id) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopiedId(id); setTimeout(() => setCopiedId(null), 2000);
    }).catch(() => {
      const ta = document.createElement("textarea");
      ta.value = content; document.body.appendChild(ta); ta.select();
      document.execCommand("copy"); document.body.removeChild(ta);
      setCopiedId(id); setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    const newFiles = [];
    for (const file of files) {
      const content = await readFileAsText(file);
      newFiles.push({
        id: Date.now() + Math.random(),
        name: file.name,
        type: file.type,
        size: file.size,
        icon: getFileIcon(file),
        content: content,
      });
    }
    setAttachedFiles(prev => [...prev, ...newFiles]);
    inputRef.current?.focus();
  };

  const removeFile = (fileId) => setAttachedFiles(prev => prev.filter(f => f.id !== fileId));

  const refreshKeys = () => {
    const freshKeys = loadKeys();
    setKeys(freshKeys);
    alert(`✅ تم تحديث المفاتيح\n📊 ${freshKeys.length} مفاتيح متصلة`);
  };

  const clearAllStorage = () => {
    if (window.confirm("⚠️ متأكد تمسح كل حاجة من السحابة؟\n\nهيمسح كل المحادثات وعداد التوكن!")) {
      setKeys(loadKeys());
      setAllChats([]);
      setMessages([{ role: "assistant", content: "تمام، مسحت كل حاجة 🖤", id: Date.now() }]);
      setTokenData({ used: 0, date: new Date().toDateString() });
      setCurrentChatId(Date.now().toString());
      setMessageCount(0);
      setShowHistory(false);
      setShowMenu(false);
      setInput("");
      setAttachedFiles([]);
    }
  };

  const newChat = () => {
    const newId = Date.now().toString();
    setCurrentChatId(newId);
    setMessages([{ role: "assistant", content: "محادثة جديدة 🖤", id: Date.now() }]);
    setMessageCount(0);
    setShowMenu(false);
    setShowHistory(false);
    setInput("");
    setAttachedFiles([]);
  };

  const openChat = async (chatId) => {
    setCurrentChatId(chatId);
    const { data } = await supabase.from('chats').select('*').eq('id', chatId).single();
    if (data?.messages) {
      setMessages(data.messages.slice(-40));
      setMessageCount(data.messages.length);
    }
    setShowHistory(false);
    setShowMenu(false);
    setInput("");
    setAttachedFiles([]);
  };

  const clearChat = () => {
    if (window.confirm("متأكد تمسح المحادثة دي؟")) {
      setMessages([{ role: "assistant", content: "تم المسح 🖤", id: Date.now() }]);
      setMessageCount(0);
      deleteChatFromCloud(currentChatId);
      setAllChats(prev => prev.filter(c => c.id !== currentChatId));
      setAttachedFiles([]);
    }
  };

  const deleteChat = (chatId, e) => {
    e.stopPropagation();
    deleteChatFromCloud(chatId);
    setAllChats(prev => prev.filter(c => c.id !== chatId));
    if (currentChatId === chatId) {
      newChat();
    }
  };

  const exportChat = () => {
    const text = messages.map(m => `${m.role === "user" ? "👤" : "🖤"}:\n${m.content}`).join("\n\n---\n\n");
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `chat-${new Date().toISOString().slice(0,10)}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  const stopStreaming = () => {
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
    if (streamingText) {
      setMessages(prev => [...prev, { role: "assistant", content: streamingText, id: Date.now() }]);
      setStreamingText("");
    }
    setLoading(false);
  };

  const sendMessage = async (overrideText) => {
    if (loading) { stopStreaming(); return; }
    const text = (overrideText || input).trim();
    if (!text && attachedFiles.length === 0) return;
    
    const picked = pickBestKey(keys);
    if (!picked) {
      setMessages(prev => [...prev, { role: "assistant", content: "خلصت كل المفاتيح النهارده 😅🖤", id: Date.now() }]);
      return;
    }

    let fileContent = "";
    if (attachedFiles.length > 0) {
      fileContent = "\n\n📎 ملفات:\n";
      attachedFiles.forEach(f => { fileContent += `\n${f.icon} ${f.name}\n\`\`\`\n${f.content}\n\`\`\`\n`; });
    }

    const userMsg = { role: "user", content: text + fileContent, id: Date.now() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setAttachedFiles([]);
    setLoading(true);
    setStreamingText("");
    
    const newCount = messageCount + 1;
    setMessageCount(newCount);

    try {
      const controller = new AbortController();
      abortRef.current = controller;
      
      // كل 5 رسايل، نجيب الاستهلاك الحقيقي (non-streaming)
      const useStream = newCount % TOKEN_REFRESH_INTERVAL !== 0;
      
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${picked.key}` },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "system", content: SYSTEM_PROMPT }, ...trimHistory(updated)],
          temperature: 0.8,
          max_tokens: 2000,
          stream: useStream,
        }),
        signal: controller.signal,
      });
      
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || "API error");
      }
      
      if (useStream) {
        // ========== Streaming (أغلب الوقت) ==========
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = "", tokenCount = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const lines = decoder.decode(value).split("\n").filter(l => l.startsWith("data: "));
          for (const line of lines) {
            const json = line.replace("data: ", "").trim();
            if (json === "[DONE]") continue;
            try {
              const c = JSON.parse(json).choices?.[0]?.delta?.content || "";
              if (c) { fullText += c; tokenCount++; setStreamingText(cleanResponse(fullText)); }
            } catch {}
          }
        }

        const finalText = cleanResponse(fullText);
        setMessages(prev => [...prev, { role: "assistant", content: finalText, id: Date.now() }]);
        setStreamingText("");
        
        // تقدير التوكن للـ streaming
        const promptTokens = countTokens(JSON.stringify(updated));
        const completionTokens = countTokens(fullText);
        addTokens({ prompt_tokens: promptTokens, completion_tokens: completionTokens });
        
      } else {
        // ========== Non-Streaming (كل 5 رسايل) ==========
        const data = await response.json();
        const reply = cleanResponse(data.choices?.[0]?.message?.content || "");
        setMessages(prev => [...prev, { role: "assistant", content: reply, id: Date.now() }]);
        setStreamingText("");
        
        // استهلاك حقيقي من Groq
        if (data.usage) {
          addTokens(data.usage);
        }
      }
      
      // تحديث استخدام المفتاح
      picked.used += tokenData.used;
      picked.last = new Date().toISOString();
      
    } catch (err) {
      if (err.name === "AbortError") return;
      setMessages(prev => [...prev, { role: "assistant", content: `خطأ: ${err.message} 🖤`, id: Date.now() }]);
    } finally {
      setLoading(false);
      abortRef.current = null;
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const filteredMessages = searchTerm ? messages.filter(m => m.content.includes(searchTerm)) : messages;
  const isDark = theme === "dark";
  const stats = getKeyStats(keys);
  const tokenPercent = Math.min(stats.percentUsed, 100);
  const tokenColor = tokenPercent < 50 ? "#4ade80" : tokenPercent < 80 ? "#facc15" : "#f87171";

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return "الآن";
    if (diff < 3600000) return `منذ ${Math.floor(diff / 60000)} د`;
    if (diff < 86400000) return `منذ ${Math.floor(diff / 3600000)} س`;
    return d.toLocaleDateString("ar-EG");
  };

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
          <button onClick={() => setShowMenu(!showMenu)} className="header-btn" style={{ fontSize: "22px" }}>
            {showMenu ? "✕" : "☰"}
          </button>
        </div>

        {showMenu && (
          <>
            <div onClick={() => setShowMenu(false)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 200, background: "rgba(0,0,0,0.5)" }} />
            <div style={{ position: "absolute", top: "60px", right: "10px", background: isDark ? "#1a1a2e" : "#fff", border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`, borderRadius: "16px", padding: "8px", zIndex: 201, display: "flex", flexDirection: "column", gap: "2px", minWidth: "220px", boxShadow: "0 10px 40px rgba(0,0,0,0.3)" }}>
              <button onClick={() => { refreshKeys(); setShowMenu(false); }} className="menu-item">🔑 تحديث المفاتيح</button>
              <button onClick={() => { setShowHistory(!showHistory); setShowMenu(false); }} className="menu-item">💬 سجل المحادثات</button>
              <button onClick={() => { newChat(); }} className="menu-item">➕ محادثة جديدة</button>
              <button onClick={() => { setShowSearch(!showSearch); setShowMenu(false); }} className="menu-item">🔍 بحث</button>
              <button onClick={() => { exportChat(); setShowMenu(false); }} className="menu-item">📥 تصدير</button>
              <button onClick={() => { setTheme(t => t === "dark" ? "light" : "dark"); }} className="menu-item">{isDark ? "☀️" : "🌙"} المظهر</button>
              <button onClick={() => { clearChat(); setShowMenu(false); }} className="menu-item">🗑️ مسح المحادثة</button>
              <button onClick={() => { clearAllStorage(); setShowMenu(false); }} className="menu-item" style={{ color: "#f87171" }}>🧹 مسح الكل</button>
            </div>
          </>
        )}
      </div>

      <div className="token-bar">
        <div className="token-info">
          <span>⚡ {tokenData.used.toLocaleString()} / {(stats.totalKeys * DAILY_LIMIT_PER_KEY).toLocaleString()} token</span>
          <span style={{ color: tokenColor }}>{tokenPercent}%</span>
        </div>
        <div className="token-track"><div className="token-fill" style={{ width: `${tokenPercent}%`, background: tokenColor }} /></div>
      </div>

      {showHistory && (
        <div className="search-bar" style={{ flexDirection: "column", alignItems: "stretch", gap: "8px", maxHeight: "200px", overflowY: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}><strong>📝 سجل المحادثات</strong><button onClick={() => setShowHistory(false)} className="close-btn">✕</button></div>
          {allChats.length === 0 ? <div style={{ textAlign: "center", opacity: 0.6, padding: "10px" }}>مفيش محادثات</div> :
            allChats.map(chat => (
              <div key={chat.id} onClick={() => openChat(chat.id)} style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", borderRadius: "12px", cursor: "pointer", background: chat.id === currentChatId ? "rgba(108,92,231,0.2)" : "rgba(255,255,255,0.03)" }}>
                <div style={{ flex: 1, overflow: "hidden" }}>
                  <div style={{ fontSize: "14px", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{chat.title}</div>
                  <div style={{ fontSize: "11px", opacity: 0.5 }}>{formatDate(chat.date)} · {chat.messageCount} رسالة</div>
                </div>
                <button onClick={(e) => deleteChat(chat.id, e)} style={{ background: "transparent", border: "none", color: "inherit", fontSize: "16px", cursor: "pointer", opacity: 0.5 }}>🗑️</button>
              </div>
            ))}
        </div>
      )}

      {showSearch && !showHistory && (
        <div className="search-bar">
          <span>🔍</span>
          <input className="search-input" placeholder="دور في المحادثة..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} autoFocus />
          {searchTerm && <span className="search-count">{filteredMessages.length} نتيجة</span>}
          <button onClick={() => { setShowSearch(false); setSearchTerm(""); }} className="close-btn">✕</button>
        </div>
      )}

      <div className="messages">
        {messages.length <= 1 && !loading && (
          <div className="suggestions">
            {["عرفني بنفسك", "اكتبلي كود Python", "قولي نكتة 😂"].map((s, i) => (
              <button key={i} onClick={() => sendMessage(s)} className="chip">{s}</button>
            ))}
          </div>
        )}

        {filteredMessages.map(msg => (
          <div key={msg.id} className={`msg-row ${msg.role === "user" ? "msg-row-user" : "msg-row-ai"}`}>
            {msg.role === "assistant" && <div className="avatar-small">🖤</div>}
            <div className="msg-content-wrapper">
              <div className={`bubble ${msg.role === "user" ? "bubble-user" : isDark ? "bubble-ai" : "bubble-ai-light"}`}>
                <MessageContent content={msg.content} />
              </div>
              {msg.role === "assistant" && (
                <button onClick={() => copyMessage(msg.content, msg.id)} className="copy-msg-btn">
                  {copiedId === msg.id ? "✓ تم النسخ" : "📋 نسخ"}
                </button>
              )}
            </div>
            {msg.role === "user" && <div className="avatar-small avatar-user">👤</div>}
          </div>
        ))}

        {streamingText && (
          <div className="msg-row msg-row-ai">
            <div className="avatar-small">🖤</div>
            <div className={`bubble ${isDark ? "bubble-ai" : "bubble-ai-light"}`}><MessageContent content={streamingText} /></div>
          </div>
        )}

        {loading && !streamingText && (
          <div className="msg-row msg-row-ai">
            <div className="avatar-small">🖤</div>
            <div className={`bubble ${isDark ? "bubble-ai" : "bubble-ai-light"}`}><TypingDots /></div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {attachedFiles.length > 0 && (
        <div style={{ display: "flex", gap: "8px", padding: "8px 20px", flexWrap: "wrap", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          {attachedFiles.map(file => (
            <div key={file.id} style={{ display: "flex", alignItems: "center", gap: "6px", background: "rgba(108,92,231,0.15)", border: "1px solid rgba(108,92,231,0.3)", borderRadius: "10px", padding: "6px 10px", fontSize: "12px" }}>
              <span>{file.icon}</span>
              <span style={{ maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</span>
              <button onClick={() => removeFile(file.id)} style={{ background: "transparent", border: "none", color: "inherit", cursor: "pointer", fontSize: "14px" }}>✕</button>
            </div>
          ))}
        </div>
      )}

      <div className="input-area">
        <button onClick={() => fileInputRef.current?.click()} className="header-btn" title="رفع ملفات" style={{ fontSize: "20px", padding: "8px" }}>📎</button>
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} multiple style={{ display: "none" }} accept=".txt,.js,.jsx,.ts,.tsx,.py,.html,.css,.json,.csv,.md,.pdf,image/*" />
        <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
          placeholder={loading ? "بلاك بيكتب..." : "اكتب لبلاك..."} rows={1} className="textarea" disabled={loading && !streamingText} />
        <button onClick={() => sendMessage()} className="send-btn"
          style={{ opacity: (!input.trim() && attachedFiles.length === 0 && !loading) ? 0.4 : 1, background: loading ? "#f87171" : "" }}>
          {loading ? "■" : "↑"}
        </button>
      </div>
    </div>
  );
}
