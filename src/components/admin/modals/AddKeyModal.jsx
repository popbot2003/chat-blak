// ============================================
// src/components/admin/modals/AddKeyModal.jsx
// ============================================

export default function AddKeyModal({
  show,
  onClose,
  onAdd,
  newKeyName,
  setNewKeyName,
  newKeyValue,
  setNewKeyValue,
  newKeyLimit,
  setNewKeyLimit,
  validating,
  theme,
  modalInputStyle,
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
          maxWidth: "450px",
          border: `1px solid ${theme.border}`,
        }}
      >
        <h3 style={{ marginBottom: "20px", fontSize: "20px" }}>
          ➕ إضافة مفتاح API
        </h3>
        <input
          style={modalInputStyle}
          type="text"
          placeholder="اسم المفتاح"
          value={newKeyName}
          onChange={(e) => setNewKeyName(e.target.value)}
        />
        <input
          style={{ ...modalInputStyle, fontFamily: "monospace" }}
          type="text"
          placeholder="gsk_xxxxxxxxxxxx"
          value={newKeyValue}
          onChange={(e) => setNewKeyValue(e.target.value)}
        />
        <input
          style={modalInputStyle}
          type="number"
          placeholder="الحد اليومي"
          value={newKeyLimit}
          onChange={(e) => setNewKeyLimit(parseInt(e.target.value) || 0)}
        />
        <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
          <button
            onClick={onAdd}
            disabled={validating}
            style={{
              flex: 1,
              padding: "12px",
              background: "linear-gradient(135deg, #10b981, #059669)",
              color: "#fff",
              border: "none",
              borderRadius: "10px",
              cursor: validating ? "not-allowed" : "pointer",
              fontSize: "15px",
              fontWeight: "600",
              fontFamily: "inherit",
              opacity: validating ? 0.6 : 1,
            }}
          >
            {validating ? "⏳ جاري التحقق..." : "✅ إضافة"}
          </button>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "12px",
              background: theme.inputBg,
              color: theme.text,
              border: `1px solid ${theme.border}`,
              borderRadius: "10px",
              cursor: "pointer",
              fontSize: "15px",
              fontFamily: "inherit",
            }}
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}
