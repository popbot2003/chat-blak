// ============================================
// Register.jsx — Supabase Auth (آمن ✅)
// ============================================

import { useState } from "react";
import { supabase } from '../lib/supabase';
import { validateEmail, validatePassword } from '../utils/validators';
import { DEFAULT_USER_DAILY_LIMIT } from '../config/constants';

export default function Register({ onRegister, onSwitchToLogin }) {
  const [name, setName]                         = useState("");
  const [email, setEmail]                       = useState("");
  const [password, setPassword]                 = useState("");
  const [confirmPassword, setConfirmPassword]   = useState("");
  const [gender, setGender]                     = useState("ولد");
  const [showPassword, setShowPassword]         = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError]                       = useState("");
  const [loading, setLoading]                   = useState(false);

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
          // ✅ إعادة التوجيه بعد تأكيد الإيميل
          emailRedirectTo: `${window.location.origin}`
        }
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

      // 2. إنشاء profile مرتبط بنفس الـ id من Auth
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({
          id:              data.user.id,
          email:           email,
          name:            displayName,
          gender:          gender,
          role:            "user",
          personality:     "blak",
          is_blocked:      false,
          daily_limit:     DEFAULT_USER_DAILY_LIMIT,
          used_today:      0,
          last_reset_date: today,
          last_seen:       new Date().toISOString(),
          created_at:      new Date().toISOString()
        });

      if (profileError) {
        // ✅ لا يمكن حذف Auth user من client-side، نعطي رسالة واضحة بدلاً من ذلك
        throw new Error("حدث خطأ في إنشاء الحساب، تواصل مع الدعم");
      }

      // 3. التحقق: هل Supabase يتطلب تأكيد الإيميل؟
      if (data.session) {
        // ✅ تسجيل دخول مباشر (email confirmation معطّل في Supabase)
        const newUser = {
          id:              data.user.id,
          email:           email,
          name:            displayName,
          role:            "user",
          gender:          gender,
          personality:     "blak",
          daily_limit:     DEFAULT_USER_DAILY_LIMIT,
          used_today:      0,
          last_reset_date: today,
          is_blocked:      false
        };
        localStorage.setItem("black-user", JSON.stringify(newUser));
        onRegister(newUser);
      } else {
        // ✅ Supabase أرسل بريد تأكيد — أخبر المستخدم
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

  const inputStyle = {
    width: "100%",
    padding: "14px",
    marginBottom: "15px",
    borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(255,255,255,0.05)",
    color: "#e0e0e0",
    fontSize: "16px",
    outline: "none",
    boxSizing: "border-box"
  };

  return (
    <div style={{
      height: "100dvh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#0f0f1a",
      fontFamily: "system-ui, sans-serif",
      overflowY: "auto"
    }}>
      <div style={{
        background: "#1a1a2e",
        padding: "40px",
        borderRadius: "20px",
        width: "100%",
        maxWidth: "400px",
        textAlign: "center",
        margin: "20px"
      }}>
        <div style={{ fontSize: "50px", marginBottom: "20px" }}>🖤</div>
        <h2 style={{ color: "#e0e0e0", marginBottom: "30px" }}>إنشاء حساب جديد</h2>

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

        <form onSubmit={handleRegister}>
          <input
            type="text"
            placeholder="الاسم (اختياري)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={inputStyle}
          />

          <input
            type="email"
            placeholder="البريد الإلكتروني"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ ...inputStyle, direction: "ltr" }}
            required
          />

          <div style={{ position: "relative", marginBottom: "15px" }}>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="كلمة المرور"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ ...inputStyle, marginBottom: 0, paddingLeft: "50px", direction: "ltr" }}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                fontSize: "20px",
                color: "#a29bfe"
              }}>
              {showPassword ? "🙈" : "👁️"}
            </button>
          </div>

          <div style={{ position: "relative", marginBottom: "20px" }}>
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="تأكيد كلمة المرور"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={{ ...inputStyle, marginBottom: 0, paddingLeft: "50px", direction: "ltr" }}
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                fontSize: "20px",
                color: "#a29bfe"
              }}>
              {showConfirmPassword ? "🙈" : "👁️"}
            </button>
          </div>

          {/* اختيار الجنس */}
          <div style={{ marginBottom: "20px" }}>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "13px", marginBottom: "10px" }}>أنت؟</p>
            <div style={{ display: "flex", gap: "10px" }}>
              {["ولد", "بنت"].map(g => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGender(g)}
                  style={{
                    flex: 1,
                    padding: "12px",
                    borderRadius: "12px",
                    border: gender === g ? "2px solid #8b5cf6" : "2px solid rgba(255,255,255,0.1)",
                    background: gender === g ? "rgba(139,92,246,0.2)" : "rgba(255,255,255,0.03)",
                    color: gender === g ? "#a29bfe" : "rgba(255,255,255,0.5)",
                    fontSize: "15px",
                    fontWeight: gender === g ? "bold" : "normal",
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                >
                  {g === "ولد" ? "👦 ولد" : "👧 بنت"}
                </button>
              ))}
            </div>
          </div>

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
            {loading ? "جاري الإنشاء..." : "إنشاء حساب"}
          </button>
        </form>

        <button
          onClick={onSwitchToLogin}
          style={{
            background: "transparent",
            border: "none",
            color: "#a29bfe",
            cursor: "pointer",
            fontSize: "14px"
          }}>
          عندك حساب بالفعل؟ سجل دخول
        </button>
      </div>
    </div>
  );
}
