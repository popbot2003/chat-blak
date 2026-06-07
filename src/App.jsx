import { useState } from "react";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Chat from "./pages/Chat";
import Admin from "./pages/Admin";

export default function App() {
  const [user, setUser] = useState(function() {
    const saved = localStorage.getItem("black-user");
    return saved ? JSON.parse(saved) : null;
  });
  const [showRegister, setShowRegister] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

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
  if (user.role === "admin") {
    return (
      <Admin 
        user={user} 
        onLogout={function() { 
          localStorage.removeItem("black-user"); 
          setUser(null); 
        }} 
      />
    );
  }

  // User
  return (
    <Chat 
      user={user} 
      onLogout={function() { 
        localStorage.removeItem("black-user"); 
        setUser(null); 
      }} 
    />
  );
}
