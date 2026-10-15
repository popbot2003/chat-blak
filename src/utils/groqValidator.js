// ============================================
// groqValidator.js
// نظام التحقق من صحة مفاتيح Groq API
// ============================================

import { supabase } from '../lib/supabase';
import { DEFAULT_KEY_DAILY_LIMIT } from '../config/constants';

/**
 * التحقق من صحة مفتاح Groq API عن طريق الاتصال الفعلي بـ Groq
 *
 * النتيجة تحتوي على:
 *   valid     : هل المفتاح صالح للاستخدام
 *   transient : خطأ مؤقت (حد معدل، خطأ شبكة، خطأ من Groq) لا يدل على أن المفتاح معطّل
 */
export async function validateGroqKey(apiKey) {
  if (!apiKey || !apiKey.startsWith('gsk_')) {
    return {
      valid: false,
      transient: false,
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
        transient: false,
        message: '✅ المفتاح صالح',
        models: data.data?.map(m => m.id) || []
      };
    }

    if (response.status === 401) {
      return {
        valid: false,
        transient: false,
        reason: '❌ مفتاح غير صحيح أو محذوف من Groq'
      };
    }

    // 429: المفتاح صالح، لكنه وصل حد المعدل في هذه اللحظة
    if (response.status === 429) {
      return {
        valid: true,
        transient: true,
        message: '⚠️ المفتاح صالح لكنه وصل حد المعدل مؤقتًا',
        reason: '⚠️ تم تجاوز حد المعدل - حاول لاحقاً'
      };
    }

    return {
      valid: false,
      transient: response.status >= 500,
      reason: `❌ خطأ: ${response.status}`
    };

  } catch (error) {
    console.error('خطأ في التحقق من المفتاح:', error);
    return {
      valid: false,
      transient: true,
      reason: `❌ فشل الاتصال: ${error.message}`
    };
  }
}

/**
 * يبني بيانات التحديث لقاعدة البيانات.
 * الأخطاء المؤقتة لا تغيّر حالة المفتاح، نحدّث فقط وقت آخر فحص.
 */
function buildKeyUpdate(result) {
  const update = {
    last_checked_at: new Date().toISOString()
  };

  if (result.transient) {
    return update;
  }

  update.is_valid = result.valid;
  update.invalid_reason = result.valid ? null : result.reason;

  return update;
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

  const list = keys || [];
  const results = [];

  for (let i = 0; i < list.length; i++) {
    const key = list[i];
    const result = await validateGroqKey(key.key_value);

    const updateData = buildKeyUpdate(result);

    // تعطيل المفتاح فقط عند خطأ نهائي، لا عند خطأ مؤقت
    if (!result.valid && !result.transient) {
      updateData.is_active = false;
    }

    await supabase
      .from('api_keys')
      .update(updateData)
      .eq('id', key.id);

    results.push({
      id: key.id,
      name: key.key_name || 'مفتاح بدون اسم',
      value: (key.key_value || '').slice(0, 15) + '...',
      valid: result.valid,
      transient: result.transient,
      reason: result.reason,
      message: result.message
    });

    if (onProgress) {
      onProgress(i + 1, list.length, key.key_name, result);
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

  const list = keys || [];
  const results = [];

  for (let i = 0; i < list.length; i++) {
    const key = list[i];
    const result = await validateGroqKey(key.key_value);

    const updateData = buildKeyUpdate(result);

    if (!result.valid && !result.transient && key.is_active) {
      updateData.is_active = false;
    }

    await supabase
      .from('api_keys')
      .update(updateData)
      .eq('id', key.id);

    results.push({
      id: key.id,
      name: key.key_name || 'مفتاح بدون اسم',
      value: (key.key_value || '').slice(0, 15) + '...',
      active: key.is_active,
      valid: result.valid,
      transient: result.transient,
      reason: result.reason,
      message: result.message
    });

    if (onProgress) {
      onProgress(i + 1, list.length, key.key_name, result);
    }
  }

  if (onComplete) {
    onComplete(results);
  }

  return results;
}

/**
 * اختبار سريع لمفتاح واحد مع تحديث قاعدة البيانات.
 * لا يعيد تفعيل مفتاح عطّله المشرف يدويًا؛ التفعيل يبقى بقرار المشرف.
 */
export async function testSingleKeyAndUpdate(keyId, keyValue) {
  const result = await validateGroqKey(keyValue);

  const updateData = buildKeyUpdate(result);

  if (!result.valid && !result.transient) {
    updateData.is_active = false;
  }

  await supabase
    .from('api_keys')
    .update(updateData)
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

  // نفس الحد الافتراضي المستخدم في الخادم عند غياب daily_limit
  const limit = Number(key.daily_limit) > 0
    ? Number(key.daily_limit)
    : DEFAULT_KEY_DAILY_LIMIT;

  const percent = ((Number(key.used_today) || 0) / limit) * 100;

  if (percent >= 90) {
    return { text: '⚠️ حرج', color: '#f97316', bg: 'rgba(249,115,22,0.15)' };
  }
  if (percent >= 70) {
    return { text: '🟡 استهلاك عالي', color: '#facc15', bg: 'rgba(250,204,21,0.15)' };
  }
  return { text: '✅ صالح', color: '#4ade80', bg: 'rgba(74,222,128,0.15)' };
}
