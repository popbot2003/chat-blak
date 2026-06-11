// ============================================
// groqValidator.js
// نظام التحقق من صحة مفاتيح Groq API
// ============================================

import { supabase } from '../lib/supabase';

// ──────────────────────────────────────────
// ثوابت
// ──────────────────────────────────────────

/** أقصى عدد مفاتيح تُفحص بشكل متوازٍ في نفس الوقت */
const CONCURRENCY_LIMIT = 5;

/** عدد محاولات إعادة التحديث في Supabase عند فشل الشبكة */
const DB_RETRY_ATTEMPTS = 3;

/** وقت الانتظار (ms) بين محاولات Supabase */
const DB_RETRY_DELAY_MS = 500;

// ──────────────────────────────────────────
// دوال مساعدة داخلية
// ──────────────────────────────────────────

/**
 * إخفاء المفتاح بشكل آمن للعرض فقط
 * مثال: gsk_AbCd...xYzW
 */
function maskKey(keyValue) {
  if (!keyValue || keyValue.length < 12) return '***';
  return keyValue.slice(0, 8) + '...' + keyValue.slice(-4);
}

/**
 * تحديث Supabase مع إعادة المحاولة عند فشل الشبكة
 */
async function updateKeyInDB(keyId, updateData, attempt = 1) {
  const { error } = await supabase
    .from('api_keys')
    .update(updateData)
    .eq('id', keyId);

  if (error) {
    if (attempt < DB_RETRY_ATTEMPTS) {
      await new Promise(res => setTimeout(res, DB_RETRY_DELAY_MS * attempt));
      return updateKeyInDB(keyId, updateData, attempt + 1);
    }
    // تسجيل الخطأ بدون بيانات حساسة
    console.error(`[groqValidator] فشل تحديث المفتاح id=${keyId} بعد ${attempt} محاولات:`, error.message);
  }
}

/**
 * تشغيل مجموعة من الـ promises بشكل متوازٍ مع تحديد حد أقصى
 */
async function runWithConcurrency(tasks, limit) {
  const results = new Array(tasks.length);
  let index = 0;

  async function worker() {
    while (index < tasks.length) {
      const current = index++;
      results[current] = await tasks[current]();
    }
  }

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, worker);
  await Promise.all(workers);
  return results;
}

// ──────────────────────────────────────────
// التحقق من مفتاح واحد
// ──────────────────────────────────────────

/**
 * التحقق من صحة مفتاح Groq API عن طريق الاتصال الفعلي بـ Groq.
 * لا يُسجَّل المفتاح نفسه في أي مكان.
 *
 * @param {string} apiKey
 * @returns {{ valid: boolean, reason?: string, message?: string, models?: string[], isTemporary?: boolean }}
 */
export async function validateGroqKey(apiKey) {
  if (!apiKey || typeof apiKey !== 'string' || !apiKey.startsWith('gsk_')) {
    return {
      valid: false,
      reason: 'مفتاح غير صالح (يجب أن يبدأ بـ gsk_)',
    };
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    switch (response.status) {
      case 200: {
        const data = await response.json();
        return {
          valid: true,
          message: '✅ المفتاح صالح',
          models: data.data?.map(m => m.id) ?? [],
        };
      }
      case 401:
        return {
          valid: false,
          isTemporary: false,
          reason: '❌ مفتاح غير صحيح أو محذوف من Groq',
        };
      case 429:
        // خطأ مؤقت — لا يعني أن المفتاح نفسه غير صالح
        return {
          valid: false,
          isTemporary: true,
          reason: '⚠️ تم تجاوز حد المعدل - حاول لاحقاً',
        };
      default:
        return {
          valid: false,
          isTemporary: false,
          reason: `❌ خطأ غير متوقع: ${response.status}`,
        };
    }
  } catch (error) {
    // تسجيل رسالة الخطأ فقط — بدون أي إشارة للمفتاح
    console.error('[groqValidator] فشل الاتصال بـ Groq:', error.message);
    return {
      valid: false,
      isTemporary: true,
      reason: `❌ فشل الاتصال: ${error.message}`,
    };
  }
}

// ──────────────────────────────────────────
// دالة الفحص الشاملة (داخلية)
// ──────────────────────────────────────────

/**
 * @param {{ includeInactive?: boolean }} options
 * @param {(done: number, total: number, keyName: string, result: object) => void} [onProgress]
 * @param {(results: object[]) => void} [onComplete]
 */
async function _validateKeys({ includeInactive = false } = {}, onProgress, onComplete) {
  let query = supabase.from('api_keys').select('*');
  if (!includeInactive) {
    query = query.eq('is_active', true);
  }

  const { data: keys, error } = await query;

  if (error) {
    console.error('[groqValidator] خطأ في جلب المفاتيح:', error.message);
    return [];
  }

  if (!keys?.length) return [];

  let done = 0;
  const results = [];

  const tasks = keys.map((key, _i) => async () => {
    const result = await validateGroqKey(key.key_value);

    const updateData = {
      last_checked_at: new Date().toISOString(),
      is_valid: result.valid,
      invalid_reason: result.valid ? null : result.reason,
    };

    // تعطيل المفتاح فقط إذا كان الفشل دائماً (ليس مؤقتاً كـ rate limit)
    if (!result.valid && !result.isTemporary && key.is_active) {
      updateData.is_active = false;
    }

    await updateKeyInDB(key.id, updateData);

    const resultEntry = {
      id: key.id,
      name: key.key_name || 'مفتاح بدون اسم',
      value: maskKey(key.key_value),        // ← آمن
      active: key.is_active,
      valid: result.valid,
      isTemporary: result.isTemporary ?? false,
      reason: result.reason,
      message: result.message,
    };

    results.push(resultEntry);

    done++;
    onProgress?.(done, keys.length, key.key_name, result);

    return resultEntry;
  });

  await runWithConcurrency(tasks, CONCURRENCY_LIMIT);

  onComplete?.(results);
  return results;
}

// ──────────────────────────────────────────
// الواجهات العامة
// ──────────────────────────────────────────

/**
 * فحص المفاتيح النشطة فقط
 */
export async function validateAllKeys(onProgress, onComplete) {
  return _validateKeys({ includeInactive: false }, onProgress, onComplete);
}

/**
 * فحص جميع المفاتيح بما فيها غير النشطة
 */
export async function validateAllKeysIncludingInactive(onProgress, onComplete) {
  return _validateKeys({ includeInactive: true }, onProgress, onComplete);
}

/**
 * اختبار مفتاح واحد وتحديث قاعدة البيانات.
 *
 * @param {string} keyId
 * @param {string} keyValue
 * @param {{ forceActivate?: boolean }} options
 *   forceActivate: إذا كانت true يُعاد تفعيل المفتاح عند النجاح.
 *                  افتراضياً false لتجنب إعادة تفعيل مفاتيح مُعطَّلة يدوياً.
 */
export async function testSingleKeyAndUpdate(keyId, keyValue, { forceActivate = false } = {}) {
  const result = await validateGroqKey(keyValue);

  const updateData = {
    last_checked_at: new Date().toISOString(),
    is_valid: result.valid,
    invalid_reason: result.valid ? null : result.reason,
  };

  // تعطيل فقط عند الفشل الدائم
  if (!result.valid && !result.isTemporary) {
    updateData.is_active = false;
  }

  // إعادة التفعيل تحتاج قراراً صريحاً من المستدعي
  if (result.valid && forceActivate) {
    updateData.is_active = true;
  }

  await updateKeyInDB(keyId, updateData);
  return result;
}

// ──────────────────────────────────────────
// Badge الحالة
// ──────────────────────────────────────────

/**
 * إرجاع بيانات الشارة المناسبة لمفتاح معين.
 *
 * @param {{ is_active: boolean, is_valid: boolean, used_today?: number, daily_limit?: number }} key
 * @returns {{ text: string, color: string, bg: string }}
 */
export function getKeyStatusBadge(key) {
  if (!key.is_active) {
    return { text: 'معطل', color: '#f87171', bg: 'rgba(248,113,113,0.15)' };
  }
  if (key.is_valid === false) {
    return { text: 'غير صالح', color: '#f87171', bg: 'rgba(248,113,113,0.15)' };
  }

  const usedToday  = key.used_today  ?? 0;
  const dailyLimit = key.daily_limit ?? 0;

  // إذا لم يُحدَّد حد يومي أو كان صفراً → نعرض "صالح" مباشرةً بدون نسبة مضللة
  if (dailyLimit <= 0) {
    return { text: '✅ صالح', color: '#4ade80', bg: 'rgba(74,222,128,0.15)' };
  }

  const percent = (usedToday / dailyLimit) * 100;

  if (percent >= 90) {
    return { text: '⚠️ حرج',            color: '#f97316', bg: 'rgba(249,115,22,0.15)'  };
  }
  if (percent >= 70) {
    return { text: '🟡 استهلاك عالي',   color: '#facc15', bg: 'rgba(250,204,21,0.15)'  };
  }
  return   { text: '✅ صالح',            color: '#4ade80', bg: 'rgba(74,222,128,0.15)'  };
}
