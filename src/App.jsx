import { useState, useEffect } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Chat from "./pages/Chat";
import Admin from "./pages/Admin";

export default function App() {
  // تفعيل سحب للتحديث على الهواتف (Pull to Refresh)
  useEffect(() => {
    let touchStartY = 0;
    let isAtTop = true;

    const handleTouchStart = (e) => {
      touchStartY = e.touches[0].clientY;
      isAtTop = window.scrollY === 0;
    };

    const handleTouchMove = (e) => {
      const touchEndY = e.touches[0].clientY;
      const pullDistance = touchEndY - touchStartY;
      
      if (pullDistance > 70 && isAtTop && touchStartY < 50) {
        e.preventDefault();
        window.location.reload();
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  // تحميل المستخدم من localStorage عند بدء التطبيق
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
    // ✅ التحقق: إذا فتحنا النافذة بمعامل ?chat في الرابط، نعرض الشات بدلاً من لوحة التحكم
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
