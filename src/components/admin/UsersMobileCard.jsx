// ============================================
// src/components/admin/UsersMobileCard.jsx — Responsive
// كارت مستخدم — عرض الهاتف
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

export default function UsersMobileCard({
  u,
  theme,
  online,
  changePersonality,
  toggleUserBlock,
  deleteUser,
  onEditUser,
}) {
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

  // ===== ✅ أنماط الكارت =====
  const cardStyle = useMemo(
    () => ({
      background: theme.surface,
      border: `1px solid ${theme.border}`,
      borderRadius: "14px",
      padding: "14px",
      marginBottom: "10px",
      display: "flex",
      flexDirection: "column",
      gap: "12px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
    }),
    [theme.surface, theme.border]
  );

  const nameStyle = useMemo(
    () => ({
      fontWeight: "600",
      fontSize: "16px",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    }),
    []
  );

  const emailStyle = useMemo(
    () => ({
      fontSize: "12px",
      opacity: 0.6,
      fontFamily: "monospace",
      marginTop: "2px",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    }),
    []
  );

  const badgeStyle = useMemo(
    () => ({
      padding: "4px 10px",
      borderRadius: "20px",
      fontSize: "12px",
      fontWeight: "600",
      background: u.is_blocked
        ? "rgba(239,68,68,0.15)"
        : "rgba(16,185,129,0.15)",
      color: u.is_blocked ? "#ef4444" : "#10b981",
      whiteSpace: "nowrap",
      flexShrink: 0,
    }),
    [u.is_blocked]
  );

  const selectStyle = useMemo(
    () => ({
      flex: 1,
      minWidth: "120px",
      background: theme.inputBg,
      color: theme.text,
      border: `1px solid ${theme.border}`,
      borderRadius: "8px",
      padding: "8px 10px",
      fontSize: "13px",
      cursor: "pointer",
      fontFamily: "inherit",
    }),
    [theme.inputBg, theme.text, theme.border]
  );

  const onlineBadgeStyle = useMemo(
    () => ({
      display: "flex",
      alignItems: "center",
      gap: "6px",
      padding: "6px 10px",
      borderRadius: "8px",
      background: online ? "rgba(16,185,129,0.1)" : theme.inputBg,
      flexShrink: 0,
    }),
    [online, theme.inputBg]
  );

  const actionsGridStyle = useMemo(
    () => ({
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: "6px",
    }),
    []
  );

  // ===== ✅ Handlers =====
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

  // ===== JSX =====
  return (
    <div style={cardStyle}>
      {/* ===== الرأس: الاسم + الحالة ===== */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "8px",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={nameStyle}>{u.name || "مستخدم"}</div>
          <div style={emailStyle} title={u.email}>
            {u.email}
          </div>
        </div>
        <span style={badgeStyle}>
          {u.is_blocked ? "محظور" : "نشط"}
        </span>
      </div>

      {/* ===== الاستهلاك ===== */}
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "12px",
            marginBottom: "6px",
            opacity: 0.8,
          }}
        >
          <span>الاستهلاك</span>
          <span style={{ fontWeight: "600" }}>
            {used.toLocaleString()} / {limit.toLocaleString()}
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
              width: percent + "%",
              height: "100%",
              background: color,
              transition: "width 0.3s",
            }}
          />
        </div>
        <div
          style={{
            fontSize: "11px",
            opacity: 0.6,
            marginTop: "4px",
            textAlign: "left",
          }}
        >
          {percent.toFixed(0)}%
        </div>
      </div>

      {/* ===== الشخصية + الاتصال ===== */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <select
          value={u.personality || DEFAULT_PERSONALITY}
          onChange={handlePersonalityChange}
          style={selectStyle}
          aria-label="تغيير الشخصية"
        >
          {Object.entries(PERSONALITY_LABELS).map(([key, label]) => (
            <option key={key} value={key} style={{ background: theme.surface }}>
              {label}
            </option>
          ))}
        </select>

        <div style={onlineBadgeStyle}>
          <div
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: online ? "#10b981" : "#6b7280",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: "12px",
              color: online ? "#10b981" : theme.textMuted,
              fontWeight: "600",
              whiteSpace: "nowrap",
            }}
          >
            {online ? "متصل" : "غير متصل"}
          </span>
        </div>
      </div>

      {/* ===== الإجراءات ===== */}
      <div style={actionsGridStyle}>
        <ActionBtn
          icon="⚙️"
          label="تعديل"
          color="#f59e0b"
          bg="rgba(245,158,11,0.15)"
          onClick={handleEdit}
        />
        <ActionBtn
          icon={u.is_blocked ? "🔓" : "🔒"}
          label={u.is_blocked ? "فك الحظر" : "حظر"}
          color={u.is_blocked ? "#10b981" : "#ef4444"}
          bg={
            u.is_blocked
              ? "rgba(16,185,129,0.15)"
              : "rgba(239,68,68,0.15)"
          }
          onClick={handleToggleBlock}
        />
        <ActionBtn
          icon="🗑️"
          label="حذف"
          color="#ef4444"
          bg="rgba(239,68,68,0.15)"
          onClick={handleDelete}
        />
      </div>
    </div>
  );
}

// ============================================================
//  ActionBtn — زر بأيقونة فوق النص
// ============================================================
function ActionBtn({ icon, label, color, bg, onClick }) {
  const [pressed, setPressed] = useState(false);

  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      style={{
        background: bg,
        color: color,
        border: "none",
        padding: "8px 6px",
        borderRadius: "8px",
        cursor: "pointer",
        fontSize: "12px",
        fontFamily: "inherit",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "2px",
        fontWeight: "600",
        minHeight: "56px",
        transform: pressed ? "scale(0.96)" : "scale(1)",
        transition: "transform 0.1s, opacity 0.1s",
      }}
    >
      <span style={{ fontSize: "16px" }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}
