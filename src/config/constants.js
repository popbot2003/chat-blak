// ============================================
// constants.js — BLACK 🖤
// AI CONFIGURATION — NOVEMBER 2026
// ============================================

// ============================================
// MODELS
// ============================================

export const GROQ_MODEL = "openai/gpt-oss-120b";

export const GROQ_FAST_MODEL = "openai/gpt-oss-20b";

export const GROQ_REASONING_MODEL = "openai/gpt-oss-120b";

export const GROQ_VISION_MODEL = "qwen/qwen3.8-27b";

export const GROQ_MODELS = {
  PRIMARY: "openai/gpt-oss-120b",
  FAST: "openai/gpt-oss-20b",
  REASONING: "openai/gpt-oss-120b",
  VISION: "qwen/qwen3.8-27b",
};

// ============================================
// REASONING
// ============================================

export const GROQ_REASONING_EFFORT = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
};

export const DEFAULT_REASONING_EFFORT = "medium";

// ============================================
// GENERATION
// ============================================

export const GROQ_MAX_TOKENS = 4096;

export const GROQ_MAX_OUTPUT_TOKENS = 6000;

export const GROQ_TEMPERATURE = 0.6;

export const GROQ_TIMEOUT_MS = 60000;

// ============================================
// USER LIMITS
// ============================================

export const DEFAULT_USER_DAILY_LIMIT = 50000;

export const DEFAULT_KEY_DAILY_LIMIT = 200000;

// ============================================
// CHAT HISTORY
// ============================================

// عدد المحادثات المحفوظة في قائمة السجل
export const CHAT_HISTORY_LIMIT = 15;

// حجم السياق المرسل للنموذج
// لا يؤثر على الرسائل المحفوظة في قاعدة البيانات
export const CONTEXT_WINDOW_SIZE = 15;

export const SAVE_CHAT_DELAY_MS = 3000;

export const MAX_MESSAGE_LENGTH = 4000;

// ============================================
// MEMORY SYSTEM
// ============================================

export const MEMORY_LOAD_LIMIT = 12;

export const MEMORY_MIN_IMPORTANCE = 2;

export const MEMORY_CATEGORIES = {
  PROGRAMMING: "programming",
  STUDYING: "studying",
  PERSONAL: "personal",
  PREFERENCES: "preferences",
  WORK: "work",
  GENERAL: "general",
};

export const MEMORY_EXTRACT_INTERVAL = 3;

// ============================================
// SECURITY
// ============================================

export const BLOCKED_CHECK_CACHE_MS = 5 * 60 * 1000;

// ============================================
// WEB SEARCH
// ============================================

export const SEARCH_TRIGGER_KEYWORDS = [
  "ابحث",
  "بحث",
  "search",
  "ابحث عن",
  "دور على",
  "أخبار",
  "news",
  "آخر الأخبار",
  "latest",
  "جديد",
  "سعر اليوم",
  "الأسعار الحالية",
  "price today",
  "معلومات حديثة",
  "مصادر",
  "مصدر",
  "تحقق من",
  "هل حدث",
];

// ============================================
// DEFAULT SETTINGS
// ============================================

export const DEFAULT_SETTINGS = {
  rateLimitRPM: 5,
  rateLimitTPM: 2000,
  cooldownSeconds: 3,
  smartMode: true,
};
