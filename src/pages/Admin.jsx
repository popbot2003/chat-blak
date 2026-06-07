import { useState, useEffect } from "react";
import { supabase } from '../lib/supabase';

export default function Admin({ user, onLogout }) {
  const [users, setUsers] = useState([]);
  const [tokenData, setTokenData] = useState(null);
  const [userKeys, setUserKeys] = useState([]);
  const [activeTab, setActiveTab] = useState("users");
  const [selectedUser, setSelectedUser] = useState(null);
  const [showAddKeyModal, setShowAddKeyModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyValue, setNewKeyValue] = useState("");
  const [newKeyLimit, setNewKeyLimit] = useState(100000);
  const [allChats, setAllChats] = useState([]);
  const [viewingChat, setViewingChat] = useState(null);

  useEffect(function() { loadUsers(); loadTokenData(); loadAllKeys(); loadAllChats(); }, []);

  async function loadUsers() { const { data } = await supabase.from('users').select('*').order('created_at', { ascending: false }); if (data) setUsers(data); }
  async function loadTokenData() { const { data } = await supabase.from('token_usage').select('*').eq('id', 1).single(); if (data) setTokenData(data); }
  async function loadAllKeys() { const { data } = await supabase.from('user_keys').select('*').order('created_at', { ascending: false }); if (data) setUserKeys(data); }
  async function loadAllChats() { const { data } = await supabase.from('chats').select('*').order('updated_at', { ascending: false }).limit(50); if (data) setAllChats(data); }

  async function addKeyToUser() {
    if (!selectedUser || !newKeyValue.trim()) { alert("❌ اختر مستخدم وأدخل المفتاح"); return; }
    await supabase.from('user_keys').insert({ user_id: selectedUser.id, key_value: newKeyValue.trim(), key_name: newKeyName || 'مفتاح API', daily_limit: newKeyLimit, used_today: 0, is_active: true });
    alert("✅ تم إضافة المفتاح للمستخدم: " + selectedUser.name);
    setShowAddKeyModal(false); setNewKeyName(""); setNewKeyValue(""); setNewKeyLimit(100000); loadAllKeys();
  }

  async function deleteKey(keyId) { if (!window.confirm("متأكد من حذف هذا المفتاح؟")) return; await supabase.from('user_keys').delete().eq('id', keyId); loadAllKeys(); }
  async function toggleKeyStatus(keyId, currentStatus) { await supabase.from('user_keys').update({ is_active: !currentStatus }).eq('id', keyId); loadAllKeys(); }
  async function resetKeyUsage(keyId) { await supabase.from('user_keys').update({ used_today: 0 }).eq('id', keyId); loadAllKeys(); }

  function getUserKeys(userId) { return userKeys.filter(function(key) { return key.user_id === userId; }); }
  function getUserChats(userId) { return allChats.filter(function(chat) { return chat.user_id === userId; }); }
  function formatDate(date) { if (!date) return ""; return new Date(date).toLocaleDateString("ar-EG"); }

  return (
    <div style={{ minHeight: "100vh", background: "#0f0f1a", color: "#e0e0e0", fontFamily: "system-ui, sans-serif", padding: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px", padding: "20px", background: "#1a1a2e", borderRadius: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "30px" }}>🖤</span>
          <div><h1 style={{ fontSize: "24px", margin: 0 }}>لوحة التحكم</h1><p style={{ opacity: 0.6, margin: "4px 0 0 0", fontSize: "14px" }}>👑 {user.name}</p></div>
        </div>
        <button onClick={onLogout} style={{ padding: "10px 20px", background: "rgba(248,113,113,0.2)", color: "#f87171", border: "1px solid rgba(248,113,113,0.3)", borderRadius: "10px", cursor: "pointer", fontSize: "14px" }}>تسجيل خروج</button>
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "20px", background: "#1a1a2e", padding: "8px", borderRadius: "12px", flexWrap: "wrap" }}>
        {[{ id: "users", label: "👥 المستخدمين" }, { id: "keys", label: "🔑 المفاتيح" }, { id: "chats", label: "💬 المحادثات" }, { id: "stats", label: "📊 إحصائيات" }].map(function(tab) {
          return <button key={tab.id} onClick={function() { setActiveTab(tab.id); }} style={{ flex: 1, minWidth: "120px", padding: "12px", background: activeTab === tab.id ? "rgba(108,92,231,0.2)" : "transparent", color: activeTab === tab.id ? "#a29bfe" : "rgba(255,255,255,0.6)", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "14px", fontWeight: activeTab === tab.id ? "bold" : "normal" }}>{tab.label}</button>;
        })}
      </div>

      {activeTab === "users" && (
        <div style={{ background: "#1a1a2e", borderRadius: "16px", padding: "20px", overflowX: "auto" }}>
          <h2 style={{ marginBottom: "20px" }}>👥 قائمة المستخدمين</h2>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}><th style={{ padding: "12px", textAlign: "right" }}>المستخدم</th><th style={{ padding: "12px", textAlign: "right" }}>البريد</th><th style={{ padding: "12px", textAlign: "right" }}>الدور</th><th style={{ padding: "12px", textAlign: "right" }}>المفاتيح</th><th style={{ padding: "12px", textAlign: "right" }}>المحادثات</th><th style={{ padding: "12px", textAlign: "right" }}>الحالة</th><th style={{ padding: "12px", textAlign: "right" }}>إجراءات</th></tr></thead>
            <tbody>
              {users.map(function(u) {
                const userKeysList = getUserKeys(u.id);
                const userChatsList = getUserChats(u.id);
                return (
                  <tr key={u.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <td style={{ padding: "12px" }}>{u.name}</td>
                    <td style={{ padding: "12px", fontSize: "13px", opacity: 0.7 }}>{u.email}</td>
                    <td style={{ padding: "12px" }}>
                      <select value={u.role} onChange={function(e) { supabase.from('users').update({ role: e.target.value }).eq('id', u.id).then(loadUsers); }} style={{ background: "rgba(255,255,255,0.05)", color: "#e0e0e0", border: "1px solid rgba(255,255,255,0.1)", padding: "6px 10px", borderRadius: "8px", fontSize: "13px" }}>
                        <option value="user">👤 مستخدم</option><option value="admin">👑 مدير</option>
                      </select>
                    </td>
                    <td style={{ padding: "12px" }}><span style={{ background: "rgba(108,92,231,0.2)", color: "#a29bfe", padding: "4px 10px", borderRadius: "20px", fontSize: "12px" }}>🔑 {userKeysList.length}</span></td>
                    <td style={{ padding: "12px" }}><span style={{ background: "rgba(251,191,36,0.2)", color: "#fbbf24", padding: "4px 10px", borderRadius: "20px", fontSize: "12px" }}>💬 {userChatsList.length}</span></td>
                    <td style={{ padding: "12px" }}><span style={{ color: u.is_blocked ? "#f87171" : "#4ade80", background: u.is_blocked ? "rgba(248,113,113,0.1)" : "rgba(74,222,128,0.1)", padding: "4px 10px", borderRadius: "20px", fontSize: "12px" }}>{u.is_blocked ? "محظور" : "نشط"}</span></td>
                    <td style={{ padding: "12px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      <button onClick={function() { setSelectedUser(u); setShowAddKeyModal(true); }} style={{ padding: "6px 12px", background: "rgba(108,92,231,0.2)", color: "#a29bfe", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}>➕ مفتاح</button>
                      <button onClick={function() { supabase.from('users').update({ is_blocked: !u.is_blocked }).eq('id', u.id).then(loadUsers); }} style={{ padding: "6px 12px", background: u.is_blocked ? "rgba(74,222,128,0.2)" : "rgba(248,113,113,0.2)", color: u.is_blocked ? "#4ade80" : "#f87171", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}>{u.is_blocked ? "فك الحظر" : "حظر"}</button>
                      <button onClick={function() { if (window.confirm("حذف المستخدم؟")) { supabase.from('users').delete().eq('id', u.id).then(loadUsers); } }} style={{ padding: "6px 12px", background: "rgba(248,113,113,0.2)", color: "#f87171", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}>حذف</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "keys" && (
        <div style={{ background: "#1a1a2e", borderRadius: "16px", padding: "20px", overflowX: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h2 style={{ margin: 0 }}>🔑 مفاتيح API</h2>
            <button onClick={function() { setSelectedUser(null); setShowAddKeyModal(true); }} style={{ padding: "10px 20px", background: "linear-gradient(135deg, #6c5ce7, #8b5cf6)", color: "#fff", border: "none", borderRadius: "10px", cursor: "pointer", fontSize: "14px" }}>➕ إضافة مفتاح</button>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}><th style={{ padding: "12px", textAlign: "right" }}>المستخدم</th><th style={{ padding: "12px", textAlign: "right" }}>اسم المفتاح</th><th style={{ padding: "12px", textAlign: "right" }}>المفتاح</th><th style={{ padding: "12px", textAlign: "right" }}>الاستهلاك</th><th style={{ padding: "12px", textAlign: "right" }}>الحد</th><th style={{ padding: "12px", textAlign: "right" }}>الحالة</th><th style={{ padding: "12px", textAlign: "right" }}>إجراءات</th></tr></thead>
            <tbody>
              {userKeys.map(function(key) {
                const keyUser = users.find(function(u) { return u.id === key.user_id; });
                const percentUsed = ((key.used_today / key.daily_limit) * 100).toFixed(1);
                return (
                  <tr key={key.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <td style={{ padding: "12px" }}>{keyUser?.name || "غير معروف"}</td>
                    <td style={{ padding: "12px", fontSize: "13px" }}>{key.key_name}</td>
                    <td style={{ padding: "12px", fontSize: "12px", opacity: 0.6, fontFamily: "monospace" }}>{key.key_value.slice(0, 15)}...</td>
                    <td style={{ padding: "12px" }}>
                      <div style={{ fontSize: "13px" }}>{key.used_today.toLocaleString()}</div>
                      <div style={{ width: "100px", height: "3px", background: "rgba(255,255,255,0.1)", borderRadius: "2px", marginTop: "4px" }}><div style={{ width: percentUsed + "%", height: "100%", background: percentUsed < 50 ? "#4ade80" : percentUsed < 80 ? "#facc15" : "#f87171", borderRadius: "2px" }} /></div>
                    </td>
                    <td style={{ padding: "12px", fontSize: "13px" }}>{key.daily_limit.toLocaleString()}</td>
                    <td style={{ padding: "12px" }}><button onClick={function() { toggleKeyStatus(key.id, key.is_active); }} style={{ padding: "4px 10px", background: key.is_active ? "rgba(74,222,128,0.1)" : "rgba(248,113,113,0.1)", color: key.is_active ? "#4ade80" : "#f87171", border: "none", borderRadius: "20px", cursor: "pointer", fontSize: "12px" }}>{key.is_active ? "نشط" : "معطل"}</button></td>
                    <td style={{ padding: "12px", display: "flex", gap: "8px" }}>
                      <button onClick={function() { resetKeyUsage(key.id); }} style={{ padding: "6px 12px", background: "rgba(251,191,36,0.2)", color: "#fbbf24", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}>🔄</button>
                      <button onClick={function() { deleteKey(key.id); }} style={{ padding: "6px 12px", background: "rgba(248,113,113,0.2)", color: "#f87171", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}>🗑️</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "chats" && (
        <div style={{ background: "#1a1a2e", borderRadius: "16px", padding: "20px", overflowX: "auto" }}>
          <h2 style={{ marginBottom: "20px" }}>💬 كل المحادثات</h2>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}><th style={{ padding: "12px", textAlign: "right" }}>المستخدم</th><th style={{ padding: "12px", textAlign: "right" }}>العنوان</th><th style={{ padding: "12px", textAlign: "right" }}>الرسائل</th><th style={{ padding: "12px", textAlign: "right" }}>آخر تحديث</th><th style={{ padding: "12px", textAlign: "right" }}>عرض</th></tr></thead>
            <tbody>
              {allChats.map(function(chat) {
                const chatUser = users.find(function(u) { return u.id === chat.user_id; });
                return (
                  <tr key={chat.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <td style={{ padding: "12px" }}>{chatUser?.name || chat.user_email || "غير معروف"}</td>
                    <td style={{ padding: "12px" }}>{chat.title}</td>
                    <td style={{ padding: "12px" }}>{chat.messages?.length || 0}</td>
                    <td style={{ padding: "12px", fontSize: "13px", opacity: 0.6 }}>{formatDate(chat.updated_at)}</td>
                    <td style={{ padding: "12px" }}>
                      <button onClick={function() { setViewingChat(chat); }} style={{ padding: "6px 12px", background: "rgba(108,92,231,0.2)", color: "#a29bfe", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}>👁️ عرض</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "stats" && (
        <div style={{ background: "#1a1a2e", borderRadius: "16px", padding: "20px" }}>
          <h2 style={{ marginBottom: "20px" }}>📊 إحصائيات</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "15px" }}>
            <div style={{ background: "rgba(108,92,231,0.1)", padding: "20px", borderRadius: "12px", textAlign: "center" }}><div style={{ fontSize: "30px" }}>👥</div><div style={{ fontSize: "24px", fontWeight: "bold" }}>{users.length}</div><div style={{ fontSize: "14px", opacity: 0.6 }}>مستخدم</div></div>
            <div style={{ background: "rgba(74,222,128,0.1)", padding: "20px", borderRadius: "12px", textAlign: "center" }}><div style={{ fontSize: "30px" }}>✅</div><div style={{ fontSize: "24px", fontWeight: "bold" }}>{users.filter(function(u) { return !u.is_blocked; }).length}</div><div style={{ fontSize: "14px", opacity: 0.6 }}>نشط</div></div>
            <div style={{ background: "rgba(248,113,113,0.1)", padding: "20px", borderRadius: "12px", textAlign: "center" }}><div style={{ fontSize: "30px" }}>🚫</div><div style={{ fontSize: "24px", fontWeight: "bold" }}>{users.filter(function(u) { return u.is_blocked; }).length}</div><div style={{ fontSize: "14px", opacity: 0.6 }}>محظور</div></div>
            <div style={{ background: "rgba(251,191,36,0.1)", padding: "20px", borderRadius: "12px", textAlign: "center" }}><div style={{ fontSize: "30px" }}>💬</div><div style={{ fontSize: "24px", fontWeight: "bold" }}>{allChats.length}</div><div style={{ fontSize: "14px", opacity: 0.6 }}>محادثة</div></div>
            <div style={{ background: "rgba(108,92,231,0.1)", padding: "20px", borderRadius: "12px", textAlign: "center" }}><div style={{ fontSize: "30px" }}>🔑</div><div style={{ fontSize: "24px", fontWeight: "bold" }}>{userKeys.length}</div><div style={{ fontSize: "14px", opacity: 0.6 }}>مفتاح</div></div>
            <div style={{ background: "rgba(74,222,128,0.1)", padding: "20px", borderRadius: "12px", textAlign: "center" }}><div style={{ fontSize: "30px" }}>⚡</div><div style={{ fontSize: "24px", fontWeight: "bold" }}>{tokenData?.total_used?.toLocaleString() || 0}</div><div style={{ fontSize: "14px", opacity: 0.6 }}>token</div></div>
          </div>
        </div>
      )}

      {showAddKeyModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
          <div style={{ background: "#1a1a2e", padding: "30px", borderRadius: "20px", width: "100%", maxWidth: "450px" }}>
            <h3 style={{ marginBottom: "20px" }}>➕ إضافة مفتاح API</h3>
            <label style={{ fontSize: "14px", opacity: 0.7, marginBottom: "8px", display: "block" }}>المستخدم</label>
            <select value={selectedUser?.id || ""} onChange={function(e) { setSelectedUser(users.find(function(u) { return u.id === e.target.value; })); }} style={{ width: "100%", padding: "12px", marginBottom: "15px", borderRadius: "10px", background: "rgba(255,255,255,0.05)", color: "#e0e0e0", border: "1px solid rgba(255,255,255,0.1)", fontSize: "14px", outline: "none" }}>
              <option value="">اختر مستخدم...</option>
              {users.map(function(u) { return <option key={u.id} value={u.id}>{u.name} ({u.email})</option>; })}
            </select>
            <label style={{ fontSize: "14px", opacity: 0.7, marginBottom: "8px", display: "block" }}>اسم المفتاح</label>
            <input type="text" placeholder="مثال: مفتاح أساسي" value={newKeyName} onChange={function(e) { setNewKeyName(e.target.value); }} style={{ width: "100%", padding: "12px", marginBottom: "15px", borderRadius: "10px", background: "rgba(255,255,255,0.05)", color: "#e0e0e0", border: "1px solid rgba(255,255,255,0.1)", fontSize: "14px", outline: "none" }} />
            <label style={{ fontSize: "14px", opacity: 0.7, marginBottom: "8px", display: "block" }}>قيمة المفتاح (gsk_...)</label>
            <input type="text" placeholder="gsk_xxxxxxxxxxxx" value={newKeyValue} onChange={function(e) { setNewKeyValue(e.target.value); }} style={{ width: "100%", padding: "12px", marginBottom: "15px", borderRadius: "10px", background: "rgba(255,255,255,0.05)", color: "#e0e0e0", border: "1px solid rgba(255,255,255,0.1)", fontSize: "14px", outline: "none", fontFamily: "monospace" }} />
            <label style={{ fontSize: "14px", opacity: 0.7, marginBottom: "8px", display: "block" }}>الحد اليومي (token)</label>
            <input type="number" value={newKeyLimit} onChange={function(e) { setNewKeyLimit(parseInt(e.target.value) || 0); }} style={{ width: "100%", padding: "12px", marginBottom: "20px", borderRadius: "10px", background: "rgba(255,255,255,0.05)", color: "#e0e0e0", border: "1px solid rgba(255,255,255,0.1)", fontSize: "14px", outline: "none" }} />
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={addKeyToUser} style={{ flex: 1, padding: "12px", background: "linear-gradient(135deg, #6c5ce7, #8b5cf6)", color: "#fff", border: "none", borderRadius: "10px", cursor: "pointer", fontSize: "14px", fontWeight: "bold" }}>✅ إضافة</button>
              <button onClick={function() { setShowAddKeyModal(false); }} style={{ flex: 1, padding: "12px", background: "rgba(255,255,255,0.05)", color: "#e0e0e0", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", cursor: "pointer", fontSize: "14px" }}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {viewingChat && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
          <div style={{ background: "#1a1a2e", padding: "30px", borderRadius: "20px", width: "100%", maxWidth: "700px", maxHeight: "80vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
              <h3>💬 {viewingChat.title}</h3>
              <button onClick={function() { setViewingChat(null); }} style={{ background: "transparent", border: "none", color: "#e0e0e0", fontSize: "20px", cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {viewingChat.messages?.map(function(msg, i) {
                return (
                  <div key={i} style={{ padding: "10px 14px", borderRadius: "12px", background: msg.role === "user" ? "rgba(108,92,231,0.2)" : "rgba(255,255,255,0.03)", textAlign: msg.role === "user" ? "left" : "right", direction: "ltr" }}>
                    <strong style={{ fontSize: "11px", opacity: 0.5 }}>{msg.role === "user" ? "👤" : "🖤"}</strong>
                    <div style={{ marginTop: "4px", fontSize: "14px", whiteSpace: "pre-wrap" }}>{msg.content.slice(0, 200)}{msg.content.length > 200 ? "..." : ""}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
