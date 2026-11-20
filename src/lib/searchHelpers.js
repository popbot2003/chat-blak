// ============================================
// src/lib/searchHelpers.js — BLACK 🖤
// بحث ويب حقيقي مع تدوير تلقائي بين 3 مزوّدين
// ============================================
//
// مزوّدو البحث (بالأولوية):
//   1. Tavily   — key_name يبدأ بـ "tavily_"
//   2. Brave    — key_name يبدأ بـ "brave_"
//   3. Serper   — key_name يبدأ بـ "serper_"
//
// إضافة مفاتيح: لوحة الأدمن ← تبويب المفاتيح
//   اسم المفتاح: tavily_1  أو  brave_1  أو  serper_1
//   قيمة المفتاح: المفتاح من موقع المزوّد
//
// التدوير: لو مفتاح فشل أو استنفد حده، ينتقل للتالي.
//          لو المزوّد كله خلص، ينتقل للمزوّد الثاني، وهكذا.
// ============================================

import { supabase } from "./supabase";

// ─── الموجّه الذكي: هل يحتاج هذا السؤال بحثًا؟ ─────────────
// بيتجاهل: التحيات، البرمجة الصرفة، الإبداع، الرياضيات
const NO_SEARCH_PATTERNS = [
  /^(أهلا|مرحبا|هاي|هلو|صباح|مساء|ازيك|كيفك|عامل|تمام)/i,
  /^(اكتب|اشرح|لخص|ترجم|صحح|حسن|اكمل|خلص)\s/i,
  /^(كيف\s+(تكتب|تعمل|تبني|تبرمج|تنشئ))/i,
  /^(ما هو|ما هي|ما معنى|عرّف|وضح)\s/i,
  /^(\d+[\+\-\*\/]|\d+\s*[\+\-\*\/])/,  // عمليات حسابية
];

const NEEDS_SEARCH_PATTERNS = [
  // أخبار وأحداث
  /أخبار|خبر|حدث|حوادث|اليوم|امبارح|الأسبوع|الشهر|السنة|سعر|أسعار/i,
  // طلب صريح
  /ابحث|بحث|دور على|فين|وين|متى|إيمتى|أحدث|جديد|آخر|latest|search/i,
  // معلومات متغيرة
  /سعر|صرف|دولار|بورصة|أسهم|مباراة|نتيجة|ترتيب|بطولة/i,
  // أشخاص وأماكن
  /مين|مَن|هو|هي|وين|فين|عنوان|رقم تلفون|موقع/i,
  // حوادث وطقس
  /طقس|حرارة|مطر|زلزال|فيضان|عاصفة/i,
];

export function needsWebSearch(text) {
  if (!text || text.length < 5) return false;
  const t = text.trim();
  if (NO_SEARCH_PATTERNS.some((re) => re.test(t))) return false;
  return NEEDS_SEARCH_PATTERNS.some((re) => re.test(t));
}

// ─── جلب مفاتيح البحث من قاعدة البيانات ─────────────────────
async function getSearchKeys() {
  const { data, error } = await supabase
    .from("api_keys")
    .select("id, key_name, key_value, is_active, is_valid, failure_count, rate_limited_until")
    .or("key_name.ilike.tavily_%,key_name.ilike.brave_%,key_name.ilike.serper_%")
    .eq("is_active", true)
    .eq("is_valid", true)
    .order("key_name");

  if (error) return [];

  const now = new Date();
  return (data || []).filter((k) => {
    if (k.failure_count >= 5) return false;
    if (k.rate_limited_until && new Date(k.rate_limited_until) > now) return false;
    return true;
  });
}

function getProvider(keyName) {
  if (keyName.startsWith("tavily_"))  return "tavily";
  if (keyName.startsWith("brave_"))   return "brave";
  if (keyName.startsWith("serper_"))  return "serper";
  return null;
}

// ─── تسجيل فشل المفتاح ──────────────────────────────────────
async function markKeyFailed(keyId) {
  await supabase.rpc("increment_key_failure", { key_id: keyId }).catch(() => {
    // fallback لو الدالة غير موجودة
    supabase
      .from("api_keys")
      .update({ failure_count: supabase.rpc("failure_count + 1") })
      .eq("id", keyId)
      .catch(() => null);
  });
}

// ─── البحث عبر Tavily ────────────────────────────────────────
async function searchTavily(query, apiKey) {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: "basic",
      max_results: 5,
      include_answer: false,
    }),
  });
  if (!res.ok) throw new Error(`Tavily ${res.status}`);
  const data = await res.json();
  return (data.results || []).map((r) => ({
    title:   r.title,
    url:     r.url,
    snippet: r.content?.slice(0, 300) || "",
    favicon: `https://www.google.com/s2/favicons?domain=${new URL(r.url).hostname}&sz=32`,
    domain:  new URL(r.url).hostname.replace("www.", ""),
  }));
}

// ─── البحث عبر Brave ─────────────────────────────────────────
async function searchBrave(query, apiKey) {
  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5&country=ar`;
  const res = await fetch(url, {
    headers: {
      "Accept": "application/json",
      "Accept-Encoding": "gzip",
      "X-Subscription-Token": apiKey,
    },
  });
  if (!res.ok) throw new Error(`Brave ${res.status}`);
  const data = await res.json();
  return (data.web?.results || []).map((r) => ({
    title:   r.title,
    url:     r.url,
    snippet: r.description?.slice(0, 300) || "",
    favicon: `https://www.google.com/s2/favicons?domain=${new URL(r.url).hostname}&sz=32`,
    domain:  new URL(r.url).hostname.replace("www.", ""),
  }));
}

// ─── البحث عبر Serper (Google) ───────────────────────────────
async function searchSerper(query, apiKey) {
  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": apiKey,
    },
    body: JSON.stringify({ q: query, num: 5, hl: "ar" }),
  });
  if (!res.ok) throw new Error(`Serper ${res.status}`);
  const data = await res.json();
  return (data.organic || []).map((r) => ({
    title:   r.title,
    url:     r.link,
    snippet: r.snippet?.slice(0, 300) || "",
    favicon: `https://www.google.com/s2/favicons?domain=${new URL(r.link).hostname}&sz=32`,
    domain:  new URL(r.link).hostname.replace("www.", ""),
  }));
}

// ─── البحث الرئيسي (مع تدوير) ───────────────────────────────
export async function webSearch(query) {
  if (!query?.trim()) return null;

  const keys = await getSearchKeys();
  if (keys.length === 0) return null;

  // ترتيب المزوّدين: Tavily أولًا ثم Brave ثم Serper
  const order = ["tavily", "brave", "serper"];
  const grouped = {};
  for (const p of order) grouped[p] = keys.filter((k) => getProvider(k.key_name) === p);

  for (const provider of order) {
    for (const key of grouped[provider]) {
      try {
        let results;
        if (provider === "tavily") results = await searchTavily(query, key.key_value);
        if (provider === "brave")  results = await searchBrave(query, key.key_value);
        if (provider === "serper") results = await searchSerper(query, key.key_value);

        if (results && results.length > 0) return { results, provider };
      } catch (err) {
        console.warn(`[search] ${provider} key ${key.key_name} failed:`, err.message);
        await markKeyFailed(key.id);
      }
    }
  }

  return null; // كل المزوّدين فشلوا
}

// ─── بناء سياق البحث للـ prompt ──────────────────────────────
export function buildSearchContext(results) {
  if (!results?.length) return "";
  return results
    .map((r, i) => `[${i + 1}] ${r.title}\n${r.snippet}\nالمصدر: ${r.url}`)
    .join("\n\n");
}
