
import React from "react";
import ReactDOM from "react-dom/client";

// ── نظام التصميم ──
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/shared.css";

// ── واجهة المحادثة ──
import "./styles/chat/core.css";
import "./styles/chat/sidebar.css";
import "./styles/chat/welcome-composer.css";
import "./styles/chat/layout.css";

// ── التجاوب: يأتي بعد قواعد التصميم ──
import "./styles/chat/responsive.css";
import "./styles/chat/responsive-final.css";

// ── بقية الواجهات ──
import "./styles/auth.css";
import "./styles/settings/settings.css";
import "./styles/admin/admin.css";

// ── التطبيق ──
import App from "./App.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
