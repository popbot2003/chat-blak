import { useState } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Chat from "./pages/Chat";
import Admin from "./pages/Admin";

export default function App() {
  const [user, setUser] = useState(function() {
    try {
      const saved = localStorage.getItem("black-user");
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.error("❌ خطأ في تحميل المستخدم:", error);
      localStorage.removeItem("black-user");
      return null;
    }
  });
  
  const [showRegister, setShowRegister] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // دالة تسجيل الخروج الآمنة
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

  // لو مش مسجل
  if (!user) {
    if (showRegister) {
      return (
        <Register 
          onRegister={function(userData) { setUser(userData); }}
          onSwitchToLogin={function() { setShowRegister(false); }}
        />
      );
    }
    if (showForgotPassword) {
      return (
        <ForgotPassword 
          onSwitchToLogin={function() { 
            setShowForgotPassword(false); 
            setShowRegister(false); 
          }} 
        />
      );
    }
    return (
      <Login 
        onLogin={function(userData) { setUser(userData); }}
        onSwitchToRegister={function() { setShowRegister(true); }}
        onSwitchToForgotPassword={function() { setShowForgotPassword(true); }}
      />
    );
  }

  // Admin
  if (user && user.role === "admin") {
    return (
      <ErrorBoundary>
        <Admin user={user} onLogout={handleLogout} />
      </ErrorBoundary>
    );
  }

  // User عادي
  return (
    <ErrorBoundary>
      <Chat user={user} onLogout={handleLogout} />
    </ErrorBoundary>
  );
}
