// ============================================
// BLAK — Sidebar v4
// Navigation, chat search, archive, pinned chats,
// rename, local project spaces and account actions.
// ============================================

import { useEffect, useMemo, useRef, useState } from "react";
import { formatDate, getUsagePercent, getUsageColor } from "../../utils/helpers";
import { getEffectiveUsedToday } from "../../utils/validators";

const readLocalProjects = (userId) => {
  try {
    const parsed = JSON.parse(localStorage.getItem(`blak-projects-${userId}`) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export default function ChatHistory({
  chats = [], currentChatId, onClose, onOpenChat, onDeleteChat,
  onNewChat, isOpen = false, user, isDark = true, isAdmin = false,
  onGoToAdmin, onOpenSettings, onToggleTheme, onLogout,
  onArchiveChat, onRestoreChat, onRenameChat,
}) {
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [activeSection, setActiveSection] = useState("chats");
  const [projects, setProjects] = useState(() => readLocalProjects(user?.id));
  const [pinnedIds, setPinnedIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`blak-pinned-${user?.id}`) || "[]"); }
    catch { return []; }
  });
  const searchRef = useRef(null);

  useEffect(() => {
    setProjects(readLocalProjects(user?.id));
    try { setPinnedIds(JSON.parse(localStorage.getItem(`blak-pinned-${user?.id}`) || "[]")); }
    catch { setPinnedIds([]); }
  }, [user?.id]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setActiveSection("chats");
        setShowArchived(false);
        searchRef.current?.focus();
      }
      if (event.key === "Escape" && isOpen) onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!user?.id) return;
    localStorage.setItem(`blak-projects-${user.id}`, JSON.stringify(projects));
  }, [projects, user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    localStorage.setItem(`blak-pinned-${user.id}`, JSON.stringify(pinnedIds));
  }, [pinnedIds, user?.id]);

  const usedToday = getEffectiveUsedToday(user);
  const dailyLimit = user?.daily_limit || 5000;
  const percent = getUsagePercent(usedToday, dailyLimit);
  const remaining = Math.max(0, dailyLimit - usedToday);
  const usageColor = getUsageColor(percent);
  const isUnlimited = user?.role === "admin";

  const filteredChats = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return chats
      .filter((chat) => Boolean(chat.is_archived || chat.archived_at) === showArchived)
      .filter((chat) => !query || `${chat.title || "محادثة جديدة"}`.toLocaleLowerCase().includes(query))
      .sort((a, b) => Number(pinnedIds.includes(b.id)) - Number(pinnedIds.includes(a.id)));
  }, [chats, search, showArchived, pinnedIds]);

  const closeAfter = (callback) => {
    callback?.();
    onClose?.();
  };

  const createProject = () => {
    const name = window.prompt("اسم المشروع الجديد:");
    if (!name?.trim()) return;
    const project = { id: `local-${Date.now()}`, name: name.trim().slice(0, 60), createdAt: new Date().toISOString() };
    setProjects((previous) => [project, ...previous]);
  };

  const renameProject = (project) => {
    const name = window.prompt("الاسم الجديد للمشروع:", project.name);
    if (!name?.trim()) return;
    setProjects((previous) => previous.map((item) => item.id === project.id ? { ...item, name: name.trim().slice(0, 60) } : item));
  };

  const deleteProject = (project) => {
    if (!window.confirm(`حذف مساحة المشروع «${project.name}» من هذا المتصفح؟`)) return;
    setProjects((previous) => previous.filter((item) => item.id !== project.id));
  };

  const togglePin = (chat) => {
    setPinnedIds((previous) => previous.includes(chat.id) ? previous.filter((id) => id !== chat.id) : [chat.id, ...previous]);
  };

  const handleRename = async (chat) => {
    const title = window.prompt("اسم المحادثة الجديد:", chat.title || "محادثة جديدة");
    if (!title?.trim()) return;
    await onRenameChat?.(chat.id, title.trim());
  };

  return (
    <>
      {isOpen && <button type="button" className="sidebar-scrim" onClick={onClose} aria-label="إغلاق القائمة" />}
      <aside className={`history-panel app-sidebar ${isOpen ? "sidebar-open" : ""}`} dir="rtl" aria-label="القائمة الرئيسية">
        <div className="sidebar-brand">
          <div className="sidebar-logo">B.</div>
          <div><strong>BLAK</strong><small>مساحة الذكاء الاصطناعي</small></div>
          <button type="button" className="sidebar-close" onClick={onClose} aria-label="إغلاق">×</button>
        </div>

        <button type="button" className="sidebar-new-chat" onClick={() => closeAfter(onNewChat)}>
          <span>＋</span> محادثة جديدة <kbd>Ctrl K</kbd>
        </button>

        <div className="sidebar-quick-actions">
          <button type="button" className={activeSection === "chats" ? "active" : ""} onClick={() => { setActiveSection("chats"); setShowArchived(false); }}>
            <span>⌕</span> بحث ومحادثات
          </button>
          <button type="button" className={activeSection === "projects" ? "active" : ""} onClick={() => setActiveSection("projects")}>
            <span>▦</span> المشاريع <small>{projects.length}</small>
          </button>
        </div>

        {activeSection === "projects" ? (
          <section className="sidebar-projects-panel">
            <div className="sidebar-history-head"><span>مساحات المشاريع</span><span>{projects.length}</span></div>
            <button type="button" className="sidebar-create-project" onClick={createProject}><span>＋</span> إنشاء مشروع</button>
            {projects.length === 0 ? (
              <div className="sidebar-empty">لم تنشئ مشاريع بعد. يمكنك إنشاء مساحة مشروع وحفظ اسمها في هذا المتصفح.</div>
            ) : projects.map((project) => (
              <div className="sidebar-project-item" key={project.id}>
                <span className="sidebar-project-icon">▧</span>
                <div className="sidebar-project-name"><strong>{project.name}</strong><small>مساحة محلية</small></div>
                <button type="button" title="إعادة تسمية" aria-label="إعادة تسمية المشروع" onClick={() => renameProject(project)}>✎</button>
                <button type="button" title="حذف" aria-label="حذف المشروع" onClick={() => deleteProject(project)}>×</button>
              </div>
            ))}
            <p className="sidebar-project-note">ملاحظة: هذه نسخة أولية محلية لأسماء المشاريع؛ ربط المحادثات والملفات وتعليمات المشروع يتطلب جداول وواجهات خلفية مخصصة.</p>
          </section>
        ) : (
          <>
            <div className="sidebar-history-head"><span>{showArchived ? "المحادثات المؤرشفة" : "سجل المحادثات"}</span><span>{filteredChats.length}</span></div>
            <div className="sidebar-search">
              <span>⌕</span>
              <input ref={searchRef} type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث في محادثاتك..." aria-label="البحث في المحادثات" />
              {search && <button type="button" onClick={() => setSearch("")} aria-label="مسح البحث">×</button>}
            </div>
            <div className="sidebar-history-tabs">
              <button type="button" className={!showArchived ? "active" : ""} onClick={() => setShowArchived(false)}>المحادثات</button>
              <button type="button" className={showArchived ? "active" : ""} onClick={() => setShowArchived(true)}>الأرشيف</button>
            </div>
            <div className="sidebar-chat-list">
              {filteredChats.length === 0 ? <div className="sidebar-empty">{search ? "لا توجد محادثات مطابقة" : showArchived ? "لا توجد محادثات مؤرشفة" : "ستظهر محادثاتك هنا عند البدء"}</div> : filteredChats.map((chat) => (
                <div key={chat.id} className={`sidebar-chat ${chat.id === currentChatId ? "selected" : ""}`}>
                  <button type="button" className="sidebar-chat-open" onClick={() => closeAfter(() => onOpenChat?.(chat.id))} disabled={showArchived} title={showArchived ? "استعد المحادثة أولًا" : "فتح المحادثة"}>
                    <span className="sidebar-chat-icon">{pinnedIds.includes(chat.id) ? "★" : showArchived ? "▣" : "◌"}</span>
                    <span className="sidebar-chat-meta"><strong>{chat.title || "محادثة جديدة"}</strong><small>{formatDate(chat.date)}</small></span>
                  </button>
                  <div className="sidebar-chat-actions">
                    {!showArchived && <>
                      <button type="button" onClick={() => togglePin(chat)} title={pinnedIds.includes(chat.id) ? "إلغاء التثبيت" : "تثبيت المحادثة"} aria-label="تثبيت المحادثة">{pinnedIds.includes(chat.id) ? "★" : "☆"}</button>
                      <button type="button" onClick={() => handleRename(chat)} title="إعادة تسمية" aria-label="إعادة تسمية">✎</button>
                      <button type="button" onClick={() => onArchiveChat?.(chat.id)} title="أرشفة" aria-label="أرشفة" disabled={!onArchiveChat}>▣</button>
                    </>}
                    {showArchived && <button type="button" onClick={() => onRestoreChat?.(chat.id)} title="استعادة" aria-label="استعادة" disabled={!onRestoreChat}>↩</button>}
                    <button type="button" className="sidebar-chat-delete" onClick={() => onDeleteChat?.(chat.id)} title="حذف" aria-label="حذف" disabled={!onDeleteChat}>⌫</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="sidebar-account-section">
          <div className={`sidebar-usage ${isUnlimited ? "sidebar-usage-unlimited" : ""}`}>
            <div className="sidebar-usage-top"><strong>استهلاك اليوم</strong><span>{isUnlimited ? "∞" : `${Math.floor(percent)}%`}</span></div>
            {isUnlimited ? <small>استخدام إداري</small> : <><div className="sidebar-usage-track"><span style={{ width: `${Math.min(100, percent)}%`, background: usageColor }} /></div><small>متبقي {remaining.toLocaleString()} من {dailyLimit.toLocaleString()} توكن</small></>}
          </div>
          <div className="sidebar-profile-row">
            <div className="sidebar-profile-avatar">{(user?.name || user?.email || "B").trim().charAt(0).toUpperCase()}</div>
            <div className="sidebar-profile-meta"><strong>{user?.name || "مستخدم BLAK"}</strong><small>{user?.email || ""}</small></div>
            <span className="sidebar-plan-label">{isAdmin ? "ADMIN" : "FREE"}</span>
          </div>
          {isAdmin && <button type="button" className="sidebar-action sidebar-admin-action" onClick={onGoToAdmin}><span>▦</span> لوحة التحكم الإدارية</button>}
          <button type="button" className="sidebar-action" onClick={onOpenSettings}><span>⚙</span> الإعدادات</button>
          <button type="button" className="sidebar-action" onClick={onToggleTheme}><span>{isDark ? "☀" : "☾"}</span>{isDark ? "الوضع النهاري" : "الوضع الليلي"}</button>
          <button type="button" className="sidebar-action sidebar-logout" onClick={onLogout}><span>↪</span> تسجيل الخروج</button>
        </div>
        <div className="sidebar-footer"><div className="sidebar-footer-mark">✦</div><div><strong>مصمم للأفكار الكبيرة</strong><small>BLAK AI Workspace</small></div></div>
      </aside>
    </>
  );
}
