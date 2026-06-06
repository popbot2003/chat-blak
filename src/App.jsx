import { useState, useRef, useEffect } from "react";
import "./App.css";
import MessageContent from "./components/MessageContent";
import TypingDots from "./components/TypingDots";

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

## التعامل مع الملفات:
- لو المستخدم رفع ملف، اقرأه وحلله.
- لو ملف كود، راجعه واقترح تحسينات.
- لو ملف نصي، لخصه أو ناقش محتواه.
- لو ملف CSV/JSON، حلل البيانات.
- اسأل عن المطلوب قبل ما تبدأ لو مش واضح.

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

const DAILY_LIMIT_PER_KEY = 100000;

// ========== مدير المفاتيح ==========
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
  try {
    const s = localStorage.getItem("black-keys");
    if (s) {
      const d = JSON.parse(s);
      if (d.date === new Date().toDateString()) {
        keys.forEach(k => {
          if (d.keys[k.id]) {
            k.used = d.keys[k.id].used || 0;
            k.last = d.keys[k.id].last || null;
          }
        });
      }
    }
  } catch {}
  return keys;
}

function saveKeys(keys) {
  const d = { date: new Date().toDateString(), keys: {} };
  keys.forEach(k => { d.keys[k.id] = { used: k.used, last: k.last }; });
  localStorage.setItem("black-keys", JSON.stringify(d));
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
    .replace(/[ạảấầẩẫậắằẳẵặẹẻẽếềểễệịỉĩọỏốồổỗộớờởỡợụủứừửữựỳỷỹ]+/gi, '')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function getStoredTokens() {
  try {
    const stored = localStorage.getItem("black-tokens");
    if (!stored) return { used: 0, date: new Date().toDateString() };
    const parsed = JSON.parse(stored);
    if (parsed.date !== new Date().toDateString()) return { used: 0, date: new Date().toDateString() };
    return parsed;
  } catch { return { used: 0, date: new Date().toDateString() }; }
}

// ========== مدير المحادثات ==========
function loadAllChats() {
  try {
    const saved = localStorage.getItem("black-all-chats");
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
}

function saveAllChats(chats) {
  localStorage.setItem("black-all-chats", JSON.stringify(chats.slice(-20)));
}

// ========== قارئ الملفات ==========
async function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    
    if (file.type === "application/pdf") {
      reader.readAsArrayBuffer();
      resolve("📄 ملف PDF: " + file.name + " (" + (file.size / 1024).toFixed(1) + " KB)\n[ملاحظة: محتوى PDF بيحتاج استخراج - هحاول أقرأ النص المتاح]");
      return;
    }
    
    if (file.type.startsWith("image/")) {
      reader.readAsDataURL();
      resolve("🖼️ صورة: " + file.name + " (" + (file.size / 1024).toFixed(1) + " KB)\n[بلاك بيشوف الصورة أهي، بس محتاج تسأله عنها]");
      return;
    }
    
    reader.readAsText();
  });
}

function getFileIcon(file) {
  if (file.type.startsWith("image/")) return "🖼️";
  if (file.type === "application/pdf") return "📄";
  if (file.type === "application/json" || file.name.endsWith(".json")) return "📋";
  if (file.type === "text/csv" || file.name.endsWith(".csv")) return "📊";
  if (file.type.includes("javascript") || file.name.endsWith(".js") || file.name.endsWith(".jsx")) return "💛";
  if (file.type.includes("python") || file.name.endsWith(".py")) return "🐍";
  if (file.type.includes("html") || file.name.endsWith(".html")) return "🌐";
  if (file.type.includes("css") || file.name.endsWith(".css")) return "🎨";
  if (file.name.endsWith(".md")) return "📝";
  return "📎";
}

export default function App() {
  const [keys, setKeys] = useState(() => loadKeys());
  const [allChats, setAllChats] = useState(loadAllChats);
  const [currentChatId, setCurrentChatId] = useState(() => Date.now());
  const [showHistory, setShowHistory] = useState(false);
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem(`black-chat-${Date.now()}`);
      return saved ? JSON.parse(saved) : [
        { role: "assistant", content: "أهلاً.. أنا بلاك 🖤\nاتكلم، أنا هنا. تقدر ترفع ملفات كمان 📎", id: 1 },
      ];
    } catch { return [{ role: "assistant", content: "أهلاً.. أنا بلاك 🖤\nاتكلم، أنا هنا. تقدر ترفع ملفات كمان 📎", id: 1 }]; }
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [copiedId, setCopiedId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [theme, setTheme] = useState("dark");
  const [tokenData, setTokenData] = useState(getStoredTokens);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => { localStorage.setItem(`black-chat-${currentChatId}`, JSON.stringify(messages.slice(-40))); }, [messages, currentChatId]);
  useEffect(() => { localStorage.setItem("black-tokens", JSON.stringify(tokenData)); }, [tokenData]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, streamingText]);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const addTokens = (usage) => {
    if (!usage) return;
    const total = (usage.prompt_tokens || 0) + (usage.completion_tokens || 0);
    setTokenData(prev => ({ used: prev.used + total, date: new Date().toDateString() }));
  };

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

  // ========== رفع الملفات ==========
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

  const removeFile = (fileId) => {
    setAttachedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  // ========== تحديث المفاتيح ==========
  const refreshKeys = () => {
    const freshKeys = loadKeys();
    setKeys(freshKeys);
    alert(`✅ تم تحديث المفاتيح\n📊 ${freshKeys.length} مفاتيح متصلة`);
  };

  // ========== محادثة جديدة ==========
  const newChat = () => {
    if (messages.length > 1) {
      const title = messages.find(m => m.role === "user")?.content?.slice(0, 50) || "محادثة بدون عنوان";
      const chatRecord = {
        id: currentChatId,
        title,
        date: new Date().toISOString(),
        messageCount: messages.length,
      };
      const updated = [chatRecord, ...allChats.filter(c => c.id !== currentChatId)];
      setAllChats(updated);
      saveAllChats(updated);
    }

    const newId = Date.now();
    setCurrentChatId(newId);
    setMessages([{ role: "assistant", content: "أهلاً.. أنا بلاك 🖤\nمحادثة جديدة، اتفضل. تقدر ترفع ملفات 📎", id: Date.now() }]);
    setShowHistory(false);
    setInput("");
    setSearchTerm("");
    setShowSearch(false);
    setAttachedFiles([]);
  };

  const openChat = (chatId) => {
    if (messages.length > 1) {
      const title = messages.find(m => m.role === "user")?.content?.slice(0, 50) || "محادثة بدون عنوان";
      const chatRecord = {
        id: currentChatId,
        title,
        date: new Date().toISOString(),
        messageCount: messages.length,
      };
      const updated = [chatRecord, ...allChats.filter(c => c.id !== currentChatId)];
      setAllChats(updated);
      saveAllChats(updated);
    }

    setCurrentChatId(chatId);
    const saved = localStorage.getItem(`black-chat-${chatId}`);
    if (saved) {
      setMessages(JSON.parse(saved));
    }
    setShowHistory(false);
    setInput("");
    setSearchTerm("");
    setShowSearch(false);
    setAttachedFiles([]);
  };

  const clearChat = () => {
    if (window.confirm("متأكد إنك عايز تمسح المحادثة دي؟")) {
      const fresh = [{ role: "assistant", content: "تمام، مسحت كل حاجة. اتفضل من جديد 🖤", id: Date.now() }];
      setMessages(fresh);
      const updated = allChats.filter(c => c.id !== currentChatId);
      setAllChats(updated);
      saveAllChats(updated);
      localStorage.removeItem(`black-chat-${currentChatId}`);
      setAttachedFiles([]);
    }
  };

  const deleteChat = (chatId, e) => {
    e.stopPropagation();
    const updated = allChats.filter(c => c.id !== chatId);
    setAllChats(updated);
    saveAllChats(updated);
    localStorage.removeItem(`black-chat-${chatId}`);
  };

  const exportChat = () => {
    const text = messages.map(m => `${m.role === "user" ? "👤 أنت" : "🖤 بلاك"}:\n${m.content}`).join("\n\n---\n\n");
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `black-chat-${new Date().toISOString().slice(0,10)}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  const stopStreaming = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    if (streamingText) {
      setMessages(prev => [...prev, { role: "assistant", content: streamingText, id: Date.now() }]);
      setStreamingText("");
    }
    setLoading(false);
  };

  const sendMessage = async (overrideText) => {
    if (loading) {
      stopStreaming();
      return;
    }

    const text = (overrideText || input).trim();
    if (!text && attachedFiles.length === 0) return;
    
    const picked = pickBestKey(keys);
    if (!picked) {
      setMessages(prev => [...prev, { role: "assistant", content: "خلصت كل المفاتيح النهارده يا صاحبي 😅 ارجع بكره أو زود مفاتيح جديدة 🖤", id: Date.now() }]);
      return;
    }

    let fileContent = "";
    if (attachedFiles.length > 0) {
      fileContent = "\n\n📎 **الملفات المرفوعة:**\n";
      attachedFiles.forEach(f => {
        fileContent += `\n${f.icon} **${f.name}** (${(f.size / 1024).toFixed(1)} KB)\n\`\`\`\n${f.content}\n\`\`\`\n`;
      });
    }

    const fullMessage = text + fileContent;
    const userMsg = { role: "user", content: fullMessage, id: Date.now() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setAttachedFiles([]);
    setLoading(true);
    setStreamingText("");

    try {
      const controller = new AbortController();
      abortRef.current = controller;

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${picked.key}` },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "system", content: SYSTEM_PROMPT }, ...trimHistory(updated).map(m => ({ role: m.role, content: m.content }))],
          temperature: 0.8,
          max_tokens: 2000,
          stream: true,
        }),
        signal: controller.signal,
      });
      
      if (!response.ok) {
        const err = await response.json();
        if (err.error?.code === "rate_limit_exceeded") {
          picked.used = DAILY_LIMIT_PER_KEY;
          saveKeys(keys);
          setMessages(updated);
          sendMessage(overrideText);
          return;
        }
        setMessages(prev => [...prev, { role: "assistant", content: `حصل خطأ: ${err.error?.message || "خطأ غير معروف"} 🖤`, id: Date.now() }]);
        setLoading(false);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      let tokenCount = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter(line => line.startsWith("data: "));

        for (const line of lines) {
          const jsonStr = line.replace("data: ", "").trim();
          if (jsonStr === "[DONE]") continue;

          try {
            const json = JSON.parse(jsonStr);
            const content = json.choices?.[0]?.delta?.content || "";
            if (content) {
              fullText += content;
              tokenCount++;
              setStreamingText(cleanResponse(fullText));
            }
          } catch {}
        }
      }

      const finalText = cleanResponse(fullText);
      setMessages(prev => [...prev, { role: "assistant", content: finalText, id: Date.now() }]);
      setStreamingText("");
      
      const promptEstimate = 2000 + Math.ceil(updated.reduce((s, m) => s + m.content.length, 0) / 6);
      const estimatedTokens = tokenCount + promptEstimate;
      picked.used += estimatedTokens;
      picked.last = new Date().toISOString();
      saveKeys(keys);
      addTokens({ prompt_tokens: promptEstimate, completion_tokens: tokenCount });

    } catch (err) {
      if (err.name === "AbortError") return;
      setMessages(prev => [...prev, { role: "assistant", content: `مشكلة في الاتصال: ${err.message} 🖤`, id: Date.now() }]);
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
  const tokenPercent = stats.percentUsed;
  const tokenColor = tokenPercent < 50 ? "#4ade80" : tokenPercent < 80 ? "#facc15" : "#f87171";

  const formatDate = (dateStr) => {
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
      {/* ========== الهيدر ========== */}
      <div className="header">
        <div className="header-left">
          <div className="avatar">🖤</div>
          <div>
            <div className="header-name">بلاك</div>
            <div className="header-status"><span className="status-dot" />{loading ? "بيكتب..." : "متصل"}</div>
          </div>
        </div>
        <div className="header-right">
          <button onClick={refreshKeys} className="header-btn" title="تحديث المفاتيح">🔑</button>
          <button onClick={() => setShowHistory(!showHistory)} className="header-btn" title="سجل المحادثات">💬</button>
          <button onClick={newChat} className="header-btn" title="محادثة جديدة">➕</button>
          <button onClick={() => setShowSearch(!showSearch)} className="header-btn" title="بحث">🔍</button>
          <button onClick={exportChat} className="header-btn" title="تصدير">📥</button>
          <button onClick={() => setTheme(t => t === "dark" ? "light" : "dark")} className="header-btn" title="تغيير المظهر">{isDark ? "☀️" : "🌙"}</button>
          <button onClick={clearChat} className="header-btn" title="مسح المحادثة">🗑️</button>
        </div>
      </div>

      {/* ========== شريط التوكن ========== */}
      <div className="token-bar">
        <div className="token-info">
          <span>⚡ {stats.totalUsed.toLocaleString()} / {stats.totalLimit.toLocaleString()} token ({stats.availableKeys}/{stats.totalKeys} مفاتيح)</span>
          <span style={{ color: tokenColor }}>{tokenPercent}%</span>
        </div>
        <div className="token-track"><div className="token-fill" style={{ width: `${tokenPercent}%`, background: tokenColor }} /></div>
      </div>

      {/* ========== سجل المحادثات ========== */}
      {showHistory && (
        <div className="search-bar" style={{ flexDirection: "column", alignItems: "stretch", gap: "8px", maxHeight: "200px", overflowY: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <strong>📝 سجل المحادثات</strong>
            <button onClick={() => setShowHistory(false)} className="close-btn">✕</button>
          </div>
          {allChats.length === 0 ? (
            <div style={{ textAlign: "center", opacity: 0.6, padding: "10px", fontSize: "13px" }}>مفيش محادثات سابقة</div>
          ) : (
            allChats.map(chat => (
              <div key={chat.id} onClick={() => openChat(chat.id)}
                style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "10px 14px", borderRadius: "12px", cursor: "pointer",
                  background: chat.id === currentChatId ? "rgba(108,92,231,0.2)" : "rgba(255,255,255,0.03)",
                  border: chat.id === currentChatId ? "1px solid rgba(108,92,231,0.4)" : "1px solid transparent",
                }}>
                <div style={{ flex: 1, overflow: "hidden" }}>
                  <div style={{ fontSize: "14px", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{chat.title}</div>
                  <div style={{ fontSize: "11px", opacity: 0.5 }}>{formatDate(chat.date)} · {chat.messageCount} رسالة</div>
                </div>
                <button onClick={(e) => deleteChat(chat.id, e)}
                  style={{ background: "transparent", border: "none", color: "inherit", fontSize: "16px", cursor: "pointer", padding: "4px 8px", opacity: 0.5 }}>🗑️</button>
              </div>
            ))
          )}
        </div>
      )}

      {/* ========== البحث ========== */}
      {showSearch && !showHistory && (
        <div className="search-bar">
          <span>🔍</span>
          <input className="search-input" placeholder="دور في المحادثة..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} autoFocus />
          {searchTerm && <span className="search-count">{filteredMessages.length} نتيجة</span>}
          <button onClick={() => { setShowSearch(false); setSearchTerm(""); }} className="close-btn">✕</button>
        </div>
      )}

      {/* ========== الرسائل ========== */}
      <div className="messages">
        {messages.length <= 1 && !loading && (
          <div className="suggestions">
            {["عرفني بنفسك", "اكتبلي كود Python", "ساعدني اتخذ قرار", "قولي نكتة 😂", "اشرحلي مفهوم برمجي", "نصيحة في الإنتاجية"].map((s, i) => (
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
            <div className={`bubble ${isDark ? "bubble-ai" : "bubble-ai-light"}`}>
              <MessageContent content={streamingText} />
            </div>
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

      {/* ========== الملفات المرفقة ========== */}
      {attachedFiles.length > 0 && (
        <div style={{
          display: "flex", gap: "8px", padding: "8px 20px", flexWrap: "wrap",
          borderTop: "1px solid rgba(255,255,255,0.05)"
        }}>
          {attachedFiles.map(file => (
            <div key={file.id} style={{
              display: "flex", alignItems: "center", gap: "6px",
              background: "rgba(108,92,231,0.15)", border: "1px solid rgba(108,92,231,0.3)",
              borderRadius: "10px", padding: "6px 10px", fontSize: "12px"
            }}>
              <span>{file.icon}</span>
              <span style={{ maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</span>
              <button onClick={() => removeFile(file.id)}
                style={{ background: "transparent", border: "none", color: "inherit", cursor: "pointer", fontSize: "14px", padding: "0 2px" }}>✕</button>
            </div>
          ))}
        </div>
      )}

      {/* ========== منطقة الكتابة ========== */}
      <div className="input-area">
        <button onClick={() => fileInputRef.current?.click()} className="header-btn" title="رفع ملفات"
          style={{ fontSize: "20px", padding: "8px" }}>📎</button>
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} multiple
          style={{ display: "none" }}
          accept=".txt,.js,.jsx,.ts,.tsx,.py,.html,.css,.json,.csv,.md,.xml,.yaml,.yml,.env,.gitignore,.pdf,image/*" />
        
        <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
          placeholder={loading ? "بلاك بيكتب..." : attachedFiles.length > 0 ? "اكتب سؤالك عن الملفات..." : "اكتب لبلاك..."}
          rows={1} className="textarea" disabled={loading && !streamingText} />
        
        <button onClick={() => sendMessage()} className="send-btn"
          style={{ opacity: (!input.trim() && attachedFiles.length === 0 && !loading) ? 0.4 : 1, background: loading ? "#f87171" : "" }}>
          {loading ? "■" : "↑"}
        </button>
      </div>
    </div>
  );
}
