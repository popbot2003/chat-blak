// ============================================
// Chat.jsx - نسخة معدلة (تم إزالة التصفير التلقائي للاستهلاك)
// ============================================

import { useState, useRef, useEffect, useCallback } from "react";
import "../App.css";
import MessageContent from "../components/MessageContent";
import TypingDots from "../components/TypingDots";
import { supabase } from '../lib/supabase';
import {
  GROQ_MODEL,
  GROQ_MAX_TOKENS,
  GROQ_TEMPERATURE,
  CHAT_HISTORY_LIMIT,
  SAVE_CHAT_DELAY_MS,
} from '../config/constants';
import { getPersonalityPrompt, DEFAULT_PERSONALITY } from '../config/personalities';
import {
  formatDate,
  copyToClipboard,
  getUsagePercent,
  getUsageColor,
  debounce,
} from '../utils/helpers';
import { checkUserDailyLimit } from '../utils/validators';

// ─────────────────────────────────────────
// helpers
// ─────────────────────────────────────────

async function searchDuckDuckGo(query) {
  try {
    const res = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&kl=ar-ar&t=h_`
    );
    const data = await res.json();
    const results = [];
    if (data.Abstract) results.push(data.Abstract);
    if (data.Answer) results.unshift(data.Answer);
    if (data.RelatedTopics) {
      data.RelatedTopics.slice(0, 3).forEach((t) => {
        if (t.Text) results.push(t.Text);
      });
    }
    return results.length > 0 ? results.join("\n") : null;
  } catch {
    return null;
  }
}

function cleanResponse(text) {
  if (!text) return "";
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/[ \t]+/g, " ")
    .trim();
}

async function readFileAsText(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => resolve("❌ خطأ في قراءة الملف");
    if (file.type.startsWith("image/")) {
      reader.onload = () => resolve("🖼️ صورة: " + file.name);
      reader.readAsDataURL(file);
      return;
    }
    if (file.type === "application/pdf") {
      reader.onload = () => resolve("📄 PDF: " + file.name);
      reader.readAsArrayBuffer(file);
      return;
    }
    reader.onload = () => resolve(reader.result);
    reader.readAsText(file);
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

// ─────────────────────────────────────────
// Toast مستقل
// ─────────────────────────────────────────

function showToast(message, type = "success") {
  const colors = { error: "#ef4444", info: "#3b82f6", success: "#10b981" };
  const div = document.createElement("div");
  div.style.cssText = `
    position:fixed;bottom:20px;left:50%;transform:translateX(-50%);
    background:${colors[type] ?? colors.success};color:#fff;
    padding:8px 16px;border-radius:10px;z-index:9999;
    font-size:14px;pointer-events:none;
  `;
  div.textContent = message;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 3000);
}

// ─────────────────────────────────────────
// Component
// ─────────────────────────────────────────

export default function Chat({ user, onLogout }) {
  const [allChats, setAllChats]         = useState([]);
  const [currentChatId, setCurrentChatId] = useState(() => Date.now().toString());
  const [showHistory, setShowHistory]   = useState(false);
  const [showMenu, setShowMenu]         = useState(false);
  const [messages, setMessages]         = useState([{
    role: "assistant",
    content: "أهلاً.. أنا بلاك 🖤\nاتكلم، أنا هنا. تقدر ترفع ملفات كمان 📎",
    id: Date.now(),
  }]);
  const [input, setInput]               = useState("");
  const [loading, setLoading]           = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [copiedId, setCopiedId]         = useState(null);
  const [theme, setTheme]               = useState("dark");
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [isLoaded, setIsLoaded]         = useState(false);
  const [currentUser, setCurrentUser]   = useState(user);

  const [showSettings, setShowSettings]             = useState(false);
  const [editName, setEditName]                     = useState(user?.name || "");
  const [editNewPassword, setEditNewPassword]       = useState("");
  const [editConfirmPassword, setEditConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword]       = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [settingsLoading, setSettingsLoading]       = useState(false);
  const [settingsError, setSettingsError]           = useState("");

  const bottomRef         = useRef(null);
  const inputRef          = useRef(null);
  const fileInputRef      = useRef(null);
  const messagesRef       = useRef(messages);
  const currentChatIdRef  = useRef(currentChatId);
  const currentUserRef    = useRef(currentUser);
  const debouncedSaveRef  = useRef(null);

  useEffect(() => { messagesRef.current      = messages;      }, [messages]);
  useEffect(() => { currentChatIdRef.current = currentChatId; }, [currentChatId]);
  useEffect(() => { currentUserRef.current   = currentUser;   }, [currentUser]);

  // ── Realtime: تحديث بيانات المستخدم ──────────────────────
  useEffect(() => {
    const ch = supabase
      .channel("user-updates")
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
        (payload) => {
          setCurrentUser(payload.new);
          localStorage.setItem("black-user", JSON.stringify(payload.new));
        }
      )
      .subscribe();
    return () => ch.unsubscribe();
  }, [user.id]);

  // ── Realtime: حذف الحساب ─────────────────────────────────
  useEffect(() => {
    const ch = supabase
      .channel("profile-delete")
      .on("postgres_changes",
        { event: "DELETE", schema: "public", table: "profiles" },
        (payload) => {
          if (payload.old.id === user.id) {
            showToast("⚠️ تم حذف حسابك بواسطة المدير.", "error");
            localStorage.removeItem("black-user");
            setTimeout(() => window.location.reload(), 2000);
          }
        }
      )
      .subscribe();
    return () => ch.unsubscribe();
  }, [user.id]);

  // ── Realtime: حذف المحادثات ───────────────────────────────
  useEffect(() => {
    const ch = supabase
      .channel("chats-delete-" + user.id)
      .on("postgres_changes",
        { event: "DELETE", schema: "public", table: "chats" },
        (payload) => {
          const deletedId = payload.old?.id;
          if (!deletedId) return;
          setAllChats((prev) => prev.filter((c) => c.id !== deletedId));
          if (currentChatIdRef.current === deletedId) {
            const newId = Date.now().toString();
            setCurrentChatId(newId);
            setMessages([{
              role: "assistant",
              content: "محادثة جديدة 🖤\nاتكلم، أنا هنا.",
              id: Date.now(),
            }]);
          }
        }
      )
      .subscribe();
    return () => ch.unsubscribe();
  }, [user.id]);

  // ── Presence ─────────────────────────────────────────────
  useEffect(() => {
    let ch = null;
    (async () => {
      ch = supabase.channel("online-users", {
        config: { presence: { key: user.id } },
      });
      await ch.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await ch.track({
            user_id:    user.id,
            user_name:  user.name || user.email,
            user_email: user.email,
            online_at:  new Date().toISOString(),
            personality: user.personality || "blak",
          });
        }
      });
    })();
    return () => {
      if (ch) { ch.untrack(); ch.unsubscribe(); }
    };
  }, [user.id, user.name, user.email, user.personality]);

  // ── تحميل أولي ───────────────────────────────────────────
  useEffect(() => {
    loadAllData();
    inputRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  // ── حفظ تلقائي عند تغيُّر الرسائل ───────────────────────
  useEffect(() => {
    if (!isLoaded || messages.length <= 1) return;
    if (!debouncedSaveRef.current) {
      debouncedSaveRef.current = debounce(() => saveChatToSupabase(), SAVE_CHAT_DELAY_MS);
    }
    debouncedSaveRef.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, isLoaded]);

  // ── حفظ عند إغلاق النافذة ────────────────────────────────
  useEffect(() => {
    const handle = () => saveChatToSupabase();
    window.addEventListener("beforeunload", handle);
    return () => window.removeEventListener("beforeunload", handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded]);

  // ─────────────────────────────────────────
  // Data loading
  // ─────────────────────────────────────────

  async function loadAllData() {
    await loadChatsFromSupabase();
    await refreshUserData();
    await checkAndShowWelcome();
    setIsLoaded(true);
  }

  async function refreshUserData() {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (error) throw error;
      if (data) {
        setCurrentUser(data);
        localStorage.setItem("black-user", JSON.stringify(data));
      }
    } catch (err) {
      console.error("[Chat] خطأ في تحديث بيانات المستخدم:", err.message);
    }
  }

  async function loadChatsFromSupabase() {
    try {
      const { data: chats, error } = await supabase
        .from("chats")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      setAllChats(
        (chats ?? []).map((c) => ({
          id:           c.id,
          title:        c.title || "محادثة",
          date:         c.updated_at,
          messageCount: c.messages?.length || 0,
        }))
      );
    } catch (err) {
      console.error("[Chat] خطأ في تحميل المحادثات:", err.message);
    }
  }

  async function saveChatToSupabase() {
    const msgs = messagesRef.current;
    if (!msgs || msgs.length <= 1) return;

    const title  = msgs.find((m) => m.role === "user")?.content?.slice(0, 50) || "محادثة";
    const chatId = currentChatIdRef.current;
    const now    = new Date().toISOString();

    try {
      const { error } = await supabase.from("chats").upsert({
        id:         chatId,
        user_id:    user.id,
        title,
        messages:   msgs.slice(-CHAT_HISTORY_LIMIT),
        updated_at: now,
      });
      if (error) throw error;

      setAllChats((prev) => {
        const exists  = prev.find((c) => c.id === chatId);
        const updated = { id: chatId, title, date: now, messageCount: msgs.length };
        return exists
          ? [updated, ...prev.filter((c) => c.id !== chatId)]
          : [updated, ...prev];
      });
    } catch (err) {
      console.error("[Chat] خطأ في حفظ المحادثة:", err.message);
    }
  }

  // ─────────────────────────────────────────
  // Welcome message
  // ─────────────────────────────────────────

  function getTimeBasedGreeting() {
    const h = new Date().getHours();
    if (h >= 6  && h < 12) return "صباح الخير";
    if (h >= 12 && h < 17) return "نهارك سعيد";
    if (h >= 17 && h < 22) return "مساء الخير";
    return "يا سلاام";
  }

  function getWelcomeMessage(lastLoginDate, userName, usedToday, dailyLimit, chatCount) {
    const today       = new Date().toISOString().slice(0, 10);
    const percentLeft = dailyLimit > 0 ? ((dailyLimit - usedToday) / dailyLimit) * 100 : 0;
    const greeting    = getTimeBasedGreeting();
    const name        = userName || "صاحبي";

    if (lastLoginDate !== today) {
      let msg = `${greeting} يا ${name} 🖤\n\nياهلا بيك في يوم جديد.\n\n📊 النهاردة:\n`;
      msg += `- متبقي: ${(dailyLimit - usedToday).toLocaleString()} / ${dailyLimit.toLocaleString()} توكن (${Math.floor(percentLeft)}%)\n`;
      if (chatCount > 0) msg += `- عدد محادثاتك: ${chatCount} محادثة\n`;
      msg += `\nجهز نفسك، النهاردة هنتكلم كتير 🚀`;
      return msg;
    }

    const opts = [
      `أهلاً بعودتك يا ${name} 🖤\n\nفاتك حاجة ولا إيه؟ تعالا نكمل.`,
      `مرحباً مرة تانية يا ${name} 🖤\n\nوحشتني بجد. احكلي إيه الأخبار.`,
      `يا ${name}.. رجعت! 🖤\n\nكنت مستنيك. يلا احكيلي.`,
      `هلا والله يا ${name} 🖤\n\nعودتك تسعدني. إيه اللي جابك؟`,
    ];
    return opts[Math.floor(Math.random() * opts.length)];
  }

  async function checkAndShowWelcome() {
    const cu = currentUserRef.current;
    if (!cu) return;

    const today      = new Date().toISOString().slice(0, 10);
    const isNewUser  = !cu.last_login_date;
    const isFirstDay = cu.last_login_date !== today;
    const chatCount  = allChats.length;

    const welcomeMessage = isNewUser
      ? `أهلاً وسهلاً يا ${cu.name || "صاحبي"} 🖤\n\nيا هلا بيك في بلاك! أنا هنا عشانك.\n\n📊 حسابك:\n- الحد اليومي: ${(cu.daily_limit || 5000).toLocaleString()} توكن\n\nاتكلم، أنا جاهز! 🚀`
      : getWelcomeMessage(cu.last_login_date, cu.name, cu.used_today || 0, cu.daily_limit || 5000, chatCount);

    if ((isNewUser || isFirstDay) && messagesRef.current.length === 1) {
      setMessages([{ role: "assistant", content: welcomeMessage, id: Date.now() }]);
    }

    if (isFirstDay || isNewUser) {
      await supabase.from("profiles").update({ last_login_date: today }).eq("id", user.id);
      setCurrentUser((prev) => ({ ...prev, last_login_date: today }));
    }
  }

  // ─────────────────────────────────────────
  // Settings
  // ─────────────────────────────────────────

  async function updateUserSettings() {
    setSettingsError("");

    if (editNewPassword !== editConfirmPassword) {
      setSettingsError("❌ كلمة المرور الجديدة غير متطابقة");
      return;
    }
    if (editNewPassword && editNewPassword.length < 6) {
      setSettingsError("❌ كلمة المرور الجديدة قصيرة (6 أحرف على الأقل)");
      return;
    }

    const profileUpdates = {};
    if (editName && editName !== currentUser?.name) profileUpdates.name = editName;

    if (!Object.keys(profileUpdates).length && !editNewPassword) {
      setSettingsError("❌ لا توجد تغييرات للحفظ");
      return;
    }

    setSettingsLoading(true);
    try {
      if (Object.keys(profileUpdates).length) {
        const { error } = await supabase.from("profiles").update(profileUpdates).eq("id", user.id);
        if (error) throw error;
      }

      if (editNewPassword) {
        const { error: authError } = await supabase.auth.updateUser({ password: editNewPassword });
        if (authError) throw authError;
      }

      const updatedUser = { ...currentUser, ...profileUpdates };
      setCurrentUser(updatedUser);
      localStorage.setItem("black-user", JSON.stringify(updatedUser));
      setEditNewPassword("");
      setEditConfirmPassword("");
      setShowSettings(false);
      showToast("✅ تم تحديث الإعدادات بنجاح");
    } catch (err) {
      setSettingsError("❌ خطأ: " + err.message);
    } finally {
      setSettingsLoading(false);
    }
  }

  async function deleteAccount() {
    if (!window.confirm("⚠️ تحذير: هذا الإجراء لا يمكن التراجع عنه!\n\nسيتم حذف:\n- حسابك بالكامل\n- جميع محادثاتك\n\nهل أنت متأكد؟"))
      return;

    setSettingsLoading(true);
    try {
      await supabase.from("chats").delete().eq("user_id", user.id);
      await supabase.from("profiles").delete().eq("id", user.id);
      localStorage.removeItem("black-user");
      window.location.reload();
    } catch (err) {
      setSettingsError("❌ خطأ في حذف الحساب: " + err.message);
      setSettingsLoading(false);
    }
  }

  // ─────────────────────────────────────────
  // Core chat logic
  // ─────────────────────────────────────────

  const executeRequest = useCallback(async (text, isRetry = false) => {
    // التحقق من حالة المستخدم
    try {
      const { data: freshUser, error } = await supabase
        .from("profiles")
        .select("id, is_blocked")
        .eq("id", user.id)
        .single();

      if (error || !freshUser) {
        localStorage.removeItem("black-user");
        window.location.reload();
        return;
      }
      if (freshUser.is_blocked) {
        showToast("⚠️ تم حظر حسابك بواسطة المدير.", "error");
        localStorage.removeItem("black-user");
        setTimeout(() => window.location.reload(), 2000);
        return;
      }
    } catch (err) {
      console.warn("[Chat] تعذر التحقق من المستخدم:", err.message);
    }

    const limitCheck = checkUserDailyLimit(currentUserRef.current);
    if (!limitCheck.canChat) {
      setMessages((prev) => [...prev, { role: "assistant", content: limitCheck.reason, id: Date.now() }]);
      setLoading(false);
      return;
    }

    const userMsg       = { role: "user", content: text, id: Date.now() };
    const updatedMessages = isRetry
      ? messagesRef.current
      : [...messagesRef.current, userMsg];

    if (!isRetry) {
      setMessages(updatedMessages);
      setInput("");
      setAttachedFiles([]);
    }

    setLoading(true);
    setStreamingText("");

    try {
      // بحث اختياري
      let enhancedText = text;
      const searchResult = await searchDuckDuckGo(text);
      if (searchResult) {
        enhancedText =
          text +
          "\n\n[نتائج البحث]:\n" +
          searchResult +
          "\n\nاستخدم المعلومات دي كمرجع فقط، وردك يكون عربي بالكامل.";
      }

      const chatMessages = updatedMessages.map((m) => ({ role: m.role, content: m.content }));

      // ✅ جلب الـ session token وإرسال الطلب للـ Edge Function
      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch(
        "https://yfglgxuhtidfksekgabk.supabase.co/functions/v1/hyper-responder",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            model:        GROQ_MODEL,
            max_tokens:   GROQ_MAX_TOKENS,
            temperature:  GROQ_TEMPERATURE,
            systemPrompt: getPersonalityPrompt(
              currentUserRef.current?.personality || DEFAULT_PERSONALITY,
              currentUserRef.current?.gender || "ولد"
            ),
            messages: [
              ...chatMessages.slice(-CHAT_HISTORY_LIMIT),
              { role: "user", content: enhancedText },
            ],
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401 && !isRetry) {
          showToast("⚠️ خطأ في المصادقة، حاول مرة أخرى", "error");
        } else if ((res.status === 429 || data.error?.code === "rate_limit_exceeded") && !isRetry) {
          setTimeout(() => executeRequest(text, true), 1500);
          return;
        }
        throw new Error(data.error?.message || data.error || `خطأ: ${res.status}`);
      }

      const reply = cleanResponse(data.choices?.[0]?.message?.content || "");

      // typing effect
      let i = 0;
      function type() {
        if (i <= reply.length) {
          setStreamingText(reply.slice(0, i));
          i++;
          setTimeout(type, 15);
        } else {
          setStreamingText("");
          setMessages((prev) => [...prev, { role: "assistant", content: reply, id: Date.now() }]);
          setLoading(false);
          setTimeout(() => inputRef.current?.focus(), 100);
        }
      }
      type();
    } catch (err) {
      console.error("[Chat] خطأ في executeRequest:", err.message);
      setMessages((prev) => [...prev, {
        role:    "assistant",
        content: "❌ حدث خطأ: " + err.message,
        id:      Date.now(),
      }]);
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  async function sendMessage(overrideText, isRetry = false) {
    if (loading && !isRetry) return;

    const text = (overrideText || input).trim();
    if (!text && !attachedFiles.length && !isRetry) return;

    const MAX_FILE_CHARS = 3000;
    let finalText = text;

    if (attachedFiles.length > 0) {
      const filesText = attachedFiles
        .map((f) => {
          const content    = f.content || "";
          const truncated  = content.length > MAX_FILE_CHARS;
          const body       = truncated
            ? content.slice(0, MAX_FILE_CHARS) + "\n\n... [تم اقتصار الملف، الحجم كبير]"
            : content;
          return `\n\n📎 ${f.name}${truncated ? " ⚠️ (تم اقتصاره)" : ""}\n\`\`\`\n${body}\n\`\`\``;
        })
        .join("");
      finalText = (text || "الملفات المرفقة:") + filesText;
    }

    executeRequest(finalText, isRetry);
  }

  async function newChat() {
    await saveChatToSupabase();
    const newId = Date.now().toString();
    setCurrentChatId(newId);
    setMessages([{ role: "assistant", content: "محادثة جديدة 🖤\nاتكلم، أنا هنا.", id: Date.now() }]);
    setShowMenu(false);
    setShowHistory(false);
    setInput("");
    setAttachedFiles([]);
    inputRef.current?.focus();
  }

  async function openChat(chatId) {
    await saveChatToSupabase();
    const { data } = await supabase.from("chats").select("*").eq("id", chatId).single();
    if (data?.messages) {
      setCurrentChatId(chatId);
      setMessages(data.messages.slice(-CHAT_HISTORY_LIMIT));
    }
    setShowHistory(false);
    setShowMenu(false);
    setInput("");
    setAttachedFiles([]);
    inputRef.current?.focus();
  }

  function copyMessage(content, id) {
    copyToClipboard(content, () => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  async function handleFileUpload(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setLoading(true);
    const newFiles = [];

    for (const file of files) {
      try {
        newFiles.push({
          id:      Date.now() + Math.random(),
          name:    file.name,
          type:    file.type,
          size:    file.size,
          icon:    getFileIcon(file),
          content: await readFileAsText(file),
        });
      } catch {
        newFiles.push({
          id:      Date.now() + Math.random(),
          name:    file.name,
          type:    file.type,
          size:    file.size,
          icon:    "❌",
          content: "خطأ",
        });
      }
    }

    setAttachedFiles((prev) => [...prev, ...newFiles]);
    setLoading(false);
    inputRef.current?.focus();
  }

  function removeFile(fileId) {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== fileId));
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  // ─────────────────────────────────────────
  // Derived values
  // ─────────────────────────────────────────

  const isDark          = theme === "dark";
  const userPercent     = getUsagePercent(currentUser?.used_today || 0, currentUser?.daily_limit || 5000);
  const userColor       = getUsageColor(userPercent);
  const remainingTokens = (currentUser?.daily_limit || 5000) - (currentUser?.used_today || 0);

  // ─────────────────────────────────────────
  // Early returns
  // ─────────────────────────────────────────

  if (!isLoaded) {
    return (
      <div style={{ height: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f0f1a", color: "#e0e0e0" }}>
        🖤 جاري التحميل...
      </div>
    );
  }

  // ─────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────

  return (
    <div className={`container ${isDark ? "dark" : "light"}`}>

      {/* ── Header ── */}
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

        {showMenu && (
          <>
            <div onClick={() => setShowMenu(false)} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.5)" }} />
            <div style={{ position: "absolute", top: "60px", right: "10px", background: isDark ? "#1a1a2e" : "#fff", borderRadius: "16px", padding: "8px", zIndex: 201, display: "flex", flexDirection: "column", gap: "2px", minWidth: "220px", boxShadow: "0 10px 40px rgba(0,0,0,0.3)" }}>

              {/* استهلاك اليوم */}
              <div style={{ padding: "12px", margin: "4px", background: "rgba(108,92,231,0.1)", borderRadius: "12px", border: "1px solid rgba(108,92,231,0.2)" }}>
                <div style={{ fontSize: "13px", fontWeight: "bold", marginBottom: "8px" }}>📊 استهلاك اليوم</div>
                <div style={{ fontSize: "12px", marginBottom: "4px" }}>
                  استهلكت: <strong>{(currentUser?.used_today || 0).toLocaleString()}</strong> / {(currentUser?.daily_limit || 5000).toLocaleString()} توكن
                </div>
                <div style={{ fontSize: "12px", marginBottom: "8px" }}>
                  متبقي: <strong style={{ color: remainingTokens < 1000 ? "#f87171" : "#4ade80" }}>{remainingTokens.toLocaleString()}</strong> توكن ({Math.floor(100 - userPercent)}%)
                </div>
                <div style={{ width: "100%", height: "6px", background: "rgba(255,255,255,0.1)", borderRadius: "3px", overflow: "hidden" }}>
                  <div style={{ width: userPercent + "%", height: "100%", background: userColor, transition: "width 0.3s" }} />
                </div>
                <div style={{ fontSize: "10px", opacity: 0.5, marginTop: "6px" }}>🔄 يتجدد كل يوم الساعة 12 صباحاً</div>
              </div>

              <button onClick={() => { setEditName(currentUser?.name || ""); setEditNewPassword(""); setEditConfirmPassword(""); setSettingsError(""); setShowSettings(true); setShowMenu(false); }} className="menu-item">
                ⚙️ الإعدادات
              </button>
              <button onClick={() => { setShowHistory(!showHistory); setShowMenu(false); }} className="menu-item">💬 سجل المحادثات</button>
              <button onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))} className="menu-item">{isDark ? "☀️ النهاري" : "🌙 الليلي"}</button>
              <button onClick={onLogout} className="menu-item" style={{ color: "#f87171" }}>🚪 خروج</button>
            </div>
          </>
        )}
      </div>

      {/* ── Token bar ── */}
      <div className="token-bar">
        <div className="token-info">
          <span>📊 {(currentUser?.used_today || 0).toLocaleString()} / {(currentUser?.daily_limit || 5000).toLocaleString()} توكن</span>
          <span style={{ color: userColor }}>{userPercent.toFixed(0)}%</span>
        </div>
        <div className="token-track">
          <div className="token-fill" style={{ width: userPercent + "%", background: userColor }} />
        </div>
        {(currentUser?.used_today || 0) >= (currentUser?.daily_limit || 5000) && (
          <div style={{ fontSize: "11px", color: "#f87171", marginTop: "4px" }}>⚠️ وصلت للحد النهاردة! بكره هتقدر تكمل.</div>
        )}
      </div>

      {/* ── History panel ── */}
      {showHistory && (
        <>
          <div onClick={() => setShowHistory(false)} style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.5)" }} />
          <div className="history-panel" style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "320px", maxWidth: "90vw", zIndex: 301, display: "flex", flexDirection: "column", background: "inherit" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px", borderBottom: "1px solid rgba(255,255,255,0.08)", flexShrink: 0 }}>
              <strong style={{ fontSize: "16px" }}>📝 السجل ({allChats.length})</strong>
              <button onClick={() => setShowHistory(false)} className="close-btn">✕</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "8px", display: "flex", flexDirection: "column", gap: "6px" }}>
              {allChats.length === 0 ? (
                <div style={{ textAlign: "center", opacity: 0.6, padding: "20px" }}>مفيش محادثات</div>
              ) : (
                allChats.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => openChat(c.id)}
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: "12px", cursor: "pointer", background: c.id === currentChatId ? "rgba(108,92,231,0.2)" : "rgba(255,255,255,0.03)", border: c.id === currentChatId ? "1px solid rgba(108,92,231,0.3)" : "1px solid transparent" }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "14px", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</div>
                      <div style={{ fontSize: "11px", opacity: 0.5, marginTop: "2px" }}>{formatDate(c.date)} · {c.messageCount} رسالة</div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!window.confirm("حذف هذه المحادثة؟")) return;
                        supabase.from("chats").delete().eq("id", c.id).then(() => {
                          setAllChats((prev) => prev.filter((ch) => ch.id !== c.id));
                          if (c.id === currentChatId) newChat();
                        });
                      }}
                      style={{ background: "transparent", border: "none", color: "inherit", fontSize: "16px", cursor: "pointer", opacity: 0.5, flexShrink: 0, marginRight: "4px" }}
                    >🗑️</button>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Messages ── */}
      <div className="messages">
        {messages.map((msg) => (
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

      {/* ── Attached files ── */}
      {attachedFiles.length > 0 && (
        <div style={{ display: "flex", gap: "8px", padding: "8px 20px", flexWrap: "wrap" }}>
          {attachedFiles.map((f) => (
            <div key={f.id} style={{ display: "flex", alignItems: "center", gap: "6px", background: "rgba(108,92,231,0.15)", borderRadius: "10px", padding: "6px 10px", fontSize: "12px" }}>
              <span>{f.icon}</span>
              <span style={{ maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
              <button onClick={() => removeFile(f.id)} style={{ background: "transparent", border: "none", color: "inherit", cursor: "pointer" }}>✕</button>
            </div>
          ))}
        </div>
      )}

      {/* ── Input area ── */}
      <div className="input-area">
        <button onClick={() => fileInputRef.current?.click()} className="header-btn" style={{ fontSize: "20px", padding: "8px" }}>📎</button>
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
          onChange={(e) => setInput(e.target.value)}
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
            opacity:    (!input.trim() && !attachedFiles.length) || loading ? 0.4 : 1,
            background: loading ? "#f87171" : "",
          }}
        >
          {loading ? "⏳" : "↑"}
        </button>
      </div>

      {/* ── Settings modal ── */}
      {showSettings && (
        <div className="admin-modal">
          <div className="admin-modal-content" style={{ maxWidth: "400px" }}>
            <div className="admin-modal-head">
              <h3>⚙️ إعدادات المستخدم</h3>
              <button onClick={() => setShowSettings(false)} className="close-btn">✕</button>
            </div>

            {settingsError && (
              <div style={{ background: "rgba(248,113,113,0.1)", color: "#f87171", padding: "10px", borderRadius: "8px", marginBottom: "15px", fontSize: "13px" }}>
                {settingsError}
              </div>
            )}

            <div style={{ marginBottom: "15px" }}>
              <label style={{ fontSize: "12px", opacity: 0.7, display: "block", marginBottom: "5px" }}>📧 البريد الإلكتروني</label>
              <div style={{ padding: "12px", background: "rgba(255,255,255,0.05)", borderRadius: "10px", fontSize: "14px", border: "1px solid rgba(255,255,255,0.1)", color: "#a29bfe" }}>
                {currentUser?.email}
              </div>
              <div style={{ fontSize: "10px", opacity: 0.5, marginTop: "4px" }}>لا يمكن تغيير البريد الإلكتروني</div>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label style={{ fontSize: "12px", opacity: 0.7, display: "block", marginBottom: "5px" }}>👤 الاسم</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="الاسم"
                style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#e0e0e0", fontSize: "14px", outline: "none" }}
              />
            </div>

            <div style={{ position: "relative", marginBottom: "15px" }}>
              <label style={{ fontSize: "12px", opacity: 0.7, display: "block", marginBottom: "5px" }}>🔑 كلمة المرور الجديدة (اختياري)</label>
              <input
                type={showNewPassword ? "text" : "password"}
                value={editNewPassword}
                onChange={(e) => setEditNewPassword(e.target.value)}
                placeholder="********"
                style={{ width: "100%", padding: "12px", paddingLeft: "45px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#e0e0e0", fontSize: "14px", outline: "none" }}
              />
              <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} style={{ position: "absolute", left: "10px", bottom: "8px", background: "transparent", border: "none", cursor: "pointer", fontSize: "18px", color: "#a29bfe" }}>
                {showNewPassword ? "🙈" : "👁️"}
              </button>
            </div>

            <div style={{ position: "relative", marginBottom: "20px" }}>
              <label style={{ fontSize: "12px", opacity: 0.7, display: "block", marginBottom: "5px" }}>✓ تأكيد كلمة المرور الجديدة</label>
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={editConfirmPassword}
                onChange={(e) => setEditConfirmPassword(e.target.value)}
                placeholder="********"
                style={{ width: "100%", padding: "12px", paddingLeft: "45px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#e0e0e0", fontSize: "14px", outline: "none" }}
              />
              <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={{ position: "absolute", left: "10px", bottom: "8px", background: "transparent", border: "none", cursor: "pointer", fontSize: "18px", color: "#a29bfe" }}>
                {showConfirmPassword ? "🙈" : "👁️"}
              </button>
            </div>

            <div className="admin-modal-actions" style={{ gap: "10px", marginBottom: "15px" }}>
              <button onClick={updateUserSettings} className="admin-modal-save-btn" disabled={settingsLoading}>
                {settingsLoading ? "جاري الحفظ..." : "💾 حفظ التغييرات"}
              </button>
              <button onClick={() => setShowSettings(false)} className="admin-modal-cancel-btn">إلغاء</button>
            </div>

            <button
              onClick={deleteAccount}
              disabled={settingsLoading}
              style={{ width: "100%", padding: "12px", background: "rgba(248,113,113,0.15)", color: "#f87171", border: "1px solid rgba(248,113,113,0.3)", borderRadius: "10px", cursor: "pointer", fontSize: "14px", fontWeight: "bold", marginTop: "10px" }}
            >
              🗑️ حذف الحساب (نهائياً)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
