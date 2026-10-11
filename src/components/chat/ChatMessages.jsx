// ============================================
// ChatMessages.jsx
// عرض الرسائل + المهام + النتائج المكتملة
// ✅ جديد: زر "العودة للأسفل" عند التمرير لأعلى
// ============================================

import MessageContent from "../MessageContent";
import TypingDots from "../TypingDots";
import TaskMessage from "./TaskMessage";

export default function ChatMessages({
  messages,
  tasks = [],
  streamingText,
  loading,
  isDark,
  copiedId,
  onCopy,
  onCancelTask,
  bottomRef,
  // ✅ جديد
  showScrollButton = false,
  onScrollToBottom,
  onScroll,
}) {
  return (
    <div className="messages" onScroll={onScroll}>
      {/* الرسائل العادية + المهام + النتائج */}
      {messages.map((msg) => {
        // رسالة مهمة نشطة → كارت
        if (msg.type === "task" && msg.task) {
          return (
            <div key={msg.id} className="msg-row msg-row-ai">
              <div className="avatar-small">🖤</div>
              <div
                className="msg-content-wrapper"
                style={{ maxWidth: "95%", width: "100%" }}
              >
                <TaskMessage task={msg.task} onCancel={onCancelTask} />
              </div>
            </div>
          );
        }

        // رسالة عادية (بما فيها نتائج المهام المكتملة)
        return (
          <div
            key={msg.id}
            className={`msg-row ${
              msg.role === "user" ? "msg-row-user" : "msg-row-ai"
            }`}
          >
            {msg.role === "assistant" && (
              <div className="avatar-small">🖤</div>
            )}

            <div className="msg-content-wrapper">
              <div
                className={`bubble ${
                  msg.role === "user"
                    ? "bubble-user"
                    : isDark
                    ? "bubble-ai"
                    : "bubble-ai-light"
                }`}
              >
                <MessageContent content={msg.content} />
              </div>

              {msg.role === "assistant" && (
                <button
                  onClick={() => onCopy(msg.content, msg.id)}
                  className="copy-msg-btn"
                  title="نسخ"
                >
                  {copiedId === msg.id ? "✓" : "📋"}
                </button>
              )}
            </div>

            {msg.role === "user" && (
              <div className="avatar-small avatar-user">👤</div>
            )}
          </div>
        );
      })}

      {/* النص المتدفق (streaming) */}
      {streamingText && (
        <div className="msg-row msg-row-ai">
          <div className="avatar-small">🖤</div>
          <div
            className={`bubble ${isDark ? "bubble-ai" : "bubble-ai-light"}`}
          >
            <MessageContent content={streamingText} />
          </div>
        </div>
      )}

      {/* مؤشر الكتابة */}
      {loading && !streamingText && (
        <div className="msg-row msg-row-ai">
          <div className="avatar-small">🖤</div>
          <div
            className={`bubble ${isDark ? "bubble-ai" : "bubble-ai-light"}`}
          >
            <TypingDots />
          </div>
        </div>
      )}

      {/* مرجع للتمرير التلقائي */}
      <div ref={bottomRef} />

      {/* ✅ زر العودة للأسفل */}
      {showScrollButton && (
        <button
          onClick={onScrollToBottom}
          className="scroll-to-bottom-btn"
          title="العودة للأسفل"
          style={{
            position: "absolute",
            bottom: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "44px",
            height: "44px",
            borderRadius: "50%",
            border: "none",
            background: "linear-gradient(135deg, #6c5ce7, #8b7cf6)",
            color: "#fff",
            fontSize: "20px",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "opacity 0.2s, transform 0.2s",
          }}
        >
          ⬇️
        </button>
      )}
    </div>
  );
}
