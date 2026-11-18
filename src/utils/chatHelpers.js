// ============================================
// chatHelpers.js — بلاك 🖤
// ✅ DuckDuckGo بس لما يُطلب صراحة
// ✅ إزالة auto-summarize
// ✅ Sliding Window للـ context
// ✅ Cache لفحص is_blocked
// ✅ نظام الذاكرة الجديد
// ============================================

import { supabase } from "../lib/supabase";
import {
  GROQ_FAST_MODEL,
  CONTEXT_WINDOW_SIZE,
  BLOCKED_CHECK_CACHE_MS,
  SEARCH_TRIGGER_KEYWORDS,
  MEMORY_LOAD_LIMIT,
  MEMORY_MIN_IMPORTANCE,
  MEMORY_EXTRACT_INTERVAL,
  MEMORY_CATEGORIES,
} from "../config/constants";


// ══════════════════════════════════════════════
// 1. 🔍 DuckDuckGo — بس لما يُطلب صراحة
// ══════════════════════════════════════════════

/**
 * يفحص إذا كانت الرسالة تطلب بحث خارجي
 */
export function needsWebSearch(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return SEARCH_TRIGGER_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * بحث DuckDuckGo — يُستدعى بس لو needsWebSearch() = true
 */
export async function searchDuckDuckGo(query) {
  try {
    const res = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&kl=ar-ar&t=h_`
    );
    const data = await res.json();
    const results = [];
    if (data.Abstract) results.push(data.Abstract);
    if (data.Answer)   results.unshift(data.Answer);
    if (data.RelatedTopics) {
      data.RelatedTopics.slice(0, 3).forEach((t) => {
        if (t.Text) results.push(t.Text);
      });
    }
    return results.length > 0 ? results.join("\n") : null;
  } catch {
    return null;
  }
}


// ══════════════════════════════════════════════
// 2. 🧹 تنظيف الرد
// ══════════════════════════════════════════════

export function cleanResponse(text) {
  if (!text) return "";
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/[ \t]+/g, " ")
    .trim();
}


// ══════════════════════════════════════════════
// 3. 📄 قراءة ملف نصي
// ══════════════════════════════════════════════

export async function readFileAsText(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => resolve("❌ خطأ في قراءة الملف");
    if (file.type === "application/pdf") {
      resolve("");
      return;
    }
    reader.onload = () => resolve(reader.result);
    reader.readAsText(file);
  });
}


// ══════════════════════════════════════════════
// 4. 🎨 أيقونة الملف
// ══════════════════════════════════════════════

export function getFileIcon(file) {
  if (file.type.startsWith("image/"))                                    return "🖼️";
  if (file.type === "application/pdf")                                   return "📄";
  if (file.type.includes("javascript") || /\.[jt]sx?$/.test(file.name)) return "💛";
  if (file.type.includes("python")     || file.name.endsWith(".py"))     return "🐍";
  if (file.type.includes("html")       || file.name.endsWith(".html"))   return "🌐";
  if (file.type.includes("css")        || file.name.endsWith(".css"))    return "🎨";
  if (file.name.endsWith(".json"))                                        return "📋";
  if (file.name.endsWith(".csv"))                                         return "📊";
  if (file.name.endsWith(".md"))                                          return "📝";
  return "📎";
}


// ══════════════════════════════════════════════
// 5. 🔔 Toast
// ══════════════════════════════════════════════

export function showToast(message, type = "success") {
  const colors = {
    error:   "var(--color-error)",
    info:    "var(--color-info)",
    success: "var(--color-success)",
    warning: "var(--color-warning)",
  };
  const div = document.createElement("div");
  div.style.cssText = `
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    background: ${colors[type] ?? colors.success};
    color: #fff;
    padding: 10px 20px;
    border-radius: 12px;
    z-index: 9999;
    font-size: 14px;
    font-family: var(--font-body);
    pointer-events: none;
    box-shadow: 0 4px 16px rgba(0,0,0,0.3);
  `;
  div.textContent = message;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 3000);
}


// ══════════════════════════════════════════════
// 6. ⏱️ ترتيب الرسائل
// ══════════════════════════════════════════════

export function getMessageTimestamp(msg) {
  if (msg.task?.created_at)                                  return new Date(msg.task.created_at).getTime();
  if (typeof msg.id === "number")                            return msg.id;
  if (typeof msg.id === "string" && !isNaN(Number(msg.id))) return Number(msg.id);
  return 0;
}

export function sortMessagesByTime(msgs) {
  return [...msgs].sort((a, b) => getMessageTimestamp(a) - getMessageTimestamp(b));
}


// ══════════════════════════════════════════════
// 7. 🔗 دمج الرسائل بدون تكرار
// ══════════════════════════════════════════════

export function mergeMessages(existing, newMsgs) {
  const seen     = new Set();
  const combined = [];

  for (const m of [...existing, ...newMsgs]) {
    if (!m || !m.id) continue;
    const key = String(m.id);
    if (seen.has(key)) continue;
    seen.add(key);
    combined.push(m);
  }

  return sortMessagesByTime(combined);
}


// ══════════════════════════════════════════════
// 8. 🪟 Sliding Window — آخر N رسالة كـ context
// ✅ بدل إرسال كل التاريخ مع كل رسالة
// ══════════════════════════════════════════════

/**
 * يُرجع آخر CONTEXT_WINDOW_SIZE رسالة بشكل مناسب للـ API
 * @param {Array}  messages - كل الرسائل
 * @param {string} newUserMessage - الرسالة الجديدة
 * @returns {Array} - الرسائل بصيغة {role, content}
 */
export function buildContextWindow(messages, newUserMessage) {
  const window = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .slice(-CONTEXT_WINDOW_SIZE)
    .map((m) => ({
      role:    m.role,
      content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
    }));

  window.push({ role: "user", content: newUserMessage });

  return window;
}


// ══════════════════════════════════════════════
// 9. 🛡️ فحص is_blocked مع Cache
// ✅ بدل الفحص في كل رسالة
// ══════════════════════════════════════════════

const _blockedCache = {
  userId:    null,
  isBlocked: false,
  checkedAt: 0,
};

/**
 * يتحقق إذا كان المستخدم محظور — مع cache لمدة 5 دقائق
 */
export async function checkIsBlocked(userId) {
  const now = Date.now();

  if (
    _blockedCache.userId === userId &&
    now - _blockedCache.checkedAt < BLOCKED_CHECK_CACHE_MS
  ) {
    return _blockedCache.isBlocked;
  }

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("is_blocked")
      .eq("id", userId)
      .single();

    const isBlocked = error ? false : (data?.is_blocked ?? false);

    _blockedCache.userId    = userId;
    _blockedCache.isBlocked = isBlocked;
    _blockedCache.checkedAt = now;

    return isBlocked;
  } catch {
    return false;
  }
}


// ══════════════════════════════════════════════
// 10. 📂 بناء بطاقة الملف
// ══════════════════════════════════════════════

export function buildFileContextCard(files) {
  if (!files || files.length === 0) return "";

  const cards = files.map((f) => {
    if (f.type === "application/pdf") {
      let tocBrief = "";
      const content = (f.content || "").trim();
      if (content && content.length > 50) {
        const brief = content.slice(0, 1500).replace(/\s+/g, " ").trim();
        tocBrief = `\n   [فهرس/مقتطف أولي: ${brief}...]`;
      }
      return `📄 "${f.name}" — ${f.pageCount || "?"} صفحة${tocBrief}`;
    }
    if (f.type === "text/ocr") {
      return `🖼️ "${f.name}" — صورة (تم استخراج نصها)`;
    }
    return `📎 "${f.name}"`;
  });

  return (
    `\n\n[ملفات مرفقة — ارجع إليها عند السؤال فقط]:\n` +
    cards.join("\n") +
    `\n[الملفات الكبيرة تُقرأ عند الطلب المحدد (صفحة/فصل).]`
  );
}


// ══════════════════════════════════════════════
// 11. 🔍 كشف نطاق الصفحات والأقسام
// ══════════════════════════════════════════════

export function isTocRequest(text) {
  if (!text) return false;
  const t = text.trim().toLowerCase();
  return [
    "الفهرس", "فهرس", "المحتويات", "محتويات",
    "المحتوى", "contents", "table of contents", "toc", "index",
  ].some((k) => t.includes(k));
}

export function detectPageRange(text) {
  if (!text) return null;

  const patterns = [
    /(?:من\s+)?(?:ال)?صفح(?:ة|ات|ه)\s*(\d{1,4})\s*(?:إلى|الى|-|–|—|حتى|لغاية)\s*(?:ال)?صفح(?:ة|ات|ه)?\s*(\d{1,4})/i,
    /(?:من\s+)?صفح(?:ة|ات)\s*(\d{1,4})\s*(?:إلى|الى|-|–|—|حتى)\s*(\d{1,4})/i,
    /(?:ال)?صفح(?:ة|ات|ه)\s*(\d{1,4})\s*[-–—]\s*(\d{1,4})/i,
    /(?:ال)?صفح(?:ة|ه)\s*(\d{1,4})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const start = parseInt(match[1], 10);
      const end   = match[2] ? parseInt(match[2], 10) : start;
      if (start > 0 && end >= start && end - start < 200) {
        return { startPage: start, endPage: end };
      }
    }
  }

  const hasPageContext = /لخص|اقرأ|ملخص|محتوى|read|summar/i.test(text);
  if (hasPageContext) {
    const rangePattern =
      /(?:من\s+)?(\d{1,4})\s*(?:إلى|الى|لـ|ل|-|–|—|حتى|لغاية)\s*(\d{1,4})/i;
    const match = text.match(rangePattern);
    if (match) {
      const start = parseInt(match[1], 10);
      const end   = parseInt(match[2], 10);
      if (start > 0 && end >= start && end - start < 200) {
        return { startPage: start, endPage: end };
      }
    }
  }

  return null;
}

export function detectSectionRequest(text) {
  if (!text) return null;
  const patterns = [
    /((?:ال)?فصل\s+(?:ال)?[^\s،.؟!]+)/i,
    /((?:ال)?باب\s+(?:ال)?[^\s،.؟!]+)/i,
    /((?:ال)?مبحث\s+(?:ال)?[^\s،.؟!]+)/i,
    /((?:ال)?مطلب\s+(?:ال)?[^\s،.؟!]+)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }
  return null;
}


// ══════════════════════════════════════════════
// 12. 🧠 نظام الذاكرة — Memory System
// ══════════════════════════════════════════════

/**
 * يجلب ذكريات المستخدم من Supabase
 */
export async function loadMemories(userId, category = null) {
  if (!userId) return [];

  try {
    let query = supabase
      .from("memories")
      .select("id, content, category, importance, created_at")
      .eq("user_id", userId)
      .gte("importance", MEMORY_MIN_IMPORTANCE)
      .order("importance",   { ascending: false })
      .order("last_used_at", { ascending: false })
      .limit(MEMORY_LOAD_LIMIT);

    if (category) query = query.eq("category", category);

    const { data, error } = await query;
    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}


/**
 * يستخرج الذكريات من رسالة المستخدم — كل MEMORY_EXTRACT_INTERVAL رسائل
 */
export async function extractAndSaveMemory(
  userId,
  userMessage,
  aiResponse,
  messageCount,
  session,
  chatId
) {
  if (messageCount % MEMORY_EXTRACT_INTERVAL !== 0) return;
  if (!userId || !session?.access_token || !chatId) return;

  const extractPrompt = `
أنت مساعد لاستخراج المعلومات المهمة من المحادثات.

التبادل:
---
المستخدم: ${userMessage.slice(0, 500)}
المساعد: ${aiResponse.slice(0, 300)}
---

هل يحتوي على معلومة مهمة تستحق الحفظ عن المستخدم؟
(اسمه، مجاله، مشروعه، تفضيلاته، مستواه التقني، ما يدرسه، ما يعمل عليه...)

إذا نعم:
{"should_save":true,"content":"جملة واحدة بالعربية","category":"${Object.values(MEMORY_CATEGORIES).join("|")}","importance":1-5}

إذا لا:
{"should_save":false}

أجب بـ JSON فقط.
`.trim();

  try {
    const res = await fetch(
      "https://yfglgxuhtidfksekgabk.supabase.co/functions/v1/hyper-responder",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:  `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          model:        GROQ_FAST_MODEL,
          max_tokens:   200,
          temperature:  0.1,
          systemPrompt: "أنت مساعد لاستخراج الذكريات. أجب بـ JSON فقط.",
          messages:     [{ role: "user", content: extractPrompt }],
        }),
      }
    );

    if (!res.ok) return;

    const data      = await res.json();
    const content   = data.choices?.[0]?.message?.content?.trim() || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return;

    const result = JSON.parse(jsonMatch[0]);
    if (!result.should_save || !result.content) return;

    await saveMemory(userId, {
      content:    result.content.slice(0, 500),
      category:   result.category  || MEMORY_CATEGORIES.GENERAL,
      importance: Math.min(5, Math.max(1, parseInt(result.importance) || 2)),
      chat_id:    chatId || null,
    });

  } catch (err) {
    console.warn("[Memory] فشل الاستخراج:", err.message);
  }
}


/**
 * يحفظ ذاكرة جديدة في Supabase مع تجنب التكرار
 */
export async function saveMemory(userId, memory) {
  if (!userId || !memory?.content) return;

  try {
    let existingQuery = supabase
      .from("memories")
      .select("id")
      .eq("user_id", userId)
      .ilike("content", `%${memory.content.slice(0, 30)}%`);

    // منع دمج ذاكرة محادثة في محادثة أخرى؛ حتى يحذف CASCADE
    // الذكريات التابعة للمحادثة الصحيحة فقط.
    existingQuery = memory.chat_id
      ? existingQuery.eq("chat_id", memory.chat_id)
      : existingQuery.is("chat_id", null);

    const { data: existing } = await existingQuery.limit(1);

    if (existing && existing.length > 0) {
      await supabase
        .from("memories")
        .update({ last_used_at: new Date().toISOString() })
        .eq("id", existing[0].id);
      return;
    }

    await supabase.from("memories").insert({
      user_id:      userId,
      content:      memory.content,
      category:     memory.category   || MEMORY_CATEGORIES.GENERAL,
      importance:   memory.importance || 2,
      chat_id:      memory.chat_id || null,
      created_at:   new Date().toISOString(),
      last_used_at: new Date().toISOString(),
    });

  } catch (err) {
    console.warn("[Memory] فشل الحفظ:", err.message);
  }
}


/**
 * يحذف ذاكرة معينة
 */
export async function deleteMemory(memoryId) {
  if (!memoryId) return;
  try {
    await supabase.from("memories").delete().eq("id", memoryId);
  } catch (err) {
    console.warn("[Memory] فشل الحذف:", err.message);
  }
}
