// ============================================
// VerificationModal.jsx
// مودال إدخال كود التفعيل
// ============================================

import { useState } from "react";
import { supabase } from '../lib/supabase';

export default function VerificationModal({ email, userId, onVerified, onClose }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState("");

  async function handleVerify() {
    if (!code || code.length !== 6) {
      setError("❌ أدخل الكود المكون من 6 أرقام");
      return;
    }

    setLoading(true);
    setError("");

    const { data, error: verifyError } = await supabase
      .from('profiles')
      .select('verification_code, verification_code_expires')
      .eq('id', userId)
      .single();

    if (verifyError) {
      setError("❌ حدث خطأ، حاول مرة أخرى");
      setLoading(false);
      return;
    }

    if (data.verification_code !== code) {
      setError("❌ الكود غير صحيح");
      setLoading(false);
      return;
    }

    if (new Date(data.verification_code_expires) < new Date()) {
      setError("❌ انتهت صلاحية الكود، اضغط على إعادة إرسال");
      setLoading(false);
      return;
    }

    // تحديث حالة المستخدم إلى مؤكد
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ is_verified: true, verification_code: null, verification_code_expires: null })
      .eq('id', userId);

    if (updateError) {
      setError("❌ حدث خطأ في التفعيل");
    } else {
      onVerified();
    }
    setLoading(false);
  }

  async function handleResend() {
    setResendLoading(true);
    setError("");
    setResendSuccess("");

    // إنشاء كود جديد
    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        verification_code: newCode, 
        verification_code_expires: expiresAt 
      })
      .eq('id', userId);

    if (updateError) {
      setError("❌ حدث خطأ في إعادة الإرسال");
    } else {
      setResendSuccess("✅ تم إرسال الكود الجديد إلى بريدك");
      // TODO: إرسال الكود فعلياً إلى البريد الإلكتروني
      console.log("📧 كود التفعيل الجديد:", newCode);
    }
    setResendLoading(false);
  }

  return (
    <div className="admin-modal">
      <div className="admin-modal-content" style={{ maxWidth: "400px", textAlign: "center" }}>
        <div style={{ fontSize: "50px", marginBottom: "10px" }}>✉️</div>
        <h3 style={{ marginBottom: "10px" }}>تأكيد البريد الإلكتروني</h3>
        <p style={{ fontSize: "13px", opacity: 0.7, marginBottom: "20px" }}>
          تم إرسال كود التفعيل إلى:<br />
          <strong>{email}</strong>
        </p>

        {error && <div style={{ background: "rgba(248,113,113,0.1)", color: "#f87171", padding: "10px", borderRadius: "8px", marginBottom: "15px", fontSize: "13px" }}>{error}</div>}
        {resendSuccess && <div style={{ background: "rgba(74,222,128,0.1)", color: "#4ade80", padding: "10px", borderRadius: "8px", marginBottom: "15px", fontSize: "13px" }}>{resendSuccess}</div>}

        <input
          type="text"
          placeholder="_ _ _ _ _ _"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          style={{
            width: "100%",
            padding: "14px",
            fontSize: "24px",
            textAlign: "center",
            letterSpacing: "8px",
            borderRadius: "12px",
            border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.05)",
            color: "#e0e0e0",
            marginBottom: "20px",
            outline: "none"
          }}
        />

        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={handleVerify} disabled={loading} style={{ flex: 1, padding: "12px", background: "linear-gradient(135deg, #6c5ce7, #8b5cf6)", color: "#fff", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "bold" }}>
            {loading ? "جاري التحقق..." : "تأكيد"}
          </button>
          <button onClick={handleResend} disabled={resendLoading} style={{ flex: 1, padding: "12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", cursor: "pointer", color: "#e0e0e0" }}>
            {resendLoading ? "جاري..." : "إعادة إرسال"}
          </button>
        </div>
      </div>
    </div>
  );
}
