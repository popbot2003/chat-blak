
// ============================================
// src/hooks/useChats.js
// BLAK — Chat Engine v4.1
// ✅ حفظ آمن ومتسلسل
// ✅ حماية سجل الرسائل الكامل
// ✅ منع تداخل عمليات التحميل
// ✅ منع إعادة إنشاء المحادثات المحذوفة
// ✅ حماية نتائج الطلبات القديمة
// ✅ أرشفة واستعادة دائمة عبر Supabase
// ✅ عدم الأرشفة عند فشل حفظ الرسائل
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

  const currentChatIdRef = useRef(currentChatId);
  const saveQueueRef = useRef(Promise.resolve());
  const saveTimerRef = useRef(null);
  const loadSequenceRef = useRef(0);
  const deletedChatsRef = useRef(new Set());
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
          content: `📋 مهمة: ${message.task.input?.slice(0, 100) || ""}`,
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
      const { chatId, messages } = snapshot;

      if (!user?.id || !chatId) return false;
      if (deletedChatsRef.current.has(chatId)) return false;
      if (!messages.length) return false;

      const hasRealMessages = messages.some(
        (message) =>
          message.role === "user" ||
          message.type === "task"
      );

      if (!hasRealMessages) return false;

      const normalMessages = prepareMessagesForSave(messages);

      const firstUserMessage = normalMessages.find(
        (message) => message.role === "user"
      );

      const title =
        typeof firstUserMessage?.content === "string"
          ? firstUserMessage.content.slice(0, 50)
          : "محادثة";

      const now = new Date().toISOString();

      try {
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
            { onConflict: "id" }
          );

        if (error) throw error;
        if (deletedChatsRef.current.has(chatId)) return false;

        setAllChats((previous) => {
          const existing = previous.find(
            (chat) => chat.id === chatId
          );

          const updatedChat = {
            ...existing,
            id: chatId,
            title,
            date: now,
            messageCount: normalMessages.length,
          };

          return [
            updatedChat,
            ...previous.filter((chat) => chat.id !== chatId),
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
  // طابور الحفظ
  // ==========================================

  const enqueueSave = useCallback(
    (snapshot) => {
      const operation = saveQueueRef.current
        .catch(() => false)
        .then(() => performSave(snapshot));

      saveQueueRef.current = operation.catch((error) => {
        console.error("[Chat] خطأ في طابور الحفظ:", error);
        return false;
      });

      return operation;
    },
    [performSave]
  );

  // ==========================================
  // Realtime: حذف المحادثات
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
            previous.filter((chat) => chat.id !== deletedId)
          );

          if (currentChatIdRef.current === deletedId) {
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
  // تحميل المحادثات
  // ==========================================

  const loadChatsFromSupabase = useCallback(
    async () => {
      if (!user?.id) return [];

      const sequence = ++chatsLoadSequenceRef.current;

      try {
        const { data, error } = await supabase
          .from("chats")
          .select("*")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(100);

        if (error) throw error;

        if (sequence !== chatsLoadSequenceRef.current) {
          return [];
        }

        const mapped = (data || []).map((chat) => ({
          id: chat.id,
          title: chat.title || "محادثة",
          date: chat.updated_at,
          messageCount: Array.isArray(chat.messages)
            ? chat.messages.length
            : 0,
          archived_at: chat.archived_at || null,
          is_archived: Boolean(chat.archived_at),
        }));

        const visible = mapped.filter(
          (chat) => !deletedChatsRef.current.has(chat.id)
        );

        setAllChats(visible);
        return visible;
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
  // حفظ المحادثة الحالية
  // ==========================================

  const saveChatToSupabase = useCallback(
    async (requestedChatId = null) => {
      const chatId = requestedChatId || currentChatIdRef.current;

      if (!chatId || !messagesRef?.current) return false;

      const snapshot = {
        chatId,
        messages: [...messagesRef.current],
      };

      return enqueueSave(snapshot);
    },
    [messagesRef, enqueueSave]
  );

  // ==========================================
  // استعادة آخر محادثة
  // ==========================================

  const restoreLastChat = useCallback(
    async (chats) => {
      if (!user?.id) return;

      const sequence = ++loadSequenceRef.current;

      try {
        // عند كل دخول تبدأ بمحادثة جديدة (مش آخر محادثة)
        // المحادثات القديمة موجودة في القائمة الجانبية
        const lastChatId = null;
        if (!lastChatId) return;

        const { data, error } = await supabase
          .from("chats")
          .select("*")
          .eq("id", "__never__")
          .single();

        if (error) throw error;

        if (
          sequence !== loadSequenceRef.current ||
          deletedChatsRef.current.has(lastChatId)
        ) {
          return;
        }

        if (!Array.isArray(data?.messages)) return;

        updateCurrentChatId(lastChatId);
        setMessages(sortMessagesByTime(data.messages));

        await loadChatTasksForChat(lastChatId);

        if (sequence !== loadSequenceRef.current) return;

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
  // إنشاء محادثة جديدة
  // ==========================================

  const newChat = useCallback(
    async () => {
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
  // فتح محادثة
  // ==========================================

  const openChat = useCallback(
    async (chatId) => {
      if (!chatId || !user?.id) return;

      const targetChat = allChats.find(
        (chat) => chat.id === chatId
      );

      if (targetChat?.is_archived) {
        showToast("استعد المحادثة من الأرشيف أولاً", "error");
        return;
      }

      if (deletedChatsRef.current.has(chatId)) return;

      const sequence = ++loadSequenceRef.current;

      try {
        if (currentChatIdRef.current) {
          await saveChatToSupabase();
        }

        if (
          sequence !== loadSequenceRef.current ||
          deletedChatsRef.current.has(chatId)
        ) {
          return;
        }

        const { data, error } = await supabase
          .from("chats")
          .select("*")
          .eq("id", chatId)
          .eq("user_id", user.id)
          .is("archived_at", null)
          .single();

        if (error) throw error;

        if (
          sequence !== loadSequenceRef.current ||
          deletedChatsRef.current.has(chatId)
        ) {
          return;
        }

        if (!Array.isArray(data?.messages)) {
          throw new Error("بيانات المحادثة غير صالحة");
        }

        updateCurrentChatId(chatId);
        setMessages(sortMessagesByTime(data.messages));
        setInput("");
        setAttachedFiles([]);

        if (setLongFormContext) {
          setLongFormContext(null);
        }

        await loadChatTasksForChat(chatId);

        if (sequence !== loadSequenceRef.current) return;

        await restoreChatFiles(chatId);
      } catch (error) {
        console.error(
          "[Chat] خطأ في فتح المحادثة:",
          error.message
        );
        showToast("❌ تعذر فتح المحادثة", "error");
      }
    },
    [
      user?.id,
      allChats,
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
  // أرشفة محادثة
  // ==========================================

  const archiveChat = useCallback(
    async (chatId) => {
      if (!chatId || !user?.id) return false;

      const chat = allChats.find(
        (item) => item.id === chatId
      );

      if (!chat || chat.is_archived) return false;

      try {
        // حفظ الرسائل الحالية قبل الأرشفة.
        if (currentChatIdRef.current === chatId) {
          const currentMessages = messagesRef?.current || [];

          const hasMessagesToSave = currentMessages.some(
            (message) =>
              message.role === "user" ||
              message.type === "task"
          );

          // إذا كانت هناك رسائل فعلية، يجب نجاح الحفظ أولًا.
          if (hasMessagesToSave) {
            const saved = await saveChatToSupabase();

            if (!saved) {
              showToast(
                "تعذر حفظ آخر الرسائل؛ لم تتم الأرشفة",
                "error"
              );
              return false;
            }
          }
        }

        const archivedAt = new Date().toISOString();

        const { data, error } = await supabase
          .from("chats")
          .update({ archived_at: archivedAt })
          .eq("id", chatId)
          .eq("user_id", user.id)
          .is("archived_at", null)
          .select("id")
          .maybeSingle();

        if (error) throw error;
        if (!data) {
          throw new Error("لم يتم العثور على المحادثة");
        }

        setAllChats((previous) =>
          previous.map((item) =>
            item.id === chatId
              ? {
                  ...item,
                  archived_at: archivedAt,
                  is_archived: true,
                }
              : item
          )
        );

        if (currentChatIdRef.current === chatId) {
          loadSequenceRef.current += 1;
          updateCurrentChatId(null);
          setMessages([createWelcomeMessage()]);
          setInput("");
          setAttachedFiles([]);

          if (setLongFormContext) {
            setLongFormContext(null);
          }
        }

        showToast("📦 تمت أرشفة المحادثة", "success");
        return true;
      } catch (error) {
        console.error("[Chat] خطأ في أرشفة المحادثة:", error);
        showToast("❌ تعذرت أرشفة المحادثة", "error");
        return false;
      }
    },
    [
      user?.id,
      allChats,
      messagesRef,
      saveChatToSupabase,
      updateCurrentChatId,
      setMessages,
      setInput,
      setAttachedFiles,
      setLongFormContext,
    ]
  );

  // ==========================================
  // استعادة محادثة من الأرشيف
  // ==========================================

  const restoreChat = useCallback(
    async (chatId) => {
      if (!chatId || !user?.id) return false;

      try {
        const { data, error } = await supabase
          .from("chats")
          .update({ archived_at: null })
          .eq("id", chatId)
          .eq("user_id", user.id)
          .not("archived_at", "is", null)
          .select("id")
          .maybeSingle();

        if (error) throw error;
        if (!data) {
          throw new Error("لم يتم العثور على المحادثة المؤرشفة");
        }

        setAllChats((previous) =>
          previous.map((item) =>
            item.id === chatId
              ? {
                  ...item,
                  archived_at: null,
                  is_archived: false,
                }
              : item
          )
        );

        showToast("↩ تم استعادة المحادثة", "success");
        return true;
      } catch (error) {
        console.error("[Chat] خطأ في استعادة المحادثة:", error);
        showToast("❌ تعذرت استعادة المحادثة", "error");
        return false;
      }
    },
    [user?.id]
  );

  // ==========================================
  // حذف محادثة
  // ==========================================

  const deleteChat = useCallback(
    async (chatId) => {
      if (!chatId || !user?.id) return;

      deletedChatsRef.current.add(chatId);

      const isCurrent = chatId === currentChatIdRef.current;

      if (isCurrent) {
        loadSequenceRef.current += 1;
      }

      try {
        await saveQueueRef.current;

        let filePaths = [];

        const { data: files, error: filesError } = await supabase
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

        const { error: taskError } = await supabase
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

        const { error: chatError } = await supabase
          .from("chats")
          .delete()
          .eq("id", chatId)
          .eq("user_id", user.id);

        if (chatError) throw chatError;

        if (filePaths.length > 0) {
          const { error: storageError } = await supabase.storage
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
          previous.filter((chat) => chat.id !== chatId)
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

        showToast("تم الحذف", "success");
      } catch (error) {
        deletedChatsRef.current.delete(chatId);

        console.error("[Chat] خطأ في حذف المحادثة:", error);
        showToast("❌ فشل حذف المحادثة", "error");
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
  // الحفظ التلقائي
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
  // تنظيف الموارد
  // ==========================================

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  // ==========================================
  // إعادة تسمية محادثة
  // ==========================================

  const renameChat = useCallback(
    async (chatId, nextTitle) => {
      const title = String(nextTitle || "").trim().slice(0, 80);
      if (!chatId || !title || !user?.id) return false;

      try {
        const { data, error } = await supabase
          .from("chats")
          .update({ title, updated_at: new Date().toISOString() })
          .eq("id", chatId)
          .eq("user_id", user.id)
          .select("id")
          .maybeSingle();

        if (error) throw error;
        if (!data) throw new Error("لم يتم العثور على المحادثة");

        setAllChats((previous) =>
          previous.map((chat) => chat.id === chatId ? { ...chat, title } : chat)
        );
        showToast("تم تحديث اسم المحادثة");
        return true;
      } catch (error) {
        console.error("[Chat] rename failed:", error.message);
        showToast("تعذر إعادة تسمية المحادثة", "error");
        return false;
      }
    },
    [user?.id]
  );

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
    archiveChat,
    restoreChat,
    renameChat,
    triggerAutoSave,
  };
}
