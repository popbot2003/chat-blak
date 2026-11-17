
 // ============================================
 // src/components/chat/ChatHistory.jsx
 // BLAK — Sidebar v3.1
 // ✅ البحث في المحادثات
 // ✅ تبويب المحادثات والأرشيف
 // ✅ أرشفة واستعادة
 // ✅ تأكيد حذف واحد من useChats
 // ✅ تمييز المحادثة الحالية
 // ============================================

import { useMemo, useState } from "react";

import {
  formatDate,
  getUsagePercent,
  getUsageColor,
} from "../../utils/helpers";

import { getEffectiveUsedToday } from "../../utils/validators";

export default function ChatHistory({
  chats = [],
  currentChatId,
  onClose,
  onOpenChat,
  onDeleteChat,
  onNewChat,
  isOpen = false,
  user,
  isDark = true,
  isAdmin = false,
  onGoToAdmin,
  onOpenSettings,
  onToggleTheme,
  onLogout,
  onArchiveChat,
  onRestoreChat,
}) {
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  // ==========================================
  // استهلاك التوكنات
  // ==========================================

  const usedToday = getEffectiveUsedToday(user);
  const dailyLimit = user?.daily_limit || 5000;
  const percent = getUsagePercent(usedToday, dailyLimit);
  const remaining = Math.max(0, dailyLimit - usedToday);
  const usageColor = getUsageColor(percent);

  // ==========================================
  // البحث وتصنيف المحادثات
  // ==========================================

  const filteredChats = useMemo(() => {
    const query = search.trim().toLowerCase();

    return chats.filter((chat) => {
      const archived = Boolean(
        chat.is_archived || chat.archived_at
      );

      if (archived !== showArchived) return false;

      const title = (
        chat.title || "محادثة جديدة"
      ).toLowerCase();

      return !query || title.includes(query);
    });
  }, [chats, search, showArchived]);

  // ==========================================
  // فتح محادثة
  // ==========================================

  const handleOpenChat = (chatId) => {
    if (!chatId || showArchived) return;

    onOpenChat?.(chatId);
    onClose?.();
  };

  // ==========================================
  // حذف المحادثة
  // ==========================================

  // التأكيد موجود داخل useChats.js فقط.
  const handleDelete = (chat) => {
    if (!chat?.id) return;
    onDeleteChat?.(chat.id);
  };

  // ==========================================
  // الأرشفة
  // ==========================================

  const handleArchive = async (chat) => {
    if (!chat?.id || !onArchiveChat) return;
    await onArchiveChat(chat.id);
  };

  // ==========================================
  // الاستعادة
  // ==========================================

  const handleRestore = async (chat) => {
    if (!chat?.id || !onRestoreChat) return;
    await onRestoreChat(chat.id);
  };

  return (
    <>
      {isOpen && (
        <button
          type="button"
          className="sidebar-scrim"
          onClick={onClose}
          aria-label="إغلاق القائمة"
        />
      )}

      <aside
        className={`history-panel app-sidebar ${
          isOpen ? "sidebar-open" : ""
        }`}
        dir="rtl"
      >
        {/* الهوية */}

        <div className="sidebar-brand">
          <div className="sidebar-logo">B.</div>

          <div>
            <strong>BLAK</strong>
            <small>مساحة الذكاء الاصطناعي</small>
          </div>

          <button
            type="button"
            className="sidebar-close"
            onClick={onClose}
            aria-label="إغلاق"
          >
            ×
          </button>
        </div>

        {/* محادثة جديدة */}

        <button
          type="button"
          className="sidebar-new-chat"
          onClick={() => {
            onNewChat?.();
            onClose?.();
          }}
        >
          <span>＋</span>
          محادثة جديدة
          <kbd>⌘ K</kbd>
        </button>

        {/* مساحة العمل */}

        <div className="sidebar-section-label">
          مساحة العمل
        </div>

        <div className="sidebar-nav-item active">
          <span>✧</span>
          المحادثة
        </div>

        {isAdmin && (
          <button
            type="button"
            className="sidebar-action sidebar-admin-action"
            onClick={onGoToAdmin}
            title="الانتقال إلى لوحة التحكم"
          >
            <span>▦</span>
            لوحة التحكم
          </button>
        )}

        {/* عنوان السجل */}

        <div className="sidebar-history-head">
          <span>
            {showArchived
              ? "المحادثات المؤرشفة"
              : "سجل المحادثات"}
          </span>

          <span>{filteredChats.length}</span>
        </div>

        {/* البحث */}

        <div className="sidebar-search">
          <span>⌕</span>

          <input
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="ابحث في محادثاتك..."
            aria-label="البحث في المحادثات"
          />

          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="مسح البحث"
            >
              ×
            </button>
          )}
        </div>

        {/* تبويبات السجل */}

        <div className="sidebar-history-tabs">
          <button
            type="button"
            className={!showArchived ? "active" : ""}
            onClick={() => setShowArchived(false)}
          >
            المحادثات
          </button>

          <button
            type="button"
            className={showArchived ? "active" : ""}
            onClick={() => setShowArchived(true)}
          >
            الأرشيف
          </button>
        </div>

        {/* قائمة المحادثات */}

        <div className="sidebar-chat-list">
          {filteredChats.length === 0 ? (
            <div className="sidebar-empty">
              {search
                ? "لا توجد محادثات مطابقة للبحث"
                : showArchived
                ? "لا توجد محادثات مؤرشفة"
                : "ستظهر محادثاتك هنا عند البدء"}
            </div>
          ) : (
            filteredChats.map((chat) => (
              <div
                key={chat.id}
                className={`sidebar-chat ${
                  chat.id === currentChatId
                    ? "selected"
                    : ""
                }`}
              >
                <button
                  type="button"
                  className="sidebar-chat-open"
                  onClick={() => handleOpenChat(chat.id)}
                  disabled={showArchived}
                  title={
                    showArchived
                      ? "استعد المحادثة أولًا"
                      : "فتح المحادثة"
                  }
                >
                  <span className="sidebar-chat-icon">
                    {showArchived ? "▣" : "◌"}
                  </span>

                  <span className="sidebar-chat-meta">
                    <strong>
                      {chat.title || "محادثة جديدة"}
                    </strong>

                    <small>
                      {formatDate(chat.date)}
                    </small>
                  </span>
                </button>

                <div className="sidebar-chat-actions">
                  {showArchived ? (
                    <button
                      type="button"
                      onClick={() => handleRestore(chat)}
                      title="استعادة المحادثة"
                      aria-label="استعادة المحادثة"
                      disabled={!onRestoreChat}
                    >
                      ↩
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleArchive(chat)}
                      title="أرشفة المحادثة"
                      aria-label="أرشفة المحادثة"
                      disabled={!onArchiveChat}
                    >
                      ▣
                    </button>
                  )}

                  <button
                    type="button"
                    className="sidebar-chat-delete"
                    onClick={() => handleDelete(chat)}
                    title="حذف المحادثة"
                    aria-label="حذف المحادثة"
                    disabled={!onDeleteChat}
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* الحساب والاستهلاك */}

        <div className="sidebar-account-section">
          <div className="sidebar-usage">
            <div className="sidebar-usage-top">
              <strong>استهلاك اليوم</strong>
              <span>{Math.floor(percent)}%</span>
            </div>

            <div className="sidebar-usage-track">
              <span
                style={{
                  width: `${Math.min(100, percent)}%`,
                  background: usageColor,
                }}
              />
            </div>

            <small>
              متبقي {remaining.toLocaleString()} من{" "}
              {dailyLimit.toLocaleString()} توكن
            </small>
          </div>

          <button
            type="button"
            className="sidebar-action"
            onClick={onOpenSettings}
          >
            <span>⚙</span>
            الإعدادات
          </button>

          <button
            type="button"
            className="sidebar-action"
            onClick={onToggleTheme}
          >
            <span>{isDark ? "☀" : "☾"}</span>
            {isDark ? "الوضع النهاري" : "الوضع الليلي"}
          </button>

          <button
            type="button"
            className="sidebar-action sidebar-logout"
            onClick={onLogout}
          >
            <span>↪</span>
            تسجيل الخروج
          </button>
        </div>

        {/* التذييل */}

        <div className="sidebar-footer">
          <div className="sidebar-footer-mark">
            ✦
          </div>

          <div>
            <strong>مصمم للأفكار الكبيرة</strong>
            <small>BLAK AI Workspace</small>
          </div>
        </div>
      </aside>
    </>
  );
}
