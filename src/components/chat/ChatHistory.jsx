// ============================================
// ChatHistory.jsx
// لوحة سجل المحادثات
// ============================================

import { formatDate } from "../../utils/helpers";

export default function ChatHistory({
  chats,
  currentChatId,
  onClose,
  onOpenChat,
  onDeleteChat,
}) {
  return (
    <>
      {/* Overlay لإغلاق اللوحة */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 300,
          background: "rgba(0,0,0,0.5)",
        }}
      />

      {/* اللوحة */}
      <div
        className="history-panel"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "320px",
          maxWidth: "90vw",
          zIndex: 301,
          display: "flex",
          flexDirection: "column",
          background: "inherit",
        }}
      >
        {/* الرأس */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            flexShrink: 0,
          }}
        >
          <strong style={{ fontSize: "16px" }}>
            📝 السجل ({chats.length})
          </strong>
          <button onClick={onClose} className="close-btn">
            ✕
          </button>
        </div>

        {/* القائمة */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "8px",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
          }}
        >
          {chats.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                opacity: 0.6,
                padding: "20px",
              }}
            >
              مفيش محادثات
            </div>
          ) : (
            chats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => onOpenChat(chat.id)}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 14px",
                  borderRadius: "12px",
                  cursor: "pointer",
                  background:
                    chat.id === currentChatId
                      ? "rgba(108,92,231,0.2)"
                      : "rgba(255,255,255,0.03)",
                  border:
                    chat.id === currentChatId
                      ? "1px solid rgba(108,92,231,0.3)"
                      : "1px solid transparent",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: 500,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {chat.title}
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      opacity: 0.5,
                      marginTop: "2px",
                    }}
                  >
                    {formatDate(chat.date)} · {chat.messageCount} رسالة
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteChat(chat.id);
                  }}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "inherit",
                    fontSize: "16px",
                    cursor: "pointer",
                    opacity: 0.5,
                    flexShrink: 0,
                    marginRight: "4px",
                  }}
                  title="حذف المحادثة"
                >
                  🗑️
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
