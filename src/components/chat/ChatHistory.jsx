// ============================================
// ChatHistory.jsx — القائمة الجانبية (Sidebar v5)
// تصميم على نمط ChatGPT: محادثة جديدة + بحث + سجل مجمّع بالتاريخ + حساب المستخدم.
// الأنماط: src/styles/chat/sidebar.css (كل الأصناف تبدأ بـ sb-)
// ============================================

import { useEffect, useMemo, useRef, useState } from "react";
import { getUsagePercent, getUsageColor } from "../../utils/helpers";
import { getEffectiveUsedToday } from "../../utils/validators";

// ---------- أيقونات (SVG خفيفة بدون مكتبة) ----------
const ICONS = {
  edit: <><path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.4 2.6a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4Z" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></>,
  panel: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M15 3v18" /></>,
  more: <><circle cx="5" cy="12" r="1.3" fill="currentColor" /><circle cx="12" cy="12" r="1.3" fill="currentColor" /><circle cx="19" cy="12" r="1.3" fill="currentColor" /></>,
  pin: <><path d="M12 17v5" /><path d="M9 3h6l-1 6 3 3v2H7v-2l3-3Z" /></>,
  archive: <><rect x="2" y="3" width="20" height="5" rx="1" /><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" /><path d="M10 12h4" /></>,
  trash: <><path d="M3 6h18" /><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></>,
  restore: <><path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-15-6.7L3 13" /></>,
  settings: <><path d="M4 6h10" /><path d="M18 6h2" /><circle cx="16" cy="6" r="2" /><path d="M4 12h2" /><path d="M10 12h10" /><circle cx="8" cy="12" r="2" /><path d="M4 18h12" /><circle cx="18" cy="18" r="2" /></>,
  shield: <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6Z" />,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  moon: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />,
  logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></>,
  back: <path d="m9 18 6-6-6-6" />,
  close: <path d="M18 6 6 18M6 6l12 12" />,
};

function Icon({ name, size = 18 }) {
  return (
    <svg className="sb-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

// ---------- تجميع المحادثات بالتاريخ ----------
const GROUPS = [
  { id: "today", label: "اليوم" },
  { id: "yesterday", label: "أمس" },
  { id: "week", label: "آخر 7 أيام" },
  { id: "month", label: "آخر 30 يومًا" },
  { id: "older", label: "أقدم" },
];

function groupIdFor(dateValue, startOfToday) {
  const t = new Date(dateValue).getTime();
  if (!t || Number.isNaN(t)) return "older";
  const days = Math.floor((startOfToday - t) / 86400000);
  if (t >= startOfToday) return "today";
  if (days < 1) return "yesterday";
  if (days < 7) return "week";
  if (days < 30) return "month";
  return "older";
}

const MENU_WIDTH = 200;
const MENU_HEIGHT = 176;

export default function ChatHistory({
  chats = [], currentChatId, onClose, onOpenChat, onDeleteChat,
  onNewChat, isOpen = false, user, isDark = true, isAdmin = false,
  onGoToAdmin, onOpenSettings, onToggleTheme, onLogout,
  onArchiveChat, onRestoreChat, onRenameChat,
  collapsed = false, onToggleCollapse,
}) {
  const [search, setSearch] = useState("");
  const [archivedView, setArchivedView] = useState(false);
  const [rowMenu, setRowMenu] = useState(null); // { chat, top, left }
  const [accountOpen, setAccountOpen] = useState(false);
  const [pinnedIds, setPinnedIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`blak-pinned-${user?.id}`) || "[]"); }
    catch { return []; }
  });
  const searchRef = useRef(null);
  const accountRef = useRef(null);
  const menuRef = useRef(null);

  // قفل تمرير الصفحة خلف الدرج على الهاتف
  useEffect(() => {
    document.body.classList.toggle("sidebar-is-open", isOpen);
    return () => document.body.classList.remove("sidebar-is-open");
  }, [isOpen]);

  // المثبّتات تُحفظ لكل مستخدم في المتصفح
  useEffect(() => {
    try { setPinnedIds(JSON.parse(localStorage.getItem(`blak-pinned-${user?.id}`) || "[]")); }
    catch { setPinnedIds([]); }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    try { localStorage.setItem(`blak-pinned-${user.id}`, JSON.stringify(pinnedIds)); } catch { /* ignore */ }
  }, [pinnedIds, user?.id]);

  // اختصارات: Ctrl/⌘ + K للبحث، Escape لإغلاق القوائم ثم الدرج
  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setArchivedView(false);
        if (collapsed) onToggleCollapse?.();
        setTimeout(() => searchRef.current?.focus(), 60);
      }
      if (event.key === "Escape") {
        if (rowMenu || accountOpen) { setRowMenu(null); setAccountOpen(false); }
        else if (isOpen) onClose?.();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose, collapsed, onToggleCollapse, rowMenu, accountOpen]);

  // الضغط خارج القوائم المنبثقة يغلقها
  useEffect(() => {
    if (!rowMenu && !accountOpen) return undefined;
    const onPointerDown = (event) => {
      if (menuRef.current?.contains(event.target)) return;
      if (accountRef.current?.contains(event.target)) return;
      if (event.target.closest?.(".sb-row-more")) return;
      setRowMenu(null);
      setAccountOpen(false);
    };
    const close = () => setRowMenu(null);
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("resize", close);
    };
  }, [rowMenu, accountOpen]);

  // ---------- الاستهلاك ----------
  const usedToday = getEffectiveUsedToday(user);
  const dailyLimit = user?.daily_limit || 5000;
  const percent = getUsagePercent(usedToday, dailyLimit);
  const remaining = Math.max(0, dailyLimit - usedToday);
  const isUnlimited = user?.role === "admin";

  // ---------- القوائم ----------
  const visibleChats = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return chats
      .filter((chat) => Boolean(chat.is_archived || chat.archived_at) === archivedView)
      .filter((chat) => !query || `${chat.title || "محادثة جديدة"}`.toLocaleLowerCase().includes(query));
  }, [chats, search, archivedView]);

  const sections = useMemo(() => {
    if (archivedView) return visibleChats.length ? [{ id: "archived", label: "", items: visibleChats }] : [];
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const pinned = visibleChats.filter((c) => pinnedIds.includes(c.id));
    const rest = visibleChats.filter((c) => !pinnedIds.includes(c.id));
    const result = [];
    if (pinned.length) result.push({ id: "pinned", label: "المثبّتة", items: pinned });
    GROUPS.forEach((group) => {
      const items = rest.filter((c) => groupIdFor(c.date, startOfToday) === group.id);
      if (items.length) result.push({ id: group.id, label: group.label, items });
    });
    return result;
  }, [visibleChats, pinnedIds, archivedView]);

  // ---------- أفعال ----------
  const closeAfter = (callback) => { callback?.(); onClose?.(); };
  const isPinned = (chat) => pinnedIds.includes(chat.id);
  const togglePin = (chat) =>
    setPinnedIds((prev) => (prev.includes(chat.id) ? prev.filter((id) => id !== chat.id) : [chat.id, ...prev]));

  const handleRename = async (chat) => {
    const title = window.prompt("اسم المحادثة الجديد:", chat.title || "محادثة جديدة");
    if (!title?.trim()) return;
    await onRenameChat?.(chat.id, title.trim());
  };

  const handleDelete = (chat) => {
    if (!window.confirm(`حذف المحادثة «${chat.title || "محادثة جديدة"}» نهائيًا؟`)) return;
    onDeleteChat?.(chat.id);
  };

  const openRowMenu = (event, chat) => {
    event.stopPropagation();
    if (rowMenu?.chat.id === chat.id) return setRowMenu(null);
    const rect = event.currentTarget.getBoundingClientRect();
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - MENU_WIDTH - 8));
    const top = rect.bottom + MENU_HEIGHT + 12 > window.innerHeight ? Math.max(8, rect.top - MENU_HEIGHT - 4) : rect.bottom + 4;
    setAccountOpen(false);
    setRowMenu({ chat, top, left });
  };

  const runMenu = (fn) => () => { const chat = rowMenu?.chat; setRowMenu(null); if (chat) fn(chat); };
  const runAccount = (fn) => () => { setAccountOpen(false); fn?.(); };

  const displayName = user?.name || "مستخدم BLAK";
  const initial = displayName.trim().charAt(0).toUpperCase();
  const emptyText = search ? "لا توجد نتائج مطابقة" : archivedView ? "لا توجد محادثات مؤرشفة" : "ستظهر محادثاتك هنا";

  return (
    <>
      {isOpen && <button type="button" className="sb-scrim" onClick={onClose} aria-label="إغلاق القائمة" />}

      <aside
        className={`sb ${isOpen ? "is-open" : ""} ${collapsed ? "is-collapsed" : ""}`}
        dir="rtl"
        aria-label="القائمة الرئيسية"
      >
        {/* ===== الأعلى: الشعار + طيّ القائمة ===== */}
        <div className="sb-top">
          <button type="button" className="sb-logo" onClick={() => closeAfter(onNewChat)} aria-label="BLAK — محادثة جديدة">B.</button>
          <span className="sb-brand">BLAK</span>
          <button type="button" className="sb-iconbtn sb-collapse" onClick={onToggleCollapse} title="إخفاء القائمة" aria-label="إخفاء القائمة">
            <Icon name="panel" />
          </button>
          <button type="button" className="sb-iconbtn sb-close" onClick={onClose} title="إغلاق" aria-label="إغلاق">
            <Icon name="close" />
          </button>
        </div>

        {/* ===== الإجراءات الأساسية ===== */}
        <div className="sb-actions">
          {archivedView ? (
            <button type="button" className="sb-item" onClick={() => { setArchivedView(false); setSearch(""); }}>
              <Icon name="back" /> <span>رجوع إلى المحادثات</span>
            </button>
          ) : (
            <>
              <button type="button" className="sb-item" onClick={() => closeAfter(onNewChat)}>
                <Icon name="edit" /> <span>محادثة جديدة</span>
              </button>
              <button
                type="button"
                className={`sb-item ${showTasks ? "is-active" : ""}`}
                onClick={() => onToggleTasks?.()}
              >
                <svg className="sb-icon" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
                <span>المهام</span>
                {activeTasksCount > 0 && (
                  <span className="sb-tasks-badge">{activeTasksCount}</span>
                )}
              </button>
            </>
          )}
          <label className="sb-search">
            <Icon name="search" size={17} />
            <input
              ref={searchRef}
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={archivedView ? "بحث في الأرشيف" : "بحث في المحادثات"}
              aria-label="البحث في المحادثات"
            />
          </label>
        </div>

        {/* ===== السجل ===== */}
        <nav className="sb-scroll" aria-label="سجل المحادثات" onScroll={() => rowMenu && setRowMenu(null)}>
          {archivedView && <div className="sb-group-title">الأرشيف</div>}

          {sections.length === 0 && <p className="sb-empty">{emptyText}</p>}

          {sections.map((section) => (
            <section key={section.id} className="sb-group">
              {section.label && <div className="sb-group-title">{section.label}</div>}
              {section.items.map((chat) => {
                const selected = chat.id === currentChatId;
                return (
                  <div key={chat.id} className={`sb-row ${selected ? "is-selected" : ""} ${rowMenu?.chat.id === chat.id ? "is-menu-open" : ""}`}>
                    <button
                      type="button"
                      className="sb-row-open"
                      onClick={() => closeAfter(() => onOpenChat?.(chat.id))}
                      disabled={archivedView}
                      title={archivedView ? "استعد المحادثة لفتحها" : chat.title || "محادثة جديدة"}
                    >
                      {isPinned(chat) && !archivedView && <span className="sb-row-pin"><Icon name="pin" size={13} /></span>}
                      <span className="sb-row-title">{chat.title || "محادثة جديدة"}</span>
                    </button>
                    <button
                      type="button"
                      className="sb-row-more"
                      onClick={(e) => openRowMenu(e, chat)}
                      aria-label="خيارات المحادثة"
                      aria-haspopup="menu"
                      aria-expanded={rowMenu?.chat.id === chat.id}
                    >
                      <Icon name="more" size={18} />
                    </button>
                  </div>
                );
              })}
            </section>
          ))}
        </nav>

        {/* ===== الحساب ===== */}
        <div className="sb-bottom" ref={accountRef}>
          {accountOpen && (
            <div className="sb-popover" role="menu" aria-label="الحساب">
              <div className="sb-pop-head">
                <strong>{displayName}</strong>
                <small>{user?.email || ""}</small>
              </div>

              <div className="sb-usage" aria-label="استهلاك اليوم">
                <div className="sb-usage-row">
                  <span>استهلاك اليوم</span>
                  <span>{isUnlimited ? "غير محدود" : `${Math.floor(percent)}%`}</span>
                </div>
                {!isUnlimited && (
                  <>
                    <div className="sb-usage-track"><span style={{ width: `${Math.min(100, percent)}%`, background: getUsageColor(percent) }} /></div>
                    <small>متبقي {remaining.toLocaleString("ar-EG")} من {dailyLimit.toLocaleString("ar-EG")} توكن</small>
                  </>
                )}
              </div>

              <div className="sb-pop-list">
                {isAdmin && (
                  <button type="button" role="menuitem" onClick={runAccount(onGoToAdmin)}><Icon name="shield" /> لوحة التحكم</button>
                )}
                <button type="button" role="menuitem" onClick={runAccount(() => closeAfter(onOpenSettings))}><Icon name="settings" /> الإعدادات</button>
                <button type="button" role="menuitem" onClick={runAccount(() => { setArchivedView(true); setSearch(""); })}><Icon name="archive" /> المحادثات المؤرشفة</button>
                <button type="button" role="menuitem" onClick={runAccount(onToggleTheme)}><Icon name={isDark ? "sun" : "moon"} /> {isDark ? "الوضع النهاري" : "الوضع الليلي"}</button>
                <hr />
                <button type="button" role="menuitem" className="is-danger" onClick={runAccount(onLogout)}><Icon name="logout" /> تسجيل الخروج</button>
              </div>
            </div>
          )}

          <button
            type="button"
            className={`sb-account ${accountOpen ? "is-open" : ""}`}
            onClick={() => { setRowMenu(null); setAccountOpen((v) => !v); }}
            aria-haspopup="menu"
            aria-expanded={accountOpen}
          >
            <span className="sb-avatar">{initial}</span>
            <span className="sb-account-meta">
              <strong>{displayName}</strong>
              <small>{isAdmin ? "مدير" : "حساب مجاني"}</small>
            </span>
          </button>
        </div>
      </aside>

      {/* قائمة خيارات المحادثة (fixed حتى لا تُقصّ داخل القائمة) */}
      {rowMenu && (
        <div ref={menuRef} className="sb-menu" role="menu" style={{ top: rowMenu.top, left: rowMenu.left }} dir="rtl">
          {archivedView ? (
            <button type="button" role="menuitem" onClick={runMenu((c) => onRestoreChat?.(c.id))} disabled={!onRestoreChat}><Icon name="restore" /> استعادة</button>
          ) : (
            <>
              <button type="button" role="menuitem" onClick={runMenu(togglePin)}><Icon name="pin" /> {isPinned(rowMenu.chat) ? "إلغاء التثبيت" : "تثبيت"}</button>
              <button type="button" role="menuitem" onClick={runMenu(handleRename)}><Icon name="edit" /> إعادة تسمية</button>
              <button type="button" role="menuitem" onClick={runMenu((c) => onArchiveChat?.(c.id))} disabled={!onArchiveChat}><Icon name="archive" /> أرشفة</button>
            </>
          )}
          <hr />
          <button type="button" role="menuitem" className="is-danger" onClick={runMenu(handleDelete)} disabled={!onDeleteChat}><Icon name="trash" /> حذف</button>
        </div>
      )}
    </>
  );
}
