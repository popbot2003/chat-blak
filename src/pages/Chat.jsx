import { useState, useRef, useEffect } from "react";
import "../App.css";
import MessageContent from "../components/MessageContent";
import TypingDots from "../components/TypingDots";
import { supabase } from '../lib/supabase';
import { SYSTEM_PROMPT, DEFAULT_SETTINGS } from '../config/constants';
import { tracker } from '../utils/accurateUsageTracker';
import { keyRotation } from '../utils/keyRotation';
import { getTotalUserConsumption, calculatePercentage } from '../utils/usageCalculator';

/**
 * 🔍 البحث عبر DuckDuckGo
 */
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

/**
 * 🧹 تنظيف النصوص
 */
function cleanResponse(text) { 
  if (!text) return ""; 
  return text.replace(/[ \t]+/g, ' ').trim(); 
}

/**
 * 📎 قراءة الملفات
 */
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

/**
 * 🎨 أيقونات الملفات
 */
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

/**
 * 📅 تنسيق التاريخ
 */
function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  if (diff < 60000) return "الآن";
  if (diff < 3600000) return "منذ " + Math.floor(diff / 60000) + " د";
  return date.toLocaleDateString("ar-EG");
}

/**
 * 🖤 مكون الدردشة الرئيسي
 */
export default function Chat({ user, onLogout }) {
  const [keys, setKeys] = useState([]);
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
  const [userConsumption, setUserConsumption] = useState(null);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState("");

  // Refs
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const keysRef = useRef(keys);
  const typingTimerRef = useRef(null);
  const messagesRef = useRef(messages);
  const currentChatIdRef = useRef(currentChatId);
  const userRef = useRef(user);

  useEffect(function() { keysRef.current = keys; }, [keys]);
  useEffect(function() { messagesRef.current = messages; }, [messages]);
  useEffect(function() { currentChatIdRef.current = currentChatId; }, [currentChatId]);
  useEffect(function() { userRef.current = user; }, [user]);

  // التحميل الأولي
  useEffect(function() { 
    loadAllData(); 
    inputRef.current?.focus(); 
    
    // مزامنة البيانات المعلقة
    tracker.syncPendingUsage();
  }, []);

  // التمرير التلقائي
  useEffect(function() { 
    bottomRef.current?.scrollIntoView({ behavior: "smooth" }); 
  }, [messages, streamingText]);

  // الحفظ التلقائي
  useEffect(function() { 
    if (!isLoaded || messages.length <= 1) return; 
    const t = setTimeout(function() { saveChatToSupabase(); }, 3000); 
    return function() { clearTimeout(t); }; 
  }, [messages, isLoaded]);

  // حفظ عند الإغلاق
  useEffect(function() { 
    function h() { saveChatToSupabase(); } 
    window.addEventListener("beforeunload", h); 
    return function() { window.removeEventListener("beforeunload", h); }; 
  }, [isLoaded]);

  /**
   * 📥 تحميل جميع البيانات
   */
  async function loadAllData() {
    await loadUserKeys();
    await loadChatsFromSupabase();
    await updateUserConsumption();
    setIsLoaded(true);
  }

  /**
   * 🔑 تحميل مفاتيح المستخدم
   */
  async function loadUserKeys() {
    try {
      const { data } = await supabase
        .from('user_keys')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);

      const sk = [];
      if (data && data.length > 0) {
        data.forEach(function(k) {
          sk.push({
            id: 'uk-' + k.id,
            key: k.key_value,
            used: k.used_today || 0,
            dailyLimit: k.daily_limit || 10000,
            is_active: k.is_active,
            key_name: k.key_name
          });
        });
      }
      setKeys(sk);

      // تحديث الاستهلاك
      await updateUserConsumption();
    } catch (err) {
      console.error('❌ خطأ في تحميل المفاتيح:', err.message);
    }
  }

  /**
   * 📊 تحديث بيانات الاستهلاك
   */
  async function updateUserConsumption() {
    try {
      const { data: userData } = await supabase
        .from('profiles')
        .select('daily_limit')
        .eq('id', user.id)
        .single();

      const dailyLimit = userData?.daily_limit || 10000;
      const consumption = getTotalUserConsumption({ ...user, daily_limit: dailyLimit }, keysRef.current);
      
      setUserConsumption(consumption);

      // التحقق من التحذيرات
      if (consumption.percentage >= 90) {
        showConsumptionWarning(consumption.percentage);
      }
    } catch (err) {
      console.error('❌ خطأ في تحديث الاستهلاك:', err.message);
    }
  }

  /**
   * ⚠️ عرض تحذير الاستهلاك
   */
  function showConsumptionWarning(percentage) {
    if (percentage >= 100) {
      setWarningMessage('🔴 لقد وصلت إلى حد الاستهلاك اليومي');
    } else if (percentage >= 90) {
      setWarningMessage(`⚠️ أنت بصدد الانتهاء من حدك اليومي (${percentage.toFixed(1)}%)`);
    }
    setShowWarning(true);
  }

  /**
   * 🎲 اختيار أفضل مفتاح
   */
  function pickBestKey() {
    const bestKey = keyRotation.selectBestKey(keysRef.current);
    
    if (!bestKey) {
      return null;
    }

    return bestKey;
  }

  /**
   * 🚀 تنفيذ الطلب
   */
  async function executeRequest(text, isRetry) {
    const key = pickBestKey();
    
    if (!key) {
      setMessages(function(p) {
        return [...p, { 
          role: "assistant", 
          content: "🚫 جميع المفاتيح ممتلئة أو معطلة 😅🖤\n📞 تواصل مع المسؤول لحل المشكلة", 
          id: Date.now() 
        }];
      });
      setLoading(false);
      return;
    }

    const um = { role: "user", content: text, id: Date.now() };
    const upd = isRetry ? messagesRef.current : [...messagesRef.current, um];
    
    if (!isRetry) {
      setMessages(upd);
      setInput("");
      setAttachedFiles([]);
    }

    setLoading(true);
    setStreamingText("");

    try {
      let et = text;
      
      // البحث عن المعلومات
      const sr = await searchDuckDuckGo(text);
      if (sr) {
        et = text + "\n\n[نتائج البحث]:\n" + sr + "\n\nاستخدم النتائج في إجابتك.";
      }

      const cl = upd.map(function(m) { 
        return { role: m.role, content: m.content }; 
      });

      // الطلب إلى Groq API
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + key.key
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...cl.slice(-39),
            { role: "user", content: et }
          ],
          temperature: 0.3,
          max_tokens: 2000
        })
      });

      const data = await res.json();

      if (!res.ok) {
        // معالجة أخطاء Rate Limit
        if (data.error?.code === "rate_limit_exceeded") {
          console.log('⚠️ تم الوصول إلى حد المفتاح - اختيار مفتاح آخر');
          
          // تحديث الحد للمفتاح الحالي
          const uk = keysRef.current.map(function(k) {
            return k.id === key.id ? { ...k, used: k.dailyLimit } : k;
          });
          setKeys(uk);
          
          // تسجيل الاستهلاك
          await tracker.recordUsage(user.id, key.id.replace('uk-', ''), k.dailyLimit);

          // إعادة محاولة مع مفتاح آخر
          if (!isRetry) {
            setTimeout(function() { executeRequest(text, true); }, 1000);
            return;
          }

          setMessages(function(p) {
            return [...p, {
              role: "assistant",
              content: "😅 جميع المفاتيح وصلت حدها\n📞 تواصل مع المسؤول",
              id: Date.now()
            }];
          });
          setLoading(false);
          return;
        }

        throw new Error(data.error?.message || "خطأ في الطلب");
      }

      const reply = cleanResponse(data.choices?.[0]?.message?.content || "");
      const tokens = data.usage?.total_tokens || 500;

      // تسجيل دقيق للاستهلاك
      const keyId = key.id.replace('uk-', '');
      await tracker.recordUsage(user.id, keyId, tokens);

      // تحديث الـ state
      const nu = key.used + tokens;
      const uk = keysRef.current.map(function(k) {
        return k.id === key.id ? { ...k, used: nu } : k;
      });
      setKeys(uk);

      // تحديث الاستهلاك
      await updateUserConsumption();

      // تأثير الكتابة
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      
      let i = 0;
      function type() {
        if (i <= reply.length) {
          setStreamingText(reply.slice(0, i));
          i++;
          typingTimerRef.current = setTimeout(type, 15);
        } else {
          setStreamingText("");
          setMessages(function(p) {
            return [...p, { role: "assistant", content: reply, id: Date.now() }];
          });
          setLoading(false);
        }
      }
      type();

    } catch (err) {
      console.error('❌ خطأ:', err.message);
      setMessages(function(p) {
        return [...p, {
          role: "assistant",
          content: "❌ عذراً، حدث خطأ: " + err.message,
          id: Date.now()
        }];
      });
      setLoading(false);
    }
  }

  /**
   * 💬 إرسال الرسالة
   */
  async function sendMessage(ot, isRetry) {
    if (loading && !isRetry) return;
    const text = (ot || input).trim();
    if (!text && attachedFiles.length === 0 && !isRetry) return;

    let ft = text;
    if (attachedFiles.length > 0) {
      ft = (text || "الملفات المرفقة:") + attachedFiles.map(function(f) {
        return "\n\n📎 " + f.name + "\n```\n" + f.content + "\n```";
      }).join("");
    }

    executeRequest(ft, isRetry);
  }

  /**
   * 📥 تحميل المحادثات من Supabase
   */
  async function loadChatsFromSupabase() {
    try {
      const { data: chats } = await supabase
        .from('chats')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(20);

      if (chats && chats.length > 0) {
        setAllChats(chats.map(function(c) {
          return {
            id: c.id,
            title: c.title || "محادثة",
            date: c.updated_at,
            messageCount: c.messages?.length || 0
          };
        }));
      }
    } catch (err) {
      console.error('❌ خطأ في تحميل المحادثات:', err.message);
    }
  }

  /**
   * 💾 حفظ المحادثة
   */
  async function saveChatToSupabase() {
    const cm = messagesRef.current;
    if (!cm || cm.length <= 1) return;

    const title = cm.find(function(m) { return m.role === "user"; })?.content?.slice(0, 50) || "محادثة";

    try {
      await supabase.from('chats').upsert({
        id: currentChatIdRef.current,
        user_id: user.id,
        title: title,
        messages: cm.slice(-40),
        updated_at: new Date().toISOString()
      });
    } catch (err) {
      console.error('❌ خطأ في الحفظ:', err.message);
    }
  }

  /**
   * ➕ محادثة جديدة
   */
  async function newChat() {
    await saveChatToSupabase();
    const id = Date.now().toString();
    currentChatIdRef.current = id;
    setCurrentChatId(id);
    setMessages([{
      role: "assistant",
      content: "محادثة جديدة ✨\nأهلاً بك مجدداً 🖤",
      id: Date.now()
    }]);
    setShowHistory(false);
  }

  /**
   * 📂 فتح محادثة قديمة
   */
  async function openChat(chatId) {
    await saveChatToSupabase();
    const { data } = await supabase
      .from('chats')
      .select('*')
      .eq('id', chatId)
      .single();

    if (data?.messages) {
      currentChatIdRef.current = chatId;
      setCurrentChatId(chatId);
      setMessages(data.messages);
      setShowHistory(false);
    }
  }

  /**
   * 📋 نسخ الرسالة
   */
  function copyMessage(content, id) {
    navigator.clipboard.writeText(content)
      .then(function() {
        setCopiedId(id);
        setTimeout(function() { setCopiedId(null); }, 2000);
      })
      .catch(function() {
        const ta = document.createElement("textarea");
        ta.value = content;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        setCopiedId(id);
        setTimeout(function() { setCopiedId(null); }, 2000);
      });
  }

  /**
   * 📎 رفع الملفات
   */
  async function handleFileUpload(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setLoading(true);
    const nf = [];

    for (const file of files) {
      try {
        const content = await readFileAsText(file);
        nf.push({
          id: Date.now() + Math.random(),
          name: file.name,
          content: content,
          icon: getFileIcon(file)
        });
      } catch (err) {
        console.error('❌ خطأ في قراءة الملف:', err.message);
      }
    }

    setAttachedFiles(function(p) { return [...p, ...nf]; });
    setLoading(false);
  }

  /**
   * ❌ إزالة الملف
   */
  function removeFile(fid) {
    setAttachedFiles(function(p) { return p.filter(function(f) { return f.id !== fid; }); });
  }

  /**
   * ⌨️ معالجة المفاتيح
   */
  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  // حسابات
  const totalLimit = keys.reduce(function(s, k) { return s + k.dailyLimit; }, 0);
  const totalUsed = keys.reduce(function(s, k) { return s + k.used; }, 0);
  const tokenPercent = totalLimit > 0 ? ((totalUsed / totalLimit) * 100).toFixed(1) : "0.0";
  const availKeys = keys.filter(function(k) { return k.used < k.dailyLimit; }).length;
  const tokenColor = tokenPercent < 50 ? "#4ade80" : tokenPercent < 80 ? "#facc15" : "#f87171";
  const isDark = theme === "dark";

  if (!isLoaded) {
    return (
      <div style={{
        height: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0f0f1a",
        color: "#e0e0e0"
      }}>
        <div>🖤 جاري التحميل...</div>
      </div>
    );
  }

  if (isLoaded && keys.length === 0) {
    return (
      <div style={{
        height: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0f0f1a",
        color: "#e0e0e0",
        fontFamily: "inherit",
        textAlign: "center"
      }}>
        <div>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔑</div>
          <h2>لا توجد مفاتيح متاحة</h2>
          <p>تواصل مع المسؤول لإضافة مفاتيح</p>
          <button
            onClick={onLogout}
            style={{
              marginTop: "16px",
              padding: "8px 16px",
              background: "#f87171",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer"
            }}
          >
            تسجيل الخروج
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`container ${isDark ? "dark" : "light"}`}>
      {/* ===== الهيدر ===== */}
      <div className="header">
        <div className="header-left">
          <div className="avatar">🖤</div>
          <div>
            <div className="header-name">بلاك</div>
            <div className="header-status">
              <span className="status-dot" style={{
                background: userConsumption?.percentage >= 80 ? "#f87171" : "#4ade80"
              }}></span>
              {userConsumption && `${userConsumption.percentage.toFixed(1)}%`}
            </div>
          </div>
        </div>

        {showMenu && (
          <>
            <div
              onClick={function() { setShowMenu(false); }}
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 200,
                background: "rgba(0,0,0,0.5)"
              }}
            />
            <div style={{
              position: "fixed",
              top: "60px",
              right: "16px",
              background: isDark ? "#1a1a2e" : "#f5f5f5",
              borderRadius: "12px",
              zIndex: 201,
              minWidth: "160px",
              boxShadow: "0 4px 16px rgba(0,0,0,0.2)"
            }}>
              <button
                onClick={function() { newChat(); setShowMenu(false); }}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  background: "transparent",
                  color: isDark ? "#e0e0e0" : "#333",
                  border: "none",
                  textAlign: "right",
                  cursor: "pointer",
                  borderBottom: `1px solid ${isDark ? "#333" : "#ddd"}`
                }}
              >
                ✨ جديد
              </button>
              <button
                onClick={function() { setShowHistory(!showHistory); setShowMenu(false); }}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  background: "transparent",
                  color: isDark ? "#e0e0e0" : "#333",
                  border: "none",
                  textAlign: "right",
                  cursor: "pointer",
                  borderBottom: `1px solid ${isDark ? "#333" : "#ddd"}`
                }}
              >
                📜 السجل
              </button>
              <button
                onClick={function() { setTheme(isDark ? "light" : "dark"); setShowMenu(false); }}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  background: "transparent",
                  color: isDark ? "#e0e0e0" : "#333",
                  border: "none",
                  textAlign: "right",
                  cursor: "pointer",
                  borderBottom: `1px solid ${isDark ? "#333" : "#ddd"}`
                }}
              >
                {isDark ? "☀️" : "🌙"} مظهر
              </button>
              <button
                onClick={onLogout}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  background: "transparent",
                  color: "#f87171",
                  border: "none",
                  textAlign: "right",
                  cursor: "pointer"
                }}
              >
                🚪 خروج
              </button>
            </div>
          </>
        )}

        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={function() { newChat(); }}
            className="header-btn"
            title="محادثة جديدة"
          >
            ✨
          </button>
          <button
            onClick={function() { setShowHistory(!showHistory); }}
            className="header-btn"
            title="السجل"
          >
            📜
          </button>
          <button
            onClick={function() { setShowMenu(!showMenu); }}
            className="header-btn"
            title="القائمة"
          >
            ☰
          </button>
        </div>
      </div>

      {/* ===== شريط الرموز ===== */}
      <div className="token-bar">
        <div className="token-info">
          <span>⚡ {totalUsed.toLocaleString()} / {totalLimit.toLocaleString()} token ({availKeys}/{keys.length})</span>
          <span style={{ color: tokenColor }}>
            {tokenPercent}%
          </span>
        </div>
      </div>

      {/* ===== تحذير الاستهلاك ===== */}
      {showWarning && (
        <div style={{
          background: "#dc2626",
          color: "white",
          padding: "12px 16px",
          textAlign: "center",
          fontSize: "14px",
          borderBottom: "1px solid #991b1b"
        }}>
          {warningMessage}
          <button
            onClick={function() { setShowWarning(false); }}
            style={{
              marginLeft: "12px",
              background: "transparent",
              color: "white",
              border: "none",
              cursor: "pointer",
              fontSize: "16px"
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ===== السجل ===== */}
      {showHistory && (
        <div className="search-bar" style={{
          flexDirection: "column",
          alignItems: "stretch",
          gap: "8px",
          maxHeight: "250px",
          overflowY: "auto"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 16px" }}>
            <span style={{ fontSize: "12px", color: "#666" }}>📜 {allChats.length} محادثات</span>
            <button
              onClick={function() { setShowHistory(false); }}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                fontSize: "18px"
              }}
            >
              ✕
            </button>
          </div>
          {allChats.map(function(chat) {
            return (
              <button
                key={chat.id}
                onClick={function() { openChat(chat.id); }}
                style={{
                  padding: "12px 16px",
                  background: "transparent",
                  border: "1px solid #333",
                  borderRadius: "8px",
                  color: isDark ? "#e0e0e0" : "#333",
                  cursor: "pointer",
                  textAlign: "right",
                  transition: "all 0.2s"
                }}
              >
                <div style={{ fontWeight: "500" }}>{chat.title}</div>
                <div style={{ fontSize: "12px", color: "#999" }}>
                  {formatDate(chat.date)} • {chat.messageCount} رسالة
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* ===== الرسائل ===== */}
      <div className="messages">
        {messages.map(function(msg) {
          return (
            <div key={msg.id} className={`msg-row ${msg.role === "user" ? "msg-row-user" : "msg-row-ai"}`}>
              {msg.role === "assistant" && <div className="avatar-small">🖤</div>}
              <div className={`bubble ${isDark ? (msg.role === "user" ? "bubble-user" : "bubble-ai") : "bubble-ai-light"}`}>
                <MessageContent content={msg.content} />
                {msg.role === "assistant" && (
                  <button
                    onClick={function() { copyMessage(msg.content, msg.id); }}
                    style={{
                      marginTop: "8px",
                      background: tokenColor,
                      color: "white",
                      border: "none",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "12px"
                    }}
                  >
                    {copiedId === msg.id ? "✓ تم" : "نسخ"}
                  </button>
                )}
              </div>
              {msg.role === "user" && <div className="avatar-small">👤</div>}
            </div>
          );
        })}
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

      {/* ===== الملفات المرفقة ===== */}
      {attachedFiles.length > 0 && (
        <div style={{
          display: "flex",
          gap: "8px",
          padding: "8px 20px",
          flexWrap: "wrap"
        }}>
          {attachedFiles.map(function(f) {
            return (
              <div key={f.id} style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                background: tokenColor,
                color: "white",
                padding: "6px 12px",
                borderRadius: "8px",
                fontSize: "12px"
              }}>
                <span>{f.icon} {f.name.slice(0, 20)}</span>
                <button
                  onClick={function() { removeFile(f.id); }}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "white",
                    cursor: "pointer",
                    padding: 0
                  }}
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ===== منطقة الإدخال ===== */}
      <div className="input-area">
        <button
          onClick={function() { fileInputRef.current?.click(); }}
          className="header-btn"
          style={{ fontSize: "20px", padding: "8px" }}
        >
          📎
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          multiple
          style={{ display: "none" }}
          accept=".txt,.js,.jsx,.ts,.tsx,.py,.html,.css,.json,.csv,.md,.xml,.yaml,.yml,.pdf,image/*"
        />
        <textarea
          ref={inputRef}
          value={input}
          onChange={function(e) { setInput(e.target.value); }}
          onKeyDown={handleKeyDown}
          placeholder={loading ? "بلاك بيكتب..." : attachedFiles.length > 0 ? "أضف ملاحظة..." : "اتكلم..."}
          className="input-field"
        />
        <button
          onClick={function() { sendMessage(); }}
          className="send-btn"
          style={{
            opacity: (!input.trim() && attachedFiles.length === 0) || loading ? 0.4 : 1,
            background: loading ? "#f87171" : tokenColor
          }}
        >
          {loading ? "⏳" : "📤"}
        </button>
      </div>
    </div>
  );
}
