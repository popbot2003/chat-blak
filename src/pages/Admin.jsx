import { useState, useEffect } from "react";
import { supabase } from '../lib/supabase';
import MessageContent from "../components/MessageContent";
import { formatDate, getUsagePercent, getUsageColor, truncate } from '../utils/helpers';
import { PERSONALITY_LABELS, DEFAULT_PERSONALITY } from '../config/personalities';

export default function Admin({ user, onLogout }) {
  // ===== States الموجودة =====
  const [users, setUsers] = useState([]);
  const [apiKeys, setApiKeys] = useState([]);
  const [allChats, setAllChats] = useState([]);
  const [activeTab, setActiveTab] = useState("users");
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
  const [newKeyLimit, setNewKeyLimit] = useState(1000000);
  const [editDailyLimit, setEditDailyLimit] = useState(5000);

  // ===== States جديدة =====
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('adminDarkMode');
    return saved !== null ? saved === 'true' : true;
  });
  const [chatFilterUser, setChatFilterUser] = useState("");
  const [chatFilterDate, setChatFilterDate] = useState("all");
  const [chatSearchTerm, setChatSearchTerm] = useState("");
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportType, setExportType] = useState("users");
  const [toast, setToast] = useState(null);

  // ===== CSS Variables للـ Dark/Light Mode =====
  const theme = {
    bg: darkMode ? '#0f0f1a' : '#f5f5f7',
    surface: darkMode ? '#1a1a2e' : '#ffffff',
    surface2: darkMode ? '#1e1e2e' : '#f8f8f8',
    border: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)',
    borderStrong: darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.2)',
    text: darkMode ? '#e0e0e0' : '#1a1a2e',
    textMuted: darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
    inputBg: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    rowHover: darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
    barBg: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
    tabActiveBg: darkMode ? 'rgba(108,92,231,0.2)' : 'rgba(108,92,231,0.1)',
    tabActiveColor: darkMode ? '#a29bfe' : '#6c5ce7',
    tabInactiveColor: darkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)',
  };

  // ===== useEffect =====
  useEffect(() => {
    const profilesChannel = supabase
      .channel('profiles-realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, (payload) => {
        setUsers(prev => prev.map(u => u.id === payload.new.id ? { ...u, ...payload.new } : u));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, (payload) => {
        showToast(`مستخدم جديد: ${payload.new.name || payload.new.email}`, "info");
        setUsers(prev => [payload.new, ...prev]);
      })
      .subscribe();

    const chatsChannel = supabase
      .channel('chats-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chats' }, (payload) => {
        setAllChats(prev => [payload.new, ...prev]);
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'chats' }, (payload) => {
        setAllChats(prev => prev.filter(c => c.id !== payload.old.id));
      })
      .subscribe();

    return () => {
      profilesChannel.unsubscribe();
      chatsChannel.unsubscribe();
    };
  }, []);

  useEffect(() => { loadAllData(); }, []);

  useEffect(() => {
    document.body.style.backgroundColor = darkMode ? '#0f0f1a' : '#f5f5f7';
  }, [darkMode]);

  // ===== دوال التحميل =====
  async function loadAllData() {
    setLoading(true);
    await Promise.all([loadUsers(), loadApiKeys(), loadAllChats()]);
    setLoading(false);
  }
  
  async function loadUsers() {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (data) setUsers(data);
  }
  
  async function loadApiKeys() {
    const { data } = await supabase.from('api_keys').select('*').order('created_at', { ascending: false });
    if (data) setApiKeys(data);
  }
  
  async function loadAllChats() {
    const { data } = await supabase.from('chats').select('*').order('updated_at', { ascending: false }).limit(200);
    if (data) setAllChats(data);
  }
  
  function getUserChats(userId) {
    return allChats.filter(chat => chat.user_id === userId);
  }
  
  function getUserById(userId) {
    return users.find(u => u.id === userId);
  }

  // ===== Toast =====
  function showToast(message, type = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  // ===== فلترة المحادثات =====
  const filteredChats = allChats.filter(chat => {
    if (chatFilterUser && chat.user_id !== chatFilterUser) return false;
    if (chatFilterDate !== "all") {
      const chatDate = new Date(chat.updated_at);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      if (chatFilterDate === "today" && chatDate < today) return false;
      if (chatFilterDate === "week" && chatDate < weekAgo) return false;
      if (chatFilterDate === "month" && chatDate < monthStart) return false;
    }
    if (chatSearchTerm && !(chat.title || "").toLowerCase().includes(chatSearchTerm.toLowerCase())) return false;
    return true;
  });

  // ===== دوال المحادثات =====
  async function deleteSingleChat(chatId) {
    if (!confirm("🗑️ حذف هذه المحادثة؟")) return;
    await supabase.from('chats').delete().eq('id', chatId);
    loadAllChats();
    showToast("تم حذف المحادثة");
  }

  async function deleteAllChatsConfirm() {
    if (!confirm("⚠️ تحذير نهائي!\n\nهل أنت متأكد من حذف كافة المحادثات لجميع المستخدمين؟\n\nلا يمكن التراجع!")) return;
    setLoading(true);
    const { error } = await supabase.from('chats').delete().neq('id', '0');
    if (error) {
      showToast("خطأ: " + error.message, "error");
    } else {
      showToast("تم حذف كل المحادثات");
      loadAllChats();
    }
    setLoading(false);
  }

  // ===== دوال التصدير =====
  function exportToCSV(data, filename) {
    if (!data || data.length === 0) {
      showToast("لا توجد بيانات للتصدير", "error");
      return;
    }
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];
    for (const row of data) {
      const values = headers.map(header => {
        let value = row[header];
        if (value === undefined || value === null) value = '';
        if (typeof value === 'object') value = JSON.stringify(value);
        value = String(value).replace(/"/g, '""');
        if (value.includes(',') || value.includes('"') || value.includes('\n')) value = `"${value}"`;
        return value;
      });
      csvRows.push(values.join(','));
    }
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0,19)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`تم تصدير ${data.length} سجل`);
  }

  function prepareExportData() {
    switch(exportType) {
      case 'users':
        return users.map(u => ({
          'الاسم': u.name || '',
          'البريد الإلكتروني': u.email || '',
          'الاستهلاك اليومي': u.used_today || 0,
          'الحد اليومي': u.daily_limit || 5000,
          'الحالة': u.is_blocked ? 'محظور' : 'نشط',
          'الشخصية': u.personality || 'blak',
          'تاريخ التسجيل': new Date(u.created_at).toLocaleString('ar-EG')
        }));
      case 'keys':
        return apiKeys.map(k => ({
          'الاسم': k.key_name || '',
          'المفتاح': k.key_value || '',
          'الاستهلاك اليومي': k.used_today || 0,
          'الحد اليومي': k.daily_limit || 1000000,
          'نسبة الاستخدام': `${((k.used_today || 0) / (k.daily_limit || 1) * 100).toFixed(2)}%`,
          'الحالة': k.is_active ? 'نشط' : 'معطل'
        }));
      case 'chats':
        return filteredChats.map(c => ({
          'المستخدم': getUserById(c.user_id)?.name || 'مستخدم محذوف',
          'عنوان المحادثة': c.title || 'بدون عنوان',
          'عدد الرسائل': c.messages?.length || 0,
          'آخر تحديث': new Date(c.updated_at).toLocaleString('ar-EG')
        }));
      default: return [];
    }
  }

  // ===== دوال المستخدمين =====
  const filteredUsers = users.filter(u => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return u.name?.toLowerCase().includes(term) || u.email?.toLowerCase().includes(term);
  });
  
  async function openUserChatsModal(userId, userName) {
    const { data } = await supabase.from('chats').select('*').eq('user_id', userId).order('updated_at', { ascending: false });
    setSelectedUserForChats({ id: userId, name: userName });
    setUserChatsList(data || []);
    setShowUserChatsModal(true);
  }
  
  async function deleteChatFromModal(chatId) {
    if (!confirm("حذف هذه المحادثة؟")) return;
    await supabase.from('chats').delete().eq('id', chatId);
    const { data } = await supabase.from('chats').select('*').eq('user_id', selectedUserForChats.id).order('updated_at', { ascending: false });
    setUserChatsList(data || []);
    loadAllChats();
    showToast("تم حذف المحادثة");
  }
  
  function openChatViewer(chat) {
    setSelectedChat(chat);
    setShowChatModal(true);
  }
  
  async function addApiKey() {
    if (!newKeyValue.trim()) { showToast("أدخل قيمة المفتاح", "error"); return; }
    const { error } = await supabase.from('api_keys').insert({
      key_value: newKeyValue.trim(),
      key_name: newKeyName.trim() || "مفتاح Groq",
      daily_limit: newKeyLimit,
      used_today: 0,
      is_active: true
    });
    if (error) {
      showToast("خطأ: " + error.message, "error");
    } else {
      showToast("تم إضافة المفتاح");
      setShowAddKeyModal(false);
      setNewKeyValue(""); setNewKeyName(""); setNewKeyLimit(1000000);
      loadApiKeys();
    }
  }
  
  async function deleteKey(keyId) {
    if (!confirm("متأكد من حذف هذا المفتاح؟")) return;
    await supabase.from('api_keys').delete().eq('id', keyId);
    loadApiKeys();
    showToast("تم حذف المفتاح");
  }
  
  async function toggleKeyStatus(keyId, currentStatus) {
    await supabase.from('api_keys').update({ is_active: !currentStatus }).eq('id', keyId);
    loadApiKeys();
  }
  
  async function resetKeyUsage(keyId) {
    await supabase.from('api_keys').update({ used_today: 0 }).eq('id', keyId);
    loadApiKeys();
    showToast("تم تصفير استهلاك المفتاح");
  }
  
  async function toggleUserBlock(userId, isBlocked) {
    await supabase.from('profiles').update({ is_blocked: !isBlocked }).eq('id', userId);
    loadUsers();
  }
  
  async function deleteAllUserChats(userId, userName) {
    if (!confirm(`⚠️ حذف كل محادثات "${userName}"؟\n\nلا يمكن التراجع!`)) return;
    await supabase.from('chats').delete().eq('user_id', userId);
    showToast(`تم حذف كل محادثات ${userName}`);
    loadAllChats();
    if (selectedUserForChats?.id === userId) setUserChatsList([]);
  }
  
  async function deleteUser(userId, userName) {
    if (!confirm(`⚠️ تحذير: هل أنت متأكد من حذف "${userName}" نهائياً؟\n\nسيتم حذف الحساب وجميع المحادثات.\n\nلا يمكن التراجع!`)) return;
    try {
      await supabase.from('chats').delete().eq('user_id', userId);
      await supabase.from('profiles').delete().eq('id', userId);
      showToast(`تم حذف ${userName} نهائياً`);
      loadUsers(); loadAllChats();
    } catch (err) {
      showToast("خطأ في حذف المستخدم: " + err.message, "error");
    }
  }
  
  async function saveUserSettings() {
    if (!selectedUser) return;
    await supabase.from('profiles').update({ daily_limit: editDailyLimit }).eq('id', selectedUser.id);
    showToast("تم حفظ الإعدادات");
    setShowEditUserModal(false);
    loadUsers();
  }

  async function changePersonality(userId, personality) {
    await supabase.from("profiles").update({ personality }).eq("id", userId);
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, personality } : u));
    showToast("تم تغيير الشخصية");
  }

  // ===== Shared Input Style =====
  const inputStyle = {
    padding: "10px 16px",
    borderRadius: "10px",
    border: `1px solid ${theme.border}`,
    background: theme.inputBg,
    color: theme.text,
    fontSize: "14px",
    outline: "none",
    fontFamily: "inherit",
  };

  const modalInputStyle = {
    width: "100%",
    padding: "10px",
    marginBottom: "12px",
    borderRadius: "10px",
    background: theme.inputBg,
    color: theme.text,
    border: `1px solid ${theme.border}`,
    outline: "none",
    fontFamily: "inherit",
    fontSize: "14px",
  };

  // ===== JSX =====
  return (
    <div style={{ 
      background: theme.bg,
      color: theme.text,
      minHeight: '100vh',
      transition: 'background 0.3s, color 0.3s',
      fontFamily: "'Cairo', 'Segoe UI', Tahoma, sans-serif",
      direction: 'rtl',
    }}>

      {/* ===== Toast ===== */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: toast.type === 'error' ? '#ef4444' : toast.type === 'info' ? '#3b82f6' : '#10b981',
          color: '#fff',
          padding: '12px 24px',
          borderRadius: '12px',
          zIndex: 9999,
          boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          animation: 'adminSlideDown 0.3s ease',
          whiteSpace: 'nowrap',
          fontSize: '14px',
          fontWeight: 'bold',
        }}>
          {toast.type === 'error' ? '❌ ' : toast.type === 'info' ? 'ℹ️ ' : '✅ '}
          {toast.message}
        </div>
      )}

      {/* ===== Header ===== */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '14px 16px',
        background: theme.surface,
        borderBottom: `1px solid ${theme.border}`,
        position: 'sticky',
        top: 0,
        zIndex: 100,
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '28px' }}>🖤</span>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 'bold' }}>لوحة التحكم</div>
            <div style={{ fontSize: '13px', opacity: 0.6 }}>👑 {user.name || user.email}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* زر Dark/Light */}
          <button
            onClick={() => { const n = !darkMode; setDarkMode(n); localStorage.setItem('adminDarkMode', n); }}
            style={{ background: 'transparent', border: `1px solid ${theme.borderStrong}`, color: theme.text, padding: '8px 12px', borderRadius: '10px', cursor: 'pointer', fontSize: '18px' }}
            title={darkMode ? "الوضع النهاري" : "الوضع الليلي"}
          >
            {darkMode ? "☀️" : "🌙"}
          </button>
          {/* زر فتح الشات */}
          <button
            onClick={() => window.open('/', '_blank')}
            style={{ background: '#6c5ce7', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
          >
            🖤 فتح الشات
          </button>
          {/* زر التصدير */}
          <button
            onClick={() => { setExportType('users'); setShowExportModal(true); }}
            style={{ background: '#f59e0b', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
          >
            📥 تصدير
          </button>
          {/* زر الخروج */}
          <button
            onClick={onLogout}
            style={{ background: 'rgba(248,113,113,0.15)', color: '#f87171', border: '1px solid rgba(248,113,113,0.3)', padding: '8px 16px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
          >
            خروج
          </button>
        </div>
      </div>

      {/* ===== Tabs ===== */}
      <div style={{
        display: 'flex',
        gap: '4px',
        padding: '8px',
        background: theme.surface,
        borderBottom: `1px solid ${theme.border}`,
        position: 'sticky',
        top: '65px',
        zIndex: 99,
        flexWrap: 'wrap',
      }}>
        {[
          { id: 'users', label: `👥 المستخدمين (${users.length})` },
          { id: 'keys', label: `🔑 المفاتيح (${apiKeys.filter(k => k.is_active).length}/${apiKeys.length})` },
          { id: 'chats', label: `💬 المحادثات (${filteredChats.length}/${allChats.length})` },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              minWidth: '80px',
              padding: '10px 8px',
              background: activeTab === tab.id ? theme.tabActiveBg : 'transparent',
              color: activeTab === tab.id ? theme.tabActiveColor : theme.tabInactiveColor,
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: activeTab === tab.id ? 'bold' : 'normal',
              fontFamily: 'inherit',
              transition: 'all 0.2s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ===== محتوى التبويبات ===== */}
      <div style={{ padding: '16px' }}>

        {/* ===== تبويبة المستخدمين ===== */}
        {activeTab === "users" && (
          <div style={{ background: theme.surface, borderRadius: '16px', padding: '16px', border: `1px solid ${theme.border}` }}>
            {/* رأس التبويبة */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px' }}>👥 قائمة المستخدمين</h2>
                <div style={{ fontSize: '13px', opacity: 0.6, marginTop: '4px' }}>
                  إجمالي: {filteredUsers.length} / {users.length}
                  {searchTerm && <span style={{ marginRight: '8px', color: '#a29bfe' }}>🔍 نتائج البحث</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="🔍 بحث بالاسم أو البريد..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ ...inputStyle, minWidth: '200px' }}
                />
                <button onClick={loadAllData} style={{ background: 'rgba(108,92,231,0.2)', color: '#a29bfe', border: 'none', padding: '10px 16px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px' }}>
                  🔄 تحديث
                </button>
              </div>
            </div>

            {/* الجدول */}
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '650px' }}>
                <thead>
                  <tr style={{ background: darkMode ? 'rgba(108,92,231,0.1)' : 'rgba(108,92,231,0.07)' }}>
                    {['المستخدم', 'الاستهلاك اليومي', 'المحادثات', 'الشخصية', 'الحالة', 'الإجراءات'].map(h => (
                      <th key={h} style={{ padding: '12px 10px', textAlign: 'right', fontSize: '13px', fontWeight: 'bold', color: darkMode ? '#a29bfe' : '#6c5ce7', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px', opacity: 0.5 }}>لا توجد نتائج</td></tr>
                  ) : filteredUsers.map(u => {
                    const chatCount = getUserChats(u.id).length;
                    const used = u.used_today || 0;
                    const limit = u.daily_limit || 5000;
                    const percent = getUsagePercent(used, limit);
                    const color = getUsageColor(percent);
                    return (
                      <tr key={u.id} style={{ borderBottom: `1px solid ${theme.border}` }}>
                        <td style={{ padding: '10px' }}>
                          <strong style={{ fontSize: '14px' }}>{u.name || "مستخدم"}</strong>
                          <br />
                          <span style={{ fontFamily: 'monospace', fontSize: '11px', opacity: 0.5 }}>{u.email}</span>
                        </td>
                        <td style={{ padding: '10px' }}>
                          <div style={{ minWidth: '140px' }}>
                            <div style={{ fontSize: '12px', marginBottom: '4px' }}>{used.toLocaleString()} / {limit.toLocaleString()} توكن</div>
                            <div style={{ width: '100%', height: '4px', background: theme.barBg, borderRadius: '2px', overflow: 'hidden' }}>
                              <div style={{ width: percent + '%', height: '100%', background: color, transition: 'width 0.3s' }} />
                            </div>
                            <div style={{ fontSize: '10px', opacity: 0.6, marginTop: '2px' }}>{percent.toFixed(0)}%</div>
                          </div>
                        </td>
                        <td style={{ padding: '10px' }}>
                          <button
                            onClick={() => openUserChatsModal(u.id, u.name || u.email)}
                            style={{ background: 'rgba(251,191,36,0.2)', color: '#fbbf24', border: 'none', padding: '4px 10px', borderRadius: '20px', cursor: 'pointer', fontSize: '12px' }}
                          >
                            💬 {chatCount}
                          </button>
                        </td>
                        <td style={{ padding: '10px' }}>
                          <select
                            value={u.personality || DEFAULT_PERSONALITY}
                            onChange={e => changePersonality(u.id, e.target.value)}
                            style={{ background: theme.inputBg, color: theme.text, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '6px 10px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}
                          >
                            {Object.entries(PERSONALITY_LABELS).map(([key, label]) => (
                              <option key={key} value={key} style={{ background: theme.surface }}>{label}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ padding: '10px' }}>
                          <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '12px', background: u.is_blocked ? 'rgba(248,113,113,0.15)' : 'rgba(74,222,128,0.15)', color: u.is_blocked ? '#f87171' : '#4ade80' }}>
                            {u.is_blocked ? "محظور" : "نشط"}
                          </span>
                        </td>
                        <td style={{ padding: '10px' }}>
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            <button onClick={() => { setSelectedUser(u); setEditDailyLimit(u.daily_limit || 5000); setShowEditUserModal(true); }} style={{ background: 'rgba(251,191,36,0.2)', color: '#fbbf24', border: 'none', padding: '5px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>⚙️</button>
                            <button onClick={() => toggleUserBlock(u.id, u.is_blocked)} style={{ background: u.is_blocked ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)', color: u.is_blocked ? '#4ade80' : '#f87171', border: 'none', padding: '5px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>{u.is_blocked ? "فك الحظر" : "حظر"}</button>
                            <button onClick={() => deleteUser(u.id, u.name || u.email)} style={{ background: 'rgba(248,113,113,0.2)', color: '#f87171', border: 'none', padding: '5px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>🗑️ حذف</button>
                            <button onClick={() => deleteAllUserChats(u.id, u.name || u.email)} style={{ background: 'rgba(248,113,113,0.2)', color: '#f87171', border: 'none', padding: '5px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>🗑️ محادثات</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===== تبويبة المفاتيح ===== */}
        {activeTab === "keys" && (
          <div style={{ background: theme.surface, borderRadius: '16px', padding: '16px', border: `1px solid ${theme.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px' }}>🔑 مفاتيح API العامة</h2>
                <div style={{ fontSize: '13px', opacity: 0.6, marginTop: '4px' }}>
                  إجمالي: {apiKeys.length} &nbsp;|&nbsp; ✅ نشط: {apiKeys.filter(k => k.is_active).length} &nbsp;|&nbsp; ⚠️ معطل: {apiKeys.filter(k => !k.is_active).length}
                </div>
              </div>
              <button
                onClick={() => setShowAddKeyModal(true)}
                style={{ background: 'linear-gradient(135deg, #6c5ce7, #8b5cf6)', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}
              >
                ➕ إضافة مفتاح
              </button>
            </div>
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                <thead>
                  <tr style={{ background: darkMode ? 'rgba(108,92,231,0.1)' : 'rgba(108,92,231,0.07)' }}>
                    {['الاسم', 'المفتاح', 'الاستهلاك', 'الحد اليومي', 'الحالة', 'الإجراءات'].map(h => (
                      <th key={h} style={{ padding: '12px 10px', textAlign: 'right', fontSize: '13px', fontWeight: 'bold', color: darkMode ? '#a29bfe' : '#6c5ce7', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {apiKeys.length === 0 ? (
                    <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px', opacity: 0.5 }}>لا توجد مفاتيح</td></tr>
                  ) : apiKeys.map(key => {
                    const percent = getUsagePercent(key.used_today || 0, key.daily_limit || 1000000);
                    const color = getUsageColor(percent);
                    return (
                      <tr key={key.id} style={{ borderBottom: `1px solid ${theme.border}` }}>
                        <td style={{ padding: '10px', fontSize: '14px' }}>{key.key_name || "مفتاح Groq"}</td>
                        <td style={{ padding: '10px' }}><span style={{ fontFamily: 'monospace', fontSize: '12px', opacity: 0.6 }}>{key.key_value?.slice(0, 25)}...</span></td>
                        <td style={{ padding: '10px' }}>
                          <div style={{ minWidth: '140px' }}>
                            <div style={{ fontSize: '12px', marginBottom: '4px' }}>{(key.used_today || 0).toLocaleString()} / {(key.daily_limit || 0).toLocaleString()}</div>
                            <div style={{ width: '100%', height: '4px', background: theme.barBg, borderRadius: '2px', overflow: 'hidden' }}>
                              <div style={{ width: percent + '%', height: '100%', background: color, transition: 'width 0.3s' }} />
                            </div>
                            <div style={{ fontSize: '10px', opacity: 0.6, marginTop: '2px' }}>{percent.toFixed(0)}%</div>
                          </div>
                        </td>
                        <td style={{ padding: '10px', fontSize: '13px' }}>{(key.daily_limit || 0).toLocaleString()}</td>
                        <td style={{ padding: '10px' }}>
                          <button
                            onClick={() => toggleKeyStatus(key.id, key.is_active)}
                            style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '12px', border: 'none', cursor: 'pointer', background: key.is_active ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)', color: key.is_active ? '#4ade80' : '#f87171' }}
                          >
                            {key.is_active ? "نشط" : "معطل"}
                          </button>
                        </td>
                        <td style={{ padding: '10px' }}>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button onClick={() => resetKeyUsage(key.id)} style={{ background: 'rgba(251,191,36,0.2)', color: '#fbbf24', border: 'none', padding: '5px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>🔄</button>
                            <button onClick={() => deleteKey(key.id)} style={{ background: 'rgba(248,113,113,0.2)', color: '#f87171', border: 'none', padding: '5px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>🗑️</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===== تبويبة المحادثات ===== */}
        {activeTab === "chats" && (
          <div style={{ background: theme.surface, borderRadius: '16px', padding: '16px', border: `1px solid ${theme.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px' }}>💬 سجل المحادثات</h2>
                <div style={{ fontSize: '13px', opacity: 0.6, marginTop: '4px' }}>
                  معروض: {filteredChats.length} / {allChats.length}
                  {(chatFilterUser || chatFilterDate !== "all" || chatSearchTerm) && <span style={{ marginRight: '8px', color: '#a29bfe' }}>🔍 مصفى</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <select value={chatFilterUser} onChange={e => setChatFilterUser(e.target.value)} style={{ ...inputStyle, minWidth: '140px' }}>
                  <option value="">👥 كل المستخدمين</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name || u.email?.split('@')[0]}</option>)}
                </select>
                <select value={chatFilterDate} onChange={e => setChatFilterDate(e.target.value)} style={inputStyle}>
                  <option value="all">📅 كل الوقت</option>
                  <option value="today">اليوم</option>
                  <option value="week">آخر 7 أيام</option>
                  <option value="month">هذا الشهر</option>
                </select>
                <input type="text" placeholder="🔍 بحث في العناوين..." value={chatSearchTerm} onChange={e => setChatSearchTerm(e.target.value)} style={{ ...inputStyle, minWidth: '180px' }} />
                <button onClick={loadAllChats} style={{ background: 'rgba(108,92,231,0.2)', color: '#a29bfe', border: 'none', padding: '10px 16px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px' }}>🔄</button>
                <button onClick={deleteAllChatsConfirm} style={{ background: 'rgba(248,113,113,0.2)', color: '#f87171', border: 'none', padding: '10px 16px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px' }}>🗑️ حذف الكل</button>
              </div>
            </div>
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '580px' }}>
                <thead>
                  <tr style={{ background: darkMode ? 'rgba(108,92,231,0.1)' : 'rgba(108,92,231,0.07)' }}>
                    {['المستخدم', 'عنوان المحادثة', 'الرسائل', 'آخر تحديث', 'الإجراءات'].map(h => (
                      <th key={h} style={{ padding: '12px 10px', textAlign: 'right', fontSize: '13px', fontWeight: 'bold', color: darkMode ? '#a29bfe' : '#6c5ce7', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredChats.length === 0 ? (
                    <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px', opacity: 0.5 }}>💬 لا توجد محادثات</td></tr>
                  ) : filteredChats.map(chat => {
                    const chatUser = getUserById(chat.user_id);
                    return (
                      <tr key={chat.id} style={{ borderBottom: `1px solid ${theme.border}` }}>
                        <td style={{ padding: '10px' }}>
                          <strong style={{ fontSize: '14px' }}>{chatUser?.name || "مستخدم محذوف"}</strong>
                          <br />
                          <span style={{ fontFamily: 'monospace', fontSize: '11px', opacity: 0.5 }}>{chatUser?.email?.slice(0, 25) || "ID: " + chat.user_id?.slice(0, 8)}</span>
                        </td>
                        <td style={{ padding: '10px', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '14px' }}>
                          {chat.title || "محادثة بدون عنوان"}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          <span style={{ background: 'rgba(108,92,231,0.2)', color: '#a29bfe', padding: '3px 10px', borderRadius: '20px', fontSize: '12px' }}>{chat.messages?.length || 0}</span>
                        </td>
                        <td style={{ padding: '10px', fontSize: '12px', opacity: 0.7, whiteSpace: 'nowrap' }}>{formatDate(chat.updated_at)}</td>
                        <td style={{ padding: '10px' }}>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button onClick={() => openChatViewer(chat)} style={{ background: 'rgba(108,92,231,0.2)', color: '#a29bfe', border: 'none', padding: '5px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>👁️</button>
                            <button onClick={() => deleteSingleChat(chat.id)} style={{ background: 'rgba(248,113,113,0.2)', color: '#f87171', border: 'none', padding: '5px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>🗑️</button>
                            {chatUser && (
                              <button onClick={() => deleteAllUserChats(chat.user_id, chatUser.name)} title="حذف كل محادثات هذا المستخدم" style={{ background: 'rgba(248,113,113,0.2)', color: '#f87171', border: 'none', padding: '5px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>📂🗑️</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* ===== مودال إضافة مفتاح ===== */}
      {showAddKeyModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ background: theme.surface2, padding: '24px', borderRadius: '16px', width: '100%', maxWidth: '480px', border: `1px solid ${theme.border}`, color: theme.text }}>
            <h3 style={{ marginBottom: '20px', fontSize: '18px' }}>➕ إضافة مفتاح API</h3>
            <input style={modalInputStyle} type="text" placeholder="اسم المفتاح" value={newKeyName} onChange={e => setNewKeyName(e.target.value)} />
            <input style={{ ...modalInputStyle, fontFamily: 'monospace' }} type="text" placeholder="gsk_xxxxxxxxxxxx" value={newKeyValue} onChange={e => setNewKeyValue(e.target.value)} />
            <input style={modalInputStyle} type="number" placeholder="الحد اليومي" value={newKeyLimit} onChange={e => setNewKeyLimit(parseInt(e.target.value) || 0)} />
            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
              <button onClick={addApiKey} style={{ flex: 1, padding: '12px', background: 'linear-gradient(135deg, #6c5ce7, #8b5cf6)', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '14px', fontWeight: 'bold' }}>✅ إضافة</button>
              <button onClick={() => setShowAddKeyModal(false)} style={{ flex: 1, padding: '12px', background: theme.inputBg, color: theme.text, border: `1px solid ${theme.border}`, borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '14px' }}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== مودال تعديل المستخدم ===== */}
      {showEditUserModal && selectedUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ background: theme.surface2, padding: '24px', borderRadius: '16px', width: '100%', maxWidth: '400px', border: `1px solid ${theme.border}`, color: theme.text }}>
            <h3 style={{ marginBottom: '20px', fontSize: '18px' }}>⚙️ تعديل حد {selectedUser.name || selectedUser.email}</h3>
            <label style={{ fontSize: '13px', opacity: 0.7, display: 'block', marginBottom: '6px' }}>الحد اليومي (توكن)</label>
            <input style={modalInputStyle} type="number" value={editDailyLimit} onChange={e => setEditDailyLimit(parseInt(e.target.value) || 0)} />
            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
              <button onClick={saveUserSettings} style={{ flex: 1, padding: '12px', background: 'linear-gradient(135deg, #6c5ce7, #8b5cf6)', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '14px', fontWeight: 'bold' }}>💾 حفظ</button>
              <button onClick={() => setShowEditUserModal(false)} style={{ flex: 1, padding: '12px', background: theme.inputBg, color: theme.text, border: `1px solid ${theme.border}`, borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '14px' }}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== مودال تصدير البيانات ===== */}
      {showExportModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ background: theme.surface2, padding: '24px', borderRadius: '16px', width: '100%', maxWidth: '380px', border: `1px solid ${theme.border}`, color: theme.text }}>
            <h3 style={{ marginBottom: '20px', fontSize: '18px' }}>📥 تصدير البيانات</h3>
            <label style={{ fontSize: '13px', opacity: 0.7, display: 'block', marginBottom: '8px' }}>نوع البيانات:</label>
            <select value={exportType} onChange={e => setExportType(e.target.value)} style={{ ...modalInputStyle }}>
              <option value="users">👥 المستخدمين</option>
              <option value="keys">🔑 المفاتيح</option>
              <option value="chats">💬 المحادثات</option>
            </select>
            <div style={{ background: darkMode ? 'rgba(108,92,231,0.1)' : 'rgba(108,92,231,0.05)', padding: '12px', borderRadius: '10px', marginBottom: '16px', fontSize: '13px', border: `1px solid rgba(108,92,231,0.2)` }}>
              📊 عدد السجلات: <strong>{prepareExportData().length}</strong>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => { exportToCSV(prepareExportData(), exportType); setShowExportModal(false); }} style={{ flex: 1, padding: '12px', background: 'linear-gradient(135deg, #6c5ce7, #8b5cf6)', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '14px', fontWeight: 'bold' }}>📥 تصدير CSV</button>
              <button onClick={() => setShowExportModal(false)} style={{ flex: 1, padding: '12px', background: theme.inputBg, color: theme.text, border: `1px solid ${theme.border}`, borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '14px' }}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== مودال محادثات المستخدم ===== */}
      {showUserChatsModal && selectedUserForChats && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ background: theme.surface2, padding: '24px', borderRadius: '16px', width: '100%', maxWidth: '680px', maxHeight: '80vh', overflowY: 'auto', border: `1px solid ${theme.border}`, color: theme.text }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '18px' }}>💬 محادثات {selectedUserForChats.name}</h3>
              <button onClick={() => setShowUserChatsModal(false)} style={{ background: 'transparent', border: 'none', color: theme.text, fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>
            {userChatsList.length === 0 ? (
              <p style={{ textAlign: 'center', opacity: 0.5, marginTop: '30px' }}>لا توجد محادثات</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {userChatsList.map(chat => (
                  <div key={chat.id} style={{ background: theme.rowHover, borderRadius: '12px', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', border: `1px solid ${theme.border}` }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{chat.title || "محادثة بدون عنوان"}</div>
                      <div style={{ fontSize: '11px', opacity: 0.5 }}>{formatDate(chat.updated_at)} · {chat.messages?.length || 0} رسالة</div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                      <button onClick={() => openChatViewer(chat)} style={{ background: 'rgba(108,92,231,0.2)', color: '#a29bfe', border: 'none', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}>👁️ عرض</button>
                      <button onClick={() => deleteChatFromModal(chat.id)} style={{ background: 'rgba(248,113,113,0.2)', color: '#f87171', border: 'none', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}>🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button onClick={() => deleteAllUserChats(selectedUserForChats.id, selectedUserForChats.name)} style={{ background: 'rgba(248,113,113,0.2)', color: '#f87171', border: '1px solid rgba(248,113,113,0.3)', padding: '10px 16px', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px' }}>🗑️ حذف الكل</button>
              <button onClick={() => setShowUserChatsModal(false)} style={{ flex: 1, padding: '10px', background: theme.inputBg, color: theme.text, border: `1px solid ${theme.border}`, borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '14px' }}>إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== مودال عرض المحادثة ===== */}
      {showChatModal && selectedChat && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ background: theme.surface2, padding: '24px', borderRadius: '16px', width: '100%', maxWidth: '680px', maxHeight: '80vh', overflowY: 'auto', border: `1px solid ${theme.border}`, color: theme.text }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '18px' }}>💬 {selectedChat.title || "محادثة"}</h3>
              <button onClick={() => setShowChatModal(false)} style={{ background: 'transparent', border: 'none', color: theme.text, fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {selectedChat.messages?.map((msg, idx) => (
                <div key={idx} style={{ background: msg.role === "user" ? (darkMode ? "rgba(108,92,231,0.15)" : "rgba(108,92,231,0.08)") : theme.rowHover, padding: '12px 16px', borderRadius: '12px', borderRight: msg.role === "user" ? "3px solid #6c5ce7" : "none", border: msg.role !== "user" ? `1px solid ${theme.border}` : undefined }}>
                  <div style={{ fontSize: '12px', opacity: 0.6, marginBottom: '8px' }}>{msg.role === "user" ? "👤 المستخدم" : "🖤 بلاك"}</div>
                  <div style={{ fontSize: '14px', lineHeight: 1.7 }}><MessageContent content={msg.content} /></div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '20px' }}>
              <button onClick={() => setShowChatModal(false)} style={{ width: '100%', padding: '12px', background: theme.inputBg, color: theme.text, border: `1px solid ${theme.border}`, borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '14px' }}>إغلاق</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
