// ============================================
// ChatMenu.jsx
// القائمة المنسدلة (استهلاك + إعدادات + خروج)
// ============================================

import { getUsagePercent, getUsageColor } from "../../utils/helpers";

export default function ChatMenu({
  user,
  isDark,
  onClose,
  onOpenSettings,
  onOpenHistory,
  onToggleTheme,
  onLogout,
}) {
  const usedToday = user?.used_today || 0;
  const dailyLimit = user?.daily_limit || 5000;
  const percent = getUsagePercent(usedToday, dailyLimit);
  const color = getUsageColor(percent);
  const remaining = dailyLimit - usedToday;

  return (
    <>
      {/* Overlay لإغلاق القائمة */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 200,
          background: "rgba(0,0,0,0.5)",
        }}
      />

      {/* القائمة */}
      <div
        style={{
          position: "absolute",
          top: "60px",
          right: "10px",
          background: isDark ? "#1a1a2e" : "#fff",
          borderRadius: "16px",
          padding: "8px",
          zIndex: 201,
          display: "flex",
          flexDirection: "column",
          gap: "2px",
          minWidth: "240px",
          boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
        }}
      >
        {/* استهلاك اليوم */}
        <div
          style={{
            padding: "12px",
            margin: "4px",
            background: "rgba(108,92,231,0.1)",
            borderRadius: "12px",
            border: "1px solid rgba(108,92,231,0.2)",
          }}
        >
          <div
            style={{
              fontSize: "13px",
              fontWeight: "bold",
              marginBottom: "8px",
            }}
          >
            📊 استهلاك اليوم
          </div>

          <div style={{ fontSize: "12px", marginBottom: "4px" }}>
            استهلكت: <strong>{usedToday.toLocaleString()}</strong> /{" "}
            {dailyLimit.toLocaleString()} توكن
          </div>

          <div style={{ fontSize: "12px", marginBottom: "8px" }}>
            متبقي:{" "}
            <strong
              style={{
                color: remaining < 1000 ? "#f87171" : "#4ade80",
              }}
            >
              {remaining.toLocaleString()}
            </strong>{" "}
            توكن ({Math.floor(100 - percent)}%)
          </div>

          <div
            style={{
              width: "100%",
              height: "6px",
              background: "rgba(255,255,255,0.1)",
              borderRadius: "3px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${percent}%`,
                height: "100%",
                background: color,
                transition: "width 0.3s",
              }}
            />
          </div>

          <div
            style={{
              fontSize: "10px",
              opacity: 0.5,
              marginTop: "6px",
            }}
          >
            🔄 يتجدد كل يوم الساعة 12 صباحاً
          </div>
        </div>

        {/* الأزرار */}
        <button onClick={onOpenSettings} className="menu-item">
          ⚙️ الإعدادات
        </button>

        <button onClick={onOpenHistory} className="menu-item">
          💬 سجل المحادثات
        </button>

        <button onClick={onToggleTheme} className="menu-item">
          {isDark ? "☀️ النهاري" : "🌙 الليلي"}
        </button>

        <button
          onClick={onLogout}
          className="menu-item"
          style={{ color: "#f87171" }}
        >
          🚪 خروج
        </button>
      </div>
    </>
  );
}
