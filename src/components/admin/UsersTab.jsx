// ============================================
// src/components/admin/UsersTab.jsx — Responsive
// متوافق مع:
//   - src/config/breakpoints.js
//   - src/hooks/useMediaQuery.js
//   - src/App.css (media queries موحّدة)
// ============================================

import { useMemo, useCallback } from "react";
import { getUsagePercent, getUsageColor } from "../../utils/helpers";
import {
  PERSONALITY_LABELS,
  DEFAULT_PERSONALITY,
} from "../../config/personalities";
import UserCard from "./UserCard";
import UsersMobileCard from "./UsersMobileCard";

export default function UsersTab({
  user,
  users,
  filteredUsers,
  searchTerm,
  setSearchTerm,
  theme,
  darkMode,
  inputStyle,
  isUserOnline,
  changePersonality,
  toggleUserBlock,
  deleteUser,
  onEditUser,
  onRefresh,
  // ✅ جديد: coming from Admin.jsx
  isMobile = false,
  isTablet = false,
}) {
  // ===== كارد المدير =====
  const adminUser = useMemo(
    () => users.find((u) => u.id === user.id),
    [users, user.id]
  );

  const adminOnline = useMemo(
    () => (adminUser ? isUserOnline(adminUser.id) : false),
    [adminUser, isUserOnline]
  );

  // ===== ✅ أنماط كارت الأدمن (متجاوبة) =====
  const adminCardStyle = useMemo(
    () => ({
      background: darkMode
        ? "linear-gradient(135deg, rgba(16,185,129,0.15), rgba(5,150,105,0.1))"
        : "linear-gradient(135deg, rgba(16,185,129,0.08), rgba(5,150,105,0.05))",
      border: `2px solid ${
        darkMode ? "rgba(16,185,129,0.4)" : "rgba(16,185,129,0.25)"
      }`,
      borderRadius: "16px",
      padding: isMobile ? "12px 14px" : "16px 20px",
      marginBottom: "12px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      flexWrap: isMobile ? "wrap" : "wrap",
      gap: isMobile ? "10px" : "12px",
    }),
    [darkMode, isMobile]
  );

  const adminAvatarStyle = useMemo(
    () => ({
      width: isMobile ? "42px" : "52px",
      height: isMobile ? "42px" : "52px",
      borderRadius: "50%",
      background: "linear-gradient(135deg, #10b981, #059669)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: isMobile ? "18px" : "22px",
      flexShrink: 0,
      boxShadow: "0 4px 12px rgba(16,185,129,0.4)",
    }),
    [isMobile]
  );

  const adminNameStyle = useMemo(
    () => ({
      fontSize: isMobile ? "15px" : "18px",
      fontWeight: "bold",
    }),
    [isMobile]
  );

  const adminEmailStyle = useMemo(
    () => ({
      fontSize: isMobile ? "11px" : "12px",
      opacity: 0.6,
      fontFamily: "monospace",
      wordBreak: "break-all",
    }),
    [isMobile]
  );

  const adminUsageBlockStyle = useMemo(
    () => ({
      minWidth: isMobile ? "100%" : "150px",
      marginTop: isMobile ? "4px" : 0,
    }),
    [isMobile]
  );

  // ===== ✅ أنماط الحاوية الرئيسية =====
  const containerStyle = useMemo(
    () => ({
      background: theme.surface,
      borderRadius: "16px",
      padding: isMobile ? "12px" : "16px",
      border: `1px solid ${theme.border}`,
    }),
    [theme.surface, theme.border, isMobile]
  );

  const headerStyle = useMemo(
    () => ({
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      flexDirection: isMobile ? "column" : "row",
      flexWrap: "wrap",
      gap: isMobile ? "10px" : "12px",
      marginBottom: isMobile ? "12px" : "16px",
    }),
    [isMobile]
  );

  const controlsStyle = useMemo(
    () => ({
      display: "flex",
      gap: "8px",
      flexWrap: "wrap",
      width: isMobile ? "100%" : "auto",
    }),
    [isMobile]
  );

  // ✅ على الموبايل: البحث يأخذ كامل العرض
  const searchInputStyle = useMemo(
    () => ({
      ...inputStyle,
      minWidth: isMobile ? "0" : "140px",
      flex: isMobile ? 1 : "initial",
      width: isMobile ? "100%" : "auto",
    }),
    [inputStyle, isMobile]
  );

  const refreshBtnStyle = useMemo(
    () => ({
      background: "rgba(16,185,129,0.15)",
      color: "#10b981",
      border: "none",
      padding: isMobile ? "8px 12px" : "8px 14px",
      borderRadius: "10px",
      cursor: "pointer",
      fontSize: "14px",
      fontWeight: "600",
      fontFamily: "inherit",
      flexShrink: 0,
      minWidth: isMobile ? "44px" : "auto",
      minHeight: isMobile ? "40px" : "auto",
    }),
    [isMobile]
  );

  const tableWrapperStyle = useMemo(
    () => ({
      overflowX: "auto",
      overflowY: "auto",
      WebkitOverflowScrolling: "touch",
      maxHeight: isMobile ? "60vh" : "70vh",
    }),
    [isMobile]
  );

  // ✅ على التابلت: minWidth أصغر قليلًا
  const tableStyle = useMemo(
    () => ({
      width: "100%",
      borderCollapse: "collapse",
      minWidth: isTablet ? "640px" : "700px",
      fontSize: isMobile ? "13px" : "14px",
    }),
    [isTablet, isMobile]
  );

  const thStyle = useMemo(
    () => ({
      padding: isMobile ? "10px 8px" : "12px 10px",
      textAlign: "right",
      fontSize: isMobile ? "12px" : "14px",
      fontWeight: "600",
      color: darkMode ? "#6ee7b7" : "#059669",
      whiteSpace: "nowrap",
    }),
    [darkMode, isMobile]
  );

  // ===== ✅ Handlers (useCallback) =====
  const handleSearchChange = useCallback(
    (e) => setSearchTerm(e.target.value),
    [setSearchTerm]
  );

  const handleRefresh = useCallback(() => {
    if (typeof onRefresh === "function") onRefresh();
  }, [onRefresh]);

  // ===== JSX =====
  return (
    <>
      {/* ===== كارد المدير ===== */}
      {adminUser && (
        <div style={adminCardStyle}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: isMobile ? "10px" : "14px",
              minWidth: 0,
            }}
          >
            <div style={adminAvatarStyle}>👑</div>
            <div style={{ minWidth: 0 }}>
              <div style={adminNameStyle}>
                {adminUser.name || "المدير"}
              </div>
              <div style={adminEmailStyle}>{adminUser.email}</div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  marginTop: "4px",
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: adminOnline ? "#10b981" : "#6b7280",
                    boxShadow: adminOnline ? "0 0 5px #10b981" : "none",
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: "12px",
                    color: adminOnline ? "#10b981" : theme.textMuted,
                  }}
                >
                  {adminOnline ? "متصل الآن" : "غير متصل"}
                </span>
                <span
                  style={{
                    fontSize: "12px",
                    color: "#10b981",
                    fontWeight: "bold",
                    marginRight: "6px",
                  }}
                >
                  • مدير النظام
                </span>
              </div>
            </div>
          </div>

          <div style={adminUsageBlockStyle}>
            <div
              style={{
                fontSize: "12px",
                marginBottom: "6px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>استهلاك اليوم</span>
              <span
                style={{
                  fontWeight: "bold",
                  color: "#10b981",
                  fontSize: isMobile ? "14px" : "15px",
                }}
              >
                ∞
              </span>
            </div>
            <div
              style={{
                fontSize: isMobile ? "13px" : "14px",
                fontWeight: "bold",
              }}
            >
              {(adminUser.used_today || 0).toLocaleString()} توكن
            </div>
          </div>
        </div>
      )}

      {/* ===== الحاوية الرئيسية ===== */}
      <div style={containerStyle}>
        {/* ===== Header + Search ===== */}
        <div style={headerStyle}>
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: isMobile ? "16px" : "18px",
              }}
            >
              👥 المستخدمين
            </h2>
            <div
              style={{
                fontSize: isMobile ? "12px" : "13px",
                opacity: 0.6,
                marginTop: "2px",
              }}
            >
              إجمالي: {filteredUsers.length} / {users.length - 1}
            </div>
          </div>

          <div style={controlsStyle}>
            <input
              type="text"
              placeholder="🔍 بحث..."
              value={searchTerm}
              onChange={handleSearchChange}
              style={searchInputStyle}
            />
            <button onClick={handleRefresh} style={refreshBtnStyle}>
              🔄
            </button>
          </div>
        </div>

        {/* ===== المحتوى: موبايل vs ديسكتوب ===== */}
        {isMobile ? (
          <div>
            {filteredUsers.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "40px 20px",
                  opacity: 0.5,
                }}
              >
                لا توجد نتائج
              </div>
            ) : (
              filteredUsers.map((u) => (
                <UsersMobileCard
                  key={u.id}
                  u={u}
                  theme={theme}
                  online={isUserOnline(u.id)}
                  changePersonality={changePersonality}
                  toggleUserBlock={toggleUserBlock}
                  deleteUser={deleteUser}
                  onEditUser={onEditUser}
                />
              ))
            )}
          </div>
        ) : (
          <div style={tableWrapperStyle}>
            <table style={tableStyle}>
              <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
                <tr
                  style={{
                    background: darkMode
                      ? "rgba(16,185,129,0.08)"
                      : "rgba(16,185,129,0.06)",
                  }}
                >
                  {[
                    "المستخدم",
                    "الاستهلاك",
                    "الشخصية",
                    "الحالة",
                    "الاتصال",
                    "الإجراءات",
                  ].map((h) => (
                    <th key={h} style={thStyle}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan="6"
                      style={{
                        textAlign: "center",
                        padding: "40px 20px",
                        opacity: 0.5,
                      }}
                    >
                      لا توجد نتائج
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <UserCard
                      key={u.id}
                      u={u}
                      theme={theme}
                      online={isUserOnline(u.id)}
                      changePersonality={changePersonality}
                      toggleUserBlock={toggleUserBlock}
                      deleteUser={deleteUser}
                      onEditUser={onEditUser}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
