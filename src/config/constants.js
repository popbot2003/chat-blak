// ============================================
// constants.js — بلاك 🖤
// ✅ GROQ_FAST_MODEL مصحح — qwen3-32b بدل llama المحذوف
// ✅ ثوابت نظام الذاكرة الجديد
// ============================================

// ══════════════════════════════════════════════
// 🤖 نماذج Groq
// ══════════════════════════════════════════════

// النموذج الرئيسي — الأذكى والأقوى على Groq حالياً
export const GROQ_MODEL = "openai/gpt-oss-120b";

// النموذج السريع — للمهام الخفيفة (تلخيص، كشف نية، استخراج ذاكرة)
// ✅ تم تغييره من llama-3.1-8b-instant (محذوف من self-serve أغسطس 2026)
export const GROQ_FAST_MODEL = "qwen/qwen3.6-27b";

// إعدادات الاستجابة
export const GROQ_MAX_TOKENS   = 6000;
export const GROQ_TEMPERATURE  = 0.7;


// ══════════════════════════════════════════════
// 👤 حدود المستخدمين
// ══════════════════════════════════════════════

// الحد اليومي للمستخدم الجديد (توكن/يوم)
export const DEFAULT_USER_DAILY_LIMIT = 50000;

// الحد اليومي الافتراضي للمفتاح العام
// يطابق Groq Free Tier لنموذج openai/gpt-oss-120b (TPD = 200,000)
export const DEFAULT_KEY_DAILY_LIMIT = 200000;


// ══════════════════════════════════════════════
// 💬 إعدادات المحادثة
// ══════════════════════════════════════════════

// عدد الرسائل المحفوظة في Supabase لكل محادثة
export const CHAT_HISTORY_LIMIT = 15;

// عدد الرسائل المرسلة كـ context مع كل رسالة (Sliding Window)
// ✅ بدل إرسال كل التاريخ — يقلل الـ tokens ويسرع الرد
export const CONTEXT_WINDOW_SIZE = 15;

// تأخير الحفظ التلقائي (مللي ثانية)
export const SAVE_CHAT_DELAY_MS = 3000;

// الحد الأقصى لطول الرسالة
export const MAX_MESSAGE_LENGTH = 4000;


// ══════════════════════════════════════════════
// 🧠 نظام الذاكرة — Memory System
// ══════════════════════════════════════════════

// عدد الذكريات المحملة في بداية كل محادثة
export const MEMORY_LOAD_LIMIT = 12;

// الحد الأدنى لدرجة الأهمية لحفظ ذاكرة (1-5)
export const MEMORY_MIN_IMPORTANCE = 2;

// فئات الذاكرة
export const MEMORY_CATEGORIES = {
  PROGRAMMING:  "programming",   // برمجة وتقنية
  STUDYING:     "studying",      // مذاكرة وتعلم
  PERSONAL:     "personal",      // معلومات شخصية
  PREFERENCES:  "preferences",   // تفضيلات وأسلوب
  WORK:         "work",          // عمل ومشاريع
  GENERAL:      "general",       // عام
};

// الوقت الأدنى بين كل استخراج ذاكرة (مللي ثانية)
// ✅ لا يحصل استخراج في كل رسالة — بس كل 3 رسائل
export const MEMORY_EXTRACT_INTERVAL = 3;


// ══════════════════════════════════════════════
// ⚡ إعدادات الأداء
// ══════════════════════════════════════════════

// كاش فحص is_blocked (مللي ثانية) — 5 دقائق
// ✅ بدل الفحص في كل رسالة
export const BLOCKED_CHECK_CACHE_MS = 5 * 60 * 1000;

// الكلمات الدالة على طلب بحث خارجي
// ✅ DuckDuckGo بيشتغل بس لو في كلمة من دي
export const SEARCH_TRIGGER_KEYWORDS = [
  "ابحث", "بحث", "search", "ابحث عن", "دور على",
  "أخبار", "news", "آخر", "latest", "جديد",
  "سعر", "price", "كم سعر", "معلومات عن",
  "ما هو", "من هو", "ما هي", "من هي",
  "متى", "أين", "كيف", "لماذا",
];


// ══════════════════════════════════════════════
// ⚙️ إعدادات افتراضية
// ══════════════════════════════════════════════

export const DEFAULT_SETTINGS = {
  rateLimitRPM:    5,
  rateLimitTPM:    2000,
  cooldownSeconds: 3,
  smartMode:       true,
};
