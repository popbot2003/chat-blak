// ============================================
// src/components/admin/ChatsTab.jsx — Responsive
// متوافق مع:
//   - src/config/breakpoints.js
//   - src/hooks/useMediaQuery.js
//   - src/App.css (media queries موحّدة)
// ============================================

import { useMemo, useCallback } from "react";
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
  // ✅ جديد: coming from Admin.jsx
  isMobile = false,
  isTablet = false,
}) {
  // ===== ✅ أنماط الحاوية =====
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
      gap: isMobile ? "8px" : "12px",
      marginBottom: isMobile ? "12px" : "16px",
    }),
    [isMobile]
  );

  const titleStyle = useMemo(
    () => ({
      margin: 0,
      fontSize: isMobile ? "16px" : "18px",
    }),
    [isMobile]
  );

  const subtitleStyle = useMemo(
    () => ({
      fontSize: isMobile ? "12px" : "13px",
      opacity: 0.6,
    }),
    [isMobile]
  );

  // ✅ الفلاتر: على الموبايل → عمود واحد
  //              على الديسكتوب → صف واحد مع wrap
  const filtersRowStyle = useMemo(
    () => ({
      display: "flex",
      gap: isMobile ? "8px" : "6px",
      flexWrap: "wrap",
      flexDirection: isMobile ? "column" : "row",
      marginBottom: isMobile ? "12px" : "16px",
    }),
    [isMobile]
  );

  // ✅ على الموبايل: كل عنصر بعرض كامل
  const filterControlStyle = useMemo(
    () => ({
      ...inputStyle,
      flex: isMobile ? "initial" : 1,
      width: isMobile ? "100%" : "auto",
      minWidth: isMobile ? "0" : "120px",
    }),
    [inputStyle, isMobile]
  );

  // ✅ صف الأزرار (تحديث + حذف الكل)
  const buttonsRowStyle = useMemo(
    () => ({
      display: "flex",
      gap: isMobile ? "8px" : "6px",
      flexDirection: isMobile ? "row" : "row",
      width: isMobile ? "100%" : "auto",
    }),
    [isMobile]
  );

  const refreshBtnStyle = useMemo(
    () => ({
      background: "rgba(16,185,129,0.15)",
      color: "#10b981",
      border: "none",
      padding: isMobile ? "10px 14px" : "8px 14px",
      borderRadius: "10px",
      cursor: "pointer",
      fontSize: "14px",
      fontFamily: "inherit",
      flex: isMobile ? 1 : "initial",
      minHeight: isMobile ? "40px" : "auto",
    }),
    [isMobile]
  );

  const deleteAllBtnStyle = useMemo(
    () => ({
      background: "rgba(239,68,68,0.15)",
      color: "#ef4444",
      border: "none",
      padding: isMobile ? "10px 14px" : "8px 14px",
      borderRadius: "10px",
      cursor: "pointer",
      fontSize: isMobile ? "13px" : "13px",
      fontWeight: "600",
      fontFamily: "inherit",
      flex: isMobile ? 1 : "initial",
      minHeight: isMobile ? "40px" : "auto",
      whiteSpace: "nowrap",
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

  const tableStyle = useMemo(
    () => ({
      width: "100%",
      borderCollapse: "collapse",
      minWidth: isTablet ? "560px" : "600px",
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
    }),
    [darkMode, isMobile]
  );

  // ===== ✅ Handlers =====
  const handleRefresh = useCallback(() => {
    if (typeof onRefresh === "function") onRefresh();
  }, [onRefresh]);

  const handleDeleteAll = useCallback(() => {
    if (typeof onDeleteAll === "function") onDeleteAll();
  }, [onDeleteAll]);

  const handleUserFilterChange = useCallback(
    (e) => setChatFilterUser(e.target.value),
    [setChatFilterUser]
  );

  const handleDateFilterChange = useCallback(
    (e) => setChatFilterDate(e.target.value),
    [setChatFilterDate]
  );

  const handleSearchChange = useCallback(
    (e) => setChatSearchTerm(e.target.value),
    [setChatSearchTerm]
  );

  // ===== JSX =====
  return (
    <div style={containerStyle}>
      {/* ===== الرأس ===== */}
      <div style={headerStyle}>
        <div>
          <h2 style={titleStyle}>💬 المحادثات</h2>
          <div style={subtitleStyle}>
            معروض: {filteredChats.length} / {allChats.length}
          </div>
        </div>
      </div>

      {/* ===== الفلاتر ===== */}
      <div style={filtersRowStyle}>
        <select
          value={chatFilterUser}
          onChange={handleUserFilterChange}
          style={filterControlStyle}
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
          onChange={handleDateFilterChange}
          style={filterControlStyle}
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
          onChange={handleSearchChange}
          style={filterControlStyle}
        />

        {/* ✅ صف الأزرار: على الموبايل → تحت بعض في صف أفقي */}
        <div style={buttonsRowStyle}>
          <button onClick={handleRefresh} style={refreshBtnStyle}>
            🔄
          </button>
          <button onClick={handleDeleteAll} style={deleteAllBtnStyle}>
            🗑️ الكل
          </button>
        </div>
      </div>

      {/* ===== العرض: موبايل vs ديسكتوب ===== */}
      {isMobile ? (
        <div>
          {filteredChats.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px 20px",
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
                  "العنوان",
                  "الرسائل",
                  "آخر تحديث",
                  "الإجراءات",
                ].map((h) => (
                  <th key={h} style={thStyle}>
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
                      padding: "40px 20px",
                      opacity: 0.5,
                    }}
                  >
                    لا توجد محادثات
                  </td>
                </tr>
              ) : (
                filteredChats.map((chat) => (
                  <ChatRow
                    key={chat.id}
                    chat={chat}
                    chatUser={getUserById(chat.user_id)}
                    theme={theme}
                    formatDate={formatDate}
                    onOpenChat={onOpenChat}
                    onDeleteChat={onDeleteChat}
                    isMobile={isMobile}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============================================================
//  ChatRow — صف جدول منفصل لتحسين الأداء
// ============================================================
function ChatRow({
  chat,
  chatUser,
  theme,
  formatDate,
  onOpenChat,
  onDeleteChat,
  isMobile = false,
}) {
  const [hover, setHover] = useState(false);

  return (
    <tr
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        borderBottom: `1px solid ${theme.border}`,
        background: hover ? theme.rowHover : "transparent",
        transition: "background 0.15s",
      }}
    >
      <td style={{ padding: "12px 10px" }}>
        <strong style={{ fontSize: "14px" }}>
          {chatUser?.name || "محذوف"}
        </strong>
        <br />
        <span style={{ fontSize: "12px", opacity: 0.5 }}>
          {chatUser?.email?.slice(0, 20) || chat.user_id?.slice(0, 8)}
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

      <td style={{ padding: "12px 10px", textAlign: "center" }}>
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

      <td style={{ padding: "12px 10px", fontSize: "12px", opacity: 0.7 }}>
        {formatDate(chat.updated_at)}
      </td>

      <td style={{ padding: "12px 10px" }}>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
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
}
