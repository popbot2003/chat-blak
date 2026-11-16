// ============================================
// ChatHeader.jsx
// رأس الشات — الاسم + الحالة + الأزرار
// ============================================

export default function ChatHeader({
  user,
  loading,
  onToggleHistory,
  onNewChat,
}) {
  return (
    <div className="header">
      <div className="header-left">
        <button className="header-btn sidebar-toggle" onClick={onToggleHistory} title="سجل المحادثات" aria-label="سجل المحادثات">☰</button>
        <div className="avatar" aria-label="BLAK">B.</div>
        <div className="brand-lockup">
          <div className="header-name">BLAK <span className="brand-ar">بلاك</span></div>
          <div className="header-status"><span className="status-dot" />{loading ? "يكتب الآن" : "مساعدك الذكي"}</div>
        </div>
      </div>

      <div className="header-right">
        <button
          onClick={onNewChat}
          className="header-btn"
          title="محادثة جديدة"
          aria-label="محادثة جديدة"
        >
          ＋
        </button>

      </div>
    </div>
  );
}
