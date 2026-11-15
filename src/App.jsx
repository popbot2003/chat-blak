// ============================================
// App.jsx — بلاك 🖤
// ✅ يستخدم LoadingScreen بدل inline loading
// ✅ صفر inline styles
// ============================================

import { useState, useEffect } from "react";
import ErrorBoundary   from "./components/ErrorBoundary";
import LoadingScreen   from "./components/LoadingScreen";
import Login           from "./pages/Login";
import Register        from "./pages/Register";
import ForgotPassword  from "./pages/ForgotPassword";
import ResetPassword   from "./pages/ResetPassword";
import Chat            from "./pages/Chat";
import Admin           from "./pages/Admin";
import { supabase }    from "./lib/supabase";

export default function App() {

  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("black-user");
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      if (!parsed.id || !parsed.email) {
        localStorage.removeItem("black-user");
        return null;
      }
      return parsed;
    } catch (error) {
      console.error("❌ خطأ في تحميل المستخدم:", error);
      localStorage.removeItem("black-user");
      return null;
    }
  });

  const [verifiedRole, setVerifiedRole]           = useState(null);
  const [roleChecked, setRoleChecked]             = useState(false);
  const [showRegister, setShowRegister]           = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // ── التحقق من الدور من قاعدة البيانات مباشرة ──
  useEffect(() => {
    if (!user) {
      setVerifiedRole(null);
      setRoleChecked(true);
      return;
    }

    async function verifyRole() {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("role, is_blocked")
          .eq("id", user.id)
          .single();

        if (error || !data) {
          localStorage.removeItem("black-user");
          setUser(null);
          setRoleChecked(true);
          return;
        }

        if (data.is_blocked) {
          localStorage.removeItem("black-user");
          setUser(null);
          setRoleChecked(true);
          return;
        }

        setVerifiedRole(data.role);

        // ✅ حدّث localStorage فقط — بدون setUser لتجنب إعادة إنشاء Chat
        const updated = { ...user, role: data.role };
        localStorage.setItem("black-user", JSON.stringify(updated));

      } catch (err) {
        console.error("❌ خطأ في التحقق من الدور:", err.message);
        setVerifiedRole(user.role || "user");
      } finally {
        setRoleChecked(true);
      }
    }

    verifyRole();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // ── كشف صفحة Reset Password ──
  const params = new URLSearchParams(window.location.search);
  const isResetPassword =
    window.location.pathname === "/reset-password" ||
    window.location.hash.includes("access_token") ||
    params.get("code") !== null ||
    params.get("token_hash") !== null;

  // ── Handlers ──
  function handleLogout() {
    try {
      localStorage.removeItem("black-user");
      supabase.auth.signOut();
    } catch (error) {
      console.error("❌ خطأ في تسجيل الخروج:", error);
    }
    setUser(null);
    setVerifiedRole(null);
    setRoleChecked(false);
    setShowRegister(false);
    setShowForgotPassword(false);
  }

  function handleResetPasswordComplete() {
    window.location.href = "/";
  }

  // ── Reset Password Page ──
  if (isResetPassword) {
    return (
      <ErrorBoundary>
        <ResetPassword onPasswordReset={handleResetPasswordComplete} />
      </ErrorBoundary>
    );
  }

  // ── Auth Pages ──
  if (!user) {
    if (showRegister) {
      return (
        <ErrorBoundary>
          <Register
            onRegister={(userData) => {
              setUser(userData);
              setShowRegister(false);
            }}
            onSwitchToLogin={() => setShowRegister(false)}
          />
        </ErrorBoundary>
      );
    }

    if (showForgotPassword) {
      return (
        <ErrorBoundary>
          <ForgotPassword
            onSwitchToLogin={() => {
              setShowForgotPassword(false);
              setShowRegister(false);
            }}
          />
        </ErrorBoundary>
      );
    }

    return (
      <ErrorBoundary>
        <Login
          onLogin={(userData) => {
            setUser(userData);
            setRoleChecked(false);
          }}
          onSwitchToRegister={() => setShowRegister(true)}
          onSwitchToForgotPassword={() => setShowForgotPassword(true)}
        />
      </ErrorBoundary>
    );
  }

  // ── Loading — انتظار التحقق من الدور ──
  if (!roleChecked) {
    return <LoadingScreen message="جاري التحقق..." />;
  }

  // ── Admin ──
  if (verifiedRole === "admin") {
    const isChatWindow = window.location.search === "?chat";
    if (isChatWindow) {
      return (
        <ErrorBoundary>
          <Chat user={user} onLogout={handleLogout} isAdmin={true} />
        </ErrorBoundary>
      );
    }
    return (
      <ErrorBoundary>
        <Admin user={user} onLogout={handleLogout} />
      </ErrorBoundary>
    );
  }

  // ── Chat ──
  return (
    <ErrorBoundary>
      <Chat user={user} onLogout={handleLogout} />
    </ErrorBoundary>
  );
}
