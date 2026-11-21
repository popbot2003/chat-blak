// ============================================
// src/hooks/useTypewriter.js — BLACK 🖤
// تأثير الكتابة التدريجية للردود
// ============================================

import { useState, useEffect, useRef } from "react";

// سرعة الكتابة (ms بين كل دفعة)
const TICK_MS  = 18;
// عدد الحروف لكل دفعة (يزيد مع الوقت عشان ما تطولش المحادثات الطويلة)
const CHUNK_MIN = 2;
const CHUNK_MAX = 8;

export function useTypewriter(fullText, active = true) {
  const [displayed, setDisplayed]   = useState("");
  const [done, setDone]             = useState(false);
  const posRef  = useRef(0);
  const timerRef = useRef(null);
  const textRef = useRef(fullText);

  // لو النص اتغير (رد جديد) ابدأ من أول
  useEffect(() => {
    if (!active) {
      setDisplayed(fullText || "");
      setDone(true);
      return;
    }
    if (textRef.current !== fullText) {
      textRef.current = fullText;
      posRef.current  = 0;
      setDisplayed("");
      setDone(false);
    }
  }, [fullText, active]);

  useEffect(() => {
    if (!active || !fullText || done) return;

    function tick() {
      const len  = textRef.current.length;
      const pos  = posRef.current;
      if (pos >= len) {
        setDone(true);
        return;
      }
      // دفعة أكبر كلما طال الرد (يسرّع الظهور للردود الطويلة)
      const progress = pos / len;
      const chunk = Math.round(CHUNK_MIN + (CHUNK_MAX - CHUNK_MIN) * Math.min(progress * 3, 1));

      posRef.current = Math.min(pos + chunk, len);
      setDisplayed(textRef.current.slice(0, posRef.current));
      timerRef.current = setTimeout(tick, TICK_MS);
    }

    timerRef.current = setTimeout(tick, TICK_MS);
    return () => clearTimeout(timerRef.current);
  }, [fullText, active, done]);

  return { displayed: active ? displayed : fullText, done };
}
