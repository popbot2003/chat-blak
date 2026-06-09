// ============================================
// validators.js
// دوال التحقق من صحة البيانات
// ============================================

/**
 * التحقق من صحة البريد الإلكتروني
 */
export function validateEmail(email) {
  if (!email) return { valid: false, error: "البريد الإلكتروني مطلوب" };
  if (!email.includes("@")) return { valid: false, error: "بريد إلكتروني غير صالح" };
  if (email.length > 100) return { valid: false, error: "البريد طويل جداً" };
  return { valid: true, error: null };
}

/**
 * التحقق من صحة كلمة المرور
 */
export function validatePassword(password) {
  if (!password) return { valid: false, error: "كلمة المرور مطلوبة" };
  if (password.length < 6) return { valid: false, error: "كلمة المرور قصيرة (6 أحرف على الأقل)" };
  if (password.length > 50) return { valid: false, error: "كلمة المرور طويلة جداً" };
  return { valid: true, error: null };
}

/**
 * التحقق من صحة الرسالة
 */
export function validateMessage(text) {
  if (!text || !text.trim()) return { valid: false, error: null };
  if (text.length > 4000) return { valid: false, error: "الرسالة طويلة جداً (أقصى حد 4000 حرف)" };
  return { valid: true, error: null };
}

/**
 * التحقق من صحة مفتاح Groq API
 */
export function validateKeyValue(key) {
  if (!key) return { valid: false, error: "المفتاح مطلوب" };
  if (!key.startsWith("gsk_")) return { valid: false, error: "المفتاح يجب أن يبدأ بـ gsk_" };
  if (key.length < 30) return { valid: false, error: "المفتاح قصير جداً" };
  return { valid: true, error: null };
}

/**
 * التحقق من أن المستخدم لم يصل للحد اليومي
 */
export function checkUserDailyLimit(user) {
  if (!user) return { canChat: false, reason: "مستخدم غير موجود" };
  if (user.is_blocked) return { canChat: false, reason: "تم حظر هذا الحساب" };
  
  const used = user.used_today || 0;
  const limit = user.daily_limit || 5000;
  
  if (used >= limit) {
    return { 
      canChat: false, 
      reason: `⚠️ وصلت للحد اليومي (${limit.toLocaleString()} توكن). بكره هتقدر تكمل! 🖤`,
      percent: 100
    };
  }
  
  const percent = (used / limit) * 100;
  return { canChat: true, used, limit, percent };
}
