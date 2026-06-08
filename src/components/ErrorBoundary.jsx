import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("🔥 خطأ في التطبيق:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          height: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "16px",
          padding: "20px",
          textAlign: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#0f0f1a",
          color: "#e0e0e0"
        }}>
          <div style={{ fontSize: "60px" }}>😵</div>
          <h2>حصل خطأ غير متوقع</h2>
          <p style={{ opacity: 0.7, fontSize: "14px", maxWidth: "400px" }}>
            {this.state.error?.message || "جرب تعمل Refresh للصفحة"}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: "linear-gradient(135deg, #6c5ce7, #8b5cf6)",
              border: "none",
              color: "#fff",
              padding: "12px 32px",
              borderRadius: "12px",
              fontSize: "16px",
              cursor: "pointer",
              fontFamily: "inherit"
            }}
          >
            🔄 تحديث الصفحة
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
