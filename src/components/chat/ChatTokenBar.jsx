// ============================================
// ChatTokenBar.jsx
// شريط عرض استهلاك التوكن
// ============================================

import { getUsagePercent, getUsageColor } from "../../utils/helpers";

export default function ChatTokenBar({ user }) {
  const usedToday = user?.used_today || 0;
  const dailyLimit = user?.daily_limit || 5000;
  const percent = getUsagePercent(usedToday, dailyLimit);
  const color = getUsageColor(percent);
  const isFull = usedToday >= dailyLimit;

  return (
    <div className="token-bar">
      <div className="token-info">
        <span>
          📊 {usedToday.toLocaleString()} / {dailyLimit.toLocaleString()} توكن
        </span>
        <span style={{ color }}>{percent.toFixed(0)}%</span>
      </div>
      <div className="token-track">
        <div
          className="token-fill"
          style={{ width: `${percent}%`, background: color }}
        />
      </div>
      {isFull && (
        <div
          style={{
            fontSize: "11px",
            color: "#f87171",
            marginTop: "4px",
          }}
        >
          ⚠️ وصلت للحد النهاردة! بكره هتقدر تكمل.
        </div>
      )}
    </div>
  );
}
