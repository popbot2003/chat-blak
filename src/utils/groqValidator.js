// ============================================
// groqValidator.js
// نظام التحقق من صحة مفاتيح Groq API
// ============================================

import { supabase } from '../lib/supabase';

/**
 * التحقق من صحة مفتاح Groq API عن طريق الاتصال الفعلي بـ Groq
 */
export async function validateGroqKey(apiKey) {
  if (!apiKey || !apiKey.startsWith('gsk_')) {
    return { 
      valid: false, 
      reason: 'مفتاح غير صالح (يجب أن يبدأ بـ gsk_)' 
    };
  }

  try {
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
    
    const updateData = {
      last_checked_at: new Date().toISOString(),
      is_valid: result.valid,
      invalid_reason: result.valid ? null : result.reason,
    };

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
 * فحص جميع المفاتيح بما فيها غير النشطة
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
 * اختبار سريع لمفتاح واحد مع تحديث قاعدة البيانات
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
 * الحصول على حالة المفتاح النصية مع اللون المناسب
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
