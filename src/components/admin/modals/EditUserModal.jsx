// ============================================
// src/components/admin/modals/EditUserModal.jsx
// ============================================

export default function EditUserModal({
  show,
  onClose,
  onSave,
  selectedUser,
  editDailyLimit,
  setEditDailyLimit,
  theme,
  modalInputStyle,
}) {
  if (!show || !selectedUser) return null;

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
          ⚙️ تعديل {selectedUser.name || selectedUser.email}
        </h3>
        <label style={{ fontSize: "14px", opacity: 0.7, display: "block", marginBottom: "6px" }}>
          الحد اليومي (توكن)
        </label>
        <input
          style={modalInputStyle}
          type="number"
          value={editDailyLimit}
          onChange={(e) => setEditDailyLimit(parseInt(e.target.value) || 0)}
        />
        <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
          <button
            onClick={onSave}
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
            💾 حفظ
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
