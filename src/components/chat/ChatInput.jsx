// ============================================
// ChatInput.jsx
// ✅ v3.0: يعرض الملفات دائماً + شريط تقدم دائري
// ============================================

import { useRef } from "react";

function CircularProgress({ percentage, size = 44, strokeWidth = 3 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <svg
      width={size}
      height={size}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        transform: "rotate(-90deg)",
        pointerEvents: "none",
      }}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(108,92,231,0.2)"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="url(#progressGradient)"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.3s ease" }}
      />
      <defs>
        <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
    </svg>
  );
}

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
  uploadProgress,
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

  const isUploadingFile = (file) => {
    return uploadProgress && uploadProgress.name === file.name;
  };

  return (
    <>
      {/* ✅ عرض الملفات دائماً (إذا كانت موجودة) */}
      {attachedFiles.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: "10px",
            padding: "8px 20px",
            flexWrap: "wrap",
          }}
        >
          {attachedFiles.map((f) => {
            const uploading = isUploadingFile(f);
            const percentage = uploading ? uploadProgress.percentage : 100;

            return (
              <div
                key={f.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "4px",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    position: "relative",
                    width: "44px",
                    height: "44px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {uploading && (
                    <CircularProgress percentage={percentage} size={44} strokeWidth={3} />
                  )}
                  <span
                    style={{
                      fontSize: "22px",
                      zIndex: 1,
                      opacity: uploading ? 0.7 : 1,
                    }}
                  >
                    {f.icon || "📎"}
                  </span>
                  {!uploading && (
                    <button
                      onClick={() => onRemoveFile(f.id)}
                      style={{
                        position: "absolute",
                        top: "-6px",
                        right: "-6px",
                        width: "18px",
                        height: "18px",
                        borderRadius: "50%",
                        background: "#ef4444",
                        color: "#fff",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "10px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 0,
                      }}
                      title="حذف الملف"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <span
                  style={{
                    fontSize: "10px",
                    maxWidth: "60px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    color: uploading ? "#6c5ce7" : "inherit",
                  }}
                  title={f.name}
                >
                  {uploading ? `${percentage}%` : f.name}
                </span>
              </div>
            );
          })}
        </div>
      )}

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
