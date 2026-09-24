// ============================================
// src/components/admin/AdminStats.jsx
// إحصائيات علوية للمفاتيح
// ============================================

import { getKeysStats, getEarliestFreeTime } from "../../utils/helpers";

export default function AdminStats({ keys, theme }) {
  const stats = getKeysStats(keys);
  const earliestFree = getEarliestFreeTime(keys);

  const cards = [
    {
      label: "نشط",
      value: stats.active,
      icon: "✅",
      color: "#10b981",
      bg: "rgba(16,185,129,0.12)",
    },
    {
      label: "مقيّد",
      value: stats.limited,
      icon: "⏸️",
      color: "#f59e0b",
      bg: "rgba(245,158,11,0.12)",
    },
    {
      label: "معطل",
      value: stats.disabled,
      icon: "❌",
      color: "#ef4444",
      bg: "rgba(239,68,68,0.12)",
    },
    {
      label: "الإجمالي",
      value: stats.total,
      icon: "📊",
      color: "#3b82f6",
      bg: "rgba(59,130,246,0.12)",
    },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
        gap: "10px",
        marginBottom: "16px",
      }}
    >
      {cards.map((card, idx) => (
        <div
          key={idx}
          style={{
            background: theme.surface,
            border: `1px solid ${theme.border}`,
            borderRadius: "14px",
            padding: "14px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              background: card.bg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "20px",
              flexShrink: 0,
            }}
          >
            {card.icon}
          </div>
          <div>
            <div
              style={{
                fontSize: "24px",
                fontWeight: "bold",
                color: card.color,
                lineHeight: 1,
              }}
            >
              {card.value}
            </div>
            <div
              style={{
                fontSize: "12px",
                opacity: 0.7,
                marginTop: "4px",
              }}
            >
              {card.label}
            </div>
          </div>
        </div>
      ))}

      {earliestFree && (
        <div
          style={{
            background:
              "linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.05))",
            border: `1px solid rgba(245,158,11,0.3)`,
            borderRadius: "14px",
            padding: "14px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            gridColumn: "1 / -1",
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              background: "rgba(245,158,11,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "20px",
              flexShrink: 0,
            }}
          >
            ⏱️
          </div>
          <div>
            <div
              style={{
                fontSize: "16px",
                fontWeight: "bold",
                color: "#f59e0b",
              }}
            >
              {earliestFree}
            </div>
            <div
              style={{
                fontSize: "12px",
                opacity: 0.7,
                marginTop: "2px",
              }}
            >
              أقرب وقت لتحرر مفتاح
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
