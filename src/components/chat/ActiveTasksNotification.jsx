// ============================================
// ActiveTasksNotification.jsx
// إشعار عائم للمهام النشطة
// ============================================

import { useState, useEffect } from "react";

export default function ActiveTasksNotification({
  tasks = [],
  currentChatId,
  onOpenTask,
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  // ✅ مهام في المحادثة الحالية
  const currentTasks = tasks.filter(
    (t) => t.chat_id === currentChatId
  );
  const otherTasks = tasks.filter(
    (t) => t.chat_id !== currentChatId
  );

  const hasCurrent = currentTasks.length > 0;
  const hasOther = otherTasks.length > 0;
  const totalCount = tasks.length;

  // ✅ طي تلقائي
  useEffect(() => {
    if (hasCurrent && !hasOther) {
      setIsExpanded(true);
    } else if (!hasCurrent && hasOther) {
      setIsExpanded(false);
    } else if (hasCurrent && hasOther) {
      setIsExpanded(true);
    }
  }, [hasCurrent, hasOther, totalCount]);

  if (totalCount === 0) return null;

  // ═══════════════════════════════════════
  // Status helpers
  // ═══════════════════════════════════════
  function getStatusLabel(status) {
    switch (status) {
      case "pending":
        return "⏳ في الانتظار";
      case "planning":
        return "📋 جاري التخطيط";
      case "running":
        return "🔄 جاري التنفيذ";
      case "waiting":
        return "⏸️ في الانتظار";
      case "merging":
        return "🔗 جاري الدمج";
      default:
        return "📋";
    }
  }

  function getStatusColor(status) {
    switch (status) {
      case "running":
        return "#a29bfe";
      case "merging":
        return "#60a5fa";
      case "waiting":
        return "#fbbf24";
      case "planning":
        return "#a29bfe";
      case "pending":
        return "#9ca3af";
      default:
        return "#9ca3af";
    }
  }

  function getPercent(task) {
    if (!task.total_steps || task.total_steps === 0) return 0;
    return Math.floor((task.current_step / task.total_steps) * 100);
  }

  // ═══════════════════════════════════════
  // Render
  // ═══════════════════════════════════════

  // Header text
  let headerText = "";
  if (hasCurrent && hasOther) {
    headerText = `📋 مهمة نشطة (${currentTasks.length}) + (${otherTasks.length}) أخرى`;
  } else if (hasCurrent) {
    headerText = `📋 مهمة قيد التنفيذ (${currentTasks.length})`;
  } else {
    headerText = `📋 مهام نشطة (${otherTasks.length})`;
  }

  return (
    <div className="active-tasks-notification">
      {/* Header */}
      <button
        className="active-tasks-header"
        onClick={() => setIsExpanded(!isExpanded)}
        type="button"
      >
        <span className="active-tasks-header-text">{headerText}</span>
        <span className="active-tasks-header-toggle">
          {isExpanded ? "▾" : "▸"}
        </span>
      </button>

      {/* Body */}
      {isExpanded && (
        <div className="active-tasks-body">
          {/* مهام المحادثة الحالية */}
          {currentTasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              isCurrent={true}
              getStatusLabel={getStatusLabel}
              getStatusColor={getStatusColor}
              getPercent={getPercent}
              onOpenTask={onOpenTask}
            />
          ))}

          {/* فاصل */}
          {hasCurrent && hasOther && (
            <div className="active-tasks-divider">
              <span>مهام أخرى</span>
            </div>
          )}

          {/* مهام المحادثات الأخرى */}
          {otherTasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              isCurrent={false}
              getStatusLabel={getStatusLabel}
              getStatusColor={getStatusColor}
              getPercent={getPercent}
              onOpenTask={onOpenTask}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════
// TaskItem
// ═══════════════════════════════════════
function TaskItem({
  task,
  isCurrent,
  getStatusLabel,
  getStatusColor,
  getPercent,
  onOpenTask,
}) {
  const status = task.status;
  const percent = getPercent(task);
  const statusColor = getStatusColor(status);
  const statusLabel = getStatusLabel(status);

  return (
    <div className={`active-task-item ${isCurrent ? "is-current" : ""}`}>
      {/* Icon + status */}
      <div className="active-task-header">
        <span
          className="active-task-status-dot"
          style={{ background: statusColor }}
        />
        <span className="active-task-status-label">{statusLabel}</span>
        {!isCurrent && <span className="active-task-badge">محادثة أخرى</span>}
      </div>

      {/* Title */}
      <div className="active-task-title">
        {task.input?.slice(0, 80) || "مهمة"}
        {(task.input?.length || 0) > 80 && "..."}
      </div>

      {/* Progress (if running) */}
      {task.total_steps > 0 && (
        <div className="active-task-progress">
          <div className="active-task-progress-info">
            <span>
              ⏳ الخطوة {task.current_step}/{task.total_steps}
            </span>
            <span>{percent}%</span>
          </div>
          <div className="active-task-progress-bar">
            <div
              className="active-task-progress-fill"
              style={{
                width: `${percent}%`,
                background: statusColor,
              }}
            />
            <div className="active-task-progress-shimmer" />
          </div>
        </div>
      )}

      {/* If no progress yet */}
      {task.total_steps === 0 && (
        <div className="active-task-waiting">
          <span className="active-task-spinner" />
          <span>سيبدأ التنفيذ خلال دقيقة...</span>
        </div>
      )}

      {/* Open button (only for other chats) */}
      {!isCurrent && (
        <button
          className="active-task-open-btn"
          onClick={() => onOpenTask(task.chat_id)}
          type="button"
        >
          ← فتح المحادثة
        </button>
      )}
    </div>
  );
}
