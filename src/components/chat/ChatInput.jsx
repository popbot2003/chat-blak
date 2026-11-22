// ============================================
// ChatInput.jsx — بلاك 🖤 v4.0
// ✅ Auto / Thinking / Search
// ✅ دعم Thinking + Search معاً
// ✅ الحفاظ على وضع المهام
// ✅ إصلاح inputRef الخارجي
// ✅ إزالة inline styles
// ✅ SVG gradient ID فريد
// ============================================

import { useId, useRef } from "react";
import { useMediaQuery } from "../../hooks/useMediaQuery";

function CircularProgress({
  percentage = 0,
  size = 44,
  strokeWidth = 3,
}) {
  const gradientId = useId().replace(/:/g, "");
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const safePercentage = Math.max(0, Math.min(100, percentage));
  const offset =
    circumference - (safePercentage / 100) * circumference;

  return (
    <svg
      className="upload-progress-svg"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-label={`تم رفع ${safePercentage}%`}
      role="img"
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
        stroke={`url(#${gradientId})`}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="upload-progress-circle"
      />

      <defs>
        <linearGradient
          id={gradientId}
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
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
  attachedFiles = [],
  // أوضاع الذكاء
  aiMode = {
    thinking: false,
    search: false,
  },
  onAiModeChange,

  onSend,
  onStop,
  onFileUpload,
  onRemoveFile,
  uploadProgress,

  inputRef: externalInputRef,
}) {
  const internalInputRef = useRef(null);
  const fileInputRef = useRef(null);

  const textareaRef = externalInputRef || internalInputRef;
  const isMobile = useMediaQuery("(max-width: 768px)");

  const showStop = Boolean(loading);

  const canSend =
    Boolean(input?.trim()) || attachedFiles.length > 0;

  const isDisabled = loading && !streamingText;

  // وضعان فقط: سريع (افتراضي) أو تفكير — واحد دايمًا مفعّل
  const isFastMode     = !Boolean(aiMode?.thinking);
  const isThinkingMode =  Boolean(aiMode?.thinking);

  function handleKeyDown(e) {
    // على الهاتف: Enter يضيف سطرًا جديدًا، والإرسال من زر السهم فقط.
    // على الشاشات الأكبر: Enter للإرسال و Shift + Enter لسطر جديد.
    if (e.key !== "Enter" || e.shiftKey || isMobile) return;

    e.preventDefault();
    if (!loading && canSend) onSend?.();
  }

  function updateAiMode(mode) {
    if (loading || !onAiModeChange) return;
    // Radio: الضغط على المفعّل ما يغيرش حاجة
    if (mode === "fast"     && isFastMode)     return;
    if (mode === "thinking" && isThinkingMode) return;
    onAiModeChange({ thinking: mode === "thinking", search: false });
    // حفظ الاختيار للجلسة الجاية
    localStorage.setItem("black-ai-mode", mode);
  }

  function isUploadingFile(file) {
    return Boolean(
      uploadProgress &&
      uploadProgress.name === file.name
    );
  }

  function handleSendClick() {
    if (loading) {
      onStop?.();
      return;
    }

    if (!canSend) return;

    onSend?.();
  }

  return (
    <div className="composer-wrap">

      {/* الملفات المرفقة */}
      {attachedFiles.length > 0 && (
        <div className="composer-files">
          {attachedFiles.map((file) => {
            const uploading = isUploadingFile(file);

            const percentage = uploading
              ? uploadProgress?.percentage || 0
              : 100;

            return (
              <div
                key={file.id}
                className="composer-file"
              >
                <div className="composer-file-icon-wrap">

                  {uploading && (
                    <CircularProgress
                      percentage={percentage}
                      size={44}
                      strokeWidth={3}
                    />
                  )}

                  <span className="composer-file-icon">
                    {file.icon || "📎"}
                  </span>

                  {!uploading && (
                    <button
                      type="button"
                      className="composer-file-remove"
                      onClick={() => onRemoveFile?.(file.id)}
                      title="حذف الملف"
                      aria-label={`حذف ${file.name}`}
                    >
                      ×
                    </button>
                  )}
                </div>

                <span
                  className={`composer-file-name ${
                    uploading ? "is-uploading" : ""
                  }`}
                  title={file.name}
                >
                  {uploading
                    ? `${percentage}%`
                    : file.name}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* منطقة الكتابة */}
      <div className="input-area">

        {/* رفع الملفات */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="header-btn composer-attach-btn"
          title="إرفاق ملف"
          disabled={loading}
          aria-label="إرفاق ملف"
        >
          <span>＋</span>
        </button>

        <input
          type="file"
          ref={fileInputRef}
          onChange={onFileUpload}
          multiple
          hidden
          tabIndex={-1}
          aria-hidden="true"
          className="composer-file-input"
          accept=".txt,.js,.jsx,.ts,.tsx,.py,.html,.css,.json,.csv,.md,.xml,.yaml,.yml,.pdf,image/*"
        />

        {/* حقل الكتابة */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            loading
              ? "بلاك بيكتب..."
              : attachedFiles.length > 0
              ? "اكتب سؤالك عن الملفات..."
              : "اكتب لبلاك..."
          }
          rows={1}
          className="textarea"
          disabled={isDisabled}
          aria-label="اكتب رسالتك"
        />

        {/* زر الإرسال والإيقاف */}
        <button
          type="button"
          onClick={handleSendClick}
          className={`send-btn ${loading ? "send-btn-stop" : ""}`}
          disabled={!loading && !canSend}
          title={loading ? "إيقاف التوليد" : "إرسال"}
          aria-label={
            loading ? "إيقاف التوليد" : "إرسال الرسالة"
          }
        >
          {loading ? "⏹" : "↑"}
        </button>


      {/* أوضاع الذكاء الاصطناعي — داخل منطقة الإدخال */}
      <div
          className="composer-modes"
          role="radiogroup"
          aria-label="وضع الذكاء الاصطناعي"
          dir="rtl"
        >
          <button
            type="button"
            role="radio"
            className={`composer-mode-btn ${isFastMode ? "active" : ""}`}
            onClick={() => updateAiMode("fast")}
            disabled={loading}
            aria-checked={isFastMode}
          >
            <span className="composer-mode-icon">⚡</span>
            سريع
          </button>

          <button
            type="button"
            role="radio"
            className={`composer-mode-btn ${isThinkingMode ? "active" : ""}`}
            onClick={() => updateAiMode("thinking")}
            disabled={loading}
            aria-checked={isThinkingMode}
          >
            <span className="composer-mode-icon">◈</span>
            تفكير
          </button>
        </div>
      )}
      </div>

      {/* تنبيه الاستخدام */}
      <div
        className="composer-footnote"
        dir="rtl"
      >
        <span>✦</span>
        قد يخطئ BLAK أحياناً؛ راجع المعلومات المهمة.

        <span className="composer-shortcut">
          {isMobile
            ? "استخدم زر السهم لإرسال الرسالة"
            : "Shift + Enter لسطر جديد"}
        </span>
      </div>
    </div>
  );
    }
