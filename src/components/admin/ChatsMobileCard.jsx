// ============================================
// src/components/admin/ChatsMobileCard.jsx
// كارت محادثة — عرض الهاتف
// ============================================

export default function ChatsMobileCard({
  chat,
  chatUser,
  theme,
  formatDate,
  onOpenChat,
  onDeleteChat,
}) {
  return (
    <div
      style={{
        background: theme.surface,
        border: `1px solid ${theme.border}`,
        borderRadius: "14px",
        padding: "14px",
        marginBottom: "10px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
      }}
    >
      {/* المستخدم */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #10b981, #059669)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "18px",
            flexShrink: 0,
          }}
        >
          👤
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: "600", fontSize: "14px" }}>
            {chatUser?.name || "مستخدم محذوف"}
          </div>
          <div
            style={{
              fontSize: "12px",
              opacity: 0.6,
              fontFamily: "monospace",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {chatUser?.email || chat.user_id?.slice(0, 8)}
          </div>
        </div>
      </div>

      {/* العنوان + الرسائل */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "8px",
          padding: "10px 12px",
          background: theme.inputBg,
          borderRadius: "10px",
        }}
      >
        <div
          style={{
            flex: 1,
            fontSize: "13px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontWeight: "500",
          }}
        >
          {chat.title || "بدون عنوان"}
        </div>
        <span
          style={{
            background: "rgba(16,185,129,0.15)",
            color: "#10b981",
            padding: "3px 10px",
            borderRadius: "20px",
            fontSize: "12px",
            fontWeight: "600",
            whiteSpace: "nowrap",
          }}
        >
          💬 {chat.messages?.length || 0}
        </span>
      </div>

      {/* التاريخ */}
      <div
        style={{
          fontSize: "11px",
          opacity: 0.6,
          textAlign: "right",
        }}
      >
        📅 {formatDate(chat.updated_at)}
      </div>

      {/* الإجراءات */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "6px",
        }}
      >
        <button
          onClick={() => onOpenChat(chat)}
          style={{
            background: "rgba(59,130,246,0.15)",
            color: "#3b82f6",
            border: "none",
            padding: "10px",
            borderRadius: "10px",
            cursor: "pointer",
            fontSize: "13px",
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
            padding: "10px",
            borderRadius: "10px",
            cursor: "pointer",
            fontSize: "13px",
            fontWeight: "600",
            fontFamily: "inherit",
          }}
        >
          🗑️ حذف
        </button>
      </div>
    </div>
  );
}
