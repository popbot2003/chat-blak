// ============================================
// ChatHeader.jsx
// رأس الشات — الاسم + الحالة + الأزرار
// ============================================

export default function ChatHeader({
  user,
  loading,
  isAdmin,
  showMenu,
  onToggleMenu,
  onNewChat,
  onGoToAdmin,
}) {
  return (
    <div className="header">
      <div className="header-left">
        <div className="avatar">🖤</div>
        <div>
          <div className="header-name">بلاك</div>
          <div className="header-status">
            <span className="status-dot" />
            {loading ? "بيكتب..." : "متصل"}
          </div>
        </div>
      </div>

      <div className="header-right">
        {isAdmin && (
          <button
            onClick={onGoToAdmin}
            className="header-btn"
            style={{ fontSize: "14px" }}
          >
            ← لوحة التحكم
          </button>
        )}

        <button
          onClick={onNewChat}
          className="header-btn"
          style={{ fontSize: "20px" }}
          title="محادثة جديدة"
        >
          ➕
        </button>

        <button
          onClick={onToggleMenu}
          className="header-btn"
          style={{ fontSize: "22px" }}
        >
          {showMenu ? "✕" : "☰"}
        </button>
      </div>
    </div>
  );
}
