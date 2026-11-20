// ============================================
// chatHelpers.js — بلاك 🖤
// ✅ DuckDuckGo بس لما يُطلب صراحة
// ✅ إزالة auto-summarize
// ✅ Sliding Window للـ context
// ✅ Cache لفحص is_blocked
// ✅ نظام الذاكرة انتقل إلى memoryHelpers.js
// ============================================

import { supabase } from "../lib/supabase";
import {
  CONTEXT_WINDOW_SIZE,
  BLOCKED_CHECK_CACHE_MS,
  SEARCH_TRIGGER_KEYWORDS,
} from "../config/constants";


// ══════════════════════════════════════════════
// 1. 🔍 DuckDuckGo — بس لما يُطلب صراحة
// ══════════════════════════════════════════════

export function needsWebSearch(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return SEARCH_TRIGGER_KEYWORDS.some((kw) => lower.includes(kw));
}

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
    error:   "#e53e3e",
    info:    "#3182ce",
    success: "#38a169",
    warning: "#d69e2e",
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
    font-size: 15px;
    font-family: var(--font-body, system-ui, sans-serif);
    pointer-events: none;
    box-shadow: 0 4px 16px rgba(0,0,0,0.25);
    white-space: nowrap;
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
// 8. 🪟 Sliding Window
// ══════════════════════════════════════════════

// ─── buildContextWindow ───────────────────────────────────────
// RECENT_FULL  = عدد الرسائل الأخيرة اللي بتتبعت كاملة
// لو المحادثة أطول من RECENT_FULL، الرسائل القديمة بتتلخص في
// جملة واحدة تتحط في أول message كـ system/user context.
// ده بيخلي الطلب ~2000-3000 token بدل 8000+.
// ──────────────────────────────────────────────────────────────
const RECENT_FULL = 6; // آخر 6 رسائل كاملة دايمًا

export function buildContextWindow(messages, newUserMessage, chatSummary = null) {
  const filtered = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role:    m.role,
      content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
    }));

  const recent  = filtered.slice(-RECENT_FULL);
  const older   = filtered.slice(0, -RECENT_FULL);

  const result = [];

  // ─── ملخص الرسائل القديمة ──────────────────────────────────
  if (older.length > 0 || chatSummary) {
    // نفضّل الملخص المحفوظ لو موجود، وإلا نبني ملخصًا بسيطًا
    let summaryText = chatSummary;
    if (!summaryText && older.length > 0) {
      // ملخص تلقائي خفيف: أول رسالة مستخدم + عدد التبادلات
      const firstUser = older.find((m) => m.role === "user");
      const turns = Math.floor(older.length / 2);
      summaryText =
        `ملخص بداية المحادثة (${turns} تبادل${turns > 1 ? " سابق" : ""}): ` +
        (firstUser ? firstUser.content.slice(0, 200) : "");
    }
    if (summaryText) {
      result.push({
        role:    "user",
        content: `[سياق المحادثة السابقة]: ${summaryText}`,
      });
      result.push({
        role:    "assistant",
        content: "فهمت. أكمل.",
      });
    }
  }

  result.push(...recent);
  result.push({ role: "user", content: newUserMessage });

  return result;
}


// ══════════════════════════════════════════════
// 9. 🛡️ فحص is_blocked مع Cache
// ══════════════════════════════════════════════

const _blockedCache = {
  userId:    null,
  isBlocked: false,
  checkedAt: 0,
};

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
// 🧠 نظام الذاكرة انتقل إلى memoryHelpers.js
// - loadMemoriesForPrompt
// - listMemories / saveMemory / deleteMemory
// - searchChatSummaries
// - detectExplicitMemoryRequest
// - extractMemoriesAndSummary
// - buildMemoryPromptBlock
// ══════════════════════════════════════════════
