// ============================================
// src/hooks/useChats.js
// ✅ v2.0: يستقبل currentChatId من Chat.jsx
// ============================================

import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { showToast, sortMessagesByTime } from "../utils/chatHelpers";
import { debounce } from "../utils/helpers";
import { CHAT_HISTORY_LIMIT } from "../config/constants";

export function useChats({
  user,
  messagesRef,
  setMessages,
  setInput,
  setAttachedFiles,
  setLongFormContext,
  loadChatTasksForChat,
  restoreChatFiles,
  currentChatId,      // ✅ من Chat.jsx
  setCurrentChatId,   // ✅ من Chat.jsx
}) {
  const [allChats, setAllChats] = useState([]);
  const currentChatIdRef = useRef(currentChatId);
  const debouncedSaveRef = useRef(null);

  useEffect(() => {
    currentChatIdRef.current = currentChatId;
    if (currentChatId) {
      localStorage.setItem("black-last-chat-id", currentChatId);
    } else {
      localStorage.removeItem("black-last-chat-id");
    }
  }, [currentChatId]);

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
  }, [user?.id, setMessages, setCurrentChatId]);

  // ─────────────────────────────────────────
  // 2. loadChatsFromSupabase
  // ─────────────────────────────────────────
  const loadChatsFromSupabase = useCallback(async () => {
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
  }, [user.id]);

  // ─────────────────────────────────────────
  // 3. saveChatToSupabase
  // ─────────────────────────────────────────
  const saveChatToSupabase = useCallback(async () => {
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
  }, [user.id, messagesRef]);

  // ─────────────────────────────────────────
  // 4. restoreLastChat
  // ─────────────────────────────────────────
  const restoreLastChat = useCallback(
    async (chats) => {
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
    },
    [setMessages, setCurrentChatId, loadChatTasksForChat, restoreChatFiles]
  );

  // ─────────────────────────────────────────
  // 5. newChat
  // ─────────────────────────────────────────
  const newChat = useCallback(async () => {
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
    setInput("");
    setAttachedFiles([]);
    if (setLongFormContext) setLongFormContext(null);
  }, [setCurrentChatId, setMessages, setInput, setAttachedFiles, setLongFormContext, saveChatToSupabase]);

  // ─────────────────────────────────────────
  // 6. openChat
  // ─────────────────────────────────────────
  const openChat = useCallback(
    async (chatId) => {
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
      setInput("");
      setAttachedFiles([]);
    },
    [setCurrentChatId, setMessages, setInput, setAttachedFiles, loadChatTasksForChat, restoreChatFiles, saveChatToSupabase]
  );

  // ─────────────────────────────────────────
  // 7. deleteChat
  // ─────────────────────────────────────────
  const deleteChat = useCallback(
    async (chatId) => {
      if (!window.confirm("حذف هذه المحادثة؟")) return;

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
          if (setLongFormContext) setLongFormContext(null);
        }

        showToast("✅ تم حذف المحادثة وكل مهامها وملفاتها", "success");
      } catch (err) {
        console.error("[Chat] خطأ في حذف المحادثة:", err);
        showToast("❌ فشل حذف المحادثة", "error");
      }
    },
    [setCurrentChatId, setMessages, setAttachedFiles, setLongFormContext]
  );

  // ─────────────────────────────────────────
  // 8. triggerAutoSave
  // ─────────────────────────────────────────
  const triggerAutoSave = useCallback(() => {
    if (!debouncedSaveRef.current) {
      debouncedSaveRef.current = debounce(
        () => saveChatToSupabase(),
        3000
      );
    }
    debouncedSaveRef.current();
  }, [saveChatToSupabase]);

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
