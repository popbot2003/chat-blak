// ============================================
// src/components/admin/modals/LogsModal.jsx
// ============================================

export default function LogsModal({
  show,
  onClose,
  validationLogs,
  theme,
}) {
  if (!show) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.75)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: theme.surface,
          padding: "24px",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "600px",
          maxHeight: "80vh",
          overflowY: "auto",
          border: `1px solid ${theme.border}`,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "16px",
          }}
        >
          <h3>📋 سجل الفحوصات</h3>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              fontSize: "22px",
              cursor: "pointer",
              color: theme.text,
            }}
          >
            ✕
          </button>
        </div>
        {validationLogs.length === 0 ? (
          <p style={{ textAlign: "center", opacity: 0.5, padding: "40px" }}>
            لا توجد سجلات
          </p>
        ) : (
          validationLogs.map((log) => (
            <div
              key={log.id}
              style={{
                background: theme.inputBg,
                padding: "12px",
                borderRadius: "10px",
                marginBottom: "10px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                  flexWrap: "wrap",
                  gap: "4px",
                }}
              >
                <span style={{ fontWeight: "bold", fontSize: "13px" }}>
                  {new Date(log.checked_at).toLocaleString("ar-EG")}
                </span>
                <span style={{ fontSize: "12px", opacity: 0.7 }}>
                  {log.check_type === "auto" ? "تلقائي" : "يدوي"}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  fontSize: "13px",
                  flexWrap: "wrap",
                }}
              >
                <span style={{ color: "#10b981" }}>
                  ✅ صالح: {log.valid_keys}
                </span>
                <span style={{ color: "#ef4444" }}>
                  ❌ غير صالح: {log.invalid_keys}
                </span>
                <span style={{ opacity: 0.7 }}>📊 إجمالي: {log.total_keys}</span>
              </div>
            </div>
          ))
        )}
        <button
          onClick={onClose}
          style={{
            width: "100%",
            padding: "12px",
            marginTop: "16px",
            background: theme.inputBg,
            borderRadius: "10px",
            border: `1px solid ${theme.border}`,
            cursor: "pointer",
            color: theme.text,
            fontSize: "14px",
            fontFamily: "inherit",
          }}
        >
          إغلاق
        </button>
      </div>
    </div>
  );
}
