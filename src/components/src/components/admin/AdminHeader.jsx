// ============================================
// src/components/admin/AdminHeader.jsx
// رأس لوحة التحكم + قائمة منسدلة
// ============================================

import { useState } from "react";

export default function AdminHeader({
  user,
  theme,
  darkMode,
  setDarkMode,
  onLogout,
  exportKeysToCSV,
  onShowExport,
}) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 16px",
        background: theme.surface,
        borderBottom: `1px solid ${theme.border}`,
        position: "sticky",
        top: 0,
        zIndex: 100,
        flexWrap: "wrap",
        gap: "10px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <span style={{ fontSize: "28px" }}>🖤</span>
        <div>
          <div
            style={{
              fontSize: "20px",
              fontWeight: "bold",
              letterSpacing: "-0.5px",
            }}
          >
            لوحة التحكم
          </div>
          <div style={{ fontSize: "13px", opacity: 0.65 }}>
            👑 {user.name || user.email}
          </div>
        </div>
      </div>

      <div style={{ position: "relative" }}>
        <button
          onClick={() => setShowMenu(!showMenu)}
          style={{
            background: theme.surface2,
            border: `1px solid ${theme.border}`,
            color: theme.text,
            padding: "8px 14px",
            borderRadius: "10px",
            cursor: "pointer",
            fontSize: "15px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontWeight: "500",
          }}
        >
          ☰ القائمة
        </button>

        {showMenu && (
          <>
            <div
              onClick={() => setShowMenu(false)}
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 200,
              }}
            />
            <div
              style={{
                position: "absolute",
                top: "48px",
                left: "0",
                background: theme.surface2,
                border: `1px solid ${theme.border}`,
                borderRadius: "12px",
                padding: "8px",
                minWidth: "200px",
                zIndex: 201,
                boxShadow: "0 12px 32px rgba(0,0,0,0.25)",
              }}
            >
              <MenuItem
                icon={darkMode ? "☀️" : "🌙"}
                label={darkMode ? "الوضع النهاري" : "الوضع الليلي"}
                theme={theme}
                onClick={() => {
                  const n = !darkMode;
                  setDarkMode(n);
                  localStorage.setItem("adminDarkMode", n);
                  setShowMenu(false);
                }}
              />
              <MenuItem
                icon="🖤"
                label="فتح الشات"
                theme={theme}
                onClick={() => {
                  window.location.href = "/?chat";
                }}
              />
              <MenuItem
                icon="📥"
                label="تصدير البيانات"
                theme={theme}
                onClick={() => {
                  onShowExport();
                  setShowMenu(false);
                }}
              />
              <MenuItem
                icon="🔑"
                label="تصدير المفاتيح"
                theme={theme}
                onClick={() => {
                  exportKeysToCSV();
                  setShowMenu(false);
                }}
              />
              <div
                style={{
                  height: "1px",
                  background: theme.border,
                  margin: "6px 0",
                }}
              />
              <MenuItem
                icon="🚪"
                label="خروج"
                theme={theme}
                color="#f87171"
                onClick={() => {
                  onLogout();
                  setShowMenu(false);
                }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function MenuItem({ icon, label, theme, onClick, color }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        textAlign: "right",
        background: "transparent",
        border: "none",
        color: color || theme.text,
        padding: "10px 12px",
        borderRadius: "8px",
        cursor: "pointer",
        fontSize: "14px",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        fontFamily: "inherit",
        transition: "background 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = theme.rowHover;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      <span style={{ fontSize: "16px" }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}
