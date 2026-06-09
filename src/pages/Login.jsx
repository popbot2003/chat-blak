// ============================================
// Login.jsx
// صفحة تسجيل الدخول مع طباعة أخطاء للتحقق
// ============================================

import { useState } from "react";
import { supabase } from '../lib/supabase';
import { validateEmail, validatePassword } from '../utils/validators';
import { isNewDay } from '../utils/helpers';

export default function Login({ onLogin, onSwitchToRegister, onSwitchToForgotPassword }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError("");

    // التحقق من صحة البريد
    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) {
      setError("❌ " + emailCheck.error);
      return;
    }

    // التحقق من صحة كلمة المرور
    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) {
      setError("❌ " + passwordCheck.error);
      return;
    }

    setLoading(true);

    try {
      console.log("🔍 محاولة تسجيل الدخول:", { email });

      // جلب بيانات المستخدم
      const { data: user, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .single();

      if (userError) {
        console.error("❌ خطأ في جلب المستخدم:", userError);
        throw new Error("البريد أو كلمة المرور غير صحيحة");
      }

      if (!user) {
        console.error("❌ المستخدم غير موجود:", email);
        throw new Error("البريد أو كلمة المرور غير صحيحة");
      }

      console.log("✅ المستخدم موجود:", { id: user.id, email: user.email, role: user.role });

      // التحقق من كلمة المرور
      if (user.password !== password) {
        console.error("❌ كلمة المرور غير متطابقة:", {
          stored: user.password,
          entered: password,
          storedLength: user.password?.length,
          enteredLength: password.length
        });
        throw new Error("البريد أو كلمة المرور غير صحيحة");
      }

      console.log("✅ كلمة المرور صحيحة");

      // التحقق من الحظر
      if (user.is_blocked) {
        console.error("❌ المستخدم محظور:", user.is_blocked);
        throw new Error("هذا الحساب محظور");
      }

      // إعادة ضبط الاستهلاك اليومي إذا تغير اليوم
      let updatedUser = { ...user };
      if (isNewDay(user.last_reset_date)) {
        console.log("🔄 إعادة ضبط الاستهلاك اليومي");
        const today = new Date().toISOString().slice(0, 10);
        const { error: resetError } = await supabase
          .from('profiles')
          .update({ 
            used_today: 0, 
            last_reset_date: today 
          })
          .eq('id', user.id);

        if (!resetError) {
          updatedUser.used_today = 0;
          updatedUser.last_reset_date = today;
        } else {
          console.error("❌ خطأ في إعادة الضبط:", resetError);
        }
      }

      // تحديث آخر ظهور
      await supabase
        .from('profiles')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', user.id);

      // حفظ المستخدم في localStorage
      localStorage.setItem("black-user", JSON.stringify(updatedUser));
      console.log("✅ تسجيل الدخول ناجح، سيتم التوجيه...");
      
      onLogin(updatedUser);

    } catch (err) {
      console.error("🔥 خطأ في handleLogin:", err);
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
          
          <input 
            type="password" 
            placeholder="كلمة المرور" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            style={{ 
              width: "100%", 
              padding: "14px", 
              marginBottom: "20px", 
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
