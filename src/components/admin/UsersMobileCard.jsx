// ============================================
// src/components/admin/UsersMobileCard.jsx
// كارت مستخدم — عرض الهاتف
// ============================================

import { getUsagePercent, getUsageColor } from "../../utils/helpers";
import { PERSONALITY_LABELS, DEFAULT_PERSONALITY } from "../../config/personalities";

export default function UsersMobileCard({
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
    <div
      style={{
        background: theme.surface,
        border: `1px solid ${theme.border}`,
        borderRadius: "14px",
        padding: "14px",
        marginBottom: "10px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      {/* الرأس: الاسم + الحالة */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "8px",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: "600", fontSize: "16px" }}>
            {u.name || "مستخدم"}
          </div>
          <div
            style={{
              fontSize: "12px",
              opacity: 0.6,
              fontFamily: "monospace",
              marginTop: "2px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {u.email}
          </div>
        </div>
        <span
          style={{
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
          }}
        >
          {u.is_blocked ? "محظور" : "نشط"}
        </span>
      </div>

      {/* الاستهلاك */}
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

      {/* الشخصية + الاتصال */}
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
          onChange={(e) => changePersonality(u.id, e.target.value)}
          style={{
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
          }}
        >
          {Object.entries(PERSONALITY_LABELS).map(([key, label]) => (
            <option key={key} value={key} style={{ background: theme.surface }}>
              {label}
            </option>
          ))}
        </select>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px 10px",
            borderRadius: "8px",
            background: online ? "rgba(16,185,129,0.1)" : theme.inputBg,
          }}
        >
          <div
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: online ? "#10b981" : "#6b7280",
            }}
          />
          <span
            style={{
              fontSize: "12px",
              color: online ? "#10b981" : theme.textMuted,
              fontWeight: "600",
            }}
          >
            {online ? "متصل" : "غير متصل"}
          </span>
        </div>
      </div>

      {/* الإجراءات */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "6px",
        }}
      >
        <ActionBtn
          icon="⚙️"
          label="تعديل"
          color="#f59e0b"
          bg="rgba(245,158,11,0.15)"
          onClick={() => onEditUser(u)}
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
          onClick={() => toggleUserBlock(u.id, u.is_blocked)}
        />
        <ActionBtn
          icon="🗑️"
          label="حذف"
          color="#ef4444"
          bg="rgba(239,68,68,0.15)"
          onClick={() => deleteUser(u.id, u.name || u.email)}
        />
      </div>
    </div>
  );
}

function ActionBtn({ icon, label, color, bg, onClick }) {
  return (
    <button
      onClick={onClick}
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
        gap: "2px",
        fontWeight: "600",
      }}
    >
      <span style={{ fontSize: "14px" }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}
