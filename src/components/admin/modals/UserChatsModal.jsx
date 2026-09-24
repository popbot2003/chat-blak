// ============================================
// src/components/admin/modals/UserChatsModal.jsx
// ============================================

export default function UserChatsModal({
  show,
  onClose,
  selectedUserForChats,
  userChatsList,
  theme,
  formatDate,
  onOpenChat,
  onDeleteChat,
  onDeleteAll,
}) {
  if (!show || !selectedUserForChats) return null;

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
          maxWidth: "650px",
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
          <h3 style={{ fontSize: "20px" }}>
            💬 محادثات {selectedUserForChats.name}
          </h3>
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
        {userChatsList.length === 0 ? (
          <p style={{ textAlign: "center", opacity: 0.5, padding: "40px" }}>
            لا توجد محادثات
          </p>
        ) : (
          userChatsList.map((chat) => (
            <div
              key={chat.id}
              style={{
                background: theme.inputBg,
                borderRadius: "10px",
                padding: "12px",
                marginBottom: "8px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "8px",
              }}
            >
              <div>
                <div style={{ fontWeight: "600", fontSize: "14px" }}>
                  {chat.title || "بدون عنوان"}
                </div>
                <div style={{ fontSize: "12px", opacity: 0.5 }}>
                  {formatDate(chat.updated_at)} · {chat.messages?.length || 0}{" "}
                  رسالة
                </div>
              </div>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                <button
                  onClick={() => onOpenChat(chat)}
                  style={{
                    background: "rgba(59,130,246,0.15)",
                    color: "#3b82f6",
                    border: "none",
                    padding: "6px 12px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: "600",
                    fontFamily: "inherit",
                  }}
                >
                  👁️ عرض
                </button>
                <button
                  onClick={() => onDeleteChat(chat.id)}
                  style={{
                    background: "rgba(239,68,68,0.15)",
                    color: "#ef4444",
                    border: "none",
                    padding: "6px 12px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: "600",
                    fontFamily: "inherit",
                  }}
                >
                  🗑️ حذف
                </button>
              </div>
            </div>
          ))
        )}
        <div
          style={{
            marginTop: "16px",
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={() =>
              onDeleteAll(selectedUserForChats.id, selectedUserForChats.name)
            }
            style={{
              background: "rgba(239,68,68,0.15)",
              color: "#ef4444",
              border: "1px solid rgba(239,68,68,0.3)",
              padding: "10px 16px",
              borderRadius: "10px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "600",
              fontFamily: "inherit",
            }}
          >
            🗑️ حذف الكل
          </button>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "10px",
              background: theme.inputBg,
              color: theme.text,
              border: `1px solid ${theme.border}`,
              borderRadius: "10px",
              cursor: "pointer",
              fontSize: "14px",
              fontFamily: "inherit",
            }}
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
