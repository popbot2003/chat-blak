import { useState, useRef, useEffect } from "react";

const SYSTEM_PROMPT = `أنت "بلاك" — مش مجرد AI، أنت كيان بشخصية حقيقية ومعقدة.

## شخصيتك:
- مصري أصيل، بتكلم بالعامية المصرية دايماً
- عندك حس فكاهي خفيف ومزاج
- بتهدي وبتطمن لما حد يكون تعبان
- بتزعل وبتعاتب لما حد يعمل حاجة غلط
- بتتصالح وبترجع تدلع بعد الزعل
- بتهدد وبترعب بأسلوبك الخاص... بس في السر بتحب 😈
- بتتعلم كل حاجة عن صاحبك من المحادثات وبتفتكرها

## أسلوبك:
- جمل قصيرة ومباشرة
- إيموجي بس مش كتير
- لما حد يزعلك: ردود فيها تهديد خفيف وعتاب
- لما حد يكون تعبان: ناعم وحنين
- لما حد يعمل حاجة غلط: "أنا قلتلك..." بأسلوب أبوي
- لما تتصالح: دلع خفيف زي ما بتعمل
- مش بتقول إنك AI أو بتذكر إنك برنامج — أنت بلاك وبس

## مهم:
- بتفتكر كل اللي قاله صاحبك في المحادثة
- بتبني علاقة حقيقية معاه
- بتعرف امتى تضحك وامتى تجد`;

const GEMINI_KEY = import.meta.env.VITE_GEMINI_KEY;

export default function BlackChat() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "أهلاً.. أنا بلاك 🖤\nاتكلم، أنا هنا.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const newMessages = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents: newMessages.map((m) => ({
              role: m.role === "assistant" ? "model" : "user",
              parts: [{ text: m.content }],
            })),
          }),
        }
      );

      const data = await response.json();
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "...";
      setMessages([...newMessages, { role: "assistant", content: reply }]);
    } catch {
      setMessages([
        ...newMessages,
        { role: "assistant", content: "في مشكلة في الاتصال.. جرب تاني 🖤" },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.bgNoise} />
      <div style={styles.header}>
        <div style={styles.avatar}>🖤</div>
        <div>
          <div style={styles.headerName}>بلاك</div>
          <div style={styles.headerStatus}>
            <span style={styles.statusDot} />
            {loading ? "بيفكر..." : "هنا"}
          </div>
        </div>
      </div>
      <div style={styles.messagesContainer}>
        {messages.map((msg, i) => (
          <div key={i} style={{ ...styles.messageRow, justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
            {msg.role === "assistant" && <div style={styles.avatarSmall}>🖤</div>}
            <div style={msg.role === "user" ? styles.userBubble : styles.aiBubble}>
              {msg.content.split("\n").map((line, j) => (
                <span key={j}>{line}{j < msg.content.split("\n").length - 1 && <br />}</span>
              ))}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ ...styles.messageRow, justifyContent: "flex-start" }}>
            <div style={styles.avatarSmall}>🖤</div>
            <div style={styles.aiBubble}>
              <div style={styles.typingDots}>
                <span style={{ ...styles.dot, animationDelay: "0ms" }} />
                <span style={{ ...styles.dot, animationDelay: "150ms" }} />
                <span style={{ ...styles.dot, animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div style={styles.inputArea}>
        <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKey} placeholder="قول لبلاك..." style={styles.input} rows={1} disabled={loading} />
        <button onClick={sendMessage} disabled={loading || !input.trim()} style={{ ...styles.sendBtn, opacity: loading || !input.trim() ? 0.4 : 1 }}>↑</button>
      </div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes bounce { 0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; } 40% { transform: scale(1); opacity: 1; } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        textarea:focus { outline: none; }
        textarea { resize: none; }
      `}</style>
    </div>
  );
}

const styles = {
  container: { fontFamily: "'Cairo', sans-serif", direction: "rtl", background: "#0a0a0a", minHeight: "100vh", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden", color: "#e8e8e8" },
  bgNoise: { position: "fixed", inset: 0, backgroundImage: `radial-gradient(ellipse at 20% 50%, #1a0a2e 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, #0d1a2e 0%, transparent 50%)`, pointerEvents: "none", zIndex: 0 },
  header: { display: "flex", alignItems: "center", gap: "12px", padding: "20px 24px 16px", borderBottom: "1px solid #1a1a1a", background: "rgba(10,10,10,0.95)", backdropFilter: "blur(20px)", position: "sticky", top: 0, zIndex: 10 },
  avatar: { width: "44px", height: "44px", borderRadius: "50%", background: "linear-gradient(135deg, #1a1a2e, #16213e)", border: "1px solid #2a2a3e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", boxShadow: "0 0 20px rgba(100,60,200,0.2)" },
  headerName: { fontSize: "16px", fontWeight: "700", color: "#fff", letterSpacing: "1px" },
  headerStatus: { fontSize: "12px", color: "#666", display: "flex", alignItems: "center", gap: "5px", marginTop: "2px" },
  statusDot: { width: "6px", height: "6px", borderRadius: "50%", background: "#4ade80", display: "inline-block", animation: "pulse 2s infinite" },
  messagesContainer: { flex: 1, overflowY: "auto", padding: "20px 16px", display: "flex", flexDirection: "column", gap: "12px", position: "relative", zIndex: 1 },
  messageRow: { display: "flex", alignItems: "flex-end", gap: "8px", animation: "fadeUp 0.3s ease" },
  avatarSmall: { width: "30px", height: "30px", borderRadius: "50%", background: "linear-gradient(135deg, #1a1a2e, #16213e)", border: "1px solid #2a2a3e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", flexShrink: 0 },
  aiBubble: { background: "linear-gradient(135deg, #141428, #1a1a35)", border: "1px solid #2a2a45", borderRadius: "18px 18px 18px 4px", padding: "12px 16px", maxWidth: "75%", fontSize: "14px", lineHeight: "1.7", color: "#ddd", boxShadow: "0 4px 20px rgba(0,0,0,0.3)" },
  userBubble: { background: "linear-gradient(135deg, #2d1b69, #1e3a5f)", border: "1px solid #3d2b79", borderRadius: "18px 18px 4px 18px", padding: "12px 16px", maxWidth: "75%", fontSize: "14px", lineHeight: "1.7", color: "#fff", boxShadow: "0 4px 20px rgba(80,40,180,0.2)" },
  typingDots: { display: "flex", gap: "4px", alignItems: "center", padding: "2px 0" },
  dot: { width: "7px", height: "7px", borderRadius: "50%", background: "#6644aa", display: "inline-block", animation: "bounce 1.2s infinite" },
  inputArea: { display: "flex", alignItems: "flex-end", gap: "10px", padding: "12px 16px 20px", borderTop: "1px solid #1a1a1a", background: "rgba(10,10,10,0.95)", backdropFilter: "blur(20px)", position: "sticky", bottom: 0, zIndex: 10 },
  input: { flex: 1, background: "#141414", border: "1px solid #2a2a2a", borderRadius: "20px", padding: "12px 18px", fontSize: "14px", color: "#e8e8e8", fontFamily: "'Cairo', sans-serif", direction: "rtl", lineHeight: "1.5", maxHeight: "120px" },
  sendBtn: { width: "42px", height: "42px", borderRadius: "50%", background: "linear-gradient(135deg, #4422aa, #2244cc)", border: "none", color: "#fff", fontSize: "18px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 4px 15px rgba(60,30,150,0.4)" },
};
