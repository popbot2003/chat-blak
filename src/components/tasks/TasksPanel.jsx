// ============================================
// src/components/tasks/TasksPanel.jsx — BLACK 🖤
// قسم المهام المستقل في القائمة الجانبية
// ============================================

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import { showToast } from "../../utils/chatHelpers";

const ACTIVE_STATUSES = ["pending", "planning", "running", "waiting", "merging"];

const STATUS_LABEL = {
  pending:   "⏳ في الانتظار",
  planning:  "📋 جارٍ التخطيط",
  running:   "🔄 جارٍ التنفيذ",
  waiting:   "⏸ منتظر",
  merging:   "🔗 جارٍ الدمج",
  completed: "✅ مكتملة",
  failed:    "❌ فشلت",
  cancelled: "🚫 ملغاة",
};

export default function TasksPanel({ user, activeTasks = [], onCancelTask }) {
  const [historyTasks, setHistoryTasks] = useState([]);
  const [selected, setSelected]         = useState(null);
  const [loading, setLoading]           = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  // ─── تحميل سجل المهام ────────────────────────────────────
  const loadHistory = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user.id)
        .not("status", "in", `(${ACTIVE_STATUSES.join(",")})`)
        .order("created_at", { ascending: false })
        .limit(50);
      setHistoryTasks(data || []);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  async function handleDeleteTask(taskId) {
    await supabase.from("tasks").delete().eq("id", taskId).eq("user_id", user.id);
    setHistoryTasks((prev) => prev.filter((t) => t.id !== taskId));
    if (selected?.id === taskId) setSelected(null);
  }

  async function handleClearHistory() {
    setConfirmClear(false);
    await supabase
      .from("tasks")
      .delete()
      .eq("user_id", user.id)
      .not("status", "in", `(${ACTIVE_STATUSES.join(",")})`);
    setHistoryTasks([]);
    setSelected(null);
    showToast("تم مسح سجل المهام");
  }

  const allTasks = [
    ...activeTasks,
    ...historyTasks.filter((h) => !activeTasks.some((a) => a.id === h.id)),
  ];

  // ─── تفاصيل مهمة ─────────────────────────────────────────
  if (selected) {
    return (
      <div className="tasks-panel" dir="rtl">
        <div className="tasks-panel__head">
          <button
            type="button"
            className="ui-btn ui-btn--ghost ui-btn--sm"
            onClick={() => setSelected(null)}
          >
            ← رجوع
          </button>
          <span className="tasks-panel__status-badge">
            {STATUS_LABEL[selected.status] || selected.status}
          </span>
        </div>

        <div className="tasks-panel__detail">
          <p className="tasks-panel__task-title">{selected.title || selected.prompt}</p>

          {selected.steps?.length > 0 && (
            <div className="tasks-panel__steps">
              <strong>الخطوات:</strong>
              <ol>
                {selected.steps.map((s, i) => (
                  <li key={i}>{typeof s === "string" ? s : s.description || JSON.stringify(s)}</li>
                ))}
              </ol>
            </div>
          )}

          {selected.result && (
            <div className="tasks-panel__result">
              <strong>النتيجة:</strong>
              <p>{selected.result}</p>
            </div>
          )}

          {selected.error && (
            <div className="tasks-panel__error">
              <strong>الخطأ:</strong>
              <p>{selected.error}</p>
            </div>
          )}

          <div className="tasks-panel__detail-actions">
            {ACTIVE_STATUSES.includes(selected.status) && (
              <button
                type="button"
                className="ui-btn ui-btn--danger ui-btn--sm"
                onClick={() => { onCancelTask?.(selected.id); setSelected(null); }}
              >
                إلغاء المهمة
              </button>
            )}
            {!ACTIVE_STATUSES.includes(selected.status) && (
              <button
                type="button"
                className="ui-btn ui-btn--ghost ui-btn--sm"
                onClick={() => handleDeleteTask(selected.id)}
              >
                حذف
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── القائمة الرئيسية ─────────────────────────────────────
  return (
    <div className="tasks-panel" dir="rtl">
      <div className="tasks-panel__head">
        <span className="tasks-panel__title">
          المهام
          {activeTasks.length > 0 && (
            <span className="tasks-panel__badge">{activeTasks.length}</span>
          )}
        </span>
        {historyTasks.length > 0 && !confirmClear && (
          <button
            type="button"
            className="ui-btn ui-btn--ghost ui-btn--xs"
            onClick={() => setConfirmClear(true)}
          >
            مسح السجل
          </button>
        )}
        {confirmClear && (
          <div className="tasks-panel__confirm">
            <button
              type="button"
              className="ui-btn ui-btn--danger ui-btn--xs"
              onClick={handleClearHistory}
            >
              تأكيد
            </button>
            <button
              type="button"
              className="ui-btn ui-btn--ghost ui-btn--xs"
              onClick={() => setConfirmClear(false)}
            >
              إلغاء
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <p className="tasks-panel__empty">جارٍ التحميل…</p>
      ) : allTasks.length === 0 ? (
        <p className="tasks-panel__empty">لا توجد مهام بعد.</p>
      ) : (
        <ul className="tasks-panel__list">
          {allTasks.map((task) => {
            const isActive = ACTIVE_STATUSES.includes(task.status);
            return (
              <li
                key={task.id}
                className={`tasks-panel__item ${isActive ? "is-active" : ""}`}
                onClick={() => setSelected(task)}
              >
                <div className="tasks-panel__item-main">
                  <span className="tasks-panel__item-title">
                    {task.title || task.prompt?.slice(0, 60) || "مهمة"}
                  </span>
                  <span className="tasks-panel__item-status">
                    {STATUS_LABEL[task.status] || task.status}
                  </span>
                </div>
                <span className="tasks-panel__item-date">
                  {new Date(task.created_at).toLocaleDateString("ar-EG")}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
