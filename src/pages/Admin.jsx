import { useState, useEffect } from "react";
import { supabase } from '../lib/supabase';

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
  const [newKeyLimit, setNewKeyLimit] = useState(5000);
  const [allChats, setAllChats] = useState([]);

  const [editRateLimitRPM, setEditRateLimitRPM] = useState(5);
  const [editRateLimitTPM, setEditRateLimitTPM] = useState(2000);
  const [editDailyLimit, setEditDailyLimit] = useState(5000);
  const [editCooldown, setEditCooldown] = useState(3);
  const [editSmartMode, setEditSmartMode] = useState(true);
  const [editModel, setEditModel] = useState('llama-3.1-8b-instant');

  useEffect(function() { loadUsers(); loadAllKeys(); loadAllChats(); }, []);

  async function loadUsers() { const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false }); if (data) setUsers(data); }
  async function loadAllKeys() { const { data } = await supabase.from('user_keys').select('*').order('created_at', { ascending: false }); if (data) setUserKeys(data); }
  async function loadAllChats() { const { data } = await supabase.from('chats').select('*').order('updated_at', { ascending: false }).limit(100); if (data) setAllChats(data); }

  function getUserKeys(userId) { return userKeys.filter(function(key) { return key.user_id === userId; }); }
  function getUserChats(userId) { return allChats.filter(function(chat) { return chat.user_id === userId; }); }
  function getUserById(userId) { return users.find(function(u) { return u.id === userId; }); }
  function formatDate(date) { if (!date) return ""; return new Date(date).toLocaleDateString("ar-EG"); }

  function viewUserChats(userId, userName) {
    const chats = getUserChats(userId);
    setViewingChats(chats);
    setViewingUserName(userName);
    setShowChatViewer(true);
  }

  function viewChatContent(chat) {
    const messages = chat.messages || [];
    const content = messages.map(function(m) {
      return (m.role === "user" ? "👤" : "🖤") + ": " + (m.content || "").slice(0, 100);
    }).join("\n\n");
    alert("📝 " + chat.title + "\n\n" + content);
  }

  async function addKeyToUser() {
    if (!selectedUser || !newKeyValue.trim()) { alert("❌ اختر مستخدم وأدخل المفتاح"); return; }
    await supabase.from('user_keys').insert({ user_id: selectedUser.id, key_value: newKeyValue.trim(), key_name: newKeyName || 'مفتاح API', daily_limit: newKeyLimit, used_today: 0, is_active: true });
    alert("✅ تم إضافة المفتاح"); setShowAddKeyModal(false); loadAllKeys();
  }

  async function deleteKey(keyId) { if (!window.confirm("متأكد؟")) return; await supabase.from('user_keys').delete().eq('id', keyId); loadAllKeys(); }
  async function toggleKeyStatus(keyId, status) { await supabase.from('user_keys').update({ is_active: !status }).eq('id', keyId); loadAllKeys(); }
  async function resetKeyUsage(keyId) { await supabase.from('user_keys').update({ used_today: 0 }).eq('id', keyId); loadAllKeys(); }
  async function deleteChat(chatId) { if (!window.confirm("حذف المحادثة؟")) return; await supabase.from('chats').delete().eq('id', chatId); loadAllChats(); }

  function openEditUser(userData) {
    setSelectedUser(userData);
    setEditRateLimitRPM(userData.rate_limit_rpm || 5);
    setEditRateLimitTPM(userData.rate_limit_tpm || 2000);
    setEditDailyLimit(userData.daily_limit || 5000);
    setEditCooldown(userData.cooldown_seconds || 3);
    setEditSmartMode(userData.smart_mode !== false);
    setEditModel(userData.selected_model || 'llama-3.1-8b-instant');
    setShowEditUserModal(true);
  }

  async function saveUserSettings() {
    if (!selectedUser) return;
    await supabase.from('profiles').update({ rate_limit_rpm: editRateLimitRPM, rate_limit_tpm: editRateLimitTPM, daily_limit: editDailyLimit, cooldown_seconds: editCooldown, smart_mode: editSmartMode, selected_model: editModel }).eq('id', selectedUser.id);
    alert("✅ تم حفظ الإعدادات"); setShowEditUserModal(false); loadUsers();
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "30px" }}>🖤</span>
          <div>
            <h1 style={{ fontSize: "24px", margin: 0 }}>لوحة التحكم</h1>
            <p style={{ opacity: 0.6, margin: "4px 0 0 0", fontSize: "14px" }}>👑 {user.name}</p>
          </div>
        </div>
        <button onClick={onLogout} className="admin-btn" style={{ background: "rgba(248,113,113,0.2)", color: "#f87171", border: "1px solid rgba(248,113,113,0.3)", padding: "10px 20px", borderRadius: "10px", fontSize: "14px" }}>تسجيل خروج</button>
      </div>

      <div className="admin-tabs">
        {[{ id: "users", label: "👥 المستخدمين" }, { id: "keys", label: "🔑 المفاتيح" }, { id: "chats", label: "💬 المحادثات" }].map(function(tab) {
          return (
            <button key={tab.id} onClick={function() { setActiveTab(tab.id); }} className={"admin-tab" + (activeTab === tab.id ? " active" : "")}>
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "users" && (
        <div className="admin-table-wrapper">
          <h2 style={{ marginBottom: "20px" }}>👥 قائمة المستخدمين</h2>
          <table className="admin-table">
            <thead><tr><th>المستخدم</th><th>النموذج</th><th>محادثات</th><th>مفاتيح</th><th>الحالة</th><th>إجراءات</th></tr></thead>
            <tbody>
              {users.map(function(u) {
                const chatCount = getUserChats(u.id).length;
                const keyCount = getUserKeys(u.id).length;
                return (
                  <tr key={u.id}>
                    <td><strong>{u.name}</strong><br/><span style={{ fontSize: "11px", opacity: 0.5 }}>{u.email}</span></td>
                    <td>{u.selected_model === 'llama-3.3-70b-versatile' ? '🟣 ذكي' : '🟢 سريع'}</td>
                    <td><button onClick={function() { viewUserChats(u.id, u.name); }} className="admin-btn admin-badge-yellow">💬 {chatCount}</button></td>
                    <td><span className="admin-badge admin-badge-purple">🔑 {keyCount}</span></td>
                    <td><span className={"admin-badge " + (u.is_blocked ? "admin-badge-red" : "admin-badge-green")}>{u.is_blocked ? "محظور" : "نشط"}</span></td>
                    <td style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      <button onClick={function() { setSelectedUser(u); setShowAddKeyModal(true); }} className="admin-btn" style={{ background: "rgba(108,92,231,0.2)", color: "#a29bfe" }}>➕</button>
                      <button onClick={function() { openEditUser(u); }} className="admin-btn" style={{ background: "rgba(251,191,36,0.2)", color: "#fbbf24" }}>⚙️</button>
                      <button onClick={function() { supabase.from('profiles').update({ is_blocked: !u.is_blocked }).eq('id', u.id).then(loadUsers); }} className="admin-btn" style={{ background: u.is_blocked ? "rgba(74,222,128,0.2)" : "rgba(248,113,113,0.2)", color: u.is_blocked ? "#4ade80" : "#f87171" }}>{u.is_blocked ? "فك" : "حظر"}</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "keys" && (
        <div className="admin-table-wrapper">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
            <h2 style={{ margin: 0 }}>🔑 مفاتيح API</h2>
            <button onClick={function() { setSelectedUser(null); setShowAddKeyModal(true); }} style={{ padding: "10px 20px", background: "linear-gradient(135deg, #6c5ce7, #8b5cf6)", color: "#fff", border: "none", borderRadius: "10px", cursor: "pointer", fontSize: "14px" }}>➕ إضافة</button>
          </div>
          <table className="admin-table">
            <thead><tr><th>المستخدم</th><th>المفتاح</th><th>الاستهلاك</th><th>الحد</th><th>الحالة</th><th>إجراءات</th></tr></thead>
            <tbody>
              {userKeys.map(function(key) {
                const keyUser = getUserById(key.user_id);
                const pct = ((key.used_today / key.daily_limit) * 100).toFixed(1);
                return (
                  <tr key={key.id}>
                    <td>{keyUser?.name || "غير معروف"}</td>
                    <td style={{ fontSize: "12px" }}>{key.key_name}<br/><span style={{ fontFamily: "monospace", opacity: 0.5 }}>{key.key_value.slice(0, 20)}...</span></td>
                    <td><div>{key.used_today.toLocaleString()}</div><div style={{ width: "80px", height: "3px", background: "rgba(255,255,255,0.1)", borderRadius: "2px", marginTop: "4px" }}><div style={{ width: pct + "%", height: "100%", background: pct < 50 ? "#4ade80" : "#f87171", borderRadius: "2px" }} /></div></td>
                    <td>{key.daily_limit.toLocaleString()}</td>
                    <td><button onClick={function() { toggleKeyStatus(key.id, key.is_active); }} className={"admin-badge " + (key.is_active ? "admin-badge-green" : "admin-badge-red")}>{key.is_active ? "نشط" : "معطل"}</button></td>
                    <td style={{ display: "flex", gap: "6px" }}>
                      <button onClick={function() { resetKeyUsage(key.id); }} className="admin-btn" style={{ background: "rgba(251,191,36,0.2)", color: "#fbbf24" }}>🔄</button>
                      <button onClick={function() { deleteKey(key.id); }} className="admin-btn" style={{ background: "rgba(248,113,113,0.2)", color: "#f87171" }}>🗑️</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "chats" && (
        <div className="admin-table-wrapper">
          <h2 style={{ marginBottom: "20px" }}>💬 كل المحادثات</h2>
          {allChats.length === 0 ? (
            <div style={{ textAlign: "center", opacity: 0.6, padding: "40px" }}>📭 مفيش محادثات حالياً</div>
          ) : (
            <table className="admin-table">
              <thead><tr><th>المستخدم</th><th>العنوان</th><th>الرسائل</th><th>آخر تحديث</th><th>إجراءات</th></tr></thead>
              <tbody>
                {allChats.map(function(chat) {
                  const chatUser = getUserById(chat.user_id);
                  return (
                    <tr key={chat.id}>
                      <td>{chatUser?.name || "غير معروف"}</td>
                      <td style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{chat.title}</td>
                      <td>{chat.messages?.length || 0} رسالة</td>
                      <td style={{ fontSize: "13px", opacity: 0.6 }}>{formatDate(chat.updated_at)}</td>
                      <td style={{ display: "flex", gap: "6px" }}>
                        <button onClick={function() { viewChatContent(chat); }} className="admin-btn" style={{ background: "rgba(108,92,231,0.2)", color: "#a29bfe" }}>👁️</button>
                        <button onClick={function() { deleteChat(chat.id); }} className="admin-btn" style={{ background: "rgba(248,113,113,0.2)", color: "#f87171" }}>🗑️</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {showChatViewer && (
        <div className="admin-modal">
          <div className="admin-modal-content">
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
              <h3>💬 محادثات {viewingUserName}</h3>
              <button onClick={function() { setShowChatViewer(false); }} className="close-btn">✕</button>
            </div>
            {viewingChats.length === 0 ? <div style={{ textAlign: "center", opacity: 0.6, padding: "40px" }}>📭 مفيش محادثات</div> : viewingChats.map(function(chat) { return (
              <div key={chat.id} style={{ padding: "12px", marginBottom: "8px", background: "rgba(255,255,255,0.03)", borderRadius: "10px", cursor: "pointer" }} onClick={function() { viewChatContent(chat); }}>
                <div style={{ fontWeight: 500, marginBottom: "4px" }}>{chat.title}</div>
                <div style={{ fontSize: "12px", opacity: 0.5 }}>{formatDate(chat.updated_at)} · {chat.messages?.length || 0} رسالة</div>
              </div>
            ); })}
          </div>
        </div>
      )}

      {showAddKeyModal && (
        <div className="admin-modal">
          <div className="admin-modal-content">
            <h3 style={{ marginBottom: "20px" }}>➕ إضافة مفتاح API</h3>
            <select className="admin-select" value={selectedUser?.id || ""} onChange={function(e) { setSelectedUser(users.find(function(u) { return u.id === e.target.value; })); }}>
              <option value="">اختر مستخدم...</option>
              {users.map(function(u) { return <option key={u.id} value={u.id}>{u.name} ({u.email})</option>; })}
            </select>
            <input className="admin-input" type="text" placeholder="اسم المفتاح" value={newKeyName} onChange={function(e) { setNewKeyName(e.target.value); }} />
            <input className="admin-input" type="text" placeholder="gsk_xxxxxxxxxxxx" value={newKeyValue} onChange={function(e) { setNewKeyValue(e.target.value); }} style={{ fontFamily: "monospace" }} />
            <input className="admin-input" type="number" placeholder="الحد اليومي" value={newKeyLimit} onChange={function(e) { setNewKeyLimit(parseInt(e.target.value) || 0); }} />
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={addKeyToUser} style={{ flex: 1, padding: "12px", background: "linear-gradient(135deg, #6c5ce7, #8b5cf6)", color: "#fff", border: "none", borderRadius: "10px", cursor: "pointer", fontSize: "14px", fontWeight: "bold" }}>✅ إضافة</button>
              <button onClick={function() { setShowAddKeyModal(false); }} className="admin-btn" style={{ flex: 1, background: "rgba(255,255,255,0.05)", color: "#e0e0e0", border: "1px solid rgba(255,255,255,0.1)", padding: "12px", borderRadius: "10px", fontSize: "14px" }}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {showEditUserModal && selectedUser && (
        <div className="admin-modal">
          <div className="admin-modal-content">
            <h3 style={{ marginBottom: "20px" }}>⚙️ إعدادات {selectedUser.name}</h3>
            <select className="admin-select" value={editModel} onChange={function(e) { setEditModel(e.target.value); }}>
              <option value="llama-3.1-8b-instant">🟢 سريع</option>
              <option value="llama-3.3-70b-versatile">🟣 ذكي</option>
            </select>
            <input className="admin-input" type="number" value={editRateLimitRPM} onChange={function(e) { setEditRateLimitRPM(parseInt(e.target.value) || 1); }} placeholder="RPM" />
            <input className="admin-input" type="number" value={editRateLimitTPM} onChange={function(e) { setEditRateLimitTPM(parseInt(e.target.value) || 100); }} placeholder="TPM" />
            <input className="admin-input" type="number" value={editDailyLimit} onChange={function(e) { setEditDailyLimit(parseInt(e.target.value) || 1000); }} placeholder="حد يومي" />
            <input className="admin-input" type="number" value={editCooldown} onChange={function(e) { setEditCooldown(parseInt(e.target.value) || 1); }} placeholder="تبريد (ثواني)" />
            <label style={{ fontSize: "14px", opacity: 0.7, display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px", cursor: "pointer" }}>
              <input type="checkbox" checked={editSmartMode} onChange={function(e) { setEditSmartMode(e.target.checked); }} style={{ width: "20px", height: "20px", cursor: "pointer" }} />
              🧠 توزيع ذكي
            </label>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={saveUserSettings} style={{ flex: 1, padding: "12px", background: "linear-gradient(135deg, #6c5ce7, #8b5cf6)", color: "#fff", border: "none", borderRadius: "10px", cursor: "pointer", fontSize: "14px", fontWeight: "bold" }}>💾 حفظ</button>
              <button onClick={function() { setShowEditUserModal(false); }} className="admin-btn" style={{ flex: 1, background: "rgba(255,255,255,0.05)", color: "#e0e0e0", border: "1px solid rgba(255,255,255,0.1)", padding: "12px", borderRadius: "10px", fontSize: "14px" }}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
