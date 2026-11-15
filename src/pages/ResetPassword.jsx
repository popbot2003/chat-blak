// ============================================
// ResetPassword.jsx — بلاك 🖤
// ✅ CSS classes من theme.css — صفر inline styles
// تدعم: ?code= و ?token_hash= و #access_token
// ============================================

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function ResetPassword({ onPasswordReset }) {
  const [newPassword, setNewPassword]       = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword]     = useState(false);
  const [error, setError]                   = useState("");
  const [success, setSuccess]               = useState("");
  const [loading, setLoading]               = useState(false);
  const [sessionReady, setSessionReady]     = useState(false);
  const [checking, setChecking]             = useState(true);

  useEffect(() => {
    async function initSession() {
      try {
        const hash     = window.location.hash;
        const params   = new URLSearchParams(window.location.search);
        const code      = params.get("code");
        const tokenHash = params.get("token_hash");

        // الحالة 1: code param (PKCE flow)
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) setError("❌ رابط غير صالح أو منتهي الصلاحية");
          else setSessionReady(true);
          return;
        }

        // الحالة 2: token_hash param
        if (tokenHash) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: "recovery",
          });
          if (error) setError("❌ رابط غير صالح أو منتهي الصلاحية");
          else setSessionReady(true);
          return;
        }

        // الحالة 3: hash fragment (#access_token)
        if (hash && hash.includes("access_token")) {
          setSessionReady(true);
          return;
        }

        setError("❌ رابط غير صالح أو منتهي الصلاحية");
      } finally {
        setChecking(false);
      }
    }

    initSession();
  }, []);

  async function handleResetPassword(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword.length < 6) {
      setError("❌ كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("❌ كلمة المرور غير متطابقة");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setSuccess("✅ تم تغيير كلمة المرور بنجاح!");
      setTimeout(() => {
        if (onPasswordReset) onPasswordReset();
      }, 2000);
    } catch (err) {
      setError("❌ " + (err.message || "حدث خطأ، حاول مرة أخرى"));
    } finally {
      setLoading(false);
    }
  }

  // شاشة التحقق من الرابط
  if (checking) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <span className="auth-card__icon">🔑</span>
          <h2 className="auth-card__title">جاري التحقق...</h2>
          <div className="loading-screen__spinner" style={{ margin: "20px auto 0" }} />
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">

        {/* أيقونة + عنوان */}
        <span className="auth-card__icon">🔑</span>
        <h2 className="auth-card__title">كلمة مرور جديدة</h2>
        <p className="auth-card__subtitle">أدخل كلمة المرور الجديدة</p>

        {/* رسالة خطأ */}
        {error && (
          <div className="auth-alert auth-alert--error">{error}</div>
        )}

        {/* رسالة نجاح */}
        {success && (
          <div className="auth-alert auth-alert--success">{success}</div>
        )}

        {/* الفورم — يظهر فقط لو الرابط صالح وما تم التغيير بعد */}
        {!error && !success && sessionReady && (
          <form onSubmit={handleResetPassword}>

            {/* كلمة المرور الجديدة */}
            <div className="auth-input-wrap">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="كلمة المرور الجديدة"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="auth-input ltr"
                autoComplete="new-password"
                required
                disabled={loading}
              />
              <button
                type="button"
                className="auth-eye-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>

            {/* تأكيد كلمة المرور */}
            <input
              type={showPassword ? "text" : "password"}
              placeholder="تأكيد كلمة المرور"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="auth-input ltr"
              autoComplete="new-password"
              required
              disabled={loading}
            />

            <button
              type="submit"
              className="auth-btn-primary"
              disabled={loading}
            >
              {loading ? "جاري التغيير..." : "تغيير كلمة المرور"}
            </button>

          </form>
        )}

      </div>
    </div>
  );
}
