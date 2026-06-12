import { useState } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Chat from "./pages/Chat";
import Admin from "./pages/Admin";

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

  const [showRegister, setShowRegister] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // ✅ يدعم hash و query params (code, token_hash)
  const params = new URLSearchParams(window.location.search);
  const isResetPassword =
    window.location.pathname === "/reset-password" ||
    window.location.hash.includes("access_token") ||
    params.get("code") !== null ||
    params.get("token_hash") !== null;

  function handleLogout() {
    try {
      localStorage.removeItem("black-user");
    } catch (error) {
      console.error("❌ خطأ في تسجيل الخروج:", error);
    }
    setUser(null);
    setShowRegister(false);
    setShowForgotPassword(false);
  }

  function handleResetPasswordComplete() {
    window.location.href = "/";
  }

  if (isResetPassword) {
    return (
      <ErrorBoundary>
        <ResetPassword onPasswordReset={handleResetPasswordComplete} />
      </ErrorBoundary>
    );
  }

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
          onLogin={(userData) => setUser(userData)}
          onSwitchToRegister={() => setShowRegister(true)}
          onSwitchToForgotPassword={() => setShowForgotPassword(true)}
        />
      </ErrorBoundary>
    );
  }

  if (user.role === "admin") {
    const isChatWindow = window.location.search === "?chat";
    if (isChatWindow) {
      return (
        <ErrorBoundary>
          <Chat user={user} onLogout={handleLogout} />
        </ErrorBoundary>
      );
    }
    return (
      <ErrorBoundary>
        <Admin user={user} onLogout={handleLogout} />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <Chat user={user} onLogout={handleLogout} />
    </ErrorBoundary>
  );
}
