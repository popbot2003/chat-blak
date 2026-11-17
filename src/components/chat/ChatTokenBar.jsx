// ============================================
// ChatTokenBar.jsx
// شريط عرض استهلاك التوكن (محدث للأدمن)
// ============================================

import { getUsagePercent, getUsageColor } from "../../utils/helpers";
import { getEffectiveUsedToday } from "../../utils/validators";

export default function ChatTokenBar({ user }) {
  // ✅ إذا كان المستخدم أدمن، نعرض استهلاكاً غير محدود بالكامل
  if (user?.role === "admin") {
    return (
      <div className="token-bar token-bar-unlimited">
        <div className="token-info">
          <span>
            💎 الاستهلاك اليومي: <strong>غير محدود (Admin Unlimited)</strong>
          </span>
          <span className="token-unlimited-badge">صلاحيات كاملة ⚡</span>
        </div>
      </div>
    );
  }

  const usedToday = getEffectiveUsedToday(user);
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
