// ============================================
// TaskMessage.jsx
// كارت مهمة في الشات
// ============================================

export default function TaskMessage({ task, onCancel }) {
  const {
    id,
    input,
    status,
    current_step = 0,
    total_steps = 0,
    result,
    error,
    created_at,
  } = task;

  const isActive = ["pending", "planning", "running", "waiting", "merging"].includes(status);
  const isCompleted = status === "completed";
  const isFailed = status === "failed";
  const isCancelled = status === "cancelled";

  const percent = total_steps > 0
    ? Math.floor((current_step / total_steps) * 100)
    : 0;

  return (
    <div className="task-card">
      {/* Header */}
      <div className="task-card-header">
        <div className="task-card-title">
          <span className="task-card-icon">📋</span>
          <span className="task-card-label">
            {isCompleted && "✅ مهمة مكتملة"}
            {isActive && "📋 مهمة قيد التنفيذ"}
            {isFailed && "❌ مهمة فاشلة"}
            {isCancelled && "🛑 مهمة ملغاة"}
          </span>
        </div>

        {isActive && onCancel && (
          <button
            onClick={() => onCancel(id)}
            className="task-card-cancel"
            title="إيقاف المهمة"
          >
            🛑 إيقاف
          </button>
        )}
      </div>

      {/* Input (الطلب) */}
      <div className="task-card-input">
        {input}
      </div>

      {/* Progress (للمهام النشطة) */}
      {isActive && total_steps > 0 && (
        <div className="task-card-progress">
          <div className="task-card-progress-info">
            <span>
              {status === "merging"
                ? "🔄 جاري دمج النتائج..."
                : `⏳ الخطوة ${current_step}/${total_steps}`}
            </span>
            <span>{percent}%</span>
          </div>
          <div className="task-card-progress-bar">
            <div
              className="task-card-progress-fill"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      )}

      {/* Pending State (لم يبدأ بعد) */}
      {isActive && total_steps === 0 && (
        <div className="task-card-waiting">
          ⏳ في الانتظار... سيبدأ التنفيذ خلال دقيقة.
        </div>
      )}

      {/* Result (عند الاكتمال) */}
      {isCompleted && result && (
        <div className="task-card-result">
          <div className="task-card-result-header">
            <span>📄 النتيجة النهائية</span>
            <button
              onClick={() => navigator.clipboard.writeText(result)}
              className="task-card-copy"
              title="نسخ"
            >
              📋 نسخ
            </button>
          </div>
          <div className="task-card-result-body">
            {result}
          </div>
        </div>
      )}

      {/* Error */}
      {isFailed && error && (
        <div className="task-card-error">
          ❌ {error}
        </div>
      )}

      {isCancelled && (
        <div className="task-card-cancelled">
          🛑 تم إيقاف هذه المهمة.
        </div>
      )}
    </div>
  );
}
