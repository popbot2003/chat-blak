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

// ─── تحميل الذكريات في البرومبت ───────────────
export const MEMORY_LOAD_LIMIT = 12; // قديم — بيتستخدم في كود موجود
export const MEMORY_INJECT_TOP_K = 20; // أقصى ذكريات تتحقن في الـ prompt

// ─── عتبة الأهمية ────────────────────────────
// الحفظ التلقائي: 3 فأعلى
// الحفظ الصريح ("تذكر إن..."): دايمًا 5
export const MEMORY_MIN_IMPORTANCE = 3;
export const MEMORY_EXPLICIT_IMPORTANCE = 5;

// ─── حدود الطول (حماية من نص ضخم) ─────────────
export const MEMORY_MAX_CONTENT_LEN = 500;
export const CHAT_SUMMARY_MAX_LEN = 800;

// ─── استخراج الذكريات ────────────────────────
// 1 = بعد كل رد
export const MEMORY_EXTRACT_INTERVAL = 1;

// ─── الرجوع لسجل المحادثات ────────────────────
// عدد ملخصات المحادثات السابقة اللي تتلقط لكل سؤال
export const CHAT_REFERENCE_TOP_K = 3;

export const MEMORY_CATEGORIES = {
  PROGRAMMING: "programming",
  STUDYING: "studying",
  PERSONAL: "personal",
  PREFERENCES: "preferences",
  WORK: "work",
  GENERAL: "general",
};

// ─── أنماط كشف الطلبات الصريحة ────────────────
// تُستخدم لالتقاط "تذكر / احفظ / خليك فاكر" من نص المستخدم
// بدون الاعتماد على النموذج
export const EXPLICIT_SAVE_PATTERNS = [
  /(?:^|\s)(?:تذكر|افتكر|اذكر|احفظ|خليك\s+فاكر|خليك\s+فاتكر|ما\s+تنساش)(?:\s+إن[ّ]?|\s+ان[ّ]?|\s+أن[ّ]?|\s*:)?\s+(.+)$/iu,
  /(?:^|\s)remember\s+(?:that\s+)?(.+)$/iu,
];

export const EXPLICIT_FORGET_PATTERNS = [
  /(?:^|\s)(?:انس[ىي]|امسح\s+من\s+ذاكرتك|امسح|شيل\s+من\s+ذاكرتك|ما\s+تفتكرش)(?:\s+إن[ّ]?|\s+ان[ّ]?|\s+أن[ّ]?|\s*:)?\s+(.+)$/iu,
  /(?:^|\s)forget\s+(?:that\s+)?(.+)$/iu,
];

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
