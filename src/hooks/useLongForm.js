// ============================================
// src/hooks/useLongForm.js
// كل منطق الوضع السريع (Long-Form):
// - وضع المخطط (Plan)
// - كتابة الأجزاء (Write Part)
// - استكمال الأجزاء
// ============================================

import { useState, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";
import { showToast, cleanResponse } from "../utils/chatHelpers";
import {
  getLongFormPlanPrompt,
  getLongFormWritePrompt,
} from "../config/prompts";
import { GROQ_MODEL, GROQ_MAX_TOKENS, GROQ_TEMPERATURE } from "../config/constants";

export function useLongForm({
  user,
  currentUser,
  messagesRef,
  setMessages,
  setLoading,
  setStreamingText,
  setInput,
  sortMessagesByTime,
}) {
  const [longFormContext, setLongFormContext] = useState(null);
  // { prompt, plan, parts: [], currentPart, partTitles: [] }

  const currentUserRef = useRef(currentUser);
  currentUserRef.current = currentUser;

  // ─────────────────────────────────────────
  // 1. وضع المخطط (Plan)
  // ─────────────────────────────────────────
  const handleLongFormRequest = useCallback(
    async (userPrompt) => {
      setInput("");
      setLoading(true);
      setStreamingText("");

      // إضافة رسالة المستخدم
      const userMsg = {
        role: "user",
        content: userPrompt,
        id: Date.now(),
      };
      setMessages((prev) => sortMessagesByTime([...prev, userMsg]));

      showToast("📋 جاري وضع مخطط المحتوى...", "info");

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          throw new Error("لا توجد جلسة نشطة");
        }

        const planPrompt = getLongFormPlanPrompt(userPrompt);

        const planRes = await fetch(
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
              systemPrompt:
                "أنت مخطط محترف. ضع مخططاً منظماً. لا تكتب محتوى، فقط عناوين الأجزاء.\n" +
                "⚠️ التزم بتفاصيل طلب المستخدم (عدد الأجزاء، الأسماء، الصور، التنسيق).",
              messages: [{ role: "user", content: planPrompt }],
            }),
          }
        );

        if (!planRes.ok) {
          const err = await planRes.json();
          throw new Error(err.error?.message || "فشل وضع المخطط");
        }

        const planData = await planRes.json();
        const planText =
          planData.choices?.[0]?.message?.content?.trim() || "";

        if (!planText) {
          throw new Error("المخطط فارغ");
        }

        // استخراج العناوين كأجزاء
        const parts = planText
          .split("\n")
          .map((line) => line.replace(/^\d+[\.\)]\s*/, "").trim())
          .filter((line) => line.length > 3);

        if (parts.length === 0) {
          throw new Error("لم أتمكن من استخراج أجزاء من المخطط");
        }

        setLongFormContext({
          prompt: userPrompt,
          plan: planText,
          parts: [],
          currentPart: 0,
          partTitles: parts,
        });

        setMessages((prev) =>
          sortMessagesByTime([
            ...prev,
            {
              role: "assistant",
              content:
                `📋 **المخطط (${parts.length} أجزاء):**\n\n${planText}\n\n` +
                `هل تريد أن أبدأ بالجزء الأول؟ اكتب "ابدأ".`,
              id: Date.now() + 1,
            },
          ])
        );

        showToast("✅ المخطط جاهز. اكتب 'ابدأ' للبدء.", "success");
      } catch (err) {
        console.error("[LongForm] خطأ في المخطط:", err);
        setMessages((prev) =>
          sortMessagesByTime([
            ...prev,
            {
              role: "assistant",
              content: "❌ خطأ في وضع المخطط: " + err.message,
              id: Date.now(),
            },
          ])
        );
        showToast("❌ فشل وضع المخطط", "error");
      } finally {
        setLoading(false);
        setStreamingText("");
      }
    },
    [setInput, setLoading, setStreamingText, setMessages, sortMessagesByTime]
  );

  // ─────────────────────────────────────────
  // 2. كتابة الجزء التالي (Write Part)
  // ─────────────────────────────────────────
  const writeNextPart = useCallback(async () => {
    if (!longFormContext) {
      showToast("⚠️ لا يوجد سياق. اكتب طلباً أولاً.", "error");
      return;
    }

    const { prompt, partTitles, parts, currentPart } = longFormContext;

    if (currentPart >= partTitles.length) {
      setMessages((prev) =>
        sortMessagesByTime([
          ...prev,
          {
            role: "assistant",
            content: "✅ اكتمل المحتوى بكل أجزائه. يمكنك نسخه الآن.",
            id: Date.now(),
          },
        ])
      );
      setLongFormContext(null);
      return;
    }

    const partTitle = partTitles[currentPart];

    setLoading(true);
    setStreamingText("");

    showToast(
      `✍️ جاري كتابة الجزء ${currentPart + 1}/${partTitles.length}: ${partTitle}...`,
      "info"
    );

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("لا توجد جلسة نشطة");
      }

      const previousPartsText =
        parts.length > 0
          ? `\n\nهذا ما كتبته في الأجزاء السابقة (حافظ على نفس الأسلوب والترابط):\n${parts.join(
              "\n\n"
            )}\n\n`
          : "";

      const systemPrompt = getLongFormWritePrompt(
        currentUserRef.current?.personality,
        currentUserRef.current?.gender,
        prompt,
        partTitles,
        previousPartsText,
        partTitle
      );

      const res = await fetch(
        "https://yfglgxuhtidfkskgabk.supabase.co/functions/v1/hyper-responder",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            model: GROQ_MODEL,
            max_tokens: GROQ_MAX_TOKENS,
            temperature: GROQ_TEMPERATURE,
            systemPrompt: systemPrompt,
            messages: [{ role: "user", content: partTitle }],
          }),
        }
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || "فشل كتابة الجزء");
      }

      const data = await res.json();
      const partContent = cleanResponse(
        data.choices?.[0]?.message?.content || ""
      );

      if (!partContent) {
        throw new Error("الجزء فارغ");
      }

      const updatedParts = [...parts, partContent];
      const nextPart = currentPart + 1;

      setLongFormContext({
        ...longFormContext,
        parts: updatedParts,
        currentPart: nextPart,
      });

      setMessages((prev) =>
        sortMessagesByTime([
          ...prev,
          {
            role: "assistant",
            content: `### ${partTitle}\n\n${partContent}`,
            id: Date.now(),
          },
        ])
      );

      if (nextPart >= partTitles.length) {
        setMessages((prev) =>
          sortMessagesByTime([
            ...prev,
            {
              role: "assistant",
              content: "✅ اكتمل المحتوى بكل أجزائه. يمكنك نسخه الآن.",
              id: Date.now() + 1,
            },
          ])
        );
        setLongFormContext(null);
        showToast("✅ اكتمل المحتوى!", "success");
      } else {
        showToast(
          `✅ تم الجزء ${nextPart}/${partTitles.length}. اكتب 'التالي' للمتابعة.`,
          "success"
        );
      }
    } catch (err) {
      console.error("[LongForm] خطأ في الجزء:", err);
      setMessages((prev) =>
        sortMessagesByTime([
          ...prev,
          {
            role: "assistant",
            content: "❌ خطأ في كتابة الجزء: " + err.message,
            id: Date.now(),
          },
        ])
      );
      showToast("❌ فشل كتابة الجزء", "error");
    } finally {
      setLoading(false);
      setStreamingText("");
    }
  }, [
    longFormContext,
    setLoading,
    setStreamingText,
    setMessages,
    sortMessagesByTime,
  ]);

  // ─────────────────────────────────────────
  // 3. إلغاء الوضع السريع
  // ─────────────────────────────────────────
  const cancelLongForm = useCallback(() => {
    setLongFormContext(null);
    setMessages((prev) =>
      sortMessagesByTime([
        ...prev,
        {
          role: "assistant",
          content: "🗑️ تم إلغاء الوضع السريع. يمكنك البدء من جديد.",
          id: Date.now(),
        },
      ])
    );
  }, [setMessages, sortMessagesByTime]);

  return {
    longFormContext,
    setLongFormContext,
    handleLongFormRequest,
    writeNextPart,
    cancelLongForm,
  };
}
