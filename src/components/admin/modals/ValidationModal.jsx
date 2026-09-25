// ============================================
// src/components/admin/modals/ValidationModal.jsx — Responsive
// متوافق مع:
//   - src/config/breakpoints.js
//   - src/App.css (media queries موحّدة)
// ============================================

import { useEffect, useMemo, useCallback } from "react";

export default function ValidationModal({
  show,
  onClose,
  validationResults,
  theme,
  // ✅ جديد: coming from Admin.jsx
  isMobile = false,
}) {
  // ===== ✅ إحصائيات النتائج (useMemo) =====
  const { validCount, invalidCount, results } = useMemo(() => {
    const list = validationResults || [];
    let valid = 0;
    let invalid = 0;

    for (const r of list) {
      if (r.valid) valid++;
      else invalid++;
    }

    return { validCount: valid, invalidCount: invalid, results: list };
  }, [validationResults]);

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
      maxWidth: isMobile ? "100%" : "500px",
      height: isMobile ? "100%" : "auto",
      maxHeight: isMobile ? "100%" : "80vh",
      overflowY: "auto",
      border: isMobile ? "none" : `1px solid ${theme.border}`,
      boxShadow: isMobile ? "none" : "0 20px 60px rgba(0,0,0,0.4)",
      animation: isMobile ? "none" : "fadeInValidation 0.2s ease-out",
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

  // ===== ✅ صندوق الإحصائيات =====
  const statsBoxStyle = useMemo(
    () => ({
      marginBottom: isMobile ? "12px" : "16px",
      display: "flex",
      gap: isMobile ? "8px" : "10px",
      flexWrap: "wrap",
    }),
    [isMobile]
  );

  const statBadgeBase = useMemo(
    () => ({
      padding: isMobile ? "5px 12px" : "6px 14px",
      borderRadius: "20px",
      fontSize: isMobile ? "12px" : "13px",
      fontWeight: "600",
      whiteSpace: "nowrap",
    }),
    [isMobile]
  );

  // ===== ✅ صف النتيجة =====
  const resultRowStyle = useMemo(
    () => ({
      padding: isMobile ? "10px 12px" : "12px",
      borderRadius: "10px",
      marginBottom: "8px",
      wordBreak: "break-word",
    }),
    [isMobile]
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

  // ⚠️ لا نستدعي hooks بعد هذا الشرط
  if (!show) return null;

  // ===== JSX =====
  return (
    <>
      {/* ✅ keyframes */}
      <style>{`
        @keyframes fadeInValidation {
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
          aria-labelledby="validation-modal-title"
        >
          {/* ===== الرأس ===== */}
          <div style={headerStyle}>
            <h3 id="validation-modal-title" style={titleStyle}>
              🔍 نتائج الفحص
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

          {/* ===== الإحصائيات ===== */}
          <div style={statsBoxStyle}>
            <span
              style={{
                ...statBadgeBase,
                background: "rgba(16,185,129,0.15)",
                color: "#10b981",
              }}
            >
              ✅ صالح: {validCount}
            </span>
            <span
              style={{
                ...statBadgeBase,
                background: "rgba(239,68,68,0.15)",
                color: "#ef4444",
              }}
            >
              ❌ غير صالح: {invalidCount}
            </span>
          </div>

          {/* ===== قائمة النتائج ===== */}
          <div style={{ flex: 1 }}>
            {results.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "40px 20px",
                  opacity: 0.5,
                  fontSize: "14px",
                }}
              >
                <div style={{ fontSize: "40px", marginBottom: "10px" }}>
                  🔍
                </div>
                <div>لا توجد نتائج</div>
              </div>
            ) : (
              results.map((result, idx) => (
                <div
                  key={result.id ?? idx}
                  style={{
                    ...resultRowStyle,
                    background: result.valid
                      ? "rgba(16,185,129,0.05)"
                      : "rgba(239,68,68,0.05)",
                    borderRight: `3px solid ${
                      result.valid ? "#10b981" : "#ef4444"
                    }`,
                  }}
                >
                  <div
                    style={{
                      fontWeight: "bold",
                      fontSize: isMobile ? "13px" : "14px",
                      wordBreak: "break-word",
                    }}
                  >
                    {result.name}
                  </div>
                  <div
                    style={{
                      fontSize: isMobile ? "10px" : "11px",
                      opacity: 0.6,
                      fontFamily: "monospace",
                      marginTop: "2px",
                      wordBreak: "break-all",
                    }}
                    title={result.value}
                  >
                    {result.value}
                  </div>
                  <div
                    style={{
                      fontSize: isMobile ? "11px" : "12px",
                      marginTop: "6px",
                      color: result.valid ? "#10b981" : "#ef4444",
                      fontWeight: "600",
                    }}
                  >
                    {result.valid ? "✅ صالح" : `❌ ${result.reason}`}
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
