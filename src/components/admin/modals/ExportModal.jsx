// ============================================
// src/components/admin/modals/ExportModal.jsx — Responsive
// متوافق مع:
//   - src/config/breakpoints.js
//   - src/App.css (media queries موحّدة)
// ============================================

import { useEffect, useMemo, useCallback } from "react";

export default function ExportModal({
  show,
  onClose,
  exportType,
  setExportType,
  prepareExportData,
  exportToCSV,
  theme,
  modalInputStyle,
  // ✅ جديد: coming from Admin.jsx
  isMobile = false,
}) {
  // ===== ✅ عدد السجلات (useMemo) =====
  // ⚠️ مهم: prepareExportData() كانت تُستدعى في كل render
  //         الآن تُحسب فقط عند تغيّر exportType أو البيانات
  const recordsCount = useMemo(() => {
    try {
      return prepareExportData().length;
    } catch {
      return 0;
    }
  }, [prepareExportData, exportType]);

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
      maxWidth: isMobile ? "100%" : "380px",
      border: `1px solid ${theme.border}`,
      maxHeight: isMobile ? "90vh" : "85vh",
      overflowY: "auto",
      boxShadow: isMobile
        ? "0 -8px 30px rgba(0,0,0,0.3)"
        : "0 20px 60px rgba(0,0,0,0.4)",
      animation: isMobile
        ? "slideUpExport 0.25s ease-out"
        : "fadeInExport 0.2s ease-out",
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

  const counterBoxStyle = useMemo(
    () => ({
      background: theme.inputBg,
      padding: isMobile ? "10px 12px" : "12px",
      borderRadius: "10px",
      marginBottom: "16px",
      fontSize: isMobile ? "13px" : "14px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    }),
    [theme.inputBg, isMobile]
  );

  const actionsStyle = useMemo(
    () => ({
      display: "flex",
      flexDirection: isMobile ? "column-reverse" : "row",
      gap: "10px",
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
      cursor: "pointer",
      fontSize: "15px",
      fontWeight: "600",
      fontFamily: "inherit",
      minHeight: isMobile ? "48px" : "auto",
      opacity: recordsCount === 0 ? 0.6 : 1,
    }),
    [isMobile, recordsCount]
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
      fontSize: "15px",
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

  const handleTypeChange = useCallback(
    (e) => setExportType(e.target.value),
    [setExportType]
  );

  const handleExport = useCallback(() => {
    if (recordsCount === 0) return;
    exportToCSV(prepareExportData(), exportType);
    onClose();
  }, [exportToCSV, prepareExportData, exportType, recordsCount, onClose]);

  // ⚠️ لا نستدعي hooks بعد هذا الشرط
  if (!show) return null;

  // ===== JSX =====
  return (
    <>
      {/* ✅ keyframes */}
      <style>{`
        @keyframes slideUpExport {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        @keyframes fadeInExport {
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
          aria-labelledby="export-modal-title"
        >
          <h3 id="export-modal-title" style={titleStyle}>
            📥 تصدير البيانات
          </h3>

          <select
            value={exportType}
            onChange={handleTypeChange}
            style={modalInputStyle}
            aria-label="نوع البيانات للتصدير"
          >
            <option value="users">👥 المستخدمين</option>
            <option value="keys">🔑 المفاتيح</option>
            <option value="chats">💬 المحادثات</option>
          </select>

          {/* ✅ عدّاد السجلات محسوب مسبقًا */}
          <div style={counterBoxStyle}>
            <span>📊 عدد السجلات</span>
            <strong style={{ fontSize: isMobile ? "15px" : "16px" }}>
              {recordsCount}
            </strong>
          </div>

          <div style={actionsStyle}>
            <button
              onClick={handleExport}
              disabled={recordsCount === 0}
              style={primaryBtnStyle}
              aria-label="تصدير CSV"
            >
              📥 تصدير CSV
            </button>
            <button
              onClick={onClose}
              style={secondaryBtnStyle}
            >
              إلغاء
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
