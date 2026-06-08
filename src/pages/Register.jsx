import { useState } from "react";
import { supabase } from '../lib/supabase';

export default function Register({ onRegister, onSwitchToLogin }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (password !== confirmPassword) { setError("❌ كلمة المرور غير متطابقة"); setLoading(false); return; }
    if (password.length < 6) { setError("❌ كلمة المرور يجب أن تكون 6 أحرف على الأقل"); setLoading(false); return; }

    const { data: existingUser } = await supabase.from('profiles').select('*').eq('email', email).single();
    if (existingUser) { setError("❌ هذا البريد الإلكتروني مستخدم بالفعل"); setLoading(false); return; }

    const newUser = { id: 'user-' + Date.now(), email, password, name: name || 'مستخدم', role: 'user', is_blocked: false, created_at: new Date().toISOString(), last_seen: new Date().toISOString() };
    const { error: insertError } = await supabase.from('profiles').insert(newUser);
    if (insertError) { setError("❌ حدث خطأ أثناء إنشاء الحساب"); setLoading(false); return; }

    localStorage.setItem("black-user", JSON.stringify(newUser));
    onRegister(newUser);
  }

  return (
    <div style={{ height: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f0f1a", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ background: "#1a1a2e", padding: "40px", borderRadius: "20px", width: "100%", maxWidth: "400px", textAlign: "center" }}>
        <div style={{ fontSize: "50px", marginBottom: "20px" }}>🖤</div>
        <h2 style={{ color: "#e0e0e0", marginBottom: "30px" }}>إنشاء حساب جديد</h2>
        {error && <div style={{ background: "rgba(248,113,113,0.1)", color: "#f87171", padding: "12px", borderRadius: "10px", marginBottom: "20px", fontSize: "14px" }}>{error}</div>}
        <form onSubmit={handleRegister}>
          <input type="text" placeholder="الاسم (اختياري)" value={name} onChange={function(e) { setName(e.target.value); }} style={{ width: "100%", padding: "14px", marginBottom: "15px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#e0e0e0", fontSize: "16px", outline: "none" }} />
          <input type="email" placeholder="البريد الإلكتروني" value={email} onChange={function(e) { setEmail(e.target.value); }} style={{ width: "100%", padding: "14px", marginBottom: "15px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#e0e0e0", fontSize: "16px", outline: "none", direction: "ltr" }} required />
          <input type="password" placeholder="كلمة المرور" value={password} onChange={function(e) { setPassword(e.target.value); }} style={{ width: "100%", padding: "14px", marginBottom: "15px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#e0e0e0", fontSize: "16px", outline: "none", direction: "ltr" }} required />
          <input type="password" placeholder="تأكيد كلمة المرور" value={confirmPassword} onChange={function(e) { setConfirmPassword(e.target.value); }} style={{ width: "100%", padding: "14px", marginBottom: "20px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#e0e0e0", fontSize: "16px", outline: "none", direction: "ltr" }} required />
          <button type="submit" disabled={loading} style={{ width: "100%", padding: "14px", background: "linear-gradient(135deg, #6c5ce7, #8b5cf6)", color: "#fff", border: "none", borderRadius: "12px", fontSize: "16px", fontWeight: "bold", cursor: "pointer", opacity: loading ? 0.6 : 1, marginBottom: "15px" }}>{loading ? "جاري الإنشاء..." : "إنشاء حساب"}</button>
        </form>
        <button onClick={onSwitchToLogin} style={{ background: "transparent", border: "none", color: "#a29bfe", cursor: "pointer", fontSize: "14px" }}>عندك حساب بالفعل؟ سجل دخول</button>
      </div>
    </div>
  );
}
