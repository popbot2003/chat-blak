// ============================================
// src/components/admin/KeyCard.jsx
// كارت مفتاح — للشاشات الكبيرة (جدول)
// ============================================

import { useState } from "react";
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
}) {
  const [showFull, setShowFull] = useState(false);

  // ✅ استخدام effective_tpd_limit أولاً
  const realLimit =
    keyItem.effective_tpd_limit || keyItem.tpd_limit || 200000;
  const realUsed = keyItem.used_tpd_today || keyItem.used_today || 0;
  const percent = getUsagePercent(realUsed, realLimit);
  const color = getUsageColor(percent);
  const status = getKeyStatus(keyItem);
  const timeLeft = getTimeUntil(keyItem.rate_limited_until);
  const isValid = keyItem.is_valid !== false;

  // ✅ هل نشط الآن؟ (مع الوقت المحدَّث)
  const activeNow = isKeyActiveNow(keyItem, currentTime);
  const lastUsed = getLastUsedTime(keyItem.last_request_at, currentTime);

  // ✅ لون الحد
  const limitColor =
    percent > 90 ? "#ef4444" : percent > 50 ? "#f59e0b" : theme.text;

  return (
    <tr
      style={{
        borderBottom: `1px solid ${theme.border}`,
        background: activeNow
          ? darkMode
            ? "rgba(16,185,129,0.08)"
            : "rgba(16,185,129,0.05)"
          : "transparent",
        transition: "background 0.3s",
      }}
    >
      {/* الاسم */}
      <td style={{ padding: "14px 10px", fontSize: "15px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
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
          <div style={{ fontWeight: "600" }}>
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

      {/* المفتاح */}
      <td style={{ padding: "14px 10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              fontFamily: "monospace",
              fontSize: "12px",
              wordBreak: "break-all",
              opacity: 0.8,
            }}
          >
            {showFull
              ? keyItem.key_value
              : keyItem.key_value?.slice(0, 20) + "..."}
          </span>
          <button
            onClick={() => setShowFull(!showFull)}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontSize: "14px",
              flexShrink: 0,
              opacity: 0.7,
            }}
          >
            {showFull ? "🙈" : "👁️"}
          </button>
        </div>
      </td>

      {/* الاستهلاك */}
      <td style={{ padding: "14px 10px" }}>
        <div style={{ minWidth: "150px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "13px",
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

      {/* الحد */}
      <td
        style={{
          padding: "14px 10px",
          fontSize: "13px",
          fontFamily: "monospace",
          color: limitColor,
          fontWeight: percent > 90 ? "700" : "500",
        }}
      >
        {realLimit.toLocaleString()}
      </td>

      {/* الحالة */}
      <td style={{ padding: "14px 10px" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px 12px",
            borderRadius: "20px",
            background: status.bg,
            color: status.color,
            fontSize: "13px",
            fontWeight: "600",
            whiteSpace: "nowrap",
          }}
        >
          <span>{status.icon}</span>
          <span>{status.label}</span>
        </div>
      </td>

      {/* آخر استخدام */}
      <td style={{ padding: "14px 10px" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            padding: activeNow ? "4px 10px" : "0",
            borderRadius: "12px",
            background: activeNow ? "rgba(16,185,129,0.15)" : "transparent",
            color: activeNow ? "#10b981" : theme.textMuted,
            fontSize: "12px",
            fontWeight: activeNow ? "700" : "500",
            whiteSpace: "nowrap",
          }}
        >
          {lastUsed}
        </div>
      </td>

      {/* الوقت المتبقي */}
      <td style={{ padding: "14px 10px" }}>
        {timeLeft ? (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "4px 10px",
              borderRadius: "12px",
              background: "rgba(245,158,11,0.12)",
              color: "#f59e0b",
              fontSize: "12px",
              fontWeight: "600",
              whiteSpace: "nowrap",
            }}
          >
            <span>⏱️</span>
            <span>{timeLeft}</span>
          </div>
        ) : (
          <span style={{ opacity: 0.3, fontSize: "14px" }}>—</span>
        )}
      </td>

      {/* الإجراءات */}
      <td style={{ padding: "14px 10px" }}>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          <IconBtn
            icon="🔍"
            title="فحص المفتاح"
            color="#a29bfe"
            bg="rgba(108,92,231,0.15)"
            onClick={() => onTest(keyItem)}
          />
          <IconBtn
            icon="🔄"
            title="تصفير الاستهلاك"
            color="#fbbf24"
            bg="rgba(251,191,36,0.15)"
            onClick={() => onReset(keyItem.id)}
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
            onClick={() => onToggle(keyItem.id, keyItem.is_active)}
          />
          {!isValid && !keyItem.is_active && (
            <IconBtn
              icon="✨"
              title="إعادة تفعيل"
              color="#22c55e"
              bg="rgba(34,197,94,0.15)"
              onClick={() => onReactivate(keyItem.id)}
            />
          )}
          <IconBtn
            icon="🗑️"
            title="حذف"
            color="#f87171"
            bg="rgba(248,113,113,0.15)"
            onClick={() => onDelete(keyItem.id)}
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

function IconBtn({ icon, title, color, bg, onClick }) {
  return (
    <button
      onClick={onClick}
      title={title}
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
        transition: "all 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "scale(1.1)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "scale(1)";
      }}
    >
      {icon}
    </button>
  );
}
