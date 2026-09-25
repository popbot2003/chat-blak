// ============================================
// src/components/admin/modals/AddKeyModal.jsx — Responsive
// متوافق مع:
//   - src/config/breakpoints.js
//   - src/App.css (media queries موحّدة)
// ============================================

import { useEffect, useMemo, useCallback } from "react";

export default function AddKeyModal({
  show,
  onClose,
  onAdd,
  newKeyName,
  setNewKeyName,
  newKeyValue,
  setNewKeyValue,
  newKeyLimit,
  setNewKeyLimit,
  validating,
  theme,
  modalInputStyle,
  // ✅ جديد: coming from Admin.jsx
  isMobile = false,
}) {
  // ===== ✅ Escape للإغلاق + منع تمرير الخلفية =====
  useEffect(() => {
    if (!show) return;

    const handleKey = (e) => {
      if (e.key === "Escape" && !validating) onClose();
    };

    document.addEventListener("keydown", handleKey);

    // منع تمرير الخلفية
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [show, onClose, validating]);

  // ===== ✅ أنماط الـ Backdrop =====
  const backdropStyle = useMemo(
    () => ({
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.75)",
      display: "flex",
      // موبايل: ينزلق من الأسفل | ديسكتوب: مركزي
      alignItems: isMobile ? "flex-end" : "center",
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
      padding: isMobile ? "18px 16px 22px" : "24px",
      borderRadius: isMobile ? "20px 20px 0 0" : "16px",
      width: "100%",
      maxWidth: isMobile ? "100%" : "450px",
      border: `1px solid ${theme.border}`,
      // موبايل: يظهر من الأسفل | ديسكتوب: مربع كامل
      maxHeight: isMobile ? "90vh" : "85vh",
      overflowY: "auto",
      boxShadow: isMobile
        ? "0 -8px 30px rgba(0,0,0,0.3)"
        : "0 20px 60px rgba(0,0,0,0.4)",
      // ✅ anim للدخول
      animation: isMobile
        ? "slideUp 0.25s ease-out"
        : "fadeIn 0.2s ease-out",
    }),
    [theme.surface, theme.border, isMobile]
  );

  const titleStyle = useMemo(
    () => ({
      marginBottom: isMobile ? "16px" : "20px",
      fontSize: isMobile ? "18px" : "20px",
    }),
    [isMobile]
  );

  const actionsStyle = useMemo(
    () => ({
      display: "flex",
      // على موبايل ضيق جدًا (< 360px) عمودي، وإلا أفقي
      flexDirection: isMobile ? "column-reverse" : "row",
      gap: "10px",
      marginTop: "8px",
    }),
    [isMobile]
  );

  const primaryBtnStyle = useMemo(
    () => ({
      flex: isMobile ? "initial" : 1,
      width: isMobile ? "100%" : "auto",
      padding: isMobile ? "14px" : "12px",
      background: "linear-gradient(135deg, #10b981, #059669)",
      color: "#fff",
      border: "none",
      borderRadius: "10px",
      cursor: validating ? "not-allowed" : "pointer",
      fontSize: isMobile ? "15px" : "15px",
      fontWeight: "600",
      fontFamily: "inherit",
      opacity: validating ? 0.6 : 1,
      minHeight: isMobile ? "48px" : "auto",
      transition: "opacity 0.15s, transform 0.1s",
    }),
    [validating, isMobile]
  );

  const secondaryBtnStyle = useMemo(
    () => ({
      flex: isMobile ? "initial" : 1,
      width: isMobile ? "100%" : "auto",
      padding: isMobile ? "14px" : "12px",
      background: theme.inputBg,
      color: theme.text,
      border: `1px solid ${theme.border}`,
      borderRadius: "10px",
      cursor: "pointer",
      fontSize: isMobile ? "15px" : "15px",
      fontFamily: "inherit",
      minHeight: isMobile ? "48px" : "auto",
    }),
    [theme.inputBg, theme.text, theme.border, isMobile]
  );

  // ===== ✅ Handlers (useCallback) =====
  const handleBackdropClick = useCallback(() => {
    if (!validating) onClose();
  }, [onClose, validating]);

  const handleContentClick = useCallback((e) => {
    e.stopPropagation();
  }, []);

  const handleNameChange = useCallback(
    (e) => setNewKeyName(e.target.value),
    [setNewKeyName]
  );

  const handleValueChange = useCallback(
    (e) => setNewKeyValue(e.target.value),
    [setNewKeyValue]
  );

  const handleLimitChange = useCallback(
    (e) => setNewKeyLimit(parseInt(e.target.value) || 0),
    [setNewKeyLimit]
  );

  // ⚠️ لا نستدعي hooks بعد هذا الشرط
  if (!show) return null;

  // ===== JSX =====
  return (
    <>
      {/* ✅ keyframes المطلوبة */}
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        @keyframes fadeIn {
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
          onClick={handleContentClick}
          style={modalStyle}
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-key-title"
        >
          <h3 id="add-key-title" style={titleStyle}>
            ➕ إضافة مفتاح API
          </h3>

          <input
            style={modalInputStyle}
            type="text"
            placeholder="اسم المفتاح"
            value={newKeyName}
            onChange={handleNameChange}
            autoComplete="off"
            aria-label="اسم المفتاح"
          />

          <input
            style={{ ...modalInputStyle, fontFamily: "monospace" }}
            type="text"
            placeholder="gsk_xxxxxxxxxxxx"
            value={newKeyValue}
            onChange={handleValueChange}
            autoComplete="off"
            spellCheck="false"
            aria-label="قيمة المفتاح"
          />

          <input
            style={modalInputStyle}
            type="number"
            placeholder="الحد اليومي"
            value={newKeyLimit}
            onChange={handleLimitChange}
            inputMode="numeric"
            aria-label="الحد اليومي"
          />

          <div style={actionsStyle}>
            <button
              onClick={onAdd}
              disabled={validating}
              style={primaryBtnStyle}
            >
              {validating ? "⏳ جاري التحقق..." : "✅ إضافة"}
            </button>
            <button
              onClick={onClose}
              style={secondaryBtnStyle}
              disabled={validating}
            >
              إلغاء
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
