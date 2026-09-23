// ============================================
// ChatInput.jsx
// منطقة الإدخال + رفع الملفات + إرسال (رد/مهمة)
// ============================================

import { useRef } from "react";

export default function ChatInput({
  input,
  setInput,
  loading,
  streamingText,
  attachedFiles,
  sendMode = "chat",
  onSend,
  onStop,
  onFileUpload,
  onRemoveFile,
  onToggleMode,
}) {
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  }

  const canSend = input.trim() || attachedFiles.length > 0;
  const isDisabled = loading && !streamingText;
  const showStop = loading;
  const isTaskMode = sendMode === "task";

  return (
    <>
      {/* الملفات المرفقة */}
      {attachedFiles.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: "8px",
            padding: "8px 20px",
            flexWrap: "wrap",
          }}
        >
          {attachedFiles.map((f) => (
            <div
              key={f.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: "rgba(108,92,231,0.15)",
                borderRadius: "10px",
                padding: "6px 10px",
                fontSize: "12px",
              }}
            >
              <span>{f.icon || "📎"}</span>
              <span
                style={{
                  maxWidth: "120px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {f.name}
              </span>
              <button
                onClick={() => onRemoveFile(f.id)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "inherit",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* منطقة الإدخال */}
      <div className="input-area">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="header-btn"
          style={{ fontSize: "20px", padding: "8px" }}
          title="رفع ملف"
        >
          📎
        </button>

        <input
          type="file"
          ref={fileInputRef}
          onChange={onFileUpload}
          multiple
          style={{ display: "none" }}
          accept=".txt,.js,.jsx,.ts,.tsx,.py,.html,.css,.json,.csv,.md,.xml,.yaml,.yml,.pdf,image/*"
        />

        {/* زر تبديل الوضع (رد / مهمة) */}
        <button
          onClick={onToggleMode}
          className={`mode-toggle ${
            isTaskMode ? "mode-toggle-task" : "mode-toggle-chat"
          }`}
          title={isTaskMode ? "التبديل إلى رد سريع" : "التبديل إلى مهمة"}
          disabled={loading}
        >
          {isTaskMode ? "📋 مهمة" : "💬 رد"}
        </button>

        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            loading
              ? "بلاك بيكتب..."
              : attachedFiles.length > 0
              ? "اكتب سؤالك عن الملفات..."
              : isTaskMode
              ? "اكتب مهمة (سيتم تنفيذها في الخلفية)..."
              : "اكتب لبلاك..."
          }
          rows={1}
          className="textarea"
          disabled={isDisabled}
        />

        <button
          onClick={showStop ? onStop : onSend}
          className="send-btn"
          style={{
            opacity: !canSend && !loading ? 0.4 : 1,
            background: loading
              ? "#f87171"
              : isTaskMode
              ? "linear-gradient(135deg, #10b981, #4ade80)"
              : "",
            cursor: "pointer",
          }}
          title={isTaskMode ? "إرسال كمهمة" : "إرسال كرد"}
        >
          {loading ? "⏹️" : "↑"}
        </button>
      </div>
    </>
  );
}
