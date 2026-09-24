// ============================================
// src/components/admin/UsersTab.jsx
// ============================================

import {
  getUsagePercent,
  getUsageColor,
} from "../../utils/helpers";
import {
  PERSONALITY_LABELS,
  DEFAULT_PERSONALITY,
} from "../../config/personalities";

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
  return (
    <>
      {/* كارد المدير */}
      {(() => {
        const adminUser = users.find((u) => u.id === user.id);
        if (!adminUser) return null;
        const used = adminUser.used_today || 0;
        const online = isUserOnline(adminUser.id);
        return (
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
                <div style={{ fontSize: "20px", fontWeight: "bold" }}>
                  {adminUser.name || "المدير"}
                </div>
                <div
                  style={{
                    fontSize: "13px",
                    opacity: 0.6,
                    fontFamily: "monospace",
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
                      background: online ? "#4ade80" : "#6b7280",
                      boxShadow: online ? "0 0 5px #4ade80" : "none",
                    }}
                  />
                  <span
                    style={{
                      fontSize: "13px",
                      color: online ? "#4ade80" : theme.textMuted,
                    }}
                  >
                    {online ? "متصل الآن" : "غير متصل"}
                  </span>
                  <span
                    style={{
                      fontSize: "13px",
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
            <div style={{ minWidth: "180px" }}>
              <div
                style={{
                  fontSize: "13px",
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
                    fontSize: "16px",
                  }}
                >
                  ∞ غير محدود
                </span>
              </div>
              <div
                style={{
                  fontSize: "15px",
                  fontWeight: "bold",
                  color: darkMode ? "#e0e0e0" : "#1e1b4b",
                }}
              >
                {used.toLocaleString()} توكن
              </div>
            </div>
          </div>
        );
      })()}

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
            <h2 style={{ margin: 0, fontSize: "20px" }}>👥 قائمة المستخدمين</h2>
            <div style={{ fontSize: "14px", opacity: 0.6, marginTop: "2px" }}>
              إجمالي: {filteredUsers.length} / {users.length - 1}
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <input
              type="text"
              placeholder="🔍 بحث..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ ...inputStyle, minWidth: "160px" }}
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
              🔄 تحديث
            </button>
          </div>
        </div>

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
              minWidth: "650px",
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
                filteredUsers.map((u) => {
                  const used = u.used_today || 0;
                  const limit = u.daily_limit || 5000;
                  const percent = getUsagePercent(used, limit);
                  const color = getUsageColor(percent);
                  const online = isUserOnline(u.id);
                  return (
                    <tr
                      key={u.id}
                      style={{ borderBottom: `1px solid ${theme.border}` }}
                    >
                      <td style={{ padding: "12px 10px" }}>
                        <strong style={{ fontSize: "16px" }}>
                          {u.name || "مستخدم"}
                        </strong>
                        <br />
                        <span
                          style={{
                            fontFamily: "monospace",
                            fontSize: "12px",
                            opacity: 0.5,
                          }}
                        >
                          {u.email}
                        </span>
                      </td>
                      <td style={{ padding: "12px 10px" }}>
                        <div style={{ minWidth: "140px" }}>
                          <div style={{ fontSize: "13px", marginBottom: "4px" }}>
                            {used.toLocaleString()} / {limit.toLocaleString()}
                          </div>
                          <div
                            style={{
                              width: "100%",
                              height: "4px",
                              background: theme.barBg,
                              borderRadius: "2px",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                width: percent + "%",
                                height: "100%",
                                background: color,
                                transition: "width 0.3s",
                              }}
                            />
                          </div>
                          <div
                            style={{
                              fontSize: "12px",
                              opacity: 0.6,
                              marginTop: "2px",
                            }}
                          >
                            {percent.toFixed(0)}%
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "12px 10px" }}>
                        <select
                          value={u.personality || DEFAULT_PERSONALITY}
                          onChange={(e) =>
                            changePersonality(u.id, e.target.value)
                          }
                          style={{
                            background: theme.inputBg,
                            color: theme.text,
                            border: `1px solid ${theme.border}`,
                            borderRadius: "6px",
                            padding: "6px 10px",
                            fontSize: "13px",
                            cursor: "pointer",
                            fontFamily: "inherit",
                          }}
                        >
                          {Object.entries(PERSONALITY_LABELS).map(
                            ([key, label]) => (
                              <option
                                key={key}
                                value={key}
                                style={{ background: theme.surface }}
                              >
                                {label}
                              </option>
                            )
                          )}
                        </select>
                      </td>
                      <td style={{ padding: "12px 10px" }}>
                        <span
                          style={{
                            padding: "4px 12px",
                            borderRadius: "20px",
                            fontSize: "13px",
                            fontWeight: "600",
                            background: u.is_blocked
                              ? "rgba(239,68,68,0.15)"
                              : "rgba(16,185,129,0.15)",
                            color: u.is_blocked ? "#ef4444" : "#10b981",
                          }}
                        >
                          {u.is_blocked ? "محظور" : "نشط"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 10px" }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <div
                            style={{
                              width: "10px",
                              height: "10px",
                              borderRadius: "50%",
                              background: online ? "#10b981" : "#6b7280",
                              boxShadow: online ? "0 0 5px #10b981" : "none",
                            }}
                          />
                          <span style={{ fontSize: "13px" }}>
                            {online ? "متصل" : "غير متصل"}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: "12px 10px" }}>
                        <div
                          style={{
                            display: "flex",
                            gap: "6px",
                            flexWrap: "wrap",
                          }}
                        >
                          <button
                            onClick={() => onEditUser(u)}
                            style={{
                              background: "rgba(245,158,11,0.15)",
                              color: "#f59e0b",
                              border: "none",
                              padding: "6px 12px",
                              borderRadius: "8px",
                              cursor: "pointer",
                              fontSize: "13px",
                            }}
                            title="تعديل"
                          >
                            ⚙️
                          </button>
                          <button
                            onClick={() => toggleUserBlock(u.id, u.is_blocked)}
                            style={{
                              background: u.is_blocked
                                ? "rgba(16,185,129,0.15)"
                                : "rgba(239,68,68,0.15)",
                              color: u.is_blocked ? "#10b981" : "#ef4444",
                              border: "none",
                              padding: "6px 12px",
                              borderRadius: "8px",
                              cursor: "pointer",
                              fontSize: "12px",
                              fontWeight: "600",
                              fontFamily: "inherit",
                            }}
                          >
                            {u.is_blocked ? "فك الحظر" : "حظر"}
                          </button>
                          <button
                            onClick={() => deleteUser(u.id, u.name || u.email)}
                            style={{
                              background: "rgba(239,68,68,0.15)",
                              color: "#ef4444",
                              border: "none",
                              padding: "6px 12px",
                              borderRadius: "8px",
                              cursor: "pointer",
                              fontSize: "13px",
                            }}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
