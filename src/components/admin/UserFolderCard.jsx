// ============================================
// src/components/admin/UserFolderCard.jsx — Responsive
// بطاقة مجلد محادثات مستخدم — تعمل على كل الأجهزة
// متوافق مع:
//   - src/config/breakpoints.js
//   - src/App.css (media queries موحّدة)
// ============================================

import { useState, useMemo, useCallback } from "react";

// ============================================================
//  Helper: ترجمة "آخر نشاط" لنص عربي
// ============================================================
function formatRelativeTime(timestamp) {
  if (!timestamp) return "غير معروف";
  const now = Date.now();
  const diff = now - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "الآن";
  if (minutes < 60) return `قبل ${minutes} دقيقة`;
  if (hours < 24) return `قبل ${hours} ساعة`;
  if (days < 7) return `قبل ${days} يوم`;
  if (days < 30) return `قبل ${Math.floor(days / 7)} أسبوع`;
  if (days < 365) return `قبل ${Math.floor(days / 30)} شهر`;
  return `قبل ${Math.floor(days / 365)} سنة`;
}

// ============================================================
//  Helper: ترجمة "آخر نشاط" لنص قصير
// ============================================================
function formatRelativeShort(timestamp) {
  if (!timestamp) return "—";
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "الآن";
  if (minutes < 60) return `${minutes}د`;
  if (hours < 24) return `${hours}س`;
  if (days < 7) return `${days}ي`;
  if (days < 30) return `${Math.floor(days / 7)}أ`;
  return `${Math.floor(days / 30)}ش`;
}

// ============================================================
//  Helper: حالة المستخدم
// ============================================================
function getUserStatus(lastActivity) {
  if (!lastActivity) {
    return { label: "غير معروف", color: "#94a3b8", dot: "⚪" };
  }
  const diff = Date.now() - new Date(lastActivity).getTime();
  const hours = diff / 3600000;

  if (hours < 1) return { label: "نشط الآن", color: "#10b981", dot: "🟢" };
  if (hours < 24) return { label: "نشط اليوم", color: "#3b82f6", dot: "🔵" };
  if (hours < 168) return { label: "آخر أسبوع", color: "#f59e0b", dot: "🟡" };
  return { label: "غير نشط", color: "#94a3b8", dot: "⚪" };
}

// ============================================================
//  المكوّن الرئيسي
// ============================================================
export default function UserFolderCard({
  user,
  userChats,
  theme,
  isMobile = false,
  isTablet = false,
  online = false,
  onOpen,
}) {
  const [hover, setHover] = useState(false);

  // ===== ✅ حساب البيانات =====
  const stats = useMemo(() => {
    const chats = userChats || [];
    const chatCount = chats.length;

    // آخر نشاط = آخر updated_at في المحادثات
    const lastActivity =
      chatCount > 0
        ? chats.reduce((latest, chat) => {
            const t = new Date(chat.updated_at).getTime();
            return t > latest ? t : latest;
          }, 0)
        : null;

    // معاينة آخر محادثة
    const latestChat = chatCount > 0
      ? chats.reduce((latest, chat) => {
          return new Date(chat.updated_at) > new Date(latest.updated_at)
            ? chat
            : latest;
        }, chats[0])
      : null;

    // إجمالي الرسائل
    const totalMessages = chats.reduce(
      (sum, c) => sum + (c.messages?.length || 0),
      0
    );

    return {
      chatCount,
      lastActivity,
      latestChat,
      totalMessages,
      status: getUserStatus(lastActivity),
      relativeTime: formatRelativeTime(lastActivity),
      relativeShort: formatRelativeShort(lastActivity),
    };
  }, [userChats]);

  // ===== ✅ أنماط البطاقة =====
  const cardStyle = useMemo(
    () => ({
      background: theme.surface,
      border: `1px solid ${hover ? "#10b981" : theme.border}`,
      borderRadius: "14px",
      padding: isMobile ? "12px" : "16px",
      marginBottom: isMobile ? "10px" : "12px",
      display: "flex",
      flexDirection: "column",
      gap: isMobile ? "10px" : "12px",
      boxShadow: hover
        ? "0 4px 12px rgba(16,185,129,0.15)"
        : "0 1px 3px rgba(0,0,0,0.04)",
      transition: "border-color 0.2s, box-shadow 0.2s, transform 0.15s",
      cursor: "pointer",
      transform: hover ? "translateY(-1px)" : "translateY(0)",
    }),
    [theme.surface, theme.border, hover, isMobile]
  );

  // ===== ✅ Header (Avatar + اسم) =====
  const headerStyle = useMemo(
    () => ({
      display: "flex",
      alignItems: "center",
      gap: isMobile ? "10px" : "12px",
      minWidth: 0,
    }),
    [isMobile]
  );

  const avatarStyle = useMemo(
    () => ({
      width: isMobile ? "42px" : "48px",
      height: isMobile ? "42px" : "48px",
      borderRadius: "50%",
      background: "linear-gradient(135deg, #10b981, #059669)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: isMobile ? "18px" : "20px",
      flexShrink: 0,
      position: "relative",
    }),
    [isMobile]
  );

  const onlineDotStyle = useMemo(
    () => ({
      position: "absolute",
      bottom: "0",
      right: "0",
      width: "12px",
      height: "12px",
      borderRadius: "50%",
      background: online ? "#10b981" : "#6b7280",
      border: `2px solid ${theme.surface}`,
      boxShadow: online ? "0 0 6px #10b981" : "none",
    }),
    [online, theme.surface]
  );

  const userInfoStyle = useMemo(
    () => ({
      flex: 1,
      minWidth: 0,
    }),
    []
  );

  const nameStyle = useMemo(
    () => ({
      fontWeight: "700",
      fontSize: isMobile ? "15px" : "16px",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      marginBottom: "2px",
    }),
    [isMobile]
  );

  const emailStyle = useMemo(
    () => ({
      fontSize: isMobile ? "11px" : "12px",
      opacity: 0.6,
      fontFamily: "monospace",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    }),
    []
  );

  // ===== ✅ Stats Grid =====
  const statsGridStyle = useMemo(
    () => ({
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3, 1fr)",
      gap: "8px",
    }),
    [isMobile]
  );

  const statBoxStyle = useMemo(
    () => ({
      background: theme.inputBg,
      padding: isMobile ? "8px 10px" : "10px 12px",
      borderRadius: "10px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "2px",
      minWidth: 0,
    }),
    [theme.inputBg, isMobile]
  );

  const statValueStyle = useMemo(
    () => ({
      fontSize: isMobile ? "16px" : "18px",
      fontWeight: "700",
      color: "#10b981",
      lineHeight: 1.2,
    }),
    [isMobile]
  );

  const statLabelStyle = useMemo(
    () => ({
      fontSize: isMobile ? "10px" : "11px",
      opacity: 0.6,
      whiteSpace: "nowrap",
    }),
    [isMobile]
  );

  // ===== ✅ Footer (آخر محادثة + زر) =====
  const footerStyle = useMemo(
    () => ({
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "8px",
      paddingTop: "4px",
      borderTop: `1px solid ${theme.border}`,
      flexWrap: "wrap",
    }),
    [theme.border]
  );

  const lastChatStyle = useMemo(
    () => ({
      flex: 1,
      minWidth: 0,
      display: "flex",
      flexDirection: "column",
      gap: "2px",
    }),
    []
  );

  const lastChatTitleStyle = useMemo(
    () => ({
      fontSize: isMobile ? "11px" : "12px",
      opacity: 0.7,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    }),
    [isMobile]
  );

  const lastChatTimeStyle = useMemo(
    () => ({
      fontSize: isMobile ? "10px" : "11px",
      opacity: 0.5,
      display: "flex",
      alignItems: "center",
      gap: "4px",
    }),
    [isMobile]
  );

  // ===== ✅ Handlers =====
  const handleClick = useCallback(() => {
    if (onOpen) onOpen(user.id, user.name || user.email);
  }, [onOpen, user.id, user.name, user.email]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleClick();
      }
    },
    [handleClick]
  );

  // ===== JSX =====
  return (
    <div
      style={cardStyle}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      role="button"
      tabIndex={0}
      aria-label={`فتح محادثات ${user.name || user.email}`}
    >
      {/* ===== Header ===== */}
      <div style={headerStyle}>
        <div style={avatarStyle}>
          👤
          <div style={onlineDotStyle} />
        </div>
        <div style={userInfoStyle}>
          <div style={nameStyle} title={user.name || "بدون اسم"}>
            {user.name || "مستخدم"}
          </div>
          <div style={emailStyle} title={user.email}>
            {user.email || "—"}
          </div>
        </div>
        <div
          style={{
            fontSize: isMobile ? "20px" : "22px",
            opacity: 0.4,
            flexShrink: 0,
          }}
        >
          📁
        </div>
      </div>

      {/* ===== Stats ===== */}
      <div style={statsGridStyle}>
        <div style={statBoxStyle}>
          <div style={statValueStyle}>{stats.chatCount}</div>
          <div style={statLabelStyle}>💬 محادثة</div>
        </div>
        <div style={statBoxStyle}>
          <div style={statValueStyle}>{stats.totalMessages}</div>
          <div style={statLabelStyle}>📝 رسالة</div>
        </div>
        {!isMobile && (
          <div style={statBoxStyle}>
            <div
              style={{
                ...statValueStyle,
                fontSize: "14px",
                color: stats.status.color,
              }}
            >
              {stats.status.dot} {stats.relativeShort}
            </div>
            <div style={statLabelStyle}>{stats.status.label}</div>
          </div>
        )}
      </div>

      {/* ===== Footer ===== */}
      <div style={footerStyle}>
        <div style={lastChatStyle}>
          <div style={lastChatTitleStyle} title={stats.latestChat?.title}>
            📌 {stats.latestChat?.title || "لا توجد محادثات"}
          </div>
          <div style={lastChatTimeStyle}>
            <span>{stats.status.dot}</span>
            <span>{stats.relativeTime}</span>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleClick();
          }}
          style={{
            background: "rgba(16,185,129,0.15)",
            color: "#10b981",
            border: "1px solid rgba(16,185,129,0.3)",
            padding: isMobile ? "8px 14px" : "8px 16px",
            borderRadius: "10px",
            cursor: "pointer",
            fontSize: isMobile ? "12px" : "13px",
            fontWeight: "600",
            fontFamily: "inherit",
            whiteSpace: "nowrap",
            minHeight: isMobile ? "40px" : "auto",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
          aria-label="فتح المحادثات"
        >
          فتح ←
        </button>
      </div>
    </div>
  );
}
