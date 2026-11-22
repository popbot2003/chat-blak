// ============================================
// src/components/tasks/TasksPanel.jsx — BLACK 🖤
// قسم المهام المستقل — قائمة + إنشاء + تفاصيل
// ============================================

import { useState, useEffect, useCallback, useRef } from "react";
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

export default function TasksPanel({ user, activeTasks = [], onCancelTask, onCreateTask }) {
  const [historyTasks, setHistoryTasks]   = useState([]);
  const [selected, setSelected]           = useState(null);
  const [input, setInput]                 = useState("");
  const [sending, setSending]             = useState(false);
  const [loading, setLoading]             = useState(false);
  const [confirmClear, setConfirmClear]   = useState(false);
  const inputRef = useRef(null);

  const loadHistory = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      setHistoryTasks(data || []);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  // ─── إنشاء مهمة جديدة ───────────────────
  async function handleCreate(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      await onCreateTask?.(text);
      setInput("");
      await loadHistory();
    } catch {
      showToast("فشل إنشاء المهمة", "error");
    } finally {
      setSending(false);
    }
  }

  // ─── حذف مهمة ───────────────────────────
  async function handleDelete(taskId) {
    await supabase.from("tasks").delete().eq("id", taskId).eq("user_id", user.id);
    setHistoryTasks((prev) => prev.filter((t) => t.id !== taskId));
    if (selected?.id === taskId) setSelected(null);
  }

  // ─── مسح السجل ──────────────────────────
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

  // دمج الشغّالة مع السجل بدون تكرار
  const allTasks = [
    ...activeTasks,
    ...historyTasks.filter((h) => !activeTasks.some((a) => a.id === h.id)),
  ];

  const doneTasks   = allTasks.filter((t) => !ACTIVE_STATUSES.includes(t.status));
  const hasDone     = doneTasks.length > 0;

  // ─── صفحة التفاصيل ──────────────────────
  if (selected) {
    const isActive = ACTIVE_STATUSES.includes(selected.status);
    return (
      <div className="tasks-panel" dir="rtl">
        <div className="tasks-panel__head">
          <button type="button" className="ui-btn ui-btn--ghost ui-btn--sm" onClick={() => setSelected(null)}>
            ← رجوع
          </button>
          <span className="tasks-panel__status-badge">{STATUS_LABEL[selected.status] || selected.status}</span>
        </div>

        <div className="tasks-panel__detail">
          <p className="tasks-panel__task-title">{selected.title || selected.prompt}</p>

          {selected.steps?.length > 0 && (
            <div className="tasks-panel__steps">
              <strong>الخطوات:</strong>
              <ol>{selected.steps.map((s, i) => (
                <li key={i}>{typeof s === "string" ? s : s.description || JSON.stringify(s)}</li>
              ))}</ol>
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
            {isActive ? (
              <button type="button" className="ui-btn ui-btn--danger ui-btn--sm"
                onClick={() => { onCancelTask?.(selected.id); setSelected(null); }}>
                إلغاء المهمة
              </button>
            ) : (
              <button type="button" className="ui-btn ui-btn--ghost ui-btn--sm"
                onClick={() => handleDelete(selected.id)}>
                حذف
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── القائمة الرئيسية ────────────────────
  return (
    <div className="tasks-panel" dir="rtl">

      {/* ── رأس القسم ── */}
      <div className="tasks-panel__head">
        <span className="tasks-panel__title">
          المهام
          {activeTasks.length > 0 && (
            <span className="tasks-panel__badge">{activeTasks.length}</span>
          )}
        </span>
        {hasDone && !confirmClear && (
          <button type="button" className="ui-btn ui-btn--ghost ui-btn--xs"
            onClick={() => setConfirmClear(true)}>
            مسح السجل
          </button>
        )}
        {confirmClear && (
          <div className="tasks-panel__confirm">
            <button type="button" className="ui-btn ui-btn--danger ui-btn--xs"
              onClick={handleClearHistory}>تأكيد</button>
            <button type="button" className="ui-btn ui-btn--ghost ui-btn--xs"
              onClick={() => setConfirmClear(false)}>إلغاء</button>
          </div>
        )}
      </div>

      {/* ── خانة إنشاء مهمة ── */}
      <form className="tasks-panel__composer" onSubmit={handleCreate}>
        <textarea
          ref={inputRef}
          className="tasks-panel__input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="اكتب مهمة لتنفيذها في الخلفية…"
          rows={2}
          disabled={sending}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && window.innerWidth > 768) {
              e.preventDefault();
              handleCreate(e);
            }
          }}
        />
        <button
          type="submit"
          className="tasks-panel__send"
          disabled={!input.trim() || sending}
          aria-label="إرسال المهمة"
        >
          {sending ? "⏳" : "↑"}
        </button>
      </form>

      {/* ── قائمة المهام ── */}
      {loading ? (
        <p className="tasks-panel__empty">جارٍ التحميل…</p>
      ) : allTasks.length === 0 ? (
        <div className="tasks-panel__empty-state">
          <span>🤖</span>
          <p>لا توجد مهام بعد.</p>
          <p className="tasks-panel__empty-hint">اكتب مهمة في الأعلى وسينفذها بلاك في الخلفية.</p>
        </div>
      ) : (
        <>
          {activeTasks.length > 0 && (
            <>
              <p className="tasks-panel__section-label">🔄 جارٍ التنفيذ</p>
              <ul className="tasks-panel__list">
                {activeTasks.map((task) => (
                  <TaskItem key={task.id} task={task} onSelect={setSelected} />
                ))}
              </ul>
            </>
          )}

          {doneTasks.length > 0 && (
            <>
              <p className="tasks-panel__section-label">السجل</p>
              <ul className="tasks-panel__list">
                {doneTasks.map((task) => (
                  <TaskItem key={task.id} task={task} onSelect={setSelected} />
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  );
}

function TaskItem({ task, onSelect }) {
  const isActive = ACTIVE_STATUSES.includes(task.status);
  return (
    <li className={`tasks-panel__item ${isActive ? "is-active" : ""}`}
      onClick={() => onSelect(task)}>
      <div className="tasks-panel__item-main">
        <span className="tasks-panel__item-title">
          {task.title || task.prompt?.slice(0, 60) || "مهمة"}
        </span>
        <span className="tasks-panel__item-status">{STATUS_LABEL[task.status] || task.status}</span>
      </div>
      <span className="tasks-panel__item-date">
        {new Date(task.created_at).toLocaleDateString("ar-EG")}
      </span>
    </li>
  );
}
