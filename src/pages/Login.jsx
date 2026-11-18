// ============================================
// Login.jsx — بلاك 🖤
// ✅ CSS classes من tokens.css — صفر inline styles
// ============================================

import { useState } from "react";
import { supabase } from "../lib/supabase";
import { validateEmail, validatePassword } from "../utils/validators";

export default function Login({ onLogin, onSwitchToRegister, onSwitchToForgotPassword }) {
  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]               = useState("");
  const [loading, setLoading]           = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError("");

    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) { setError("❌ " + emailCheck.error); return; }

    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) { setError("❌ " + passwordCheck.error); return; }

    setLoading(true);

    try {
      // 1. تسجيل الدخول عبر Supabase Auth
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw new Error("البريد أو كلمة المرور غير صحيحة");

      // 2. جلب بيانات الـ profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.user.id)
        .single();

      if (profileError || !profile) throw new Error("حدث خطأ في جلب البيانات، تواصل مع الدعم");
      if (profile.is_blocked)       throw new Error("هذا الحساب محظور");

      // 3. تحديث last_seen و last_login_date
      const today = new Date().toISOString().slice(0, 10);
      await supabase
        .from("profiles")
        .update({ last_seen: new Date().toISOString(), last_login_date: today })
        .eq("id", profile.id);

      const updatedProfile = { ...profile, last_login_date: today };

      // 4. حفظ المستخدم محلياً والدخول
      localStorage.setItem("black-user", JSON.stringify(updatedProfile));
      onLogin(updatedProfile);

    } catch (err) {
      setError("❌ " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">

        {/* أيقونة + عنوان */}
        <span className="auth-card__icon">🖤</span>
        <h2 className="auth-card__title">بلاك</h2>
        <p className="auth-card__subtitle">سجّل دخولك وابدأ</p>

        {/* رسالة الخطأ */}
        {error && (
          <div className="auth-alert auth-alert--error">{error}</div>
        )}

        <form onSubmit={handleLogin}>

          {/* البريد الإلكتروني */}
          <input
            type="email"
            placeholder="البريد الإلكتروني"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="auth-input ltr"
            autoComplete="email"
            required
          />

          {/* كلمة المرور */}
          <div className="auth-input-wrap">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="كلمة المرور"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="auth-input ltr"
              autoComplete="current-password"
              required
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

          {/* زر الدخول */}
          <button
            type="submit"
            className="auth-btn-primary"
            disabled={loading}
          >
            {loading ? "جاري الدخول..." : "دخول 🖤"}
          </button>

        </form>

        {/* روابط إضافية */}
        <div className="auth-links">
          <button
            type="button"
            className="auth-btn-link"
            onClick={onSwitchToRegister}
          >
            مش عندك حساب؟ سجّل دلوقتي
          </button>
          <button
            type="button"
            className="auth-btn-link auth-btn-link--muted"
            onClick={onSwitchToForgotPassword}
          >
            نسيت كلمة المرور؟
          </button>
        </div>

      </div>
    </div>
  );
}
