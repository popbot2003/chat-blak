// ============================================
// src/hooks/useTasks.js
// كل منطق المهام (Tasks):
// - إنشاء مهمة
// - إلغاء مهمة
// - فتح مهمة في المحادثة
// - تحميل المهام النشطة
// - Realtime subscription
// ============================================

import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { showToast, sortMessagesByTime } from "../utils/chatHelpers";

export function useTasks({
  user,
  currentChatId,
  setCurrentChatId,
  messagesRef,
  setMessages,
  setInput,
  setAttachedFiles,
  setSendMode,
  saveChatToSupabase,
}) {
  const [allActiveTasks, setAllActiveTasks] = useState([]);
  const creatingTaskRef = useRef(false);

  const currentChatIdRef = useRef(currentChatId);
  useEffect(() => {
    currentChatIdRef.current = currentChatId;
  }, [currentChatId]);

  // ─────────────────────────────────────────
  // 1. Realtime subscription للمهام
  // ─────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;

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
  }, [user?.id, setMessages]);

  // ─────────────────────────────────────────
  // 2. تحميل المهام النشطة
  // ─────────────────────────────────────────
  const loadAllActiveTasks = useCallback(async () => {
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
  }, [user.id]);

  // ─────────────────────────────────────────
  // 3. تحميل مهام محادثة معينة
  // ─────────────────────────────────────────
  const loadChatTasksForChat = useCallback(
    async (chatId) => {
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

          setMessages((prev) => {
            const seen = new Set();
            const combined = [];
            for (const m of [...prev, ...taskMessages]) {
              if (!m || !m.id) continue;
              const key = String(m.id);
              if (seen.has(key)) continue;
              seen.add(key);
              combined.push(m);
            }
            return sortMessagesByTime(combined);
          });
        }
      } catch (err) {
        console.error("[Chat] خطأ في تحميل مهام المحادثة:", err.message);
      }
    },
    [user.id, setMessages]
  );

  // ─────────────────────────────────────────
  // 4. إنشاء مهمة جديدة
  // ─────────────────────────────────────────
  const createTask = useCallback(
    async (text) => {
      if (creatingTaskRef.current) {
        console.log("[Chat] createTask already in progress, skipping");
        return;
      }

      creatingTaskRef.current = true;

      try {
        let chatId = currentChatIdRef.current;
        if (!chatId) {
          chatId = Date.now().toString();
          setCurrentChatId(chatId);
        }

        const { data: taskId, error } = await supabase.rpc("create_task", {
          task_input: text,
          chat_id_input: chatId,
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
        setSendMode("fast");
      } catch (err) {
        console.error("[Chat] خطأ في createTask:", err);
        showToast("❌ فشل إنشاء المهمة", "error");
      } finally {
        creatingTaskRef.current = false;
      }
    },
    [setCurrentChatId, setMessages, setInput, setAttachedFiles, setSendMode]
  );

  // ─────────────────────────────────────────
  // 5. إلغاء مهمة
  // ─────────────────────────────────────────
  const cancelTask = useCallback(async (taskId) => {
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
  }, []);

  // ─────────────────────────────────────────
  // 6. فتح مهمة في المحادثة
  // ─────────────────────────────────────────
  const openTaskInChat = useCallback(
    async (chatId) => {
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

      setInput("");
      setAttachedFiles([]);

      await loadChatTasksForChat(chatId);
    },
    [
      setCurrentChatId,
      setMessages,
      setInput,
      setAttachedFiles,
      loadChatTasksForChat,
      saveChatToSupabase,
    ]
  );

  return {
    allActiveTasks,
    setAllActiveTasks,
    loadAllActiveTasks,
    loadChatTasksForChat,
    createTask,
    cancelTask,
    openTaskInChat,
  };
}
