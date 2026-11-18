// ============================================
// src/pages/Admin.jsx — النسخة المُحدَّثة (Responsive + Folders)
// مع إحصائيات المفاتيح + عرض الهاتف + مجلدات محادثات المستخدمين
// متوافق مع:
//   - src/config/breakpoints.js
//   - src/hooks/useMediaQuery.js
//   - src/App.css (media queries موحّدة)
//   - src/config/constants.js (DEFAULT_KEY_DAILY_LIMIT)
// ============================================

import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "../lib/supabase";
import MessageContent from "../components/MessageContent";

// ✅ استيراد البريك بوينتس والهوك
import { MEDIA } from "../config/breakpoints";
import { useMediaQuery } from "../hooks/useMediaQuery";

// ✅ استيراد الثوابت
import { DEFAULT_KEY_DAILY_LIMIT } from "../config/constants";

import {
  AdminShell,
  OverviewTab,
  UsersTab,
  KeysTab,
  ChatsTab,
  AddKeyModal,
  EditUserModal,
  ChatViewerModal,
  UserChatsModal,
  ExportModal,
  ValidationModal,
  LogsModal,
} from "../components/admin";

import {
  formatDate,
  getUsagePercent,
  getUsageColor,
  truncate,
} from "../utils/helpers";
import {
  PERSONALITY_LABELS,
  DEFAULT_PERSONALITY,
} from "../config/personalities";
import {
  validateGroqKey,
  validateAllKeys,
  testSingleKeyAndUpdate,
} from "../utils/groqValidator";

// ============================================================
//  Helper: بناء theme حسب الوضع الحالي
// ============================================================
// القيم تأتي من src/styles/tokens.css — الوضع الفاتح/الداكن عبر data-theme على .adm
const buildTheme = () => ({
  bg: "var(--bg-main)",
  surface: "var(--bg-card)",
  surface2: "var(--bg-elevated)",
  border: "var(--border)",
  borderStrong: "var(--border-strong)",
  text: "var(--text-primary)",
  textMuted: "var(--text-secondary)",
  inputBg: "var(--bg-input)",
  rowHover: "var(--bg-hover)",
  barBg: "var(--border-strong)",
  tabActiveBg: "var(--bg-active)",
  tabActiveColor: "var(--brand-primary-light)",
  tabInactiveColor: "var(--text-secondary)",
});

// ============================================================
//  Helper: أنماط input جاهزة
// ============================================================
const buildInputStyle = (theme, isMobile) => ({
  padding: isMobile ? "8px 10px" : "8px 12px",
  borderRadius: "8px",
  border: `1px solid ${theme.border}`,
  background: theme.inputBg,
  color: theme.text,
  fontSize: isMobile ? "13px" : "14px",
  outline: "none",
  fontFamily: "inherit",
  width: "100%",
});

const buildModalInputStyle = (theme, isMobile) => ({
  width: "100%",
  padding: isMobile ? "9px" : "10px",
  marginBottom: "12px",
  borderRadius: "10px",
  background: theme.inputBg,
  color: theme.text,
  border: `1px solid ${theme.border}`,
  outline: "none",
  fontFamily: "inherit",
  fontSize: isMobile ? "13px" : "14px",
});

// ============================================================
//  المكوّن الرئيسي
// ============================================================
export default function Admin({ user, onLogout }) {
  // ===== ✅ Responsive hooks =====
  const isMobile = useMediaQuery(MEDIA.belowMd);
  const isTablet = useMediaQuery(MEDIA.tablet);
  const isDesktop = useMediaQuery(MEDIA.desktop);

  // ===== States =====
  const [users, setUsers] = useState([]);
  const [apiKeys, setApiKeys] = useState([]);
  const [allChats, setAllChats] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  const [showAddKeyModal, setShowAddKeyModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [selectedChat, setSelectedChat] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserChatsModal, setShowUserChatsModal] = useState(false);
  const [selectedUserForChats, setSelectedUserForChats] = useState(null);
  const [userChatsList, setUserChatsList] = useState([]);

  const [newKeyValue, setNewKeyValue] = useState("");
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyLimit, setNewKeyLimit] = useState(DEFAULT_KEY_DAILY_LIMIT);
  const [editDailyLimit, setEditDailyLimit] = useState(5000);

  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("adminDarkMode");
    return saved !== null ? saved === "true" : true;
  });

  // ✅ States قديمة تم نقلها إلى ChatsTab كـ state محلي
  // (chatFilterUser / chatFilterDate / chatSearchTerm) — محذوفة

  const [showExportModal, setShowExportModal] = useState(false);
  const [exportType, setExportType] = useState("users");
  const [toast, setToast] = useState(null);

  const [validating, setValidating] = useState(false);
  const [validationProgress, setValidationProgress] = useState({
    current: 0,
    total: 0,
    name: "",
    status: "",
  });
  const [validationResults, setValidationResults] = useState([]);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationLogs, setValidationLogs] = useState([]);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [autoValidate, setAutoValidate] = useState(() => {
    return localStorage.getItem("auto_validate_keys") === "true";
  });
  const [onlineUsers, setOnlineUsers] = useState({});

  // ===== ✅ Theme =====
  const theme = useMemo(() => buildTheme(), []);

  // ===== ✅ أنماط مشتقة =====
  const inputStyle = useMemo(
    () => buildInputStyle(theme, isMobile),
    [theme, isMobile]
  );

  const modalInputStyle = useMemo(
    () => buildModalInputStyle(theme, isMobile),
    [theme, isMobile]
  );

  // ===== Effects =====
  useEffect(() => {
    const profilesChannel = supabase
      .channel("profiles-realtime")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        (payload) => {
          setUsers((prev) =>
            prev.map((u) =>
              u.id === payload.new.id ? { ...u, ...payload.new } : u
            )
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "profiles" },
        (payload) => {
          showToast(
            `مستخدم جديد: ${payload.new.name || payload.new.email}`,
            "info"
          );
          setUsers((prev) => [payload.new, ...prev]);
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "profiles" },
        (payload) => {
          setUsers((prev) => prev.filter((u) => u.id !== payload.old.id));
          showToast(`تم حذف مستخدم`, "info");
        }
      )
      .subscribe();

    const chatsChannel = supabase
      .channel("chats-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chats" },
        (payload) => {
          setAllChats((prev) => [payload.new, ...prev]);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chats" },
        (payload) => {
          setAllChats((prev) =>
            prev.map((c) =>
              c.id === payload.new.id ? { ...c, ...payload.new } : c
            )
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "chats" },
        (payload) => {
          setAllChats((prev) => prev.filter((c) => c.id !== payload.old.id));
        }
      )
      .subscribe();

    const apiKeysChannel = supabase
      .channel("api-keys-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "api_keys" },
        () => loadApiKeys()
      )
      .subscribe();

    return () => {
      profilesChannel.unsubscribe();
      chatsChannel.unsubscribe();
      apiKeysChannel.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.body.classList.add("admin-page");
    document.documentElement.classList.add("admin-page");
    return () => {
      document.body.classList.remove("admin-page");
      document.documentElement.classList.remove("admin-page");
    };
  }, []);

  // ✅ تحديث تلقائي كل 10 ثواني
  useEffect(() => {
    const interval = setInterval(() => {
      loadApiKeys();
    }, 10000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Presence
  useEffect(() => {
    const presenceChannel = supabase.channel("online-users", {
      config: { presence: { key: "admin-monitor" } },
    });

    presenceChannel.on("presence", { event: "sync" }, () => {
      setOnlineUsers(presenceChannel.presenceState());
    });

    presenceChannel.subscribe();
    return () => presenceChannel.unsubscribe();
  }, []);

  // Auto validate
  useEffect(() => {
    let interval = null;
    if (autoValidate) {
      interval = setInterval(() => handleValidateKeys(true), 60 * 60 * 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoValidate]);

  // ===== Helpers =====
  function isUserOnline(userId) {
    return Object.keys(onlineUsers).some((key) => {
      const usersInKey = onlineUsers[key];
      return usersInKey && usersInKey.some((u) => u.user_id === userId);
    });
  }

  async function loadAllData() {
    setLoading(true);
    await Promise.all([loadUsers(), loadApiKeys(), loadAllChats()]);
    setLoading(false);
  }

  async function loadUsers() {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setUsers(data);
  }

  async function loadApiKeys() {
    const { data } = await supabase
      .from("api_keys")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setApiKeys(data);
  }

  async function loadAllChats() {
    const { data } = await supabase
      .from("chats")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(200);
    if (data) setAllChats(data);
  }

  function getUserById(userId) {
    return users.find((u) => u.id === userId);
  }

  function showToast(message, type = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  // ===== Chat functions =====
  async function deleteSingleChat(chatId) {
    if (!confirm("🗑️ حذف هذه المحادثة؟")) return;
    const { error } = await supabase.from("chats").delete().eq("id", chatId);
    if (error) showToast("خطأ: " + error.message, "error");
    else {
      showToast("تم حذف المحادثة");
      loadAllChats();
    }
  }

  async function deleteChatFromModal(chatId) {
    if (!confirm("🗑️ حذف هذه المحادثة؟")) return;
    const { error } = await supabase.from("chats").delete().eq("id", chatId);
    if (error) showToast("خطأ: " + error.message, "error");
    else {
      showToast("تم حذف المحادثة");
      const { data } = await supabase
        .from("chats")
        .select("*")
        .eq("user_id", selectedUserForChats.id)
        .order("updated_at", { ascending: false });
      setUserChatsList(data || []);
      loadAllChats();
    }
  }

  async function deleteAllChatsConfirm() {
    if (!confirm("⚠️ حذف كل المحادثات؟\n\nلا يمكن التراجع!")) return;
    setLoading(true);
    await supabase.from("chats").delete().neq("id", "0");
    showToast("تم حذف كل المحادثات");
    loadAllChats();
    setLoading(false);
  }

  // ===== Export =====
  function exportToCSV(data, filename) {
    if (!data || data.length === 0) {
      showToast("لا توجد بيانات للتصدير", "error");
      return;
    }
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(",")];
    for (const row of data) {
      const values = headers.map((header) => {
        let value = row[header];
        if (value === undefined || value === null) value = "";
        if (typeof value === "object") value = JSON.stringify(value);
        value = String(value).replace(/"/g, '""');
        if (value.includes(",") || value.includes('"') || value.includes("\n"))
          value = `"${value}"`;
        return value;
      });
      csvRows.push(values.join(","));
    }
    const blob = new Blob([csvRows.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute(
      "download",
      `${filename}_${new Date().toISOString().slice(0, 19)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`تم تصدير ${data.length} سجل`);
  }

  function prepareExportData() {
    switch (exportType) {
      case "users":
        return users.map((u) => ({
          الاسم: u.name || "",
          "البريد الإلكتروني": u.email || "",
          "الاستهلاك اليومي": u.used_today || 0,
          "الحد اليومي": u.daily_limit || 5000,
          الحالة: u.is_blocked ? "محظور" : "نشط",
          الشخصية: u.personality || "blak",
        }));
      case "keys":
        return apiKeys.map((k) => ({
          الاسم: k.key_name || "",
          المفتاح: k.key_value || "",
          "الاستهلاك اليومي": k.used_today || 0,
          "الحد اليومي": k.daily_limit || DEFAULT_KEY_DAILY_LIMIT,
        }));
      case "chats":
        // ✅ التعديل: استخدام allChats بدل filteredChats
        return allChats.map((c) => ({
          المستخدم: getUserById(c.user_id)?.name || "محذوف",
          "البريد الإلكتروني": getUserById(c.user_id)?.email || "—",
          العنوان: c.title || "بدون عنوان",
          الرسائل: c.messages?.length || 0,
          "آخر تحديث": c.updated_at
            ? new Date(c.updated_at).toLocaleString("ar-EG")
            : "—",
        }));
      default:
        return [];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }

  function exportKeysToCSV() {
    const exportData = apiKeys.map((k) => ({
      الاسم: k.key_name || "",
      المفتاح: k.key_value || "",
      "الحد اليومي": k.daily_limit || DEFAULT_KEY_DAILY_LIMIT,
      "الاستهلاك اليومي": k.used_today || 0,
      الحالة: k.is_active ? "نشط" : "معطل",
      "صحة المفتاح": k.is_valid ? "صالح" : k.invalid_reason || "غير صالح",
    }));
    exportToCSV(exportData, "api_keys_export");
  }

  // ===== Users =====
  const filteredUsers = users.filter((u) => {
    if (u.id === user.id) return false;
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      u.name?.toLowerCase().includes(term) ||
      u.email?.toLowerCase().includes(term)
    );
  });

  async function openUserChatsModal(userId, userName) {
    const { data } = await supabase
      .from("chats")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });
    setSelectedUserForChats({ id: userId, name: userName });
    setUserChatsList(data || []);
    setShowUserChatsModal(true);
  }

  function openChatViewer(chat) {
    setSelectedChat(chat);
    setShowChatModal(true);
  }

  async function toggleUserBlock(userId, isBlocked) {
    await supabase
      .from("profiles")
      .update({ is_blocked: !isBlocked })
      .eq("id", userId);
    loadUsers();
  }

  async function deleteAllUserChats(userId, userName) {
    if (!confirm(`⚠️ حذف كل محادثات "${userName}"؟`)) return;
    await supabase.from("chats").delete().eq("user_id", userId);
    showToast(`تم حذف كل محادثات ${userName}`);
    loadAllChats();
    if (selectedUserForChats?.id === userId) setUserChatsList([]);
  }

  async function deleteUser(userId, userName) {
    if (!confirm(`⚠️ حذف "${userName}" نهائياً؟`)) return;
    await supabase.from("chats").delete().eq("user_id", userId);
    await supabase.from("profiles").delete().eq("id", userId);
    showToast(`تم حذف ${userName}`);
    loadUsers();
    loadAllChats();
  }

  async function saveUserSettings() {
    if (!selectedUser) return;
    await supabase
      .from("profiles")
      .update({ daily_limit: editDailyLimit })
      .eq("id", selectedUser.id);
    showToast("تم حفظ الإعدادات");
    setShowEditUserModal(false);
    loadUsers();
  }

  async function changePersonality(userId, personality) {
    await supabase.from("profiles").update({ personality }).eq("id", userId);
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, personality } : u))
    );
    showToast("تم تغيير الشخصية");
  }

  // ===== Keys =====
  async function validateNewKeyBeforeAdd(keyValue) {
    setValidating(true);
    const result = await validateGroqKey(keyValue);
    setValidating(false);
    // خطأ مؤقت (شبكة/حد معدل) لا يمنع الإضافة، والفحص اللاحق سيحدّد الحالة
    if (!result.valid && !result.transient) {
      showToast(`❌ ${result.reason}`, "error");
      return false;
    }
    if (result.transient) {
      showToast("⚠️ تعذر التحقق الآن، سيُفحص المفتاح لاحقًا", "error");
    }
    return true;
  }

  async function addApiKey() {
    if (!newKeyValue.trim()) {
      showToast("أدخل قيمة المفتاح", "error");
      return;
    }
    if (apiKeys.some((k) => k.key_value === newKeyValue.trim())) {
      showToast("❌ المفتاح موجود", "error");
      return;
    }
    if (!(await validateNewKeyBeforeAdd(newKeyValue.trim()))) return;

    const { error } = await supabase.from("api_keys").insert({
      key_value: newKeyValue.trim(),
      key_name: newKeyName.trim() || "مفتاح Groq",
      daily_limit: newKeyLimit,
      used_today: 0,
      is_active: true,
      is_valid: true,
      last_checked_at: new Date().toISOString(),
    });

    if (error) showToast("خطأ: " + error.message, "error");
    else {
      showToast("✅ تم إضافة المفتاح");
      setShowAddKeyModal(false);
      setNewKeyValue("");
      setNewKeyName("");
      setNewKeyLimit(DEFAULT_KEY_DAILY_LIMIT);
      loadApiKeys();
    }
  }

  async function deleteKey(keyId) {
    if (!confirm("حذف هذا المفتاح؟")) return;
    await supabase.from("api_keys").delete().eq("id", keyId);
    loadApiKeys();
    showToast("تم الحذف");
  }

  async function toggleKeyStatus(keyId, currentStatus) {
    await supabase
      .from("api_keys")
      .update({ is_active: !currentStatus })
      .eq("id", keyId);
    loadApiKeys();
  }

  async function resetKeyUsage(keyId) {
    await supabase.from("api_keys").update({ used_today: 0 }).eq("id", keyId);
    loadApiKeys();
    showToast("تم التصفير");
  }

  async function testSingleKey(keyItem) {
    setValidating(true);
    const result = await testSingleKeyAndUpdate(keyItem.id, keyItem.key_value);
    loadApiKeys();
    showToast(
      result.valid ? "✅ صالح" : `❌ ${result.reason}`,
      result.valid ? "success" : "error"
    );
    setValidating(false);
  }

  async function reactivateKey(keyId) {
    await supabase
      .from("api_keys")
      .update({ is_active: true, is_valid: true, invalid_reason: null })
      .eq("id", keyId);
    loadApiKeys();
    showToast("✅ تم إعادة التفعيل");
  }

  async function handleValidateKeys(silent = false) {
    if (!silent) setValidating(true);
    setValidationResults([]);
    await validateAllKeys(
      (current, total, name, result) => {
        setValidationProgress({
          current,
          total,
          name,
          status: result.transient ? "⚠️" : result.valid ? "✅" : "❌",
        });
      },
      (results) => {
        setValidationResults(results);
        if (!silent) {
          setValidating(false);
          setShowValidationModal(true);
        }
        loadApiKeys();
      }
    );
  }

  async function loadValidationLogs() {
    const { data } = await supabase
      .from("key_check_logs")
      .select("*")
      .order("checked_at", { ascending: false })
      .limit(50);
    if (data) setValidationLogs(data);
  }

  function toggleAutoValidate() {
    const newValue = !autoValidate;
    setAutoValidate(newValue);
    localStorage.setItem("auto_validate_keys", String(newValue));
    showToast(
      newValue ? "🟢 تم تفعيل الفحص التلقائي" : "⚫ تم إيقاف الفحص التلقائي",
      "info"
    );
  }

  // ===== ✅ Filtered chats: احتفظنا بها لحساب العدد فقط =====
  // (ChatsTab يفلتر داخليًا)
  const filteredChats = allChats;

  // ===== JSX =====
  return (
    <div className="adm" data-theme={darkMode ? "dark" : "light"} dir="rtl">
      {toast && (
        <div className={`ui-toast ${toast.type === "error" ? "ui-toast--error" : toast.type === "info" ? "ui-toast--info" : ""}`} role="status">
          {toast.message}
        </div>
      )}

      <AdminShell
        user={user}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        darkMode={darkMode}
        onToggleTheme={() => {
          const next = !darkMode;
          setDarkMode(next);
          localStorage.setItem("adminDarkMode", String(next));
        }}
        onShowExport={() => {
          setExportType("users");
          setShowExportModal(true);
        }}
        exportKeysToCSV={exportKeysToCSV}
        onLogout={onLogout}
        counts={{
          users: users.length,
          keys: `${apiKeys.filter((k) => k.is_active).length}/${apiKeys.length}`,
          chats: allChats.length,
        }}
      >
        {activeTab === "overview" && (
          <OverviewTab
            users={users}
            apiKeys={apiKeys}
            allChats={allChats}
            isUserOnline={isUserOnline}
            onGo={setActiveTab}
          />
        )}
        {activeTab === "users" && (
          <UsersTab
            user={user}
            users={users}
            filteredUsers={filteredUsers}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            theme={theme}
            darkMode={darkMode}
            isMobile={isMobile}
            isTablet={isTablet}
            inputStyle={inputStyle}
            isUserOnline={isUserOnline}
            changePersonality={changePersonality}
            toggleUserBlock={toggleUserBlock}
            deleteUser={deleteUser}
            onEditUser={(u) => {
              setSelectedUser(u);
              setEditDailyLimit(u.daily_limit || 5000);
              setShowEditUserModal(true);
            }}
            onRefresh={loadAllData}
          />
        )}

        {activeTab === "keys" && (
          <KeysTab
            apiKeys={apiKeys}
            theme={theme}
            darkMode={darkMode}
            isMobile={isMobile}
            isTablet={isTablet}
            validating={validating}
            validationProgress={validationProgress}
            autoValidate={autoValidate}
            toggleAutoValidate={toggleAutoValidate}
            handleValidateKeys={handleValidateKeys}
            onShowAddKey={() => setShowAddKeyModal(true)}
            onShowLogs={() => {
              loadValidationLogs();
              setShowLogsModal(true);
            }}
            exportKeysToCSV={exportKeysToCSV}
            onTestKey={testSingleKey}
            onResetKey={resetKeyUsage}
            onToggleKey={toggleKeyStatus}
            onDeleteKey={deleteKey}
            onReactivateKey={reactivateKey}
          />
        )}

        {activeTab === "chats" && (
          <ChatsTab
            allChats={allChats}
            users={users}
            theme={theme}
            darkMode={darkMode}
            isMobile={isMobile}
            isTablet={isTablet}
            inputStyle={inputStyle}
            getUserById={getUserById}
            onRefresh={loadAllChats}
            onOpenUserChats={openUserChatsModal}
            onDeleteAll={deleteAllChatsConfirm}
          />
        )}
      </AdminShell>

      {/* Modals */}
      <AddKeyModal
        show={showAddKeyModal}
        onClose={() => setShowAddKeyModal(false)}
        onAdd={addApiKey}
        newKeyName={newKeyName}
        setNewKeyName={setNewKeyName}
        newKeyValue={newKeyValue}
        setNewKeyValue={setNewKeyValue}
        newKeyLimit={newKeyLimit}
        setNewKeyLimit={setNewKeyLimit}
        validating={validating}
        theme={theme}
        isMobile={isMobile}
        modalInputStyle={modalInputStyle}
      />

      <EditUserModal
        show={showEditUserModal}
        onClose={() => setShowEditUserModal(false)}
        onSave={saveUserSettings}
        selectedUser={selectedUser}
        editDailyLimit={editDailyLimit}
        setEditDailyLimit={setEditDailyLimit}
        theme={theme}
        isMobile={isMobile}
        modalInputStyle={modalInputStyle}
      />

      <ExportModal
        show={showExportModal}
        onClose={() => setShowExportModal(false)}
        exportType={exportType}
        setExportType={setExportType}
        prepareExportData={prepareExportData}
        exportToCSV={exportToCSV}
        theme={theme}
        isMobile={isMobile}
        modalInputStyle={modalInputStyle}
      />

      <ValidationModal
        show={showValidationModal}
        onClose={() => setShowValidationModal(false)}
        validationResults={validationResults}
        theme={theme}
        isMobile={isMobile}
      />

      <LogsModal
        show={showLogsModal}
        onClose={() => setShowLogsModal(false)}
        validationLogs={validationLogs}
        theme={theme}
        isMobile={isMobile}
      />

      <UserChatsModal
        show={showUserChatsModal}
        onClose={() => setShowUserChatsModal(false)}
        selectedUserForChats={selectedUserForChats}
        userChatsList={userChatsList}
        theme={theme}
        isMobile={isMobile}
        formatDate={formatDate}
        onOpenChat={openChatViewer}
        onDeleteChat={deleteChatFromModal}
        onDeleteAll={deleteAllUserChats}
      />

      <ChatViewerModal
        show={showChatModal}
        onClose={() => setShowChatModal(false)}
        selectedChat={selectedChat}
        theme={theme}
        darkMode={darkMode}
        isMobile={isMobile}
      />
    </div>
  );
}
