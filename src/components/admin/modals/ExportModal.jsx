// ============================================
// src/components/admin/modals/ExportModal.jsx
// ============================================

export default function ExportModal({
  show,
  onClose,
  exportType,
  setExportType,
  prepareExportData,
  exportToCSV,
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
          maxWidth: "380px",
          border: `1px solid ${theme.border}`,
        }}
      >
        <h3 style={{ marginBottom: "20px", fontSize: "20px" }}>
          📥 تصدير البيانات
        </h3>
        <select
          value={exportType}
          onChange={(e) => setExportType(e.target.value)}
          style={modalInputStyle}
        >
          <option value="users">👥 المستخدمين</option>
          <option value="keys">🔑 المفاتيح</option>
          <option value="chats">💬 المحادثات</option>
        </select>
        <div
          style={{
            background: theme.inputBg,
            padding: "12px",
            borderRadius: "10px",
            marginBottom: "16px",
            fontSize: "14px",
          }}
        >
          📊 عدد السجلات: <strong>{prepareExportData().length}</strong>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={() => {
              exportToCSV(prepareExportData(), exportType);
              onClose();
            }}
            style={{
              flex: 1,
              padding: "12px",
              background: "linear-gradient(135deg, #10b981, #059669)",
              color: "#fff",
              border: "none",
              borderRadius: "10px",
              cursor: "pointer",
              fontSize: "15px",
              fontWeight: "600",
              fontFamily: "inherit",
            }}
          >
            📥 تصدير CSV
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
