import { useState } from "react";
import { supabase } from '../lib/supabase';

export default function ForgotPassword({ onSwitchToLogin }) {
  const [email, setEmail] = useState("");
  const [step, setStep] = useState(1);
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetCode, setResetCode] = useState("");

  async function sendResetCode(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { data: user, error: userError } = await supabase.from('users').select('*').eq('email', email).single();
    if (userError || !user) { setError("❌ هذا البريد غير مسجل"); setLoading(false); return; }
    const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
    await supabase.from('users').update({ reset_code: generatedCode, reset_code_expires: new Date(Date.now() + 15 * 60 * 1000).toISOString() }).eq('id', user.id);
    setResetCode(generatedCode);
    setStep(2);
    setLoading(false);
    setSuccess("✅ تم إرسال كود التحقق");
  }

  async function verifyCode(e) {
    e.preventDefault();
    setLoading(true);
    const { data: user } = await supabase.from('users').select('*').eq('email', email).eq('reset_code', code).single();
    if (!user) { setError("❌ الكود غير صحيح"); setLoading(false); return; }
    if (new Date(user.reset_code_expires) < new Date()) { setError("❌ انتهت صلاحية الكود"); setLoading(false); return; }
    setStep(3);
    setLoading(false);
  }

  async function resetPassword(e) {
    e.preventDefault();
    if (newPassword.length < 6) { setError("❌ كلمة المرور 6 أحرف على الأقل"); return; }
    setLoading(true);
    await supabase.from('users').update({ password: newPassword, reset_code: null, reset_code_expires: null }).eq('email', email);
    setSuccess("✅ تم تغيير كلمة المرور!");
    setLoading(false);
    setTimeout(function() { onSwitchToLogin(); }, 3000);
  }

  return (
    <div style={{ height: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f0f1a", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ background: "#1a1a2e", padding: "40px", borderRadius: "20px", width: "100%", maxWidth: "400px", textAlign: "center" }}>
        <div style={{ fontSize: "50px", marginBottom: "20px" }}>🔐</div>
        <h2 style={{ color: "#e0e0e0", marginBottom: "10px" }}>{step === 1 ? "استعادة كلمة المرور" : step === 2 ? "كود التحقق" : "كلمة مرور جديدة"}</h2>
        {error && <div style={{ background: "rgba(248,113,113,0.1)", color: "#f87171", padding: "12px", borderRadius: "10px", marginBottom: "20px", fontSize: "14px" }}>{error}</div>}
        {success && <div style={{ background: "rgba(74,222,128,0.1)", color: "#4ade80", padding: "12px", borderRadius: "10px", marginBottom: "20px", fontSize: "14px" }}>{success}</div>}
        {resetCode && step === 2 && <div style={{ background: "rgba(108,92,231,0.2)", color: "#a29bfe", padding: "15px", borderRadius: "10px", marginBottom: "20px", fontSize: "24px", fontWeight: "bold", letterSpacing: "8px" }}>{resetCode}</div>}

        {step === 1 && (
          <form onSubmit={sendResetCode}>
            <input type="email" placeholder="البريد الإلكتروني" value={email} onChange={function(e) { setEmail(e.target.value); }} style={{ width: "100%", padding: "14px", marginBottom: "20px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#e0e0e0", fontSize: "16px", outline: "none", direction: "ltr" }} required />
            <button type="submit" disabled={loading} style={{ width: "100%", padding: "14px", background: "linear-gradient(135deg, #6c5ce7, #8b5cf6)", color: "#fff", border: "none", borderRadius: "12px", fontSize: "16px", fontWeight: "bold", cursor: "pointer", opacity: loading ? 0.6 : 1, marginBottom: "15px" }}>{loading ? "جاري..." : "إرسال الكود"}</button>
            <button type="button" onClick={onSwitchToLogin} style={{ background: "transparent", border: "none", color: "#a29bfe", cursor: "pointer", fontSize: "14px" }}>← العودة</button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={verifyCode}>
            <input type="text" placeholder="الكود" value={code} onChange={function(e) { setCode(e.target.value); }} maxLength={6} style={{ width: "100%", padding: "14px", marginBottom: "20px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#e0e0e0", fontSize: "20px", textAlign: "center", letterSpacing: "8px", outline: "none" }} required />
            <button type="submit" disabled={loading} style={{ width: "100%", padding: "14px", background: "linear-gradient(135deg, #6c5ce7, #8b5cf6)", color: "#fff", border: "none", borderRadius: "12px", fontSize: "16px", fontWeight: "bold", cursor: "pointer", opacity: loading ? 0.6 : 1, marginBottom: "10px" }}>تحقق</button>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={resetPassword}>
            <input type="password" placeholder="كلمة مرور جديدة" value={newPassword} onChange={function(e) { setNewPassword(e.target.value); }} style={{ width: "100%", padding: "14px", marginBottom: "20px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#e0e0e0", fontSize: "16px", outline: "none", direction: "ltr" }} required />
            <button type="submit" disabled={loading} style={{ width: "100%", padding: "14px", background: "linear-gradient(135deg, #6c5ce7, #8b5cf6)", color: "#fff", border: "none", borderRadius: "12px", fontSize: "16px", fontWeight: "bold", cursor: "pointer", opacity: loading ? 0.6 : 1 }}>تغيير كلمة المرور</button>
          </form>
        )}
      </div>
    </div>
  );
}
