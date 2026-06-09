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
 * نسخ النص إلى الحافظة (مع fallback للمتصفحات القديمة)
 */
export async function copyToClipboard(text, onSuccess, onError) {
  try {
    await navigator.clipboard.writeText(text);
    onSuccess?.();
  } catch (err) {
    // Fallback للطريقة القديمة
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
  if (percent < 50) return "#4ade80";  // أخضر
  if (percent < 80) return "#facc15";  // أصفر
  return "#f87171";                     // أحمر
}

/**
 * انتظار milliseconds (sleep)
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * تقطيع النص الطويل (للـ preview)
 */
export function truncate(str, maxLength = 100) {
  if (!str) return "";
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + "...";
}

/**
 * التحقق من أن اليوم تغير (لإعادة ضبط الاستهلاك)
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
