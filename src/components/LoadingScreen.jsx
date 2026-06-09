// ============================================
// LoadingScreen.jsx
// شاشة التحميل المؤقتة
// ============================================

export default function LoadingScreen() {
  return (
    <div style={{
      height: "100dvh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#0f0f1a",
      color: "#e0e0e0",
      fontFamily: "system-ui, sans-serif"
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "50px" }}>🖤</div>
        <div style={{ fontSize: "18px", marginTop: "10px" }}>جاري التحميل...</div>
      </div>
    </div>
  );
}
