// ============================================
// src/utils/intentDetection.js
// كشف نية المستخدم + تنفيذ طلبات التلخيص الجزئي
// منقول من Chat.jsx لتسهيل الصيانة
// ============================================

import { supabase } from "../lib/supabase";
import { GROQ_MODEL, GROQ_FAST_MODEL } from "../config/constants";
import {
  SMART_INTENT_SYSTEM_PROMPT,
  SUMMARY_SYSTEM_PROMPT,
} from "../config/prompts";

// ─────────────────────────────────────────
// 1. كشف نية المستخدم (pages / section / toc / chat)
// ─────────────────────────────────────────
export async function smartDetectIntent(text, session) {
  if (!text || !session?.access_token) return null;

  try {
    const res = await fetch(
      "https://yfglgxuhtidfksekgabk.supabase.co/functions/v1/hyper-responder",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          model: GROQ_FAST_MODEL,
          max_tokens: 150,
          temperature: 0.1,
          systemPrompt: SMART_INTENT_SYSTEM_PROMPT,
          messages: [{ role: "user", content: text }],
        }),
      }
    );

    if (!res.ok) return null;
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content?.trim() || "";

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const intent = JSON.parse(jsonMatch[0]);

    if (intent.action === "pages") {
      const start = parseInt(intent.start, 10);
      const end = parseInt(intent.end, 10);
      if (start > 0 && end >= start && end - start < 200) {
        return { action: "pages", start, end };
      }
      return null;
    }

    if (intent.action === "section" && intent.title) {
      return { action: "section", title: String(intent.title).trim() };
    }

    if (intent.action === "toc") {
      return { action: "toc" };
    }

    if (intent.action === "chat") {
      return { action: "chat" };
    }

    return null;
  } catch (err) {
    console.warn("[SmartIntent] فشل:", err.message);
    return null;
  }
}

// ─────────────────────────────────────────
// 2. تنفيذ طلب تلخيص جزئي (يُعيد النص فقط، بدون عرض في المحادثة)
// يُستخدم في Map-Reduce لملفات PDF + الوضع السريع (Plan)
// ─────────────────────────────────────────
export async function executeRequestForSummary(text) {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return null;

    const res = await fetch(
      "https://yfglgxuhtidfksekgabk.supabase.co/functions/v1/hyper-responder",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          max_tokens: 800,
          temperature: 0.3,
          systemPrompt: SUMMARY_SYSTEM_PROMPT,
          messages: [{ role: "user", content: text }],
        }),
      }
    );

    if (!res.ok) {
      const err = await res.json();
      console.warn("[Summary] فشل:", err);
      return null;
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch (err) {
    console.warn("[Summary] خطأ:", err);
    return null;
  }
}
