// ============================================
// OverviewTab.jsx — نظرة عامة سريعة
// يعتمد على بيانات موجودة أصلًا في Admin.jsx (بدون استعلامات جديدة).
// ============================================

import { useMemo } from "react";

export default function OverviewTab({ users = [], apiKeys = [], allChats = [], isUserOnline, onGo }) {
  const stats = useMemo(() => {
    const activeKeys = apiKeys.filter((k) => k.is_active).length;
    const blocked = users.filter((u) => u.is_blocked).length;
    const online = isUserOnline ? users.filter((u) => isUserOnline(u.id)).length : 0;
    return { activeKeys, blocked, online };
  }, [users, apiKeys, isUserOnline]);

  const keyHealth = apiKeys.length ? Math.round((stats.activeKeys / apiKeys.length) * 100) : 0;
  const recent = useMemo(
    () =>
      [...allChats]
        .sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0))
        .slice(0, 6),
    [allChats]
  );

  const cards = [
    { label: "المستخدمون", value: users.length, note: `${stats.online} متصل الآن`, go: "users" },
    { label: "المفاتيح النشطة", value: `${stats.activeKeys}/${apiKeys.length}`, note: `سلامة المفاتيح ${keyHealth}%`, go: "keys", tone: keyHealth < 50 && apiKeys.length ? "danger" : "success" },
    { label: "المحادثات", value: allChats.length, note: "إجمالي المحادثات", go: "chats" },
    { label: "الحسابات المحظورة", value: stats.blocked, note: "تحتاج مراجعة عند الارتفاع", go: "users", tone: stats.blocked ? "warning" : undefined },
  ];

  return (
    <div className="adm-overview">
      <div className="adm-stats">
        {cards.map((c) => (
          <button key={c.label} type="button" className="adm-stat" onClick={() => onGo?.(c.go)}>
            <span className="adm-stat__label">{c.label}</span>
            <strong className={`adm-stat__value ${c.tone ? `is-${c.tone}` : ""}`}>{c.value}</strong>
            <span className="adm-stat__note">{c.note}</span>
          </button>
        ))}
      </div>

      <section className="adm-panel">
        <div className="adm-panel__head">
          <h2>آخر المحادثات</h2>
          <button type="button" className="ui-btn ui-btn--ghost ui-btn--sm" onClick={() => onGo?.("chats")}>عرض الكل</button>
        </div>
        {recent.length === 0 ? (
          <p className="adm-empty">لا توجد محادثات بعد.</p>
        ) : (
          <ul className="adm-list">
            {recent.map((c) => (
              <li key={c.id}>
                <span>{c.title || "محادثة بدون عنوان"}</span>
                <small>{new Date(c.updated_at || c.created_at || Date.now()).toLocaleDateString("ar-EG")}</small>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
