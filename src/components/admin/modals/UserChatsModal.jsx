// ============================================
// src/components/admin/modals/UserChatsModal.jsx — Responsive
// متوافق مع:
//   - src/config/breakpoints.js
//   - src/App.css (media queries موحّدة)
// ============================================

import { useEffect, useMemo, useCallback } from "react";

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
  // ✅ جديد: coming from Admin.jsx
  isMobile = false,
}) {
  // ===== ✅ Escape للإغلاق + منع تمرير الخلفية =====
  useEffect(() => {
    if (!show || !selectedUserForChats) return;

    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKey);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [show, selectedUserForChats, onClose]);

  // ===== ✅ أنماط الـ Backdrop =====
  const backdropStyle = useMemo(
    () => ({
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.75)",
      display: "flex",
      alignItems: isMobile ? "stretch" : "center",
      justifyContent: "center",
      zIndex: 1000,
      padding: isMobile ? 0 : "16px",
    }),
    [isMobile]
  );

  // ===== ✅ أنماط المحتوى =====
  const modalStyle = useMemo(
    () => ({
      background: theme.surface,
      padding: isMobile ? "16px 14px" : "24px",
      borderRadius: isMobile ? 0 : "16px",
      width: "100%",
      maxWidth: isMobile ? "100%" : "650px",
      height: isMobile ? "100%" : "auto",
      maxHeight: isMobile ? "100%" : "80vh",
      overflowY: "auto",
      border: isMobile ? "none" : `1px solid ${theme.border}`,
      boxShadow: isMobile ? "none" : "0 20px 60px rgba(0,0,0,0.4)",
      animation: isMobile ? "none" : "fadeInUserChats 0.2s ease-out",
      display: "flex",
      flexDirection: "column",
    }),
    [theme.surface, theme.border, isMobile]
  );

  // ===== ✅ الرأس (sticky على الموبايل) =====
  const headerStyle = useMemo(
    () => ({
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: "8px",
      marginBottom: isMobile ? "12px" : "16px",
      position: isMobile ? "sticky" : "static",
      top: isMobile ? 0 : "auto",
      background: isMobile ? theme.surface : "transparent",
      paddingTop: isMobile ? "4px" : 0,
      paddingBottom: isMobile ? "8px" : 0,
      zIndex: isMobile ? 5 : "auto",
      borderBottom: isMobile ? `1px solid ${theme.border}` : "none",
    }),
    [theme.surface, theme.border, isMobile]
  );

  const titleStyle = useMemo(
    () => ({
      fontSize: isMobile ? "16px" : "20px",
      wordBreak: "break-word",
      overflow: "hidden",
      textOverflow: "ellipsis",
      lineHeight: 1.3,
      flex: 1,
      minWidth: 0,
      margin: 0,
    }),
    [isMobile]
  );

  const closeBtnStyle = useMemo(
    () => ({
      background: "transparent",
      border: "none",
      fontSize: isMobile ? "20px" : "22px",
      cursor: "pointer",
      color: theme.text,
      minWidth: "44px",
      minHeight: "44px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: "8px",
      flexShrink: 0,
    }),
    [theme.text, isMobile]
  );

  // ===== ✅ صف المحادثة =====
  const chatRowStyle = useMemo(
    () => ({
      background: theme.inputBg,
      borderRadius: "10px",
      padding: isMobile ? "10px 12px" : "12px",
      marginBottom: "8px",
      display: "flex",
      flexDirection: isMobile ? "column" : "row",
      justifyContent: "space-between",
      alignItems: isMobile ? "stretch" : "center",
      gap: "8px",
    }),
    [theme.inputBg, isMobile]
  );

  const chatActionsStyle = useMemo(
    () => ({
      display: "flex",
      gap: "6px",
      flexWrap: "wrap",
      // ✅ على موبايل: الأزرار بعرض كامل
      width: isMobile ? "100%" : "auto",
    }),
    [isMobile]
  );

  const chatBtnStyle = useMemo(
    () => ({
      flex: isMobile ? 1 : "initial",
      border: "none",
      padding: isMobile ? "8px 12px" : "6px 12px",
      borderRadius: "8px",
      cursor: "pointer",
      fontSize: isMobile ? "13px" : "12px",
      fontWeight: "600",
      fontFamily: "inherit",
      minHeight: isMobile ? "40px" : "auto",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "4px",
    }),
    [isMobile]
  );

  // ===== ✅ الذيل (sticky على الموبايل) =====
  const footerStyle = useMemo(
    () => ({
      marginTop: "16px",
      display: "flex",
      gap: "10px",
      flexWrap: "wrap",
      position: isMobile ? "sticky" : "static",
      bottom: 0,
      background: isMobile ? theme.surface : "transparent",
      paddingTop: isMobile ? "10px" : 0,
      paddingBottom: isMobile ? "6px" : 0,
      borderTop: isMobile ? `1px solid ${theme.border}` : "none",
      zIndex: isMobile ? 5 : "auto",
    }),
    [theme.surface, theme.border, isMobile]
  );

  const deleteAllBtnStyle = useMemo(
    () => ({
      background: "rgba(239,68,68,0.15)",
      color: "#ef4444",
      border: "1px solid rgba(239,68,68,0.3)",
      padding: isMobile ? "12px 16px" : "10px 16px",
      borderRadius: "10px",
      cursor: "pointer",
      fontSize: isMobile ? "14px" : "14px",
      fontWeight: "600",
      fontFamily: "inherit",
      minHeight: isMobile ? "48px" : "auto",
      // ✅ على موبايل: بعرض كامل
      flex: isMobile ? "1 1 100%" : "initial",
    }),
    [isMobile]
  );

  const closeFooterBtnStyle = useMemo(
    () => ({
      flex: 1,
      padding: isMobile ? "12px" : "10px",
      background: theme.inputBg,
      color: theme.text,
      border: `1px solid ${theme.border}`,
      borderRadius: "10px",
      cursor: "pointer",
      fontSize: isMobile ? "15px" : "14px",
      fontFamily: "inherit",
      minHeight: isMobile ? "48px" : "auto",
    }),
    [theme.inputBg, theme.text, theme.border, isMobile]
  );

  // ===== ✅ Handlers (useCallback) =====
  const handleBackdropClick = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleContentClick = useCallback((e) => {
    e.stopPropagation();
  }, []);

  const handleDeleteAll = useCallback(() => {
    onDeleteAll(selectedUserForChats.id, selectedUserForChats.name);
  }, [onDeleteAll, selectedUserForChats]);

  // ⚠️ لا نستدعي hooks بعد هذا الشرط
  if (!show || !selectedUserForChats) return null;

  const chats = userChatsList || [];

  // ===== JSX =====
  return (
    <>
      {/* ✅ keyframes */}
      <style>{`
        @keyframes fadeInUserChats {
          from { opacity: 0; transform: scale(0.96); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>

      <div
        style={backdropStyle}
        onClick={handleBackdropClick}
        role="presentation"
      >
        <div
          style={modalStyle}
          onClick={handleContentClick}
          role="dialog"
          aria-modal="true"
          aria-labelledby="user-chats-title"
        >
          {/* ===== الرأس ===== */}
          <div style={headerStyle}>
            <h3 id="user-chats-title" style={titleStyle}>
              💬 محادثات {selectedUserForChats.name}
            </h3>
            <button
              onClick={onClose}
              style={closeBtnStyle}
              aria-label="إغلاق"
              title="إغلاق"
            >
              ✕
            </button>
          </div>

          {/* ===== قائمة المحادثات ===== */}
          <div style={{ flex: 1 }}>
            {chats.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "40px 20px",
                  opacity: 0.5,
                  fontSize: "14px",
                }}
              >
                <div style={{ fontSize: "40px", marginBottom: "10px" }}>
                  💬
                </div>
                <div>لا توجد محادثات لهذا المستخدم</div>
              </div>
            ) : (
              chats.map((chat) => (
                <div key={chat.id} style={chatRowStyle}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontWeight: "600",
                        fontSize: isMobile ? "14px" : "14px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={chat.title || "بدون عنوان"}
                    >
                      {chat.title || "بدون عنوان"}
                    </div>
                    <div
                      style={{
                        fontSize: isMobile ? "11px" : "12px",
                        opacity: 0.5,
                        marginTop: "2px",
                      }}
                    >
                      {formatDate(chat.updated_at)} ·{" "}
                      {chat.messages?.length || 0} رسالة
                    </div>
                  </div>

                  <div style={chatActionsStyle}>
                    <button
                      onClick={() => onOpenChat(chat)}
                      style={{
                        ...chatBtnStyle,
                        background: "rgba(59,130,246,0.15)",
                        color: "#3b82f6",
                      }}
                      aria-label={`عرض ${chat.title || "المحادثة"}`}
                    >
                      👁️ عرض
                    </button>
                    <button
                      onClick={() => onDeleteChat(chat.id)}
                      style={{
                        ...chatBtnStyle,
                        background: "rgba(239,68,68,0.15)",
                        color: "#ef4444",
                      }}
                      aria-label={`حذف ${chat.title || "المحادثة"}`}
                    >
                      🗑️ حذف
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* ===== الذيل ===== */}
          <div style={footerStyle}>
            <button onClick={handleDeleteAll} style={deleteAllBtnStyle}>
              🗑️ حذف الكل
            </button>
            <button onClick={onClose} style={closeFooterBtnStyle}>
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
