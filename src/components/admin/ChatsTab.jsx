// ============================================
// src/components/admin/ChatsTab.jsx
// ============================================

import { useState, useEffect } from "react";
import ChatsMobileCard from "./ChatsMobileCard";

export default function ChatsTab({
  allChats,
  filteredChats,
  users,
  chatFilterUser,
  setChatFilterUser,
  chatFilterDate,
  setChatFilterDate,
  chatSearchTerm,
  setChatSearchTerm,
  theme,
  darkMode,
  inputStyle,
  formatDate,
  getUserById,
  onRefresh,
  onOpenChat,
  onDeleteChat,
  onDeleteAll,
}) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
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
          <h2 style={{ margin: 0, fontSize: "18px" }}>💬 المحادثات</h2>
          <div style={{ fontSize: "13px", opacity: 0.6 }}>
            معروض: {filteredChats.length} / {allChats.length}
          </div>
        </div>
      </div>

      {/* الفلاتر */}
      <div
        style={{
          display: "flex",
          gap: "6px",
          flexWrap: "wrap",
          marginBottom: "16px",
        }}
      >
        <select
          value={chatFilterUser}
          onChange={(e) => setChatFilterUser(e.target.value)}
          style={{ ...inputStyle, flex: 1, minWidth: "120px" }}
        >
          <option value="">👥 الكل</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name || u.email?.split("@")[0]}
            </option>
          ))}
        </select>
        <select
          value={chatFilterDate}
          onChange={(e) => setChatFilterDate(e.target.value)}
          style={{ ...inputStyle, flex: 1, minWidth: "100px" }}
        >
          <option value="all">📅 الكل</option>
          <option value="today">اليوم</option>
          <option value="week">الأسبوع</option>
          <option value="month">الشهر</option>
        </select>
        <input
          type="text"
          placeholder="🔍 بحث..."
          value={chatSearchTerm}
          onChange={(e) => setChatSearchTerm(e.target.value)}
          style={{ ...inputStyle, flex: 1, minWidth: "120px" }}
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
            fontFamily: "inherit",
          }}
        >
          🔄
        </button>
        <button
          onClick={onDeleteAll}
          style={{
            background: "rgba(239,68,68,0.15)",
            color: "#ef4444",
            border: "none",
            padding: "8px 14px",
            borderRadius: "10px",
            cursor: "pointer",
            fontSize: "13px",
            fontWeight: "600",
            fontFamily: "inherit",
          }}
        >
          🗑️ الكل
        </button>
      </div>

      {isMobile ? (
        <div>
          {filteredChats.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px",
                opacity: 0.5,
              }}
            >
              لا توجد محادثات
            </div>
          ) : (
            filteredChats.map((chat) => (
              <ChatsMobileCard
                key={chat.id}
                chat={chat}
                chatUser={getUserById(chat.user_id)}
                theme={theme}
                formatDate={formatDate}
                onOpenChat={onOpenChat}
                onDeleteChat={onDeleteChat}
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
              minWidth: "600px",
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
                  "العنوان",
                  "الرسائل",
                  "آخر تحديث",
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
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredChats.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    style={{
                      textAlign: "center",
                      padding: "40px",
                      opacity: 0.5,
                    }}
                  >
                    لا توجد محادثات
                  </td>
                </tr>
              ) : (
                filteredChats.map((chat) => {
                  const chatUser = getUserById(chat.user_id);
                  return (
                    <tr
                      key={chat.id}
                      style={{ borderBottom: `1px solid ${theme.border}` }}
                    >
                      <td style={{ padding: "12px 10px" }}>
                        <strong style={{ fontSize: "14px" }}>
                          {chatUser?.name || "محذوف"}
                        </strong>
                        <br />
                        <span style={{ fontSize: "12px", opacity: 0.5 }}>
                          {chatUser?.email?.slice(0, 20) ||
                            chat.user_id?.slice(0, 8)}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "12px 10px",
                          maxWidth: "180px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          fontSize: "13px",
                        }}
                      >
                        {chat.title || "بدون عنوان"}
                      </td>
                      <td
                        style={{
                          padding: "12px 10px",
                          textAlign: "center",
                        }}
                      >
                        <span
                          style={{
                            background: "rgba(16,185,129,0.15)",
                            color: "#10b981",
                            padding: "4px 12px",
                            borderRadius: "20px",
                            fontSize: "12px",
                            fontWeight: "600",
                          }}
                        >
                          {chat.messages?.length || 0}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "12px 10px",
                          fontSize: "12px",
                          opacity: 0.7,
                        }}
                      >
                        {formatDate(chat.updated_at)}
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
                            onClick={() => onOpenChat(chat)}
                            style={{
                              background: "rgba(59,130,246,0.15)",
                              color: "#3b82f6",
                              border: "none",
                              padding: "6px 12px",
                              borderRadius: "8px",
                              cursor: "pointer",
                              fontSize: "12px",
                              fontWeight: "600",
                              fontFamily: "inherit",
                            }}
                          >
                            👁️
                          </button>
                          <button
                            onClick={() => onDeleteChat(chat.id)}
                            style={{
                              background: "rgba(239,68,68,0.15)",
                              color: "#ef4444",
                              border: "none",
                              padding: "6px 12px",
                              borderRadius: "8px",
                              cursor: "pointer",
                              fontSize: "12px",
                              fontWeight: "600",
                              fontFamily: "inherit",
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
      )}
    </div>
  );
}
