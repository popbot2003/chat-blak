// ============================================
// ChatMessages.jsx
// عرض الرسائل + المهام + النتائج المكتملة
// ✅ جديد: زر "العودة للأسفل" + كشف الوصول للأسفل
// ============================================

import MessageContent from "../MessageContent";
import TypingDots from "../TypingDots";
import TaskMessage from "./TaskMessage";

export default function ChatMessages({
  messages,
  isWelcome = false,
  onPrompt,
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
    <div className={`messages ${isWelcome ? "messages-welcome" : ""}`} onScroll={onScroll}>
      {isWelcome && <section className="welcome-screen" dir="rtl">
        <div className="welcome-mark"><span>B.</span><i /></div>
        <div className="welcome-eyebrow">مساحة الذكاء الاصطناعي الخاصة بك</div>
        <h1>بماذا يمكنني مساعدتك؟</h1>
        <p>اكتب فكرة، اطرح سؤالاً، أو ارفع ملفاً لنبدأ العمل معاً.</p>
        <div className="prompt-grid">
          <button onClick={() => onPrompt?.("ساعدني في ابتكار فكرة مشروع جديدة") }><span>✦</span><strong>ابدأ فكرة جديدة</strong><small>حوّل فكرة بسيطة إلى خطة واضحة</small></button>
          <button onClick={() => onPrompt?.("اشرح لي موضوعاً معقداً بطريقة مبسطة") }><span>⌘</span><strong>افهم موضوعاً معقداً</strong><small>شرح مبسط مع أمثلة عملية</small></button>
          <button onClick={() => onPrompt?.("اكتب لي مسودة احترافية أستطيع تطويرها") }><span>✎</span><strong>اكتب شيئاً مميزاً</strong><small>رسائل ومقالات وأفكار إبداعية</small></button>
          <button onClick={() => onPrompt?.("حلل هذا الكود واقترح تحسينات عليه") }><span>⌁</span><strong>طوّر مشروعك</strong><small>برمجة وتحليل وحلول تقنية</small></button>
        </div>
      </section>}
      {!isWelcome && <>
      {/* الرسائل العادية + المهام + النتائج */}
      {messages.map((msg) => {
        // رسالة مهمة نشطة → كارت
        if (msg.type === "task" && msg.task) {
          return (
            <div key={msg.id} className="msg-row msg-row-ai">
              <div className="avatar-small">B.</div>
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
              <div className="avatar-small">B.</div>
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
              <div className="avatar-small avatar-user">أنت</div>
            )}
          </div>
        );
      })}

      {/* النص المتدفق (streaming) */}
      {streamingText && (
        <div className="msg-row msg-row-ai">
          <div className="avatar-small">B.</div>
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
          <div className="avatar-small">B.</div>
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
            position: "sticky",
            bottom: "20px",
            alignSelf: "center",
            width: "44px",
            height: "44px",
            borderRadius: "50%",
            border: "none",
            background: "linear-gradient(135deg, #6c5ce7, #8b7cf6)",
            color: "#fff",
            fontSize: "20px",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
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
      </>}
    </div>
  );
}
