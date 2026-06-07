import { useState } from "react";
import { supabase } from '../lib/supabase';

export default function Login({ onLogin, onSwitchToRegister, onSwitchToForgotPassword }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { data, error: loginError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('password', password)
      .single();

    if (loginError || !data) {
      setError("❌ البريد الإلكتروني أو كلمة المرور غير صحيحة");
      setLoading(false);
      return;
    }

    if (data.is_blocked) {
      setError("🚫 هذا الحساب محظور");
      setLoading(false);
      return;
    }

    await supabase.from('users').update({ last_seen: new Date().toISOString() }).eq('id', data.id);
    localStorage.setItem("black-user", JSON.stringify(data));
    onLogin(data);
  }

  return (
    <div style={{ height: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f0f1a", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ background: "#1a1a2e", padding: "40px", borderRadius: "20px", width: "100%", maxWidth: "400px", textAlign: "center" }}>
        <div style={{ fontSize: "50px", marginBottom: "20px" }}>🖤</div>
        <h2 style={{ color: "#e0e0e0", marginBottom: "30px" }}>تسجيل الدخول</h2>
        
        {error && <div style={{ background: "rgba(248,113,113,0.1)", color: "#f87171", padding: "12px", borderRadius: "10px", marginBottom: "20px", fontSize: "14px" }}>{error}</div>}

        <form onSubmit={handleLogin}>
          <input type="email" placeholder="البريد الإلكتروني" value={email} onChange={function(e) { setEmail(e.target.value); }}
            style={{ width: "100%", padding: "14px", marginBottom: "15px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#e0e0e0", fontSize: "16px", outline: "none", direction: "ltr" }} required />
          <input type="password" placeholder="كلمة المرور" value={password} onChange={function(e) { setPassword(e.target.value); }}
            style={{ width: "100%", padding: "14px", marginBottom: "20px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#e0e0e0", fontSize: "16px", outline: "none", direction: "ltr" }} required />
          <button type="submit" disabled={loading}
            style={{ width: "100%", padding: "14px", background: "linear-gradient(135deg, #6c5ce7, #8b5cf6)", color: "#fff", border: "none", borderRadius: "12px", fontSize: "16px", fontWeight: "bold", cursor: "pointer", opacity: loading ? 0.6 : 1, marginBottom: "15px" }}>
            {loading ? "جاري الدخول..." : "دخول"}
          </button>
        </form>

        <button onClick={onSwitchToForgotPassword} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: "13px", marginBottom: "10px", display: "block", width: "100%" }}>نسيت كلمة المرور؟</button>
        <button onClick={onSwitchToRegister} style={{ background: "transparent", border: "none", color: "#a29bfe", cursor: "pointer", fontSize: "14px" }}>ليس لديك حساب؟ إنشاء حساب جديد</button>
      </div>
    </div>
  );
}
