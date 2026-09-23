// ============================================
// ChatWelcome.jsx
// رسالة الترحيب
// ============================================

import { useRef, useEffect } from "react";

export default function ChatWelcome({ messages }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: "auto" });
    }
  }, []);

  if (!messages || messages.length === 0) return null;

  const firstMessage = messages[0];
  if (!firstMessage || firstMessage.role !== "assistant") return null;

  return (
    <div ref={ref} style={{ display: "none" }} aria-hidden="true" />
  );
}
