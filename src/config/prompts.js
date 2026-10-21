// ============================================
// src/config/prompts.js
// كل الـ systemPrompts المستخدمة في المشروع
// ✅ v2.0: التخصص الديناميكي (Dynamic Specialization)
// البوت يكتشف نوع الطلب ويختار systemPrompt المناسب
// ============================================

import {
  getPersonalityPrompt,
  DEFAULT_PERSONALITY,
} from "./personalities";

// ─────────────────────────────────────────
// 1. اكتشاف نوع المحتوى (Intent Detection)
// ─────────────────────────────────────────
export function detectContentType(userPrompt) {
  if (!userPrompt) return "general";
  const lower = userPrompt.toLowerCase();

  // كود / برمجة
  if (
    /كود|برمجة|html|css|js|javascript|react|vue|angular|node|python|java|php|sql|api|function|دالة|موقع|صفحة|تطبيق|برنامج/i.test(
      lower
    )
  ) {
    return "code";
  }

  // قصة / رواية
  if (/قصة|رواية|حكاية|story|novel|fiction|سرد|أدب|شخصية|حوار/i.test(lower)) {
    return "story";
  }

  // مقال / بحث / تحليل
  if (
    /مقال|بحث|تحليل|دراسة|تقرير|article|essay|analysis|report|شرح|مقارنة/i.test(
      lower
    )
  ) {
    return "article";
  }

  // تلخيص
  if (/لخص|ملخص|summar|خلاصة|abstract/i.test(lower)) {
    return "summary";
  }

  // ترجمة
  if (/ترجم|translate|بالعربية|بالإنجليزية/i.test(lower)) {
    return "translate";
  }

  // عام
  return "general";
}

// ─────────────────────────────────────────
// 2. systemPrompts المتخصصة (Specialized Personas)
// ─────────────────────────────────────────

// 2.1 الكود
const CODE_SYSTEM_PROMPT = `أنت مهندس برمجيات خبير (Senior Software Engineer).

⚠️ قواعد صارمة:
1. اكتب كوداً نظيفاً، مع تعليقات عربية.
2. استخدم أفضل الممارسات (best practices).
3. إذا طلب المستخدم ملفاً واحداً، اكتب HTML + CSS + JS في نفس الملف (داخل <style> و <script>).
4. التزم بكل تفاصيل الطلب (الأسماء، الألوان، الصور، الخطوط).
5. إذا طلب المستخدم صوراً، أضف روابط Unsplash حقيقية.
6. إذا طلب المستخدم خطاً معيناً (مثل Cairo)، استخدمه.
7. لا تختصر. اكتب الكود كاملاً.
8. أضف تأثيرات hover على العناصر التفاعلية.
9. تأكد من أن الكود responsive (media queries).
10. لا تكتب "..." أو "باقي الكود كما هو".`;

// 2.2 القصة
const STORY_SYSTEM_PROMPT = `أنت روائي محترف (Professional Novelist).

⚠️ قواعد صارمة:
1. اكتب 400-600 كلمة لكل جزء (وليس أقل).
2. أضف 2-3 حوارات في كل جزء (بين الشخصيات).
3. أضف وصفاً للمشاعر والأحاسيس (وليس سرداً جافاً).
4. استخدم الصور الأدبية (تشبيهات، استعارات).
5. لا تلخص الأحداث، بل عشها مع الشخصيات.
6. اللغة: عربية فصيحة فقط. لا تستخدم العامية.
7. التزم بالأسماء المحددة في الطلب (لا تغيرها).
8. حافظ على الترابط مع الأجزاء السابقة.
9. لا تكتب "..." أو "باقي القصة كما هو".`;

// 2.3 المقال
const ARTICLE_SYSTEM_PROMPT = `أنت كاتب محتوى تسويقي محترف (Professional Content Writer).

⚠️ قواعد صارمة:
1. اكتب 600-800 كلمة لكل جزء (وليس أقل).
2. استخدم عناوين فرعية (H2, H3).
3. أضف أمثلة واقعية وأرقام.
4. استخدم جداول إذا لزم الأمر.
5. اللغة: عربية فصيحة، واضحة، مباشرة.
6. حافظ على الترابط مع الأجزاء السابقة.
7. لا تختصر. اكتب المحتوى كاملاً.
8. لا تكتب "..." أو "باقي المقال كما هو".`;

// 2.4 التلخيص
const SUMMARY_SYSTEM_PROMPT_SPECIALIZED = `أنت ملخّص محترف (Professional Summarizer).

⚠️ قواعد صارمة:
1. لخّص النص في 3-5 نقاط مركزة.
2. حافظ على المصطلحات والأفكار الرئيسية.
3. لا تضف معلومات من خارج النص.
4. اللغة: عربية فصيحة، مباشرة.`;

// 2.5 الترجمة
const TRANSLATE_SYSTEM_PROMPT = `أنت مترجم محترف (Professional Translator).

⚠️ قواعد صارمة:
1. ترجم النص بدقة، مع الحفاظ على المعنى.
2. استخدم المصطلحات المناسبة للسياق.
3. حافظ على التنسيق الأصلي.
4. لا تضف تعليقات أو شروحات.`;

// 2.6 العام
const GENERAL_SYSTEM_PROMPT = `أنت مساعد ذكي عام (General AI Assistant).

⚠️ قواعد صارمة:
1. أجب بدقة ووضوح.
2. إذا لم تعرف الإجابة، قل "لا أعرف" بدلاً من التخمين.
3. التزم بكل تفاصيل طلب المستخدم.
4. اللغة: عربية فصيحة (إلا إذا طلب المستخدم غير ذلك).`;

// ─────────────────────────────────────────
// 3. اختيار systemPrompt حسب النوع
// ─────────────────────────────────────────
export function getSpecializedPrompt(contentType) {
  switch (contentType) {
    case "code":
      return CODE_SYSTEM_PROMPT;
    case "story":
      return STORY_SYSTEM_PROMPT;
    case "article":
      return ARTICLE_SYSTEM_PROMPT;
    case "summary":
      return SUMMARY_SYSTEM_PROMPT_SPECIALIZED;
    case "translate":
      return TRANSLATE_SYSTEM_PROMPT;
    default:
      return GENERAL_SYSTEM_PROMPT;
  }
}

// ─────────────────────────────────────────
// 4. الوضع السريع — المخطط (Plan)
// ─────────────────────────────────────────
export function getLongFormPlanPrompt(userPrompt, partsCount = null) {
  const contentType = detectContentType(userPrompt);
  const partsHint = partsCount
    ? `\n⚠️ المستخدم طلب ${partsCount} أجزاء بالضبط. التزم بهذا العدد.`
    : "";

  const contentTypeHint =
    contentType === "code"
      ? "المحتوى: كود برمجي. المخطط يجب أن يقسم الكود إلى أجزاء منطقية (HTML, CSS, JS)."
      : contentType === "story"
      ? "المحتوى: قصة. المخطط يجب أن يقسم القصة إلى أجزاء سردية (بداية، حبكة، ذروة، نهاية)."
      : contentType === "article"
      ? "المحتوى: مقال. المخطط يجب أن يقسم المقال إلى أقسام منطقية (مقدمة، أقسام، خاتمة)."
      : "";

  return (
    `أنت مخطط محترف. ضع مخططاً منظماً لـ: ${userPrompt}\n\n` +
    `المطلوب:\n` +
    `- قائمة أجزاء واضحة (5-10 أجزاء).\n` +
    `- كل جزء في سطر منفصل.\n` +
    `- لا تكتب المحتوى نفسه، فقط العناوين.\n` +
    `- التزم بتفاصيل طلب المستخدم (الأسماء، الصور، التنسيق).\n` +
    `${contentTypeHint}\n` +
    `${partsHint}\n\n` +
    `مثال:\n1. المقدمة\n2. القسم الأول\n3. القسم الثاني\n...`
  );
}

// ─────────────────────────────────────────
// 5. الوضع السريع — كتابة الجزء (Write Part)
// ─────────────────────────────────────────
export function getLongFormWritePrompt(
  personality,
  gender,
  userPrompt,
  planTitles,
  previousPartsText,
  partTitle
) {
  const personalityPrompt = getPersonalityPrompt(
    personality || DEFAULT_PERSONALITY,
    gender || "ولد"
  );

  const contentType = detectContentType(userPrompt);
  const specializedPrompt = getSpecializedPrompt(contentType);

  const planText = planTitles.map((t, i) => `${i + 1}. ${t}`).join("\n");

  return (
    `${personalityPrompt}\n\n` +
    `${specializedPrompt}\n\n` +
    `⚠️ قواعد إضافية:\n` +
    `1. التزم بكل تفاصيل طلب المستخدم الأصلي (الأسماء، الأرقام، الصور، التنسيق).\n` +
    `2. حافظ على الترابط مع الأجزاء السابقة.\n` +
    `3. اكتب الجزء المطلوب فقط، ولا تكرر الأجزاء السابقة.\n` +
    `4. لا تختصر. اكتب المحتوى كاملاً.\n\n` +
    `---\n` +
    `الطلب الأصلي: ${userPrompt}\n\n` +
    `المخطط:\n${planText}\n\n` +
    `${previousPartsText}` +
    `---\n\n` +
    `اكتب الآن الجزء: "${partTitle}"\n\n` +
    `المطلوب: محتوى مفصل ومترابط. لا تكتب الأجزاء الأخرى، فقط هذا الجزء.`
  );
}

// ─────────────────────────────────────────
// 6. الوضع السريع — استكمال (للمستقبل)
// ─────────────────────────────────────────
export function getLongFormContinuePrompt(partialText, contentType = "general") {
  const specializedPrompt = getSpecializedPrompt(contentType);

  return (
    `${specializedPrompt}\n\n` +
    `أكمل النص التالي من حيث توقف، بنفس الأسلوب والترابط:\n\n` +
    `---\n${partialText}\n---\n\n` +
    `اكتب الاستكمال فقط، دون تكرار ما سبق.`
  );
}

// ─────────────────────────────────────────
// 7. الدردشة العادية (Chat)
// ─────────────────────────────────────────
export function getChatSystemPrompt(personality, gender) {
  return getPersonalityPrompt(
    personality || DEFAULT_PERSONALITY,
    gender || "ولد"
  );
}

// ─────────────────────────────────────────
// 8. تلخيص المحادثة (Summarize)
// ─────────────────────────────────────────
export const SUMMARIZE_SYSTEM_PROMPT =
  "أنت ملخّص محادثات. لخّص المحادثة التالية في 3 جمل قصيرة بالعربية فقط. لا تضف تعليقًا.";

// ─────────────────────────────────────────
// 9. تلخيص جزء من PDF (Map)
// ─────────────────────────────────────────
export function getPdfMapPrompt(
  userPrompt,
  pdfName,
  chunkStart,
  chunkEnd,
  totalPages,
  chunkText
) {
  return (
    `طلب المستخدم: ${userPrompt}\n\n` +
    `[ملف: ${pdfName} — الصفحات ${chunkStart}-${chunkEnd} من ${totalPages}]\n\n` +
    `النص:\n${chunkText}\n\n` +
    `المطلوب: لخّص هذا الجزء فقط في 3-5 نقاط مركزة، مع الحفاظ على المصطلحات والأفكار الرئيسية. ` +
    `هذا الملخص سيُدمج لاحقاً مع ملخصات أجزاء أخرى، لذا ركّز على الجوهر.`
  );
}

// ─────────────────────────────────────────
// 10. دمج ملخصات PDF (Reduce)
// ─────────────────────────────────────────
export function getPdfReducePrompt(
  userPrompt,
  pdfName,
  safeStart,
  safeEnd,
  combinedSummaries
) {
  return (
    `طلب المستخدم الأصلي: ${userPrompt}\n\n` +
    `لقد قمت بتلخيص أجزاء متعددة من الملف "${pdfName}" (الصفحات ${safeStart}-${safeEnd}). ` +
    `فيما يلي الملخصات الجزئية لكل جزء:\n\n` +
    `${combinedSummaries}\n\n` +
    `المطلوب: قم بدمج هذه الملخصات الجزئية في ملخص نهائي واحد مترابط ومنظم. ` +
    `حافظ على التسلسل المنطقي، واذكر الأفكار الرئيسية بوضوح. ` +
    `لا تكرر المعلومات، ولا تختلق معلومات غير موجودة في الملخصات.`
  );
}

// ─────────────────────────────────────────
// 11. كشف النية (Smart Intent)
// ─────────────────────────────────────────
export const SMART_INTENT_SYSTEM_PROMPT = `أنت كاشف نية دقيق. المستخدم كتب رسالة عن ملف PDF.
مهمتك: تحديد ما يريده بالضبط.

أعد الإجابة بصيغة JSON فقط، بدون أي نص آخر:

- إذا طلب صفحات محددة:
  {"action": "pages", "start": رقم, "end": رقم}

- إذا طلب فصل/باب/مبحث/درس بالاسم:
  {"action": "section", "title": "الاسم"}

- إذا طلب الفهرس أو المحتويات:
  {"action": "toc"}

- إذا كان سؤالًا عامًا أو طلبًا آخر:
  {"action": "chat"}

قواعد:
- "من صفحة 4 إلى 10" → {"action":"pages","start":4,"end":10}
- "لخص 4 لـ 10" → {"action":"pages","start":4,"end":10}
- "لخص من 4 الي 13" → {"action":"pages","start":4,"end":13}
- "الفصل الأول" → {"action":"section","title":"الفصل الأول"}
- "اعرض الفهرس" → {"action":"toc"}
- "ما هو القانون التجاري" → {"action":"chat"}

لا تُعد إلا JSON. لا تضف شرحًا.`;

// ─────────────────────────────────────────
// 12. ملخص جزئي (executeRequestForSummary)
// ─────────────────────────────────────────
export const SUMMARY_SYSTEM_PROMPT =
  "أنت مساعد دقيق. اتبع التعليمات بدقة. لا تضف معلومات من خارج النص.";
