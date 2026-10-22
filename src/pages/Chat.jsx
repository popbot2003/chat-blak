// ============================================
// Chat.jsx — نسخة v16.0 (النهائية)
// ✅ useFileUpload يدير attachedFiles بنفسه
// ✅ ChatInput يعرض الملفات دائماً
// ✅ شريط تقدم دائري
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
} from "../config/constants";
import {
  getChatSystemPrompt,
  SUMMARIZE_SYSTEM_PROMPT,
} from "../config/prompts";
import {
  searchDuckDuckGo,
  cleanResponse,
  showToast,
  sortMessagesByTime,
  isTocRequest,
  detectPageRange,
  detectSectionRequest,
  buildFileContextCard,
} from "../utils/chatHelpers";
import { copyToClipboard } from "../utils/helpers";
import { smartDetectIntent } from "../utils/intentDetection";
import { checkUserDailyLimit } from "../utils/validators";

// ─── Hooks ───
import { useFileUpload } from "../hooks/useFileUpload";
import { usePdfProcessing } from "../hooks/usePdfProcessing";
import { useLongForm } from "../hooks/useLongForm";
import { useTasks } from "../hooks/useTasks";
import { useChats } from "../hooks/useChats";

export default function Chat({ user, onLogout, isAdmin }) {
  // ═══════════════════════════════════════════
  // 1. State
  // ═══════════════════════════════════════════
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
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentUser, setCurrentUser] = useState(user);
  const [showHistory, setShowHistory] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [sendMode, setSendMode] = useState("fast");
  const [showScrollButton, setShowScrollButton] = useState(false);

  const [currentChatId, setCurrentChatId] = useState(() => {
    return localStorage.getItem("black-last-chat-id") || null;
  });

  // ─── Refs ───
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const messagesRef = useRef(messages);
  const currentUserRef = useRef(currentUser);
  const currentChatIdRef = useRef(currentChatId);
  const abortControllerRef = useRef(null);
  const autoScrollRef = useRef(true);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);
  useEffect(() => {
    currentChatIdRef.current = currentChatId;
    if (currentChatId) {
      localStorage.setItem("black-last-chat-id", currentChatId);
    } else {
      localStorage.removeItem("black-last-chat-id");
    }
  }, [currentChatId]);

  // ═══════════════════════════════════════════
  // 2. Realtime
  // ═══════════════════════════════════════════
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

  // ═══════════════════════════════════════════
  // 3. Hooks
  // ═══════════════════════════════════════════

  // 3.1 useFileUpload (يدير attachedFiles بنفسه)
  const fileUploadHook = useFileUpload({
    user,
    currentChatId,
    setCurrentChatId,
    messagesRef,
    setAllChats: () => {},
  });

  // 3.2 useTasks
  const tasksHook = useTasks({
    user,
    currentChatId,
    setCurrentChatId,
    messagesRef,
    setMessages,
    setInput,
    setAttachedFiles: fileUploadHook.setAttachedFiles,
    setSendMode,
    saveChatToSupabase: async () => {},
  });

  // 3.3 useChats
  const chatsHook = useChats({
    user,
    messagesRef,
    setMessages,
    setInput,
    setAttachedFiles: fileUploadHook.setAttachedFiles,
    setLongFormContext: null,
    currentChatId,
    setCurrentChatId,
    loadChatTasksForChat: tasksHook.loadChatTasksForChat,
    restoreChatFiles: fileUploadHook.restoreChatFiles,
  });

  // 3.4 useLongForm
  const longFormHook = useLongForm({
    user,
    currentUser,
    messagesRef,
    setMessages,
    setLoading,
    setStreamingText,
    setInput,
    sortMessagesByTime,
  });

  // ═══════════════════════════════════════════
  // 4. executeRequest
  // ═══════════════════════════════════════════
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

      let filesForRequest = fileUploadHook.attachedFiles;
      if (fileUploadHook.attachedFiles.some((f) => !f.isUploaded && f.rawFile)) {
        try {
          filesForRequest = await fileUploadHook.uploadPendingFiles(
            currentChatIdRef.current
          );
          fileUploadHook.setAttachedFiles(filesForRequest);
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
                getChatSystemPrompt(
                  currentUserRef.current?.personality,
                  currentUserRef.current?.gender
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
      }
    },
    [user.id, fileUploadHook.attachedFiles]
  );

  // ═══════════════════════════════════════════
  // 5. usePdfProcessing
  // ═══════════════════════════════════════════
  const pdfHook = usePdfProcessing({
    user,
    attachedFiles: fileUploadHook.attachedFiles,
    setAttachedFiles: fileUploadHook.setAttachedFiles,
    executeRequest,
    setMessages,
    setLoading,
    setStreamingText,
    setInput,
    sortMessagesByTime,
    messagesRef,
  });

  // ═══════════════════════════════════════════
  // 6. summarizeOldMessages
  // ═══════════════════════════════════════════
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
            systemPrompt: SUMMARIZE_SYSTEM_PROMPT,
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

  // ═══════════════════════════════════════════
  // 7. refreshUserData
  // ═══════════════════════════════════════════
  const refreshUserData = useCallback(async () => {
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
  }, [user.id]);

  // ═══════════════════════════════════════════
  // 8. loadAllData
  // ═══════════════════════════════════════════
  useEffect(() => {
    (async () => {
      const chats = await chatsHook.loadChatsFromSupabase();
      await tasksHook.loadAllActiveTasks();
      await refreshUserData();
      await chatsHook.restoreLastChat(chats);
      setIsLoaded(true);
    })();
    inputRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── التركيز التلقائي ───
  useEffect(() => {
    if (!loading && !streamingText && isLoaded) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [loading, streamingText, isLoaded]);

  // ─── التمرير التلقائي ───
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
    // ═══════════════════════════════════════════
  // 9. sendMessage
  // ═══════════════════════════════════════════
  async function sendMessage() {
    if (loading) return;

    if (fileUploadHook.uploadProgress) {
      showToast("⏳ انتظر حتى يكتمل رفع الملف", "info");
      return;
    }

    const hasUnuploaded = fileUploadHook.attachedFiles.some(
      (f) => !f.isUploaded && f.rawFile
    );
    if (hasUnuploaded) {
      showToast("⏳ الملف لم يُرفع بعد. انتظر قليلاً", "info");
      return;
    }

    const text = input.trim();
    if (!text && !fileUploadHook.attachedFiles.length) return;

    // التحكم في الوضع السريع
    if (longFormHook.longFormContext) {
      const lower = text.toLowerCase();
      if (lower === "ابدأ" || lower === "التالي" || lower === "next") {
        setInput("");
        await longFormHook.writeNextPart();
        return;
      }
      if (lower === "الغاء" || lower === "إلغاء" || lower === "cancel") {
        setInput("");
        longFormHook.cancelLongForm();
        return;
      }
    }

    const hasOnlyFiles = !text && fileUploadHook.attachedFiles.length > 0;
    const hasTocRequest = isTocRequest(text);

    if (hasOnlyFiles && !hasTocRequest) {
      showToast("⚠️ اكتب سؤالًا مع الملف، أو اطلب (اعرض الفهرس).", "info");
      return;
    }

    if (sendMode === "task" && !fileUploadHook.attachedFiles.length) {
      await tasksHook.createTask(text);
      return;
    }

    const hasPdf = fileUploadHook.attachedFiles.some(
      (f) => f.type === "application/pdf"
    );

    if (hasPdf && text) {
      const pdfFile = fileUploadHook.attachedFiles.find(
        (f) => f.type === "application/pdf"
      );

      if (isTocRequest(text)) {
        await pdfHook.handleTocRequest();
        return;
      }

      const pageRange = detectPageRange(text);
      if (pageRange) {
        await pdfHook.handlePdfPagesRequest(
          pdfFile,
          pageRange.startPage,
          pageRange.endPage,
          text
        );
        return;
      }

      const sectionTitle = detectSectionRequest(text);
      if (sectionTitle) {
        await pdfHook.handlePdfSectionRequest(pdfFile, sectionTitle, text);
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
              await pdfHook.handlePdfPagesRequest(
                pdfFile,
                intent.start,
                intent.end,
                text
              );
              return;
            }
            if (intent.action === "section") {
              await pdfHook.handlePdfSectionRequest(pdfFile, intent.title, text);
              return;
            }
            if (intent.action === "toc") {
              await pdfHook.handleTocRequest();
              return;
            }
          }
        }
      } catch (err) {
        console.warn("[SmartIntent] فشل:", err.message);
      }
    }

    // الوضع السريع
    if (sendMode === "fast" && !hasPdf) {
      const isLongFormRequest =
        /اكتب|لخص|أنشئ|اصنع|طور|صمم|article|essay|story|write|create/i.test(
          text
        ) && text.length > 100;

      if (isLongFormRequest) {
        await longFormHook.handleLongFormRequest(text);
        return;
      }
    }

    const MAX_FILE_CHARS = 100000;
    let sendText = text;
    let displayText = text;

    if (fileUploadHook.attachedFiles.length > 0) {
      const fileNamesLine = fileUploadHook.attachedFiles
        .map((f) => `📎 ${f.name}`)
        .join(" ");

      displayText = text ? `${text}\n${fileNamesLine}` : fileNamesLine;

      const textFiles = fileUploadHook.attachedFiles.filter(
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

      const pdfFiles = fileUploadHook.attachedFiles.filter(
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

  // ═══════════════════════════════════════════
  // 10. handleStop
  // ═══════════════════════════════════════════
  function handleStop() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
    setStreamingText("");
  }

  // ═══════════════════════════════════════════
  // 11. copyMessage
  // ═══════════════════════════════════════════
  function copyMessage(content, id) {
    copyToClipboard(content, () => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  // ═══════════════════════════════════════════
  // 12. Settings
  // ═══════════════════════════════════════════
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

  // ═══════════════════════════════════════════
  // 13. Render
  // ═══════════════════════════════════════════
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
          onNewChat={chatsHook.newChat}
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
        tasks={tasksHook.allActiveTasks}
        currentChatId={currentChatId}
        onOpenTask={tasksHook.openTaskInChat}
      />

      {showHistory && (
        <ChatHistory
          chats={chatsHook.allChats}
          currentChatId={currentChatId}
          onClose={() => setShowHistory(false)}
          onOpenChat={chatsHook.openChat}
          onDeleteChat={chatsHook.deleteChat}
        />
      )}

      <ChatMessages
        messages={messages}
        streamingText={streamingText}
        loading={loading}
        isDark={isDark}
        copiedId={copiedId}
        onCopy={copyMessage}
        onCancelTask={tasksHook.cancelTask}
        bottomRef={bottomRef}
        showScrollButton={showScrollButton}
        onScrollToBottom={handleScrollToBottom}
        onScroll={handleMessagesScroll}
      />

      <ChatInput
        input={input}
        setInput={setInput}
        loading={loading}
        streamingText={streamingText}
        attachedFiles={fileUploadHook.attachedFiles}
        sendMode={sendMode}
        onSend={sendMessage}
        onStop={handleStop}
        onFileUpload={fileUploadHook.handleFileUpload}
        onRemoveFile={fileUploadHook.removeFile}
        onToggleMode={() =>
          setSendMode((m) => (m === "fast" ? "task" : "fast"))
        }
        uploadProgress={fileUploadHook.uploadProgress}
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
