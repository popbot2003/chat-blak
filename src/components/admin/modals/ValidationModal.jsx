// ============================================
// src/components/admin/modals/ValidationModal.jsx
// ============================================

export default function ValidationModal({
  show,
  onClose,
  validationResults,
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
          maxWidth: "500px",
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
          <h3>🔍 نتائج الفحص</h3>
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
        <div
          style={{
            marginBottom: "16px",
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              background: "rgba(16,185,129,0.15)",
              color: "#10b981",
              padding: "6px 14px",
              borderRadius: "20px",
              fontSize: "13px",
              fontWeight: "600",
            }}
          >
            ✅ صالح: {validationResults.filter((r) => r.valid).length}
          </span>
          <span
            style={{
              background: "rgba(239,68,68,0.15)",
              color: "#ef4444",
              padding: "6px 14px",
              borderRadius: "20px",
              fontSize: "13px",
              fontWeight: "600",
            }}
          >
            ❌ غير صالح: {validationResults.filter((r) => !r.valid).length}
          </span>
        </div>
        {validationResults.map((result, idx) => (
          <div
            key={idx}
            style={{
              background: result.valid
                ? "rgba(16,185,129,0.05)"
                : "rgba(239,68,68,0.05)",
              padding: "12px",
              borderRadius: "10px",
              marginBottom: "8px",
              borderRight: `3px solid ${
                result.valid ? "#10b981" : "#ef4444"
              }`,
            }}
          >
            <div style={{ fontWeight: "bold", fontSize: "14px" }}>
              {result.name}
            </div>
            <div
              style={{
                fontSize: "11px",
                opacity: 0.6,
                fontFamily: "monospace",
                marginTop: "2px",
              }}
            >
              {result.value}
            </div>
            <div
              style={{
                fontSize: "12px",
                marginTop: "6px",
                color: result.valid ? "#10b981" : "#ef4444",
                fontWeight: "600",
              }}
            >
              {result.valid ? "✅ صالح" : `❌ ${result.reason}`}
            </div>
          </div>
        ))}
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
