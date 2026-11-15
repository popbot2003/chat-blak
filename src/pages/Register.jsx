// ============================================
// Register.jsx — بلاك 🖤
// ✅ CSS classes من theme.css — صفر inline styles
// ============================================

import { useState } from "react";
import { supabase } from "../lib/supabase";
import { validateEmail, validatePassword } from "../utils/validators";
import { DEFAULT_USER_DAILY_LIMIT } from "../config/constants";

export default function Register({ onRegister, onSwitchToLogin }) {
  const [name, setName]                               = useState("");
  const [email, setEmail]                             = useState("");
  const [password, setPassword]                       = useState("");
  const [confirmPassword, setConfirmPassword]         = useState("");
  const [gender, setGender]                           = useState("ولد");
  const [showPassword, setShowPassword]               = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError]                             = useState("");
  const [loading, setLoading]                         = useState(false);

  async function handleRegister(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (password !== confirmPassword) {
      setError("❌ كلمة المرور غير متطابقة");
      setLoading(false);
      return;
    }

    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) {
      setError("❌ " + passwordCheck.error);
      setLoading(false);
      return;
    }

    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) {
      setError("❌ " + emailCheck.error);
      setLoading(false);
      return;
    }

    try {
      const displayName = name.trim() || email.split("@")[0];
      const today       = new Date().toISOString().slice(0, 10);

      // 1. تسجيل عبر Supabase Auth
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name: displayName, gender },
          emailRedirectTo: `${window.location.origin}`,
        },
      });

      if (signUpError) {
        if (
          signUpError.message.includes("already registered") ||
          signUpError.message.includes("already been registered")
        ) {
          throw new Error("هذا البريد الإلكتروني مستخدم بالفعل");
        }
        throw signUpError;
      }

      if (!data.user) throw new Error("حدث خطأ أثناء التسجيل، حاول مرة أخرى");

      // 2. إنشاء profile
      const { error: profileError } = await supabase.from("profiles").insert({
        id:              data.user.id,
        email,
        name:            displayName,
        gender,
        role:            "user",
        personality:     "blak",
        is_blocked:      false,
        daily_limit:     DEFAULT_USER_DAILY_LIMIT,
        used_today:      0,
        last_reset_date: today,
        last_seen:       new Date().toISOString(),
        created_at:      new Date().toISOString(),
      });

      if (profileError) throw new Error("حدث خطأ في إنشاء الحساب، تواصل مع الدعم");

      // 3. دخول مباشر أو تأكيد إيميل
      if (data.session) {
        const newUser = {
          id:              data.user.id,
          email,
          name:            displayName,
          role:            "user",
          gender,
          personality:     "blak",
          daily_limit:     DEFAULT_USER_DAILY_LIMIT,
          used_today:      0,
          last_reset_date: today,
          is_blocked:      false,
        };
        localStorage.setItem("black-user", JSON.stringify(newUser));
        onRegister(newUser);
      } else {
        alert("✅ تم إنشاء حسابك! تحقق من بريدك الإلكتروني لتأكيد الحساب.");
        onSwitchToLogin();
      }

    } catch (err) {
      console.error("Registration error:", err);
      setError("❌ " + (err.message || "حدث خطأ غير متوقع"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: "420px" }}>

        {/* أيقونة + عنوان */}
        <span className="auth-card__icon">🖤</span>
        <h2 className="auth-card__title">إنشاء حساب جديد</h2>
        <p className="auth-card__subtitle">انضم لبلاك دلوقتي</p>

        {/* رسالة الخطأ */}
        {error && (
          <div className="auth-alert auth-alert--error">{error}</div>
        )}

        <form onSubmit={handleRegister}>

          {/* الاسم */}
          <input
            type="text"
            placeholder="الاسم (اختياري)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="auth-input"
            autoComplete="name"
          />

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
              autoComplete="new-password"
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

          {/* تأكيد كلمة المرور */}
          <div className="auth-input-wrap">
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="تأكيد كلمة المرور"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="auth-input ltr"
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              className="auth-eye-btn"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              tabIndex={-1}
            >
              {showConfirmPassword ? "🙈" : "👁️"}
            </button>
          </div>

          {/* اختيار الجنس */}
          <div className="auth-gender-group">
            <span className="auth-gender-label">أنت؟</span>
            <div className="auth-gender-options">
              {["ولد", "بنت"].map((g) => (
                <button
                  key={g}
                  type="button"
                  className={`auth-gender-btn${gender === g ? " active" : ""}`}
                  onClick={() => setGender(g)}
                >
                  {g === "ولد" ? "👦 ولد" : "👧 بنت"}
                </button>
              ))}
            </div>
          </div>

          {/* زر التسجيل */}
          <button
            type="submit"
            className="auth-btn-primary"
            disabled={loading}
          >
            {loading ? "جاري الإنشاء..." : "إنشاء حساب 🖤"}
          </button>

        </form>

        {/* رابط الدخول */}
        <div className="auth-links">
          <button
            type="button"
            className="auth-btn-link"
            onClick={onSwitchToLogin}
          >
            عندك حساب بالفعل؟ سجّل دخول
          </button>
        </div>

      </div>
    </div>
  );
}
