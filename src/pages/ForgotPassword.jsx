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
        <div style={{ fontSize: "50px", marginBottom: "20px" }}>🔐</div
