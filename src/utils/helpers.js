// ============================================
// helpers.js
// دوال مساعدة مشتركة بين الملفات
// ============================================

/**
 * تنسيق التاريخ بطريقة مفهومة
 */
export function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  
  if (diff < 60000) return "الآن";
  if (diff < 3600000) return "منذ " + Math.floor(diff / 60000) + " د";
  return date.toLocaleDateString("ar-EG");
}

/**
 * نسخ النص إلى الحافظة
 */
export async function copyToClipboard(text, onSuccess, onError) {
  try {
    await navigator.clipboard.writeText(text);
    onSuccess?.();
  } catch (err) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    onSuccess?.();
  }
}

/**
 * حساب نسبة الاستهلاك
 */
export function getUsagePercent(used, limit) {
  if (!limit || limit === 0) return 0;
  const percent = (used / limit) * 100;
  return Math.min(percent, 100);
}

/**
 * لون شريط التقدم حسب النسبة
 */
export function getUsageColor(percent) {
  if (percent < 50) return "#10b981";
  if (percent < 80) return "#f59e0b";
  return "#ef4444";
}

/**
 * انتظار milliseconds (sleep)
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * تقطيع النص الطويل
 */
export function truncate(str, maxLength = 100) {
  if (!str) return "";
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + "...";
}

/**
 * التحقق من أن اليوم تغير
 */
export function isNewDay(lastResetDate) {
  if (!lastResetDate) return true;
  const last = new Date(lastResetDate);
  const today = new Date();
  return last.toDateString() !== today.toDateString();
}

/**
 * إيقاف التكرار للـ typing effect
 */
export function debounce(func, delay) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => func.apply(this, args), delay);
  };
}

// ============================================
// ✅ دوال حالة المفتاح
// ============================================

/**
 * حساب حالة المفتاح
 */
export function getKeyStatus(key) {
  if (!key) {
    return {
      label: '—',
      color: '#64748b',
      bg: 'rgba(100,116,139,0.15)',
      icon: '—',
    };
  }

  // ❌ معطل
  if (!key.is_active || key.is_valid === false) {
    return {
      label: 'معطل',
      color: '#ef4444',
      bg: 'rgba(239,68,68,0.15)',
      icon: '❌',
    };
  }

  // ⏸️ مقيّد مؤقتاً
  if (
    key.rate_limited_until &&
    new Date(key.rate_limited_until) > new Date()
  ) {
    return {
      label: 'مقيّد',
      color: '#f59e0b',
      bg: 'rgba(245,158,11,0.15)',
      icon: '⏸️',
    };
  }

  // ✅ نشط
  return {
    label: 'نشط',
    color: '#10b981',
    bg: 'rgba(16,185,129,0.15)',
    icon: '✅',
  };
}

/**
 * الوقت المتبقي بصيغة ذكية
 */
export function getTimeUntil(untilDate) {
  if (!untilDate) return null;

  const diff = new Date(untilDate).getTime() - Date.now();
  if (diff <= 0) return null;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} يوم`;
  if (hours > 0) return `${hours} ساعة`;
  if (minutes > 0) return `${minutes} دقيقة`;
  return `${seconds} ثانية`;
}

/**
 * عدد المفاتيح حسب الحالة
 */
export function getKeysStats(keys) {
  if (!keys || !Array.isArray(keys)) {
    return { active: 0, limited: 0, disabled: 0, total: 0 };
  }

  let active = 0;
  let limited = 0;
  let disabled = 0;

  for (const key of keys) {
    if (!key.is_active || key.is_valid === false) {
      disabled++;
    } else if (
      key.rate_limited_until &&
      new Date(key.rate_limited_until) > new Date()
    ) {
      limited++;
    } else {
      active++;
    }
  }

  return { active, limited, disabled, total: keys.length };
}

/**
 * أقرب وقت لتحرر مفتاح
 */
export function getEarliestFreeTime(keys) {
  if (!keys || !Array.isArray(keys)) return null;

  const times = keys
    .filter(k => k.rate_limited_until && new Date(k.rate_limited_until) > new Date())
    .map(k => new Date(k.rate_limited_until).getTime())
    .sort();

  if (times.length === 0) return null;

  return getTimeUntil(new Date(times[0]));
}

// ============================================
// ✅ دوال "نشط الآن"
// ============================================

/**
 * هل المفتاح نشط الآن؟ (استُخدم في آخر 30 ثانية)
 */
export function isKeyActiveNow(key) {
  if (!key?.last_request_at) return false;
  
  const lastRequest = new Date(key.last_request_at).getTime();
  const diff = Date.now() - lastRequest;
  
  return diff < 30000; // 30 ثانية
}

/**
 * منذ متى آخر استخدام؟
 */
export function getLastUsedTime(lastRequestAt) {
  if (!lastRequestAt) return "لم يُستخدم";
  
  const last = new Date(lastRequestAt).getTime();
  const diff = Date.now() - last;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  // ✅ نشط الآن
  if (seconds < 30) return "🟢 نشط الآن";
  
  if (seconds < 60) return `منذ ${seconds} ثانية`;
  if (minutes < 60) return `منذ ${minutes} دقيقة`;
  if (hours < 24) return `منذ ${hours} ساعة`;
  return `منذ ${days} يوم`;
}
