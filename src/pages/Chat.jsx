// ============================================
// Chat.jsx — نسخة مُقسَّمة
// المنطق الرئيسي، والعرض عبر المكونات
// ============================================

import { useState, useRef, useEffect, useCallback } from "react";
import "../App.css";

import ChatHeader from "../components/chat/ChatHeader";
import ChatTokenBar from "../components/chat/ChatTokenBar";
import ChatMenu from "../components/chat/ChatMenu";
import ChatHistory from "../components/chat/ChatHistory";
import ChatMessages from "../components/chat/ChatMessages";
import ChatSettings from "../components/chat/ChatSettings";
import ChatInput from "../components/chat/ChatInput";

import { supabase } from "../lib/supabase";
import {
  GROQ_MODEL,
  GROQ_MAX_TOKENS,
  GROQ_TEMPERATURE,
  CHAT_HISTORY_LIMIT,
  SAVE_CHAT_DELAY_MS,
} from "../config/constants";
import {
  getPersonalityPrompt,
  DEFAULT_PERSONALITY,
} from "../config/personalities";
import {
  formatDate,
  copyToClipboard,
  debounce,
} from "../utils/helpers";
import { checkUserDailyLimit } from "../utils/validators";

// ─────────────────────────────────────────
// Helpers
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
  if (
    file.type.includes("javascript") ||
    file.name.endsWith(".js") ||
    file.name.endsWith(".jsx")
  )
    return "💛";
  if (file.type.includes("python") || file.name.endsWith(".py")) return "🐍";
  if (file.type.includes("html") || file.name.endsWith(".html")) return "🌐";
  if (file.type.includes("css") || file.name.endsWith(".css")) return "🎨";
  if (file.name.endsWith(".json")) return "📋";
  if (file.name.endsWith(".csv")) return "📊";
  if (file.name.endsWith(".md")) return "📝";
  return "📎";
}

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
export default function Chat({ user, onLogout, isAdmin }) {
  const [allChats, setAllChats] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(() =>
    Date.now().toString()
  );
  const [showHistory, setShowHistory] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "أهلاً.. أنا بلاك 🖤\nاتكلم، أنا هنا. تقدر ترفع ملفات كمان 📎",
      id: Date.now(),
    },
  ]);
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
  const messagesRef = useRef(messages);
  const currentChatIdRef = useRef(currentChatId);
  const currentUserRef = useRef(currentUser);
  const debouncedSaveRef = useRef(null);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  useEffect(() => {
    currentChatIdRef.current = currentChatId;
  }, [currentChatId]);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  // ── Realtime: تحديث بيانات المستخدم ──
  useEffect(() => {
    const ch = supabase
      .channel("user-updates")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          setCurrentUser(payload.new);
          localStorage.setItem("black-user", JSON.stringify(payload.new));
        }
      )
      .subscribe();
    return () => ch.unsubscribe();
  }, [user.id]);

  // ── Realtime: حذف الحساب ──
  useEffect(() => {
    const ch = supabase
      .channel("profile-delete")
      .on(
        "postgres_changes",
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

  // ── Realtime: حذف المحادثات ──
  useEffect(() => {
    const ch = supabase
      .channel("chats-delete-" + user.id)
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "chats" },
        (payload) => {
          const deletedId = payload.old?.id;
          if (!deletedId) return;
          setAllChats((prev) => prev.filter((c) => c.id !== deletedId));
          if (currentChatIdRef.current === deletedId) {
            const newId = Date.now().toString();
            setCurrentChatId(newId);
            setMessages([
              {
                role: "assistant",
                content: "محادثة جديدة 🖤\nاتكلم، أنا هنا.",
                id: Date.now(),
              },
            ]);
          }
        }
      )
      .subscribe();
    return () => ch.unsubscribe();
  }, [user.id]);

  // ── Presence ──
  useEffect(() => {
    let ch = null;
    (async () => {
      ch = supabase.channel("online-users", {
        config: { presence: { key: user.id } },
      });
      await ch.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await ch.track({
            user_id: user.id,
            user_name: user.name || user.email,
            user_email: user.email,
            online_at: new Date().toISOString(),
            personality: user.personality || "blak",
          });
        }
      });
    })();
    return () => {
      if (ch) {
        ch.untrack();
        ch.unsubscribe();
      }
    };
  }, [user.id, user.name, user.email, user.personality]);

  // ── تحميل أولي ──
  useEffect(() => {
    loadAllData();
    inputRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  // ── حفظ تلقائي ──
  useEffect(() => {
    if (!isLoaded || messages.length <= 1) return;
    if (!debouncedSaveRef.current) {
      debouncedSaveRef.current = debounce(
        () => saveChatToSupabase(),
        SAVE_CHAT_DELAY_MS
      );
    }
    debouncedSaveRef.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, isLoaded]);

  // ── حفظ عند إغلاق النافذة ──
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
          id: c.id,
          title: c.title || "محادثة",
          date: c.updated_at,
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

    const title =
      msgs.find((m) => m.role === "user")?.content?.slice(0, 50) || "محادثة";
    const chatId = currentChatIdRef.current;
    const now = new Date().toISOString();

    try {
      const { error } = await supabase.from("chats").upsert({
        id: chatId,
        user_id: user.id,
        title,
        messages: msgs.slice(-CHAT_HISTORY_LIMIT),
        updated_at: now,
      });
      if (error) throw error;

      setAllChats((prev) => {
        const exists = prev.find((c) => c.id === chatId);
        const updated = {
          id: chatId,
          title,
          date: now,
          messageCount: msgs.length,
        };
        return exists
          ? [updated, ...prev.filter((c) => c.id !== chatId)]
          : [updated, ...prev];
      });
    } catch (err) {
      console.error("[Chat] خطأ في حفظ المحادثة:", err.message);
    }
  }

  // ─────────────────────────────────────────
  // Welcome
  // ─────────────────────────────────────────
  function getTimeBasedGreeting() {
    const h = new Date().getHours();
    if (h >= 6 && h < 12) return "صباح الخير";
    if (h >= 12 && h < 17) return "نهارك سعيد";
    if (h >= 17 && h < 22) return "مساء الخير";
    return "يا سلاام";
  }

  function getWelcomeMessage(
    lastLoginDate,
    userName,
    usedToday,
    dailyLimit,
    chatCount
  ) {
    const today = new Date().toISOString().slice(0, 10);
    const percentLeft =
      dailyLimit > 0 ? ((dailyLimit - usedToday) / dailyLimit) * 100 : 0;
    const greeting = getTimeBasedGreeting();
    const name = userName || "صاحبي";

    if (lastLoginDate !== today) {
      let msg = `${greeting} يا ${name} 🖤\n\nياهلا بيك في يوم جديد.\n\n📊 النهاردة:\n`;
      msg += `- متبقي: ${(
        dailyLimit - usedToday
      ).toLocaleString()} / ${dailyLimit.toLocaleString()} توكن (${Math.floor(
        percentLeft
      )}%)\n`;
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

    const today = new Date().toISOString().slice(0, 10);
    const isNewUser = !cu.last_login_date;
    const isFirstDay = cu.last_login_date !== today;
    const chatCount = allChats.length;

    const welcomeMessage = isNewUser
      ? `أهلاً وسهلاً يا ${
          cu.name || "صاحبي"
        } 🖤\n\nيا هلا بيك في بلاك! أنا هنا عشانك.\n\n📊 حسابك:\n- الحد اليومي: ${(
          cu.daily_limit || 5000
        ).toLocaleString()} توكن\n\nاتكلم، أنا جاهز! 🚀`
      : getWelcomeMessage(
          cu.last_login_date,
          cu.name,
          cu.used_today || 0,
          cu.daily_limit || 5000,
          chatCount
        );

    if ((isNewUser || isFirstDay) && messagesRef.current.length === 1) {
      setMessages([
        { role: "assistant", content: welcomeMessage, id: Date.now() },
      ]);
    }

    if (isFirstDay || isNewUser) {
      await supabase
        .from("profiles")
        .update({ last_login_date: today })
        .eq("id", user.id);
      setCurrentUser((prev) => ({ ...prev, last_login_date: today }));
    }
  }

  // ─────────────────────────────────────────
  // Settings handlers
  // ─────────────────────────────────────────
  async function handleSaveSettings({ profileUpdates, newPassword }) {
    if (Object.keys(profileUpdates).length) {
      const { error } = await supabase
        .from("profiles")
        .update(profileUpdates)
        .eq("id", user.id);
      if (error) throw error;
    }

    if (newPassword) {
      const { error: authError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (authError) throw authError;
    }

    const updatedUser = { ...currentUser, ...profileUpdates };
    setCurrentUser(updatedUser);
    localStorage.setItem("black-user", JSON.stringify(updatedUser));
    showToast("✅ تم تحديث الإعدادات بنجاح");
  }

  async function handleDeleteAccount() {
    if (
      !window.confirm(
        "⚠️ تحذير: هذا الإجراء لا يمكن التراجع عنه!\n\nسيتم حذف:\n- حسابك بالكامل\n- جميع محادثاتك\n\nهل أنت متأكد؟"
      )
    )
      return;

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const res = await fetch(
        "https://yfglgxuhtidfksekgabk.supabase.co/functions/v1/delete-account",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "خطأ في حذف الحساب");

      localStorage.removeItem("black-user");
      window.location.reload();
    } catch (err) {
      alert("❌ خطأ في حذف الحساب: " + err.message);
    }
  }

  // ─────────────────────────────────────────
  // Core chat logic
  // ─────────────────────────────────────────
  async function summarizeOldMessages(oldMessages, session) {
    if (!oldMessages || oldMessages.length === 0) return null;

    const text = oldMessages
      .map(
        (m) =>
          `${m.role === "user" ? "المستخدم" : "بلاك"}: ${m.content.slice(
            0,
            300
          )}`
      )
      .join("\n");

    try {
      const res = await fetch(
        "https://yfglgxuhtidfksekgabk.supabase.co/functions/v1/hyper-responder",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            model: GROQ_MODEL,
            max_tokens: 200,
            temperature: 0.3,
            systemPrompt:
              "أنت ملخّص محادثات. لخّص المحادثة التالية في 3 جمل قصيرة بالعربية فقط. لا تضف تعليقًا.",
            messages: [{ role: "user", content: text }],
          }),
        }
      );

      if (!res.ok) return null;
      const data = await res.json();
      return data.choices?.[0]?.message?.content?.trim() || null;
    } catch {
      return null;
    }
  }

  const executeRequest = useCallback(
    async (text, isRetry = false) => {
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
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: limitCheck.reason,
            id: Date.now(),
          },
        ]);
        setLoading(false);
        return;
      }

      const userMsg = { role: "user", content: text, id: Date.now() };
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
        let enhancedText = text;
        const searchResult = await searchDuckDuckGo(text);
        if (searchResult) {
          enhancedText =
            text +
            "\n\n[نتائج البحث]:\n" +
            searchResult +
            "\n\nاستخدم المعلومات دي كمرجع فقط، وردك يكون عربي بالكامل.";
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        const KEEP_FULL = 5;
        const MAX_CHARS_PER_MSG = 500;

        const allMsgs = updatedMessages.slice(0, -1);
        const recentMsgs = allMsgs.slice(-KEEP_FULL);
        const oldMsgs = allMsgs.slice(0, -KEEP_FULL);

        let summaryText = null;
        if (oldMsgs.length > 0) {
          summaryText = await summarizeOldMessages(oldMsgs, session);
        }

        const chatMessages = [];

        if (summaryText) {
          chatMessages.push({
            role: "system",
            content: `ملخص المحادثة السابقة: ${summaryText}`,
          });
        }

        recentMsgs.forEach((m) => {
          chatMessages.push({
            role: m.role,
            content:
              m.content.length > MAX_CHARS_PER_MSG
                ? m.content.slice(0, MAX_CHARS_PER_MSG) + "..."
                : m.content,
          });
        });

        abortControllerRef.current = new AbortController();

        const res = await fetch(
          "https://yfglgxuhtidfksekgabk.supabase.co/functions/v1/hyper-responder",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session?.access_token}`,
            },
            signal: abortControllerRef.current.signal,
            body: JSON.stringify({
              model: GROQ_MODEL,
              max_tokens: GROQ_MAX_TOKENS,
              temperature: GROQ_TEMPERATURE,
              systemPrompt: getPersonalityPrompt(
                currentUserRef.current?.personality || DEFAULT_PERSONALITY,
                currentUserRef.current?.gender || "ولد"
              ),
              messages: [
                ...chatMessages,
                { role: "user", content: enhancedText },
              ],
            }),
          }
        );

        const data = await res.json();

        if (!res.ok) {
          if (res.status === 401 && !isRetry) {
            showToast("⚠️ خطأ في المصادقة، حاول مرة أخرى", "error");
          } else if (
            (res.status === 429 ||
              data.error?.code === "rate_limit_exceeded") &&
            !isRetry
          ) {
            setTimeout(() => executeRequest(text, true), 1500);
            return;
          }
          throw new Error(
            data.error?.message || data.error || `خطأ: ${res.status}`
          );
        }

        const reply = cleanResponse(data.choices?.[0]?.message?.content || "");

        let i = 0;
        function type() {
          if (abortControllerRef.current === null) return;

          if (i <= reply.length) {
            setStreamingText(reply.slice(0, i));
            i++;
            setTimeout(type, 15);
          } else {
            setStreamingText("");
            setMessages((prev) => [
              ...prev,
              { role: "assistant", content: reply, id: Date.now() },
            ]);
            setLoading(false);
            abortControllerRef.current = null;
            setTimeout(() => inputRef.current?.focus(), 100);
          }
        }
        type();
      } catch (err) {
        if (err.name === "AbortError") {
          console.log("[Chat] تم إلغاء الطلب بواسطة المستخدم");
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: "⏹️ تم إيقاف التوليد.",
              id: Date.now(),
            },
          ]);
        } else {
          console.error("[Chat] خطأ في executeRequest:", err.message);
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: "❌ حدث خطأ: " + err.message,
              id: Date.now(),
            },
          ]);
        }
        setLoading(false);
        setStreamingText("");
        abortControllerRef.current = null;
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [user.id]
  );

  function handleStop() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
    setStreamingText("");
  }

  async function sendMessage(overrideText, isRetry = false) {
    if (loading && !isRetry) return;

    const text = (overrideText || input).trim();
    if (!text && !attachedFiles.length && !isRetry) return;

    const MAX_FILE_CHARS = 3000;
    let finalText = text;

    if (attachedFiles.length > 0) {
      const filesText = attachedFiles
        .map((f) => {
          const content = f.content || "";
          const truncated = content.length > MAX_FILE_CHARS;
          const body = truncated
            ? content.slice(0, MAX_FILE_CHARS) +
              "\n\n... [تم اقتصار الملف، الحجم كبير]"
            : content;
          return `\n\n📎 ${f.name}${
            truncated ? " ⚠️ (تم اقتصاره)" : ""
          }\n\`\`\`\n${body}\n\`\`\``;
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
    setMessages([
      {
        role: "assistant",
        content: "محادثة جديدة 🖤\nاتكلم، أنا هنا.",
        id: Date.now(),
      },
    ]);
    setShowMenu(false);
    setShowHistory(false);
    setInput("");
    setAttachedFiles([]);
    inputRef.current?.focus();
  }

  async function openChat(chatId) {
    await saveChatToSupabase();
    const { data } = await supabase
      .from("chats")
      .select("*")
      .eq("id", chatId)
      .single();
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

  async function deleteChat(chatId) {
    if (!window.confirm("حذف هذه المحادثة؟")) return;
    await supabase.from("chats").delete().eq("id", chatId);
    setAllChats((prev) => prev.filter((c) => c.id !== chatId));
    if (chatId === currentChatId) newChat();
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
          id: Date.now() + Math.random(),
          name: file.name,
          type: file.type,
          size: file.size,
          icon: getFileIcon(file),
          content: await readFileAsText(file),
        });
      } catch {
        newFiles.push({
          id: Date.now() + Math.random(),
          name: file.name,
          type: file.type,
          size: file.size,
          icon: "❌",
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

  // ─────────────────────────────────────────
  // Derived
  // ─────────────────────────────────────────
  const isDark = theme === "dark";

  // ─────────────────────────────────────────
  // Early return
  // ─────────────────────────────────────────
  if (!isLoaded) {
    return (
      <div
        style={{
          height: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f0f1a",
          color: "#e0e0e0",
        }}
      >
        🖤 جاري التحميل...
      </div>
    );
  }

  // ─────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────
  return (
    <div className={`container ${isDark ? "dark" : "light"}`}>
      {/* Header + Menu */}
      <div style={{ position: "relative" }}>
        <ChatHeader
          user={currentUser}
          loading={loading}
          isAdmin={isAdmin}
          showMenu={showMenu}
          onToggleMenu={() => setShowMenu(!showMenu)}
          onNewChat={newChat}
          onGoToAdmin={() => (window.location.href = "/admin")}
        />

        {showMenu && (
          <ChatMenu
            user={currentUser}
            isDark={isDark}
            onClose={() => setShowMenu(false)}
            onOpenSettings={() => {
              setShowSettings(true);
              setShowMenu(false);
            }}
            onOpenHistory={() => {
              setShowHistory(!showHistory);
              setShowMenu(false);
            }}
            onToggleTheme={() =>
              setTheme((t) => (t === "dark" ? "light" : "dark"))
            }
            onLogout={onLogout}
          />
        )}
      </div>

      {/* Token Bar */}
      <ChatTokenBar user={currentUser} />

      {/* History Panel */}
      {showHistory && (
        <ChatHistory
          chats={allChats}
          currentChatId={currentChatId}
          onClose={() => setShowHistory(false)}
          onOpenChat={openChat}
          onDeleteChat={deleteChat}
        />
      )}

      {/* Messages */}
      <ChatMessages
        messages={messages}
        streamingText={streamingText}
        loading={loading}
        isDark={isDark}
        copiedId={copiedId}
        onCopy={copyMessage}
        bottomRef={bottomRef}
      />

      {/* Input + Files */}
      <ChatInput
        input={input}
        setInput={setInput}
        loading={loading}
        streamingText={streamingText}
        attachedFiles={attachedFiles}
        onSend={() => sendMessage()}
        onStop={handleStop}
        onFileUpload={handleFileUpload}
        onRemoveFile={removeFile}
      />

      {/* Settings Modal */}
      {showSettings && (
        <ChatSettings
          user={currentUser}
          onClose={() => setShowSettings(false)}
          onSave={handleSaveSettings}
          onDeleteAccount={handleDeleteAccount}
        />
      )}
    </div>
  );
}
