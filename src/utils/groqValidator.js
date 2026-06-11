// ============================================
// groqValidator.js
// نظام التحقق من صحة مفاتيح Groq API
// ============================================

import { supabase } from '../lib/supabase';

/**
 * التحقق من صحة مفتاح Groq API عن طريق الاتصال الفعلي بـ Groq
 * @param {string} apiKey - مفتاح Groq API
 * @returns {Promise<{valid: boolean, reason?: string, message?: string}>}
 */
export async function validateGroqKey(apiKey) {
  if (!apiKey || !apiKey.startsWith('gsk_')) {
    return { 
      valid: false, 
      reason: 'مفتاح غير صالح (يجب أن يبدأ بـ gsk_)' 
    };
  }

  try {
    // استخدام endpoint /models للتحقق (لا يستهلك توكنات)
    const response = await fetch('https://api.groq.com/openai/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 200) {
      const data = await response.json();
      return { 
        valid: true, 
        message: '✅ المفتاح صالح',
        models: data.data?.map(m => m.id) || []
      };
    } 
    
    if (response.status === 401) {
      return { 
        valid: false, 
        reason: '❌ مفتاح غير صحيح أو محذوف من Groq' 
      };
    }
    
    if (response.status === 429) {
      return { 
        valid: false, 
        reason: '⚠️ تم تجاوز حد المعدل - حاول لاحقاً' 
      };
    }
    
    return { 
      valid: false, 
      reason: `❌ خطأ: ${response.status}` 
    };
    
  } catch (error) {
    console.error('خطأ في التحقق من المفتاح:', error);
    return { 
      valid: false, 
      reason: `❌ فشل الاتصال: ${error.message}` 
    };
  }
}

/**
 * فحص جميع المفاتيح النشطة في قاعدة البيانات
 * @param {Function} onProgress - دالة لتحديث التقدم (current, total, name, result)
 * @param {Function} onComplete - دالة عند الانتهاء (results)
 * @returns {Promise<Array>} نتائج الفحص
 */
export async function validateAllKeys(onProgress, onComplete) {
  const { data: keys, error } = await supabase
    .from('api_keys')
    .select('*')
    .eq('is_active', true);

  if (error) {
    console.error('خطأ في جلب المفاتيح:', error);
    return [];
  }

  const results = [];
  
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const result = await validateGroqKey(key.key_value);
    
    // تحديث قاعدة البيانات بنتيجة الفحص
    const updateData = {
      last_checked_at: new Date().toISOString(),
      is_valid: result.valid,
      invalid_reason: result.valid ? null : result.reason,
    };

    // إذا كان المفتاح غير صالح، نعطله تلقائياً
    if (!result.valid) {
      updateData.is_active = false;
    }

    await supabase
      .from('api_keys')
      .update(updateData)
      .eq('id', key.id);

    results.push({
      id: key.id,
      name: key.key_name || 'مفتاح بدون اسم',
      value: key.key_value?.slice(0, 15) + '...',
      valid: result.valid,
      reason: result.reason,
      message: result.message
    });

    // تحديث التقدم
    if (onProgress) {
      onProgress(i + 1, keys.length, key.key_name, result);
    }
  }

  // استدعاء دالة الانتهاء
  if (onComplete) {
    onComplete(results);
  }

  return results;
}

/**
 * بدء الفحص التلقائي الدوري
 * @param {number} intervalMinutes - الفاصل الزمني بالدقائق
 * @param {Function} onInvalidFound - دالة عند اكتشاف مفاتيح غير صالحة
 * @returns {number} معرف الـ interval
 */
export function startAutoValidation(intervalMinutes = 60, onInvalidFound) {
  // فحص فوري عند التشغيل (بعد 5 ثواني)
  const initialTimeout = setTimeout(() => {
    validateAllKeys(
      (current, total, name, result) => {
        console.log(`🔍 فحص ${name}: ${result.valid ? '✅' : '❌'}`);
      },
      (results) => {
        const invalid = results.filter(r => !r.valid);
        if (invalid.length > 0 && onInvalidFound) {
          onInvalidFound(invalid);
        }
      }
    );
  }, 5000);

  // فحص دوري
  const interval = setInterval(() => {
    validateAllKeys(
      (current, total, name, result) => {
        console.log(`🔍 فحص دوري ${current}/${total}: ${name}`);
      },
      (results) => {
        const invalid = results.filter(r => !r.valid);
        if (invalid.length > 0 && onInvalidFound) {
          onInvalidFound(invalid);
        }
      }
    );
  }, intervalMinutes * 60 * 1000);

  // حفظ كلا المعرفين للتنظيف
  const intervalId = setInterval(() => {}, 0);
  intervalId._timeout = initialTimeout;
  intervalId._interval = interval;
  
  return intervalId;
}

/**
 * إيقاف الفحص التلقائي
 * @param {number} intervalId - معرف الـ interval
 */
export function stopAutoValidation(intervalId) {
  if (intervalId) {
    if (intervalId._timeout) clearTimeout(intervalId._timeout);
    if (intervalId._interval) clearInterval(intervalId._interval);
    clearInterval(intervalId);
  }
}

/**
 * اختبار سريع لمفتاح واحد (مع تحديث قاعدة البيانات)
 * @param {string} keyId - معرف المفتاح
 * @param {string} keyValue - قيمة المفتاح
 * @returns {Promise<{valid: boolean, reason?: string}>}
 */
export async function testSingleKeyAndUpdate(keyId, keyValue) {
  const result = await validateGroqKey(keyValue);
  
  await supabase
    .from('api_keys')
    .update({
      last_checked_at: new Date().toISOString(),
      is_valid: result.valid,
      invalid_reason: result.valid ? null : result.reason,
      is_active: result.valid ? true : false
    })
    .eq('id', keyId);
  
  return result;
}
