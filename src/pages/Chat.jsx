// ============================================
// Chat.jsx — نسخة v10.0
// ✅ OCR تلقائي للصفحات المصورة
// ✅ detectPageRange يلتقط "لخص من 4 إلى 13"
// ✅ handlePdfPagesRequest مع تقرير مفصل لكل دفعة
// ✅ حفظ المحادثة فور رفع الملف
// ✅ رفع الملفات فور اختيارها مع شريط تقدم
// ✅ دعم TUS للملفات الكبيرة
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
import ActiveTasksNotification from "../components/chat/ActiveTasksNotification";

import { supabase } from "../lib/supabase";
import {
  GROQ_MODEL,
  GROQ_FAST_MODEL,
  GROQ_MAX_TOKENS,
  GROQ_TEMPERATURE,
  CHAT_HISTORY_LIMIT,
  SAVE_CHAT_DELAY_MS,
} from "../config/constants";
import {
  getPersonalityPrompt,
  DEFAULT_PERSONALITY,
} from "../config/personalities";
import { formatDate, copyToClipboard, debounce } from "../utils/helpers";
import {
  checkUserDailyLimit,
  getEffectiveUsedToday,
} from "../utils/validators";
import { extractTextFromImage } from "../utils/ocr";
import {
  getPdfPageCount,
  findToc,
  findSectionByTitle,
  extractPdfText,
  uploadFileToStorage,
  getFileSignedUrl,
  deleteFilesFromStorage,
  insertUserFile,
  getUserFilesByChatId,
} from "../utils/pdf";

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

    if (file.type === "application/pdf") {
      resolve("");
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

function getMessageTimestamp(msg) {
  if (msg.task?.created_at) {
    return new Date(msg.task.created_at).getTime();
  }
  if (typeof msg.id === "number") return msg.id;
  if (typeof msg.id === "string" && !isNaN(Number(msg.id))) {
    return Number(msg.id);
  }
  return 0;
}

function sortMessagesByTime(msgs) {
  return [...msgs].sort((a, b) => {
    return getMessageTimestamp(a) - getMessageTimestamp(b);
  });
}

function mergeMessages(existing, newMsgs) {
  const seen = new Set();
  const combined = [];

  for (const m of [...existing, ...newMsgs]) {
    if (!m || !m.id) continue;
    const key = String(m.id);
    if (seen.has(key)) continue;
    seen.add(key);
    combined.push(m);
  }

  return sortMessagesByTime(combined);
}

function isTocRequest(text) {
  if (!text) return false;
  const t = text.trim().toLowerCase();
  const keys = [
    "الفهرس",
    "فهرس",
    "المحتويات",
    "محتويات",
    "المحتوى",
    "contents",
    "table of contents",
    "toc",
    "index",
  ];
  return keys.some((k) => t.includes(k));
}

function detectPageRange(text) {
  if (!text) return null;

  const patterns = [
    /(?:من\s+)?(?:ال)?صفح(?:ة|ات|ه)\s*(\d{1,4})\s*(?:إلى|الى|-|–|—|حتى|لغاية)\s*(?:ال)?صفح(?:ة|ات|ه)?\s*(\d{1,4})/i,
    /(?:من\s+)?صفح(?:ة|ات)\s*(\d{1,4})\s*(?:إلى|الى|-|–|—|حتى)\s*(\d{1,4})/i,
    /(?:ال)?صفح(?:ة|ات|ه)\s*(\d{1,4})\s*[-–—]\s*(\d{1,4})/i,
    /(?:ال)?صفح(?:ة|ه)\s*(\d{1,4})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const start = parseInt(match[1], 10);
      const end = match[2] ? parseInt(match[2], 10) : start;
      if (start > 0 && end >= start && end - start < 200) {
        return { startPage: start, endPage: end };
      }
    }
  }

  const hasPageContext = /لخص|اقرأ|ملخص|محتوى|read|summar/i.test(text);
  if (hasPageContext) {
    const rangePattern =
      /(?:من\s+)?(\d{1,4})\s*(?:إلى|الى|لـ|ل|-|–|—|حتى|لغاية)\s*(\d{1,4})/i;
    const match = text.match(rangePattern);
    if (match) {
      const start = parseInt(match[1], 10);
      const end = parseInt(match[2], 10);
      if (start > 0 && end >= start && end - start < 200) {
        return { startPage: start, endPage: end };
      }
    }
  }

  return null;
}

function detectSectionRequest(text) {
  if (!text) return null;

  const patterns = [
    /((?:ال)?فصل\s+(?:ال)?[^\s،.؟!]+)/i,
    /((?:ال)?باب\s+(?:ال)?[^\s،.؟!]+)/i,
    /((?:ال)?مبحث\s+(?:ال)?[^\s،.؟!]+)/i,
    /((?:ال)?مطلب\s+(?:ال)?[^\s،.؟!]+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  return null;
}

function buildFileContextCard(files) {
  if (!files || files.length === 0) return "";

  const cards = files.map((f) => {
    if (f.type === "application/pdf") {
      let tocBrief = "";
      const content = (f.content || "").trim();
      if (content && content.length > 50) {
        const brief = content.slice(0, 1500).replace(/\s+/g, " ").trim();
        tocBrief = `\n   [فهرس/مقتطف أولي: ${brief}...]`;
      }
      return `📄 "${f.name}" — ${f.pageCount || "?"} صفحة${tocBrief}`;
    }
    if (f.type === "text/ocr") {
      return `🖼️ "${f.name}" — صورة (تم استخراج نصها، اطلب التفاصيل عند الحاجة)`;
    }
    return `📎 "${f.name}"`;
  });

  return (
    `\n\n[ملفات مرفقة بهذه المحادثة — لا تُعد إرسالها كاملة، فقط ارجع إليها عند السؤال]:\n` +
    cards.join("\n") +
    `\n[ملاحظة: الملفات الكبيرة تُقرأ عند الطلب. إذا سألك المستخدم عن جزء محدد (صفحة/فصل)، استخدم الآلية المتاحة.]`
  );
}

async function smartDetectIntent(text, session) {
  if (!text || !session?.access_token) return null;

  const systemPrompt = `أنت كاشف نية دقيق. المستخدم كتب رسالة عن ملف PDF.
مهمتك: تحديد ما يريده بالضبط.

أعد الإجابة بصيغة JSON فقط، بدون أي نص آخر:

- إذا طلب صفحات محددة:
  {"action": "pages", "start": رقم, "end": رقم}

- إذا طلب فصل/باب/مبحث/درس بالاسم:
  {"action": "section", "title": "الاسم"}

- إذا طلب الفهرس أو المحتويات:
  {"action": "toc"}

- إذا كان سؤالًا عامًا أو طلبًا آخر:
  {"action": "chat"}

قواعد:
- "من صفحة 4 إلى 10" → {"action":"pages","start":4,"end":10}
- "لخص 4 لـ 10" → {"action":"pages","start":4,"end":10}
- "لخص من 4 الي 13" → {"action":"pages","start":4,"end":13}
- "الفصل الأول" → {"action":"section","title":"الفصل الأول"}
- "اعرض الفهرس" → {"action":"toc"}
- "ما هو القانون التجاري" → {"action":"chat"}

لا تُعد إلا JSON. لا تضف شرحًا.`;

  try {
    const res = await fetch(
      "https://yfglgxuhtidfksekgabk.supabase.co/functions/v1/hyper-responder",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          model: GROQ_FAST_MODEL,
          max_tokens: 150,
          temperature: 0.1,
          systemPrompt,
          messages: [{ role: "user", content: text }],
        }),
      }
    );

    if (!res.ok) return null;
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content?.trim() || "";

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const intent = JSON.parse(jsonMatch[0]);

    if (intent.action === "pages") {
      const start = parseInt(intent.start, 10);
      const end = parseInt(intent.end, 10);
      if (start > 0 && end >= start && end - start < 200) {
        return { action: "pages", start, end };
      }
      return null;
    }

    if (intent.action === "section" && intent.title) {
      return { action: "section", title: String(intent.title).trim() };
    }

    if (intent.action === "toc") {
      return { action: "toc" };
    }

    if (intent.action === "chat") {
      return { action: "chat" };
    }

    return null;
  } catch (err) {
    console.warn("[SmartIntent] فشل:", err.message);
    return null;
  }
}

// ─────────────────────────────────────────
// Component
// ─────────────────────────────────────────
export default function Chat({ user, onLogout, isAdmin }) {
  const [allChats, setAllChats] = useState([]);

  const [currentChatId, setCurrentChatId] = useState(() => {
    return localStorage.getItem("black-last-chat-id") || null;
  });

  const [allActiveTasks, setAllActiveTasks] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [sendMode, setSendMode] = useState("chat");
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
  const [theme, setTheme] = useState("light");
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentUser, setCurrentUser] = useState(user);

  const [showScrollButton, setShowScrollButton] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);

  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const messagesRef = useRef(messages);
  const currentChatIdRef = useRef(currentChatId);
  const currentUserRef = useRef(currentUser);
  const debouncedSaveRef = useRef(null);
  const abortControllerRef = useRef(null);
  const creatingTaskRef = useRef(false);

  const autoScrollRef = useRef(true);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  useEffect(() => {
    currentChatIdRef.current = currentChatId;
    if (currentChatId) {
      localStorage.setItem("black-last-chat-id", currentChatId);
    } else {
      localStorage.removeItem("black-last-chat-id");
    }
  }, [currentChatId]);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

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
            localStorage.removeItem("black-last-chat-id");
            setTimeout(() => window.location.reload(), 2000);
          }
        }
      )
      .subscribe();
    return () => ch.unsubscribe();
  }, [user.id]);

  useEffect(() => {
    const ch = supabase
      .channel(`tasks-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const task = payload.new;
          if (!task || !task.id) return;

          const ACTIVE_STATUSES = [
            "pending",
            "planning",
            "running",
            "waiting",
            "merging",
          ];

          setAllActiveTasks((prev) => {
            const isActive = ACTIVE_STATUSES.includes(task.status);
            const exists = prev.some((t) => t.id === task.id);

            if (isActive) {
              if (exists) {
                return prev.map((t) => (t.id === task.id ? task : t));
              }
              return [...prev, task];
            }

            return prev.filter((t) => t.id !== task.id);
          });

          if (task.chat_id && task.chat_id !== currentChatIdRef.current) {
            if (task.status === "completed") {
              showToast("✅ اكتملت مهمة في محادثة أخرى.", "success");
            }
            return;
          }

          const taskMsgId = `task-${task.id}`;
          const completedMsgId = `completed-${task.id}`;
          const failedMsgId = `failed-${task.id}`;

          setMessages((prev) => {
            if (task.status === "completed" && task.result) {
              const withoutTask = prev.filter((m) => m.id !== taskMsgId);

              const alreadyAdded = withoutTask.some(
                (m) => m.id === completedMsgId
              );
              if (alreadyAdded) return withoutTask;

              return sortMessagesByTime([
                ...withoutTask,
                {
                  id: completedMsgId,
                  role: "assistant",
                  content: task.result,
                  task,
                },
              ]);
            }

            if (task.status === "failed") {
              const withoutTask = prev.filter((m) => m.id !== taskMsgId);

              const alreadyAdded = withoutTask.some(
                (m) => m.id === failedMsgId
              );
              if (alreadyAdded) return withoutTask;

              return sortMessagesByTime([
                ...withoutTask,
                {
                  id: failedMsgId,
                  role: "assistant",
                  content: `❌ فشلت المهمة: ${task.error || "خطأ غير معروف"}`,
                  task,
                },
              ]);
            }

            if (task.status === "cancelled") {
              return prev.filter((m) => m.id !== taskMsgId);
            }

            const exists = prev.some((m) => m.id === taskMsgId);

            if (exists) {
              return prev.map((m) => {
                if (m.id === taskMsgId) {
                  return { ...m, task };
                }
                return m;
              });
            } else {
              return sortMessagesByTime([
                ...prev,
                {
                  id: taskMsgId,
                  role: "assistant",
                  type: "task",
                  task,
                },
              ]);
            }
          });
        }
      )
      .subscribe();

    return () => ch.unsubscribe();
  }, [user.id]);

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
            setCurrentChatId(null);
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

  useEffect(() => {
    loadAllData();
    inputRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loading && !streamingText && isLoaded) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [loading, streamingText, isLoaded]);

  useEffect(() => {
    if (!autoScrollRef.current) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  function handleMessagesScroll(e) {
    const el = e.target;
    const distanceFromBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight;

    if (distanceFromBottom < 50) {
      if (!autoScrollRef.current) {
        autoScrollRef.current = true;
        setShowScrollButton(false);
      }
      return;
    }

    if (distanceFromBottom > 100) {
      if (autoScrollRef.current) {
        autoScrollRef.current = false;
        setShowScrollButton(true);
      }
    }
  }

  function handleScrollToBottom() {
    autoScrollRef.current = true;
    setShowScrollButton(false);
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  useEffect(() => {
    if (!isLoaded) return;
    if (!currentChatIdRef.current) return;
    const realMsgs = messages.filter(
      (m) => m.role === "user" || m.type === "task"
    );
    if (realMsgs.length === 0) return;

    if (!debouncedSaveRef.current) {
      debouncedSaveRef.current = debounce(
        () => saveChatToSupabase(),
        SAVE_CHAT_DELAY_MS
      );
    }
    debouncedSaveRef.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, isLoaded]);

  useEffect(() => {
    const handle = () => {
      if (currentChatIdRef.current) saveChatToSupabase();
    };
    window.addEventListener("beforeunload", handle);
    return () => window.removeEventListener("beforeunload", handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded]);

  async function loadAllData() {
    const chats = await loadChatsFromSupabase();
    await loadAllActiveTasks();
    await refreshUserData();
    await checkAndShowWelcome(chats);
    await restoreLastChat(chats);
    setIsLoaded(true);
  }  async function loadAllActiveTasks() {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user.id)
        .in("status", [
          "pending",
          "planning",
          "running",
          "waiting",
          "merging",
        ])
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAllActiveTasks(data || []);
    } catch (err) {
      console.error("[Chat] خطأ في تحميل المهام النشطة:", err.message);
    }
  }

  async function restoreLastChat(chats) {
    try {
      const lastChatId = localStorage.getItem("black-last-chat-id");
      if (!lastChatId) return;

      const exists = (chats || []).find((c) => c.id === lastChatId);
      if (!exists) {
        localStorage.removeItem("black-last-chat-id");
        setCurrentChatId(null);
        return;
      }

      const { data } = await supabase
        .from("chats")
        .select("*")
        .eq("id", lastChatId)
        .single();

      if (data?.messages && data.messages.length > 0) {
        setCurrentChatId(lastChatId);
        setMessages(sortMessagesByTime(data.messages));
        await loadChatTasksForChat(lastChatId);
        await restoreChatFiles(lastChatId);
      }
    } catch (err) {
      console.warn("[Chat] تعذر استعادة آخر محادثة:", err.message);
    }
  }

  async function restoreChatFiles(chatId) {
    if (!chatId) return;

    try {
      const files = await getUserFilesByChatId(chatId);
      if (!files || files.length === 0) return;

      const restoredFiles = files.map((f) => ({
        id: f.id,
        name: f.file_name,
        type: f.file_type,
        size: f.file_size,
        icon:
          f.file_type === "application/pdf"
            ? "📄"
            : f.file_type === "text/ocr"
            ? "📝"
            : "📎",
        content: f.content_text || "",
        pageCount: f.page_count,
        filePath: f.file_path,
        fromStorage: true,
      }));

      setAttachedFiles((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const toAdd = restoredFiles.filter((f) => !existingIds.has(f.id));
        return [...prev, ...toAdd];
      });
    } catch (err) {
      console.warn("[Chat] خطأ في استرجاع الملفات:", err.message);
    }
  }

  async function loadChatTasksForChat(chatId) {
    try {
      if (!chatId) return;

      const oneDayAgo = new Date(
        Date.now() - 24 * 60 * 60 * 1000
      ).toISOString();

      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user.id)
        .eq("chat_id", chatId)
        .or(
          `status.in.(pending,planning,running,waiting,merging),created_at.gte.${oneDayAgo}`
        )
        .order("created_at", { ascending: true })
        .limit(20);

      if (error) throw error;

      if (data && data.length > 0) {
        const taskMessages = data
          .map((task) => {
            if (task.status === "cancelled") return null;
            if (task.status === "completed" && task.result) {
              return {
                id: `completed-${task.id}`,
                role: "assistant",
                content: task.result,
                task,
              };
            }
            return {
              id: `task-${task.id}`,
              role: "assistant",
              type: "task",
              task,
            };
          })
          .filter(Boolean);

        setMessages((prev) => mergeMessages(prev, taskMessages));
      }
    } catch (err) {
      console.error("[Chat] خطأ في تحميل مهام المحادثة:", err.message);
    }
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

      const mapped = (chats ?? []).map((c) => ({
        id: c.id,
        title: c.title || "محادثة",
        date: c.updated_at,
        messageCount: c.messages?.length || 0,
      }));

      setAllChats(mapped);
      return mapped;
    } catch (err) {
      console.error("[Chat] خطأ في تحميل المحادثات:", err.message);
      return [];
    }
  }

  async function saveChatToSupabase() {
    const msgs = messagesRef.current;
    if (!msgs || msgs.length === 0) return;
    if (!currentChatIdRef.current) return;

    const hasRealMessages = msgs.some(
      (m) => m.role === "user" || m.type === "task"
    );
    if (!hasRealMessages) return;

    const normalMsgs = msgs.map((m) => {
      if (m.type === "task" && m.task) {
        return {
          id: m.id,
          role: "assistant",
          type: "task",
          task_id: m.task.id,
          task_status: m.task.status,
          content: `📋 مهمة: ${m.task.input?.slice(0, 100) || ""}`,
        };
      }
      return m;
    });

    const title =
      normalMsgs.find((m) => m.role === "user")?.content?.slice(0, 50) ||
      "محادثة";
    const chatId = currentChatIdRef.current;
    const now = new Date().toISOString();

    try {
      const { error } = await supabase.from("chats").upsert({
        id: chatId,
        user_id: user.id,
        title,
        messages: normalMsgs.slice(-CHAT_HISTORY_LIMIT),
        updated_at: now,
      });
      if (error) throw error;

      setAllChats((prev) => {
        const exists = prev.find((c) => c.id === chatId);
        const updated = {
          id: chatId,
          title,
          date: now,
          messageCount: normalMsgs.length,
        };
        return exists
          ? [updated, ...prev.filter((c) => c.id !== chatId)]
          : [updated, ...prev];
      });
    } catch (err) {
      console.error("[Chat] خطأ في حفظ المحادثة:", err.message);
    }
  }

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

  async function checkAndShowWelcome(chats) {
    const cu = currentUserRef.current;
    if (!cu) return;

    const today = new Date().toISOString().slice(0, 10);
    const isNewUser = !cu.last_login_date;
    const isFirstDay = cu.last_login_date !== today;
    const chatCount = (chats || []).length;

    const welcomeMessage = isNewUser
      ? `أهلاً وسهلاً يا ${
          cu.name || "صاحبي"
        } 🖤\n\nيا هلا بيك في بلاك! أنا هنا عشانك.\n\n📊 حسابك:\n- الحد اليومي: ${(
          cu.daily_limit || 5000
        ).toLocaleString()} توكن\n\nاتكلم، أنا جاهز! 🚀`
      : getWelcomeMessage(
          cu.last_login_date,
          cu.name,
          getEffectiveUsedToday(cu),
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
      localStorage.removeItem("black-last-chat-id");
      window.location.reload();
    } catch (err) {
      alert("❌ خطأ في حذف الحساب: " + err.message);
    }
  }

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
            model: GROQ_FAST_MODEL,
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

  async function uploadPendingFiles(chatId) {
    const filesToUpload = attachedFiles.filter(
      (f) => !f.fromStorage && f.rawFile
    );

    if (filesToUpload.length === 0) return attachedFiles;

    const uploadedFiles = [...attachedFiles];

    for (const f of filesToUpload) {
      try {
        setUploadProgress({
          name: f.name,
          percentage: 0,
          currentIndex: 1,
          totalFiles: filesToUpload.length,
        });

        const { path } = await uploadFileToStorage(
          f.rawFile,
          user.id,
          chatId,
          (percentage) => {
            setUploadProgress({
              name: f.name,
              percentage,
              currentIndex: 1,
              totalFiles: filesToUpload.length,
            });
          }
        );

        const record = await insertUserFile({
          user_id: user.id,
          chat_id: chatId,
          file_name: f.name,
          file_path: path,
          file_type: f.type === "application/pdf" ? "application/pdf" : "text",
          file_size: f.size || 0,
          content_text: f.content || null,
          page_count: f.pageCount || null,
        });

        const idx = uploadedFiles.findIndex((u) => u.id === f.id);
        if (idx !== -1) {
          uploadedFiles[idx] = {
            ...uploadedFiles[idx],
            filePath: path,
            fromStorage: true,
            recordId: record.id,
          };
        }
      } catch (err) {
        console.error(`[Upload] فشل رفع ${f.name}:`, err);
        showToast(`❌ فشل رفع ${f.name}`, "error");
      }
    }

    setUploadProgress(null);
    return uploadedFiles;
  }

  const executeRequest = useCallback(
    async (text, displayText) => {
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

      if (!currentChatIdRef.current) {
        const newId = Date.now().toString();
        currentChatIdRef.current = newId;
        setCurrentChatId(newId);
      }

      const limitCheck = checkUserDailyLimit(currentUserRef.current);
      if (!limitCheck.canChat) {
        setMessages((prev) =>
          sortMessagesByTime([
            ...prev,
            {
              role: "assistant",
              content: limitCheck.reason,
              id: Date.now(),
            },
          ])
        );
        setLoading(false);
        throw new Error(limitCheck.reason);
      }

      const addUserMessage = displayText !== null;
      const shownText = displayText ?? text;

      const userMsg = { role: "user", content: shownText, id: Date.now() };
      const updatedMessages = addUserMessage
        ? [...messagesRef.current, userMsg]
        : messagesRef.current;

      if (addUserMessage) {
        setMessages(updatedMessages);
      }
      setInput("");

      let filesForRequest = attachedFiles;
      if (attachedFiles.length > 0) {
        try {
          filesForRequest = await uploadPendingFiles(currentChatIdRef.current);
          setAttachedFiles(filesForRequest);
        } catch (err) {
          console.warn("[Upload] خطأ في رفع الملفات:", err);
        }
      }

      autoScrollRef.current = true;
      setShowScrollButton(false);

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

        const allMsgs = updatedMessages
          .filter((m) => m.type !== "task")
          .slice(0, -1);
        const recentMsgs = allMsgs.slice(-KEEP_FULL);
        const oldMsgs = allMsgs.slice(0, -KEEP_FULL);

        let summaryText = null;
        if (oldMsgs.length > 0) {
          summaryText = await summarizeOldMessages(oldMsgs, session);
        }

        const chatMessages = [];

        recentMsgs
          .filter((m) => m.role === "user" || m.role === "assistant")
          .forEach((m) => {
            chatMessages.push({
              role: m.role,
              content:
                m.content.length > MAX_CHARS_PER_MSG
                  ? m.content.slice(0, MAX_CHARS_PER_MSG) + "..."
                  : m.content,
            });
          });

        const fileCard = buildFileContextCard(filesForRequest);

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
              systemPrompt:
                getPersonalityPrompt(
                  currentUserRef.current?.personality || DEFAULT_PERSONALITY,
                  currentUserRef.current?.gender || "ولد"
                ) +
                (summaryText
                  ? `\n\nملخص المحادثة السابقة: ${summaryText}`
                  : ""),
              messages: [
                ...chatMessages,
                { role: "user", content: enhancedText + fileCard },
              ],
            }),
          }
        );

        const data = await res.json();

        if (!res.ok) {
          if (res.status === 401) {
            showToast("⚠️ خطأ في المصادقة، حاول تسجيل الدخول مرة أخرى", "error");
          } else if (
            res.status === 429 ||
            data.error?.code === "rate_limit_exceeded" ||
            data.error?.code === "all_keys_rate_limited"
          ) {
            const retryAfter = Number(
              data.error?.retry_after_seconds ||
                data.retry_after_seconds ||
                0
            );

            showToast(
              retryAfter > 0
                ? `⏳ جميع مفاتيح API المتاحة مشغولة مؤقتًا. حاول بعد ${retryAfter} ثانية.`
                : "⏳ جميع مفاتيح API المتاحة مشغولة مؤقتًا. حاول مرة أخرى لاحقًا.",
              "error"
            );
          }

          throw new Error(
            data.error?.message || data.error || `خطأ: ${res.status}`
          );
        }

        const reply = cleanResponse(data.choices?.[0]?.message?.content || "");

        // ✅ عرض فوري بدون تأثير كتابة
        setStreamingText("");
        setMessages((prev) =>
          sortMessagesByTime([
            ...prev,
            { role: "assistant", content: reply, id: Date.now() },
          ])
        );
        setLoading(false);
        abortControllerRef.current = null;
      } catch (err) {
        if (err.name === "AbortError") {
          console.log("[Chat] تم إلغاء الطلب بواسطة المستخدم");
          setMessages((prev) =>
            sortMessagesByTime([
              ...prev,
              {
                role: "assistant",
                content: "⏹️ تم إيقاف التوليد.",
                id: Date.now(),
              },
            ])
          );
        } else {
          console.error("[Chat] خطأ في executeRequest:", err.message);
          setMessages((prev) =>
            sortMessagesByTime([
              ...prev,
              {
                role: "assistant",
                content: "❌ حدث خطأ: " + err.message,
                id: Date.now(),
              },
            ])
          );
        }
        setLoading(false);
        setStreamingText("");
        abortControllerRef.current = null;
        // ✅ لا نرمي الخطأ — نترك handlePdfPagesRequest يكمل
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [user.id, attachedFiles]
  );

  function handleStop() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
    setStreamingText("");
  }

  async function createTask(text) {
    if (creatingTaskRef.current) {
      console.log("[Chat] createTask already in progress, skipping");
      return;
    }

    creatingTaskRef.current = true;

    try {
      if (!currentChatIdRef.current) {
        const newId = Date.now().toString();
        currentChatIdRef.current = newId;
        setCurrentChatId(newId);
      }

      const { data: taskId, error } = await supabase.rpc("create_task", {
        task_input: text,
        chat_id_input: currentChatIdRef.current,
      });

      if (error) {
        showToast("❌ " + error.message, "error");
        return;
      }

      showToast("✅ تم استلام المهمة. جاري العمل في الخلفية.");

      const { data: task, error: fetchErr } = await supabase
        .from("tasks")
        .select("*")
        .eq("id", taskId)
        .single();

      if (fetchErr || !task) {
        console.error("[Chat] فشل جلب المهمة:", fetchErr);
        return;
      }

      const taskMsgId = `task-${task.id}`;

      setMessages((prev) => {
        const exists = prev.some((m) => m.id === taskMsgId);
        if (exists) return prev;

        return sortMessagesByTime([
          ...prev,
          {
            id: taskMsgId,
            role: "assistant",
            type: "task",
            task,
          },
        ]);
      });

      setAllActiveTasks((prev) => {
        const exists = prev.some((t) => t.id === task.id);
        if (exists) return prev;
        return [task, ...prev];
      });

      setInput("");
      setAttachedFiles([]);
      setSendMode("chat");
    } catch (err) {
      console.error("[Chat] خطأ في createTask:", err);
      showToast("❌ فشل إنشاء المهمة", "error");
    } finally {
      creatingTaskRef.current = false;
    }
  }

  async function cancelTask(taskId) {
    try {
      const { error } = await supabase.rpc("cancel_task", {
        target_task_id: taskId,
      });

      if (error) throw error;

      showToast("🛑 تم إيقاف المهمة.", "info");
    } catch (err) {
      console.error("[Chat] خطأ في cancelTask:", err);
      showToast("❌ فشل إيقاف المهمة", "error");
    }
  }

  async function openTaskInChat(chatId) {
    if (chatId === currentChatIdRef.current) {
      showToast("✅ أنت بالفعل في هذه المحادثة.", "info");
      return;
    }

    if (currentChatIdRef.current) {
      await saveChatToSupabase();
    }

    const { data: chat } = await supabase
      .from("chats")
      .select("*")
      .eq("id", chatId)
      .single();

    if (!chat) {
      showToast("⚠️ المحادثة غير موجودة.", "error");
      return;
    }

    setCurrentChatId(chatId);
    setMessages(
      chat.messages && chat.messages.length > 0
        ? sortMessagesByTime(chat.messages)
        : [
            {
              role: "assistant",
              content: "محادثة جديدة 🖤\nاتكلم، أنا هنا.",
              id: Date.now(),
            },
          ]
    );

    setShowHistory(false);
    setShowMenu(false);
    setInput("");
    setAttachedFiles([]);

    await loadChatTasksForChat(chatId);
    await restoreChatFiles(chatId);

    setTimeout(() => inputRef.current?.focus(), 100);
  }

  // ✅ v10.1: handlePdfPagesRequest بدون حد 5 صفحات + حد تقني 30 صفحة
  async function handlePdfPagesRequest(pdfFile, startPage, endPage, userPrompt) {
    const totalPages = pdfFile.pageCount || endPage;
    const safeEnd = Math.min(endPage, totalPages);
    const safeStart = Math.max(1, startPage);

    if (safeStart > safeEnd) {
      showToast("⚠️ نطاق صفحات غير صالح.", "error");
      return;
    }

    const MAX_PAGES_PER_REQUEST = 30;
    const rangeSize = safeEnd - safeStart + 1;

    if (rangeSize > MAX_PAGES_PER_REQUEST) {
      showToast(
        `⚠️ النطاق كبير (${rangeSize} صفحة). سأقسّمه إلى ${Math.ceil(rangeSize / MAX_PAGES_PER_REQUEST)} أجزاء.`,
        "info"
      );
    }

    setInput("");
    setLoading(true);
    setStreamingText("");
    autoScrollRef.current = true;
    setShowScrollButton(false);

    const totalChunks = Math.ceil(rangeSize / MAX_PAGES_PER_REQUEST);
    const processedChunks = [];
    const failedChunks = [];

    try {
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const chunkStart = safeStart + chunkIndex * MAX_PAGES_PER_REQUEST;
        const chunkEnd = Math.min(
          chunkStart + MAX_PAGES_PER_REQUEST - 1,
          safeEnd
        );

        showToast(
          `🔍 استخراج الصفحات ${chunkStart}-${chunkEnd} (${chunkIndex + 1}/${totalChunks})...`,
          "info"
        );

        try {
          const pdfSource = pdfFile.filePath
            ? await getFileSignedUrl(pdfFile.filePath, 3600)
            : pdfFile.rawFile || pdfFile.pdfFile;

          const chunkText = await extractPdfText(
            pdfSource,
            chunkStart,
            chunkEnd,
            {
              enableOcr: true,
              onOcrProgress: (pageNum, from, to) => {
                const totalInChunk = to - from + 1;
                const currentIdx = pageNum - from + 1;
                showToast(
                  `🔍 الصفحة ${pageNum} صورة — OCR (${currentIdx}/${totalInChunk})...`,
                  "info"
                );
              },
            }
          );

          if (!chunkText || chunkText.trim().length < 10) {
            failedChunks.push(`${chunkStart}-${chunkEnd} (نص فارغ)`);
            setMessages((prev) =>
              sortMessagesByTime([
                ...prev,
                {
                  role: "assistant",
                  content: `⚠️ لم أستطع قراءة الصفحات ${chunkStart}-${chunkEnd} (صور بدون نص واضح).`,
                  id: Date.now() + chunkIndex,
                },
              ])
            );
            continue;
          }

          const requestText =
            `طلب المستخدم: ${userPrompt}\n\n` +
            `[ملف: ${pdfFile.name} — الصفحات ${chunkStart}-${chunkEnd} من ${totalPages}]\n` +
            `[جزء ${chunkIndex + 1} من ${totalChunks}]\n\n` +
            `النص:\n${chunkText}\n\n` +
            `نفّذ الطلب على هذا النص فقط.`;

          const displayForThisChunk = chunkIndex === 0 ? userPrompt : null;
          await executeRequest(requestText, displayForThisChunk);
          processedChunks.push(`${chunkStart}-${chunkEnd}`);
        } catch (chunkErr) {
          console.error(
            `[PDF] فشل الجزء ${chunkStart}-${chunkEnd}:`,
            chunkErr
          );
          failedChunks.push(`${chunkStart}-${chunkEnd} (${chunkErr.message})`);
          setMessages((prev) =>
            sortMessagesByTime([
              ...prev,
              {
                role: "assistant",
                content: `⚠️ تعذر معالجة الصفحات ${chunkStart}-${chunkEnd}: ${chunkErr.message}`,
                id: Date.now() + chunkIndex + 1000,
              },
            ])
          );
        }

        if (chunkIndex < totalChunks - 1) {
          await new Promise((r) => setTimeout(r, 2000));
        }
      }

      if (totalChunks > 1) {
        let summary = `\n\n---\n**📊 ملخص المعالجة:**\n`;
        summary += `- ✅ نجح: ${processedChunks.length} جزء\n`;
        if (failedChunks.length > 0) {
          summary += `- ❌ فشل: ${failedChunks.length} جزء\n`;
        }
        setMessages((prev) =>
          sortMessagesByTime([
            ...prev,
            {
              role: "assistant",
              content: summary,
              id: Date.now() + 9999,
            },
          ])
        );
      }
    } catch (err) {
      console.error("[PDF] خطأ عام:", err);
      setMessages((prev) =>
        sortMessagesByTime([
          ...prev,
          {
            role: "assistant",
            content: "❌ خطأ في قراءة PDF: " + err.message,
            id: Date.now(),
          },
        ])
      );
      showToast("❌ فشل قراءة PDF.", "error");
    } finally {
      setLoading(false);
      setStreamingText("");
    }
  }

  async function handlePdfSectionRequest(pdfFile, sectionTitle, userPrompt) {
    setLoading(true);
    setStreamingText("");
    autoScrollRef.current = true;
    setShowScrollButton(false);

    setInput("");

    try {
      showToast("🔍 جاري البحث عن الفصل في الفهرس...", "info");

      const pdfSource = pdfFile.filePath
        ? await getFileSignedUrl(pdfFile.filePath, 3600)
        : pdfFile.rawFile || pdfFile.pdfFile;

      const result = await findSectionByTitle(pdfSource, sectionTitle);

      if (!result.found) {
        setMessages((prev) =>
          sortMessagesByTime([
            ...prev,
            { role: "user", content: userPrompt, id: Date.now() },
            {
              role: "assistant",
              content:
                `⚠️ لم أجد "${sectionTitle}" في الفهرس.\n\n` +
                `يمكنك:\n- كتابة "اعرض الفهرس" لرؤية العناوين المتاحة.\n- أو تحديد أرقام صفحات مباشرة.`,
              id: Date.now() + 1,
            },
          ])
        );
        setLoading(false);
        return;
      }

      showToast(
        `✅ وُجد "${result.title}" في الصفحات ${result.startPage}-${result.endPage}`,
        "success"
      );

      setMessages((prev) =>
        sortMessagesByTime([
          ...prev,
          { role: "user", content: userPrompt, id: Date.now() },
          {
            role: "assistant",
            content: `📖 وُجد **${result.title}** في الصفحات **${result.startPage}-${result.endPage}**. جاري المعالجة على دفعات...`,
            id: Date.now() + 1,
          },
        ])
      );

      setLoading(false);

      await handlePdfPagesRequest(
        pdfFile,
        result.startPage,
        result.endPage,
        null
      );
    } catch (err) {
      console.error("[PDF] خطأ في البحث عن الفصل:", err);
      setMessages((prev) =>
        sortMessagesByTime([
          ...prev,
          {
            role: "assistant",
            content: "❌ خطأ: " + err.message,
            id: Date.now(),
          },
        ])
      );
      showToast("❌ فشل البحث عن الفصل.", "error");
      setLoading(false);
    }
  }

  async function sendMessage() {
    if (loading) return;

    if (uploadProgress) {
      showToast("⏳ انتظر حتى يكتمل رفع الملف", "info");
      return;
    }

    const hasUnuploaded = attachedFiles.some(
      (f) => !f.fromStorage && f.rawFile
    );
    if (hasUnuploaded) {
      showToast("⏳ الملف لم يُرفع بعد. انتظر قليلاً", "info");
      return;
    }

    const text = input.trim();
    if (!text && !attachedFiles.length) return;

    const hasOnlyFiles = !text && attachedFiles.length > 0;
    const hasTocRequest = isTocRequest(text);

    if (hasOnlyFiles && !hasTocRequest) {
      showToast(
        "⚠️ اكتب سؤالًا مع الملف، أو اطلب (اعرض الفهرس).",
        "info"
      );
      return;
    }

    if (sendMode === "task" && !attachedFiles.length) {
      await createTask(text);
      return;
    }

    const hasPdf = attachedFiles.some(
      (f) => f.type === "application/pdf"
    );

    if (hasPdf && text) {
      const pdfFile = attachedFiles.find(
        (f) => f.type === "application/pdf"
      );

      if (isTocRequest(text)) {
        await handleTocRequest();
        return;
      }

      const pageRange = detectPageRange(text);
      if (pageRange) {
        await handlePdfPagesRequest(
          pdfFile,
          pageRange.startPage,
          pageRange.endPage,
          text
        );
        return;
      }

      const sectionTitle = detectSectionRequest(text);
      if (sectionTitle) {
        await handlePdfSectionRequest(pdfFile, sectionTitle, text);
        return;
      }

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          showToast("🔍 جاري تحليل طلبك...", "info");

          const intent = await smartDetectIntent(text, session);

          if (intent) {
            if (intent.action === "pages") {
              await handlePdfPagesRequest(
                pdfFile,
                intent.start,
                intent.end,
                text
              );
              return;
            }

            if (intent.action === "section") {
              await handlePdfSectionRequest(pdfFile, intent.title, text);
              return;
            }

            if (intent.action === "toc") {
              await handleTocRequest();
              return;
            }
          }
        }
      } catch (err) {
        console.warn("[SmartIntent] فشل:", err.message);
      }
    }

    const MAX_FILE_CHARS = 100000;

    let sendText = text;
    let displayText = text;

    if (attachedFiles.length > 0) {
      const fileNamesLine = attachedFiles
        .map((f) => `📎 ${f.name}`)
        .join(" ");

      displayText = text ? `${text}\n${fileNamesLine}` : fileNamesLine;

      const textFiles = attachedFiles.filter(
        (f) => f.type !== "application/pdf"
      );

      const filesFullText = textFiles
        .map((f) => {
          const content = f.content || "";
          const truncated = content.length > MAX_FILE_CHARS;
          const body = truncated
            ? content.slice(0, MAX_FILE_CHARS) +
              "\n\n... [تم اقتصار الملف: تجاوز 100,000 حرف]"
            : content;
          return `\n\n📎 ${f.name}${
            truncated ? " ⚠️ (تم اقتصاره)" : ""
          }\n\`\`\`\n${body}\n\`\`\``;
        })
        .join("");

      sendText = (text || "الملفات المرفقة:") + filesFullText;

      const pdfFiles = attachedFiles.filter(
        (f) => f.type === "application/pdf"
      );
      if (pdfFiles.length > 0) {
        const pdfInfo = pdfFiles
          .map((f) => `"${f.name}" (${f.pageCount || "?"} صفحة)`)
          .join(", ");
        sendText +=
          `\n\n[معلومات ملفات PDF المرفقة: ${pdfInfo}. لم يُقرأ محتواها بعد. ` +
          `اطلب من المستخدم كتابة (اعرض الفهرس)، أو تحديد أرقام صفحات، ` +
          `أو اسم فصل/درس.]`;
      }
    }

    try {
      await executeRequest(sendText, displayText);
    } catch (err) {
      // الخطأ تم عرضه بالفعل
    }
  }

  async function handleTocRequest() {
    const pdfFile = attachedFiles.find(
      (f) => f.type === "application/pdf"
    );
    if (!pdfFile) {
      showToast("⚠️ لم يُعثر على ملف PDF.", "error");
      return;
    }

    const userMsgId = Date.now();
    const userMsg = {
      role: "user",
      content: input.trim() || "اعرض الفهرس",
      id: userMsgId,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setStreamingText("");

    autoScrollRef.current = true;
    setShowScrollButton(false);

    try {
      showToast("🔍 جاري البحث عن الفهرس...", "info");

      const pdfSource = pdfFile.filePath
        ? await getFileSignedUrl(pdfFile.filePath, 3600)
        : pdfFile.rawFile || pdfFile.pdfFile;

      const result = await findToc(pdfSource);

      if (result.found) {
        const tocText = `📋 **فهرس الملف: ${pdfFile.name}**\n\n${result.text}`;
        setMessages((prev) =>
          sortMessagesByTime([
            ...prev,
            {
              role: "assistant",
              content: tocText,
              id: Date.now(),
            },
          ])
        );
        showToast("✅ تم العثور على الفهرس.", "success");
      } else {
        setMessages((prev) =>
          sortMessagesByTime([
            ...prev,
            {
              role: "assistant",
              content:
                "⚠️ لم يُعثر على فهرس في هذا الملف.\n\nيمكنك تحديد أرقام الصفحات التي تريدها.",
              id: Date.now(),
            },
          ])
        );
        showToast("⚠️ لا يوجد فهرس.", "info");
      }
    } catch (err) {
      console.error("[PDF] خطأ في قراءة الفهرس:", err);
      setMessages((prev) =>
        sortMessagesByTime([
          ...prev,
          {
            role: "assistant",
            content: "❌ خطأ في قراءة PDF: " + err.message,
            id: Date.now(),
          },
        ])
      );
      showToast("❌ فشل قراءة PDF.", "error");
    } finally {
      setLoading(false);
      setStreamingText("");
    }
  }

  async function newChat() {
    if (currentChatIdRef.current) {
      await saveChatToSupabase();
    }
    setCurrentChatId(null);
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

    autoScrollRef.current = true;
    setShowScrollButton(false);

    inputRef.current?.focus();
  }

  async function openChat(chatId) {
    if (currentChatIdRef.current) {
      await saveChatToSupabase();
    }
    const { data } = await supabase
      .from("chats")
      .select("*")
      .eq("id", chatId)
      .single();
    if (data?.messages) {
      setCurrentChatId(chatId);
      setMessages(sortMessagesByTime(data.messages));
      await loadChatTasksForChat(chatId);
      await restoreChatFiles(chatId);
    }
    setShowHistory(false);
    setShowMenu(false);
    setInput("");
    setAttachedFiles([]);

    autoScrollRef.current = true;
    setShowScrollButton(false);

    inputRef.current?.focus();
  }

  async function deleteChat(chatId) {
    if (!window.confirm("حذف هذه المحادثة؟")) return;

    try {
      try {
        const files = await getUserFilesByChatId(chatId);
        if (files && files.length > 0) {
          const paths = files.map((f) => f.file_path).filter(Boolean);
          if (paths.length > 0) {
            await deleteFilesFromStorage(paths);
          }
        }
      } catch (err) {
        console.warn("[Chat] خطأ في حذف الملفات من Storage:", err.message);
      }

      const { error: cancelErr } = await supabase
        .from("tasks")
        .update({
          status: "cancelled",
          error: "تم إلغاء المهمة بحذف المحادثة",
          completed_at: new Date().toISOString(),
        })
        .eq("chat_id", chatId)
        .in("status", [
          "pending",
          "planning",
          "running",
          "waiting",
          "merging",
        ]);

      if (cancelErr) {
        console.warn("[Chat] خطأ في إلغاء المهام:", cancelErr.message);
      }

      const { error: chatErr } = await supabase
        .from("chats")
        .delete()
        .eq("id", chatId);

      if (chatErr) {
        console.warn("[Chat] خطأ في حذف المحادثة:", chatErr.message);
      }

      setAllChats((prev) => prev.filter((c) => c.id !== chatId));
      setAllActiveTasks((prev) =>
        prev.filter((t) => t.chat_id !== chatId)
      );

      if (chatId === currentChatIdRef.current) {
        setCurrentChatId(null);
        localStorage.removeItem("black-last-chat-id");
        setMessages([
          {
            role: "assistant",
            content: "محادثة جديدة 🖤\nاتكلم، أنا هنا.",
            id: Date.now(),
          },
        ]);
        setAttachedFiles([]);
      }

      showToast("✅ تم حذف المحادثة وكل مهامها وملفاتها", "success");
    } catch (err) {
      console.error("[Chat] خطأ في حذف المحادثة:", err);
      showToast("❌ فشل حذف المحادثة", "error");
    }
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

    if (!currentChatIdRef.current) {
      const newId = Date.now().toString();
      currentChatIdRef.current = newId;
      setCurrentChatId(newId);
    }

    setLoading(true);
    const newFiles = [];

    try {
      for (const file of files) {
        if (file.type === "application/pdf") {
          try {
            showToast(`📄 جاري قراءة ${file.name}...`, "info");
            const pageCount = await getPdfPageCount(file);
            newFiles.push({
              id: Date.now() + Math.random(),
              name: file.name,
              type: "application/pdf",
              size: file.size,
              icon: "📄",
              content: "",
              rawFile: file,
              pdfFile: file,
              pageCount,
              fromStorage: false,
            });
            showToast(`✅ تم استلام ${file.name} (${pageCount} صفحة).`, "success");
          } catch (err) {
            console.error("[PDF] خطأ:", err);
            showToast(`❌ فشل قراءة ${file.name}`, "error");
          }
          continue;
        }

        if (file.type.startsWith("image/")) {
          try {
            showToast(`🔍 جاري استخراج النص من ${file.name}...`, "info");
            const ocrText = await extractTextFromImage(file);
            if (!ocrText || ocrText.length < 3) {
              showToast(`⚠️ لم يتم العثور على نص واضح في ${file.name}`, "error");
              continue;
            }
            newFiles.push({
              id: Date.now() + Math.random(),
              name: file.name,
              type: "text/ocr",
              size: file.size,
              icon: "📝",
              content: `[نص مستخرج من صورة: ${file.name}]\n\n${ocrText}`,
              rawFile: file,
              fromStorage: false,
            });
            showToast(`✅ تم استخراج النص من ${file.name}`, "success");
          } catch (err) {
            console.error("[OCR] خطأ:", err);
            showToast(`❌ فشل استخراج النص من ${file.name}`, "error");
          }
          continue;
        }

        try {
          newFiles.push({
            id: Date.now() + Math.random(),
            name: file.name,
            type: file.type,
            size: file.size,
            icon: getFileIcon(file),
            content: await readFileAsText(file),
            rawFile: file,
            fromStorage: false,
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

      if (newFiles.length === 0) {
        setLoading(false);
        return;
      }

      setAttachedFiles((prev) => [...prev, ...newFiles]);

      for (let i = 0; i < newFiles.length; i++) {
        const f = newFiles[i];
        if (!f.rawFile) continue;

        try {
          setUploadProgress({
            name: f.name,
            percentage: 0,
            currentIndex: i + 1,
            totalFiles: newFiles.length,
          });

          const { path } = await uploadFileToStorage(
            f.rawFile,
            user.id,
            currentChatIdRef.current,
            (percentage) => {
              setUploadProgress({
                name: f.name,
                percentage,
                currentIndex: i + 1,
                totalFiles: newFiles.length,
              });
            }
          );

          const record = await insertUserFile({
            user_id: user.id,
            chat_id: currentChatIdRef.current,
            file_name: f.name,
            file_path: path,
            file_type: f.type === "application/pdf" ? "application/pdf" : "text",
            file_size: f.size || 0,
            content_text: f.content || null,
            page_count: f.pageCount || null,
          });

          setAttachedFiles((prev) =>
            prev.map((u) =>
              u.id === f.id
                ? {
                    ...u,
                    filePath: path,
                    fromStorage: true,
                    recordId: record.id,
                  }
                : u
            )
          );
        } catch (err) {
          console.error(`[Upload] فشل رفع ${f.name}:`, err);
          showToast(`❌ فشل رفع ${f.name}`, "error");
          setAttachedFiles((prev) => prev.filter((u) => u.id !== f.id));
        }
      }

      showToast("✅ اكتمل رفع الملف. يمكنك الإرسال الآن.", "success");

      if (currentChatIdRef.current) {
        try {
          const now = new Date().toISOString();
          const { error: chatSaveErr } = await supabase.from("chats").upsert({
            id: currentChatIdRef.current,
            user_id: user.id,
            title: "محادثة بالملفات",
            messages: messagesRef.current.slice(-CHAT_HISTORY_LIMIT),
            updated_at: now,
          });
          if (chatSaveErr) {
            console.warn("[Chat] فشل حفظ المحادثة بعد الرفع:", chatSaveErr.message);
          } else {
            setAllChats((prev) => {
              const exists = prev.find((c) => c.id === currentChatIdRef.current);
              const updated = {
                id: currentChatIdRef.current,
                title: "محادثة بالملفات",
                date: now,
                messageCount: messagesRef.current.length,
              };
              return exists
                ? [updated, ...prev.filter((c) => c.id !== currentChatIdRef.current)]
                : [updated, ...prev];
            });
          }
        } catch (err) {
          console.warn("[Chat] خطأ في حفظ المحادثة:", err);
        }
      }
    } catch (err) {
      console.error("[handleFileUpload] خطأ عام:", err);
      showToast("❌ خطأ في معالجة الملفات", "error");
    } finally {
      setUploadProgress(null);
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function removeFile(fileId) {
    const fileToRemove = attachedFiles.find((f) => f.id === fileId);
    if (fileToRemove?.filePath) {
      deleteFilesFromStorage([fileToRemove.filePath]).catch((err) =>
        console.warn("[Chat] فشل حذف الملف من Storage:", err.message)
      );
      supabase
        .from("user_files")
        .delete()
        .eq("file_path", fileToRemove.filePath)
        .then(({ error }) => {
          if (error) console.warn("[Chat] فشل حذف السجل:", error.message);
        });
    }

    setAttachedFiles((prev) => prev.filter((f) => f.id !== fileId));
  }

  const isDark = theme === "dark";

  if (!isLoaded) {
    return (
      <div
        style={{
          height: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f4f6fb",
          color: "#1e1b4b",
        }}
      >
        🖤 جاري التحميل...
      </div>
    );
  }

  return (
    <div className={`container ${isDark ? "dark" : "light"}`}>
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

      <ChatTokenBar user={currentUser} />

      <ActiveTasksNotification
        tasks={allActiveTasks}
        currentChatId={currentChatId}
        onOpenTask={openTaskInChat}
      />

      {showHistory && (
        <ChatHistory
          chats={allChats}
          currentChatId={currentChatId}
          onClose={() => setShowHistory(false)}
          onOpenChat={openChat}
          onDeleteChat={deleteChat}
        />
      )}

      <ChatMessages
        messages={messages}
        streamingText={streamingText}
        loading={loading}
        isDark={isDark}
        copiedId={copiedId}
        onCopy={copyMessage}
        onCancelTask={cancelTask}
        bottomRef={bottomRef}
        showScrollButton={showScrollButton}
        onScrollToBottom={handleScrollToBottom}
        onScroll={handleMessagesScroll}
      />

      {uploadProgress && (
        <div
          style={{
            position: "fixed",
            bottom: "100px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "#1e1b4b",
            color: "#fff",
            padding: "14px 20px",
            borderRadius: "14px",
            zIndex: 9998,
            minWidth: "300px",
            maxWidth: "90vw",
            boxShadow: "0 6px 20px rgba(0,0,0,0.35)",
            direction: "rtl",
            border: "1px solid #4c1d95",
          }}
        >
          <div
            style={{
              fontSize: "13px",
              marginBottom: "8px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            ⬆️ جاري رفع ({uploadProgress.currentIndex}/
            {uploadProgress.totalFiles}): {uploadProgress.name}
          </div>
          <div
            style={{
              height: "10px",
              background: "#374151",
              borderRadius: "5px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${uploadProgress.percentage}%`,
                background: "linear-gradient(90deg, #10b981, #3b82f6)",
                transition: "width 0.3s ease",
              }}
            />
          </div>
          <div
            style={{
              fontSize: "11px",
              marginTop: "6px",
              color: "#a5b4fc",
              textAlign: "left",
            }}
          >
            {uploadProgress.percentage}% مكتمل
          </div>
        </div>
      )}

      <ChatInput
        input={input}
        setInput={setInput}
        loading={loading}
        streamingText={streamingText}
        attachedFiles={attachedFiles}
        sendMode={sendMode}
        onSend={sendMessage}
        onStop={handleStop}
        onFileUpload={handleFileUpload}
        onRemoveFile={removeFile}
        onToggleMode={() =>
          setSendMode((m) => (m === "chat" ? "task" : "chat"))
        }
      />

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
  
