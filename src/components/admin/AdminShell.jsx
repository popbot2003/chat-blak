// ============================================
// AdminShell.jsx — هيكل لوحة التحكم
// قائمة جانبية على الديسكتوب، وشريط سفلي على الهاتف.
// الأنماط: src/styles/admin/admin.css
// ============================================

import { useState } from "react";

const NAV = [
  { id: "overview", icon: "◧", label: "نظرة عامة" },
  { id: "users", icon: "👥", label: "المستخدمون" },
  { id: "keys", icon: "🔑", label: "المفاتيح" },
  { id: "chats", icon: "💬", label: "المحادثات" },
];

export default function AdminShell({
  user,
  activeTab,
  setActiveTab,
  counts = {},
  darkMode,
  onToggleTheme,
  onShowExport,
  exportKeysToCSV,
  onLogout,
  children,
}) {
  const [menu, setMenu] = useState(false);
  const title = NAV.find((n) => n.id === activeTab)?.label || "";
  const run = (fn) => () => { setMenu(false); fn?.(); };

  return (
    <div className="adm-shell">
      <aside className="adm-side" aria-label="التنقل">
        <div className="adm-brand">
          <span className="adm-brand__mark">B.</span>
          <div>
            <strong>BLAK</strong>
            <small>لوحة التحكم</small>
          </div>
        </div>

        <nav className="adm-nav">
          {NAV.map((n) => (
            <button
              key={n.id}
              type="button"
              className={`adm-nav__item ${activeTab === n.id ? "is-active" : ""}`}
              aria-current={activeTab === n.id ? "page" : undefined}
              onClick={() => setActiveTab(n.id)}
            >
              <span className="adm-nav__icon" aria-hidden="true">{n.icon}</span>
              <span className="adm-nav__label">{n.label}</span>
              {counts[n.id] !== undefined && <span className="adm-nav__count">{counts[n.id]}</span>}
            </button>
          ))}
        </nav>

        <div className="adm-side__foot">
          <div className="adm-me">
            <span className="adm-me__avatar">{(user?.name || user?.email || "A").trim().charAt(0).toUpperCase()}</span>
            <div>
              <strong>{user?.name || "المدير"}</strong>
              <small>{user?.email}</small>
            </div>
          </div>
        </div>
      </aside>

      <div className="adm-main">
        <header className="adm-top">
          <h1>{title}</h1>
          <div className="adm-top__actions">
            <button type="button" className="ui-btn ui-btn--ghost ui-btn--sm" onClick={onToggleTheme}>
              {darkMode ? "☀ نهاري" : "☾ ليلي"}
            </button>
            <div className="adm-menu">
              <button type="button" className="ui-btn ui-btn--sm" onClick={() => setMenu((v) => !v)} aria-haspopup="menu" aria-expanded={menu}>
                المزيد ▾
              </button>
              {menu && (
                <>
                  <div className="adm-menu__backdrop" onClick={() => setMenu(false)} />
                  <div className="adm-menu__list" role="menu">
                    <button role="menuitem" type="button" onClick={run(() => { window.location.href = "/?chat"; })}>فتح الشات</button>
                    <button role="menuitem" type="button" onClick={run(onShowExport)}>تصدير البيانات</button>
                    <button role="menuitem" type="button" onClick={run(exportKeysToCSV)}>تصدير المفاتيح</button>
                    <hr />
                    <button role="menuitem" type="button" className="is-danger" onClick={run(onLogout)}>تسجيل الخروج</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="adm-content">{children}</main>
      </div>

      <nav className="adm-bottom" aria-label="التنقل">
        {NAV.map((n) => (
          <button
            key={n.id}
            type="button"
            className={activeTab === n.id ? "is-active" : ""}
            onClick={() => setActiveTab(n.id)}
          >
            <span aria-hidden="true">{n.icon}</span>
            {n.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
