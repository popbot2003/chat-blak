// ============================================
// src/components/admin/UserCard.jsx — Responsive
// صف مستخدم — لجدول الكمبيوتر والتابلت
// متوافق مع:
//   - src/config/breakpoints.js
//   - src/App.css (media queries موحّدة)
// ============================================

import { useState, useMemo, useCallback } from "react";
import { getUsagePercent, getUsageColor } from "../../utils/helpers";
import {
  PERSONALITY_LABELS,
  DEFAULT_PERSONALITY,
} from "../../config/personalities";

export default function UserCard({
  u,
  theme,
  online,
  changePersonality,
  toggleUserBlock,
  deleteUser,
  onEditUser,
  // ✅ جديد: coming from UsersTab
  isTablet = false,
}) {
  const [hover, setHover] = useState(false);

  // ===== ✅ حساب الاستهلاك (useMemo) =====
  const { used, limit, percent, color } = useMemo(() => {
    const u_used = u.used_today || 0;
    const u_limit = u.daily_limit || 5000;
    const u_percent = getUsagePercent(u_used, u_limit);
    return {
      used: u_used,
      limit: u_limit,
      percent: u_percent,
      color: getUsageColor(u_percent),
    };
  }, [u.used_today, u.daily_limit]);

  // ===== ✅ أنماط الخلايا (متجاوبة مع التابلت) =====
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
      background: hover ? theme.rowHover : "transparent",
      transition: "background 0.15s",
    }),
    [theme.border, theme.rowHover, hover]
  );

  const nameStyle = useMemo(
    () => ({
      fontSize: isTablet ? "14px" : "16px",
    }),
    [isTablet]
  );

  const emailStyle = useMemo(
    () => ({
      fontFamily: "monospace",
      fontSize: "12px",
      opacity: 0.5,
    }),
    []
  );

  const statusBadgeStyle = useMemo(
    () => ({
      padding: "4px 12px",
      borderRadius: "20px",
      fontSize: isTablet ? "12px" : "13px",
      fontWeight: "600",
      background: u.is_blocked
        ? "rgba(239,68,68,0.15)"
        : "rgba(16,185,129,0.15)",
      color: u.is_blocked ? "#ef4444" : "#10b981",
      whiteSpace: "nowrap",
    }),
    [u.is_blocked, isTablet]
  );

  const selectStyle = useMemo(
    () => ({
      background: theme.inputBg,
      color: theme.text,
      border: `1px solid ${theme.border}`,
      borderRadius: "6px",
      padding: isTablet ? "5px 8px" : "6px 10px",
      fontSize: isTablet ? "12px" : "13px",
      cursor: "pointer",
      fontFamily: "inherit",
      maxWidth: "140px",
    }),
    [theme.inputBg, theme.text, theme.border, isTablet]
  );

  const iconBtnStyle = useMemo(
    () => ({
      border: "none",
      padding: isTablet ? "5px 10px" : "6px 12px",
      borderRadius: "8px",
      cursor: "pointer",
      fontSize: isTablet ? "12px" : "13px",
      fontFamily: "inherit",
      minHeight: isTablet ? "32px" : "auto",
      transition: "transform 0.1s",
    }),
    [isTablet]
  );

  const blockBtnStyle = useMemo(
    () => ({
      border: "none",
      padding: isTablet ? "5px 10px" : "6px 12px",
      borderRadius: "8px",
      cursor: "pointer",
      fontSize: isTablet ? "11px" : "12px",
      fontWeight: "600",
      fontFamily: "inherit",
      background: u.is_blocked
        ? "rgba(16,185,129,0.15)"
        : "rgba(239,68,68,0.15)",
      color: u.is_blocked ? "#10b981" : "#ef4444",
      minHeight: isTablet ? "32px" : "auto",
      whiteSpace: "nowrap",
    }),
    [u.is_blocked, isTablet]
  );

  // ===== ✅ Handlers (useCallback) =====
  const handlePersonalityChange = useCallback(
    (e) => changePersonality(u.id, e.target.value),
    [changePersonality, u.id]
  );

  const handleEdit = useCallback(() => {
    onEditUser(u);
  }, [onEditUser, u]);

  const handleToggleBlock = useCallback(() => {
    toggleUserBlock(u.id, u.is_blocked);
  }, [toggleUserBlock, u.id, u.is_blocked]);

  const handleDelete = useCallback(() => {
    deleteUser(u.id, u.name || u.email);
  }, [deleteUser, u.id, u.name, u.email]);

  return (
    <tr
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={rowStyle}
    >
      {/* ===== الاسم + البريد ===== */}
      <td style={cellStyle}>
        <strong style={nameStyle}>{u.name || "مستخدم"}</strong>
        <br />
        <span style={emailStyle}>{u.email}</span>
      </td>

      {/* ===== الاستهلاك ===== */}
      <td style={cellStyle}>
        <div style={{ minWidth: isTablet ? "120px" : "140px" }}>
          <div
            style={{
              fontSize: isTablet ? "12px" : "13px",
              marginBottom: "4px",
            }}
          >
            {used.toLocaleString()} / {limit.toLocaleString()}
          </div>
          <div
            style={{
              width: "100%",
              height: "4px",
              background: theme.barBg,
              borderRadius: "2px",
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
          <div
            style={{
              fontSize: "12px",
              opacity: 0.6,
              marginTop: "2px",
            }}
          >
            {percent.toFixed(0)}%
          </div>
        </div>
      </td>

      {/* ===== الشخصية ===== */}
      <td style={cellStyle}>
        <select
          value={u.personality || DEFAULT_PERSONALITY}
          onChange={handlePersonalityChange}
          style={selectStyle}
        >
          {Object.entries(PERSONALITY_LABELS).map(([key, label]) => (
            <option key={key} value={key} style={{ background: theme.surface }}>
              {label}
            </option>
          ))}
        </select>
      </td>

      {/* ===== الحالة ===== */}
      <td style={cellStyle}>
        <span style={statusBadgeStyle}>
          {u.is_blocked ? "محظور" : "نشط"}
        </span>
      </td>

      {/* ===== الاتصال ===== */}
      <td style={cellStyle}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            whiteSpace: "nowrap",
          }}
        >
          <div
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              background: online ? "#10b981" : "#6b7280",
              boxShadow: online ? "0 0 5px #10b981" : "none",
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: isTablet ? "12px" : "13px" }}>
            {online ? "متصل" : "غير متصل"}
          </span>
        </div>
      </td>

      {/* ===== الإجراءات ===== */}
      <td style={cellStyle}>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          <button
            onClick={handleEdit}
            style={{
              ...iconBtnStyle,
              background: "rgba(245,158,11,0.15)",
              color: "#f59e0b",
            }}
            title="تعديل الحد اليومي"
            aria-label={`تعديل ${u.name || u.email}`}
          >
            ⚙️
          </button>
          <button
            onClick={handleToggleBlock}
            style={blockBtnStyle}
            title={u.is_blocked ? "فك حظر المستخدم" : "حظر المستخدم"}
            aria-label={u.is_blocked ? "فك حظر المستخدم" : "حظر المستخدم"}
          >
            {u.is_blocked ? "فك الحظر" : "حظر"}
          </button>
          <button
            onClick={handleDelete}
            style={{
              ...iconBtnStyle,
              background: "rgba(239,68,68,0.15)",
              color: "#ef4444",
            }}
            title="حذف المستخدم نهائيًا"
            aria-label={`حذف ${u.name || u.email}`}
          >
            🗑️
          </button>
        </div>
      </td>
    </tr>
  );
}
