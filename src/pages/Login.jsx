// ============================================
// Login.jsx — Supabase Auth (آمن ✅)
// ============================================

import { useState } from "react";
import { supabase } from '../lib/supabase';
import { validateEmail, validatePassword } from '../utils/validators';

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
      // 1. تسجيل الدخول عبر Supabase Auth — الباسورد يتحقق منه Supabase
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
        maxWidth: "380px",
        textAlign: "center"
      }}>
        <div style={{ fontSize: "50px", marginBottom: "10px" }}>🖤</div>
        <h2 style={{ color: "#e0e0e0", marginBottom: "8px" }}>بلاك</h2>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "14px", marginBottom: "30px" }}>سجل دخولك</p>

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

        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="البريد الإلكتروني"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: "100%",
              padding: "14px",
              marginBottom: "15px",
              borderRadius: "12px",
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.05)",
              color: "#e0e0e0",
              fontSize: "16px",
              outline: "none",
              direction: "ltr",
              boxSizing: "border-box"
            }}
            required
          />

          <div style={{ position: "relative", marginBottom: "20px" }}>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="كلمة المرور"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                padding: "14px",
                paddingLeft: "50px",
                borderRadius: "12px",
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.05)",
                color: "#e0e0e0",
                fontSize: "16px",
                outline: "none",
                direction: "ltr",
                boxSizing: "border-box"
              }}
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
              marginBottom: "20px"
            }}>
            {loading ? "جاري الدخول..." : "دخول 🖤"}
          </button>
        </form>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <button
            onClick={onSwitchToRegister}
            style={{
              background: "transparent",
              border: "none",
              color: "#a29bfe",
              cursor: "pointer",
              fontSize: "14px"
            }}>
            مش عندك حساب؟ سجل دلوقتي
          </button>
          <button
            onClick={onSwitchToForgotPassword}
            style={{
              background: "transparent",
              border: "none",
              color: "rgba(255,255,255,0.3)",
              cursor: "pointer",
              fontSize: "13px"
            }}>
            نسيت كلمة المرور؟
          </button>
        </div>
      </div>
    </div>
  );
}
