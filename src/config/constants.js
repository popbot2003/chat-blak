// ============================================
// constants.js
// الإعدادات العامة والثوابت
// ============================================

// الحد المبدئي للمستخدم الجديد (توكن/يوم)
export const DEFAULT_USER_DAILY_LIMIT = 30000;

// الحد اليومي الافتراضي للمفتاح العام
export const DEFAULT_KEY_DAILY_LIMIT = 1000000;

// إعدادات Groq API
export const GROQ_MODEL = "openai/gpt-oss-120b";
export const GROQ_MAX_TOKENS = 2000;
export const GROQ_TEMPERATURE = 0.3;

// إعدادات التطبيق
export const CHAT_HISTORY_LIMIT = 40;
export const SAVE_CHAT_DELAY_MS = 3000;
export const MAX_MESSAGE_LENGTH = 4000;


// إعدادات التطبيق الافتراضية
export const DEFAULT_SETTINGS = {
  rateLimitRPM: 5,
  rateLimitTPM: 2000,
  cooldownSeconds: 3,
  smartMode: true
};
