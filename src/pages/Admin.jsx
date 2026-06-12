import { useState, useEffect } from "react";
import { supabase } from '../lib/supabase';
import MessageContent from "../components/MessageContent";
import { formatDate, getUsagePercent, getUsageColor, truncate } from '../utils/helpers';
import { PERSONALITY_LABELS, DEFAULT_PERSONALITY } from '../config/personalities';
import { validateGroqKey, validateAllKeys } from '../utils/groqValidator';

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
  const [showMenu, setShowMenu] = useState(false);
  
  // ✅ نظام فحص المفاتيح
  const [validating, setValidating] = useState(false);
  const [validationProgress, setValidationProgress] = useState({ current: 0, total: 0, name: '', status: '' });
  const [validationResults, setValidationResults] = useState([]);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationLogs, setValidationLogs] = useState([]);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [autoValidate, setAutoValidate] = useState(() => {
    return localStorage.getItem('auto_validate_keys') === 'true';
  });
  const [validationInterval, setValidationInterval] = useState(null);
  const [showFullKey, setShowFullKey] = useState({});
  
  // ✅ جديد: حالة المتصلين (Presence)
  const [onlineUsers, setOnlineUsers] = useState({});

  // ===== CSS Variables للـ Dark/Light Mode =====
  const theme = {
    bg: darkMode ? '#1a1a2e' : '#f0f2f5',
    surface: darkMode ? '#2a2a3e' : '#ffffff',
    surface2: darkMode ? '#22223a' : '#f8f9fa',
    border: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    borderStrong: darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
    text: darkMode ? '#e8e8e8' : '#2c3e50',
    textMuted: darkMode ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)',
    inputBg: darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
    rowHover: darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
    barBg: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
    tabActiveBg: darkMode ? 'rgba(108,92,231,0.15)' : 'rgba(108,92,231,0.08)',
    tabActiveColor: darkMode ? '#c4b5fd' : '#6c5ce7',
    tabInactiveColor: darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
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
  // ✅ إضافة DELETE
  .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'profiles' }, (payload) => {
    setUsers(prev => prev.filter(u => u.id !== payload.old.id));
    showToast(`تم حذف مستخدم`, "info");
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

    // ✅ قناة Realtime للمفاتيح - مدمجة بدل قناة منفصلة
    const apiKeysChannel = supabase
      .channel('api-keys-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'api_keys' }, () => {
        loadApiKeys();
      })
      .subscribe();

    return () => {
      profilesChannel.unsubscribe();
      chatsChannel.unsubscribe();
      apiKeysChannel.unsubscribe();
    };
  }, []);

  useEffect(() => { loadAllData(); }, []);

  useEffect(() => {
    document.body.style.backgroundColor = darkMode ? '#1a1a2e' : '#f0f2f5';
  }, [darkMode]);

  // ✅ مراقبة المتصلين (Presence)
  useEffect(() => {
    const presenceChannel = supabase.channel('online-users', {
      config: { presence: { key: 'admin-monitor' } }
    });

    presenceChannel.on('presence', { event: 'sync' }, () => {
      const state = presenceChannel.presenceState();
      setOnlineUsers(state);
    });

    presenceChannel.subscribe();

    return () => {
      presenceChannel.unsubscribe();
    };
  }, []);

  // ✅ تفعيل الفحص التلقائي
  useEffect(() => {
    let interval = null;
    if (autoValidate) {
      interval = setInterval(() => {
        handleValidateKeys(true);
      }, 60 * 60 * 1000);
      setValidationInterval(interval);
    } else {
      if (validationInterval) {
        clearInterval(validationInterval);
        setValidationInterval(null);
      }
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoValidate]);

  // ✅ دالة التحقق من حالة الاتصال
  function isUserOnline(userId) {
    return Object.keys(onlineUsers).some(key => {
      const usersInKey = onlineUsers[key];
      return usersInKey && usersInKey.some(u => u.user_id === userId);
    });
  }

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
          'الحالة': k.is_active ? 'نشط' : 'معطل',
          'صحة المفتاح': k.is_valid ? 'صالح' : (k.invalid_reason || 'غير صالح'),
          'آخر فحص': k.last_checked_at ? new Date(k.last_checked_at).toLocaleString('ar-EG') : 'لم يفحص'
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
  
  // ===== دوال فحص المفاتيح =====
  
  async function validateNewKeyBeforeAdd(keyValue) {
    setValidating(true);
    const result = await validateGroqKey(keyValue);
    setValidating(false);
    
    if (!result.valid) {
      showToast(`❌ المفتاح غير صالح: ${result.reason}`, 'error');
      return false;
    }
    
    showToast('✅ المفتاح صالح', 'success');
    return true;
  }
  
  async function checkDuplicateKey(keyValue) {
    const exists = apiKeys.some(k => k.key_value === keyValue);
    if (exists) {
      showToast('❌ هذا المفتاح موجود بالفعل', 'error');
      return true;
    }
    return false;
  }
  
  async function handleValidateKeys(silent = false) {
    if (!silent) setValidating(true);
    setValidationResults([]);
    
    await validateAllKeys(
      (current, total, name, result) => {
        setValidationProgress({
          current, total, name,
          status: result.valid ? '✅ صالح' : '❌ غير صالح'
        });
      },
      (results) => {
        setValidationResults(results);
        if (!silent) {
          setValidating(false);
          setShowValidationModal(true);
        }
        loadApiKeys();
        
        const invalidCount = results.filter(r => !r.valid).length;
        if (invalidCount > 0) {
          showToast(`⚠️ تم العثور على ${invalidCount} مفتاح غير صالح`, 'error');
        } else if (invalidCount === 0 && !silent) {
          showToast(`✅ جميع المفاتيح (${results.length}) صالحة`, 'success');
        }
        
        // تسجيل الفحص في السجل
        supabase.from('key_check_logs').insert({
          check_type: silent ? 'auto' : 'manual',
          total_keys: results.length,
          valid_keys: results.filter(r => r.valid).length,
          invalid_keys: results.filter(r => !r.valid).length,
          details: results
        }).then(() => loadValidationLogs());
      }
    );
  }
  
  async function testSingleKey(key) {
    setValidating(true);
    const result = await validateGroqKey(key.key_value);
    
    await supabase.from('api_keys').update({
      last_checked_at: new Date().toISOString(),
      is_valid: result.valid,
      invalid_reason: result.valid ? null : result.reason,
      is_active: result.valid ? key.is_active : false
    }).eq('id', key.id);
    
    loadApiKeys();
    showToast(result.valid ? '✅ المفتاح صالح' : `❌ ${result.reason}`, result.valid ? 'success' : 'error');
    setValidating(false);
  }
  
  async function reactivateKey(keyId) {
    await supabase.from('api_keys').update({
      is_active: true,
      is_valid: true,
      invalid_reason: null
    }).eq('id', keyId);
    
    loadApiKeys();
    showToast('✅ تم إعادة تفعيل المفتاح', 'success');
  }
  
  function exportKeysToCSV() {
    const exportData = apiKeys.map(k => ({
      'الاسم': k.key_name || '',
      'المفتاح': k.key_value || '',
      'الحد اليومي': k.daily_limit || 1000000,
      'الاستهلاك اليومي': k.used_today || 0,
      'نسبة الاستخدام': `${((k.used_today || 0) / (k.daily_limit || 1) * 100).toFixed(2)}%`,
      'الحالة': k.is_active ? 'نشط' : 'معطل',
      'صحة المفتاح': k.is_valid ? 'صالح' : (k.invalid_reason || 'غير صالح'),
      'آخر فحص': k.last_checked_at ? new Date(k.last_checked_at).toLocaleString('ar-EG') : 'لم يفحص'
    }));
    
    exportToCSV(exportData, 'api_keys_export');
  }
  
  async function loadValidationLogs() {
    const { data } = await supabase
      .from('key_check_logs')
      .select('*')
      .order('checked_at', { ascending: false })
      .limit(50);
    
    if (data) setValidationLogs(data);
  }
  
  function toggleAutoValidate() {
    const newValue = !autoValidate;
    setAutoValidate(newValue);
    localStorage.setItem('auto_validate_keys', String(newValue));
    showToast(newValue ? '✅ تم تفعيل الفحص التلقائي كل ساعة' : '⏹️ تم إيقاف الفحص التلقائي', 'info');
  }
  
  // ===== دوال المفاتيح =====
  
  async function addApiKey() {
    if (!newKeyValue.trim()) { 
      showToast("أدخل قيمة المفتاح", "error"); 
      return; 
    }
    
    // التحقق من التكرار
    const isDuplicate = await checkDuplicateKey(newKeyValue.trim());
    if (isDuplicate) return;
    
    // التحقق من صحة المفتاح مع Groq
    const isValid = await validateNewKeyBeforeAdd(newKeyValue.trim());
    if (!isValid) return;
    
    const { error } = await supabase.from('api_keys').insert({
      key_value: newKeyValue.trim(),
      key_name: newKeyName.trim() || "مفتاح Groq",
      daily_limit: newKeyLimit,
      used_today: 0,
      is_active: true,
      is_valid: true,
      last_checked_at: new Date().toISOString()
    });
    
    if (error) {
      showToast("خطأ: " + error.message, "error");
    } else {
      showToast("✅ تم إضافة المفتاح بنجاح");
      setShowAddKeyModal(false);
      setNewKeyValue(""); 
      setNewKeyName(""); 
      setNewKeyLimit(1000000);
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
    padding: "8px 12px",
    borderRadius: "8px",
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
          padding: '10px 20px',
          borderRadius: '10px',
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
        padding: '8px 12px',
        background: theme.surface,
        borderBottom: `1px solid ${theme.border}`,
        position: 'sticky',
        top: 0,
        zIndex: 100,
        flexWrap: 'wrap',
        gap: '8px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '24px' }}>🖤</span>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 'bold' }}>لوحة التحكم</div>
            <div style={{ fontSize: '14px', opacity: 0.6 }}>👑 {user.name || user.email}</div>
          </div>
        </div>
        
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            style={{
              background: theme.surface2,
              border: `1px solid ${theme.border}`,
              color: theme.text,
              padding: '6px 12px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '15px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            ☰ القائمة
          </button>
          
          {showMenu && (
            <>
              <div onClick={() => setShowMenu(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 200 }} />
              <div style={{
                position: 'absolute',
                top: '45px',
                left: '0',
                background: theme.surface2,
                border: `1px solid ${theme.border}`,
                borderRadius: '12px',
                padding: '8px',
                minWidth: '160px',
                zIndex: 201,
                boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
              }}>
                <button onClick={() => { const n = !darkMode; setDarkMode(n); localStorage.setItem('adminDarkMode', n); setShowMenu(false); }} style={{ width: '100%', textAlign: 'right', background: 'transparent', border: 'none', color: theme.text, padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {darkMode ? '☀️ الوضع النهاري' : '🌙 الوضع الليلي'}
                </button>
                <button onClick={() => { window.open('/?chat', '_blank'); setShowMenu(false); }} style={{ width: '100%', textAlign: 'right', background: 'transparent', border: 'none', color: theme.text, padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🖤 فتح الشات
                </button>
                <button onClick={() => { setExportType('users'); setShowExportModal(true); setShowMenu(false); }} style={{ width: '100%', textAlign: 'right', background: 'transparent', border: 'none', color: theme.text, padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  📥 تصدير البيانات
                </button>
                <button onClick={exportKeysToCSV} style={{ width: '100%', textAlign: 'right', background: 'transparent', border: 'none', color: theme.text, padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🔑 تصدير المفاتيح
                </button>
                <div style={{ height: '1px', background: theme.border, margin: '6px 0' }} />
                <button onClick={() => { onLogout(); setShowMenu(false); }} style={{ width: '100%', textAlign: 'right', background: 'transparent', border: 'none', color: '#f87171', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🚪 خروج
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ===== Tabs ===== */}
      <div style={{
        display: 'flex',
        gap: '4px',
        padding: '6px 8px',
        background: theme.surface,
        borderBottom: `1px solid ${theme.border}`,
        position: 'sticky',
        top: '54px',
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
              minWidth: '70px',
              padding: '8px 6px',
              background: activeTab === tab.id ? theme.tabActiveBg : 'transparent',
              color: activeTab === tab.id ? theme.tabActiveColor : theme.tabInactiveColor,
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '15px',
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
      <div style={{ padding: '12px' }}>

        {/* ===== تبويبة المستخدمين ===== */}
        {activeTab === "users" && (
          <div style={{ background: theme.surface, borderRadius: '16px', padding: '12px', border: `1px solid ${theme.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px' }}>👥 قائمة المستخدمين</h2>
                <div style={{ fontSize: '14px', opacity: 0.6, marginTop: '2px' }}>
                  إجمالي: {filteredUsers.length} / {users.length}
                  {searchTerm && <span style={{ marginRight: '8px', color: '#a29bfe' }}>🔍 نتائج البحث</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="🔍 بحث..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ ...inputStyle, minWidth: '160px' }}
                />
                <button onClick={loadAllData} style={{ background: 'rgba(108,92,231,0.2)', color: '#a29bfe', border: 'none', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}>
                  🔄 تحديث
                </button>
              </div>
            </div>

            <div style={{ overflowX: 'auto', overflowY: 'auto', WebkitOverflowScrolling: 'touch', maxHeight: '70vh' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '650px' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                  <tr style={{ background: darkMode ? 'rgba(108,92,231,0.1)' : 'rgba(108,92,231,0.07)' }}>
                    {['المستخدم', 'الاستهلاك', 'الشخصية', 'الحالة', 'الاتصال', 'الإجراءات'].map(h => (
                      <th key={h} style={{ padding: '12px 10px', textAlign: 'right', fontSize: '16px', fontWeight: 'bold', color: darkMode ? '#c4b5fd' : '#6c5ce7', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '40px', opacity: 0.5, fontSize: '15px' }}>لا توجد نتائج</td>
                    </tr>
                  ) : (
                    filteredUsers.map(u => {
                      const used = u.used_today || 0;
                      const limit = u.daily_limit || 5000;
                      const percent = getUsagePercent(used, limit);
                      const color = getUsageColor(percent);
                      const online = isUserOnline(u.id);
                      return (
                        <tr key={u.id} style={{ borderBottom: `1px solid ${theme.border}` }}>
                          <td style={{ padding: '12px 10px' }}>
                            <strong style={{ fontSize: '17px' }}>{u.name || "مستخدم"}</strong>
                            <br />
                            <span style={{ fontFamily: 'monospace', fontSize: '13px', opacity: 0.5 }}>{u.email}</span>
                          </td>
                          <td style={{ padding: '12px 10px' }}>
                            <div style={{ minWidth: '140px' }}>
                              <div style={{ fontSize: '14px', marginBottom: '4px' }}>{used.toLocaleString()} / {limit.toLocaleString()} توكن</div>
                              <div style={{ width: '100%', height: '4px', background: theme.barBg, borderRadius: '2px', overflow: 'hidden' }}>
                                <div style={{ width: percent + '%', height: '100%', background: color, transition: 'width 0.3s' }} />
                              </div>
                              <div style={{ fontSize: '13px', opacity: 0.6, marginTop: '2px' }}>{percent.toFixed(0)}%</div>
                            </div>
                          </td>
                          <td style={{ padding: '12px 10px' }}>
                            <select value={u.personality || DEFAULT_PERSONALITY} onChange={e => changePersonality(u.id, e.target.value)} style={{ background: theme.inputBg, color: theme.text, border: `1px solid ${theme.border}`, borderRadius: '6px', padding: '6px 10px', fontSize: '14px', cursor: 'pointer' }}>
                              {Object.entries(PERSONALITY_LABELS).map(([key, label]) => (<option key={key} value={key} style={{ background: theme.surface }}>{label}</option>))}
                            </select>
                          </td>
                          <td style={{ padding: '12px 10px' }}>
                            <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '14px', background: u.is_blocked ? 'rgba(248,113,113,0.15)' : 'rgba(74,222,128,0.15)', color: u.is_blocked ? '#f87171' : '#4ade80' }}>
                              {u.is_blocked ? "محظور" : "نشط"}
                            </span>
                          </td>
                          <td style={{ padding: '12px 10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: online ? '#4ade80' : '#6b7280', boxShadow: online ? '0 0 5px #4ade80' : 'none' }} />
                              <span style={{ fontSize: '14px' }}>{online ? '🟢 متصل' : '⚫ غير متصل'}</span>
                            </div>
                          </td>
                          <td style={{ padding: '12px 10px' }}>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              <button onClick={() => { setSelectedUser(u); setEditDailyLimit(u.daily_limit || 5000); setShowEditUserModal(true); }} style={{ background: 'rgba(251,191,36,0.2)', color: '#fbbf24', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>⚙️</button>
                              <button onClick={() => toggleUserBlock(u.id, u.is_blocked)} style={{ background: u.is_blocked ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)', color: u.is_blocked ? '#4ade80' : '#f87171', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>{u.is_blocked ? "فك الحظر" : "حظر"}</button>
                              <button onClick={() => deleteUser(u.id, u.name || u.email)} style={{ background: 'rgba(248,113,113,0.2)', color: '#f87171', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>🗑️ حذف</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===== تبويبة المفاتيح ===== */}
        {activeTab === "keys" && (
          <div style={{ background: theme.surface, borderRadius: '16px', padding: '12px', border: `1px solid ${theme.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px' }}>🔑 مفاتيح API العامة</h2>
                <div style={{ fontSize: '14px', opacity: 0.6, marginTop: '2px' }}>
                  إجمالي: {apiKeys.length} | ✅ نشط: {apiKeys.filter(k => k.is_active && k.is_valid !== false).length} | ⚠️ معطل: {apiKeys.filter(k => !k.is_active || k.is_valid === false).length}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button onClick={() => setShowAddKeyModal(true)} style={{ background: 'linear-gradient(135deg, #6c5ce7, #8b5cf6)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>➕ إضافة مفتاح</button>
              </div>
            </div>
            
            {/* أزرار الفحص */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
              <button 
                onClick={() => handleValidateKeys(false)} 
                disabled={validating}
                style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: validating ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: 'bold', opacity: validating ? 0.6 : 1 }}
              >
                {validating ? '⏳ جاري الفحص...' : '🔍 فحص جميع المفاتيح'}
              </button>
              
              <button 
                onClick={toggleAutoValidate}
                style={{ background: autoValidate ? 'rgba(74,222,128,0.2)' : theme.inputBg, color: autoValidate ? '#4ade80' : theme.text, border: `1px solid ${autoValidate ? '#4ade80' : theme.border}`, padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}
              >
                {autoValidate ? '🟢 الفحص التلقائي مفعل' : '⚫ تفعيل الفحص التلقائي'}
              </button>
              
              <button 
                onClick={() => { loadValidationLogs(); setShowLogsModal(true); }}
                style={{ background: 'rgba(108,92,231,0.2)', color: '#a29bfe', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}
              >
                📋 سجل الفحوصات
              </button>
              
              <button 
                onClick={exportKeysToCSV}
                style={{ background: 'rgba(34,197,94,0.2)', color: '#22c55e', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}
              >
                📥 تصدير CSV
              </button>
            </div>

            {/* شريط التقدم أثناء الفحص */}
            {validating && validationProgress.total > 0 && (
              <div style={{ marginBottom: '16px', padding: '12px', background: theme.inputBg, borderRadius: '8px' }}>
                <div style={{ fontSize: '13px', marginBottom: '6px' }}>
                  🔍 فحص {validationProgress.current}/{validationProgress.total}: {validationProgress.name}
                  <span style={{ marginRight: '10px' }}>{validationProgress.status}</span>
                </div>
                <div style={{ width: '100%', height: '6px', background: theme.barBg, borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${(validationProgress.current / validationProgress.total) * 100}%`, height: '100%', background: 'linear-gradient(135deg, #f59e0b, #d97706)', transition: 'width 0.3s' }} />
                </div>
              </div>
            )}
            
            <div style={{ overflowX: 'auto', overflowY: 'auto', WebkitOverflowScrolling: 'touch', maxHeight: '70vh' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                  <tr style={{ background: darkMode ? 'rgba(108,92,231,0.1)' : 'rgba(108,92,231,0.07)' }}>
                    {['الاسم', 'المفتاح', 'الاستهلاك', 'الحد', 'الحالة', 'الإجراءات'].map(h => (
                      <th key={h} style={{ padding: '12px 10px', textAlign: 'right', fontSize: '16px', fontWeight: 'bold', color: darkMode ? '#c4b5fd' : '#6c5ce7' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {apiKeys.map(key => {
                    const percent = getUsagePercent(key.used_today || 0, key.daily_limit || 1000000);
                    const color = getUsageColor(percent);
                    const isValid = key.is_valid !== false;
                    return (
                      <tr key={key.id} style={{ borderBottom: `1px solid ${theme.border}` }}>
                        <td style={{ padding: '12px 10px', fontSize: '15px' }}>{key.key_name || "مفتاح Groq"}</td>
                        <td style={{ padding: '12px 10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontFamily: 'monospace', fontSize: '13px', wordBreak: 'break-all' }}>
                              {showFullKey[key.id] ? key.key_value : (key.key_value?.slice(0, 25) + '...')}
                            </span>
                            <button 
                              onClick={() => setShowFullKey(prev => ({ ...prev, [key.id]: !prev[key.id] }))}
                              style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '14px', flexShrink: 0 }}
                            >
                              {showFullKey[key.id] ? '🙈' : '👁️'}
                            </button>
                          </div>
                        </td>
                        <td style={{ padding: '12px 10px' }}>
                          <div style={{ minWidth: '140px' }}>
                            <div style={{ fontSize: '14px' }}>{(key.used_today || 0).toLocaleString()} / {(key.daily_limit || 0).toLocaleString()}</div>
                            <div style={{ width: '100%', height: '4px', background: theme.barBg, borderRadius: '2px', overflow: 'hidden' }}>
                              <div style={{ width: percent + '%', height: '100%', background: color }} />
                            </div>
                            <div style={{ fontSize: '13px', opacity: 0.6 }}>{percent.toFixed(0)}%</div>
                          </div>
                        </td>
                        <td style={{ padding: '12px 10px', fontSize: '14px' }}>{(key.daily_limit || 0).toLocaleString()}</td>
                        <td style={{ padding: '12px 10px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <button onClick={() => toggleKeyStatus(key.id, key.is_active)} style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '13px', border: 'none', cursor: 'pointer', background: key.is_active ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)', color: key.is_active ? '#4ade80' : '#f87171' }}>
                              {key.is_active ? "نشط" : "معطل"}
                            </button>
                            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', background: isValid ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)', color: isValid ? '#4ade80' : '#f87171', textAlign: 'center' }}>
                              {isValid ? '✅ صالح' : `❌ ${key.invalid_reason || 'غير صالح'}`}
                            </span>
                            {key.last_checked_at && (
                              <span style={{ fontSize: '10px', opacity: 0.5, textAlign: 'center' }}>
                                آخر فحص: {formatDate(key.last_checked_at)}
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '12px 10px' }}>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            <button onClick={() => testSingleKey(key)} style={{ background: 'rgba(108,92,231,0.2)', color: '#a29bfe', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }} title="اختبار المفتاح">🔍</button>
                            <button onClick={() => resetKeyUsage(key.id)} style={{ background: 'rgba(251,191,36,0.2)', color: '#fbbf24', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }} title="تصفير الاستهلاك">🔄</button>
                            {!isValid && !key.is_active && (
                              <button onClick={() => reactivateKey(key.id)} style={{ background: 'rgba(34,197,94,0.2)', color: '#22c55e', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }} title="إعادة تفعيل">🔄 تفعيل</button>
                            )}
                            <button onClick={() => deleteKey(key.id)} style={{ background: 'rgba(248,113,113,0.2)', color: '#f87171', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }} title="حذف">🗑️</button>
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
          <div style={{ background: theme.surface, borderRadius: '16px', padding: '12px', border: `1px solid ${theme.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px' }}>💬 سجل المحادثات</h2>
                <div style={{ fontSize: '14px', opacity: 0.6 }}>معروض: {filteredChats.length} / {allChats.length}</div>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <select value={chatFilterUser} onChange={e => setChatFilterUser(e.target.value)} style={{ ...inputStyle, minWidth: '120px' }}>
                  <option value="">👥 كل المستخدمين</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name || u.email?.split('@')[0]}</option>)}
                </select>
                <select value={chatFilterDate} onChange={e => setChatFilterDate(e.target.value)} style={inputStyle}>
                  <option value="all">📅 كل الوقت</option>
                  <option value="today">اليوم</option>
                  <option value="week">آخر 7 أيام</option>
                  <option value="month">هذا الشهر</option>
                </select>
                <input type="text" placeholder="🔍 بحث..." value={chatSearchTerm} onChange={e => setChatSearchTerm(e.target.value)} style={{ ...inputStyle, minWidth: '140px' }} />
                <button onClick={loadAllChats} style={{ background: 'rgba(108,92,231,0.2)', color: '#a29bfe', border: 'none', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}>🔄</button>
                <button onClick={deleteAllChatsConfirm} style={{ background: 'rgba(248,113,113,0.2)', color: '#f87171', border: 'none', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}>🗑️ حذف الكل</button>
              </div>
            </div>
            <div style={{ overflowX: 'auto', overflowY: 'auto', WebkitOverflowScrolling: 'touch', maxHeight: '70vh' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '550px' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                  <tr style={{ background: darkMode ? 'rgba(108,92,231,0.1)' : 'rgba(108,92,231,0.07)' }}>
                    {['المستخدم', 'العنوان', 'الرسائل', 'آخر تحديث', 'الإجراءات'].map(h => (
                      <th key={h} style={{ padding: '12px 10px', textAlign: 'right', fontSize: '16px', fontWeight: 'bold', color: darkMode ? '#c4b5fd' : '#6c5ce7' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredChats.map(chat => {
                    const chatUser = getUserById(chat.user_id);
                    return (
                      <tr key={chat.id} style={{ borderBottom: `1px solid ${theme.border}` }}>
                        <td style={{ padding: '12px 10px' }}>
                          <strong style={{ fontSize: '16px' }}>{chatUser?.name || "مستخدم محذوف"}</strong>
                          <br />
                          <span style={{ fontSize: '13px', opacity: 0.5 }}>{chatUser?.email?.slice(0, 20) || chat.user_id?.slice(0, 8)}</span>
                        </td>
                        <td style={{ padding: '12px 10px', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '15px' }}>
                          {chat.title || "بدون عنوان"}
                        </td>
                        <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                          <span style={{ background: 'rgba(108,92,231,0.2)', color: '#a29bfe', padding: '4px 12px', borderRadius: '20px', fontSize: '14px' }}>{chat.messages?.length || 0}</span>
                        </td>
                        <td style={{ padding: '12px 10px', fontSize: '14px', opacity: 0.7 }}>{formatDate(chat.updated_at)}</td>
                        <td style={{ padding: '12px 10px' }}>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button onClick={() => openChatViewer(chat)} style={{ background: 'rgba(108,92,231,0.2)', color: '#a29bfe', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>👁️</button>
                            <button onClick={() => deleteSingleChat(chat.id)} style={{ background: 'rgba(248,113,113,0.2)', color: '#f87171', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>🗑️</button>
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
          <div style={{ background: theme.surface2, padding: '20px', borderRadius: '16px', width: '100%', maxWidth: '450px' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '20px' }}>➕ إضافة مفتاح API</h3>
            <input style={modalInputStyle} type="text" placeholder="اسم المفتاح" value={newKeyName} onChange={e => setNewKeyName(e.target.value)} />
            <input style={{ ...modalInputStyle, fontFamily: 'monospace' }} type="text" placeholder="gsk_xxxxxxxxxxxx" value={newKeyValue} onChange={e => setNewKeyValue(e.target.value)} />
            <input style={modalInputStyle} type="number" placeholder="الحد اليومي" value={newKeyLimit} onChange={e => setNewKeyLimit(parseInt(e.target.value) || 0)} />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={addApiKey} disabled={validating} style={{ flex: 1, padding: '10px', background: 'linear-gradient(135deg, #6c5ce7, #8b5cf6)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', opacity: validating ? 0.6 : 1 }}>
                {validating ? '⏳ جاري التحقق...' : '✅ إضافة'}
              </button>
              <button onClick={() => setShowAddKeyModal(false)} style={{ flex: 1, padding: '10px', background: theme.inputBg, color: theme.text, border: `1px solid ${theme.border}`, borderRadius: '8px', cursor: 'pointer', fontSize: '15px' }}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== مودال نتائج الفحص ===== */}
      {showValidationModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ background: theme.surface2, padding: '20px', borderRadius: '16px', width: '100%', maxWidth: '500px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3>🔍 نتائج فحص المفاتيح</h3>
              <button onClick={() => setShowValidationModal(false)} style={{ background: 'transparent', border: 'none', fontSize: '22px', cursor: 'pointer', color: theme.text }}>✕</button>
            </div>
            <div style={{ marginBottom: '16px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ background: 'rgba(74,222,128,0.2)', color: '#4ade80', padding: '4px 12px', borderRadius: '20px' }}>✅ صالح: {validationResults.filter(r => r.valid).length}</span>
              <span style={{ background: 'rgba(248,113,113,0.2)', color: '#f87171', padding: '4px 12px', borderRadius: '20px' }}>❌ غير صالح: {validationResults.filter(r => !r.valid).length}</span>
            </div>
            {validationResults.map((result, idx) => (
              <div key={idx} style={{ background: result.valid ? 'rgba(74,222,128,0.05)' : 'rgba(248,113,113,0.05)', padding: '10px', borderRadius: '8px', marginBottom: '8px', borderRight: `3px solid ${result.valid ? '#4ade80' : '#f87171'}` }}>
                <div style={{ fontWeight: 'bold' }}>{result.name}</div>
                <div style={{ fontSize: '12px', opacity: 0.7 }}>{result.value}</div>
                <div style={{ fontSize: '12px', marginTop: '4px', color: result.valid ? '#4ade80' : '#f87171' }}>
                  {result.valid ? '✅ صالح' : `❌ ${result.reason}`}
                </div>
              </div>
            ))}
            <button onClick={() => setShowValidationModal(false)} style={{ width: '100%', padding: '10px', marginTop: '16px', background: theme.inputBg, borderRadius: '8px', border: `1px solid ${theme.border}`, cursor: 'pointer', color: theme.text }}>إغلاق</button>
          </div>
        </div>
      )}

      {/* ===== مودال سجل الفحوصات ===== */}
      {showLogsModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ background: theme.surface2, padding: '20px', borderRadius: '16px', width: '100%', maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3>📋 سجل فحوصات المفاتيح</h3>
              <button onClick={() => setShowLogsModal(false)} style={{ background: 'transparent', border: 'none', fontSize: '22px', cursor: 'pointer', color: theme.text }}>✕</button>
            </div>
            {validationLogs.length === 0 ? (
              <p style={{ textAlign: 'center', opacity: 0.5 }}>لا توجد سجلات</p>
            ) : (
              validationLogs.map(log => (
                <div key={log.id} style={{ background: theme.inputBg, padding: '12px', borderRadius: '8px', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '4px' }}>
                    <span style={{ fontWeight: 'bold' }}>{new Date(log.checked_at).toLocaleString('ar-EG')}</span>
                    <span style={{ fontSize: '12px' }}>نوع: {log.check_type === 'auto' ? 'تلقائي' : 'يدوي'}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', fontSize: '13px', flexWrap: 'wrap' }}>
                    <span style={{ color: '#4ade80' }}>✅ صالح: {log.valid_keys}</span>
                    <span style={{ color: '#f87171' }}>❌ غير صالح: {log.invalid_keys}</span>
                    <span>📊 إجمالي: {log.total_keys}</span>
                  </div>
                </div>
              ))
            )}
            <button onClick={() => setShowLogsModal(false)} style={{ width: '100%', padding: '10px', marginTop: '16px', background: theme.inputBg, borderRadius: '8px', border: `1px solid ${theme.border}`, cursor: 'pointer', color: theme.text }}>إغلاق</button>
          </div>
        </div>
      )}

      {/* ===== مودال تعديل المستخدم ===== */}
      {showEditUserModal && selectedUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ background: theme.surface2, padding: '20px', borderRadius: '16px', width: '100%', maxWidth: '380px' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '20px' }}>⚙️ تعديل حد {selectedUser.name || selectedUser.email}</h3>
            <label style={{ fontSize: '14px', opacity: 0.7 }}>الحد اليومي (توكن)</label>
            <input style={modalInputStyle} type="number" value={editDailyLimit} onChange={e => setEditDailyLimit(parseInt(e.target.value) || 0)} />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={saveUserSettings} style={{ flex: 1, padding: '10px', background: 'linear-gradient(135deg, #6c5ce7, #8b5cf6)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '15px' }}>💾 حفظ</button>
              <button onClick={() => setShowEditUserModal(false)} style={{ flex: 1, padding: '10px', background: theme.inputBg, color: theme.text, border: `1px solid ${theme.border}`, borderRadius: '8px', cursor: 'pointer', fontSize: '15px' }}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== مودال تصدير البيانات ===== */}
      {showExportModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ background: theme.surface2, padding: '20px', borderRadius: '16px', width: '100%', maxWidth: '360px' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '20px' }}>📥 تصدير البيانات</h3>
            <select value={exportType} onChange={e => setExportType(e.target.value)} style={modalInputStyle}>
              <option value="users">👥 المستخدمين</option>
              <option value="keys">🔑 المفاتيح</option>
              <option value="chats">💬 المحادثات</option>
            </select>
            <div style={{ background: darkMode ? 'rgba(108,92,231,0.1)' : 'rgba(108,92,231,0.05)', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>
              📊 عدد السجلات: <strong>{prepareExportData().length}</strong>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => { exportToCSV(prepareExportData(), exportType); setShowExportModal(false); }} style={{ flex: 1, padding: '10px', background: 'linear-gradient(135deg, #6c5ce7, #8b5cf6)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '15px' }}>📥 تصدير CSV</button>
              <button onClick={() => setShowExportModal(false)} style={{ flex: 1, padding: '10px', background: theme.inputBg, color: theme.text, border: `1px solid ${theme.border}`, borderRadius: '8px', cursor: 'pointer', fontSize: '15px' }}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== مودال محادثات المستخدم ===== */}
      {showUserChatsModal && selectedUserForChats && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ background: theme.surface2, padding: '20px', borderRadius: '16px', width: '100%', maxWidth: '650px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '20px' }}>💬 محادثات {selectedUserForChats.name}</h3>
              <button onClick={() => setShowUserChatsModal(false)} style={{ background: 'transparent', border: 'none', fontSize: '22px', cursor: 'pointer', color: theme.text }}>✕</button>
            </div>
            {userChatsList.length === 0 ? (
              <p style={{ textAlign: 'center', opacity: 0.5, fontSize: '15px' }}>لا توجد محادثات</p>
            ) : (
              userChatsList.map(chat => (
                <div key={chat.id} style={{ background: theme.rowHover, borderRadius: '10px', padding: '12px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '15px' }}>{chat.title || "بدون عنوان"}</div>
                    <div style={{ fontSize: '13px', opacity: 0.5 }}>{formatDate(chat.updated_at)} · {chat.messages?.length || 0} رسالة</div>
                  </div>
                  <div>
                    <button onClick={() => openChatViewer(chat)} style={{ background: 'rgba(108,92,231,0.2)', color: '#a29bfe', border: 'none', padding: '6px 12px', borderRadius: '6px', marginRight: '8px', cursor: 'pointer', fontSize: '13px' }}>👁️ عرض</button>
                    <button onClick={() => deleteChatFromModal(chat.id)} style={{ background: 'rgba(248,113,113,0.2)', color: '#f87171', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>🗑️</button>
                  </div>
                </div>
              ))
            )}
            <div style={{ marginTop: '16px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button onClick={() => deleteAllUserChats(selectedUserForChats.id, selectedUserForChats.name)} style={{ background: 'rgba(248,113,113,0.2)', color: '#f87171', border: '1px solid rgba(248,113,113,0.3)', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}>🗑️ حذف الكل</button>
              <button onClick={() => setShowUserChatsModal(false)} style={{ flex: 1, padding: '8px', background: theme.inputBg, color: theme.text, border: `1px solid ${theme.border}`, borderRadius: '8px', cursor: 'pointer', fontSize: '15px' }}>إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== مودال عرض المحادثة ===== */}
      {showChatModal && selectedChat && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ background: theme.surface2, padding: '20px', borderRadius: '16px', width: '100%', maxWidth: '650px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '20px' }}>💬 {selectedChat.title || "محادثة"}</h3>
              <button onClick={() => setShowChatModal(false)} style={{ background: 'transparent', border: 'none', fontSize: '22px', cursor: 'pointer', color: theme.text }}>✕</button>
            </div>
            {selectedChat.messages?.map((msg, idx) => (
              <div key={idx} style={{ background: msg.role === "user" ? (darkMode ? "rgba(108,92,231,0.15)" : "rgba(108,92,231,0.08)") : theme.rowHover, padding: '12px 16px', borderRadius: '10px', marginBottom: '10px', borderRight: msg.role === "user" ? "3px solid #6c5ce7" : "none" }}>
                <div style={{ fontSize: '13px', opacity: 0.6, marginBottom: '6px' }}>{msg.role === "user" ? "👤 المستخدم" : "🖤 بلاك"}</div>
                <div style={{ fontSize: '15px', lineHeight: 1.7 }}><MessageContent content={msg.content} /></div>
              </div>
            ))}
            <button onClick={() => setShowChatModal(false)} style={{ width: '100%', padding: '10px', background: theme.inputBg, color: theme.text, border: `1px solid ${theme.border}`, borderRadius: '8px', cursor: 'pointer', fontSize: '15px', marginTop: '16px' }}>إغلاق</button>
          </div>
        </div>
      )}

    </div>
  );
}
