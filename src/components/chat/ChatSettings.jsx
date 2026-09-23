// ============================================
// ChatSettings.jsx
// مودال الإعدادات (اسم + كلمة مرور + حذف حساب)
// ============================================

import { useState } from "react";

export default function ChatSettings({
  user,
  onClose,
  onSave,
  onDeleteAccount,
}) {
  const [editName, setEditName] = useState(user?.name || "");
  const [editNewPassword, setEditNewPassword] = useState("");
  const [editConfirmPassword, setEditConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setError("");

    if (editNewPassword !== editConfirmPassword) {
      setError("❌ كلمة المرور الجديدة غير متطابقة");
      return;
    }
    if (editNewPassword && editNewPassword.length < 6) {
      setError("❌ كلمة المرور الجديدة قصيرة (6 أحرف على الأقل)");
      return;
    }

    const updates = {};
    if (editName && editName !== user?.name) updates.name = editName;

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
      onClose();
    } catch (err) {
      setError("❌ " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-modal">
      <div className="admin-modal-content" style={{ maxWidth: "400px" }}>
        <div className="admin-modal-head">
          <h3>⚙️ إعدادات المستخدم</h3>
          <button onClick={onClose} className="close-btn">
            ✕
          </button>
        </div>

        {error && (
          <div
            style={{
              background: "rgba(248,113,113,0.1)",
              color: "#f87171",
              padding: "10px",
              borderRadius: "8px",
              marginBottom: "15px",
              fontSize: "13px",
            }}
          >
            {error}
          </div>
        )}

        {/* البريد الإلكتروني (للقراءة فقط) */}
        <div style={{ marginBottom: "15px" }}>
          <label
            style={{
              fontSize: "12px",
              opacity: 0.7,
              display: "block",
              marginBottom: "5px",
            }}
          >
            📧 البريد الإلكتروني
          </label>
          <div
            style={{
              padding: "12px",
              background: "rgba(255,255,255,0.05)",
              borderRadius: "10px",
              fontSize: "14px",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#a29bfe",
            }}
          >
            {user?.email}
          </div>
          <div
            style={{
              fontSize: "10px",
              opacity: 0.5,
              marginTop: "4px",
            }}
          >
            لا يمكن تغيير البريد الإلكتروني
          </div>
        </div>

        {/* الاسم */}
        <div style={{ marginBottom: "15px" }}>
          <label
            style={{
              fontSize: "12px",
              opacity: 0.7,
              display: "block",
              marginBottom: "5px",
            }}
          >
            👤 الاسم
          </label>
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="الاسم"
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "10px",
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.05)",
              color: "#e0e0e0",
              fontSize: "14px",
              outline: "none",
            }}
          />
        </div>

        {/* كلمة المرور الجديدة */}
        <div
          style={{
            position: "relative",
            marginBottom: "15px",
          }}
        >
          <label
            style={{
              fontSize: "12px",
              opacity: 0.7,
              display: "block",
              marginBottom: "5px",
            }}
          >
            🔑 كلمة المرور الجديدة (اختياري)
          </label>
          <input
            type={showNewPassword ? "text" : "password"}
            value={editNewPassword}
            onChange={(e) => setEditNewPassword(e.target.value)}
            placeholder="********"
            style={{
              width: "100%",
              padding: "12px",
              paddingLeft: "45px",
              borderRadius: "10px",
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.05)",
              color: "#e0e0e0",
              fontSize: "14px",
              outline: "none",
            }}
          />
          <button
            type="button"
            onClick={() => setShowNewPassword(!showNewPassword)}
            style={{
              position: "absolute",
              left: "10px",
              bottom: "8px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontSize: "18px",
              color: "#a29bfe",
            }}
          >
            {showNewPassword ? "🙈" : "👁️"}
          </button>
        </div>

        {/* تأكيد كلمة المرور */}
        <div
          style={{
            position: "relative",
            marginBottom: "20px",
          }}
        >
          <label
            style={{
              fontSize: "12px",
              opacity: 0.7,
              display: "block",
              marginBottom: "5px",
            }}
          >
            ✓ تأكيد كلمة المرور الجديدة
          </label>
          <input
            type={showConfirmPassword ? "text" : "password"}
            value={editConfirmPassword}
            onChange={(e) => setEditConfirmPassword(e.target.value)}
            placeholder="********"
            style={{
              width: "100%",
              padding: "12px",
              paddingLeft: "45px",
              borderRadius: "10px",
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.05)",
              color: "#e0e0e0",
              fontSize: "14px",
              outline: "none",
            }}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            style={{
              position: "absolute",
              left: "10px",
              bottom: "8px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontSize: "18px",
              color: "#a29bfe",
            }}
          >
            {showConfirmPassword ? "🙈" : "👁️"}
          </button>
        </div>

        {/* الأزرار */}
        <div
          className="admin-modal-actions"
          style={{ gap: "10px", marginBottom: "15px" }}
        >
          <button
            onClick={handleSave}
            className="admin-modal-save-btn"
            disabled={loading}
          >
            {loading ? "جاري الحفظ..." : "💾 حفظ التغييرات"}
          </button>
          <button onClick={onClose} className="admin-modal-cancel-btn">
            إلغاء
          </button>
        </div>

        {/* حذف الحساب */}
        <button
          onClick={onDeleteAccount}
          disabled={loading}
          style={{
            width: "100%",
            padding: "12px",
            background: "rgba(248,113,113,0.15)",
            color: "#f87171",
            border: "1px solid rgba(248,113,113,0.3)",
            borderRadius: "10px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "bold",
            marginTop: "10px",
          }}
        >
          🗑️ حذف الحساب (نهائياً)
        </button>
      </div>
    </div>
  );
}
