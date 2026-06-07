import { useState, useRef, useEffect } from "react";
import "./App.css";
import MessageContent from "./components/MessageContent";
import TypingDots from "./components/TypingDots";
import { supabase } from './lib/supabase';

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

## التعامل مع الملفات:
- لو المستخدم رفع ملف، اقرأه وحلله.
- لو ملف كود، راجعه واقترح تحسينات.
- لو ملف نصي، لخصه أو ناقش محتواه.
- لو ملف CSV/JSON، حلل البيانات.
- اسأل عن المطلوب قبل ما تبدأ لو مش واضح.

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

const DAILY_LIMIT_PER_KEY = 100000;

// ========== دوال مساعدة ==========

function loadKeys() {
  const keys = [];
  for (let i = 1; i <= 10; i++) {
    const keyValue = import.meta.env[`VITE_GROQ_KEY_${i}`];
    if (keyValue) {
      keys.push({ id: i, key: keyValue, used: 0 });
    }
  }
  if (keys.length === 0) {
    const fallbackKey = import.meta.env.VITE_GROQ_KEY;
    if (fallbackKey) {
      keys.push({ id: 0, key: fallbackKey, used: 0 });
    }
  }
  return keys;
}

function pickBestKey(keys) {
  const availableKeys = keys.filter(function(key) {
    return key.used < DAILY_LIMIT_PER_KEY;
  });
  
  if (availableKeys.length === 0) {
    return null;
  }
  
  if (availableKeys.length === 1) {
    return availableKeys[0];
  }
  
  const randomIndex = Math.floor(Math.random() * availableKeys.length);
  return availableKeys[randomIndex];
}

function cleanResponse(text) {
  if (!text) {
    return "";
  }
  
  return text
    .replace(/[а-яёА-ЯЁ]+/g, '')
    .replace(/[àáâãäåæçèéêëìíîïðñòóôõöøùúûýþÿ]+/gi, '')
    .replace(/[ạảấầẩẫậắằẳẵặẹẻẽếềểễệịỉĩọỏốồổỗộớờởỡợụủứừửữựỳỷỹ]+/gi, '')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

async function readFileAsText(file) {
  return new Promise(function(resolve) {
    const reader = new FileReader();
    
    reader.onload = function() {
      resolve(reader.result);
    };
    
    reader.onerror = function() {
      resolve("خطأ في قراءة الملف: " + file.name);
    };
    
    if (file.type === "application/pdf") {
      reader.readAsArrayBuffer();
      resolve("📄 ملف PDF: " + file.name + " (" + (file.size / 1024).toFixed(1) + " KB)\n[محتوى PDF يحتاج إلى استخراج - جاري محاولة قراءة النص المتاح]");
      return;
    }
    
    if (file.type.startsWith("image/")) {
      reader.readAsDataURL();
      resolve("🖼️ صورة: " + file.name + " (" + (file.size / 1024).toFixed(1) + " KB)\n[بلاك يشوف الصورة، لكن محتاج تسأله عنها]");
      return;
    }
    
    reader.readAsText();
  });
}

function getFileIcon(file) {
  if (file.type.startsWith("image/")) {
    return "🖼️";
  }
  
  if (file.type === "application/pdf") {
    return "📄";
  }
  
  if (file.type === "application/json" || file.name.endsWith(".json")) {
    return "📋";
  }
  
  if (file.type === "text/csv" || file.name.endsWith(".csv")) {
    return "📊";
  }
  
  if (file.type.includes("javascript") || file.name.endsWith(".js") || file.name.endsWith(".jsx")) {
    return "💛";
  }
  
  if (file.type.includes("python") || file.name.endsWith(".py")) {
    return "🐍";
  }
  
  if (file.type.includes("html") || file.name.endsWith(".html")) {
    return "🌐";
  }
  
  if (file.type.includes("css") || file.name.endsWith(".css")) {
    return "🎨";
  }
  
  if (file.name.endsWith(".md")) {
    return "📝";
  }
  
  return "📎";
}

function formatDate(dateString) {
  if (!dateString) {
    return "";
  }
  
  const date = new Date(dateString);
  const now = new Date();
  const difference = now - date;
  
  if (difference < 60000) {
    return "الآن";
  }
  
  if (difference < 3600000) {
    const minutes = Math.floor(difference / 60000);
    return "منذ " + minutes + " د";
  }
  
  if (difference < 86400000) {
    const hours = Math.floor(difference / 3600000);
    return "منذ " + hours + " س";
  }
  
  return date.toLocaleDateString("ar-EG");
}

// ========== المكون الرئيسي ==========

export default function App() {
  // ========== الحالات ==========
  
  const [keys, setKeys] = useState(function() {
    return loadKeys();
  });
  
  const [allChats, setAllChats] = useState([]);
  
  const [currentChatId, setCurrentChatId] = useState(function() {
    return Date.now().toString();
  });
  
  const [showHistory, setShowHistory] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showKeyStats, setShowKeyStats] = useState(false);
  
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "أهلاً.. أنا بلاك 🖤\nاتكلم، أنا هنا. تقدر ترفع ملفات كمان 📎",
      id: 1
    }
  ]);
  
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [theme, setTheme] = useState("dark");
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const keysRef = useRef(keys);
  const retryCountRef = useRef(0);
  
  // ========== التأثيرات ==========
  
  useEffect(function() {
    keysRef.current = keys;
  }, [keys]);
  
  useEffect(function() {
    loadAllDataFromSupabase();
  }, []);
  
  useEffect(function() {
    if (!isLoaded) {
      return;
    }
    
    const intervalId = setInterval(function() {
      loadTokenDataFromSupabase();
    }, 30000);
    
    return function() {
      clearInterval(intervalId);
    };
  }, [isLoaded]);
  
  useEffect(function() {
    if (!isLoaded || messages.length <= 1) {
      return;
    }
    
    const timerId = setTimeout(function() {
      saveChatToSupabase();
    }, 2000);
    
    return function() {
      clearTimeout(timerId);
    };
  }, [messages, isLoaded]);
  
  useEffect(function() {
    function handleBeforeUnload() {
      saveChatToSupabase();
      saveKeysToSupabase();
    }
    
    window.addEventListener("beforeunload", handleBeforeUnload);
    
    return function() {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [messages, isLoaded]);
  
  useEffect(function() {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
  useEffect(function() {
    inputRef.current?.focus();
  }, []);
  
  // ========== دوال Supabase ==========
  
  async function loadAllDataFromSupabase() {
    await loadTokenDataFromSupabase();
    await loadChatsFromSupabase();
    setIsLoaded(true);
  }
  
  async function loadTokenDataFromSupabase() {
    try {
      const { data, error } = await supabase
        .from('token_usage')
        .select('*')
        .eq('id', 1)
        .single();
      
      if (error) {
        console.error("خطأ في تحميل بيانات التوكن:", error);
        return;
      }
      
      if (data) {
        const today = new Date().toISOString().slice(0, 10);
        
        if (data.date === today && data.keys_data && data.keys_data.length > 0) {
          setKeys(function(previousKeys) {
            return previousKeys.map(function(key) {
              const savedKey = data.keys_data.find(function(sk) {
                return sk.id === key.id;
              });
              
              if (savedKey) {
                return { ...key, used: savedKey.used || 0 };
              }
              
              return key;
            });
          });
        } else {
          const freshKeys = loadKeys();
          setKeys(freshKeys);
          await saveKeysToSupabase(freshKeys.map(function(k) {
            return { id: k.id, used: 0 };
          }));
        }
      }
    } catch (error) {
      console.error("خطأ في تحميل بيانات التوكن:", error);
    }
  }
  
  async function saveKeysToSupabase(keysData) {
    const finalKeysData = keysData || keysRef.current.map(function(key) {
      return { id: key.id, used: key.used };
    });
    
    const totalUsed = finalKeysData.reduce(function(sum, key) {
      return sum + key.used;
    }, 0);
    
    try {
      const { error } = await supabase
        .from('token_usage')
        .upsert({
          id: 1,
          date: new Date().toISOString().slice(0, 10),
          total_used: totalUsed,
          keys_data: finalKeysData,
          updated_at: new Date().toISOString()
        });
      
      if (error) {
        console.error("خطأ في حفظ بيانات التوكن:", error);
      }
    } catch (error) {
      console.error("خطأ في حفظ بيانات التوكن:", error);
    }
  }
  
  async function loadChatsFromSupabase() {
    try {
      const { data: chats, error } = await supabase
        .from('chats')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(20);
      
      if (error) {
        console.error("خطأ في تحميل المحادثات:", error);
        return;
      }
      
      if (chats && chats.length > 0) {
        const formattedChats = chats.map(function(chat) {
          return {
            id: chat.id,
            title: chat.title || "محادثة بدون عنوان",
            date: chat.updated_at,
            messageCount: chat.messages ? chat.messages.length : 0
          };
        });
        
        setAllChats(formattedChats);
        
        const lastChat = chats[0];
        
        if (lastChat.messages && lastChat.messages.length > 0) {
          setCurrentChatId(lastChat.id);
          setMessages(lastChat.messages.slice(-40));
        }
      }
    } catch (error) {
      console.error("خطأ في تحميل المحادثات:", error);
    }
  }
  
  async function saveChatToSupabase() {
    try {
      const firstUserMessage = messages.find(function(message) {
        return message.role === "user";
      });
      
      const title = firstUserMessage
        ? firstUserMessage.content.slice(0, 50)
        : "محادثة بدون عنوان";
      
      const { error } = await supabase
        .from('chats')
        .upsert({
          id: currentChatId.toString(),
          title: title,
          messages: messages.slice(-40),
          updated_at: new Date().toISOString()
        });
      
      if (error) {
        console.error("خطأ في حفظ المحادثة:", error);
      }
    } catch (error) {
      console.error("خطأ في حفظ المحادثة:", error);
    }
  }
  
  async function deleteChatFromSupabase(chatId) {
    try {
      const { error } = await supabase
        .from('chats')
        .delete()
        .eq('id', chatId.toString());
      
      if (error) {
        console.error("خطأ في حذف المحادثة:", error);
      }
    } catch (error) {
      console.error("خطأ في حذف المحادثة:", error);
    }
  }
  
  async function deleteAllChatsFromSupabase() {
    try {
      const { error } = await supabase
        .from('chats')
        .delete()
        .neq('id', '0');
      
      if (error) {
        console.error("خطأ في حذف كل المحادثات:", error);
      }
    } catch (error) {
      console.error("خطأ في حذف كل المحادثات:", error);
    }
  }
  
  // ========== دوال الواجهة ==========
  
  function copyMessage(content, id) {
    navigator.clipboard.writeText(content).then(function() {
      setCopiedId(id);
      setTimeout(function() {
        setCopiedId(null);
      }, 2000);
    }).catch(function() {
      const textarea = document.createElement("textarea");
      textarea.value = content;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopiedId(id);
      setTimeout(function() {
        setCopiedId(null);
      }, 2000);
    });
  }
  
  async function handleFileUpload(event) {
    const files = Array.from(event.target.files);
    
    if (files.length === 0) {
      return;
    }
    
    const newFiles = [];
    
    for (const file of files) {
      const content = await readFileAsText(file);
      
      newFiles.push({
        id: Date.now() + Math.random(),
        name: file.name,
        type: file.type,
        size: file.size,
        icon: getFileIcon(file),
        content: content
      });
    }
    
    setAttachedFiles(function(previousFiles) {
      return [...previousFiles, ...newFiles];
    });
    
    inputRef.current?.focus();
  }
  
  function removeFile(fileId) {
    setAttachedFiles(function(previousFiles) {
      return previousFiles.filter(function(file) {
        return file.id !== fileId;
      });
    });
  }
  
  function refreshKeys() {
    const freshKeys = loadKeys();
    setKeys(freshKeys);
    alert("✅ تم تحديث المفاتيح\n📊 " + freshKeys.length + " مفاتيح متصلة");
  }
  
  function newChat() {
    const newId = Date.now().toString();
    setCurrentChatId(newId);
    setMessages([
      {
        role: "assistant",
        content: "محادثة جديدة 🖤\nاتفضل، أنا معاك.",
        id: Date.now()
      }
    ]);
    setShowMenu(false);
    setShowHistory(false);
    setInput("");
    setAttachedFiles([]);
  }
  
  async function openChat(chatId) {
    setCurrentChatId(chatId);
    
    const { data } = await supabase
      .from('chats')
      .select('*')
      .eq('id', chatId)
      .single();
    
    if (data && data.messages) {
      setMessages(data.messages.slice(-40));
    }
    
    setShowHistory(false);
    setShowMenu(false);
    setInput("");
    setAttachedFiles([]);
  }
  
  function clearCurrentChat() {
    if (window.confirm("متأكد إنك عايز تمسح المحادثة دي؟")) {
      setMessages([
        {
          role: "assistant",
          content: "تمام، مسحت المحادثة. اتفضل من جديد 🖤",
          id: Date.now()
        }
      ]);
      
      deleteChatFromSupabase(currentChatId);
      
      setAllChats(function(previousChats) {
        return previousChats.filter(function(chat) {
          return chat.id !== currentChatId;
        });
      });
      
      setAttachedFiles([]);
    }
  }
  
  async function clearAllChats() {
    if (window.confirm("⚠️ متأكد إنك عايز تمسح كل سجل المحادثات؟\n\nمافيش رجوع في الخطوة دي!")) {
      setAllChats([]);
      setMessages([
        {
          role: "assistant",
          content: "تمام، مسحت كل سجل المحادثات. الدنيا زي الفل 🖤",
          id: Date.now()
        }
      ]);
      
      setCurrentChatId(Date.now().toString());
      setShowHistory(false);
      setShowMenu(false);
      setInput("");
      setAttachedFiles([]);
      
      await deleteAllChatsFromSupabase();
    }
  }
  
  function deleteSingleChat(chatId, event) {
    event.stopPropagation();
    
    deleteChatFromSupabase(chatId);
    
    setAllChats(function(previousChats) {
      return previousChats.filter(function(chat) {
        return chat.id !== chatId;
      });
    });
    
    if (currentChatId === chatId) {
      newChat();
    }
  }
  
  // ========== دالة إرسال الرسالة ==========
  
  async function sendMessage(overrideText, isRetry) {
    if (loading && !isRetry) {
      return;
    }
    
    const messageText = (overrideText || input).trim();
    
    let fileContent = "";
    
    if (attachedFiles.length > 0) {
      fileContent = "\n\n📎 **الملفات المرفوعة:**\n";
      
      attachedFiles.forEach(function(file) {
        fileContent += "\n" + file.icon + " **" + file.name + "** (" + (file.size / 1024).toFixed(1) + " KB)\n```\n" + file.content + "\n```\n";
      });
    }
    
    const fullMessage = messageText + fileContent;
    
    if (!fullMessage && !isRetry) {
      return;
    }
    
    const currentKeys = isRetry ? keysRef.current : keys;
    const selectedKey = pickBestKey(currentKeys);
    
    if (!selectedKey) {
      setMessages(function(previousMessages) {
        return [...previousMessages, {
          role: "assistant",
          content: "🚫 خلصت كل المفاتيح النهارده يا صاحبي 😅\nارجع بكره أو زود مفاتيح جديدة 🖤",
          id: Date.now()
        }];
      });
      setLoading(false);
      return;
    }
    
    const userMessage = {
      role: "user",
      content: fullMessage,
      id: Date.now()
    };
    
    const updatedMessages = isRetry ? messages : [...messages, userMessage];
    
    if (!isRetry) {
      setMessages(updatedMessages);
      setInput("");
      setAttachedFiles([]);
    }
    
    setLoading(true);
    
    try {
      const cleanMessages = updatedMessages.map(function(message) {
        return {
          role: message.role,
          content: message.content
        };
      });
      
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + selectedKey.key
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...cleanMessages.slice(-40)
          ],
          temperature: 0.8,
          max_tokens: 2000,
          stream: false
        }),
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        if (responseData.error && responseData.error.code === "rate_limit_exceeded") {
          const updatedKeys = keysRef.current.map(function(key) {
            if (key.id === selectedKey.id) {
              return { ...key, used: DAILY_LIMIT_PER_KEY };
            }
            return key;
          });
          
          setKeys(updatedKeys);
          
          await saveKeysToSupabase(
            updatedKeys.map(function(key) {
              return { id: key.id, used: key.used };
            })
          );
          
          if (retryCountRef.current < 3) {
            retryCountRef.current = retryCountRef.current + 1;
            setTimeout(function() {
              sendMessage(messageText, true);
            }, 500);
            return;
          }
          
          retryCountRef.current = 0;
          
          setMessages(function(previousMessages) {
            return [...previousMessages, {
              role: "assistant",
              content: "كل المفاتيح وصلت للحد الأقصى النهارده 😅🖤\nجرب تاني بعد شوية أو زود مفاتيح جديدة.",
              id: Date.now()
            }];
          });
          
          setLoading(false);
          return;
        }
        
        throw new Error(responseData.error?.message || "خطأ غير معروف");
      }
      
      retryCountRef.current = 0;
      
      const realTokens = responseData.usage.total_tokens;
      
      const replyText = cleanResponse(
        responseData.choices?.[0]?.message?.content || ""
      );
      
      setMessages(function(previousMessages) {
        return [...previousMessages, {
          role: "assistant",
          content: replyText || "معلش، جرب تاني 🖤",
          id: Date.now()
        }];
      });
      
      const updatedKeys = keysRef.current.map(function(key) {
        if (key.id === selectedKey.id) {
          return { ...key, used: key.used + realTokens };
        }
        return key;
      });
      
      setKeys(updatedKeys);
      
      await saveKeysToSupabase(
        updatedKeys.map(function(key) {
          return { id: key.id, used: key.used };
        })
      );
      
    } catch (error) {
      setMessages(function(previousMessages) {
        return [...previousMessages, {
          role: "assistant",
          content: "مشكلة في الاتصال: " + error.message + " 🖤",
          id: Date.now()
        }];
      });
    } finally {
      setLoading(false);
      
      if (!isRetry) {
        setTimeout(function() {
          inputRef.current?.focus();
        }, 100);
      }
    }
  }
  
  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }
  
  // ========== حسابات العداد ==========
  
  const totalLimit = keys.length * DAILY_LIMIT_PER_KEY;
  const totalUsed = keys.reduce(function(sum, key) {
    return sum + key.used;
  }, 0);
  
  const tokenPercent = totalLimit > 0
    ? ((totalUsed / totalLimit) * 100).toFixed(1)
    : "0.0";
  
  const availableKeysCount = keys.filter(function(key) {
    return key.used < DAILY_LIMIT_PER_KEY;
  }).length;
  
  const tokenColor = tokenPercent < 50
    ? "#4ade80"
    : tokenPercent < 80
      ? "#facc15"
      : "#f87171";
  
  const isDark = theme === "dark";
  
  // ========== شاشة التحميل ==========
  
  if (!isLoaded) {
    return (
      <div style={{
        height: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0f0f1a",
        color: "#e0e0e0",
        fontFamily: "system-ui, sans-serif"
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "40px" }}>🖤</div>
          <div style={{ fontSize: "18px", marginTop: "10px" }}>جاري التحميل...</div>
        </div>
      </div>
    );
  }
  
  // ========== الواجهة الرئيسية ==========
  
  return (
    <div className={`container ${isDark ? "dark" : "light"}`}>
      {/* ========== الهيدر ========== */}
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
          <button
            onClick={function() { setShowMenu(!showMenu); }}
            className="header-btn"
            title="القائمة"
            style={{ fontSize: "22px" }}
          >
            {showMenu ? "✕" : "☰"}
          </button>
        </div>
        
        {/* ========== القائمة المنسدلة ========== */}
        {showMenu && (
          <>
            <div
              onClick={function() { setShowMenu(false); }}
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 200,
                background: "rgba(0,0,0,0.5)"
              }}
            />
            <div style={{
              position: "absolute",
              top: "60px",
              right: "10px",
              background: isDark ? "#1a1a2e" : "#ffffff",
              border: "1px solid " + (isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"),
              borderRadius: "16px",
              padding: "8px",
              zIndex: 201,
              display: "flex",
              flexDirection: "column",
              gap: "2px",
              minWidth: "240px",
              boxShadow: "0 10px 40px rgba(0,0,0,0.3)"
            }}>
              <button
                onClick={function() {
                  refreshKeys();
                  setShowMenu(false);
                }}
                className="menu-item"
              >
                🔑 تحديث المفاتيح
              </button>
              
              <button
                onClick={function() {
                  setShowKeyStats(!showKeyStats);
                  setShowMenu(false);
                }}
                className="menu-item"
              >
                📊 استهلاك المفاتيح
              </button>
              
              <button
                onClick={function() {
                  setShowHistory(!showHistory);
                  setShowMenu(false);
                }}
                className="menu-item"
              >
                💬 سجل المحادثات
              </button>
              
              <button
                onClick={function() {
                  clearAllChats();
                  setShowMenu(false);
                }}
                className="menu-item"
                style={{ color: "#f87171" }}
              >
                🗑️ حذف سجل المحادثات
              </button>
              
              <button
                onClick={function() {
                  setTheme(function(currentTheme) {
                    return currentTheme === "dark" ? "light" : "dark";
                  });
                  setShowMenu(false);
                }}
                className="menu-item"
              >
                {isDark ? "☀️ الوضع النهاري" : "🌙 الوضع الليلي"}
              </button>
            </div>
          </>
        )}
      </div>
      
      {/* ========== شريط التوكن ========== */}
      <div className="token-bar">
        <div className="token-info">
          <span>
            ⚡ {totalUsed.toLocaleString()} / {totalLimit.toLocaleString()} token ({availableKeysCount}/{keys.length} مفاتيح)
          </span>
          <span style={{ color: tokenColor }}>
            {tokenPercent}%
          </span>
        </div>
        <div className="token-track">
          <div
            className="token-fill"
            style={{ width: tokenPercent + "%", background: tokenColor }}
          />
        </div>
      </div>
      
      {/* ========== إحصائيات المفاتيح ========== */}
      {showKeyStats && (
        <div className="search-bar" style={{
          flexDirection: "column",
          alignItems: "stretch",
          gap: "8px",
          maxHeight: "250px",
          overflowY: "auto"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <strong>📊 استهلاك المفاتيح</strong>
            <button
              onClick={function() { setShowKeyStats(false); }}
              className="close-btn"
            >
              ✕
            </button>
          </div>
          
          {keys.map(function(key) {
            const keyPercent = ((key.used / DAILY_LIMIT_PER_KEY) * 100).toFixed(1);
            const keyColor = keyPercent < 50 ? "#4ade80" : keyPercent < 80 ? "#facc15" : "#f87171";
            const isExhausted = key.used >= DAILY_LIMIT_PER_KEY;
            
            return (
              <div key={key.id} style={{
                padding: "10px",
                borderRadius: "10px",
                background: isExhausted ? "rgba(248,113,113,0.1)" : "rgba(255,255,255,0.03)",
                border: "1px solid " + (isExhausted ? "rgba(248,113,113,0.3)" : "rgba(255,255,255,0.05)")
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "4px" }}>
                  <span>🔑 مفتاح {key.id}</span>
                  <span style={{ color: keyColor }}>
                    {key.used.toLocaleString()} / {DAILY_LIMIT_PER_KEY.toLocaleString()} ({keyPercent}%)
                  </span>
                </div>
                <div style={{
                  width: "100%",
                  height: "4px",
                  background: "rgba(255,255,255,0.1)",
                  borderRadius: "2px",
                  overflow: "hidden"
                }}>
                  <div style={{
                    width: keyPercent + "%",
                    height: "100%",
                    background: keyColor,
                    borderRadius: "2px"
                  }} />
                </div>
                {isExhausted && (
                  <div style={{ fontSize: "11px", color: "#f87171", marginTop: "4px" }}>
                    ⚠️ استنفذ الحد اليومي
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      
      {/* ========== سجل المحادثات ========== */}
      {showHistory && !showKeyStats && (
        <div className="search-bar" style={{
          flexDirection: "column",
          alignItems: "stretch",
          gap: "8px",
          maxHeight: "250px",
          overflowY: "auto"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <strong>📝 سجل المحادثات</strong>
            <button
              onClick={function() { setShowHistory(false); }}
              className="close-btn"
            >
              ✕
            </button>
          </div>
          
          {allChats.length === 0 ? (
            <div style={{ textAlign: "center", opacity: 0.6, padding: "10px", fontSize: "13px" }}>
              مفيش محادثات سابقة
            </div>
          ) : (
            allChats.map(function(chat) {
              return (
                <div
                  key={chat.id}
                  onClick={function() { openChat(chat.id); }}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 14px",
                    borderRadius: "12px",
                    cursor: "pointer",
                    background: chat.id === currentChatId
                      ? "rgba(108,92,231,0.2)"
                      : "rgba(255,255,255,0.03)",
                    border: chat.id === currentChatId
                      ? "1px solid rgba(108,92,231,0.4)"
                      : "1px solid transparent"
                  }}
                >
                  <div style={{ flex: 1, overflow: "hidden" }}>
                    <div style={{
                      fontSize: "14px",
                      fontWeight: 500,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis"
                    }}>
                      {chat.title}
                    </div>
                    <div style={{ fontSize: "11px", opacity: 0.5 }}>
                      {formatDate(chat.date)} · {chat.messageCount} رسالة
                    </div>
                  </div>
                  <button
                    onClick={function(event) { deleteSingleChat(chat.id, event); }}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "inherit",
                      fontSize: "16px",
                      cursor: "pointer",
                      padding: "4px 8px",
                      opacity: 0.5
                    }}
                  >
                    🗑️
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}
      
      {/* ========== الرسائل ========== */}
      <div className="messages">
        {messages.length <= 1 && !loading && (
          <div className="suggestions">
            {["عرفني بنفسك", "اكتبلي كود Python", "ساعدني اتخذ قرار", "قولي نكتة 😂", "اشرحلي مفهوم برمجي", "نصيحة في الإنتاجية"].map(function(suggestion, index) {
              return (
                <button
                  key={index}
                  onClick={function() { sendMessage(suggestion); }}
                  className="chip"
                >
                  {suggestion}
                </button>
              );
            })}
          </div>
        )}
        
        {messages.map(function(message) {
          return (
            <div
              key={message.id}
              className={`msg-row ${message.role === "user" ? "msg-row-user" : "msg-row-ai"}`}
            >
              {message.role === "assistant" && (
                <div className="avatar-small">🖤</div>
              )}
              
              <div className="msg-content-wrapper">
                <div className={`bubble ${
                  message.role === "user"
                    ? "bubble-user"
                    : isDark
                      ? "bubble-ai"
                      : "bubble-ai-light"
                }`}>
                  <MessageContent content={message.content} />
                </div>
                
                {message.role === "assistant" && (
                  <button
                    onClick={function() { copyMessage(message.content, message.id); }}
                    className="copy-msg-btn"
                  >
                    {copiedId === message.id ? "✓ تم النسخ" : "📋 نسخ"}
                  </button>
                )}
              </div>
              
              {message.role === "user" && (
                <div className="avatar-small avatar-user">👤</div>
              )}
            </div>
          );
        })}
        
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
      
      {/* ========== الملفات المرفقة ========== */}
      {attachedFiles.length > 0 && (
        <div style={{
          display: "flex",
          gap: "8px",
          padding: "8px 20px",
          flexWrap: "wrap",
          borderTop: "1px solid rgba(255,255,255,0.05)"
        }}>
          {attachedFiles.map(function(file) {
            return (
              <div
                key={file.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "rgba(108,92,231,0.15)",
                  border: "1px solid rgba(108,92,231,0.3)",
                  borderRadius: "10px",
                  padding: "6px 10px",
                  fontSize: "12px"
                }}
              >
                <span>{file.icon}</span>
                <span style={{
                  maxWidth: "120px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap"
                }}>
                  {file.name}
                </span>
                <button
                  onClick={function() { removeFile(file.id); }}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "inherit",
                    cursor: "pointer",
                    fontSize: "14px",
                    padding: "0 2px"
                  }}
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}
      
      {/* ========== منطقة الكتابة ========== */}
      <div className="input-area">
        <button
          onClick={function() { fileInputRef.current?.click(); }}
          className="header-btn"
          title="رفع ملفات"
          style={{ fontSize: "20px", padding: "8px" }}
        >
          📎
        </button>
        
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          multiple
          style={{ display: "none" }}
          accept=".txt,.js,.jsx,.ts,.tsx,.py,.html,.css,.json,.csv,.md,.xml,.yaml,.yml,.env,.gitignore,.pdf,image/*"
        />
        
        <textarea
          ref={inputRef}
          value={input}
          onChange={function(event) { setInput(event.target.value); }}
          onKeyDown={handleKeyDown}
          placeholder={loading ? "بلاك بيكتب..." : attachedFiles.length > 0 ? "اكتب سؤالك عن الملفات..." : "اكتب لبلاك..."}
          rows={1}
          className="textarea"
          disabled={loading}
        />
        
        <button
          onClick={function() { sendMessage(); }}
          className="send-btn"
          style={{
            opacity: (!input.trim() && attachedFiles.length === 0) || loading ? 0.4 : 1,
            background: loading ? "#f87171" : ""
          }}
        >
          {loading ? "⏳" : "↑"}
        </button>
      </div>
    </div>
  );
}
