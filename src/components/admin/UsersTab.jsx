// ============================================
// src/components/admin/UsersTab.jsx
// ============================================

import { useState, useEffect } from "react";
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
}) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // كارد المدير
  const adminUser = users.find((u) => u.id === user.id);

  return (
    <>
      {adminUser && (
        <div
          style={{
            background: darkMode
              ? "linear-gradient(135deg, rgba(16,185,129,0.15), rgba(5,150,105,0.1))"
              : "linear-gradient(135deg, rgba(16,185,129,0.08), rgba(5,150,105,0.05))",
            border: `2px solid ${
              darkMode ? "rgba(16,185,129,0.4)" : "rgba(16,185,129,0.25)"
            }`,
            borderRadius: "16px",
            padding: "16px 20px",
            marginBottom: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                width: "52px",
                height: "52px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #10b981, #059669)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "22px",
                flexShrink: 0,
                boxShadow: "0 4px 12px rgba(16,185,129,0.4)",
              }}
            >
              👑
            </div>
            <div>
              <div style={{ fontSize: "18px", fontWeight: "bold" }}>
                {adminUser.name || "المدير"}
              </div>
              <div
                style={{
                  fontSize: "12px",
                  opacity: 0.6,
                  fontFamily: "monospace",
                  wordBreak: "break-all",
                }}
              >
                {adminUser.email}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  marginTop: "4px",
                }}
              >
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: isUserOnline(adminUser.id)
                      ? "#10b981"
                      : "#6b7280",
                    boxShadow: isUserOnline(adminUser.id)
                      ? "0 0 5px #10b981"
                      : "none",
                  }}
                />
                <span
                  style={{
                    fontSize: "12px",
                    color: isUserOnline(adminUser.id)
                      ? "#10b981"
                      : theme.textMuted,
                  }}
                >
                  {isUserOnline(adminUser.id) ? "متصل الآن" : "غير متصل"}
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
          <div style={{ minWidth: "150px" }}>
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
                  fontSize: "15px",
                }}
              >
                ∞
              </span>
            </div>
            <div
              style={{
                fontSize: "14px",
                fontWeight: "bold",
              }}
            >
              {(adminUser.used_today || 0).toLocaleString()} توكن
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          background: theme.surface,
          borderRadius: "16px",
          padding: "16px",
          border: `1px solid ${theme.border}`,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: "12px",
            marginBottom: "16px",
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: "18px" }}>👥 المستخدمين</h2>
            <div
              style={{ fontSize: "13px", opacity: 0.6, marginTop: "2px" }}
            >
              إجمالي: {filteredUsers.length} / {users.length - 1}
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <input
              type="text"
              placeholder="🔍 بحث..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ ...inputStyle, minWidth: "140px" }}
            />
            <button
              onClick={onRefresh}
              style={{
                background: "rgba(16,185,129,0.15)",
                color: "#10b981",
                border: "none",
                padding: "8px 14px",
                borderRadius: "10px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "600",
                fontFamily: "inherit",
              }}
            >
              🔄
            </button>
          </div>
        </div>

        {isMobile ? (
          <div>
            {filteredUsers.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "40px",
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
          <div
            style={{
              overflowX: "auto",
              overflowY: "auto",
              WebkitOverflowScrolling: "touch",
              maxHeight: "70vh",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: "700px",
              }}
            >
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
                    <th
                      key={h}
                      style={{
                        padding: "12px 10px",
                        textAlign: "right",
                        fontSize: "14px",
                        fontWeight: "600",
                        color: darkMode ? "#6ee7b7" : "#059669",
                        whiteSpace: "nowrap",
                      }}
                    >
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
                        padding: "40px",
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
