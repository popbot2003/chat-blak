// ============================================
// ResetPassword.jsx
// صفحة إدخال كلمة المرور الجديدة
// ============================================

import { useState, useEffect } from "react";
import { supabase } from '../lib/supabase';

export default function ResetPassword({ onPasswordReset }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // التحقق من وجود hash في الرابط (من Supabase)
    const hash = window.location.hash;
    if (!hash || !hash.includes('access_token')) {
      setError("❌ رابط غير صالح أو منتهي الصلاحية");
    }
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
      // تحديث كلمة المرور في Supabase Auth
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

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
        <div style={{ fontSize: "50px", marginBottom: "20px" }}>🔑</div>
        <h2 style={{ color: "#e0e0e0", marginBottom: "10px" }}>كلمة مرور جديدة</h2>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px", marginBottom: "30px" }}>
          أدخل كلمة المرور الجديدة
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

        <form onSubmit={handleResetPassword}>
          <div style={{ position: "relative", marginBottom: "15px" }}>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="كلمة المرور الجديدة"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
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
              disabled={loading}
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

          <input
            type={showPassword ? "text" : "password"}
            placeholder="تأكيد كلمة المرور"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
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
              marginBottom: "20px"
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
              opacity: loading ? 0.6 : 1
            }}>
            {loading ? "جاري التغيير..." : "تغيير كلمة المرور"}
          </button>
        </form>
      </div>
    </div>
  );
}
