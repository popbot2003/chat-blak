// ============================================
// src/components/admin/KeyMobileCard.jsx
// كارت مفتاح — للهاتف (بطاقات)
// ============================================

import { useState } from "react";
import {
  getUsagePercent,
  getUsageColor,
  getKeyStatus,
  getTimeUntil,
  getLastUsedTime,
  isKeyActiveNow,
} from "../../utils/helpers";

export default function KeyMobileCard({
  keyItem,
  theme,
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

  // ✅ هل نشط الآن؟
  const activeNow = isKeyActiveNow(keyItem);
  const lastUsed = getLastUsedTime(keyItem.last_request_at);

  return (
    <div
      style={{
        background: theme.surface,
        border: activeNow
          ? `2px solid #10b981`
          : `1px solid ${theme.border}`,
        borderRadius: "14px",
        padding: "14px",
        marginBottom: "10px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        boxShadow: activeNow
          ? "0 0 12px rgba(16,185,129,0.3)"
          : "none",
        transition: "all 0.3s",
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
              />
            )}
            <div style={{ fontWeight: "600", fontSize: "16px" }}>
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
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {keyItem.org_id}
            </div>
          )}
        </div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            padding: "4px 10px",
            borderRadius: "20px",
            background: status.bg,
            color: status.color,
            fontSize: "12px",
            fontWeight: "600",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          <span>{status.icon}</span>
          <span>{status.label}</span>
        </div>
      </div>

      {/* المفتاح */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          background: theme.inputBg,
          padding: "8px 10px",
          borderRadius: "8px",
        }}
      >
        <span
          style={{
            fontFamily: "monospace",
            fontSize: "11px",
            wordBreak: "break-all",
            flex: 1,
            opacity: 0.8,
          }}
        >
          {showFull
            ? keyItem.key_value
            : keyItem.key_value?.slice(0, 22) + "..."}
        </span>
        <button
          onClick={() => setShowFull(!showFull)}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            fontSize: "13px",
            flexShrink: 0,
          }}
        >
          {showFull ? "🙈" : "👁️"}
        </button>
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
            {realUsed.toLocaleString()} / {realLimit.toLocaleString()}
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

      {/* ✅ آخر استخدام */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: activeNow ? "8px 12px" : "6px 0",
          borderRadius: "10px",
          background: activeNow ? "rgba(16,185,129,0.12)" : "transparent",
          color: activeNow ? "#10b981" : theme.textMuted,
          fontSize: "13px",
          fontWeight: activeNow ? "700" : "500",
          justifyContent: "center",
        }}
      >
        {lastUsed}
      </div>

      {/* الوقت المتبقي */}
      {timeLeft && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 12px",
            borderRadius: "10px",
            background: "rgba(245,158,11,0.12)",
            color: "#f59e0b",
            fontSize: "13px",
            fontWeight: "600",
          }}
        >
          <span>⏱️</span>
          <span>الوقت المتبقي: {timeLeft}</span>
        </div>
      )}

      {/* آخر فحص */}
      {keyItem.last_checked_at && (
        <div
          style={{
            fontSize: "11px",
            opacity: 0.5,
            textAlign: "center",
          }}
        >
          آخر فحص: {keyItem.last_checked_at}
        </div>
      )}

      {/* الإجراءات */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(60px, 1fr))",
          gap: "6px",
        }}
      >
        <ActionBtn
          icon="🔍"
          label="فحص"
          color="#a29bfe"
          bg="rgba(108,92,231,0.15)"
          onClick={() => onTest(keyItem)}
        />
        <ActionBtn
          icon="🔄"
          label="تصفير"
          color="#fbbf24"
          bg="rgba(251,191,36,0.15)"
          onClick={() => onReset(keyItem.id)}
        />
        <ActionBtn
          icon={keyItem.is_active ? "⏸️" : "▶️"}
          label={keyItem.is_active ? "تعطيل" : "تفعيل"}
          color={keyItem.is_active ? "#f87171" : "#4ade80"}
          bg={
            keyItem.is_active
              ? "rgba(248,113,113,0.15)"
              : "rgba(74,222,128,0.15)"
          }
          onClick={() => onToggle(keyItem.id, keyItem.is_active)}
        />
        {!isValid && !keyItem.is_active && (
          <ActionBtn
            icon="✨"
            label="إعادة"
            color="#22c55e"
            bg="rgba(34,197,94,0.15)"
            onClick={() => onReactivate(keyItem.id)}
          />
        )}
        <ActionBtn
          icon="🗑️"
          label="حذف"
          color="#f87171"
          bg="rgba(248,113,113,0.15)"
          onClick={() => onDelete(keyItem.id)}
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
        transition: "all 0.15s",
      }}
    >
      <span style={{ fontSize: "14px" }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}
