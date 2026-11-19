// ============================================
// ChatSettings.jsx — نافذة الإعدادات
// نافذة مركزية على الديسكتوب، وصفحة كاملة على الهاتف.
// الأنماط: src/styles/settings/settings.css
// ============================================

import { useEffect, useMemo, useState } from "react";
import { PERSONALITY_LABELS } from "../../config/personalities";

const TABS = [
  { id: "profile",     icon: "👤", label: "الملف الشخصي" },
  { id: "personality", icon: "🎭", label: "الشخصية" },
  { id: "appearance",  icon: "🎨", label: "المظهر" },
  { id: "memory",      icon: "🧠", label: "الذاكرة" },
  { id: "security",    icon: "🔒", label: "الأمان" },
];

const PERSONALITY_INFO = {
  blak: "الشخصية الأساسية — مصرية، مباشرة، وتفهم أسلوبك.",
  gair: "شخصية واثقة وصريحة وردودها قصيرة.",
};

const GENDERS = [
  { value: "ولد", label: "ولد" },
  { value: "بنت", label: "بنت" },
];

export default function ChatSettings({
  user,
  onClose,
  onSave,
  onDeleteAccount,
  theme = "dark",
  onToggleTheme,
  // ─── الذاكرة ─────────────────────────────
  memorySettings = { memory_enabled: true, chat_reference_enabled: true },
  memories = [],
  onToggleMemory,        // (field: "memory_enabled" | "chat_reference_enabled") => void
  onDeleteMemory,        // (memoryId) => void
  onClearAllMemories,    // () => void
  onClearHistory,        // () => void  — يمسح المحادثات + ذكرياتها
}) {
  const [tab, setTab]               = useState("profile");
  const [name, setName]             = useState(user?.name || "");
  const [personality, setPersonality] = useState(user?.personality || "blak");
  const [gender, setGender]         = useState(user?.gender || "ولد");
  const [password, setPassword]     = useState("");
  const [confirm, setConfirm]       = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]       = useState(false);
  const [status, setStatus]         = useState(null);
  const [memBusy, setMemBusy]       = useState(false);
  const [confirmClear, setConfirmClear] = useState(false); // تأكيد حذف السجل

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const updates = useMemo(() => {
    const u = {};
    const trimmed = name.trim();
    if (trimmed && trimmed !== user?.name) u.name = trimmed;
    if (personality !== (user?.personality || "blak")) u.personality = personality;
    if (gender !== (user?.gender || "ولد")) u.gender = gender;
    return u;
  }, [name, personality, gender, user]);

  const dirty = Object.keys(updates).length > 0 || password.length > 0;

  async function handleSave() {
    setStatus(null);
    if (password && password.length < 6) {
      setTab("security");
      return setStatus({ type: "error", text: "كلمة المرور قصيرة، استخدم 6 أحرف على الأقل." });
    }
    if (password && password !== confirm) {
      setTab("security");
      return setStatus({ type: "error", text: "كلمتا المرور غير متطابقتين." });
    }
    setLoading(true);
    try {
      await onSave({ profileUpdates: updates, newPassword: password || null });
      setPassword("");
      setConfirm("");
      setStatus({ type: "success", text: "تم حفظ التغييرات." });
    } catch (err) {
      setStatus({ type: "error", text: err?.message || "تعذر حفظ التغييرات." });
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(field) {
    if (memBusy) return;
    setMemBusy(true);
    try {
      await onToggleMemory?.(field);
    } finally {
      setMemBusy(false);
    }
  }

  async function handleDeleteMemory(id) {
    setMemBusy(true);
    try { await onDeleteMemory?.(id); }
    finally { setMemBusy(false); }
  }

  async function handleClearAll() {
    setMemBusy(true);
    try { await onClearAllMemories?.(); }
    finally { setMemBusy(false); }
  }

  async function handleClearHistory() {
    setMemBusy(true);
    setConfirmClear(false);
    try { await onClearHistory?.(); }
    finally { setMemBusy(false); }
  }

  const isDark = theme === "dark";

  return (
    <div
      className="ui-overlay"
      data-theme={isDark ? "dark" : "light"}
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div
        className="settings"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        dir="rtl"
      >
        <header className="settings__head">
          <h2 id="settings-title">الإعدادات</h2>
          <button
            type="button"
            className="ui-btn ui-btn--ghost ui-btn--sm"
            onClick={onClose}
            aria-label="إغلاق"
          >✕</button>
        </header>

        <div className="settings__body">
          <nav className="settings__nav" role="tablist" aria-label="أقسام الإعدادات">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                className={`settings__tab ${tab === t.id ? "is-active" : ""}`}
                onClick={() => setTab(t.id)}
              >
                <span aria-hidden="true">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </nav>

          <section className="settings__panel" role="tabpanel">
            {status && (
              <div
                className={`settings__status settings__status--${status.type}`}
                role="status"
              >
                {status.text}
              </div>
            )}

            {/* ─── الملف الشخصي ─── */}
            {tab === "profile" && (
              <>
                <div className="ui-field">
                  <label className="ui-label" htmlFor="st-email">البريد الإلكتروني</label>
                  <input id="st-email" className="ui-input" value={user?.email || ""} disabled readOnly dir="ltr" />
                  <span className="ui-hint">لا يمكن تغيير البريد من هنا.</span>
                </div>
                <div className="ui-field">
                  <label className="ui-label" htmlFor="st-name">الاسم</label>
                  <input
                    id="st-name"
                    className="ui-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={60}
                  />
                </div>
                <div className="ui-field">
                  <span className="ui-label">أنت</span>
                  <div className="settings__segment" role="radiogroup" aria-label="النوع">
                    {GENDERS.map((g) => (
                      <button
                        key={g.value}
                        type="button"
                        role="radio"
                        aria-checked={gender === g.value}
                        className={gender === g.value ? "is-active" : ""}
                        onClick={() => setGender(g.value)}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                  <span className="ui-hint">يستخدمه المساعد ليخاطبك بالصيغة المناسبة.</span>
                </div>
              </>
            )}

            {/* ─── الشخصية ─── */}
            {tab === "personality" && (
              <div className="settings__cards" role="radiogroup" aria-label="شخصية المساعد">
                {Object.entries(PERSONALITY_LABELS).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={personality === key}
                    className={`settings__card ${personality === key ? "is-active" : ""}`}
                    onClick={() => setPersonality(key)}
                  >
                    <strong>{label}</strong>
                    <span>{PERSONALITY_INFO[key] || ""}</span>
                  </button>
                ))}
              </div>
            )}

            {/* ─── المظهر ─── */}
            {tab === "appearance" && (
              <div className="settings__row">
                <div>
                  <strong>الوضع الليلي</strong>
                  <span className="ui-hint">بدّل بين المظهر الداكن والفاتح للشات.</span>
                </div>
                <button
                  type="button"
                  className="ui-switch"
                  role="switch"
                  aria-checked={isDark}
                  aria-label="الوضع الليلي"
                  onClick={() => onToggleTheme?.()}
                  disabled={!onToggleTheme}
                />
              </div>
            )}

            {/* ─── الذاكرة ─── */}
            {tab === "memory" && (
              <>
                {/* ── مفتاح الذاكرة المحفوظة ── */}
                <div className="settings__row">
                  <div>
                    <strong>الذاكرة المحفوظة</strong>
                    <span className="ui-hint">
                      بلاك يحفظ معلومات مهمة عنك ويستخدمها في الردود — مثل ChatGPT.
                    </span>
                  </div>
                  <button
                    type="button"
                    className="ui-switch"
                    role="switch"
                    aria-checked={memorySettings.memory_enabled}
                    aria-label="تفعيل الذاكرة"
                    onClick={() => handleToggle("memory_enabled")}
                    disabled={memBusy}
                  />
                </div>

                {/* ── مفتاح ربط المحادثات ── */}
                <div className="settings__row">
                  <div>
                    <strong>الرجوع لسجل المحادثات</strong>
                    <span className="ui-hint">
                      بلاك يربط ويفتكر محادثاتك القديمة عند الحاجة.
                    </span>
                  </div>
                  <button
                    type="button"
                    className="ui-switch"
                    role="switch"
                    aria-checked={memorySettings.chat_reference_enabled}
                    aria-label="ربط المحادثات"
                    onClick={() => handleToggle("chat_reference_enabled")}
                    disabled={memBusy}
                  />
                </div>

                {/* ── قائمة الذكريات ── */}
                {memorySettings.memory_enabled && (
                  <div className="settings__memories">
                    <div className="settings__memories-head">
                      <span className="ui-label">
                        الذكريات المحفوظة
                        {memories.length > 0 && (
                          <span className="settings__badge">{memories.length}</span>
                        )}
                      </span>
                      {memories.length > 0 && (
                        <button
                          type="button"
                          className="ui-btn ui-btn--ghost ui-btn--xs"
                          onClick={handleClearAll}
                          disabled={memBusy}
                        >
                          مسح الكل
                        </button>
                      )}
                    </div>

                    {memories.length === 0 ? (
                      <p className="settings__empty">لا توجد ذكريات محفوظة بعد.</p>
                    ) : (
                      <ul className="settings__memory-list">
                        {memories.map((m) => (
                          <li key={m.id} className="settings__memory-item">
                            <span className="settings__memory-text">{m.content}</span>
                            <button
                              type="button"
                              className="ui-btn ui-btn--ghost ui-btn--xs settings__memory-del"
                              aria-label="حذف الذكرى"
                              onClick={() => handleDeleteMemory(m.id)}
                              disabled={memBusy}
                            >
                              ✕
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {/* ── حذف سجل المحادثات ── */}
                <div className="settings__danger">
                  <div>
                    <strong>حذف سجل المحادثات</strong>
                    <span className="ui-hint">
                      يحذف جميع محادثاتك وذكرياتها المرتبطة بها نهائيًا.
                    </span>
                  </div>
                  {!confirmClear ? (
                    <button
                      type="button"
                      className="ui-btn ui-btn--danger ui-btn--sm"
                      onClick={() => setConfirmClear(true)}
                      disabled={memBusy}
                    >
                      حذف السجل
                    </button>
                  ) : (
                    <div className="settings__confirm-row">
                      <span className="ui-hint">متأكد؟</span>
                      <button
                        type="button"
                        className="ui-btn ui-btn--danger ui-btn--sm"
                        onClick={handleClearHistory}
                        disabled={memBusy}
                      >
                        نعم، احذف
                      </button>
                      <button
                        type="button"
                        className="ui-btn ui-btn--sm"
                        onClick={() => setConfirmClear(false)}
                      >
                        إلغاء
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ─── الأمان ─── */}
            {tab === "security" && (
              <>
                <div className="ui-field">
                  <label className="ui-label" htmlFor="st-pass">كلمة مرور جديدة</label>
                  <input
                    id="st-pass"
                    className="ui-input"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    dir="ltr"
                    placeholder="اتركها فارغة بدون تغيير"
                  />
                </div>
                <div className="ui-field">
                  <label className="ui-label" htmlFor="st-confirm">تأكيد كلمة المرور</label>
                  <input
                    id="st-confirm"
                    className="ui-input"
                    type={showPassword ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    autoComplete="new-password"
                    dir="ltr"
                  />
                </div>
                <label className="settings__check">
                  <input
                    type="checkbox"
                    checked={showPassword}
                    onChange={(e) => setShowPassword(e.target.checked)}
                  />
                  إظهار كلمة المرور
                </label>

                <div className="settings__danger">
                  <div>
                    <strong>حذف الحساب</strong>
                    <span className="ui-hint">يحذف حسابك وكل محادثاتك نهائيًا ولا يمكن التراجع.</span>
                  </div>
                  <button
                    type="button"
                    className="ui-btn ui-btn--danger ui-btn--sm"
                    onClick={onDeleteAccount}
                  >
                    حذف الحساب
                  </button>
                </div>
              </>
            )}
          </section>
        </div>

        <footer className="settings__foot">
          <button type="button" className="ui-btn" onClick={onClose}>إغلاق</button>
          <button
            type="button"
            className="ui-btn ui-btn--primary"
            onClick={handleSave}
            disabled={!dirty || loading}
          >
            {loading ? "جارٍ الحفظ…" : "حفظ التغييرات"}
          </button>
        </footer>
      </div>
    </div>
  );
}
