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
 * فحص جميع المفاتيح (بما فيها غير النشطة) - للاستخدام اليدوي المتقدم
 * @param {Function} onProgress - دالة لتحديث التقدم
 * @param {Function} onComplete - دالة عند الانتهاء
 * @returns {Promise<Array>} نتائج الفحص
 */
export async function validateAllKeysIncludingInactive(onProgress, onComplete) {
  const { data: keys, error } = await supabase
    .from('api_keys')
    .select('*');

  if (error) {
    console.error('خطأ في جلب المفاتيح:', error);
    return [];
  }

  const results = [];
  
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const result = await validateGroqKey(key.key_value);
    
    const updateData = {
      last_checked_at: new Date().toISOString(),
      is_valid: result.valid,
      invalid_reason: result.valid ? null : result.reason,
    };

    if (!result.valid && key.is_active) {
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
      active: key.is_active,
      valid: result.valid,
      reason: result.reason,
      message: result.message
    });

    if (onProgress) {
      onProgress(i + 1, keys.length, key.key_name, result);
    }
  }

  if (onComplete) {
    onComplete(results);
  }

  return results;
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

/**
 * بدء الفحص التلقائي الدوري
 * @param {number} intervalMinutes - الفاصل الزمني بالدقائق
 * @param {Function} onInvalidFound - دالة عند اكتشاف مفاتيح غير صالحة
 * @returns {Object} { intervalId, timeoutId, stop: function }
 */
export function startAutoValidation(intervalMinutes = 60, onInvalidFound) {
  let timeoutId = null;
  let intervalId = null;
  let isRunning = true;

  const runValidation = async () => {
    if (!isRunning) return;
    
    const results = await validateAllKeys(
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
    
    return results;
  };

  // فحص فوري بعد 5 ثواني
  timeoutId = setTimeout(() => {
    runValidation();
    
    // ثم فحص دوري
    intervalId = setInterval(() => {
      runValidation();
    }, intervalMinutes * 60 * 1000);
  }, 5000);

  // دالة لإيقاف الفحص
  const stop = () => {
    isRunning = false;
    if (timeoutId) clearTimeout(timeoutId);
    if (intervalId) clearInterval(intervalId);
  };

  return { stop, intervalId, timeoutId };
}

/**
 * الحصول على حالة المفتاح النصية مع اللون المناسب
 * @param {Object} key - كائن المفتاح من قاعدة البيانات
 * @returns {{text: string, color: string, bg: string}}
 */
export function getKeyStatusBadge(key) {
  if (!key.is_active) {
    return { text: 'معطل', color: '#f87171', bg: 'rgba(248,113,113,0.15)' };
  }
  if (key.is_valid === false) {
    return { text: 'غير صالح', color: '#f87171', bg: 'rgba(248,113,113,0.15)' };
  }
  const percent = (key.used_today || 0) / (key.daily_limit || 1) * 100;
  if (percent >= 90) {
    return { text: '⚠️ حرج', color: '#f97316', bg: 'rgba(249,115,22,0.15)' };
  }
  if (percent >= 70) {
    return { text: '🟡 استهلاك عالي', color: '#facc15', bg: 'rgba(250,204,21,0.15)' };
  }
  return { text: '✅ صالح', color: '#4ade80', bg: 'rgba(74,222,128,0.15)' };
}
