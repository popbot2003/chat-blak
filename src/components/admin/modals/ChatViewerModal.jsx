// ============================================
// src/components/admin/modals/ChatViewerModal.jsx
// ============================================

import MessageContent from "../../MessageContent";

export default function ChatViewerModal({
  show,
  onClose,
  selectedChat,
  theme,
  darkMode,
}) {
  if (!show || !selectedChat) return null;

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
            💬 {selectedChat.title || "محادثة"}
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
        {selectedChat.messages?.map((msg, idx) => (
          <div
            key={idx}
            style={{
              background:
                msg.role === "user"
                  ? darkMode
                    ? "rgba(16,185,129,0.12)"
                    : "rgba(16,185,129,0.08)"
                  : theme.inputBg,
              padding: "14px 16px",
              borderRadius: "12px",
              marginBottom: "10px",
              borderRight:
                msg.role === "user" ? "3px solid #10b981" : "none",
            }}
          >
            <div
              style={{
                fontSize: "12px",
                opacity: 0.6,
                marginBottom: "6px",
                fontWeight: "600",
              }}
            >
              {msg.role === "user" ? "👤 المستخدم" : "🖤 بلاك"}
            </div>
            <div style={{ fontSize: "14px", lineHeight: 1.7 }}>
              <MessageContent content={msg.content} />
            </div>
          </div>
        ))}
        <button
          onClick={onClose}
          style={{
            width: "100%",
            padding: "12px",
            background: theme.inputBg,
            color: theme.text,
            border: `1px solid ${theme.border}`,
            borderRadius: "10px",
            cursor: "pointer",
            fontSize: "14px",
            fontFamily: "inherit",
            marginTop: "16px",
          }}
        >
          إغلاق
        </button>
      </div>
    </div>
  );
}
