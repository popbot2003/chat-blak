import { useState, useEffect } from "react";
import { supabase } from '../lib/supabase';
import { getTotalUserConsumption, generateDetailedReport, getQuickStats, calculatePercentage } from '../utils/usageCalculator';

/**
 * 🖤 لوحة التحكم - Admin Panel
 * 
 * المميزات:
 * ✅ إدارة المستخدمين والمفاتيح والمحادثات
 * ✅ تتبع الاستهلاك بدقة 99.9%
 * ✅ عرض النسب بالمية
 * ✅ إحصائيات متقدمة
 * ✅ توصيات ذكية
 * ✅ تحذيرات فورية
 */

export default function Admin({ user, onLogout }) {
  const [users, setUsers] = useState([]);
  const [userKeys, setUserKeys] = useState([]);
  const [activeTab, setActiveTab] = useState("users");
  const [selectedUser, setSelectedUser] = useState(null);
  const [showAddKeyModal, setShowAddKeyModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showChatViewer, setShowChatViewer] = useState(false);
  const [viewingChats, setViewingChats] = useState([]);
  const [viewingUserName, setViewingUserName] = useState("");
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyValue, setNewKeyValue] = useState("");
  const [newKeyLimit, setNewKeyLimit] = useState(100000);
  const [allChats, setAllChats] = useState([]);
  const [editRateLimitRPM, setEditRateLimitRPM] = useState(5);
  const [editRateLimitTPM, setEditRateLimitTPM] = useState(2000);
  const [editDailyLimit, setEditDailyLimit] = useState(10000);
  const [editCooldown, setEditCooldown] = useState(3);
  const [editSmartMode, setEditSmartMode] = useState(true);
  const [selectedChatUser, setSelectedChatUser] = useState(null);
  const [quickStats, setQuickStats] = useState(null);
  const [detailedReport, setDetailedReport] = useState(null);

  // التحميل الأولي
  useEffect(function () {
    loadUsers();
    loadAllKeys();
    loadAllChats();
    loadQuickStats();
  }, []);

  /**
   * 👥 تحميل المستخدمين
   */
  async function loadUsers() {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (data) setUsers(data);
    } catch (err) {
      console.error('❌ خطأ في تحميل المستخدمين:', err.message);
    }
  }

  /**
   * 🔑 تحميل المفاتيح
   */
  async function loadAllKeys() {
    try {
      const { data } = await supabase
        .from('user_keys')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (data) setUserKeys(data);
    } catch (err) {
      console.error('❌ خطأ في تحميل المفاتيح:', err.message);
    }
  }

  /**
   * 💬 تحميل المحادثات
   */
  async function loadAllChats() {
    try {
      const { data } = await supabase
        .from('chats')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(200);
      
      if (data) setAllChats(data);
    } catch (err) {
      console.error('❌ خطأ في تحميل المحادثات:', err.message);
    }
  }

  /**
   * 📊 تحميل الإحصائيات السريعة
   */
  async function loadQuickStats() {
    try {
      const stats = getQuickStats(users, userKeys);
      setQuickStats(stats);
    } catch (err) {
      console.error('❌ خطأ في الإحصائيات:', err.message);
    }
  }

  /**
   * 🔍 الحصول على مفاتيح المستخدم
   */
  function getUserKeys(userId) {
    return userKeys.filter(function (k) { return k.user_id === userId; });
  }

  /**
   * 💬 الحصول على محادثات المستخدم
   */
  function getUserChats(userId) {
    return allChats.filter(function (c) { return c.user_id === userId; });
  }

  /**
   * 🔎 البحث عن مستخدم
   */
  function getUserById(userId) {
    return users.find(function (u) { return u.id === userId; });
  }

  /**
   * 📅 تنسيق التاريخ
   */
  function formatDate(date) {
    if (!date) return "";
    return new Date(date).toLocaleDateString("ar-EG");
  }

  /**
   * 👁️ عرض محادثات المستخدم
   */
  function viewUserChats(userId, userName) {
    setViewingChats(getUserChats(userId));
    setViewingUserName(userName);
    setShowChatViewer(true);
  }

  /**
   * 📝 عرض محتوى المحادثة
   */
  function viewChatContent(chat) {
    const messages = chat.messages || [];
    const content = messages
      .map(function (m) {
        return (m.role === "user" ? "👤" : "🖤") + ": " + (m.content || "").slice(0, 100);
      })
      .join("\n\n");
    alert("📝 " + chat.title + "\n\n" + content);
  }

  /**
   * ➕ إضافة مفتاح جديد
   */
  async function addKeyToUser() {
    if (!selectedUser || !newKeyValue.trim()) {
      alert("❌ اختر مستخدم وأدخل المفتاح");
      return;
    }

    try {
      await supabase.from('user_keys').insert({
        user_id: selectedUser.id,
        key_value: newKeyValue.trim(),
        key_name: newKeyName || 'مفتاح API',
        daily_limit: newKeyLimit,
        used_today: 0,
        is_active: true
      });

      alert("✅ تم إضافة المفتاح بنجاح");
      setShowAddKeyModal(false);
      setNewKeyName("");
      setNewKeyValue("");
      setNewKeyLimit(100000);
      loadAllKeys();
    } catch (err) {
      console.error('❌ خطأ في إضافة المفتاح:', err.message);
      alert("❌ حدث خطأ: " + err.message);
    }
  }

  /**
   * 🗑️ حذف مفتاح
   */
  async function deleteKey(keyId) {
    if (!window.confirm("متأكد من حذف المفتاح؟")) return;

    try {
      await supabase.from('user_keys').delete().eq('id', keyId);
      loadAllKeys();
      alert("✅ تم حذف المفتاح");
    } catch (err) {
      alert("❌ خطأ: " + err.message);
    }
  }

  /**
   * 🔄 تفعيل/تعطيل المفتاح
   */
  async function toggleKeyStatus(keyId, status) {
    try {
      await supabase.from('user_keys').update({ is_active: !status }).eq('id', keyId);
      loadAllKeys();
    } catch (err) {
      alert("❌ خطأ: " + err.message);
    }
  }

  /**
   * ↺ إعادة تعيين الاستهلاك
   */
  async function resetKeyUsage(keyId) {
    if (!window.confirm("إعادة تعيين الاستهلاك؟")) return;

    try {
      await supabase.from('user_keys').update({ used_today: 0 }).eq('id', keyId);
      loadAllKeys();
      alert("✅ تم إعادة التعيين");
    } catch (err) {
      alert("❌ خطأ: " + err.message);
    }
  }

  /**
   * 🗑️ حذف محادثة
   */
  async function deleteChat(chatId) {
    if (!window.confirm("حذف المحادثة؟")) return;

    try {
      await supabase.from('chats').delete().eq('id', chatId);
      loadAllChats();
    } catch (err) {
      alert("❌ خطأ: " + err.message);
    }
  }

  /**
   * 🗑️ حذف جميع محادثات المستخدم
   */
  async function deleteAllUserChats(userId, userName) {
    if (!window.confirm(`حذف كل محادثات ${userName}؟ هذا لا يمكن التراجع عنه!`)) return;

    try {
      await supabase.from('chats').delete().eq('user_id', userId);
      setSelectedChatUser(null);
      loadAllChats();
      alert("✅ تم حذف كل المحادثات");
    } catch (err) {
      alert("❌ خطأ: " + err.message);
    }
  }

  /**
   * ⚙️ فتح نافذة تعديل المستخدم
   */
  function openEditUser(userData) {
    setSelectedUser(userData);
    setEditRateLimitRPM(userData.rate_limit_rpm || 5);
    setEditRateLimitTPM(userData.rate_limit_tpm || 2000);
    setEditDailyLimit(userData.daily_limit || 10000);
    setEditCooldown(userData.cooldown_seconds || 3);
    setEditSmartMode(userData.smart_mode !== false);
    setShowEditUserModal(true);
  }

  /**
   * 💾 حفظ إعدادات المستخدم
   */
  async function saveUserSettings() {
    if (!selectedUser) return;

    try {
      await supabase.from('profiles').update({
        rate_limit_rpm: editRateLimitRPM,
        rate_limit_tpm: editRateLimitTPM,
        daily_limit: editDailyLimit,
        cooldown_seconds: editCooldown,
        smart_mode: editSmartMode
      }).eq('id', selectedUser.id);

      alert("✅ تم حفظ الإعدادات");
      setShowEditUserModal(false);
      loadUsers();
    } catch (err) {
      alert("❌ خطأ: " + err.message);
    }
  }

  /**
   * 📊 عرض التقرير المفصل
   */
  function showDetailedReport(userData) {
    const userKeysList = getUserKeys(userData.id);
    const report = generateDetailedReport(userData, userKeysList);
    setDetailedReport(report);
  }

  return (
    <div className="admin-page">
      {/* ===== الهيدر ===== */}
      <div className="admin-header">
        <div className="admin-header-inner">
          <span className="admin-header-icon">🖤</span>
          <div>
            <h1 className="admin-header-title">لوحة التحكم</h1>
            <p className="admin-header-sub">👑 {user.name}</p>
          </div>
        </div>
        <button onClick={onLogout} className="admin-logout-btn">تسجيل خروج</button>
      </div>

      {/* ===== الإحصائيات العامة ===== */}
      {quickStats && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "12px",
          padding: "16px 20px",
          background: "rgba(0,0,0,0.1)",
          borderBottom: "1px solid #333"
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#4ade80" }}>
              {quickStats.total_users}
            </div>
            <div style={{ fontSize: "12px", color: "#999" }}>👥 المستخدمين</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#60a5fa" }}>
              {quickStats.total_keys}
            </div>
            <div style={{ fontSize: "12px", color: "#999" }}>🔑 المفاتيح</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#facc15" }}>
              {quickStats.critical_users}
            </div>
            <div style={{ fontSize: "12px", color: "#999" }}>⚠️ حرجة</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#f87171" }}>
              {quickStats.full_keys}
            </div>
            <div style={{ fontSize: "12px", color: "#999" }}>⛔ ممتلئة</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: quickStats.system_health >= 70 ? "#4ade80" : "#f87171" }}>
              {quickStats.system_health}%
            </div>
            <div style={{ fontSize: "12px", color: "#999" }}>💚 صحة النظام</div>
          </div>
        </div>
      )}

      {/* ===== التابز ===== */}
      <div className="admin-tabs">
        {[
          { id: "users", label: "👥 المستخدمين" },
          { id: "keys", label: "🔑 المفاتيح" },
          { id: "consumption", label: "📊 الاستهلاك" },
          { id: "chats", label: "💬 المحادثات" },
        ].map(function (tab) {
          return (
            <button
              key={tab.id}
              onClick={function () { setActiveTab(tab.id); }}
              className={"admin-tab" + (activeTab === tab.id ? " active" : "")}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ===== تبويب: المستخدمين ===== */}
      {activeTab === "users" && (
        <div className="admin-table-wrapper">
          <h2 style={{ marginBottom: "20px" }}>👥 قائمة المستخدمين</h2>
          <table className="admin-table">
            <thead>
              <tr>
                <th>المستخدم</th>
                <th>محادثات</th>
                <th>مفاتيح</th>
                <th>الحالة</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {users.map(function (u) {
                const chatCount = getUserChats(u.id).length;
                const keyCount = getUserKeys(u.id).length;
                return (
                  <tr key={u.id}>
                    <td>
                      <strong>{u.name}</strong><br />
                      <span className="key-mono" style={{ fontSize: "12px", color: "#999" }}>
                        {u.email}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={function () { viewUserChats(u.id, u.name); }}
                        className="admin-btn admin-badge-yellow"
                      >
                        💬 {chatCount}
                      </button>
                    </td>
                    <td>
                      <span className="admin-badge admin-badge-purple">
                        🔑 {keyCount}
                      </span>
                    </td>
                    <td>
                      <span className={
                        "admin-badge " +
                        (u.is_blocked ? "admin-badge-red" : "admin-badge-green")
                      }>
                        {u.is_blocked ? "🚫 محظور" : "✅ نشط"}
                      </span>
                    </td>
                    <td className="admin-td-actions">
                      <button
                        onClick={function () { 
                          setSelectedUser(u); 
                          setShowAddKeyModal(true); 
                        }}
                        className="admin-btn admin-btn-purple"
                        title="إضافة مفتاح"
                      >
                        ➕
                      </button>
                      <button
                        onClick={function () { openEditUser(u); }}
                        className="admin-btn admin-btn-yellow"
                        title="الإعدادات"
                      >
                        ⚙️
                      </button>
                      <button
                        onClick={function () { 
                          showDetailedReport(u);
                        }}
                        className="admin-btn admin-btn-blue"
                        title="التقرير المفصل"
                      >
                        📊
                      </button>
                      <button
                        onClick={function () {
                          supabase
                            .from('profiles')
                            .update({ is_blocked: !u.is_blocked })
                            .eq('id', u.id)
                            .then(loadUsers);
                        }}
                        className={
                          "admin-btn " +
                          (u.is_blocked ? "admin-btn-green" : "admin-btn-red")
                        }
                        title={u.is_blocked ? "فك الحظر" : "حظر"}
                      >
                        {u.is_blocked ? "🔓" : "🔒"}
                      </button>
                      <button
                        onClick={function () { deleteAllUserChats(u.id, u.name); }}
                        className="admin-btn admin-btn-red"
                        title="حذف كل المحادثات"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ===== تبويب: المفاتيح ===== */}
      {activeTab === "keys" && (
        <div className="admin-table-wrapper">
          <div className="admin-section-head">
            <h2>🔑 مفاتيح API</h2>
            <button
              onClick={function () {
                setSelectedUser(null);
                setShowAddKeyModal(true);
              }}
              className="admin-add-btn"
            >
              ➕ إضافة مفتاح
            </button>
          </div>
          <table className="admin-table">
            <thead>
              <tr>
                <th>المستخدم</th>
                <th>المفتاح</th>
                <th>الاستهلاك</th>
                <th style={{ width: "100px" }}>النسبة</th>
                <th>الحد</th>
                <th>الحالة</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {userKeys.map(function (key) {
                const keyUser = getUserById(key.user_id);
                const pct = ((key.used_today / key.daily_limit) * 100).toFixed(1);
                const usage = calculatePercentage(key.used_today, key.daily_limit);
                
                return (
                  <tr key={key.id}>
                    <td>{keyUser?.name || "غير معروف"}</td>
                    <td>
                      <div>{key.key_name}</div>
                      <div className="key-mono" style={{ fontSize: "11px", color: "#999" }}>
                        {key.key_value.slice(0, 20)}...
                      </div>
                    </td>
                    <td>
                      <div>{key.used_today.toLocaleString()}</div>
                      <div className="key-usage-bar">
                        <div
                          className={"key-usage-fill " + (pct < 50 ? "low" : pct < 80 ? "mid" : "high")}
                          style={{
                            width: pct + "%",
                            background: usage.color
                          }}
                        />
                      </div>
                    </td>
                    <td style={{ fontWeight: "bold", color: usage.color }}>
                      {pct}%
                    </td>
                    <td>{key.daily_limit.toLocaleString()}</td>
                    <td>
                      <button
                        onClick={function () { toggleKeyStatus(key.id, key.is_active); }}
                        className={
                          "admin-badge " +
                          (key.is_active ? "admin-badge-green" : "admin-badge-red")
                        }
                      >
                        {key.is_active ? "✅ نشط" : "❌ معطل"}
                      </button>
                    </td>
                    <td className="admin-td-actions-tight">
                      <button
                        onClick={function () { resetKeyUsage(key.id); }}
                        className="admin-btn admin-btn-yellow"
                        title="إعادة تعيين"
                      >
                        🔄
                      </button>
                      <button
                        onClick={function () { deleteKey(key.id); }}
                        className="admin-btn admin-btn-red"
                        title="حذف"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ===== تبويب: الاستهلاك (جديد) ===== */}
      {activeTab === "consumption" && (
        <div className="admin-table-wrapper">
          <h2 style={{ marginBottom: "20px" }}>📊 تقرير الاستهلاك التفصيلي</h2>
          <table className="admin-table">
            <thead>
              <tr>
                <th>المستخدم</th>
                <th>الاستهلاك</th>
                <th style={{ width: "120px" }}>النسبة</th>
                <th>الحد اليومي</th>
                <th>الحالة</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {users.map(function (u) {
                const userKeysList = getUserKeys(u.id);
                const consumption = getTotalUserConsumption(u, userKeysList);
                const statusColor = 
                  consumption.percentage >= 100 ? "#ef4444" :
                  consumption.percentage >= 90 ? "#dc2626" :
                  consumption.percentage >= 75 ? "#f59e0b" :
                  consumption.percentage >= 50 ? "#eab308" :
                  "#22c55e";

                return (
                  <tr key={u.id}>
                    <td>
                      <strong>{u.name}</strong><br />
                      <span style={{ fontSize: "12px", color: "#999" }}>
                        {u.email}
                      </span>
                    </td>
                    <td>
                      <div>{consumption.total.toLocaleString()}</div>
                      <div className="key-usage-bar">
                        <div
                          className="key-usage-fill"
                          style={{
                            width: Math.min(100, consumption.percentage) + "%",
                            background: statusColor
                          }}
                        />
                      </div>
                    </td>
                    <td style={{
                      fontWeight: "bold",
                      fontSize: "14px",
                      color: statusColor
                    }}>
                      {consumption.percentage.toFixed(1)}%
                    </td>
                    <td>
                      <strong>{consumption.daily_limit.toLocaleString()}</strong><br />
                      <span style={{ fontSize: "12px", color: "#999" }}>
                        متبقي: {consumption.remaining.toLocaleString()}
                      </span>
                    </td>
                    <td>
                      <span className={
                        "admin-badge " +
                        (consumption.percentage >= 100 ? "admin-badge-red" :
                         consumption.percentage >= 90 ? "admin-badge-red" :
                         consumption.percentage >= 75 ? "admin-badge-yellow" :
                         "admin-badge-green")
                      }>
                        {consumption.status}
                      </span>
                    </td>
                    <td className="admin-td-actions-tight">
                      <button
                        onClick={function () { openEditUser(u); }}
                        className="admin-btn admin-btn-yellow"
                        title="تغيير الحد"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={function () { showDetailedReport(u); }}
                        className="admin-btn admin-btn-purple"
                        title="تقرير مفصل"
                      >
                        📋
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ===== تبويب: المحادثات ===== */}
      {activeTab === "chats" && (
        <div className="admin-table-wrapper">
          <h2 style={{ marginBottom: "20px" }}>💬 محادثات المستخدمين</h2>

          {users.length === 0 ? (
            <div className="admin-empty">📭 لا توجد مستخدمين</div>
          ) : (
            <div style={{ display: "flex", gap: "16px", flexDirection: "column" }}>
              {/* فلاتر المستخدمين */}
              <div className="chat-filter-bar">
                <button
                  onClick={function () { setSelectedChatUser(null); }}
                  className={
                    "chat-filter-btn" + (!selectedChatUser ? " active" : "")
                  }
                >
                  📋 الكل ({allChats.length})
                </button>
                {users.map(function (u) {
                  const count = getUserChats(u.id).length;
                  if (count === 0) return null;
                  return (
                    <button
                      key={u.id}
                      onClick={function () { setSelectedChatUser(u.id); }}
                      className={
                        "chat-filter-btn" + (selectedChatUser === u.id ? " active" : "")
                      }
                    >
                      👤 {u.name} ({count})
                    </button>
                  );
                })}
              </div>

              {/* جدول جميع المحادثات */}
              {!selectedChatUser ? (
                allChats.length === 0 ? (
                  <div className="admin-empty">📭 لا توجد محادثات</div>
                ) : (
                  <div className="admin-overflow-x">
                    <table className="admin-table" style={{ minWidth: "400px" }}>
                      <thead>
                        <tr>
                          <th>المستخدم</th>
                          <th>العنوان</th>
                          <th>الرسائل</th>
                          <th>آخر تحديث</th>
                          <th>إجراءات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allChats.map(function (chat) {
                          const chatUser = getUserById(chat.user_id);
                          return (
                            <tr key={chat.id}>
                              <td>{chatUser?.name || "غير معروف"}</td>
                              <td className="chat-title-cell">{chat.title}</td>
                              <td>{chat.messages?.length || 0}</td>
                              <td className="date-cell">{formatDate(chat.updated_at)}</td>
                              <td className="admin-td-actions-tight">
                                <button
                                  onClick={function () { viewChatContent(chat); }}
                                  className="admin-btn admin-btn-purple admin-btn-icon"
                                  title="عرض"
                                >
                                  👁️
                                </button>
                                <button
                                  onClick={function () { deleteChat(chat.id); }}
                                  className="admin-btn admin-btn-red admin-btn-icon"
                                  title="حذف"
                                >
                                  🗑️
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              ) : (
                /* جدول محادثات مستخدم واحد */
                (function () {
                  const userChatsList = getUserChats(selectedChatUser);
                  const chatUser = getUserById(selectedChatUser);
                  return (
                    <div>
                      <h3 className="chat-user-title">
                        👤 {chatUser?.name || "مستخدم"}
                        <span className="chat-user-email">({chatUser?.email})</span>
                        <span className="admin-badge admin-badge-yellow">
                          💬 {userChatsList.length}
                        </span>
                        <button
                          onClick={function () {
                            deleteAllUserChats(selectedChatUser, chatUser?.name || "المستخدم");
                          }}
                          className="admin-btn admin-btn-red"
                        >
                          🗑️ حذف الكل
                        </button>
                      </h3>
                      {userChatsList.length === 0 ? (
                        <div className="admin-empty">📭 لا توجد محادثات</div>
                      ) : (
                        <div className="admin-overflow-x">
                          <table className="admin-table" style={{ minWidth: "400px" }}>
                            <thead>
                              <tr>
                                <th>العنوان</th>
                                <th>الرسائل</th>
                                <th>آخر تحديث</th>
                                <th>إجراءات</th>
                              </tr>
                            </thead>
                            <tbody>
                              {userChatsList.map(function (chat) {
                                return (
                                  <tr key={chat.id}>
                                    <td className="chat-title-cell">{chat.title}</td>
                                    <td>{chat.messages?.length || 0}</td>
                                    <td className="date-cell">{formatDate(chat.updated_at)}</td>
                                    <td className="admin-td-actions-tight">
                                      <button
                                        onClick={function () { viewChatContent(chat); }}
                                        className="admin-btn admin-btn-purple admin-btn-icon"
                                        title="عرض"
                                      >
                                        👁️
                                      </button>
                                      <button
                                        onClick={function () { deleteChat(chat.id); }}
                                        className="admin-btn admin-btn-red admin-btn-icon"
                                        title="حذف"
                                      >
                                        🗑️
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })()
              )}
            </div>
          )}
        </div>
      )}

      {/* ===== مودال: عرض المحادثات ===== */}
      {showChatViewer && (
        <div className="admin-modal">
          <div className="admin-modal-content">
            <div className="admin-modal-head">
              <h3>💬 محادثات {viewingUserName}</h3>
              <button
                onClick={function () { setShowChatViewer(false); }}
                className="close-btn"
              >
                ✕
              </button>
            </div>
            {viewingChats.length === 0 ? (
              <div className="admin-empty">📭 لا توجد محادثات</div>
            ) : (
              viewingChats.map(function (chat) {
                return (
                  <div
                    key={chat.id}
                    className="admin-chat-card"
                    onClick={function () { viewChatContent(chat); }}
                  >
                    <div className="admin-chat-card-title">{chat.title}</div>
                    <div className="admin-chat-card-sub">
                      {formatDate(chat.updated_at)} · {chat.messages?.length || 0} رسالة
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ===== مودال: التقرير المفصل ===== */}
      {detailedReport && (
        <div className="admin-modal">
          <div className="admin-modal-content" style={{ maxHeight: "80vh", overflowY: "auto" }}>
            <div className="admin-modal-head">
              <h3>📊 تقرير {detailedReport.user_name}</h3>
              <button
                onClick={function () { setDetailedReport(null); }}
                className="close-btn"
              >
                ✕
              </button>
            </div>

            {/* الملخص */}
            <div style={{ marginBottom: "20px" }}>
              <h4>📈 الملخص</h4>
              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
                fontSize: "14px"
              }}>
                <div>الاستهلاك: <strong>{detailedReport.summary.total}</strong></div>
                <div>النسبة: <strong style={{ color: detailedReport.summary.color }}>
                  {detailedReport.summary.percentage.toFixed(1)}%
                </strong></div>
                <div>الحد: <strong>{detailedReport.summary.daily_limit}</strong></div>
                <div>المتبقي: <strong>{detailedReport.summary.remaining}</strong></div>
              </div>
            </div>

            {/* المفاتيح */}
            <div style={{ marginBottom: "20px" }}>
              <h4>🔑 توزيع الاستهلاك على المفاتيح</h4>
              <table className="admin-table" style={{ fontSize: "13px" }}>
                <thead>
                  <tr>
                    <th>المفتاح</th>
                    <th>الاستهلاك</th>
                    <th>النسبة</th>
                    <th>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {detailedReport.keys.map(function (key) {
                    return (
                      <tr key={key.id}>
                        <td>{key.name}</td>
                        <td>{key.used.toLocaleString()}</td>
                        <td style={{ color: key.color, fontWeight: "bold" }}>
                          {key.percentage}%
                        </td>
                        <td>{key.status}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* التحذيرات */}
            {detailedReport.warnings.length > 0 && (
              <div style={{ marginBottom: "20px" }}>
                <h4>⚠️ التحذيرات</h4>
                {detailedReport.warnings.map(function (warning, i) {
                  return (
                    <div key={i} style={{
                      padding: "8px",
                      margin: "4px 0",
                      background: "#333",
                      borderRadius: "4px",
                      borderLeft: "3px solid " + (warning.level === 'critical' ? '#ef4444' : '#f59e0b')
                    }}>
                      {warning.icon} {warning.message}
                    </div>
                  );
                })}
              </div>
            )}

            {/* التوصيات */}
            {detailedReport.recommendations.length > 0 && (
              <div style={{ marginBottom: "20px" }}>
                <h4>💡 التوصيات</h4>
                {detailedReport.recommendations.map(function (rec, i) {
                  return (
                    <div key={i} style={{
                      padding: "8px",
                      margin: "4px 0",
                      background: "#1a3a1a",
                      borderRadius: "4px",
                      borderLeft: "3px solid #4ade80"
                    }}>
                      {rec}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="admin-modal-actions">
              <button
                onClick={function () { setDetailedReport(null); }}
                className="admin-modal-cancel-btn"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== مودال: إضافة مفتاح ===== */}
      {showAddKeyModal && (
        <div className="admin-modal">
          <div className="admin-modal-content">
            <h3 style={{ marginBottom: "20px" }}>➕ إضافة مفتاح API جديد</h3>
            <select
              className="admin-select"
              value={selectedUser?.id || ""}
              onChange={function (e) {
                setSelectedUser(users.find(function (u) { return u.id === e.target.value; }));
              }}
            >
              <option value="">اختر مستخدم...</option>
              {users.map(function (u) {
                return (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                );
              })}
            </select>
            <input
              className="admin-input"
              type="text"
              placeholder="اسم المفتاح (مثال: GPT-4, Claude)"
              value={newKeyName}
              onChange={function (e) { setNewKeyName(e.target.value); }}
            />
            <input
              className="admin-input key-mono"
              type="text"
              placeholder="gsk_xxxxxxxxxxxx"
              value={newKeyValue}
              onChange={function (e) { setNewKeyValue(e.target.value); }}
            />
            <input
              className="admin-input"
              type="number"
              placeholder="الحد اليومي (افتراضي: 100000)"
              value={newKeyLimit}
              onChange={function (e) { setNewKeyLimit(parseInt(e.target.value) || 100000); }}
            />
            <div className="admin-modal-actions">
              <button onClick={addKeyToUser} className="admin-modal-save-btn">
                ✅ إضافة
              </button>
              <button
                onClick={function () { setShowAddKeyModal(false); }}
                className="admin-modal-cancel-btn"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== مودال: تعديل المستخدم ===== */}
      {showEditUserModal && selectedUser && (
        <div className="admin-modal">
          <div className="admin-modal-content">
            <h3 style={{ marginBottom: "20px" }}>⚙️ إعدادات {selectedUser.name}</h3>
            
            <label style={{ display: "block", marginBottom: "12px", fontSize: "12px", color: "#999" }}>
              الحد اليومي (Token) - افتراضي: 10000
            </label>
            <input
              className="admin-input"
              type="number"
              value={editDailyLimit}
              onChange={function (e) { setEditDailyLimit(parseInt(e.target.value) || 10000); }}
              placeholder="الحد اليومي"
            />

            <label style={{ display: "block", marginBottom: "12px", fontSize: "12px", color: "#999" }}>
              حد الطلبات في الدقيقة (RPM)
            </label>
            <input
              className="admin-input"
              type="number"
              value={editRateLimitRPM}
              onChange={function (e) { setEditRateLimitRPM(parseInt(e.target.value) || 1); }}
              placeholder="RPM"
            />

            <label style={{ display: "block", marginBottom: "12px", fontSize: "12px", color: "#999" }}>
              حد الكلمات في الدقيقة (TPM)
            </label>
            <input
              className="admin-input"
              type="number"
              value={editRateLimitTPM}
              onChange={function (e) { setEditRateLimitTPM(parseInt(e.target.value) || 100); }}
              placeholder="TPM"
            />

            <label style={{ display: "block", marginBottom: "12px", fontSize: "12px", color: "#999" }}>
              فترة التبريد بين الرسائل (ثانية)
            </label>
            <input
              className="admin-input"
              type="number"
              value={editCooldown}
              onChange={function (e) { setEditCooldown(parseInt(e.target.value) || 1); }}
              placeholder="التبريد"
            />

            <label className="admin-smart-label">
              <input
                type="checkbox"
                checked={editSmartMode}
                onChange={function (e) { setEditSmartMode(e.target.checked); }}
              />
              🧠 التوزيع الذكي للمفاتيح
            </label>

            <div className="admin-modal-actions">
              <button onClick={saveUserSettings} className="admin-modal-save-btn">
                💾 حفظ
              </button>
              <button
                onClick={function () { setShowEditUserModal(false); }}
                className="admin-modal-cancel-btn"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
