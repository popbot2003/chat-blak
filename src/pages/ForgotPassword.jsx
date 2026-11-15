// ============================================
// ForgotPassword.jsx — بلاك 🖤
// ✅ CSS classes من theme.css — صفر inline styles
// ============================================

import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function ForgotPassword({ onSwitchToLogin }) {
  const [email, setEmail]     = useState("");
  const [error, setError]     = useState("");
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
    <div className="auth-page">
      <div className="auth-card">

        {/* أيقونة + عنوان */}
        <span className="auth-card__icon">🔐</span>
        <h2 className="auth-card__title">نسيت كلمة المرور؟</h2>
        <p className="auth-card__subtitle">
          أدخل بريدك وسنرسل لك رابط إعادة التعيين
        </p>

        {/* رسالة خطأ */}
        {error && (
          <div className="auth-alert auth-alert--error">{error}</div>
        )}

        {/* رسالة نجاح */}
        {success && (
          <div className="auth-alert auth-alert--success">{success}</div>
        )}

        {/* الفورم — يختفي بعد النجاح */}
        {!success && (
          <form onSubmit={handleForgotPassword}>

            <input
              type="email"
              placeholder="البريد الإلكتروني"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="auth-input ltr"
              autoComplete="email"
              required
              disabled={loading}
            />

            <button
              type="submit"
              className="auth-btn-primary"
              disabled={loading}
            >
              {loading ? "جاري الإرسال..." : "إرسال رابط التعيين 🔑"}
            </button>

          </form>
        )}

        {/* رابط العودة */}
        <div className="auth-links">
          <button
            type="button"
            className="auth-btn-link auth-btn-link--muted"
            onClick={onSwitchToLogin}
          >
            ← العودة لتسجيل الدخول
          </button>
        </div>

      </div>
    </div>
  );
}
