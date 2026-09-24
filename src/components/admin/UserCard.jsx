// ============================================
// src/components/admin/UserCard.jsx
// صف مستخدم — لجدول الكمبيوتر
// ============================================

import { getUsagePercent, getUsageColor } from "../../utils/helpers";
import { PERSONALITY_LABELS, DEFAULT_PERSONALITY } from "../../config/personalities";

export default function UserCard({
  u,
  theme,
  online,
  changePersonality,
  toggleUserBlock,
  deleteUser,
  onEditUser,
}) {
  const used = u.used_today || 0;
  const limit = u.daily_limit || 5000;
  const percent = getUsagePercent(used, limit);
  const color = getUsageColor(percent);

  return (
    <tr style={{ borderBottom: `1px solid ${theme.border}` }}>
      <td style={{ padding: "14px 10px" }}>
        <strong style={{ fontSize: "16px" }}>{u.name || "مستخدم"}</strong>
        <br />
        <span
          style={{
            fontFamily: "monospace",
            fontSize: "12px",
            opacity: 0.5,
          }}
        >
          {u.email}
        </span>
      </td>
      <td style={{ padding: "14px 10px" }}>
        <div style={{ minWidth: "140px" }}>
          <div style={{ fontSize: "13px", marginBottom: "4px" }}>
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
      <td style={{ padding: "14px 10px" }}>
        <select
          value={u.personality || DEFAULT_PERSONALITY}
          onChange={(e) => changePersonality(u.id, e.target.value)}
          style={{
            background: theme.inputBg,
            color: theme.text,
            border: `1px solid ${theme.border}`,
            borderRadius: "6px",
            padding: "6px 10px",
            fontSize: "13px",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          {Object.entries(PERSONALITY_LABELS).map(([key, label]) => (
            <option key={key} value={key} style={{ background: theme.surface }}>
              {label}
            </option>
          ))}
        </select>
      </td>
      <td style={{ padding: "14px 10px" }}>
        <span
          style={{
            padding: "4px 12px",
            borderRadius: "20px",
            fontSize: "13px",
            fontWeight: "600",
            background: u.is_blocked
              ? "rgba(239,68,68,0.15)"
              : "rgba(16,185,129,0.15)",
            color: u.is_blocked ? "#ef4444" : "#10b981",
          }}
        >
          {u.is_blocked ? "محظور" : "نشط"}
        </span>
      </td>
      <td style={{ padding: "14px 10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              background: online ? "#10b981" : "#6b7280",
              boxShadow: online ? "0 0 5px #10b981" : "none",
            }}
          />
          <span style={{ fontSize: "13px" }}>
            {online ? "متصل" : "غير متصل"}
          </span>
        </div>
      </td>
      <td style={{ padding: "14px 10px" }}>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          <button
            onClick={() => onEditUser(u)}
            style={{
              background: "rgba(245,158,11,0.15)",
              color: "#f59e0b",
              border: "none",
              padding: "6px 12px",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "13px",
            }}
            title="تعديل"
          >
            ⚙️
          </button>
          <button
            onClick={() => toggleUserBlock(u.id, u.is_blocked)}
            style={{
              background: u.is_blocked
                ? "rgba(16,185,129,0.15)"
                : "rgba(239,68,68,0.15)",
              color: u.is_blocked ? "#10b981" : "#ef4444",
              border: "none",
              padding: "6px 12px",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: "600",
              fontFamily: "inherit",
            }}
          >
            {u.is_blocked ? "فك الحظر" : "حظر"}
          </button>
          <button
            onClick={() => deleteUser(u.id, u.name || u.email)}
            style={{
              background: "rgba(239,68,68,0.15)",
              color: "#ef4444",
              border: "none",
              padding: "6px 12px",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "13px",
            }}
            title="حذف"
          >
            🗑️
          </button>
        </div>
      </td>
    </tr>
  );
}
