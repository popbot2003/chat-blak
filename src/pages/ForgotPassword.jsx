// ============================================
// ForgotPassword.jsx
// صفحة إرسال رابط إعادة تعيين كلمة المرور
// ============================================

import { useState } from "react";
import { supabase } from '../lib/supabase';

export default function ForgotPassword({ onSwitchToLogin }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleForgotPassword(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email || !email.includes("@")) {
      setError("❌ أدخل بريد إلكتروني صالح");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setSuccess("✅ تم إرسال رابط إعادة التعيين! تحقق من بريدك الإلكتروني.");
    } catch (err) {
      setError("❌ " + (err.message || "حدث خطأ، حاول مرة أخرى"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      height: "100dvh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#0f0f1a",
      fontFamily: "system-ui, sans-serif"
    }}>
      <div style={{
        background: "#1a1a2e",
        padding: "40px",
        borderRadius: "20px",
        width: "100%",
        maxWidth: "400px",
        textAlign: "center"
      }}>
        <div style={{ fontSize: "50px", marginBottom: "20px" }}>🔐</div>
        <h2 style={{ color: "#e0e0e0", marginBottom: "10px" }}>نسيت كلمة المرور؟</h2>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px", marginBottom: "30px" }}>
          أدخل بريدك وسنرسل لك رابط إعادة التعيين
        </p>

        {error && (
          <div style={{
            background: "rgba(248,113,113,0.1)",
            color: "#f87171",
            padding: "12px",
            borderRadius: "10px",
            marginBottom: "20px",
            fontSize: "14px"
          }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{
            background: "rgba(74,222,128,0.1)",
            color: "#4ade80",
            padding: "12px",
            borderRadius: "10px",
            marginBottom: "20px",
            fontSize: "14px"
          }}>
            {success}
          </div>
        )}

        {!success && (
          <form onSubmit={handleForgotPassword}>
            <input
              type="email"
              placeholder="البريد الإلكتروني"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: "12px",
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.05)",
                color: "#e0e0e0",
                fontSize: "16px",
                outline: "none",
                direction: "ltr",
                marginBottom: "20px",
                boxSizing: "border-box"
              }}
              required
              disabled={loading}
            />

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "14px",
                background: "linear-gradient(135deg, #6c5ce7, #8b5cf6)",
                color: "#fff",
                border: "none",
                borderRadius: "12px",
                fontSize: "16px",
                fontWeight: "bold",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
                marginBottom: "15px"
              }}>
              {loading ? "جاري الإرسال..." : "إرسال رابط التعيين 🔑"}
            </button>
          </form>
        )}

        <button
          onClick={onSwitchToLogin}
          style={{
            background: "transparent",
            border: "none",
            color: "#a29bfe",
            cursor: "pointer",
            fontSize: "14px"
          }}>
          ← العودة لتسجيل الدخول
        </button>
      </div>
    </div>
  );
}
