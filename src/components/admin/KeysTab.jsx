// ============================================
// src/components/admin/KeysTab.jsx — Responsive
// تبويب المفاتيح — كامل مع إحصائيات + عرض متجاوب
// متوافق مع:
//   - src/config/breakpoints.js
//   - src/hooks/useMediaQuery.js
//   - src/App.css (media queries موحّدة)
// ============================================

import { useState, useEffect, useMemo, useCallback } from "react";
import AdminStats from "./AdminStats";
import KeyCard from "./KeyCard";
import KeyMobileCard from "./KeyMobileCard";

export default function KeysTab({
  apiKeys,
  theme,
  darkMode,
  validating,
  validationProgress,
  autoValidate,
  toggleAutoValidate,
  handleValidateKeys,
  onShowAddKey,
  onShowLogs,
  exportKeysToCSV,
  onTestKey,
  onResetKey,
  onToggleKey,
  onDeleteKey,
  onReactivateKey,
  // ✅ جديد: coming from Admin.jsx
  isMobile = false,
  isTablet = false,
}) {
  // ✅ الوقت الحالي — لتحديث "نشط الآن"
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    // ✅ تحديث الوقت كل 3 ثواني
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // ===== ✅ أنماط الحاوية =====
  const containerStyle = useMemo(
    () => ({
      background: theme.surface,
      borderRadius: "16px",
      padding: isMobile ? "12px" : "16px",
      border: `1px solid ${theme.border}`,
    }),
    [theme.surface, theme.border, isMobile]
  );

  const headerStyle = useMemo(
    () => ({
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      flexDirection: isMobile ? "column" : "row",
      flexWrap: "wrap",
      gap: isMobile ? "10px" : "12px",
      marginBottom: isMobile ? "12px" : "16px",
    }),
    [isMobile]
  );

  const titleStyle = useMemo(
    () => ({
      margin: 0,
      fontSize: isMobile ? "17px" : "20px",
      letterSpacing: "-0.5px",
    }),
    [isMobile]
  );

  const subtitleStyle = useMemo(
    () => ({
      fontSize: isMobile ? "12px" : "13px",
      opacity: 0.6,
      marginTop: "4px",
    }),
    [isMobile]
  );

  // ✅ زر "إضافة مفتاح" يأخذ عرض كامل على الموبايل
  const addBtnStyle = useMemo(
    () => ({
      background: "linear-gradient(135deg, #10b981, #059669)",
      color: "#fff",
      border: "none",
      padding: isMobile ? "11px 16px" : "10px 18px",
      borderRadius: "10px",
      cursor: "pointer",
      fontSize: isMobile ? "14px" : "14px",
      fontWeight: "600",
      fontFamily: "inherit",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "6px",
      boxShadow: "0 4px 12px rgba(16,185,129,0.3)",
      width: isMobile ? "100%" : "auto",
      minHeight: isMobile ? "44px" : "auto",
    }),
    [isMobile]
  );

  // ✅ أزرار الإجراءات: تتوزع عرضيًا على الموبايل
  const actionsRowStyle = useMemo(
    () => ({
      display: "flex",
      gap: isMobile ? "6px" : "8px",
      flexWrap: "wrap",
      marginBottom: isMobile ? "12px" : "16px",
    }),
    [isMobile]
  );

  // ✅ شريط التقدم
  const progressBoxStyle = useMemo(
    () => ({
      marginBottom: isMobile ? "12px" : "16px",
      padding: isMobile ? "10px" : "12px",
      background: theme.inputBg,
      borderRadius: "10px",
    }),
    [theme.inputBg, isMobile]
  );

  const progressTextStyle = useMemo(
    () => ({
      fontSize: isMobile ? "12px" : "13px",
      marginBottom: "6px",
      wordBreak: "break-word",
      lineHeight: 1.5,
    }),
    [isMobile]
  );

  const tableWrapperStyle = useMemo(
    () => ({
      overflowX: "auto",
      overflowY: "auto",
      WebkitOverflowScrolling: "touch",
      maxHeight: isMobile ? "60vh" : "70vh",
    }),
    [isMobile]
  );

  const tableStyle = useMemo(
    () => ({
      width: "100%",
      borderCollapse: "collapse",
      // ✅ على التابلت: minWidth أقل قليلًا
      minWidth: isTablet ? "900px" : "1000px",
      fontSize: isMobile ? "13px" : "14px",
    }),
    [isTablet, isMobile]
  );

  const thStyle = useMemo(
    () => ({
      padding: isMobile ? "10px 8px" : "14px 10px",
      textAlign: "right",
      fontSize: isMobile ? "12px" : "14px",
      fontWeight: "600",
      color: darkMode ? "#93c5fd" : "#3b82f6",
      whiteSpace: "nowrap",
      borderBottom: `1px solid ${theme.border}`,
    }),
    [darkMode, theme.border, isMobile]
  );

  // ===== ✅ Handlers =====
  const handleShowAddKey = useCallback(() => onShowAddKey(), [onShowAddKey]);
  const handleValidateAll = useCallback(
    () => handleValidateKeys(false),
    [handleValidateKeys]
  );
  const handleToggleAuto = useCallback(
    () => toggleAutoValidate(),
    [toggleAutoValidate]
  );
  const handleShowLogs = useCallback(() => onShowLogs(), [onShowLogs]);
  const handleExportCSV = useCallback(
    () => exportKeysToCSV(),
    [exportKeysToCSV]
  );

  const progressPercent = useMemo(() => {
    if (!validationProgress.total) return 0;
    return (validationProgress.current / validationProgress.total) * 100;
  }, [validationProgress.current, validationProgress.total]);

  return (
    <div style={containerStyle}>
      {/* ===== الرأس ===== */}
      <div style={headerStyle}>
        <div>
          <h2 style={titleStyle}>🔑 مفاتيح API</h2>
          <div style={subtitleStyle}>إدارة كاملة للمفاتيح والحالة</div>
        </div>
        <button onClick={handleShowAddKey} style={addBtnStyle}>
          ➕ إضافة مفتاح
        </button>
      </div>

      {/* ===== الإحصائيات (بتمرير isMobile/isTablet) ===== */}
      <AdminStats
        keys={apiKeys}
        theme={theme}
        isMobile={isMobile}
        isTablet={isTablet}
      />

      {/* ===== أزرار الإجراءات ===== */}
      <div style={actionsRowStyle}>
        <ActionButton
          onClick={handleValidateAll}
          disabled={validating}
          color="#f59e0b"
          bg="linear-gradient(135deg, #f59e0b, #d97706)"
          icon={validating ? "⏳" : "🔍"}
          label={validating ? "جاري الفحص..." : "فحص جميع المفاتيح"}
          theme={theme}
          isMobile={isMobile}
        />
        <ActionButton
          onClick={handleToggleAuto}
          color={autoValidate ? "#10b981" : theme.text}
          bg={autoValidate ? "rgba(16,185,129,0.15)" : theme.inputBg}
          border={
            autoValidate
              ? "1px solid #10b981"
              : `1px solid ${theme.border}`
          }
          icon={autoValidate ? "🟢" : "⚫"}
          label={autoValidate ? "الفحص التلقائي مفعل" : "تفعيل الفحص التلقائي"}
          theme={theme}
          isMobile={isMobile}
        />
        <ActionButton
          onClick={handleShowLogs}
          color="#a29bfe"
          bg="rgba(108,92,231,0.15)"
          icon="📋"
          label="سجل الفحوصات"
          theme={theme}
          isMobile={isMobile}
        />
        <ActionButton
          onClick={handleExportCSV}
          color="#10b981"
          bg="rgba(16,185,129,0.15)"
          icon="📥"
          label="تصدير CSV"
          theme={theme}
          isMobile={isMobile}
        />
      </div>

      {/* ===== شريط التقدم ===== */}
      {validating && validationProgress.total > 0 && (
        <div style={progressBoxStyle}>
          <div style={progressTextStyle}>
            🔍 فحص {validationProgress.current}/{validationProgress.total}:{" "}
            {validationProgress.name}
            <span style={{ marginRight: "10px" }}>
              {validationProgress.status}
            </span>
          </div>
          <div
            style={{
              width: "100%",
              height: "6px",
              background: theme.barBg,
              borderRadius: "3px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${progressPercent}%`,
                height: "100%",
                background: "linear-gradient(135deg, #f59e0b, #d97706)",
                transition: "width 0.3s",
              }}
            />
          </div>
        </div>
      )}

      {/* ===== عرض المفاتيح ===== */}
      {isMobile ? (
        <div>
          {apiKeys.length === 0 ? (
            <EmptyState theme={theme} />
          ) : (
            apiKeys.map((keyItem) => (
              <KeyMobileCard
                key={keyItem.id}
                keyItem={keyItem}
                theme={theme}
                currentTime={currentTime}
                onTest={onTestKey}
                onReset={onResetKey}
                onToggle={onToggleKey}
                onDelete={onDeleteKey}
                onReactivate={onReactivateKey}
              />
            ))
          )}
        </div>
      ) : (
        <div style={tableWrapperStyle}>
          <table style={tableStyle}>
            <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
              <tr
                style={{
                  background: darkMode
                    ? "rgba(59,130,246,0.08)"
                    : "rgba(59,130,246,0.06)",
                }}
              >
                {[
                  "الاسم",
                  "المفتاح",
                  "الاستهلاك",
                  "الحد",
                  "الحالة",
                  "آخر استخدام",
                  "الوقت المتبقي",
                  "الإجراءات",
                ].map((h) => (
                  <th key={h} style={thStyle}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {apiKeys.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ padding: "40px" }}>
                    <EmptyState theme={theme} />
                  </td>
                </tr>
              ) : (
                apiKeys.map((keyItem) => (
                  <KeyCard
                    key={keyItem.id}
                    keyItem={keyItem}
                    theme={theme}
                    darkMode={darkMode}
                    currentTime={currentTime}
                    onTest={onTestKey}
                    onReset={onResetKey}
                    onToggle={onToggleKey}
                    onDelete={onDeleteKey}
                    onReactivate={onReactivateKey}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============================================================
//  ActionButton
// ============================================================
function ActionButton({
  onClick,
  disabled,
  color,
  bg,
  border,
  icon,
  label,
  theme,
  isMobile = false,
}) {
  const [hover, setHover] = useState(false);

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: bg,
        color: color,
        border: border || "none",
        padding: isMobile ? "9px 12px" : "9px 16px",
        borderRadius: "10px",
        cursor: disabled ? "not-allowed" : "pointer",
        fontSize: isMobile ? "12px" : "13px",
        fontWeight: "600",
        fontFamily: "inherit",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: isMobile ? "4px" : "6px",
        opacity: disabled ? 0.6 : 1,
        whiteSpace: "nowrap",
        transition: "all 0.15s",
        // ✅ تحسينات الموبايل
        minHeight: isMobile ? "40px" : "auto",
        transform: hover && !disabled ? "translateY(-1px)" : "none",
      }}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

// ============================================================
//  EmptyState
// ============================================================
function EmptyState({ theme }) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "40px 20px",
        opacity: 0.5,
      }}
    >
      <div style={{ fontSize: "48px", marginBottom: "12px" }}>🔑</div>
      <div style={{ fontSize: "15px" }}>لا توجد مفاتيح</div>
      <div style={{ fontSize: "13px", marginTop: "6px" }}>
        أضف مفتاح Groq للبدء
      </div>
    </div>
  );
}
