// ============================================
// main.jsx — بلاك 🖤
// ✅ tokens.css يُستورد أول — المتغيرات قبل كل شيء
// ============================================

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
// ── نظام التصميم (الترتيب مهم) ──
import "./styles/tokens.css";               // 1) المتغيرات: ألوان/مسافات/خطوط
import "./styles/base.css";                 // 2) reset + الحاوية الأساسية
import "./styles/shared.css";               // 3) أزرار/حقول/بطاقات مشتركة
import "./styles/chat/core.css";            // 4) الشات: هيدر/رسائل/مدخل
import "./styles/chat/sidebar.css";         //    القائمة الجانبية (الملف الوحيد لها)
import "./styles/chat/welcome-composer.css";//    الترحيب + الوضع الفاتح
import "./styles/chat/responsive.css";      //    التجاوب
import "./styles/auth.css";                 // 5) شاشات الدخول والتحميل
import "./styles/chat/responsive-final.css";
import "./styles/chat/layout.css";
import "./styles/settings/settings.css";    // 6) نافذة الإعدادات
import "./styles/admin/admin.css";          // 7) لوحة الأدمن

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
