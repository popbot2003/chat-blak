// ============================================
// main.jsx — بلاك 🖤
// ✅ theme.css يُستورد أول — يمنع الـ flash
// ============================================

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./styles/theme.css";   // ← أول — المتغيرات والألوان
import "./App.css";            // ← ثاني — الـ classes

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
