// ============================================
// src/components/admin/AdminTabs.jsx
// تبويبات التنقل (مستخدمين/مفاتيح/محادثات)
// ============================================

export default function AdminTabs({
  activeTab,
  setActiveTab,
  theme,
  counts,
}) {
  const tabs = [
    { id: "users", icon: "👥", label: "المستخدمين", count: counts.users },
    { id: "keys", icon: "🔑", label: "المفاتيح", count: counts.keys },
    { id: "chats", icon: "💬", label: "المحادثات", count: counts.chats },
  ];

  return (
    <div
      style={{
        display: "flex",
        gap: "6px",
        padding: "8px 12px",
        background: theme.surface,
        borderBottom: `1px solid ${theme.border}`,
        position: "sticky",
        top: "76px",
        zIndex: 99,
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              minWidth: "100px",
              padding: "10px 12px",
              background: isActive ? theme.tabActiveBg : "transparent",
              color: isActive ? theme.tabActiveColor : theme.tabInactiveColor,
              border: "none",
              borderRadius: "10px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: isActive ? "600" : "500",
              fontFamily: "inherit",
              transition: "all 0.2s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              whiteSpace: "nowrap",
            }}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            <span
              style={{
                background: isActive ? theme.tabActiveColor : theme.surface2,
                color: isActive ? theme.surface : theme.textMuted,
                padding: "2px 8px",
                borderRadius: "10px",
                fontSize: "12px",
                fontWeight: "600",
                minWidth: "24px",
              }}
            >
              {tab.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
