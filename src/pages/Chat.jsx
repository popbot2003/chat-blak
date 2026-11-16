// ============================================
// Chat.jsx — بلاك 🖤 v17.0
// ✅ نظام الذاكرة الجديد
// ✅ Sliding Window بدل summarizeOldMessages
// ✅ DuckDuckGo بس لما يُطلب
// ✅ Cache لفحص is_blocked
// ✅ LoadingScreen بدل inline loading
// ✅ صفر inline styles
// ============================================

import { useState, useRef, useEffect, useCallback } from "react";
import "../App.css";

import ChatHeader              from "../components/chat/ChatHeader";
import ChatTokenBar            from "../components/chat/ChatTokenBar";
import ChatMenu                from "../components/chat/ChatMenu";
import ChatHistory             from "../components/chat/ChatHistory";
import ChatMessages            from "../components/chat/ChatMessages";
import ChatSettings            from "../components/chat/ChatSettings";
import ChatInput               from "../components/chat/ChatInput";
import ActiveTasksNotification from "../components/chat/ActiveTasksNotification";
import LoadingScreen           from "../components/LoadingScreen";

import { supabase } from "../lib/supabase";
import {
  GROQ_MODEL,
  GROQ_MAX_TOKENS,
  GROQ_TEMPERATURE,
} from "../config/constants";
import { getPersonalityPrompt } from "../config/personalities";
import {
  needsWebSearch,
  searchDuckDuckGo,
  cleanResponse,
  showToast,
  sortMessagesByTime,
  isTocRequest,
  detectPageRange,
  detectSectionRequest,
  buildFileContextCard,
  buildContextWindow,
  checkIsBlocked,
  loadMemories,
  extractAndSaveMemory,
} from "../utils/chatHelpers";
import { copyToClipboard }   from "../utils/helpers";
import { smartDetectIntent } from "../utils/intentDetection";
import { checkUserDailyLimit } from "../utils/validators";

// ─── Hooks ───
import { useFileUpload }    from "../hooks/useFileUpload";
import { usePdfProcessing } from "../hooks/usePdfProcessing";
import { useLongForm }      from "../hooks/useLongForm";
import { useTasks }         from "../hooks/useTasks";
import { useChats }         from "../hooks/useChats";


export default function Chat({ user, onLogout, isAdmin }) {

  // ═══════════════════════════════════════════
  // 1. State
  // ═══════════════════════════════════════════

  const [messages, setMessages] = useState([
    {
      role:    "assistant",
      content: "أهلاً.. أنا بلاك 🖤\nاتكلم، أنا هنا. تقدر ترفع ملفات كمان 📎",
      id:      Date.now(),
    },
  ]);

  const [input, setInput]               = useState("");
  const [loading, setLoading]           = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [copiedId, setCopiedId]         = useState(null);
  const [isLoaded, setIsLoaded]         = useState(false);
  const [currentUser, setCurrentUser]   = useState(user);
  const [showHistory, setShowHistory]   = useState(false);
  const [showMenu, setShowMenu]         = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [sendMode, setSendMode]         = useState("fast");
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [messageCount, setMessageCount] = useState(0);

  // ✅ theme من localStorage — يمنع الـ flash
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("black-theme") || "dark";
  });

  // ✅ الذاكرة
  const [memories, setMemories] = useState([]);

  const [currentChatId, setCurrentChatId] = useState(() => {
    return localStorage.getItem("black-last-chat-id") || null;
  });

  // ─── Refs ───
  const bottomRef         = useRef(null);
  const inputRef          = useRef(null);
  const messagesRef       = useRef(messages);
  const currentUserRef    = useRef(currentUser);
  const currentChatIdRef  = useRef(currentChatId);
  const abortControllerRef = useRef(null);
  const autoScrollRef     = useRef(true);

  useEffect(() => { messagesRef.current    = messages;    }, [messages]);
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);

  useEffect(() => {
    currentChatIdRef.current = currentChatId;
    if (currentChatId) localStorage.setItem("black-last-chat-id", currentChatId);
    else               localStorage.removeItem("black-last-chat-id");
  }, [currentChatId]);

  // ✅ حفظ الـ theme في localStorage
  useEffect(() => {
    localStorage.setItem("black-theme", theme);
  }, [theme]);


  // ═══════════════════════════════════════════
  // 2. Realtime — دمج الـ channels في واحد
  // ═══════════════════════════════════════════

  useEffect(() => {
    const ch = supabase
      .channel(`user-profile-${user.id}`)
      .on(
        "postgres_changes",
        {
          event:  "UPDATE",
          schema: "public",
          table:  "profiles",
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          setCurrentUser(payload.new);
          localStorage.setItem("black-user", JSON.stringify(payload.new));
        }
      )
      .on(
        "postgres_changes",
        {
          event:  "DELETE",
          schema: "public",
          table:  "profiles",
        },
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

  const fileUploadHook = useFileUpload({
    user,
    currentChatIdRef,
    messagesRef,
    setAllChats: () => {},
  });

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

  const chatsHook = useChats({
    user,
    messagesRef,
    setMessages,
    setInput,
    setAttachedFiles:  fileUploadHook.setAttachedFiles,
    setLongFormContext: null,
    currentChatId,
    setCurrentChatId,
    loadChatTasksForChat: tasksHook.loadChatTasksForChat,
    restoreChatFiles:    fileUploadHook.restoreChatFiles,
  });

  // ✅ ref للـ triggerAutoSave — نستخدمه داخل executeRequest
  const triggerAutoSaveRef = useRef(null);
  useEffect(() => {
    triggerAutoSaveRef.current = chatsHook.triggerAutoSave;
  }, [chatsHook.triggerAutoSave]);

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
  // 4. تحميل الذاكرة عند بداية كل محادثة
  // ═══════════════════════════════════════════

  useEffect(() => {
    if (!user?.id) return;
    loadMemories(user.id).then((mems) => setMemories(mems));
  }, [user.id]);


  // ═══════════════════════════════════════════
  // 5. executeRequest — محسّن
  // ═══════════════════════════════════════════

  const executeRequest = useCallback(
    async (text, displayText) => {

      // ✅ فحص is_blocked مع Cache — بدل DB query في كل رسالة
      const isBlocked = await checkIsBlocked(user.id);
      if (isBlocked) {
        showToast("⚠️ تم حظر حسابك بواسطة المدير.", "error");
        localStorage.removeItem("black-user");
        setTimeout(() => window.location.reload(), 2000);
        return;
      }

      if (!currentChatIdRef.current) {
        setCurrentChatId(Date.now().toString());
      }

      const limitCheck = checkUserDailyLimit(currentUserRef.current);
      if (!limitCheck.canChat) {
        setMessages((prev) =>
          sortMessagesByTime([
            ...prev,
            { role: "assistant", content: limitCheck.reason, id: Date.now() },
          ])
        );
        setLoading(false);
        throw new Error(limitCheck.reason);
      }

      const addUserMessage = displayText !== null;
      const shownText      = displayText ?? text;
      const userMsg        = { role: "user", content: shownText, id: Date.now() };
      const updatedMessages = addUserMessage
        ? [...messagesRef.current, userMsg]
        : messagesRef.current;

      if (addUserMessage) setMessages(updatedMessages);
      setInput("");

      // رفع الملفات المعلقة
      let filesForRequest = fileUploadHook.attachedFiles;
      if (fileUploadHook.attachedFiles.some((f) => !f.isUploaded && f.rawFile)) {
        try {
          filesForRequest = await fileUploadHook.uploadPendingFiles(currentChatIdRef.current);
          fileUploadHook.setAttachedFiles(filesForRequest);
        } catch (err) {
          console.warn("[Upload] خطأ:", err);
        }
      }

      autoScrollRef.current = true;
      setShowScrollButton(false);
      setLoading(true);
      setStreamingText("");

      try {
        // ✅ DuckDuckGo بس لما يُطلب — مش على كل رسالة
        let enhancedText = text;
        if (needsWebSearch(text)) {
          const searchResult = await searchDuckDuckGo(text);
          if (searchResult) {
            enhancedText =
              text +
              "\n\n[نتائج البحث]:\n" +
              searchResult +
              "\n\nاستخدم المعلومات دي كمرجع فقط، وردك يكون عربي بالكامل.";
          }
        }

        const { data: { session } } = await supabase.auth.getSession();

        // ✅ Sliding Window — آخر 15 رسالة بدل كل التاريخ + summarize
        const fileCard    = buildFileContextCard(filesForRequest);
        const contextMsgs = buildContextWindow(
          updatedMessages.filter((m) => m.type !== "task"),
          enhancedText + fileCard
        );

        // ✅ System prompt مع الذاكرة
        const systemPrompt = getPersonalityPrompt(
          currentUserRef.current?.personality || "blak",
          currentUserRef.current?.gender      || "ولد",
          memories
        );

        abortControllerRef.current = new AbortController();

        const res = await fetch(
          "https://yfglgxuhtidfksekgabk.supabase.co/functions/v1/hyper-responder",
          {
            method:  "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization:  `Bearer ${session?.access_token}`,
            },
            signal: abortControllerRef.current.signal,
            body: JSON.stringify({
              model:        GROQ_MODEL,
              max_tokens:   GROQ_MAX_TOKENS,
              temperature:  GROQ_TEMPERATURE,
              systemPrompt,
              messages:     contextMsgs,
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
              data.retry_after_seconds || 0
            );
            showToast(
              retryAfter > 0
                ? `⏳ جميع مفاتيح API مشغولة. حاول بعد ${retryAfter} ثانية.`
                : "⏳ جميع مفاتيح API مشغولة. حاول مرة أخرى.",
              "error"
            );
          }
          throw new Error(data.error?.message || data.error || `خطأ: ${res.status}`);
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

        // ✅ حفظ المحادثة تلقائياً بعد كل رد ناجح
        triggerAutoSaveRef.current?.();

        // ✅ استخراج وحفظ الذاكرة — كل 3 رسائل فقط
        const newCount = messageCount + 1;
        setMessageCount(newCount);
        extractAndSaveMemory(user.id, text, reply, newCount, session).then(() => {
          // تحديث الذاكرة المحلية بعد الحفظ
          loadMemories(user.id).then((mems) => setMemories(mems));
        });

      } catch (err) {
        if (err.name === "AbortError") {
          setMessages((prev) =>
            sortMessagesByTime([
              ...prev,
              { role: "assistant", content: "⏹️ تم إيقاف التوليد.", id: Date.now() },
            ])
          );
        } else {
          console.error("[Chat] خطأ:", err.message);
          setMessages((prev) =>
            sortMessagesByTime([
              ...prev,
              { role: "assistant", content: "❌ حدث خطأ: " + err.message, id: Date.now() },
            ])
          );
        }
        setLoading(false);
        setStreamingText("");
        abortControllerRef.current = null;
      }
    },
    [user.id, fileUploadHook.attachedFiles, memories, messageCount]
  );


  // ═══════════════════════════════════════════
  // 6. usePdfProcessing
  // ═══════════════════════════════════════════

  const pdfHook = usePdfProcessing({
    user,
    attachedFiles:    fileUploadHook.attachedFiles,
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
      console.error("[Chat] خطأ في تحديث البيانات:", err.message);
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

  // ─── Focus تلقائي ───
  useEffect(() => {
    if (!loading && !streamingText && isLoaded) {
      const t = setTimeout(() => inputRef.current?.focus(), 150);
      return () => clearTimeout(t);
    }
  }, [loading, streamingText, isLoaded]);

  // ─── Scroll تلقائي ───
  useEffect(() => {
    if (!autoScrollRef.current) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  function handleMessagesScroll(e) {
    const el = e.target;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;

    if (distanceFromBottom < 50) {
      if (!autoScrollRef.current) {
        autoScrollRef.current = true;
        setShowScrollButton(false);
      }
      return;
    }

    if (distanceFromBottom > 100 && autoScrollRef.current) {
      autoScrollRef.current = false;
      setShowScrollButton(true);
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

    // وضع الكتابة الطويلة
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

    const hasOnlyFiles  = !text && fileUploadHook.attachedFiles.length > 0;
    const hasTocRequest = isTocRequest(text);

    if (hasOnlyFiles && !hasTocRequest) {
      showToast("⚠️ اكتب سؤالاً مع الملف، أو اطلب (اعرض الفهرس).", "info");
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
        await pdfHook.handlePdfPagesRequest(pdfFile, pageRange.startPage, pageRange.endPage, text);
        return;
      }

      const sectionTitle = detectSectionRequest(text);
      if (sectionTitle) {
        await pdfHook.handlePdfSectionRequest(pdfFile, sectionTitle, text);
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          showToast("🔍 جاري تحليل طلبك...", "info");
          const intent = await smartDetectIntent(text, session);
          if (intent) {
            if (intent.action === "pages") {
              await pdfHook.handlePdfPagesRequest(pdfFile, intent.start, intent.end, text);
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

    // وضع الكتابة الطويلة التلقائي
    if (sendMode === "fast" && !hasPdf) {
      const isLongFormRequest =
        /اكتب|لخص|أنشئ|اصنع|طور|صمم|article|essay|story|write|create/i.test(text) &&
        text.length > 100;
      if (isLongFormRequest) {
        await longFormHook.handleLongFormRequest(text);
        return;
      }
    }

    // بناء نص الإرسال مع الملفات
    const MAX_FILE_CHARS = 100000;
    let sendText    = text;
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
          const content   = f.content || "";
          const truncated = content.length > MAX_FILE_CHARS;
          const body      = truncated
            ? content.slice(0, MAX_FILE_CHARS) + "\n\n... [تم اقتصار الملف]"
            : content;
          return `\n\n📎 ${f.name}${truncated ? " ⚠️ (تم اقتصاره)" : ""}\n\`\`\`\n${body}\n\`\`\``;
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
          `\n\n[ملفات PDF: ${pdfInfo}. لم يُقرأ محتواها بعد. ` +
          `اطلب من المستخدم كتابة (اعرض الفهرس)، أو تحديد أرقام صفحات، أو اسم فصل.]`;
      }
    }

    try {
      await executeRequest(sendText, displayText);
    } catch {
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
      const { error: authError } = await supabase.auth.updateUser({ password: newPassword });
      if (authError) throw authError;
    }

    const updatedUser = { ...currentUser, ...profileUpdates };
    setCurrentUser(updatedUser);
    localStorage.setItem("black-user", JSON.stringify(updatedUser));
    showToast("✅ تم تحديث الإعدادات بنجاح");
  }

  async function handleDeleteAccount() {
    if (!window.confirm(
      "⚠️ تحذير: هذا الإجراء لا يمكن التراجع عنه!\n\nسيتم حذف:\n- حسابك بالكامل\n- جميع محادثاتك\n\nهل أنت متأكد؟"
    )) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch(
        "https://yfglgxuhtidfksekgabk.supabase.co/functions/v1/delete-account",
        {
          method:  "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization:  `Bearer ${session?.access_token}`,
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

  // ✅ LoadingScreen بدل inline loading
  if (!isLoaded) {
    return <LoadingScreen message="جاري التحميل..." />;
  }

  const isDark = theme === "dark";

  return (
    <div className={`container ${isDark ? "dark" : "light"}`}>

      {/* ── Header + Menu ── */}
      <div className="chat-shell">
        <ChatHistory
          chats={chatsHook.allChats}
          currentChatId={currentChatId}
          onClose={() => setShowHistory(false)}
          onOpenChat={(id) => { chatsHook.openChat(id); setShowHistory(false); }}
          onDeleteChat={chatsHook.deleteChat}
          onNewChat={() => { chatsHook.newChat(); setShowHistory(false); }}
          isOpen={showHistory}
        />
        <main className="chat-workspace">
        <div className="chat-topbar-wrap">
        <ChatHeader
          user={currentUser}
          loading={loading}
          isAdmin={isAdmin}
          showMenu={showMenu}
          onToggleMenu={() => setShowMenu(!showMenu)}
          onToggleHistory={() => setShowHistory((v) => !v)}
          onNewChat={chatsHook.newChat}
          onGoToAdmin={() => (window.location.href = "/admin")}
        />

        {showMenu && (
          <ChatMenu
            user={currentUser}
            isDark={isDark}
            onClose={() => setShowMenu(false)}
            onOpenSettings={() => { setShowSettings(true); setShowMenu(false); }}
            onOpenHistory={() => { setShowHistory(!showHistory); setShowMenu(false); }}
            onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
            onLogout={onLogout}
          />
        )}
      </div>

      {/* ── Token Bar ── */}
      <ChatTokenBar user={currentUser} />

      {/* ── Active Tasks ── */}
      <ActiveTasksNotification
        tasks={tasksHook.allActiveTasks}
        currentChatId={currentChatId}
        onOpenTask={tasksHook.openTaskInChat}
      />

      {/* ── Messages ── */}
      <ChatMessages
        messages={messages}
        isWelcome={messages.length === 1 && messages[0]?.role === "assistant" && /أهلاً|محادثة جديدة/.test(messages[0]?.content || "")}
        onPrompt={(prompt) => setInput(prompt)}
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

      {/* ── Input ── */}
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
        onToggleMode={() => setSendMode((m) => (m === "fast" ? "task" : "fast"))}
        uploadProgress={fileUploadHook.uploadProgress}
        inputRef={inputRef}
      />

      {/* ── Settings Modal ── */}
      {showSettings && (
        <ChatSettings
          user={currentUser}
          onClose={() => setShowSettings(false)}
          onSave={handleSaveSettings}
          onDeleteAccount={handleDeleteAccount}
        />
      )}
        </main>
      </div>
    </div>
  );
}
