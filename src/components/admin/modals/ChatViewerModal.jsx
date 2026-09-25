// ============================================
// src/components/admin/modals/ChatViewerModal.jsx — Responsive
// متوافق مع:
//   - src/config/breakpoints.js
//   - src/App.css (media queries موحّدة)
// ============================================

import { useEffect, useMemo, useCallback, useRef } from "react";
import MessageContent from "../../MessageContent";

export default function ChatViewerModal({
  show,
  onClose,
  selectedChat,
  theme,
  darkMode,
  // ✅ جديد: coming from Admin.jsx
  isMobile = false,
}) {
  const scrollRef = useRef(null);

  // ===== ✅ Escape للإغلاق + منع تمرير الخلفية =====
  useEffect(() => {
    if (!show || !selectedChat) return;

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
  }, [show, selectedChat, onClose]);

  // ===== ✅ تمرير تلقائي لأول رسالة عند الفتح =====
  useEffect(() => {
    if (show && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [show, selectedChat?.id]);

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
  //   - ديسكتوب: modal مركزي بأقصى عرض 650px
  //   - موبايل: full-screen (يستخدم كل الشاشة)
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
      boxShadow: isMobile
        ? "none"
        : "0 20px 60px rgba(0,0,0,0.4)",
      animation: isMobile ? "none" : "fadeInChat 0.2s ease-out",
      display: "flex",
      flexDirection: "column",
    }),
    [theme.surface, theme.border, isMobile]
  );

  // ===== ✅ رأس المودال (ثابت في الأعلى) =====
  const headerStyle = useMemo(
    () => ({
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: "8px",
      marginBottom: isMobile ? "12px" : "16px",
      // ✅ على موبايل: sticky للرأس
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
      // ✅ هدف لمس مريح
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

  const messagesContainerStyle = useMemo(
    () => ({
      flex: 1,
      overflowY: "auto",
      // ✅ على موبايل: لا نحتاج scroll منفصل لأن الـ modal كامل الشاشة
      overflowY: isMobile ? "visible" : "auto",
    }),
    [isMobile]
  );

  const footerStyle = useMemo(
    () => ({
      marginTop: "16px",
      // ✅ على موبايل: sticky للأسفل
      position: isMobile ? "sticky" : "static",
      bottom: 0,
      background: isMobile ? theme.surface : "transparent",
      paddingTop: isMobile ? "10px" : 0,
      paddingBottom: isMobile ? "6px" : 0,
      zIndex: isMobile ? 5 : "auto",
    }),
    [theme.surface, isMobile]
  );

  const bottomBtnStyle = useMemo(
    () => ({
      width: "100%",
      padding: isMobile ? "14px" : "12px",
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

  // ===== ✅ Handlers =====
  const handleBackdropClick = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleContentClick = useCallback((e) => {
    e.stopPropagation();
  }, []);

  // ⚠️ لا نستدعي hooks بعد هذا الشرط
  if (!show || !selectedChat) return null;

  const messages = selectedChat.messages || [];

  // ===== JSX =====
  return (
    <>
      {/* ✅ keyframes */}
      <style>{`
        @keyframes fadeInChat {
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
          aria-labelledby="chat-viewer-title"
          ref={scrollRef}
        >
          {/* ===== الرأس ===== */}
          <div style={headerStyle}>
            <h3 id="chat-viewer-title" style={titleStyle}>
              💬 {selectedChat.title || "محادثة"}
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

          {/* ===== الرسائل ===== */}
          <div style={messagesContainerStyle}>
            {messages.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "40px 20px",
                  opacity: 0.5,
                  fontSize: "14px",
                }}
              >
                لا توجد رسائل في هذه المحادثة
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={msg.id ?? idx}
                  style={{
                    background:
                      msg.role === "user"
                        ? darkMode
                          ? "rgba(16,185,129,0.12)"
                          : "rgba(16,185,129,0.08)"
                        : theme.inputBg,
                    padding: isMobile ? "11px 13px" : "14px 16px",
                    borderRadius: "12px",
                    marginBottom: "10px",
                    borderRight:
                      msg.role === "user" ? "3px solid #10b981" : "none",
                    wordBreak: "break-word",
                  }}
                >
                  <div
                    style={{
                      fontSize: isMobile ? "11px" : "12px",
                      opacity: 0.6,
                      marginBottom: "6px",
                      fontWeight: "600",
                    }}
                  >
                    {msg.role === "user" ? "👤 المستخدم" : "🖤 بلاك"}
                  </div>
                  <div
                    style={{
                      fontSize: isMobile ? "13px" : "14px",
                      lineHeight: 1.7,
                    }}
                  >
                    <MessageContent content={msg.content} />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* ===== زر الإغلاق السفلي ===== */}
          <div style={footerStyle}>
            <button onClick={onClose} style={bottomBtnStyle}>
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
