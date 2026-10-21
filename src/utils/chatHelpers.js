// ============================================
// src/utils/chatHelpers.js
// كل الدوال المساعدة المستخدمة في Chat.jsx
// منقولة هنا لتسهيل الصيانة والتفكيك
// ============================================

// ─────────────────────────────────────────
// 1. البحث في DuckDuckGo
// ─────────────────────────────────────────
export async function searchDuckDuckGo(query) {
  try {
    const res = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&kl=ar-ar&t=h_`
    );
    const data = await res.json();
    const results = [];
    if (data.Abstract) results.push(data.Abstract);
    if (data.Answer) results.unshift(data.Answer);
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

// ─────────────────────────────────────────
// 2. تنظيف الرد من وسوم <think>
// ─────────────────────────────────────────
export function cleanResponse(text) {
  if (!text) return "";
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/[ \t]+/g, " ")
    .trim();
}

// ─────────────────────────────────────────
// 3. قراءة ملف نصي
// ─────────────────────────────────────────
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

// ─────────────────────────────────────────
// 4. أيقونة الملف حسب نوعه
// ─────────────────────────────────────────
export function getFileIcon(file) {
  if (file.type.startsWith("image/")) return "🖼️";
  if (file.type === "application/pdf") return "📄";
  if (
    file.type.includes("javascript") ||
    file.name.endsWith(".js") ||
    file.name.endsWith(".jsx")
  )
    return "💛";
  if (file.type.includes("python") || file.name.endsWith(".py")) return "🐍";
  if (file.type.includes("html") || file.name.endsWith(".html")) return "🌐";
  if (file.type.includes("css") || file.name.endsWith(".css")) return "🎨";
  if (file.name.endsWith(".json")) return "📋";
  if (file.name.endsWith(".csv")) return "📊";
  if (file.name.endsWith(".md")) return "📝";
  return "📎";
}

// ─────────────────────────────────────────
// 5. عرض رسالة Toast
// ─────────────────────────────────────────
export function showToast(message, type = "success") {
  const colors = { error: "#ef4444", info: "#3b82f6", success: "#10b981" };
  const div = document.createElement("div");
  div.style.cssText = `
    position:fixed;bottom:20px;left:50%;transform:translateX(-50%);
    background:${colors[type] ?? colors.success};color:#fff;
    padding:8px 16px;border-radius:10px;z-index:9999;
    font-size:14px;pointer-events:none;
  `;
  div.textContent = message;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 3000);
}

// ─────────────────────────────────────────
// 6. استخراج وقت الرسالة (للترتيب)
// ─────────────────────────────────────────
export function getMessageTimestamp(msg) {
  if (msg.task?.created_at) {
    return new Date(msg.task.created_at).getTime();
  }
  if (typeof msg.id === "number") return msg.id;
  if (typeof msg.id === "string" && !isNaN(Number(msg.id))) {
    return Number(msg.id);
  }
  return 0;
}

// ─────────────────────────────────────────
// 7. ترتيب الرسائل حسب الوقت
// ─────────────────────────────────────────
export function sortMessagesByTime(msgs) {
  return [...msgs].sort((a, b) => {
    return getMessageTimestamp(a) - getMessageTimestamp(b);
  });
}

// ─────────────────────────────────────────
// 8. دمج رسائل جديدة مع الموجودة (بدون تكرار)
// ─────────────────────────────────────────
export function mergeMessages(existing, newMsgs) {
  const seen = new Set();
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

// ─────────────────────────────────────────
// 9. كشف طلب الفهرس
// ─────────────────────────────────────────
export function isTocRequest(text) {
  if (!text) return false;
  const t = text.trim().toLowerCase();
  const keys = [
    "الفهرس",
    "فهرس",
    "المحتويات",
    "محتويات",
    "المحتوى",
    "contents",
    "table of contents",
    "toc",
    "index",
  ];
  return keys.some((k) => t.includes(k));
}

// ─────────────────────────────────────────
// 10. كشف نطاق الصفحات
// ─────────────────────────────────────────
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
      const end = match[2] ? parseInt(match[2], 10) : start;
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
      const end = parseInt(match[2], 10);
      if (start > 0 && end >= start && end - start < 200) {
        return { startPage: start, endPage: end };
      }
    }
  }

  return null;
}

// ─────────────────────────────────────────
// 11. كشف طلب الفصل/الباب/المبحث
// ─────────────────────────────────────────
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
    if (match) {
      return match[1].trim();
    }
  }

  return null;
}

// ─────────────────────────────────────────
// 12. بناء بطاقة الملف (تُرسل مع كل طلب)
// ─────────────────────────────────────────
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
      return `🖼️ "${f.name}" — صورة (تم استخراج نصها، اطلب التفاصيل عند الحاجة)`;
    }
    return `📎 "${f.name}"`;
  });

  return (
    `\n\n[ملفات مرفقة بهذه المحادثة — لا تُعد إرسالها كاملة، فقط ارجع إليها عند السؤال]:\n` +
    cards.join("\n") +
    `\n[ملاحظة: الملفات الكبيرة تُقرأ عند الطلب. إذا سألك المستخدم عن جزء محدد (صفحة/فصل)، استخدم الآلية المتاحة.]`
  );
}
