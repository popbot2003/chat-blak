// ============================================
// safeAsync.js
// دوال للتعامل الآمن مع الأخطاء
// ============================================

/**
 * تنفيذ دالة غير متزامنة مع التقاط الأخطاء
 * @param {Function} asyncFn - الدالة غير المتزامنة
 * @param {any} fallback - القيمة الافتراضية عند الخطأ
 * @returns {Promise<any>}
 */
export async function safeAsync(asyncFn, fallback = null) {
  try {
    return await asyncFn();
  } catch (error) {
    console.error("❌ safeAsync:", error.message);
    return fallback;
  }
}

/**
 * تحليل JSON بأمان
 * @param {string} str - النص المراد تحليله
 * @param {any} fallback - القيمة الافتراضية عند الخطأ
 * @returns {any}
 */
export function safeJsonParse(str, fallback = null) {
  try {
    return JSON.parse(str);
  } catch (error) {
    console.error("❌ safeJsonParse:", error.message);
    return fallback;
  }
}

/**
 * الوصول الآمن إلى خاصية في كائن
 * @param {Object} obj - الكائن
 * @param {string} path - المسار (مثل 'user.profile.name')
 * @param {any} fallback - القيمة الافتراضية عند عدم وجود الخاصية
 * @returns {any}
 */
export function safeGet(obj, path, fallback = null) {
  try {
    const keys = path.split('.');
    let result = obj;
    for (let i = 0; i < keys.length; i++) {
      if (result === null || result === undefined) return fallback;
      result = result[keys[i]];
    }
    return result !== undefined ? result : fallback;
  } catch (error) {
    console.error("❌ safeGet:", error.message);
    return fallback;
  }
}

/**
 * تنفيذ دالة مع إعادة المحاولة عند الفشل
 * @param {Function} fn - الدالة
 * @param {number} retries - عدد محاولات إعادة المحاولة
 * @param {number} delay - التأخير بين المحاولات (ms)
 * @returns {Promise<any>}
 */
export async function retryAsync(fn, retries = 3, delay = 1000) {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;
    await new Promise(resolve => setTimeout(resolve, delay));
    return retryAsync(fn, retries - 1, delay);
  }
}
