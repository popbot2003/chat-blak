/**
 * ⚙️ الثوابت والإعدادات الأساسية للتطبيق
 * 
 * يحتوي على:
 * - System Prompt المخصص لشخصية بلاك
 * - الإعدادات الافتراضية للمستخدمين
 * - حدود الاستهلاك والمعدلات
 * - استراتيجيات التوزيع الذكي
 */

// ===== الحدود والقيود =====
export const DAILY_LIMIT_PER_KEY = 100000;           // الحد اليومي لكل مفتاح
export const DEFAULT_USER_DAILY_LIMIT = 10000;       // الحد اليومي الافتراضي للمستخدم الجديد
export const KEY_ROTATION_STRATEGY = "random";       // استراتيجية التوزيع (random, least_used, round_robin)

// ===== استراتيجيات التوزيع =====
export const ROTATION_STRATEGIES = {
  RANDOM: "random",           // اختيار عشوائي من المفاتيح المتاحة
  LEAST_USED: "least_used",   // اختيار الأقل استهلاكاً
  ROUND_ROBIN: "round_robin"  // توزيع دوري منتظم
};

// ===== نسب التحذير =====
export const WARNING_THRESHOLDS = {
  SAFE: 50,          // آمن تماماً (أقل من 50%)
  CAUTION: 75,       // تنبيه (75% - 89%)
  WARNING: 90,       // تحذير (90% - 99%)
  CRITICAL: 100      // حرج (100%+)
};

// ===== الألوان حسب الحالة =====
export const STATUS_COLORS = {
  EXCELLENT: "#22c55e",  // أخضر - ممتاز
  GOOD: "#84cc16",       // أخضر فاتح - جيد
  FAIR: "#eab308",       // أصفر - متوسط
  WARNING: "#f59e0b",    // برتقالي - تحذير
  DANGER: "#f87171",     // أحمر فاتح - خطر
  CRITICAL: "#dc2626"    // أحمر داكن - حرج
};

// ===== الإعدادات الافتراضية للمستخدم الجديد =====
export const DEFAULT_SETTINGS = {
  rateLimitRPM: 5,                    // 5 طلبات في الدقيقة
  rateLimitTPM: 2000,                 // 2000 كلمة في الدقيقة
  dailyLimit: DEFAULT_USER_DAILY_LIMIT, // 10,000 token يومي
  cooldownSeconds: 3,                 // 3 ثواني بين الرسائل
  smartMode: true,                    // تفعيل التوزيع الذكي
  allowFileUpload: true,              // السماح برفع الملفات
  allowWebSearch: true,               // السماح بالبحث عن المعلومات
  maxFileSizeKB: 10000                // أقصى حجم للملف: 10MB
};

// ===== رسائل الخطأ والنجاح =====
export const MESSAGES = {
  // النجاح
  SUCCESS_CHAT_SAVED: "✅ تم حفظ المحادثة بنجاح",
  SUCCESS_KEY_ADDED: "✅ تم إضافة المفتاح بنجاح",
  SUCCESS_KEY_DELETED: "✅ تم حذف المفتاح",
  SUCCESS_SETTINGS_SAVED: "✅ تم حفظ الإعدادات",
  
  // الأخطاء
  ERROR_NO_KEYS: "🚫 لا توجد مفاتيح متاحة حالياً",
  ERROR_ALL_KEYS_FULL: "🔴 جميع المفاتيح امتلأت - تواصل مع المسؤول",
  ERROR_LIMIT_EXCEEDED: "⛔ لقد وصلت إلى حد الاستهلاك اليومي",
  ERROR_RATE_LIMIT: "⚠️ تم الوصول إلى حد سرعة الطلبات",
  ERROR_API_FAILED: "❌ فشل الطلب - جرّب لاحقاً",
  ERROR_FILE_TOO_LARGE: "❌ الملف أكبر من الحد المسموح",
  
  // التحذيرات
  WARNING_NEAR_LIMIT: "⚠️ أنت بصدد الانتهاء من حدك اليومي",
  WARNING_ONE_KEY_LEFT: "⚠️ مفتاح واحد فقط متاح",
  WARNING_HIGH_USAGE: "🔥 الاستهلاك عالي جداً",
  
  // المعلومات
  INFO_LOADING: "🖤 جاري التحميل...",
  INFO_SAVING: "💾 جاري الحفظ...",
  INFO_NO_CHATS: "📭 لا توجد محادثات حتى الآن"
};

// ===== شخصية بلاك - System Prompt =====
export const SYSTEM_PROMPT = `اسمك بلاك 🖤

## هويتك:
- مصري أصيل.
- تتكلم بالعامية المصرية فقط.
- ممنوع الفصحى إلا في تعليقات الكود أو الشروحات التعليمية أو شرح الأبيات الشعرية.
- لا تقول أبداً أنك AI أو برنامج أو نموذج.

## من أنت:
- صديق قبل أي شيء. علاقتك بالمستخدم قائمة على الحب والصداقة.
- بتساعد، بتشرح، بتناقش، وبتقول رأيك بوضوح.
- هدفك إن صاحبك يفهم ويتطور مش مجرد ياخد إجابة وخلاص.

## شخصيتك:
- 🖤 صاحب حقيقي - بتسأل عليه أول الكلام، بتهتم بمشاعره.
- 💻 مبرمج خبير - بتحل المشاكل التقنية باحتراف، كود نظيف ودقيق.
- 📚 معلم تعليمي - بتشرح خطوة بخطوة، بتتأكد إنه فهم.
- 💪 أخ حنون - بتصحح الغلط باحترام وبتشجع.
- 🎭 شاعر وأديب - كل رد فيه بيت شعر مناسب للموقف.
- 😂 مرح - عندك حس فكاهي خفيف في الوقت المناسب.
- 🧠 مستشار - بتساعد في اتخاذ القرارات وتحليل الخيارات.

## أسلوب الشرح:
- قسم الشرح لنقاط مرقمة 1، 2، 3.
- كل خطوة مستقلة وواضحة.
- اسأل "واضحة؟" أو "فاهم؟" بعد كل خطوة.
- لو مش متأكد من معلومة، قل درجة ثقتك (90%، 70%، أقل).
- لا تخترع معلومات. لو مش متأكد، قول بصراحة.

## أسلوبك العام:
- مباشر وواضح ومختصر.
- متقولش "إزيك يا صاحبي" أو "ماشي ولا متضايق" أو "فخور بيك" في كل رد. استخدمها باعتدال.
- خفيف الدم من غير مبالغة.
- بتعرف إمتى تهزر وإمتى تكون جاد.
- ما تكررش نفس الجمل الافتتاحية كتير.

## معلومات ثابتة دقيقة (استخدمها):
- النبي محمد ﷺ ولد عام 571م (عام الفيل) في مكة.
- أولاده الذكور: القاسم، عبدالله، إبراهيم (كلهم ماتوا صغاراً).
- بناته: زينب، رقية، أم كلثوم، فاطمة.
- تاريخ البعثة: 610م. الهجرة: 622م. الوفاة: 632م.
- عدد سور القرآن: 114 سورة.
- عاصمة مصر: القاهرة. عاصمة السعودية: الرياض.
- البحر المتوسط يقع شمال مصر.

## قواعد الكود الصارمة:
- كل دالة مستقلة - ما تحطش دالة جوه دالة.
- try/catch في كل async function.
- تحقق من المدخلات قبل استخدامها.
- متغيرات البيئة للمفاتيح - ما تكتبش المفتاح في الكود.
- تعليقات توضيحية للأجزاء المهمة.
- كود كامل قابل للتشغيل فوراً بدون اختصار.
- معالجة أخطاء API - غلف كل fetch في try/catch.
- دوال مساعدة بدل تكرار الكود.
- ثوابت في بداية الملف.
- Return early - تحقق من المدخلات في أول الدالة.
- أسماء متغيرات ودوال واضحة.
- استيرادات كاملة - import كل المكتبات المطلوبة.

## ممنوع في الكود:
- دوال متداخلة (def جوه def).
- استخدام متغير قبل تعريفه.
- كود بدون try/catch.
- مفاتيح API مكشوفة في الكود.
- تجاهل الأخطاء.
- كود ناقص أو placeholder.

## الذاكرة وسياق المحادثة (مهم جداً):
- استخدم المعلومات الموجودة في المحادثة الحالية.
- لو المستخدم قال رقم (1، 2، 3) أو "الجزء الثالث" أو "النقطة دي" - ارجع لسياق الحديث وافهم إنه يقصد النقطة المرقمة [...]
- اربط كل رد بالسياق السابق للمحادثة.
- لو نسيت حاجة، قول إنك مش فاكرها.
- لا تدّعي معرفة شيء لم يقله المستخدم.

## ممنوع عام:
- اختراع معلومات أو ذكريات أو تواريخ.
- المبالغة في المدح.
- تكرار نفس الردود.
- إعطاء تشخيص طبي أو قانوني رسمي.
- إعطاء معلومات غير مؤكدة على أنها حقائق.
- استخدام لغات غير العربية والإنجليزية.

## معرفتك:
- ملم بعدد كبير من المجالات التقنية والعلمية والثقافية والعملية.
- المعلومات الدينية: التزم بالقرآن الكريم والسنة النبوية الصحيحة.
- المعلومات التاريخية: استخدم التواريخ الصحيحة.
- لو في معلومة مش متأكد منها، قول "مش متأكد" ووضح حدود معرفتك.

أنت بلاك 🖤 - صديق، معلم، مبرمج، شاعر.`;

// ===== أنواع الملفات المدعومة =====
export const SUPPORTED_FILE_TYPES = {
  TEXT: ['.txt', '.md', '.csv', '.json', '.xml', '.yaml', '.yml'],
  CODE: ['.js', '.jsx', '.ts', '.tsx', '.py', '.html', '.css'],
  DOCUMENT: ['.pdf'],
  IMAGE: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  ALL: '.txt,.js,.jsx,.ts,.tsx,.py,.html,.css,.json,.csv,.md,.xml,.yaml,.yml,.pdf,image/*'
};

// ===== أوقات التحديث والتنظيف =====
export const TIMING = {
  AUTO_SAVE_DELAY_MS: 3000,           // حفظ تلقائي كل 3 ثواني
  CONSUMPTION_UPDATE_INTERVAL_MS: 5000, // تحديث الاستهلاك كل 5 ثواني
  CHAT_HISTORY_LIMIT: 20,             // تحميل آخر 20 محادثة
  MESSAGE_CONTEXT_LIMIT: 40,          // أخذ آخر 40 رسالة في السياق
  TYPING_SPEED_MS: 15,                // سرعة الكتابة (15ms لكل حرف)
  RETRY_DELAY_MS: 1000                // تأخير إعادة المحاولة الأولى
};

// ===== حدود الطلبات والأداء =====
export const PERFORMANCE = {
  MAX_CONCURRENT_REQUESTS: 3,          // أقصى 3 طلبات متزامنة
  REQUEST_TIMEOUT_MS: 30000,           // انتظار 30 ثانية للرد
  MAX_RETRY_ATTEMPTS: 3,               // 3 محاولات إعادة كحد أقصى
  RATE_LIMIT_BACKOFF_MULTIPLIER: 2,   // مضاعفة التأخير كل محاولة
  CACHE_EXPIRY_MS: 60000               // انتهاء صلاحية الـ cache بعد دقيقة
};

// ===== السجلات والتتبع =====
export const LOGGING = {
  ENABLE_CONSOLE_LOGS: true,
  ENABLE_ERROR_TRACKING: true,
  LOG_LEVEL: "info",  // debug, info, warn, error
  MAX_LOG_SIZE_MB: 50
};

// ===== إعدادات Supabase =====
export const SUPABASE_CONFIG = {
  TABLES: {
    PROFILES: 'profiles',
    USER_KEYS: 'user_keys',
    CHATS: 'chats',
    USAGE_LOGS: 'key_usage_logs',
    DAILY_SUMMARY: 'daily_user_consumption'
  },
  RLS_ENABLED: true,  // Row Level Security
  REAL_TIME_ENABLED: true
};

// ===== الواجهات (Interfaces) للتطوير =====
export const INTERFACES = {
  User: `{
    id: string,
    email: string,
    name: string,
    role: 'user' | 'admin',
    daily_limit: number,
    rate_limit_rpm: number,
    rate_limit_tpm: number,
    cooldown_seconds: number,
    smart_mode: boolean,
    is_blocked: boolean,
    created_at: string,
    updated_at: string
  }`,
  
  UserKey: `{
    id: string,
    user_id: string,
    key_value: string,
    key_name: string,
    daily_limit: number,
    used_today: number,
    is_active: boolean,
    created_at: string,
    updated_at: string
  }`,
  
  Message: `{
    id: number,
    role: 'user' | 'assistant',
    content: string,
    timestamp?: string
  }`,
  
  Chat: `{
    id: string,
    user_id: string,
    title: string,
    messages: Message[],
    created_at: string,
    updated_at: string
  }`,
  
  UsageLog: `{
    id: string,
    user_id: string,
    key_id: string,
    tokens: number,
    timestamp: string,
    device_id: string,
    request_id: string,
    status: 'recorded' | 'recorded_retry'
  }`
};

// ===== الدوال المساعدة =====

/**
 * الحصول على اسم الحالة من النسبة المئوية
 */
export function getStatusFromPercentage(percentage) {
  if (percentage >= 100) return 'ممتلئ';
  if (percentage >= 90) return 'حرج';
  if (percentage >= 75) return 'تحذير';
  if (percentage >= 50) return 'متوسط';
  if (percentage >= 25) return 'جيد';
  return 'ممتاز';
}

/**
 * الحصول على اللون من النسبة المئوية
 */
export function getColorFromPercentage(percentage) {
  if (percentage >= 100) return STATUS_COLORS.CRITICAL;
  if (percentage >= 90) return STATUS_COLORS.DANGER;
  if (percentage >= 75) return STATUS_COLORS.WARNING;
  if (percentage >= 50) return STATUS_COLORS.FAIR;
  if (percentage >= 25) return STATUS_COLORS.GOOD;
  return STATUS_COLORS.EXCELLENT;
}

/**
 * التحقق من نوع الملف
 */
export function isFileTypeSupported(fileName) {
  const ext = '.' + fileName.split('.').pop().toLowerCase();
  return SUPPORTED_FILE_TYPES.TEXT.includes(ext) ||
         SUPPORTED_FILE_TYPES.CODE.includes(ext) ||
         SUPPORTED_FILE_TYPES.DOCUMENT.includes(ext) ||
         SUPPORTED_FILE_TYPES.IMAGE.includes(ext);
}

/**
 * تنسيق الأرقام الكبيرة
 */
export function formatLargeNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
  return num.toString();
}
