import { useState, useEffect } from "react";
import { supabase } from '../lib/supabase';

export default function Admin({ user, onLogout }) {
  const [users, setUsers] = useState([]);
  const [userKeys, setUserKeys] = useState([]);
  const [activeTab, setActiveTab] = useState("users");
  const [selectedUser, setSelectedUser] = useState(null);
  const [showAddKeyModal, setShowAddKeyModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyValue, setNewKeyValue] = useState("");
  const [newKeyLimit, setNewKeyLimit] = useState(5000);
  const [allChats, setAllChats] = useState([]);
  const [editRateLimitRPM, setEditRateLimitRPM] = useState(5);
  const [editRateLimitTPM, setEditRateLimitTPM] = useState(2000);
  const [editDailyLimit, setEditDailyLimit] = useState(5000);
  const [editCooldown, setEditCooldown] = useState(3);
  const [editSmartMode, setEditSmartMode] = useState(true);
  const [chatView, setChatView] = useState(null);
  const [selectedChat, setSelectedChat] = useState(null);

  useEffect(function () { loadUsers(); loadAllKeys(); loadAllChats(); }, []);

  async function loadUsers() { const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false }); if (data) setUsers(data); }
  async function loadAllKeys() { const { data } = await supabase.from('user_keys').select('*').order('created_at', { ascending: false }); if (data) setUserKeys(data); }
  async function loadAllChats() { const { data } = await supabase.from('chats').select('*').order('updated_at', { ascending: false }).limit(200); if (data) setAllChats(data); }

  function getUserKeys(userId) { return userKeys.filter(k => k.user_id === userId); }
  function getUserChats(userId) { return allChats.filter(c => c.user_id === userId); }
  function getUserById(userId) { return users.find(u => u.id === userId); }
  function formatDate(date) { if (!date) return ""; return new Date(date).toLocaleDateString("ar-EG"); }

  async function addKeyToUser() {
    if (!selectedUser || !newKeyValue.trim()) { alert("❌ اختر مستخدم وأدخل المفتاح"); return; }
    await supabase.from('user_keys').insert({ user_id: selectedUser.id, key_value: newKeyValue.trim(), key_name: newKeyName || 'مفتاح API', daily_limit: newKeyLimit, used_today: 0, is_active: true });
    alert("✅ تم إضافة المفتاح"); setShowAddKeyModal(false); setNewKeyName(""); setNewKeyValue(""); setNewKeyLimit(5000); loadAllKeys();
  }

  async function deleteKey(keyId) { if (!window.confirm("متأكد؟")) return; await supabase.from('user_keys').delete().eq('id', keyId); loadAllKeys(); }
  async function toggleKeyStatus(keyId, status) { await supabase.from('user_keys').update({ is_active: !status }).eq('id', keyId); loadAllKeys(); }
  async function resetKeyUsage(keyId) { await supabase.from('user_keys').update({ used_today: 0 }).eq('id', keyId); loadAllKeys(); }

  async function deleteChat(chatId) {
    if (!window.confirm("حذف المحادثة؟")) return;
    await supabase.from('chats').delete().eq('id', chatId);
    setSelectedChat(null);
    loadAllChats();
  }

  async function deleteAllUserChats(userId, userName) {
    if (!window.confirm(`⚠️ هتحذف كل محادثات "${userName}"!\nمتأكد؟`)) return;
    const { error } = await supabase.from('chats').delete().eq('user_id', userId);
    if (error) { alert("❌ حصل خطأ: " + error.message); return; }
    alert("✅ تم حذف كل المحادثات");
    setSelectedChat(null);
    loadAllChats();
  }

  function openEditUser(userData) {
    setSelectedUser(userData);
    setEditRateLimitRPM(userData.rate_limit_rpm || 5);
    setEditRateLimitTPM(userData.rate_limit_tpm || 2000);
    setEditDailyLimit(userData.daily_limit || 5000);
    setEditCooldown(userData.cooldown_seconds || 3);
    setEditSmartMode(userData.smart_mode !== false);
    setShowEditUserModal(true);
  }

  async function saveUserSettings() {
    if (!selectedUser) return;
    await supabase.from('profiles').update({ rate_limit_rpm: editRateLimitRPM, rate_limit_tpm: editRateLimitTPM, daily_limit: editDailyLimit, cooldown_seconds: editCooldown, smart_mode: editSmartMode }).eq('id', selectedUser.id);
    alert("✅ تم حفظ الإعدادات"); setShowEditUserModal(false); loadUsers();
  }

  // ── Chat Preview ───────────────────────────────────────
  function ChatPreview({ chat, onClose }) {
    const messages = chat.messages || [];
    return (
      <div style={S.overlay}>
        <div style={S.previewPanel}>
          <div style={S.previewHeader}>
            <span style={{ fontWeight: 700, fontSize: 15, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{chat.title}</span>
            <button onClick={onClose} style={S.closeX}>✕</button>
          </div>
          <div style={S.previewBody}>
            {messages.length === 0
              ? <div style={S.empty}>📭 لا توجد رسائل</div>
              : messages.map((m, i) => (
                <div key={i} style={{ ...S.previewMsg, ...(m.role === "user" ? S.previewMsgUser : S.previewMsgAi) }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{m.role === "user" ? "👤" : "🖤"}</span>
                  <span style={{ fontSize: 13, lineHeight: 1.6, wordBreak: "break-word" }}>{m.content || ""}</span>
                </div>
              ))
            }
          </div>
        </div>
      </div>
    );
  }

  // ── Chats Tab ──────────────────────────────────────────
  function ChatsTab() {
    if (chatView === null) {
      const usersWithChats = users.filter(u => getUserChats(u.id).length > 0);
      return (
        <div>
          <h2 style={S.sectionTitle}>💬 محادثات المستخدمين</h2>
          {usersWithChats.length === 0
            ? <div style={S.empty}>📭 مفيش محادثات</div>
            : <div style={S.userGrid}>
              {usersWithChats.map(u => {
                const chats = getUserChats(u.id);
                const lastChat = chats[0];
                return (
                  <button key={u.id} style={S.userCard} onClick={() => setChatView(u.id)}>
                    <div style={S.userCardAvatar}>{u.name?.charAt(0) || "?"}</div>
                    <div style={{ flex: 1, minWidth: 0, textAlign: "right" }}>
                      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{u.name}</div>
                      <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</div>
                      {lastChat && <div style={{ fontSize: 11, opacity: 0.6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>آخر محادثة: {lastChat.title?.slice(0, 28) || "—"}</div>}
                    </div>
                    <span style={S.chatCountBadge}>{chats.length}</span>
                  </button>
                );
              })}
            </div>
          }
        </div>
      );
    }

    const u = getUserById(chatView);
    const chats = getUserChats(chatView);
    return (
      <div>
        {/* Back row */}
        <div style={S.backRow}>
          <button style={S.backBtn} onClick={() => { setChatView(null); setSelectedChat(null); }}>← رجوع</button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>👤 {u?.name}</span>
            <span style={{ fontSize: 11, opacity: 0.5, marginRight: 8, display: "inline-block", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 160, verticalAlign: "middle" }}>{u?.email}</span>
          </div>
          <span style={{ ...S.badge, background: "rgba(251,191,36,0.2)", color: "#fbbf24", marginLeft: 6 }}>
            💬 {chats.length}
          </span>
          {/* زر حذف الكل */}
          {chats.length > 0 && (
            <button
              onClick={() => deleteAllUserChats(chatView, u?.name)}
              style={S.deleteAllBtn}
              title="حذف كل المحادثات"
            >
              🗑️ حذف الكل
            </button>
          )}
        </div>

        {chats.length === 0
          ? <div style={S.empty}>📭 مفيش محادثات</div>
          : <div style={S.chatList}>
            {chats.map(chat => (
              <div key={chat.id} style={S.chatRow}>
                <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => setSelectedChat(chat)}>
                  <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{chat.title}</div>
                  <div style={{ fontSize: 11, opacity: 0.5, marginTop: 2 }}>
                    {formatDate(chat.updated_at)} · {chat.messages?.length || 0} رسالة
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button onClick={() => setSelectedChat(chat)} style={{ ...S.actionBtn, background: "rgba(108,92,231,0.2)", color: "#a29bfe" }}>👁️</button>
                  <button onClick={() => deleteChat(chat.id)} style={{ ...S.actionBtn, background: "rgba(248,113,113,0.15)", color: "#f87171" }}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        }
      </div>
    );
  }

  // ── Keys Tab ───────────────────────────────────────────
  function KeysTab() {
    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>🔑 مفاتيح API</h2>
          <button onClick={() => { setSelectedUser(null); setShowAddKeyModal(true); }} style={S.primaryBtn}>➕ إضافة</button>
        </div>
        {userKeys.length === 0
          ? <div style={S.empty}>📭 مفيش مفاتيح</div>
          : <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {userKeys.map(key => {
              const keyUser = getUserById(key.user_id);
              const pct = Math.min(100, ((key.used_today / key.daily_limit) * 100));
              const barColor = pct < 50 ? "#4ade80" : pct < 80 ? "#fbbf24" : "#f87171";
              return (
                <div key={key.id} style={S.keyCard}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, flexWrap: "wrap" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{key.key_name}</div>
                      <div style={{ fontSize: 11, opacity: 0.5, fontFamily: "monospace", marginTop: 2 }}>{key.key_value.slice(0, 24)}…</div>
                      <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>👤 {keyUser?.name || "غير معروف"}</div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0, alignItems: "center" }}>
                      <button onClick={() => toggleKeyStatus(key.id, key.is_active)}
                        style={{ ...S.badge, cursor: "pointer", border: "none", ...(key.is_active ? { background: "rgba(74,222,128,0.15)", color: "#4ade80" } : { background: "rgba(248,113,113,0.15)", color: "#f87171" }) }}>
                        {key.is_active ? "نشط" : "معطل"}
                      </button>
                      <button onClick={() => resetKeyUsage(key.id)} style={{ ...S.actionBtn, background: "rgba(251,191,36,0.15)", color: "#fbbf24" }}>🔄</button>
                      <button onClick={() => deleteKey(key.id)} style={{ ...S.actionBtn, background: "rgba(248,113,113,0.15)", color: "#f87171" }}>🗑️</button>
                    </div>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, opacity: 0.7, marginBottom: 4 }}>
                      <span>{key.used_today.toLocaleString()} / {key.daily_limit.toLocaleString()} توكن</span>
                      <span>{pct.toFixed(0)}%</span>
                    </div>
                    <div style={{ height: 5, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ width: pct + "%", height: "100%", background: barColor, borderRadius: 3, transition: "width 0.4s" }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        }
      </div>
    );
  }

  // ── Users Tab ──────────────────────────────────────────
  function UsersTab() {
    return (
      <div>
        <h2 style={{ marginBottom: 20, fontSize: 18 }}>👥 المستخدمين</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {users.map(u => {
            const chatCount = getUserChats(u.id).length;
            const keyCount = getUserKeys(u.id).length;
            return (
              <div key={u.id} style={S.userRow}>
                <div style={S.userRowAvatar}>{u.name?.charAt(0) || "?"}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{u.name}</div>
                  <div style={{ fontSize: 11, opacity: 0.5, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</div>
                  <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                    <span
                      style={{ ...S.badge, background: "rgba(251,191,36,0.15)", color: "#fbbf24", cursor: "pointer" }}
                      onClick={() => { setActiveTab("chats"); setChatView(u.id); }}
                    >💬 {chatCount}</span>
                    <span style={{ ...S.badge, background: "rgba(108,92,231,0.15)", color: "#a29bfe" }}>🔑 {keyCount}</span>
                    <span style={{ ...S.badge, ...(u.is_blocked ? { background: "rgba(248,113,113,0.15)", color: "#f87171" } : { background: "rgba(74,222,128,0.15)", color: "#4ade80" }) }}>
                      {u.is_blocked ? "محظور" : "نشط"}
                    </span>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
                  <button onClick={() => { setSelectedUser(u); setShowAddKeyModal(true); }} style={{ ...S.actionBtn, background: "rgba(108,92,231,0.2)", color: "#a29bfe" }}>➕</button>
                  <button onClick={() => openEditUser(u)} style={{ ...S.actionBtn, background: "rgba(251,191,36,0.2)", color: "#fbbf24" }}>⚙️</button>
                  <button
                    onClick={() => supabase.from('profiles').update({ is_blocked: !u.is_blocked }).eq('id', u.id).then(loadUsers)}
                    style={{ ...S.actionBtn, ...(u.is_blocked ? { background: "rgba(74,222,128,0.2)", color: "#4ade80" } : { background: "rgba(248,113,113,0.15)", color: "#f87171" }) }}
                  >{u.is_blocked ? "فك" : "حظر"}</button>
                  {/* زر حذف كل محادثات المستخدم من صفحة المستخدمين */}
                  {chatCount > 0 && (
                    <button
                      onClick={() => deleteAllUserChats(u.id, u.name)}
                      style={{ ...S.actionBtn, background: "rgba(248,113,113,0.12)", color: "#f87171", fontSize: 12 }}
                      title="حذف كل المحادثات"
                    >🗑️💬</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────
  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 32 }}>🖤</span>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.5 }}>لوحة التحكم</div>
            <div style={{ fontSize: 12, opacity: 0.5, marginTop: 2 }}>👑 {user.name}</div>
          </div>
        </div>
        <button onClick={onLogout} style={S.logoutBtn}>خروج</button>
      </div>

      {/* Tabs */}
      <div style={S.tabs}>
        {[{ id: "users", label: "👥 المستخدمين" }, { id: "keys", label: "🔑 المفاتيح" }, { id: "chats", label: "💬 المحادثات" }].map(tab => (
          <button key={tab.id}
            onClick={() => { setActiveTab(tab.id); if (tab.id !== "chats") setChatView(null); }}
            style={{ ...S.tab, ...(activeTab === tab.id ? S.tabActive : {}) }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={S.content}>
        {activeTab === "users" && <UsersTab />}
        {activeTab === "keys" && <KeysTab />}
        {activeTab === "chats" && <ChatsTab />}
      </div>

      {/* Chat Preview Overlay */}
      {selectedChat && <ChatPreview chat={selectedChat} onClose={() => setSelectedChat(null)} />}

      {/* Add Key Modal */}
      {showAddKeyModal && (
        <div style={S.overlay}>
          <div style={S.modal}>
            <div style={S.modalHeader}>
              <span style={{ fontWeight: 700 }}>➕ إضافة مفتاح API</span>
              <button onClick={() => setShowAddKeyModal(false)} style={S.closeX}>✕</button>
            </div>
            <select style={S.input} value={selectedUser?.id || ""} onChange={e => setSelectedUser(users.find(u => u.id === e.target.value))}>
              <option value="">اختر مستخدم...</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
            </select>
            <input style={S.input} type="text" placeholder="اسم المفتاح" value={newKeyName} onChange={e => setNewKeyName(e.target.value)} />
            <input style={{ ...S.input, fontFamily: "monospace", fontSize: 12 }} type="text" placeholder="gsk_xxxxxxxxxxxx" value={newKeyValue} onChange={e => setNewKeyValue(e.target.value)} />
            <input style={S.input} type="number" placeholder="الحد اليومي" value={newKeyLimit} onChange={e => setNewKeyLimit(parseInt(e.target.value) || 0)} />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={addKeyToUser} style={{ ...S.primaryBtn, flex: 1, padding: "12px" }}>✅ إضافة</button>
              <button onClick={() => setShowAddKeyModal(false)} style={{ ...S.ghostBtn, flex: 1, padding: "12px" }}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditUserModal && selectedUser && (
        <div style={S.overlay}>
          <div style={S.modal}>
            <div style={S.modalHeader}>
              <span style={{ fontWeight: 700 }}>⚙️ إعدادات {selectedUser.name}</span>
              <button onClick={() => setShowEditUserModal(false)} style={S.closeX}>✕</button>
            </div>
            {[
              { label: "الطلبات/دقيقة (RPM)", val: editRateLimitRPM, set: setEditRateLimitRPM },
              { label: "التوكن/دقيقة (TPM)", val: editRateLimitTPM, set: setEditRateLimitTPM },
              { label: "الحد اليومي", val: editDailyLimit, set: setEditDailyLimit },
              { label: "التبريد (ثواني)", val: editCooldown, set: setEditCooldown },
            ].map(f => (
              <div key={f.label} style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, opacity: 0.6, display: "block", marginBottom: 4 }}>{f.label}</label>
                <input style={S.input} type="number" value={f.val} onChange={e => f.set(parseInt(e.target.value) || 1)} />
              </div>
            ))}
            <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, opacity: 0.8, cursor: "pointer", marginBottom: 20 }}>
              <input type="checkbox" checked={editSmartMode} onChange={e => setEditSmartMode(e.target.checked)} style={{ width: 18, height: 18 }} />
              🧠 توزيع ذكي
            </label>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={saveUserSettings} style={{ ...S.primaryBtn, flex: 1, padding: "12px" }}>💾 حفظ</button>
              <button onClick={() => setShowEditUserModal(false)} style={{ ...S.ghostBtn, flex: 1, padding: "12px" }}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────
const S = {
  page: {
    minHeight: "100dvh",
    background: "#0f0f1a",
    color: "#e0e0e0",
    fontFamily: "'Cairo', 'Segoe UI', Tahoma, sans-serif",
    display: "flex",
    flexDirection: "column",
    direction: "rtl",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 20px",
    background: "#1a1a2e",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    flexShrink: 0,
  },
  logoutBtn: {
    padding: "8px 18px",
    background: "rgba(248,113,113,0.15)",
    color: "#f87171",
    border: "1px solid rgba(248,113,113,0.3)",
    borderRadius: 10,
    cursor: "pointer",
    fontSize: 13,
    fontFamily: "inherit",
  },
  tabs: {
    display: "flex",
    gap: 4,
    padding: "10px 16px",
    background: "#0f0f1a",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    flexShrink: 0,
  },
  tab: {
    flex: 1,
    padding: "10px 8px",
    background: "transparent",
    color: "rgba(255,255,255,0.45)",
    border: "1px solid transparent",
    borderRadius: 10,
    cursor: "pointer",
    fontSize: 13,
    fontFamily: "inherit",
    fontWeight: 500,
    whiteSpace: "nowrap",
    transition: "all 0.2s",
  },
  tabActive: {
    background: "rgba(108,92,231,0.18)",
    color: "#a29bfe",
    border: "1px solid rgba(108,92,231,0.35)",
    fontWeight: 700,
  },
  content: {
    flex: 1,
    overflowY: "auto",
    padding: "20px 16px",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 20,
  },
  empty: {
    textAlign: "center",
    opacity: 0.5,
    padding: "48px 20px",
    fontSize: 14,
  },
  // Users tab
  userRow: {
    display: "flex",
    gap: 12,
    alignItems: "flex-start",
    padding: 14,
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 14,
  },
  userRowAvatar: {
    width: 42,
    height: 42,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #6c5ce7, #a29bfe)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 18,
    fontWeight: 700,
    flexShrink: 0,
    color: "#fff",
  },
  // Keys tab
  keyCard: {
    padding: 16,
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 14,
  },
  // Chats tab
  userGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    gap: 12,
  },
  userCard: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: 16,
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 14,
    cursor: "pointer",
    color: "inherit",
    fontFamily: "inherit",
    textAlign: "right",
    transition: "border-color 0.2s, background 0.2s",
    width: "100%",
  },
  userCardAvatar: {
    width: 44,
    height: 44,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #6c5ce7, #a29bfe)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 20,
    fontWeight: 700,
    color: "#fff",
    flexShrink: 0,
  },
  chatCountBadge: {
    minWidth: 32,
    height: 32,
    borderRadius: "50%",
    background: "rgba(251,191,36,0.18)",
    color: "#fbbf24",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: 700,
    flexShrink: 0,
  },
  backRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
    padding: "10px 14px",
    background: "rgba(255,255,255,0.03)",
    borderRadius: 12,
    flexWrap: "wrap",
  },
  backBtn: {
    background: "rgba(108,92,231,0.15)",
    color: "#a29bfe",
    border: "1px solid rgba(108,92,231,0.3)",
    borderRadius: 8,
    padding: "6px 14px",
    cursor: "pointer",
    fontSize: 13,
    fontFamily: "inherit",
    flexShrink: 0,
  },
  deleteAllBtn: {
    background: "rgba(248,113,113,0.15)",
    color: "#f87171",
    border: "1px solid rgba(248,113,113,0.3)",
    borderRadius: 8,
    padding: "6px 14px",
    cursor: "pointer",
    fontSize: 13,
    fontFamily: "inherit",
    flexShrink: 0,
    fontWeight: 600,
  },
  chatList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  chatRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "12px 14px",
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 12,
  },
  // Shared
  badge: {
    padding: "3px 10px",
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 600,
    whiteSpace: "nowrap",
    display: "inline-block",
  },
  actionBtn: {
    width: 34,
    height: 34,
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "inherit",
  },
  primaryBtn: {
    padding: "10px 20px",
    background: "linear-gradient(135deg, #6c5ce7, #8b5cf6)",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    cursor: "pointer",
    fontSize: 14,
    fontFamily: "inherit",
    fontWeight: 600,
  },
  ghostBtn: {
    background: "rgba(255,255,255,0.05)",
    color: "#e0e0e0",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 10,
    cursor: "pointer",
    fontSize: 14,
    fontFamily: "inherit",
  },
  // Modals
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.75)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 200,
    padding: 16,
  },
  modal: {
    background: "#1a1a2e",
    borderRadius: 18,
    padding: 22,
    width: "100%",
    maxWidth: 440,
    maxHeight: "88vh",
    overflowY: "auto",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    fontSize: 15,
  },
  closeX: {
    background: "rgba(255,255,255,0.08)",
    border: "none",
    color: "#e0e0e0",
    width: 30,
    height: 30,
    borderRadius: "50%",
    cursor: "pointer",
    fontSize: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    marginBottom: 12,
    borderRadius: 10,
    background: "rgba(255,255,255,0.05)",
    color: "#e0e0e0",
    border: "1px solid rgba(255,255,255,0.1)",
    fontSize: 14,
    outline: "none",
    fontFamily: "inherit",
    boxSizing: "border-box",
    display: "block",
  },
  // Chat Preview
  previewPanel: {
    background: "#1a1a2e",
    borderRadius: 18,
    width: "100%",
    maxWidth: 520,
    maxHeight: "88vh",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  previewHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    padding: "14px 18px",
    borderBottom: "1px solid rgba(255,255,255,0.07)",
    flexShrink: 0,
  },
  previewBody: {
    flex: 1,
    overflowY: "auto",
    padding: "14px 16px",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  previewMsg: {
    display: "flex",
    gap: 8,
    alignItems: "flex-start",
    padding: "8px 12px",
    borderRadius: 10,
  },
  previewMsgUser: {
    background: "rgba(108,92,231,0.12)",
    alignSelf: "flex-end",
    flexDirection: "row-reverse",
  },
  previewMsgAi: {
    background: "rgba(255,255,255,0.04)",
    alignSelf: "flex-start",
  },
};

