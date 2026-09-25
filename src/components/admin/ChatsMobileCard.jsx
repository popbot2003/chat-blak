// ============================================
// src/components/admin/ChatsMobileCard.jsx — Responsive
// كارت محادثة — عرض الهاتف
// متوافق مع:
//   - src/config/breakpoints.js
//   - src/App.css (media queries موحّدة)
// ============================================

import { useState, useMemo, useCallback } from "react";

export default function ChatsMobileCard({
  chat,
  chatUser,
  theme,
  formatDate,
  onOpenChat,
  onDeleteChat,
}) {
  // ===== ✅ أنماط الكارت =====
  const cardStyle = useMemo(
    () => ({
      background: theme.surface,
      border: `1px solid ${theme.border}`,
      borderRadius: "14px",
      padding: "14px",
      marginBottom: "10px",
      display: "flex",
      flexDirection: "column",
      gap: "10px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
    }),
    [theme.surface, theme.border]
  );

  const avatarStyle = useMemo(
    () => ({
      width: "40px",
      height: "40px",
      borderRadius: "50%",
      background: "linear-gradient(135deg, #10b981, #059669)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "18px",
      flexShrink: 0,
    }),
    []
  );

  const userNameStyle = useMemo(
    () => ({
      fontWeight: "600",
      fontSize: "14px",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    }),
    []
  );

  const userEmailStyle = useMemo(
    () => ({
      fontSize: "12px",
      opacity: 0.6,
      fontFamily: "monospace",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    }),
    []
  );

  const titleBoxStyle = useMemo(
    () => ({
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: "8px",
      padding: "10px 12px",
      background: theme.inputBg,
      borderRadius: "10px",
    }),
    [theme.inputBg]
  );

  const titleTextStyle = useMemo(
    () => ({
      flex: 1,
      fontSize: "13px",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      fontWeight: "500",
      minWidth: 0,
    }),
    []
  );

  const messagesBadgeStyle = useMemo(
    () => ({
      background: "rgba(16,185,129,0.15)",
      color: "#10b981",
      padding: "3px 10px",
      borderRadius: "20px",
      fontSize: "12px",
      fontWeight: "600",
      whiteSpace: "nowrap",
      flexShrink: 0,
    }),
    []
  );

  const actionsGridStyle = useMemo(
    () => ({
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "6px",
    }),
    []
  );

  // ===== ✅ Handlers (useCallback) =====
  const handleOpen = useCallback(() => {
    onOpenChat(chat);
  }, [onOpenChat, chat]);

  const handleDelete = useCallback(() => {
    onDeleteChat(chat.id);
  }, [onDeleteChat, chat.id]);

  // ===== JSX =====
  return (
    <div style={cardStyle}>
      {/* ===== المستخدم ===== */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={avatarStyle}>👤</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={userNameStyle}>
            {chatUser?.name || "مستخدم محذوف"}
          </div>
          <div
            style={userEmailStyle}
            title={chatUser?.email || chat.user_id}
          >
            {chatUser?.email || chat.user_id?.slice(0, 8)}
          </div>
        </div>
      </div>

      {/* ===== العنوان + الرسائل ===== */}
      <div style={titleBoxStyle}>
        <div style={titleTextStyle} title={chat.title || "بدون عنوان"}>
          {chat.title || "بدون عنوان"}
        </div>
        <span style={messagesBadgeStyle}>
          💬 {chat.messages?.length || 0}
        </span>
      </div>

      {/* ===== التاريخ ===== */}
      <div
        style={{
          fontSize: "11px",
          opacity: 0.6,
          textAlign: "right",
        }}
      >
        📅 {formatDate(chat.updated_at)}
      </div>

      {/* ===== الإجراءات ===== */}
      <div style={actionsGridStyle}>
        <ActionBtn
          icon="👁️"
          label="عرض"
          color="#3b82f6"
          bg="rgba(59,130,246,0.15)"
          onClick={handleOpen}
        />
        <ActionBtn
          icon="🗑️"
          label="حذف"
          color="#ef4444"
          bg="rgba(239,68,68,0.15)"
          onClick={handleDelete}
        />
      </div>
    </div>
  );
}

// ============================================================
//  ActionBtn — زر بأيقونة ونص بحالة pressed
// ============================================================
function ActionBtn({ icon, label, color, bg, onClick }) {
  const [pressed, setPressed] = useState(false);

  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      style={{
        background: bg,
        color: color,
        border: "none",
        padding: "10px",
        borderRadius: "10px",
        cursor: "pointer",
        fontSize: "13px",
        fontWeight: "600",
        fontFamily: "inherit",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "6px",
        // ✅ هدف لمس مريح
        minHeight: "44px",
        transform: pressed ? "scale(0.97)" : "scale(1)",
        transition: "transform 0.1s",
      }}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}
