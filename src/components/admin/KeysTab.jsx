// ============================================
// src/components/admin/KeysTab.jsx
// تبويب المفاتيح — كامل مع إحصائيات + عرض متجاوب
// ============================================

import { useState, useEffect } from "react";
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
}) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div
      style={{
        background: theme.surface,
        borderRadius: "16px",
        padding: "16px",
        border: `1px solid ${theme.border}`,
      }}
    >
      {/* الرأس */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: "20px",
              letterSpacing: "-0.5px",
            }}
          >
            🔑 مفاتيح API
          </h2>
          <div
            style={{ fontSize: "13px", opacity: 0.6, marginTop: "4px" }}
          >
            إدارة كاملة للمفاتيح والحالة
          </div>
        </div>
        <button
          onClick={onShowAddKey}
          style={{
            background: "linear-gradient(135deg, #10b981, #059669)",
            color: "#fff",
            border: "none",
            padding: "10px 18px",
            borderRadius: "10px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "600",
            fontFamily: "inherit",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            boxShadow: "0 4px 12px rgba(16,185,129,0.3)",
          }}
        >
          ➕ إضافة مفتاح
        </button>
      </div>

      {/* الإحصائيات */}
      <AdminStats keys={apiKeys} theme={theme} />

      {/* أزرار الإجراءات */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          flexWrap: "wrap",
          marginBottom: "16px",
        }}
      >
        <ActionButton
          onClick={() => handleValidateKeys(false)}
          disabled={validating}
          color="#f59e0b"
          bg="linear-gradient(135deg, #f59e0b, #d97706)"
          icon={validating ? "⏳" : "🔍"}
          label={validating ? "جاري الفحص..." : "فحص جميع المفاتيح"}
          theme={theme}
        />
        <ActionButton
          onClick={toggleAutoValidate}
          color={autoValidate ? "#10b981" : theme.text}
          bg={autoValidate ? "rgba(16,185,129,0.15)" : theme.inputBg}
          border={
            autoValidate
              ? "1px solid #10b981"
              : `1px solid ${theme.border}`
          }
          icon={autoValidate ? "🟢" : "⚫"}
          label={
            autoValidate ? "الفحص التلقائي مفعل" : "تفعيل الفحص التلقائي"
          }
          theme={theme}
        />
        <ActionButton
          onClick={onShowLogs}
          color="#a29bfe"
          bg="rgba(108,92,231,0.15)"
          icon="📋"
          label="سجل الفحوصات"
          theme={theme}
        />
        <ActionButton
          onClick={exportKeysToCSV}
          color="#10b981"
          bg="rgba(16,185,129,0.15)"
          icon="📥"
          label="تصدير CSV"
          theme={theme}
        />
      </div>

      {/* شريط التقدم */}
      {validating && validationProgress.total > 0 && (
        <div
          style={{
            marginBottom: "16px",
            padding: "12px",
            background: theme.inputBg,
            borderRadius: "10px",
          }}
        >
          <div style={{ fontSize: "13px", marginBottom: "6px" }}>
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
                width: `${
                  (validationProgress.current / validationProgress.total) *
                  100
                }%`,
                height: "100%",
                background: "linear-gradient(135deg, #f59e0b, #d97706)",
                transition: "width 0.3s",
              }}
            />
          </div>
        </div>
      )}

      {/* عرض المفاتيح: جدول أو بطاقات */}
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
        <div
          style={{
            overflowX: "auto",
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
            maxHeight: "70vh",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: "1000px",
            }}
          >
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
                  <th
                    key={h}
                    style={{
                      padding: "14px 10px",
                      textAlign: "right",
                      fontSize: "14px",
                      fontWeight: "600",
                      color: darkMode ? "#93c5fd" : "#3b82f6",
                      whiteSpace: "nowrap",
                      borderBottom: `1px solid ${theme.border}`,
                    }}
                  >
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

function ActionButton({
  onClick,
  disabled,
  color,
  bg,
  border,
  icon,
  label,
  theme,
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: bg,
        color: color,
        border: border || "none",
        padding: "9px 16px",
        borderRadius: "10px",
        cursor: disabled ? "not-allowed" : "pointer",
        fontSize: "13px",
        fontWeight: "600",
        fontFamily: "inherit",
        display: "flex",
        alignItems: "center",
        gap: "6px",
        opacity: disabled ? 0.6 : 1,
        whiteSpace: "nowrap",
        transition: "all 0.15s",
      }}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

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
