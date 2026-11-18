
 // ============================================
 // ChatHeader.jsx
 // BLAK — Modern Chat Header
 // ============================================

export default function ChatHeader({
  user,
  loading,
  onToggleHistory,
  onNewChat,
  sidebarCollapsed = false,
}) {
  return (
    <header className="header">
      <div className="header-left">
        <button
          type="button"
          className={`header-btn sidebar-toggle ${
            sidebarCollapsed ? "sidebar-toggle--collapsed" : ""
          }`}
          onClick={onToggleHistory}
          title="القائمة الجانبية"
          aria-label="فتح القائمة الجانبية"
        >
          <span className="header-menu-icon">☰</span>
        </button>

        <div className="avatar" aria-label="BLAK">
          <span>B.</span>
        </div>

        <div className="brand-lockup">
          <div className="header-name">
            <span className="brand-en">BLAK</span>
            <span className="brand-ar">بلاك</span>
          </div>

          <div className={`header-status ${loading ? "is-loading" : ""}`}>
            <span className="status-dot" />
            <span>
              {loading ? "يكتب الآن..." : "مساعدك الذكي"}
            </span>
          </div>
        </div>
      </div>

      <div className="header-right">
        <button
          type="button"
          onClick={onNewChat}
          className="header-btn header-new-chat"
          title="بدء محادثة جديدة"
          aria-label="بدء محادثة جديدة"
        >
          <span className="new-chat-icon">＋</span>
          <span className="new-chat-label">محادثة جديدة</span>
        </button>
      </div>
    </header>
  );
}
