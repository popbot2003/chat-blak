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

// ─── أنماط كشف الطلبات الصريحة ──────────────────────────────
//
// قواعد التصميم:
//   SAVE  — يلتقط "تذكر إن X" أو "خليك فاكر إن X" فقط.
//           الكلمة بعدها لازم تكون "إن/أن/ان" أو ":" مباشرة،
//           عشان ما نلتقطش "تذكر لي فوائد" أو "اذكر الأمثلة".
//           كذلك "احفظ" وحدها ما تكفيش — لازم "احفظ إن/أن/ان".
//
//   FORGET — يلتقط "انسى إن X" أو "امسح من ذاكرتك X" فقط.
//            "امسح" وحدها (بدون "من ذاكرتك") لا تُفعّل النمط
//            عشان ما نلتقطش "امسح السطر الأول من الكود".
//
// ─────────────────────────────────────────────────────────────
export const EXPLICIT_SAVE_PATTERNS = [
  // "تذكر إن X" | "خليك فاكر إن X" | "ما تنساش إن X"
  /(?:^|\s)(?:تذكر|افتكر|خليك\s+فاكر|خليك\s+فاتكر|ما\s+تنساش)\s+(?:إن[ّ]?|ان[ّ]?|أن[ّ]?|:)\s+(.+)$/iu,
  // "احفظ إن X" (بدون "احفظ" وحدها)
  /(?:^|\s)احفظ\s+(?:إن[ّ]?|ان[ّ]?|أن[ّ]?|:)\s+(.+)$/iu,
  // remember that X
  /(?:^|\s)remember\s+that\s+(.+)$/iu,
];

export const EXPLICIT_FORGET_PATTERNS = [
  // "انسى إن X" | "ما تفتكرش إن X"
  /(?:^|\s)(?:انس[ىي]|ما\s+تفتكرش)\s+(?:إن[ّ]?|ان[ّ]?|أن[ّ]?|:)\s+(.+)$/iu,
  // "امسح من ذاكرتك X" | "شيل من ذاكرتك X"
  /(?:^|\s)(?:امسح|شيل)\s+من\s+ذاكرتك\s+(.+)$/iu,
  // forget that X
  /(?:^|\s)forget\s+that\s+(.+)$/iu,
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
