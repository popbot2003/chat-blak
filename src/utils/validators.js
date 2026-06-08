function validateEmail(email) {
  if (!email) return { valid: false, error: "البريد الإلكتروني مطلوب" };
  if (!email.includes("@")) return { valid: false, error: "بريد إلكتروني غير صالح" };
  if (email.length > 100) return { valid: false, error: "البريد طويل جداً" };
  return { valid: true, error: null };
}

function validatePassword(password) {
  if (!password) return { valid: false, error: "كلمة المرور مطلوبة" };
  if (password.length < 6) return { valid: false, error: "كلمة المرور قصيرة (6 أحرف على الأقل)" };
  if (password.length > 50) return { valid: false, error: "كلمة المرور طويلة جداً" };
  return { valid: true, error: null };
}

function validateMessage(text) {
  if (!text || !text.trim()) return { valid: false, error: null };
  if (text.length > 4000) return { valid: false, error: "الرسالة طويلة جداً (أقصى حد 4000 حرف)" };
  return { valid: true, error: null };
}

function validateKeyValue(key) {
  if (!key) return { valid: false, error: "المفتاح مطلوب" };
  if (!key.startsWith("gsk_")) return { valid: false, error: "المفتاح يجب أن يبدأ بـ gsk_" };
  if (key.length < 30) return { valid: false, error: "المفتاح قصير جداً" };
  return { valid: true, error: null };
}

export { validateEmail, validatePassword, validateMessage, validateKeyValue };
