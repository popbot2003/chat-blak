// ============================================
// src/components/admin/ChatsTab.jsx
// ============================================

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
          <h2 style={{ margin: 0, fontSize: "20px" }}>💬 سجل المحادثات</h2>
          <div style={{ fontSize: "14px", opacity: 0.6 }}>
            معروض: {filteredChats.length} / {allChats.length}
          </div>
        </div>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          <select
            value={chatFilterUser}
            onChange={(e) => setChatFilterUser(e.target.value)}
            style={{ ...inputStyle, minWidth: "120px" }}
          >
            <option value="">👥 كل المستخدمين</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name || u.email?.split("@")[0]}
              </option>
            ))}
          </select>
          <select
            value={chatFilterDate}
            onChange={(e) => setChatFilterDate(e.target.value)}
            style={inputStyle}
          >
            <option value="all">📅 كل الوقت</option>
            <option value="today">اليوم</option>
            <option value="week">آخر 7 أيام</option>
            <option value="month">هذا الشهر</option>
          </select>
          <input
            type="text"
            placeholder="🔍 بحث..."
            value={chatSearchTerm}
            onChange={(e) => setChatSearchTerm(e.target.value)}
            style={{ ...inputStyle, minWidth: "140px" }}
          />
          <button
            onClick={onRefresh}
            style={{
              background: "rgba(16,185,129,0.15)",
              color: "#10b981",
              border: "none",
              padding: "8px 12px",
              borderRadius: "10px",
              cursor: "pointer",
              fontSize: "14px",
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
              padding: "8px 12px",
              borderRadius: "10px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "600",
              fontFamily: "inherit",
            }}
          >
            🗑️ حذف الكل
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
            minWidth: "550px",
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
              {["المستخدم", "العنوان", "الرسائل", "آخر تحديث", "الإجراءات"].map(
                (h) => (
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
                )
              )}
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
                      <strong style={{ fontSize: "15px" }}>
                        {chatUser?.name || "مستخدم محذوف"}
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
                        fontSize: "14px",
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
                          fontSize: "13px",
                          fontWeight: "600",
                        }}
                      >
                        {chat.messages?.length || 0}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "12px 10px",
                        fontSize: "13px",
                        opacity: 0.7,
                      }}
                    >
                      {formatDate(chat.updated_at)}
                    </td>
                    <td style={{ padding: "12px 10px" }}>
                      <div
                        style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}
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
                          👁️ عرض
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
                          🗑️ حذف
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
  );
}
