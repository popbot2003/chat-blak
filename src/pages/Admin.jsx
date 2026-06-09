// ============================================
// Admin.jsx
// لوحة تحكم المدير - إدارة المستخدمين والمفاتيح والمحادثات
// ============================================

import { useState, useEffect } from "react";
import { supabase } from '../lib/supabase';
import MessageContent from "../components/MessageContent";
import { formatDate, getUsagePercent, getUsageColor, truncate } from '../utils/helpers';

export default function Admin({ user, onLogout }) {
  // ========== حالة التطبيق ==========
  const [users, setUsers] = useState([]);
  const [apiKeys, setApiKeys] = useState([]);
  const [allChats, setAllChats] = useState([]);
  const [activeTab, setActiveTab] = useState("users");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  
  // حالة المودالات
  const [showAddKeyModal, setShowAddKeyModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [selectedChat, setSelectedChat] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  
  // حالة النماذج
  const [newKeyValue, setNewKeyValue] = useState("");
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyLimit, setNewKeyLimit] = useState(1000000);
  
  const [editDailyLimit, setEditDailyLimit] = useState(5000);
  
  // ========== تحميل البيانات ==========
  useEffect(() => {
    loadAllData();
  }, []);
  
  async function loadAllData() {
    setLoading(true);
    await Promise.all([
      loadUsers(),
      loadApiKeys(),
      loadAllChats()
    ]);
    setLoading(false);
  }
  
  async function loadUsers() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setUsers(data);
  }
  
  async function loadApiKeys() {
    const { data } = await supabase
      .from('api_keys')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setApiKeys(data);
  }
  
  async function loadAllChats() {
    const { data } = await supabase
      .from('chats')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(200);
    if (data) setAllChats(data);
  }
  
  // ========== دوال مساعدة ==========
  function getUserChats(userId) {
    return allChats.filter(chat => chat.user_id === userId);
  }
  
  function getUserById(userId) {
    return users.find(u => u.id === userId);
  }
  
  // فلترة المستخدمين حسب البحث
  const filteredUsers = users.filter(u => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      u.name?.toLowerCase().includes(term) ||
      u.email?.toLowerCase().includes(term)
    );
  });
  
  // ========== إدارة المفاتيح ==========
  async function addApiKey() {
    if (!newKeyValue.trim()) {
      alert("❌ أدخل قيمة المفتاح");
      return;
    }
    
    const { error } = await supabase
      .from('api_keys')
      .insert({
        key_value: newKeyValue.trim(),
        key_name: newKeyName.trim() || "مفتاح Groq",
        daily_limit: newKeyLimit,
        used_today: 0,
        is_active: true
      });
    
    if (error) {
      alert("❌ خطأ: " + error.message);
    } else {
      alert("✅ تم إضافة المفتاح");
      setShowAddKeyModal(false);
      setNewKeyValue("");
      setNewKeyName("");
      setNewKeyLimit(1000000);
      loadApiKeys();
    }
  }
  
  async function deleteKey(keyId) {
    if (!confirm("متأكد من حذف هذا المفتاح؟")) return;
    const { error } = await supabase
      .from('api_keys')
      .delete()
      .eq('id', keyId);
    if (!error) loadApiKeys();
  }
  
  async function toggleKeyStatus(keyId, currentStatus) {
    const { error } = await supabase
      .from('api_keys')
      .update({ is_active: !currentStatus })
      .eq('id', keyId);
    if (!error) loadApiKeys();
  }
  
  async function resetKeyUsage(keyId) {
    const { error } = await supabase
      .from('api_keys')
      .update({ used_today: 0 })
      .eq('id', keyId);
    if (!error) loadApiKeys();
  }
  
  // ========== إدارة المستخدمين ==========
  async function toggleUserBlock(userId, isBlocked) {
    const { error } = await supabase
      .from('profiles')
      .update({ is_blocked: !isBlocked })
      .eq('id', userId);
    if (!error) loadUsers();
  }
  
  async function deleteAllUserChats(userId, userName) {
    if (!confirm(`حذف كل محادثات ${userName}؟ لا يمكن التراجع!`)) return;
    const { error } = await supabase
      .from('chats')
      .delete()
      .eq('user_id', userId);
    if (!error) {
      alert("✅ تم حذف كل المحادثات");
      loadAllChats();
    }
  }
  
  async function deleteChat(chatId) {
    if (!confirm("حذف هذه المحادثة؟")) return;
    const { error } = await supabase
      .from('chats')
      .delete()
      .eq('id', chatId);
    if (!error) loadAllChats();
  }
  
  async function updateUserLimit(userId, dailyLimit) {
    const { error } = await supabase
      .from('profiles')
      .update({ daily_limit: dailyLimit })
      .eq('id', userId);
    if (!error) loadUsers();
  }
  
  async function saveUserSettings() {
    if (!selectedUser) return;
    
    const { error } = await supabase
      .from('profiles')
      .update({
        daily_limit: editDailyLimit
      })
      .eq('id', selectedUser.id);
    
    if (error) {
      alert("❌ خطأ: " + error.message);
    } else {
      alert("✅ تم حفظ الإعدادات");
      setShowEditUserModal(false);
      loadUsers();
    }
  }
  
  // ========== عرض المحادثات ==========
  function openChatModal(chat) {
    setSelectedChat(chat);
    setShowChatModal(true);
  }
  
  // ========== واجهة المستخدم ==========
  return (
    <div className="admin-page">
      {/* الهيدر */}
      <div className="admin-header">
        <div className="admin-header-inner">
          <span className="admin-header-icon">🖤</span>
          <div>
            <h1 className="admin-header-title">لوحة التحكم</h1>
            <p className="admin-header-sub">👑 {user.name || user.email}</p>
          </div>
        </div>
        <button onClick={onLogout} className="admin-logout-btn">تسجيل خروج</button>
      </div>
      
      {/* علامات التبويب */}
      <div className="admin-tabs">
        <button 
          className={`admin-tab ${activeTab === "users" ? "active" : ""}`}
          onClick={() => setActiveTab("users")}
        >
          👥 المستخدمين
        </button>
        <button 
          className={`admin-tab ${activeTab === "keys" ? "active" : ""}`}
          onClick={() => setActiveTab("keys")}
        >
          🔑 المفاتيح
        </button>
        <button 
          className={`admin-tab ${activeTab === "chats" ? "active" : ""}`}
          onClick={() => setActiveTab("chats")}
        >
          💬 المحادثات
        </button>
      </div>
      
      {/* ========== تبويب المستخدمين ========== */}
      {activeTab === "users" && (
        <div className="admin-table-wrapper">
          <div style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
            <h2>👥 قائمة المستخدمين</h2>
            <input
              type="text"
              placeholder="🔍 بحث بالاسم أو البريد..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: "10px 16px",
                borderRadius: "10px",
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.05)",
                color: "#e0e0e0",
                fontSize: "14px",
                minWidth: "200px"
              }}
            />
          </div>
          
          <div className="admin-overflow-x">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>المستخدم</th>
                  <th>الاستهلاك اليومي</th>
                  <th>المحادثات</th>
                  <th>الحالة</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => {
                  const chatCount = getUserChats(u.id).length;
                  const used = u.used_today || 0;
                  const limit = u.daily_limit || 5000;
                  const percent = getUsagePercent(used, limit);
                  const color = getUsageColor(percent);
                  
                  return (
                    <tr key={u.id}>
                      <td>
                        <strong>{u.name || "مستخدم"}</strong>
                        <br />
                        <span className="key-mono">{u.email}</span>
                      </td>
                       <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px", minWidth: "150px" }}>
                          <div style={{ fontSize: "12px" }}>
                            {used.toLocaleString()} / {limit.toLocaleString()} توكن
                          </div>
                          <div style={{ width: "100%", height: "4px", background: "rgba(255,255,255,0.1)", borderRadius: "2px", overflow: "hidden" }}>
                            <div style={{ width: percent + "%", height: "100%", background: color, transition: "width 0.3s" }} />
                          </div>
                          <div style={{ fontSize: "10px", opacity: 0.6 }}>
                            {percent.toFixed(0)}%
                          </div>
                        </div>
                       </td>
                       <td>
                        <button
                          onClick={() => {
                            const chat = { user_id: u.id, title: "محادثات " + u.name, messages: [] };
                            setSelectedChat(chat);
                            setShowChatModal(true);
                          }}
                          className="admin-btn admin-badge-yellow"
                        >
                          💬 {chatCount}
                        </button>
                       </td>
                       <td>
                        <span className={`admin-badge ${u.is_blocked ? "admin-badge-red" : "admin-badge-green"}`}>
                          {u.is_blocked ? "محظور" : "نشط"}
                        </span>
                       </td>
                      <td className="admin-td-actions">
                        <button
                          onClick={() => {
                            setSelectedUser(u);
                            setEditDailyLimit(u.daily_limit || 5000);
                            setShowEditUserModal(true);
                          }}
                          className="admin-btn admin-btn-yellow"
                          title="تعديل الحد"
                        >
                          ⚙️
                        </button>
                        <button
                          onClick={() => toggleUserBlock(u.id, u.is_blocked)}
                          className={`admin-btn ${u.is_blocked ? "admin-btn-green" : "admin-btn-red"}`}
                        >
                          {u.is_blocked ? "فك الحظر" : "حظر"}
                        </button>
                        <button
                          onClick={() => deleteAllUserChats(u.id, u.name || u.email)}
                          className="admin-btn admin-btn-red"
                          title="حذف كل المحادثات"
                        >
                          🗑️ محادثات
                        </button>
                       </td>
                     </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* ========== تبويب المفاتيح ========== */}
      {activeTab === "keys" && (
        <div className="admin-table-wrapper">
          <div className="admin-section-head">
            <h2>🔑 مفاتيح API العامة</h2>
            <button onClick={() => setShowAddKeyModal(true)} className="admin-add-btn">
              ➕ إضافة مفتاح
            </button>
          </div>
          
          <div className="admin-overflow-x">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>الاسم</th>
                  <th>المفتاح</th>
                  <th>الاستهلاك</th>
                  <th>الحد</th>
                  <th>الحالة</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {apiKeys.map(key => {
                  const percent = (key.used_today / key.daily_limit) * 100;
                  return (
                    <tr key={key.id}>
                       <td>{key.key_name || "مفتاح Groq"}</td>
                       <td>
                        <span className="key-mono">{key.key_value?.slice(0, 20)}...</span>
                       </td>
                       <td>
                        <div>{key.used_today?.toLocaleString()}</div>
                        <div className="key-usage-bar">
                          <div
                            className={`key-usage-fill ${percent < 50 ? "low" : "high"}`}
                            style={{ width: Math.min(percent, 100) + "%" }}
                          />
                        </div>
                       </td>
                       <td>{key.daily_limit?.toLocaleString()}</td>
                       <td>
                        <button
                          onClick={() => toggleKeyStatus(key.id, key.is_active)}
                          className={`admin-badge ${key.is_active ? "admin-badge-green" : "admin-badge-red"}`}
                        >
                          {key.is_active ? "نشط" : "معطل"}
                        </button>
                       </td>
                      <td className="admin-td-actions-tight">
                        <button onClick={() => resetKeyUsage(key.id)} className="admin-btn admin-btn-yellow" title="إعادة ضبط">🔄</button>
                        <button onClick={() => deleteKey(key.id)} className="admin-btn admin-btn-red" title="حذف">🗑️</button>
                       </td>
                     </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* ========== تبويب المحادثات ========== */}
      {activeTab === "chats" && (
        <div className="admin-table-wrapper">
          <h2 style={{ marginBottom: "20px" }}>💬 محادثات المستخدمين</h2>
          
          <div className="admin-overflow-x">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>المستخدم</th>
                  <th>العنوان</th>
                  <th>الرسائل</th>
                  <th>آخر تحديث</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {allChats.map(chat => {
                  const chatUser = getUserById(chat.user_id);
                  return (
                    <tr key={chat.id}>
                       <td>{chatUser?.name || chatUser?.email || "غير معروف"}</td>
                      <td className="chat-title-cell">{truncate(chat.title, 50)}</td>
                       <td>{chat.messages?.length || 0}</td>
                      <td className="date-cell">{formatDate(chat.updated_at)}</td>
                      <td className="admin-td-actions-tight">
                        <button onClick={() => openChatModal(chat)} className="admin-btn admin-btn-purple admin-btn-icon" title="عرض">👁️</button>
                        <button onClick={() => deleteChat(chat.id)} className="admin-btn admin-btn-red admin-btn-icon" title="حذف">🗑️</button>
                       </td>
                     </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* ========== مودال إضافة مفتاح ========== */}
      {showAddKeyModal && (
        <div className="admin-modal">
          <div className="admin-modal-content">
            <h3 style={{ marginBottom: "20px" }}>➕ إضافة مفتاح API عام</h3>
            <input
              className="admin-input"
              type="text"
              placeholder="اسم المفتاح (مثال: Groq الرئيسي)"
              value={newKeyName}
              onChange={e => setNewKeyName(e.target.value)}
            />
            <input
              className="admin-input key-mono"
              type="text"
              placeholder="gsk_xxxxxxxxxxxx"
              value={newKeyValue}
              onChange={e => setNewKeyValue(e.target.value)}
            />
            <input
              className="admin-input"
              type="number"
              placeholder="الحد اليومي (توكن)"
              value={newKeyLimit}
              onChange={e => setNewKeyLimit(parseInt(e.target.value) || 0)}
            />
            <div className="admin-modal-actions">
              <button onClick={addApiKey} className="admin-modal-save-btn">✅ إضافة</button>
              <button onClick={() => setShowAddKeyModal(false)} className="admin-modal-cancel-btn">إلغاء</button>
            </div>
          </div>
        </div>
      )}
      
      {/* ========== مودال تعديل المستخدم ========== */}
      {showEditUserModal && selectedUser && (
        <div className="admin-modal">
          <div className="admin-modal-content">
            <h3 style={{ marginBottom: "20px" }}>⚙️ تعديل حد {selectedUser.name || selectedUser.email}</h3>
            <label style={{ fontSize: "13px", opacity: 0.7, marginBottom: "5px", display: "block" }}>الحد اليومي (توكن)</label>
            <input
              className="admin-input"
              type="number"
              value={editDailyLimit}
              onChange={e => setEditDailyLimit(parseInt(e.target.value) || 0)}
              placeholder="الحد اليومي"
            />
            <div className="admin-modal-actions">
              <button onClick={saveUserSettings} className="admin-modal-save-btn">💾 حفظ</button>
              <button onClick={() => setShowEditUserModal(false)} className="admin-modal-cancel-btn">إلغاء</button>
            </div>
          </div>
        </div>
      )}
      
      {/* ========== مودال عرض المحادثة ========== */}
      {showChatModal && selectedChat && (
        <div className="admin-modal">
          <div className="admin-modal-content" style={{ maxWidth: "700px", maxHeight: "80vh", overflowY: "auto" }}>
            <div className="admin-modal-head">
              <h3>💬 {selectedChat.title || "محادثة"}</h3>
              <button onClick={() => setShowChatModal(false)} className="close-btn">✕</button>
            </div>
            <div style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
              {selectedChat.messages?.map((msg, idx) => (
                <div key={idx} style={{
                  background: msg.role === "user" ? "rgba(108,92,231,0.1)" : "rgba(255,255,255,0.03)",
                  padding: "12px",
                  borderRadius: "12px",
                  borderRight: msg.role === "user" ? "3px solid #6c5ce7" : "none"
                }}>
                  <div style={{ fontSize: "12px", opacity: 0.6, marginBottom: "8px" }}>
                    {msg.role === "user" ? "👤 المستخدم" : "🖤 بلاك"}
                  </div>
                  <div style={{ fontSize: "14px", lineHeight: 1.6 }}>
                    <MessageContent content={msg.content} />
                  </div>
                </div>
              ))}
            </div>
            <div className="admin-modal-actions" style={{ marginTop: "20px" }}>
              <button onClick={() => setShowChatModal(false)} className="admin-modal-cancel-btn">إغلاق</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
