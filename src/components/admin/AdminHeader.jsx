// ============================================
// src/components/admin/AdminHeader.jsx
// رأس لوحة التحكم + قائمة منسدلة (Responsive)
// القائمة تظهر من يسار الشاشة على الموبايل
// متوافق مع:
//   - src/config/breakpoints.js
//   - src/App.css (media queries موحّدة)
// ============================================

import { useState, useMemo, useCallback } from "react";

export default function AdminHeader({
  user,
  theme,
  darkMode,
  setDarkMode,
  onLogout,
  exportKeysToCSV,
  onShowExport,
  // ✅ جديد: coming from Admin.jsx
  isMobile = false,
  isTablet = false,
}) {
  const [showMenu, setShowMenu] = useState(false);

  // ===== ✅ أنماط متجاوبة (useMemo لتفادي إعادة الحساب) =====
  const headerStyle = useMemo(
    () => ({
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: isMobile ? "8px 12px" : "10px 16px",
      background: theme.surface,
      borderBottom: `1px solid ${theme.border}`,
      position: "sticky",
      top: 0,
      zIndex: 100,
      flexWrap: "nowrap",
      gap: isMobile ? "8px" : "10px",
    }),
    [theme.surface, theme.border, isMobile]
  );

  const logoStyle = useMemo(
    () => ({
      fontSize: isMobile ? "22px" : isTablet ? "26px" : "28px",
      lineHeight: 1,
    }),
    [isMobile, isTablet]
  );

  const titleStyle = useMemo(
    () => ({
      fontSize: isMobile ? "16px" : isTablet ? "18px" : "20px",
      fontWeight: "bold",
      letterSpacing: "-0.5px",
      whiteSpace: "nowrap",
    }),
    [isMobile, isTablet]
  );

  const subtitleStyle = useMemo(
    () => ({
      fontSize: isMobile ? "11px" : "13px",
      opacity: 0.65,
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
      maxWidth: isMobile ? "120px" : "200px",
    }),
    [isMobile]
  );

  const menuButtonStyle = useMemo(
    () => ({
      background: theme.surface2,
      border: `1px solid ${theme.border}`,
      color: theme.text,
      padding: isMobile ? "7px 10px" : "8px 14px",
      borderRadius: "10px",
      cursor: "pointer",
      fontSize: isMobile ? "16px" : "15px",
      display: "flex",
      alignItems: "center",
      gap: "6px",
      fontWeight: "500",
      whiteSpace: "nowrap",
      // ✅ هدف لمس مريح على الموبايل
      minHeight: isMobile ? "40px" : "auto",
    }),
    [theme.surface2, theme.border, theme.text, isMobile]
  );

  // ===== ✅ القائمة المنسدلة (على اليسار) =====
  const dropdownStyle = useMemo(
    () => ({
      // ✅ على الموبايل: fixed بدل absolute (يمنع الخروج عن الشاشة)
      position: isMobile ? "fixed" : "absolute",
      // ✅ على الموبايل: من أعلى الشاشة بمسافة تناسب ارتفاع الهيدر
      top: isMobile ? "58px" : "48px",
      // ✅ على الموبايل: 8px من يسار الشاشة
      left: isMobile ? "8px" : "0",
      // ✅ على الموبايل: لا نحتاج right
      right: isMobile ? "auto" : "auto",
      background: theme.surface2,
      border: `1px solid ${theme.border}`,
      borderRadius: "12px",
      padding: "8px",
      // ✅ على الموبايل: عرض محدود بعدم تجاوز عرض الشاشة
      minWidth: isMobile ? "min(220px, calc(100vw - 16px))" : "200px",
      maxWidth: isMobile ? "calc(100vw - 16px)" : "none",
      zIndex: 201,
      boxShadow: "0 12px 32px rgba(0,0,0,0.25)",
    }),
    [theme.surface2, theme.border, isMobile]
  );

  // ===== ✅ Toggle handlers (useCallback) =====
  const toggleMenu = useCallback(() => setShowMenu((v) => !v), []);
  const closeMenu = useCallback(() => setShowMenu(false), []);

  const handleToggleTheme = useCallback(() => {
    const next = !darkMode;
    setDarkMode(next);
    // ✅ fix: خزّن string بدل boolean (متوافق مع useState الأولي)
    localStorage.setItem("adminDarkMode", String(next));
    setShowMenu(false);
  }, [darkMode, setDarkMode]);

  const handleOpenChat = useCallback(() => {
    window.location.href = "/?chat";
    setShowMenu(false);
  }, []);

  const handleShowExport = useCallback(() => {
    onShowExport();
    setShowMenu(false);
  }, [onShowExport]);

  const handleExportKeys = useCallback(() => {
    exportKeysToCSV();
    setShowMenu(false);
  }, [exportKeysToCSV]);

  const handleLogout = useCallback(() => {
    onLogout();
    setShowMenu(false);
  }, [onLogout]);

  return (
    <div style={headerStyle}>
      {/* ===== Left: Logo + Title ===== */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: isMobile ? "8px" : "12px",
          minWidth: 0,
          flex: 1,
        }}
      >
        <span style={logoStyle}>🖤</span>
        <div style={{ minWidth: 0, overflow: "hidden" }}>
          <div style={titleStyle}>لوحة التحكم</div>
          <div style={subtitleStyle}>
            👑 {user.name || user.email}
          </div>
        </div>
      </div>

      {/* ===== Right: Menu Button ===== */}
      <div style={{ position: "relative", flexShrink: 0 }}>
        <button onClick={toggleMenu} style={menuButtonStyle}>
          ☰{!isMobile && " القائمة"}
        </button>

        {showMenu && (
          <>
            {/* Backdrop */}
            <div
              onClick={closeMenu}
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 200,
              }}
            />

            {/* Dropdown */}
            <div style={dropdownStyle}>
              <MenuItem
                icon={darkMode ? "☀️" : "🌙"}
                label={darkMode ? "الوضع النهاري" : "الوضع الليلي"}
                theme={theme}
                isMobile={isMobile}
                onClick={handleToggleTheme}
              />
              <MenuItem
                icon="🖤"
                label="فتح الشات"
                theme={theme}
                isMobile={isMobile}
                onClick={handleOpenChat}
              />
              <MenuItem
                icon="📥"
                label="تصدير البيانات"
                theme={theme}
                isMobile={isMobile}
                onClick={handleShowExport}
              />
              <MenuItem
                icon="🔑"
                label="تصدير المفاتيح"
                theme={theme}
                isMobile={isMobile}
                onClick={handleExportKeys}
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
                isMobile={isMobile}
                color="#f87171"
                onClick={handleLogout}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================
//  MenuItem
// ============================================================
function MenuItem({ icon, label, theme, onClick, color, isMobile = false }) {
  const [hover, setHover] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: "100%",
        textAlign: "right",
        background: hover ? theme.rowHover : "transparent",
        border: "none",
        color: color || theme.text,
        padding: isMobile ? "11px 12px" : "10px 12px",
        borderRadius: "8px",
        cursor: "pointer",
        fontSize: "14px",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        fontFamily: "inherit",
        transition: "background 0.15s",
        minHeight: isMobile ? "44px" : "auto",
      }}
    >
      <span style={{ fontSize: "16px" }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}
