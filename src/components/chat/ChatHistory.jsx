import { formatDate } from "../../utils/helpers";

export default function ChatHistory({ chats = [], currentChatId, onClose, onOpenChat, onDeleteChat, onNewChat, isOpen = false }) {
  return (
    <>
      {isOpen && <button className="sidebar-scrim" onClick={onClose} aria-label="إغلاق القائمة" />}
      <aside className={`history-panel app-sidebar ${isOpen ? "sidebar-open" : ""}`} dir="rtl">
        <div className="sidebar-brand">
          <div className="sidebar-logo">B.</div>
          <div><strong>BLAK</strong><small>مساحة الذكاء الاصطناعي</small></div>
          <button className="sidebar-close" onClick={onClose} aria-label="إغلاق">×</button>
        </div>
        <button className="sidebar-new-chat" onClick={onNewChat}><span>＋</span> محادثة جديدة <kbd>⌘ K</kbd></button>
        <div className="sidebar-section-label">مساحة العمل</div>
        <button className="sidebar-nav-item active"><span>✧</span> المحادثة</button>
        <div className="sidebar-history-head"><span>محادثاتك</span><span>{chats.length}</span></div>
        <div className="sidebar-chat-list">
          {chats.length === 0 ? <div className="sidebar-empty">ستظهر محادثاتك هنا عند البدء</div> : chats.map((chat) => (
            <div key={chat.id} className={`sidebar-chat ${chat.id === currentChatId ? "selected" : ""}`}>
              <button className="sidebar-chat-open" onClick={() => onOpenChat(chat.id)}>
                <span className="sidebar-chat-icon">◌</span>
                <span className="sidebar-chat-meta"><strong>{chat.title || "محادثة جديدة"}</strong><small>{formatDate(chat.date)}</small></span>
              </button>
              <button className="sidebar-chat-delete" onClick={() => onDeleteChat(chat.id)} title="حذف المحادثة">⋯</button>
            </div>
          ))}
        </div>
        <div className="sidebar-footer">
          <div className="sidebar-footer-mark">✦</div>
          <div><strong>مصمم للأفكار الكبيرة</strong><small>BLAK AI Workspace</small></div>
        </div>
      </aside>
    </>
  );
}
