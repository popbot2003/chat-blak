// ============================================
// src/components/admin/KeyCard.jsx — Responsive
// كارت مفتاح — للشاشات الكبيرة (جدول)
// متوافق مع:
//   - src/config/breakpoints.js
//   - src/App.css (media queries موحّدة)
// ============================================

import { useState, useMemo, useCallback } from "react";
import {
  formatDate,
  getUsagePercent,
  getUsageColor,
  getKeyStatus,
  getTimeUntil,
  getLastUsedTime,
  isKeyActiveNow,
} from "../../utils/helpers";

export default function KeyCard({
  keyItem,
  theme,
  darkMode,
  currentTime,
  onTest,
  onReset,
  onToggle,
  onDelete,
  onReactivate,
  // ✅ جديد: coming from KeysTab
  isTablet = false,
}) {
  const [showFull, setShowFull] = useState(false);

  // ===== ✅ الحسابات (useMemo) =====
  const metrics = useMemo(() => {
    const realLimit =
      keyItem.effective_tpd_limit || keyItem.tpd_limit || 200000;
    const realUsed = keyItem.used_tpd_today || keyItem.used_today || 0;
    const percent = getUsagePercent(realUsed, realLimit);
    const color = getUsageColor(percent);
    const status = getKeyStatus(keyItem);
    const timeLeft = getTimeUntil(keyItem.rate_limited_until);
    const isValid = keyItem.is_valid !== false;
    const activeNow = isKeyActiveNow(keyItem, currentTime);
    const lastUsed = getLastUsedTime(keyItem.last_request_at, currentTime);
    const limitColor =
      percent > 90 ? "#ef4444" : percent > 50 ? "#f59e0b" : theme.text;

    return {
      realLimit,
      realUsed,
      percent,
      color,
      status,
      timeLeft,
      isValid,
      activeNow,
      lastUsed,
      limitColor,
    };
  }, [
    keyItem.effective_tpd_limit,
    keyItem.tpd_limit,
    keyItem.used_tpd_today,
    keyItem.used_today,
    keyItem.rate_limited_until,
    keyItem.last_request_at,
    keyItem.is_valid,
    keyItem.is_active,
    currentTime,
    theme.text,
  ]);

  const {
    realLimit,
    realUsed,
    percent,
    color,
    status,
    timeLeft,
    isValid,
    activeNow,
    lastUsed,
    limitColor,
  } = metrics;

  // ===== ✅ أنماط الخلايا (useMemo) =====
  const cellStyle = useMemo(
    () => ({
      padding: isTablet ? "10px 8px" : "14px 10px",
      verticalAlign: "middle",
    }),
    [isTablet]
  );

  const rowStyle = useMemo(
    () => ({
      borderBottom: `1px solid ${theme.border}`,
      background: activeNow
        ? darkMode
          ? "rgba(16,185,129,0.08)"
          : "rgba(16,185,129,0.05)"
        : "transparent",
      transition: "background 0.3s",
    }),
    [theme.border, activeNow, darkMode]
  );

  const nameStyle = useMemo(
    () => ({
      fontWeight: "600",
      fontSize: isTablet ? "14px" : "15px",
    }),
    [isTablet]
  );

  const keyTextStyle = useMemo(
    () => ({
      fontFamily: "monospace",
      fontSize: isTablet ? "11px" : "12px",
      wordBreak: "break-all",
      opacity: 0.8,
    }),
    [isTablet]
  );

  const limitStyle = useMemo(
    () => ({
      padding: isTablet ? "10px 8px" : "14px 10px",
      fontSize: isTablet ? "12px" : "13px",
      fontFamily: "monospace",
      color: limitColor,
      fontWeight: percent > 90 ? "700" : "500",
    }),
    [isTablet, limitColor, percent]
  );

  const statusBadgeStyle = useMemo(
    () => ({
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      padding: isTablet ? "5px 10px" : "6px 12px",
      borderRadius: "20px",
      background: status.bg,
      color: status.color,
      fontSize: isTablet ? "12px" : "13px",
      fontWeight: "600",
      whiteSpace: "nowrap",
    }),
    [status.bg, status.color, isTablet]
  );

  const lastUsedStyle = useMemo(
    () => ({
      display: "inline-flex",
      alignItems: "center",
      gap: "4px",
      padding: activeNow ? "4px 10px" : "0",
      borderRadius: "12px",
      background: activeNow ? "rgba(16,185,129,0.15)" : "transparent",
      color: activeNow ? "#10b981" : theme.textMuted,
      fontSize: isTablet ? "11px" : "12px",
      fontWeight: activeNow ? "700" : "500",
      whiteSpace: "nowrap",
    }),
    [activeNow, theme.textMuted, isTablet]
  );

  const timeLeftStyle = useMemo(
    () => ({
      display: "inline-flex",
      alignItems: "center",
      gap: "4px",
      padding: "4px 10px",
      borderRadius: "12px",
      background: "rgba(245,158,11,0.12)",
      color: "#f59e0b",
      fontSize: isTablet ? "11px" : "12px",
      fontWeight: "600",
      whiteSpace: "nowrap",
    }),
    [isTablet]
  );

  // ===== ✅ Handlers (useCallback) =====
  const handleToggleShowFull = useCallback(() => {
    setShowFull((v) => !v);
  }, []);

  const handleTest = useCallback(() => {
    onTest(keyItem);
  }, [onTest, keyItem]);

  const handleReset = useCallback(() => {
    onReset(keyItem.id);
  }, [onReset, keyItem.id]);

  const handleToggle = useCallback(() => {
    onToggle(keyItem.id, keyItem.is_active);
  }, [onToggle, keyItem.id, keyItem.is_active]);

  const handleReactivate = useCallback(() => {
    onReactivate(keyItem.id);
  }, [onReactivate, keyItem.id]);

  const handleDelete = useCallback(() => {
    onDelete(keyItem.id);
  }, [onDelete, keyItem.id]);

  // ===== JSX =====
  return (
    <tr style={rowStyle}>
      {/* ===== الاسم ===== */}
      <td style={cellStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {activeNow && (
            <div
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                background: "#10b981",
                boxShadow: "0 0 8px #10b981",
                animation: "pulse 1.5s infinite",
                flexShrink: 0,
              }}
              title="نشط الآن"
            />
          )}
          <div style={nameStyle}>
            {keyItem.key_name || "مفتاح Groq"}
          </div>
        </div>
        {keyItem.org_id && (
          <div
            style={{
              fontSize: "10px",
              opacity: 0.5,
              fontFamily: "monospace",
              marginTop: "2px",
            }}
          >
            {keyItem.org_id.slice(0, 20)}...
          </div>
        )}
      </td>

      {/* ===== المفتاح ===== */}
      <td style={cellStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={keyTextStyle}>
            {showFull
              ? keyItem.key_value
              : keyItem.key_value?.slice(0, 20) + "..."}
          </span>
          <button
            onClick={handleToggleShowFull}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontSize: "14px",
              flexShrink: 0,
              opacity: 0.7,
              padding: "4px",
              minWidth: "28px",
              minHeight: "28px",
            }}
            title={showFull ? "إخفاء المفتاح" : "إظهار المفتاح"}
            aria-label={showFull ? "إخفاء المفتاح" : "إظهار المفتاح"}
          >
            {showFull ? "🙈" : "👁️"}
          </button>
        </div>
      </td>

      {/* ===== الاستهلاك ===== */}
      <td style={cellStyle}>
        <div style={{ minWidth: isTablet ? "130px" : "150px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: isTablet ? "12px" : "13px",
              marginBottom: "4px",
            }}
          >
            <span>{realUsed.toLocaleString()}</span>
            <span style={{ opacity: 0.6 }}>{percent.toFixed(0)}%</span>
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
                width: percent + "%",
                height: "100%",
                background: color,
                transition: "width 0.3s",
              }}
            />
          </div>
        </div>
      </td>

      {/* ===== الحد ===== */}
      <td style={limitStyle}>{realLimit.toLocaleString()}</td>

      {/* ===== الحالة ===== */}
      <td style={cellStyle}>
        <div style={statusBadgeStyle}>
          <span>{status.icon}</span>
          <span>{status.label}</span>
        </div>
      </td>

      {/* ===== آخر استخدام ===== */}
      <td style={cellStyle}>
        <div style={lastUsedStyle}>{lastUsed}</div>
      </td>

      {/* ===== الوقت المتبقي ===== */}
      <td style={cellStyle}>
        {timeLeft ? (
          <div style={timeLeftStyle}>
            <span>⏱️</span>
            <span>{timeLeft}</span>
          </div>
        ) : (
          <span style={{ opacity: 0.3, fontSize: "14px" }}>—</span>
        )}
      </td>

      {/* ===== الإجراءات ===== */}
      <td style={cellStyle}>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          <IconBtn
            icon="🔍"
            title="فحص المفتاح"
            color="#a29bfe"
            bg="rgba(108,92,231,0.15)"
            onClick={handleTest}
          />
          <IconBtn
            icon="🔄"
            title="تصفير الاستهلاك"
            color="#fbbf24"
            bg="rgba(251,191,36,0.15)"
            onClick={handleReset}
          />
          <IconBtn
            icon={keyItem.is_active ? "⏸️" : "▶️"}
            title={keyItem.is_active ? "تعطيل" : "تفعيل"}
            color={keyItem.is_active ? "#f87171" : "#4ade80"}
            bg={
              keyItem.is_active
                ? "rgba(248,113,113,0.15)"
                : "rgba(74,222,128,0.15)"
            }
            onClick={handleToggle}
          />
          {!isValid && !keyItem.is_active && (
            <IconBtn
              icon="✨"
              title="إعادة تفعيل"
              color="#22c55e"
              bg="rgba(34,197,94,0.15)"
              onClick={handleReactivate}
            />
          )}
          <IconBtn
            icon="🗑️"
            title="حذف"
            color="#f87171"
            bg="rgba(248,113,113,0.15)"
            onClick={handleDelete}
          />
        </div>
        {keyItem.last_checked_at && (
          <div
            style={{
              fontSize: "10px",
              opacity: 0.5,
              marginTop: "6px",
              textAlign: "center",
            }}
          >
            آخر فحص: {formatDate(keyItem.last_checked_at)}
          </div>
        )}
      </td>
    </tr>
  );
}

// ============================================================
//  IconBtn — زر أيقونة بحالة pressed
// ============================================================
function IconBtn({ icon, title, color, bg, onClick }) {
  const [pressed, setPressed] = useState(false);

  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      style={{
        background: bg,
        color: color,
        border: "none",
        padding: "6px 10px",
        borderRadius: "8px",
        cursor: "pointer",
        fontSize: "13px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        // ✅ هدف لمس مريح
        minWidth: "32px",
        minHeight: "32px",
        transform: pressed ? "scale(0.92)" : "scale(1)",
        transition: "transform 0.1s, opacity 0.1s",
      }}
    >
      {icon}
    </button>
  );
}
