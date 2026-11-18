// ============================================
// LoadingScreen.jsx — بلاك 🖤
// ✅ CSS classes من tokens.css — صفر inline styles
// ✅ يُستخدم في App.jsx بدل الـ inline loading
// ============================================

export default function LoadingScreen({ message = "جاري التحميل...", sub = "" }) {
  return (
    <div className="loading-screen">
      <div className="loading-screen__inner">

        {/* أيقونة بلاك */}
        <span className="loading-screen__icon">🖤</span>

        {/* Spinner */}
        <div className="loading-screen__spinner" />

        {/* نص */}
        <p className="loading-screen__text">{message}</p>

        {/* نص ثانوي اختياري */}
        {sub && (
          <p className="loading-screen__sub">{sub}</p>
        )}

      </div>
    </div>
  );
}
