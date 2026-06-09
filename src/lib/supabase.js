// ============================================
// supabase.js
// تهيئة اتصال Supabase
// ============================================

import { createClient } from '@supabase/supabase-js'

// المتغيرات من ملف .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY

// التحقق من وجود المتغيرات
if (!supabaseUrl || !supabaseKey) {
  console.error("❌ خطأ: متغيرات Supabase غير موجودة في ملف .env")
}

// إنشاء عميل Supabase
export const supabase = createClient(supabaseUrl, supabaseKey)

// دالة مساعدة للتحقق من الاتصال
export async function checkSupabaseConnection() {
  try {
    const { data, error } = await supabase.from('profiles').select('count', { count: 'exact', head: true })
    if (error) throw error
    return { success: true, message: "✅ الاتصال بقاعدة البيانات ناجح" }
  } catch (error) {
    return { success: false, message: "❌ فشل الاتصال: " + error.message }
  }
}
