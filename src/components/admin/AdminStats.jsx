// ============================================
// src/components/admin/AdminStats.jsx
// إحصائيات علوية للمفاتيح — Responsive
// متوافق مع:
//   - src/config/breakpoints.js
//   - src/App.css (media queries موحّدة)
// ============================================

import { useMemo } from "react";
import { getKeysStats, getEarliestFreeTime } from "../../utils/helpers";

export default function AdminStats({
  keys,
  theme,
  // ✅ جديد: coming from Admin.jsx
  isMobile = false,
  isTablet = false,
}) {
  // ===== ✅ useMemo للحسابات =====
  const stats = useMemo(() => getKeysStats(keys), [keys]);
  const earliestFree = useMemo(() => getEarliestFreeTime(keys), [keys]);

  // ===== ✅ useMemo لبطاقات الإحصائيات =====
  const cards = useMemo(
    () => [
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
    ],
    [stats.active, stats.limited, stats.disabled, stats.total]
  );

  // ===== ✅ شبكة متجاوبة حسب الشاشة =====
  //   موبايل:  عمودان متساويان
  //   تابلت:  3-4 أعمدة auto-fit بأدنى عرض 150px
  //   ديسكتوب: auto-fit بأدنى عرض 140px (كما كان)
  const gridStyle = useMemo(() => {
    if (isMobile) {
      return {
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: "8px",
        marginBottom: "12px",
      };
    }
    if (isTablet) {
      return {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
        gap: "10px",
        marginBottom: "14px",
      };
    }
    return {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
      gap: "10px",
      marginBottom: "16px",
    };
  }, [isMobile, isTablet]);

  // ===== ✅ أنماط البطاقة (متجاوبة) =====
  const cardStyle = useMemo(
    () => ({
      background: theme.surface,
      border: `1px solid ${theme.border}`,
      borderRadius: "14px",
      padding: isMobile ? "10px" : "14px",
      display: "flex",
      alignItems: "center",
      gap: isMobile ? "8px" : "12px",
    }),
    [theme.surface, theme.border, isMobile]
  );

  const iconBoxStyle = useMemo(
    () => ({
      width: isMobile ? "36px" : "44px",
      height: isMobile ? "36px" : "44px",
      borderRadius: "12px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: isMobile ? "17px" : "20px",
      flexShrink: 0,
    }),
    [isMobile]
  );

  const valueStyle = useMemo(
    () => ({
      fontSize: isMobile ? "18px" : "24px",
      fontWeight: "bold",
      lineHeight: 1,
    }),
    [isMobile]
  );

  const labelStyle = useMemo(
    () => ({
      fontSize: isMobile ? "11px" : "12px",
      opacity: 0.7,
      marginTop: "4px",
    }),
    [isMobile]
  );

  return (
    <div style={gridStyle}>
      {/* ===== بطاقات الإحصائيات ===== */}
      {cards.map((card, idx) => (
        <div key={idx} style={cardStyle}>
          <div style={{ ...iconBoxStyle, background: card.bg }}>
            {card.icon}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ ...valueStyle, color: card.color }}>
              {card.value}
            </div>
            <div style={labelStyle}>{card.label}</div>
          </div>
        </div>
      ))}

      {/* ===== بطاقة "أقرب وقت لتحرر مفتاح" ===== */}
      {earliestFree && (
        <div
          style={{
            background:
              "linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.05))",
            border: "1px solid rgba(245,158,11,0.3)",
            borderRadius: "14px",
            padding: isMobile ? "10px" : "14px",
            display: "flex",
            alignItems: "center",
            gap: isMobile ? "8px" : "12px",
            gridColumn: "1 / -1",
          }}
        >
          <div
            style={{
              ...iconBoxStyle,
              background: "rgba(245,158,11,0.2)",
            }}
          >
            ⏱️
          </div>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: isMobile ? "14px" : "16px",
                fontWeight: "bold",
                color: "#f59e0b",
              }}
            >
              {earliestFree}
            </div>
            <div
              style={{
                fontSize: isMobile ? "11px" : "12px",
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
