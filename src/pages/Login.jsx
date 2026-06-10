// ============================================
// Login.jsx
// صفحة تسجيل الدخول مع التحقق من تأكيد البريد
// ============================================

import { useState } from "react";
import { supabase } from '../lib/supabase';
import { validateEmail, validatePassword } from '../utils/validators';
import { isNewDay } from '../utils/helpers';

export default function Login({ onLogin, onSwitchToRegister, onSwitchToForgotPassword }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError("");

    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) {
      setError("❌ " + emailCheck.error);
      return;
    }

    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) {
      setError("❌ " + passwordCheck.error);
      return;
    }

    setLoading(true);

    try {
      const { data: user, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .single();

      if (userError || !user) {
        throw new Error("البريد أو كلمة المرور غير صحيحة");
      }

      if (user.password !== password) {
        throw new Error("البريد أو كلمة المرور غير صحيحة");
      }

      if (!user.is_verified) {
        throw new Error("❌ لم يتم تأكيد البريد الإلكتروني. تحقق من بريدك.");
      }

      if (user.is_blocked) {
        throw new Error("هذا الحساب محظور");
      }

      const today = new Date().toISOString().slice(0, 10);
      let updatedUser = { ...user };

      // تحضير التحديثات — دايماً نحدث last_seen و last_login_date
      const profileUpdates = {
        last_seen: new Date().toISOString(),
        last_login_date: today
      };

      // reset الاستهلاك بس لو يوم جديد فعلاً
      if (isNewDay(user.last_reset_date)) {
        profileUpdates.used_today = 0;
        profileUpdates.last_reset_date = today;
        updatedUser.used_today = 0;
        updatedUser.last_reset_date = today;
      }

      await supabase
        .from('profiles')
        .update(profileUpdates)
        .eq('id', user.id);

      updatedUser.last_login_date = today;

      localStorage.setItem("black-user", JSON.stringify(updatedUser));
      onLogin(updatedUser);

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
        maxWidth: "400px", 
        textAlign: "center" 
      }}>
        <div style={{ fontSize: "50px", marginBottom: "20px" }}>🖤</div>
        <h2 style={{ color: "#e0e0e0", marginBottom: "30px" }}>تسجيل الدخول</h2>

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
              direction: "ltr" 
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
                direction: "ltr" 
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
                padding: "8px",
                color: "#a29bfe"
              }}
            >
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
              cursor: "pointer", 
              opacity: loading ? 0.6 : 1, 
              marginBottom: "15px" 
            }}>
            {loading ? "جاري الدخول..." : "دخول"}
          </button>
        </form>

        <button 
          onClick={onSwitchToForgotPassword} 
          style={{ 
            background: "transparent", 
            border: "none", 
            color: "rgba(255,255,255,0.4)", 
            cursor: "pointer", 
            fontSize: "13px", 
            marginBottom: "10px", 
            display: "block", 
            width: "100%" 
          }}>
          نسيت كلمة المرور؟
        </button>
        
        <button 
          onClick={onSwitchToRegister} 
          style={{ 
            background: "transparent", 
            border: "none", 
            color: "#a29bfe", 
            cursor: "pointer", 
            fontSize: "14px" 
          }}>
          ليس لديك حساب؟ إنشاء حساب جديد
        </button>
      </div>
    </div>
  );
}
