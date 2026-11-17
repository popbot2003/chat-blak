// ============================================
// src/hooks/useChats.js
// BLAK — Chat Engine v3.0
// ✅ حفظ آمن ومتسلسل
// ✅ حماية سجل الرسائل الكامل
// ✅ منع تداخل عمليات التحميل
// ✅ منع إعادة إنشاء المحادثات المحذوفة
// ✅ حماية من نتائج الطلبات القديمة
// ============================================

import {
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";

import { supabase } from "../lib/supabase";
import {
  showToast,
  sortMessagesByTime,
} from "../utils/chatHelpers";

// رسالة الترحيب
const createWelcomeMessage = () => ({
  role: "assistant",
  content: "محادثة جديدة 🖤\nاتكلم، أنا هنا.",
  id: `welcome-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
});

export function useChats({
  user,
  messagesRef,
  setMessages,
  setInput,
  setAttachedFiles,
  setLongFormContext,
  loadChatTasksForChat,
  restoreChatFiles,
  currentChatId,
  setCurrentChatId,
}) {
  const [allChats, setAllChats] = useState([]);

  // ==========================================
  // Refs
  // ==========================================

  const currentChatIdRef = useRef(currentChatId);

  // طابور عمليات الحفظ
  const saveQueueRef = useRef(Promise.resolve());

  // مؤقت الحفظ التلقائي
  const saveTimerRef = useRef(null);

  // رقم آخر عملية تحميل
  const loadSequenceRef = useRef(0);

  // المحادثات التي بدأ حذفها
  const deletedChatsRef = useRef(new Set());

  // منع تحديثات تحميل المستخدم السابق
  const chatsLoadSequenceRef = useRef(0);

  // ==========================================
  // تحديث معرف المحادثة
  // ==========================================

  const updateCurrentChatId = useCallback(
    (chatId) => {
      currentChatIdRef.current = chatId;
      setCurrentChatId(chatId);

      if (chatId) {
        localStorage.setItem("black-last-chat-id", chatId);
      } else {
        localStorage.removeItem("black-last-chat-id");
      }
    },
    [setCurrentChatId]
  );

  useEffect(() => {
    currentChatIdRef.current = currentChatId;
  }, [currentChatId]);

  // ==========================================
  // تجهيز الرسائل للحفظ
  // ==========================================

  const prepareMessagesForSave = useCallback((messages) => {
    return messages.map((message) => {
      if (message.type === "task" && message.task) {
        return {
          id: message.id,
          role: "assistant",
          type: "task",
          task_id: message.task.id,
          task_status: message.task.status,
          content:
            `📋 مهمة: ${message.task.input?.slice(0, 100) || ""}`,
        };
      }

      return message;
    });
  }, []);

  // ==========================================
  // تنفيذ عملية حفظ واحدة
  // ==========================================

  const performSave = useCallback(
    async (snapshot) => {
      const {
        chatId,
        messages,
      } = snapshot;

      if (!user?.id || !chatId) return false;

      if (deletedChatsRef.current.has(chatId)) {
        return false;
      }

      if (!messages.length) return false;

      const hasRealMessages = messages.some(
        (message) =>
          message.role === "user" ||
          message.type === "task"
      );

      if (!hasRealMessages) return false;

      const normalMessages =
        prepareMessagesForSave(messages);

      const firstUserMessage = normalMessages.find(
        (message) => message.role === "user"
      );

      const title =
        typeof firstUserMessage?.content === "string"
          ? firstUserMessage.content.slice(0, 50)
          : "محادثة";

      const now = new Date().toISOString();

      try {
        // لا نستخدم slice هنا.
        // يجب الحفاظ على سجل المحادثة كاملًا.

        const { error } = await supabase
          .from("chats")
          .upsert(
            {
              id: chatId,
              user_id: user.id,
              title,
              messages: normalMessages,
              updated_at: now,
            },
            {
              onConflict: "id",
            }
          );

        if (error) throw error;

        // قد تكون المحادثة حُذفت أثناء انتظار الطلب.
        // لا نحدّث الواجهة إذا أصبحت محذوفة.
        if (deletedChatsRef.current.has(chatId)) {
          return false;
        }

        setAllChats((previous) => {
          const updatedChat = {
            id: chatId,
            title,
            date: now,
            messageCount: normalMessages.length,
          };

          return [
            updatedChat,
            ...previous.filter(
              (chat) => chat.id !== chatId
            ),
          ];
        });

        return true;
      } catch (error) {
        console.error(
          "[Chat] خطأ في حفظ المحادثة:",
          error.message
        );

        return false;
      }
    },
    [user?.id, prepareMessagesForSave]
  );

  // ==========================================
  // إضافة عملية الحفظ إلى الطابور
  // ==========================================

  const enqueueSave = useCallback(
    (snapshot) => {
      const operation = saveQueueRef.current
        .catch(() => false)
        .then(() => performSave(snapshot));

      // العمليات التالية تنتظر انتهاء العملية الحالية.
      saveQueueRef.current = operation.catch(
        (error) => {
          console.error(
            "[Chat] خطأ في طابور الحفظ:",
            error
          );

          return false;
        }
      );

      return operation;
    },
    [performSave]
  );

  // ==========================================
  // 1. Realtime: حذف المحادثات
  // ==========================================

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel("chats-delete-" + user.id)
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "chats",
        },
        (payload) => {
          const deletedId = payload.old?.id;

          if (!deletedId) return;

          deletedChatsRef.current.add(deletedId);

          setAllChats((previous) =>
            previous.filter(
              (chat) => chat.id !== deletedId
            )
          );

          if (
            currentChatIdRef.current === deletedId
          ) {
            // إبطال أي تحميل قديم.
            loadSequenceRef.current += 1;

            updateCurrentChatId(null);

            setMessages([createWelcomeMessage()]);

            setInput("");

            setAttachedFiles([]);

            if (setLongFormContext) {
              setLongFormContext(null);
            }
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [
    user?.id,
    setMessages,
    setInput,
    setAttachedFiles,
    setLongFormContext,
    updateCurrentChatId,
  ]);

  // ==========================================
  // 2. تحميل قائمة المحادثات
  // ==========================================

  const loadChatsFromSupabase = useCallback(
    async () => {
      if (!user?.id) return [];

      const sequence =
        ++chatsLoadSequenceRef.current;

      try {
        const { data, error } = await supabase
          .from("chats")
          .select("*")
          .eq("user_id", user.id)
          .order("updated_at", {
            ascending: false,
          })
          .limit(50);

        if (error) throw error;

        // تجاهل نتيجة تحميل قديمة.
        if (
          sequence !== chatsLoadSequenceRef.current
        ) {
          return [];
        }

        const mapped = (data ?? []).map((chat) => ({
          id: chat.id,
          title: chat.title || "محادثة",
          date: chat.updated_at,
          messageCount: Array.isArray(chat.messages)
            ? chat.messages.length
            : 0,
        }));

        setAllChats(
          mapped.filter(
            (chat) =>
              !deletedChatsRef.current.has(chat.id)
          )
        );

        return mapped;
      } catch (error) {
        console.error(
          "[Chat] خطأ في تحميل المحادثات:",
          error.message
        );

        return [];
      }
    },
    [user?.id]
  );

  // ==========================================
  // 3. حفظ المحادثة الحالية
  // ==========================================

  const saveChatToSupabase = useCallback(
    async () => {
      const chatId = currentChatIdRef.current;

      if (!chatId || !messagesRef?.current) {
        return false;
      }

      // أخذ نسخة ثابتة وقت استدعاء الحفظ.
      const snapshot = {
        chatId,
        messages: [...messagesRef.current],
      };

      return enqueueSave(snapshot);
    },
    [messagesRef, enqueueSave]
  );

  // ==========================================
  // 4. استعادة آخر محادثة
  // ==========================================

  const restoreLastChat = useCallback(
    async (chats) => {
      const sequence =
        ++loadSequenceRef.current;

      try {
        const lastChatId = localStorage.getItem(
          "black-last-chat-id"
        );

        if (!lastChatId) return;

        const exists = (chats || []).some(
          (chat) => chat.id === lastChatId
        );

        if (
          !exists ||
          deletedChatsRef.current.has(lastChatId)
        ) {
          localStorage.removeItem(
            "black-last-chat-id"
          );

          return;
        }

        const { data, error } = await supabase
          .from("chats")
          .select("*")
          .eq("id", lastChatId)
          .eq("user_id", user.id)
          .single();

        if (error) throw error;

        if (
          sequence !== loadSequenceRef.current ||
          deletedChatsRef.current.has(lastChatId)
        ) {
          return;
        }

        if (
          !data?.messages ||
          !Array.isArray(data.messages)
        ) {
          return;
        }

        updateCurrentChatId(lastChatId);

        setMessages(
          sortMessagesByTime(data.messages)
        );

        await loadChatTasksForChat(lastChatId);

        if (
          sequence !== loadSequenceRef.current
        ) {
          return;
        }

        await restoreChatFiles(lastChatId);
      } catch (error) {
        console.warn(
          "[Chat] تعذر استعادة آخر محادثة:",
          error.message
        );
      }
    },
    [
      user?.id,
      setMessages,
      updateCurrentChatId,
      loadChatTasksForChat,
      restoreChatFiles,
    ]
  );

  // ==========================================
  // 5. إنشاء محادثة جديدة
  // ==========================================

  const newChat = useCallback(
    async () => {
      // إبطال أي تحميل سابق فورًا.
      loadSequenceRef.current += 1;

      if (currentChatIdRef.current) {
        await saveChatToSupabase();
      }

      updateCurrentChatId(null);

      setMessages([createWelcomeMessage()]);

      setInput("");

      setAttachedFiles([]);

      if (setLongFormContext) {
        setLongFormContext(null);
      }
    },
    [
      saveChatToSupabase,
      updateCurrentChatId,
      setMessages,
      setInput,
      setAttachedFiles,
      setLongFormContext,
    ]
  );

  // ==========================================
  // 6. فتح محادثة
  // ==========================================

  const openChat = useCallback(
    async (chatId) => {
      if (!chatId) return;

      if (deletedChatsRef.current.has(chatId)) {
        return;
      }

      // كل طلب فتح يحصل على رقم مستقل.
      const sequence =
        ++loadSequenceRef.current;

      try {
        // حفظ المحادثة الحالية قبل الانتقال.
        if (currentChatIdRef.current) {
          await saveChatToSupabase();
        }

        // إذا اختار المستخدم محادثة أخرى أثناء الحفظ.
        if (
          sequence !== loadSequenceRef.current
        ) {
          return;
        }

        if (deletedChatsRef.current.has(chatId)) {
          return;
        }

        const { data, error } = await supabase
          .from("chats")
          .select("*")
          .eq("id", chatId)
          .eq("user_id", user.id)
          .single();

        if (error) throw error;

        if (
          sequence !== loadSequenceRef.current ||
          deletedChatsRef.current.has(chatId)
        ) {
          return;
        }

        if (!Array.isArray(data?.messages)) {
          throw new Error(
            "بيانات المحادثة غير صالحة"
          );
        }

        updateCurrentChatId(chatId);

        setMessages(
          sortMessagesByTime(data.messages)
        );

        setInput("");

        setAttachedFiles([]);

        if (setLongFormContext) {
          setLongFormContext(null);
        }

        await loadChatTasksForChat(chatId);

        if (
          sequence !== loadSequenceRef.current
        ) {
          return;
        }

        await restoreChatFiles(chatId);
      } catch (error) {
        console.error(
          "[Chat] خطأ في فتح المحادثة:",
          error.message
        );

        showToast(
          "❌ تعذر فتح المحادثة",
          "error"
        );
      }
    },
    [
      user?.id,
      saveChatToSupabase,
      updateCurrentChatId,
      setMessages,
      setInput,
      setAttachedFiles,
      setLongFormContext,
      loadChatTasksForChat,
      restoreChatFiles,
    ]
  );

  // ==========================================
  // 7. حذف محادثة
  // ==========================================

  const deleteChat = useCallback(
    async (chatId) => {
      if (!chatId) return;

      if (
        !window.confirm("حذف هذه المحادثة؟")
      ) {
        return;
      }

      // منع أي حفظ جديد لهذه المحادثة.
      deletedChatsRef.current.add(chatId);

      // إبطال تحميل المحادثة إذا كانت مفتوحة.
      const isCurrent =
        chatId === currentChatIdRef.current;

      if (isCurrent) {
        loadSequenceRef.current += 1;
      }

      try {
        // انتظار جميع عمليات الحفظ السابقة.
        await saveQueueRef.current;

        // الحصول على مسارات الملفات قبل الحذف.
        let filePaths = [];

        const { data: files, error: filesError } =
          await supabase
            .from("user_files")
            .select("file_path")
            .eq("chat_id", chatId);

        if (filesError) {
          console.warn(
            "[Chat] تعذر تحميل مسارات الملفات:",
            filesError.message
          );
        } else {
          filePaths = (files || [])
            .map((file) => file.file_path)
            .filter(Boolean);
        }

        // إلغاء المهام النشطة.
        const { error: taskError } =
          await supabase
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

        if (taskError) {
          console.warn(
            "[Chat] خطأ في إلغاء المهام:",
            taskError.message
          );
        }

        // حذف المحادثة من قاعدة البيانات.
        const { error: chatError } = await supabase
          .from("chats")
          .delete()
          .eq("id", chatId)
          .eq("user_id", user.id);

        if (chatError) throw chatError;

        // إزالة الملفات من Storage بعد نجاح حذف المحادثة.
        if (filePaths.length > 0) {
          const { error: storageError } =
            await supabase.storage
              .from("user-files")
              .remove(filePaths);

          if (storageError) {
            console.warn(
              "[Chat] تعذر حذف بعض الملفات:",
              storageError.message
            );
          }
        }

        setAllChats((previous) =>
          previous.filter(
            (chat) => chat.id !== chatId
          )
        );

        if (isCurrent) {
          updateCurrentChatId(null);

          setMessages([createWelcomeMessage()]);

          setInput("");

          setAttachedFiles([]);

          if (setLongFormContext) {
            setLongFormContext(null);
          }
        }

        showToast(
          "✅ تم حذف المحادثة وطلب إلغاء مهامها",
          "success"
        );
      } catch (error) {
        // لو الحذف فشل نسمح بالحفظ مرة أخرى.
        deletedChatsRef.current.delete(chatId);

        console.error(
          "[Chat] خطأ في حذف المحادثة:",
          error
        );

        showToast(
          "❌ فشل حذف المحادثة",
          "error"
        );
      }
    },
    [
      user?.id,
      updateCurrentChatId,
      setMessages,
      setInput,
      setAttachedFiles,
      setLongFormContext,
    ]
  );

  // ==========================================
  // 8. الحفظ التلقائي
  // ==========================================

  const triggerAutoSave = useCallback(
    () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      saveTimerRef.current = setTimeout(() => {
        saveTimerRef.current = null;

        saveChatToSupabase();
      }, 3000);
    },
    [saveChatToSupabase]
  );

  // ==========================================
  // 9. تنظيف الموارد
  // ==========================================

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  // ==========================================
  // API
  // ==========================================

  return {
    allChats,
    setAllChats,
    loadChatsFromSupabase,
    saveChatToSupabase,
    restoreLastChat,
    newChat,
    openChat,
    deleteChat,
    triggerAutoSave,
  };
}
