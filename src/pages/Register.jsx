// ============================================
// Register.jsx - نسخة مبسطة (تجاوز التأكيد)
// ============================================

import { useState } from "react";
import { supabase } from '../lib/supabase';
import { validateEmail, validatePassword } from '../utils/validators';
import { DEFAULT_USER_DAILY_LIMIT } from '../config/constants';

export default function Register({ onRegister, onSwitchToLogin }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

    // التحقق من وجود المستخدم
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('email')
      .eq('email', email)
      .single();
      
    if (existingUser) {
      setError("❌ هذا البريد الإلكتروني مستخدم بالفعل");
      setLoading(false);
      return;
    }

    // ✅ إنشاء مستخدم جديد (مع is_verified = true مباشرة)
    const newUser = {
      id: 'user-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6),
      email,
      password,
      name: name.trim() || email.split('@')[0],
      role: 'user',
      is_blocked: false,
      is_verified: true,  // ✅ مؤكد تلقائياً - بدون الحاجة لكود
      daily_limit: DEFAULT_USER_DAILY_LIMIT,
      used_today: 0,
      last_reset_date: new Date().toISOString().slice(0, 10),
      created_at: new Date().toISOString(),
      last_seen: new Date().toISOString(),
      last_login_date: new Date().toISOString().slice(0, 10)
    };

    const { error: insertError } = await supabase
      .from('profiles')
      .insert(newUser);
      
    if (insertError) {
      console.error("❌ خطأ في الإدراج:", insertError);
      setError("❌ حدث خطأ أثناء إنشاء الحساب");
      setLoading(false);
      return;
    }

    // حفظ المستخدم وتسجيل الدخول مباشرة
    localStorage.setItem("black-user", JSON.stringify(newUser));
    onRegister(newUser);
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
            style={{ 
              width: "100%", 
              padding: "14px", 
              marginBottom: "15px", 
              borderRadius: "12px", 
              border: "1px solid rgba(255,255,255,0.1)", 
              background: "rgba(255,255,255,0.05)", 
              color: "#e0e0e0", 
              fontSize: "16px", 
              outline: "none" 
            }} 
          />
          
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
          
          {/* حقل كلمة المرور مع زر العين */}
          <div style={{ position: "relative", marginBottom: "15px" }}>
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
          
          {/* حقل تأكيد كلمة المرور مع زر العين */}
          <div style={{ position: "relative", marginBottom: "20px" }}>
            <input 
              type={showConfirmPassword ? "text" : "password"} 
              placeholder="تأكيد كلمة المرور" 
              value={confirmPassword} 
              onChange={(e) => setConfirmPassword(e.target.value)} 
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
                padding: "8px",
                color: "#a29bfe"
              }}
            >
              {showConfirmPassword ? "🙈" : "👁️"}
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
