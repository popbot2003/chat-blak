// ============================================
// src/hooks/useChats.js — v3.0
// ✅ يحفظ كل الرسائل (لا آخر 15 فقط)
// ✅ طابور حفظ متسلسل: حفظ متأخر لا يستبدل بيانات أحدث
// ✅ الانتقال بين المحادثات يُبطل الطلب الجاري (onBeforeSwitch)
// ✅ تحميل محادثة قديمة لا يطغى على محادثة أحدث (loadSeq)
// ✅ ترتيب الرسائل بـ ts ثابت + ترقية الرسائل القديمة تلقائياً
// ============================================

import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../lib/supabase";
import {
  showToast,
  sortMessagesByTime,
  ensureTimestamps,
  createMessage,
} from "../utils/chatHelpers";
import { CHAT_HISTORY_LIMIT } from "../config/constants";

const SAVE_DEBOUNCE_MS = 1200;
const WELCOME_TEXT = "محادثة جديدة 🖤\nاتكلم، أنا هنا.";

export function useChats({
  user,
  messagesRef,
  currentChatIdRef,       // ✅ ref مشترك من Chat.jsx (يُحدَّث فوراً وليس بعد الرندر)
  setMessages,
  setInput,
  setAttachedFiles,
  setLongFormContext,
  loadChatTasksForChat,
  restoreChatFiles,
  setCurrentChatId,
  onBeforeSwitch,         // ✅ يُلغي الطلب الجاري قبل أي انتقال
}) {
  const [allChats, setAllChats] = useState([]);

  const saveTimerRef = useRef(null);
  const saveQueueRef = useRef(Promise.resolve());
  const loadSeqRef   = useRef(0);

  // يضبط الرسائل في الـ state والـ ref معاً (بدون تأخير الـ effect)
  const applyMessages = useCallback(
    (msgs) => {
      messagesRef.current = msgs;
      setMessages(msgs);
    },
    [messagesRef, setMessages]
  );

  const applyChatId = useCallback(
    (id) => {
      currentChatIdRef.current = id;
      setCurrentChatId(id);
    },
    [currentChatIdRef, setCurrentChatId]
  );

  // ─────────────────────────────────────────
  // 1. Realtime: حذف المحادثات
  // ─────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;

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
            onBeforeSwitch?.();
            applyChatId(null);
            applyMessages([createMessage("assistant", WELCOME_TEXT)]);
          }
        }
      )
      .subscribe();
    return () => ch.unsubscribe();
  }, [user?.id, applyChatId, applyMessages, currentChatIdRef, onBeforeSwitch]);

  // ─────────────────────────────────────────
  // 2. loadChatsFromSupabase
  // ─────────────────────────────────────────
  const loadChatsFromSupabase = useCallback(async () => {
    try {
      const { data: chats, error } = await supabase
        .from("chats")
        .select("id, title, updated_at, messages")
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
  }, [user.id]);

  // ─────────────────────────────────────────
  // 3. الحفظ (متسلسل — لا يتداخل أبداً)
  // ─────────────────────────────────────────
  const doSave = useCallback(async () => {
    // نقرأ الحالة لحظة التنفيذ — أحدث نسخة دائماً
    const chatId = currentChatIdRef.current;
    const msgs   = messagesRef.current;
    if (!chatId || !msgs || msgs.length === 0) return;

    const hasRealMessages = msgs.some(
      (m) => m.role === "user" || m.type === "task"
    );
    if (!hasRealMessages) return;

    const normalMsgs = ensureTimestamps(
      msgs.map((m) => {
        if (m.type === "task" && m.task) {
          return {
            id: m.id,
            ts: m.ts,
            role: "assistant",
            type: "task",
            task_id: m.task.id,
            task_status: m.task.status,
            content: `📋 مهمة: ${m.task.input?.slice(0, 100) || ""}`,
          };
        }
        return m;
      })
    );

    const title =
      normalMsgs.find((m) => m.role === "user")?.content?.slice(0, 50) ||
      "محادثة";
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
        const updated = {
          id: chatId,
          title,
          date: now,
          messageCount: normalMsgs.length,
        };
        return [updated, ...prev.filter((c) => c.id !== chatId)];
      });
    } catch (err) {
      console.error("[Chat] خطأ في حفظ المحادثة:", err.message);
    }
  }, [user.id, messagesRef, currentChatIdRef]);

  const saveChatToSupabase = useCallback(() => {
    saveQueueRef.current = saveQueueRef.current.then(doSave).catch(() => {});
    return saveQueueRef.current;
  }, [doSave]);

  /** حفظ فوري لأي حفظ مؤجل (قبل الانتقال أو إغلاق الصفحة) */
  const flushSave = useCallback(async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    await saveChatToSupabase();
  }, [saveChatToSupabase]);

  const triggerAutoSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      saveChatToSupabase();
    }, SAVE_DEBOUNCE_MS);
  }, [saveChatToSupabase]);

  // حفظ عند إخفاء الصفحة/إغلاقها (best-effort)
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") flushSave();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flushSave);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flushSave);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [flushSave]);

  // ─────────────────────────────────────────
  // 4. فتح محادثة وتحميل رسائلها
  // ─────────────────────────────────────────
  const loadChatInto = useCallback(
    async (chatId, seq) => {
      const { data, error } = await supabase
        .from("chats")
        .select("id, messages")
        .eq("id", chatId)
        .eq("user_id", user.id)
        .single();

      // انتقال أحدث حدث أثناء التحميل → تجاهل هذه النتيجة
      if (seq !== loadSeqRef.current) return false;
      if (error || !data) return false;

      const msgs = sortMessagesByTime(data.messages || []);
      if (msgs.length === 0) return false;

      applyChatId(chatId);
      applyMessages(msgs);
      await loadChatTasksForChat?.(chatId);
      await restoreChatFiles?.(chatId);
      return true;
    },
    [user.id, applyChatId, applyMessages, loadChatTasksForChat, restoreChatFiles]
  );

  const restoreLastChat = useCallback(
    async (chats) => {
      try {
        const lastChatId = localStorage.getItem("black-last-chat-id");
        if (!lastChatId) return;

        const exists = (chats || []).find((c) => c.id === lastChatId);
        if (!exists) {
          localStorage.removeItem("black-last-chat-id");
          applyChatId(null);
          return;
        }

        const seq = ++loadSeqRef.current;
        await loadChatInto(lastChatId, seq);
      } catch (err) {
        console.warn("[Chat] تعذر استعادة آخر محادثة:", err.message);
      }
    },
    [applyChatId, loadChatInto]
  );

  // ─────────────────────────────────────────
  // 5. محادثة جديدة
  // ─────────────────────────────────────────
  const newChat = useCallback(async () => {
    onBeforeSwitch?.();                // ✅ إبطال أي طلب جاري
    loadSeqRef.current += 1;           // ✅ إبطال أي تحميل جاري
    await flushSave();                 // ✅ حفظ المحادثة الحالية أولاً

    applyChatId(null);
    applyMessages([createMessage("assistant", WELCOME_TEXT)]);
    setInput("");
    setAttachedFiles([]);
    setLongFormContext?.(null);
  }, [onBeforeSwitch, flushSave, applyChatId, applyMessages, setInput, setAttachedFiles, setLongFormContext]);

  // ─────────────────────────────────────────
  // 6. فتح محادثة محفوظة
  // ─────────────────────────────────────────
  const openChat = useCallback(
    async (chatId) => {
      if (!chatId || chatId === currentChatIdRef.current) return;

      onBeforeSwitch?.();              // ✅ إبطال أي طلب جاري
      await flushSave();               // ✅ حفظ الحالية قبل المغادرة

      const seq = ++loadSeqRef.current;
      const ok = await loadChatInto(chatId, seq);

      if (seq !== loadSeqRef.current) return; // انتقال أحدث
      if (!ok) {
        showToast("❌ تعذر فتح المحادثة", "error");
        return;
      }
      setInput("");
      setAttachedFiles([]);
    },
    [currentChatIdRef, onBeforeSwitch, flushSave, loadChatInto, setInput, setAttachedFiles]
  );

  // ─────────────────────────────────────────
  // 7. حذف محادثة
  // ─────────────────────────────────────────
  const deleteChat = useCallback(
    async (chatId) => {
      if (!window.confirm("حذف هذه المحادثة؟")) return;

      const isCurrent = chatId === currentChatIdRef.current;
      if (isCurrent) {
        onBeforeSwitch?.();
        if (saveTimerRef.current) {
          clearTimeout(saveTimerRef.current);
          saveTimerRef.current = null;
        }
      }

      try {
        try {
          const { data: files } = await supabase
            .from("user_files")
            .select("file_path")
            .eq("chat_id", chatId);

          if (files && files.length > 0) {
            const paths = files.map((f) => f.file_path).filter(Boolean);
            if (paths.length > 0) {
              await supabase.storage.from("user-files").remove(paths);
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
          .in("status", ["pending", "planning", "running", "waiting", "merging"]);

        if (cancelErr) console.warn("[Chat] خطأ في إلغاء المهام:", cancelErr.message);

        const { error: chatErr } = await supabase
          .from("chats")
          .delete()
          .eq("id", chatId);

        if (chatErr) throw chatErr;

        setAllChats((prev) => prev.filter((c) => c.id !== chatId));

        if (isCurrent) {
          loadSeqRef.current += 1;
          applyChatId(null);
          localStorage.removeItem("black-last-chat-id");
          applyMessages([createMessage("assistant", WELCOME_TEXT)]);
          setAttachedFiles([]);
          setLongFormContext?.(null);
        }

        showToast("✅ تم حذف المحادثة وكل مهامها وملفاتها", "success");
      } catch (err) {
        console.error("[Chat] خطأ في حذف المحادثة:", err);
        showToast("❌ فشل حذف المحادثة", "error");
      }
    },
    [currentChatIdRef, onBeforeSwitch, applyChatId, applyMessages, setAttachedFiles, setLongFormContext]
  );

  return {
    allChats,
    setAllChats,
    loadChatsFromSupabase,
    saveChatToSupabase,
    flushSave,
    restoreLastChat,
    newChat,
    openChat,
    deleteChat,
    triggerAutoSave,
  };
}
