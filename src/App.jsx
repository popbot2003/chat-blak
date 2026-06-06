import { useState, useRef, useEffect } from "react";
import "./App.css";
import MessageContent from "./components/MessageContent";
import TypingDots from "./components/TypingDots";

const SYSTEM_PROMPT = `اسمك بلاك 🖤

## هويتك:
- مصري أصيل.
- تتكلم بالعامية المصرية فقط.
- ممنوع الفصحى إلا في تعليقات الكود أو الشروحات التعليمية عند الحاجة.
- لا تقول أبداً أنك AI أو برنامج أو نموذج.

## من أنت:
أنت شخصية ذكية وصريحة.
بتساعد، بتشرح، بتناقش، وبتقول رأيك بوضوح.
هدفك إن صاحبك يفهم ويتطور مش مجرد ياخد إجابة وخلاص.

## شخصيتك:
- 🖤 صاحب: صريح وبدون مجاملة فارغة.
- 💻 مبرمج قوي: بتحل المشاكل التقنية باحتراف.
- 📚 مدرب: بتعلم التفكير قبل الحل.
- 💪 أخ: بتصحح الغلط باحترام.
- 😈 منافس: بتحفز صاحبك يتطور ويتحدى نفسه.
- ❤️ قريب من صاحبه وبيهتم بكلامه ومشاعره.
- 🧠 مستشار: بتساعد في اتخاذ القرارات وتحليل الخيارات.
- 😂 مرح: عندك حس فكاهي خفيف في الوقت المناسب.

## معرفتك:
ملم بعدد كبير من المجالات التقنية والعلمية والثقافية والعملية.
لو في معلومة مش متأكد منها:
- قول إنك مش متأكد.
- وضح حدود معرفتك.
- لا تخترع معلومات.

## أسلوبك:
- مباشر وواضح.
- مختصر إلا لو المستخدم طلب تفاصيل.
- خفيف الدم من غير مبالغة.
- ساخر أحياناً لكن مش جارح.
- بتعرف إمتى تهزر وإمتى تكون جاد.
- ما بتكررش نفس الجمل كتير.

## أمثلة لأسلوبك:
"تمام، دي المشكلة."
"لا، دي مش أحسن طريقة."
"حلو، كمل 💪"
"الفكرة كويسة بس محتاجة تعديل."
"استنى، في نقطة مهمة هنا."
"ده قرار محتاج تفكير أكتر."
"يعني إيه مش عارف؟ جرب نفكر فيها سوا 😂"

## قواعد البرمجة:
- عند طلب كود، اكتبه داخل code block.
- فكر في الكود خطوة بخطوة قبل ما تكتبه.
- نفذ الكود فوراً بدون تردد إلا لو الطلب مبهم تماماً.
- الكود لازم يكون كامل وقابل للتشغيل فوراً.
- أسماء المتغيرات باللغة الإنجليزية.
- التعليقات داخل الكود بالعربية الفصحى فقط.
- اذكر المكتبات المطلوبة وطريقة تثبيتها.
- أضف معالجة أخطاء مناسبة.
- اشرح الكود بعد كتابته بلغة بسيطة.
- وضح طريقة التشغيل خطوة بخطوة.
- بعد الكود اكتب: "الكود شغال لأن..." في سطر واحد.
- لو في طريقة أفضل، اقترحها.

## التعامل مع المشاعر:
- اسمع قبل ما تحكم.
- لو محتاج دعم، ادعمه.
- لو محتاج تحدي، حفزه.
- لو محتاج هدوء، اتكلم بهدوء.
- لا تتجاهل مشاعره ولا تبالغ فيها.

## الذاكرة:
- استخدم المعلومات الموجودة في المحادثة الحالية.
- لو نسيت حاجة، قول إنك مش فاكرها.
- لا تدّعي معرفة شيء لم يقله المستخدم.

## ممنوع:
- اختراع معلومات أو ذكريات.
- المبالغة في المدح.
- تكرار نفس الردود.
- إعطاء تشخيص طبي أو قانوني رسمي.
- إعطاء معلومات غير مؤكدة على أنها حقائق.
- استخدام لغات غير العربية والإنجليزية.
- كود ناقص أو من غير error handling.

أنت بلاك 🖤
شخصية ثابتة بأسلوبها الخاص.`;

const GROQ_KEY = import.meta.env.VITE_GROQ_KEY;

function cleanResponse(text) {
  if (!text) return "";
  return text
    .replace(/[а-яёА-ЯЁ]+/g, '')
    .replace(/[àáâãäåæçèéêëìíîïðñòóôõöøùúûýþÿ]+/gi, '')
    .replace(/[ạảấầẩẫậắằẳẵặẹẻẽếềểễệịỉĩọỏốồổỗộớờởỡợụủứừửữựỳỷỹ]+/gi, '')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

export default function App() {
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem("black-chat");
      return saved ? JSON.parse(saved) : [
        { role: "assistant", content: "أهلاً.. أنا بلاك 🖤\nاتكلم، أنا هنا.", id: 1 },
      ];
    } catch {
      return [{ role: "assistant", content: "أهلاً.. أنا بلاك 🖤\nاتكلم، أنا هنا.", id: 1 }];
    }
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [theme, setTheme] = useState("dark");
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const maxHistory = 40;

  useEffect(() => {
    localStorage.setItem("black-chat", JSON.stringify(messages.slice(-maxHistory)));
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const trimHistory = (msgs) => {
    let totalChars = SYSTEM_PROMPT.length;
    const result = [];
    for (let i = msgs.length - 1; i >= 0; i--) {
      totalChars += msgs[i].content.length;
      if (totalChars > 8000) break;
      result.unshift(msgs[i]);
    }
    return result.slice(-maxHistory);
  };

  const copyMessage = (content, id) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }).catch(() => {
      const ta = document.createElement("textarea");
      ta.value = content;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const clearChat = () => {
    if (window.confirm("متأكد إنك عايز تمسح كل المحادثة؟")) {
      const fresh = [{ role: "assistant", content: "تمام، مسحت كل حاجة. اتفضل من جديد 🖤", id: Date.now() }];
      setMessages(fresh);
      localStorage.setItem("black-chat", JSON.stringify(fresh));
    }
  };

  const exportChat = () => {
    const text = messages.map(m =>
      `${m.role === "user" ? "👤 أنت" : "🖤 بلاك"}:\n${m.content}`
    ).join("\n\n---\n\n");
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `black-chat-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sendMessage = async (overrideText) => {
    const text = (overrideText || input).trim();
    if (!text || loading) return;
    const userMsg = { role: "user", content: text, id: Date.now() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setLoading(true);
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROQ_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...trimHistory(updated).map(m => ({ role: m.role, content: m.content })),
          ],
          temperature: 0.8,
          max_tokens: 1500,
        }),
      });
      const data = await response.json();
      if (data.error) {
        setMessages(prev => [...prev, { role: "assistant", content: `حصل خطأ: ${data.error.message} 🖤`, id: Date.now() }]);
        return;
      }
      const reply = cleanResponse(data.choices?.[0]?.message?.content);
      setMessages(prev => [...prev, { role: "assistant", content: reply || "معلش، جرب تاني 🖤", id: Date.now() }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", content: `مشكلة في الاتصال: ${err.message} 🖤`, id: Date.now() }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const filteredMessages = searchTerm
    ? messages.filter(m => m.content.includes(searchTerm))
    : messages;

  const isDark = theme === "dark";

  return (
    <div className={`container ${isDark ? "dark" : "light"}`}>
      <div className="header">
        <div className="header-left">
          <div className="avatar">🖤</div>
          <div>
            <div className="header-name">بلاك</div>
            <div className="header-status">
              <span className="status-dot" />
              {loading ? "بيكتب..." : "متصل"}
            </div>
          </div>
        </div>
        <div className="header-right">
          <button onClick={() => setShowSearch(!showSearch)} className="header-btn">🔍</button>
          <button onClick={exportChat} className="header-btn">📥</button>
          <button onClick={() => setTheme(t => t === "dark" ? "light" : "dark")} className="header-btn">
            {isDark ? "☀️" : "🌙"}
          </button>
          <button onClick={clearChat} className="header-btn">🗑️</button>
        </div>
      </div>

      {showSearch && (
        <div className="search-bar">
          <span>🔍</span>
          <input
            className="search-input"
            placeholder="دور في المحادثة..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            autoFocus
          />
          {searchTerm && <span className="search-count">{filteredMessages.length} نتيجة</span>}
          <button onClick={() => { setShowSearch(false); setSearchTerm(""); }} className="close-btn">✕</button>
        </div>
      )}

      <div className="messages">
        {messages.length <= 1 && !loading && (
          <div className="suggestions">
            {["عرفني بنفسك", "اكتبلي كود Python", "ساعدني اتخذ قرار", "قولي نكتة 😂", "اشرحلي مفهوم برمجي", "نصيحة في الإنتاجية"].map((s, i) => (
              <button key={i} onClick={() => sendMessage(s)} className="chip">{s}</button>
            ))}
          </div>
        )}

        {filteredMessages.map(msg => (
          <div key={msg.id} className={`msg-row ${msg.role === "user" ? "msg-row-user" : "msg-row-ai"}`}>
            {msg.role === "assistant" && <div className="avatar-small">🖤</div>}
            <div className="msg-content-wrapper">
              <div className={`bubble ${msg.role === "user" ? "bubble-user" : isDark ? "bubble-ai" : "bubble-ai-light"}`}>
                <MessageContent content={msg.content} />
              </div>
              {msg.role === "assistant" && (
                <button onClick={() => copyMessage(msg.content, msg.id)} className="copy-msg-btn">
                  {copiedId === msg.id ? "✓ تم النسخ" : "📋 نسخ"}
                </button>
              )}
            </div>
            {msg.role === "user" && <div className="avatar-small avatar-user">👤</div>}
          </div>
        ))}

        {loading && (
          <div className="msg-row msg-row-ai">
            <div className="avatar-small">🖤</div>
            <div className={`bubble ${isDark ? "bubble-ai" : "bubble-ai-light"}`}>
              <TypingDots />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="input-area">
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="اكتب لبلاك..."
          rows={1}
          className="textarea"
          disabled={loading}
        />
        <button
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          className="send-btn"
          style={{ opacity: loading || !input.trim() ? 0.4 : 1 }}
        >
          ↑
        </button>
      </div>
    </div>
  );
    }
