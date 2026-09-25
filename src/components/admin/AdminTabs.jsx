// ============================================
// src/components/admin/AdminTabs.jsx
// تبويبات التنقل (مستخدمين/مفاتيح/محادثات) — Responsive
// متوافق مع:
//   - src/config/breakpoints.js
//   - src/App.css (media queries موحّدة)
// ============================================

import { useMemo } from "react";

export default function AdminTabs({
  activeTab,
  setActiveTab,
  theme,
  counts,
  // ✅ جديد: coming from Admin.jsx
  isMobile = false,
}) {
  // ===== التابات (useMemo لتجنب إعادة الإنشاء) =====
  const tabs = useMemo(
    () => [
      { id: "users", icon: "👥", label: "المستخدمين", shortLabel: "مستخدمين", count: counts.users },
      { id: "keys",  icon: "🔑", label: "المفاتيح",   shortLabel: "مفاتيح",  count: counts.keys },
      { id: "chats", icon: "💬", label: "المحادثات", shortLabel: "محادثات", count: counts.chats },
    ],
    [counts.users, counts.keys, counts.chats]
  );

  // ===== الحاوية =====
  const containerStyle = useMemo(
    () => ({
      display: "flex",
      gap: isMobile ? "4px" : "6px",
      padding: isMobile ? "6px 8px" : "8px 12px",
      background: theme.surface,
      borderBottom: `1px solid ${theme.border}`,
      position: "sticky",
      // ✅ الهيدر على الموبايل أقصر (8+22+8 ≈ 46px) فـ top أقل
      top: isMobile ? "54px" : "76px",
      zIndex: 99,
      overflowX: "auto",
      WebkitOverflowScrolling: "touch",
      scrollbarWidth: "none", // Firefox
      msOverflowStyle: "none", // IE/Edge
    }),
    [theme.surface, theme.border, isMobile]
  );

  // ===== كل تاب =====
  const getTabStyle = (isActive) => ({
    // ✅ على الموبايل: عرض تلقائي (flex: 0) للسماح بالتمرير
    //    على الديسكتوب: يتوزع بالتساوي (flex: 1)
    flex: isMobile ? "0 0 auto" : 1,
    minWidth: isMobile ? "auto" : "100px",
    padding: isMobile ? "8px 12px" : "10px 12px",
    background: isActive ? theme.tabActiveBg : "transparent",
    color: isActive ? theme.tabActiveColor : theme.tabInactiveColor,
    border: isActive ? `1px solid ${theme.tabActiveColor}33` : "1px solid transparent",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: isMobile ? "13px" : "14px",
    fontWeight: isActive ? "600" : "500",
    fontFamily: "inherit",
    transition: "all 0.2s",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: isMobile ? "4px" : "6px",
    whiteSpace: "nowrap",
    minHeight: isMobile ? "40px" : "auto",
  });

  // ===== العدّاد =====
  const getBadgeStyle = (isActive) => ({
    background: isActive ? theme.tabActiveColor : theme.surface2,
    color: isActive ? theme.surface : theme.textMuted,
    padding: isMobile ? "1px 6px" : "2px 8px",
    borderRadius: "10px",
    fontSize: isMobile ? "11px" : "12px",
    fontWeight: "600",
    minWidth: isMobile ? "20px" : "24px",
    textAlign: "center",
  });

  return (
    <>
      {/* ✅ إخفاء scrollbar (Chrome/Safari) */}
      <style>{`
        .admin-tabs-scroll::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      <div
        className="admin-tabs-scroll"
        style={containerStyle}
        role="tablist"
        aria-label="تبويبات لوحة التحكم"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;

          const handleClick = () => setActiveTab(tab.id);
          const handleKeyDown = (e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setActiveTab(tab.id);
            }
          };

          const handleMouseEnter = (e) => {
            if (!isActive) {
              e.currentTarget.style.background = theme.rowHover;
            }
          };

          const handleMouseLeave = (e) => {
            if (!isActive) {
              e.currentTarget.style.background = "transparent";
            }
          };

          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              onClick={handleClick}
              onKeyDown={handleKeyDown}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              style={getTabStyle(isActive)}
            >
              <span style={{ fontSize: isMobile ? "15px" : "16px" }}>
                {tab.icon}
              </span>
              <span>{isMobile ? tab.shortLabel : tab.label}</span>
              <span style={getBadgeStyle(isActive)}>{tab.count}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}
