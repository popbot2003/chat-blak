// ============================================
// ChatSettings.jsx — صفحة إعدادات مستقلة 🖤
// ============================================

import { useState } from "react";

export default function ChatSettings({
  user,
  onClose,
  onSave,
  onDeleteAccount,
  theme,
  onToggleTheme,
}) {
  const [editName, setEditName] = useState(user?.name || "");
  const [editPersonality, setEditPersonality] = useState(user?.personality || "blak");
  const [editGender, setEditGender] = useState(user?.gender || "ولد");
  const [editNewPassword, setEditNewPassword] = useState("");
  const [editConfirmPassword, setEditConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("general"); // general, security, appearance

  async function handleSave() {
    setError("");

    if (editNewPassword && editNewPassword !== editConfirmPassword) {
      setError("❌ كلمة المرور الجديدة غير متطابقة");
      return;
    }
    if (editNewPassword && editNewPassword.length < 6) {
      setError("❌ كلمة المرور الجديدة قصيرة (6 أحرف على الأقل)");
      return;
    }

    const updates = {};
    if (editName && editName !== user?.name) updates.name = editName;
    if (editPersonality !== user?.personality) updates.personality = editPersonality;
    if (editGender !== user?.gender) updates.gender = editGender;

    if (!Object.keys(updates).length && !editNewPassword) {
      setError("❌ لا توجد تغييرات للحفظ");
      return;
    }

    setLoading(true);
    try {
      await onSave({
        profileUpdates: updates,
        newPassword: editNewPassword || null,
      });
      showToast("✅ تم حفظ الإعدادات بنجاح");
    } catch (err) {
      setError("❌ " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="chat-settings-page animate-fade-in" style={{
      position: "fixed",
      inset: 0,
      zIndex: 1000,
      background: theme === "dark" ? "#0f0f13" : "#f8f9fa",
      color: theme === "dark" ? "#f1f1f1" : "#1a1a1a",
      display: "flex",
      flexDirection: "column",
      overflowY: "auto",
      padding: "24px",
    }}>
      {/* رأس الصفحة مع زر العودة */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: "1px solid rgba(255,255,255,0.1)",
        paddingBottom: "16px",
        marginBottom: "24px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "none",
              color: "inherit",
              padding: "8px 16px",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            ← العودة للشات
          </button>
          <h2 style={{ fontSize: "20px", fontWeight: "bold" }}>⚙️ إعدادات المنصة</h2>
        </div>
        <button
          onClick={handleSave}
          disabled={loading}
          style={{
            background: "#6366f1",
            color: "#fff",
            border: "none",
            padding: "10px 20px",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          {loading ? "جاري الحفظ..." : "💾 حفظ التغييرات"}
        </button>
      </div>

      {error && (
        <div style={{
          background: "rgba(248,113,113,0.15)",
          color: "#f87171",
          padding: "12px 16px",
          borderRadius: "10px",
          marginBottom: "20px",
          border: "1px solid rgba(248,113,113,0.3)",
        }}>
          {error}
        </div>
      )}

      {/* تخطيط الإعدادات (قائمة جانبية ومحتوى) */}
      <div style={{ display: "grid", gridTemplateColumns: "250px 1fr", gap: "24px", maxWidth: "1000px", margin: "0 auto", width: "100%" }}>
        
        {/* القائمة الجانبية */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <button
            onClick={() => setActiveTab("general")}
            style={{
              padding: "12px 16px",
              textAlign: "right",
              background: activeTab === "general" ? "rgba(99, 102, 241, 0.15)" : "transparent",
              color: activeTab === "general" ? "#818cf8" : "inherit",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            👤 الملف الشخصي والشخصية
          </button>
          <button
            onClick={() => setActiveTab("security")}
            style={{
              padding: "12px 16px",
              textAlign: "right",
              background: activeTab === "security" ? "rgba(99, 102, 241, 0.15)" : "transparent",
              color: activeTab === "security" ? "#818cf8" : "inherit",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            🔒 الحساب والأمان
          </button>
        </div>

        {/* محتوى الإعدادات */}
        <div style={{ background: theme === "dark" ? "rgba(255,255,255,0.03)" : "#fff", padding: "24px", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.1)" }}>
          
          {activeTab === "general" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <h3>المعلومات العامة والشخصية</h3>
              
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "13px", opacity: 0.8 }}>البريد الإلكتروني (للقراءة فقط)</label>
                <input
                  type="text"
                  value={user?.email || ""}
                  disabled
                  style={{ width: "100%", padding: "12px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#888" }}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "13px", opacity: 0.8 }}>الاسم</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  style={{ width: "100%", padding: "12px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "inherit" }}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "13px", opacity: 0.8 }}>شخصية المساعد</label>
                <select
                  value={editPersonality}
                  onChange={(e) => setEditPersonality(e.target.value)}
                  style={{ width: "100%", padding: "12px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "inherit" }}
                >
                  <option value="blak">بلاك الأساسية 🖤</option>
                  <option value="friendly">ودود ومساعد</option>
                  <option value="professional">رسمي ومحترف</option>
                </select>
              </div>
            </div>
          )}

          {activeTab === "security" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <h3>الأمان وكلمة المرور</h3>

              <div>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "13px", opacity: 0.8 }}>كلمة المرور الجديدة</label>
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={editNewPassword}
                  onChange={(e) => setEditNewPassword(e.target.value)}
                  placeholder="********"
                  style={{ width: "100%", padding: "12px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "inherit" }}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "13px", opacity: 0.8 }}>تأكيد كلمة المرور الجديدة</label>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={editConfirmPassword}
                  onChange={(e) => setEditConfirmPassword(e.target.value)}
                  placeholder="********"
                  style={{ width: "100%", padding: "12px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "inherit" }}
                />
              </div>

              <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "20px", marginTop: "20px" }}>
                <h4 style={{ color: "#f87171", marginBottom: "10px" }}>منطقة الخطر</h4>
                <button
                  onClick={onDeleteAccount}
                  style={{
                    background: "rgba(248,113,113,0.15)",
                    color: "#f87171",
                    border: "1px solid rgba(248,113,113,0.3)",
                    padding: "12px 20px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontWeight: "bold",
                  }}
                >
                  🗑️ حذف الحساب نهائياً
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
