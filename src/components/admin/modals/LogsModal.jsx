// ============================================
// src/components/admin/modals/LogsModal.jsx — Responsive
// متوافق مع:
//   - src/config/breakpoints.js
//   - src/App.css (media queries موحّدة)
// ============================================

import { useEffect, useMemo, useCallback } from "react";

export default function LogsModal({
  show,
  onClose,
  validationLogs,
  theme,
  // ✅ جديد: coming from Admin.jsx
  isMobile = false,
}) {
  // ===== ✅ قائمة السجلات (useMemo) =====
  const logs = useMemo(() => validationLogs || [], [validationLogs]);

  // ===== ✅ Escape للإغلاق + منع تمرير الخلفية =====
  useEffect(() => {
    if (!show) return;

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
  }, [show, onClose]);

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
      maxWidth: isMobile ? "100%" : "600px",
      height: isMobile ? "100%" : "auto",
      maxHeight: isMobile ? "100%" : "80vh",
      overflowY: "auto",
      border: isMobile ? "none" : `1px solid ${theme.border}`,
      boxShadow: isMobile ? "none" : "0 20px 60px rgba(0,0,0,0.4)",
      animation: isMobile ? "none" : "fadeInLogs 0.2s ease-out",
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
      alignItems: "center",
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
      margin: 0,
      fontSize: isMobile ? "16px" : "18px",
      flex: 1,
      minWidth: 0,
      wordBreak: "break-word",
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

  // ===== ✅ صف السجل =====
  const logRowStyle = useMemo(
    () => ({
      background: theme.inputBg,
      padding: isMobile ? "10px 12px" : "12px",
      borderRadius: "10px",
      marginBottom: "10px",
      wordBreak: "break-word",
    }),
    [theme.inputBg, isMobile]
  );

  // ===== ✅ الذيل (sticky على الموبايل) =====
  const footerStyle = useMemo(
    () => ({
      marginTop: "16px",
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

  const bottomBtnStyle = useMemo(
    () => ({
      width: "100%",
      padding: isMobile ? "14px" : "12px",
      background: theme.inputBg,
      borderRadius: "10px",
      border: `1px solid ${theme.border}`,
      cursor: "pointer",
      color: theme.text,
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

  // ✅ تنسيق التاريخ بأمان
  const formatLogDate = useCallback((dateStr) => {
    try {
      return new Date(dateStr).toLocaleString("ar-EG");
    } catch {
      return dateStr || "—";
    }
  }, []);

  // ⚠️ لا نستدعي hooks بعد هذا الشرط
  if (!show) return null;

  // ===== JSX =====
  return (
    <>
      {/* ✅ keyframes */}
      <style>{`
        @keyframes fadeInLogs {
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
          aria-labelledby="logs-modal-title"
        >
          {/* ===== الرأس ===== */}
          <div style={headerStyle}>
            <h3 id="logs-modal-title" style={titleStyle}>
              📋 سجل الفحوصات
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

          {/* ===== قائمة السجلات ===== */}
          <div style={{ flex: 1 }}>
            {logs.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "40px 20px",
                  opacity: 0.5,
                  fontSize: "14px",
                }}
              >
                <div style={{ fontSize: "40px", marginBottom: "10px" }}>
                  📋
                </div>
                <div>لا توجد سجلات</div>
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.id} style={logRowStyle}>
                  {/* التاريخ + النوع */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "8px",
                      flexWrap: "wrap",
                      gap: "6px",
                    }}
                  >
                    <span
                      style={{
                        fontWeight: "bold",
                        fontSize: isMobile ? "12px" : "13px",
                      }}
                    >
                      {formatLogDate(log.checked_at)}
                    </span>
                    <span
                      style={{
                        fontSize: isMobile ? "11px" : "12px",
                        opacity: 0.7,
                        padding: "2px 8px",
                        borderRadius: "10px",
                        background:
                          log.check_type === "auto"
                            ? "rgba(59,130,246,0.12)"
                            : "rgba(148,163,184,0.12)",
                        color:
                          log.check_type === "auto" ? "#3b82f6" : theme.textMuted,
                        fontWeight: "600",
                      }}
                    >
                      {log.check_type === "auto" ? "🔄 تلقائي" : "🖐️ يدوي"}
                    </span>
                  </div>

                  {/* الإحصائيات */}
                  <div
                    style={{
                      display: "flex",
                      gap: isMobile ? "10px" : "12px",
                      fontSize: isMobile ? "12px" : "13px",
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={{ color: "#10b981", fontWeight: "600" }}>
                      ✅ صالح: {log.valid_keys}
                    </span>
                    <span style={{ color: "#ef4444", fontWeight: "600" }}>
                      ❌ غير صالح: {log.invalid_keys}
                    </span>
                    <span style={{ opacity: 0.7 }}>
                      📊 إجمالي: {log.total_keys}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* ===== الذيل ===== */}
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
