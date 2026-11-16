import { formatDate, getUsagePercent, getUsageColor } from "../../utils/helpers";
import { getEffectiveUsedToday } from "../../utils/validators";

export default function ChatHistory({
  chats = [], currentChatId, onClose, onOpenChat, onDeleteChat, onNewChat,
  isOpen = false, user, isDark = true, onOpenSettings, onToggleTheme, onLogout,
}) {
  const usedToday = getEffectiveUsedToday(user);
  const dailyLimit = user?.daily_limit || 5000;
  const percent = getUsagePercent(usedToday, dailyLimit);
  const remaining = Math.max(0, dailyLimit - usedToday);
  const usageColor = getUsageColor(percent);

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
        <div className="sidebar-nav-item active"><span>✧</span> المحادثة</div>
        <div className="sidebar-history-head"><span>سجل المحادثات</span><span>{chats.length}</span></div>

        <div className="sidebar-chat-list">
          {chats.length === 0 ? <div className="sidebar-empty">ستظهر محادثاتك هنا عند البدء</div> : chats.map((chat) => (
            <div key={chat.id} className={`sidebar-chat ${chat.id === currentChatId ? "selected" : ""}`}>
              <button className="sidebar-chat-open" onClick={() => onOpenChat(chat.id)}>
                <span className="sidebar-chat-icon">◌</span>
                <span className="sidebar-chat-meta"><strong>{chat.title || "محادثة جديدة"}</strong><small>{formatDate(chat.date)}</small></span>
              </button>
              <button className="sidebar-chat-delete" onClick={() => onDeleteChat(chat.id)} title="حذف المحادثة" aria-label="حذف المحادثة">⋯</button>
            </div>
          ))}
        </div>

        <div className="sidebar-account-section">
          <div className="sidebar-usage">
            <div className="sidebar-usage-top"><strong>استهلاك اليوم</strong><span>{Math.floor(percent)}%</span></div>
            <div className="sidebar-usage-track"><span style={{ width: `${Math.min(100, percent)}%`, background: usageColor }} /></div>
            <small>متبقي {remaining.toLocaleString()} من {dailyLimit.toLocaleString()} توكن</small>
          </div>
          <button className="sidebar-action" onClick={onOpenSettings}><span>⚙</span> الإعدادات</button>
          <button className="sidebar-action" onClick={onToggleTheme}><span>{isDark ? "☀" : "☾"}</span> {isDark ? "الوضع النهاري" : "الوضع الليلي"}</button>
          <button className="sidebar-action sidebar-logout" onClick={onLogout}><span>↪</span> تسجيل الخروج</button>
        </div>
        <div className="sidebar-footer">
          <div className="sidebar-footer-mark">✦</div>
          <div><strong>مصمم للأفكار الكبيرة</strong><small>BLAK AI Workspace</small></div>
        </div>
      </aside>
    </>
  );
}
