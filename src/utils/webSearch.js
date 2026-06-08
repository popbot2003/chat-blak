export async function searchWeb(query) {
  try {
    const response = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`
    );
    const data = await response.json();
    
    const results = [];
    
    // الملخص الرئيسي
    if (data.Abstract && data.Abstract.length > 0) {
      results.push("📌 " + data.Abstract);
    }
    
    // النتائج المرتبطة
    if (data.RelatedTopics) {
      data.RelatedTopics.slice(0, 5).forEach(function(topic) {
        if (topic.Text) {
          results.push("• " + topic.Text);
        }
      });
    }
    
    // المصادر
    if (data.Results && data.Results.length > 0) {
      results.push("\n🔗 مصادر:");
      data.Results.slice(0, 3).forEach(function(result) {
        results.push("• " + result.FirstURL);
      });
    }
    
    return results.length > 0 ? results.join("\n\n") : null;
  } catch (err) {
    console.error("❌ searchWeb:", err);
    return null;
  }
}

export function shouldSearch(text) {
  const searchTriggers = [
    "؟", "ايه", "مين", "ازاي", "ليه", "فين", "امتى",
    "يعني", "شرح", "معلومات", "اخر", "جديد", "حديث",
    "سعر", "توقعات", "احصائية", "خبر", "حدث"
  ];
  
  return searchTriggers.some(function(trigger) {
    return text.includes(trigger);
  });
    }
