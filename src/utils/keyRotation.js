/**
 * 🔄 نظام التوزيع الذكي للمفاتيح (Smart Key Rotation System)
 * 
 * المميزات:
 * ✅ اختيار عشوائي من المفاتيح المتاحة
 * ✅ تجنب المفاتيح المعطلة والممتلئة
 * ✅ توزيع عادل على كل المفاتيح
 * ✅ تحديد أفضل مفتاح حسب الاستهلاك
 * ✅ دعم استراتيجيات متعددة (Random, LeastUsed, RoundRobin)
 * ✅ معالجة حالات الطوارئ والأخطاء
 */

import { supabase } from '../lib/supabase';

export class SmartKeyRotation {
  constructor() {
    this.strategies = {
      RANDOM: 'random',           // اختيار عشوائي
      LEAST_USED: 'least_used',   // الأقل استهلاكاً
      ROUND_ROBIN: 'round_robin'  // دوري
    };
    this.currentStrategy = this.strategies.RANDOM;
    this.roundRobinIndex = 0;
  }

  /**
   * اختيار أفضل مفتاح من القائمة المتاحة
   * 
   * @param {Array} keys - قائمة المفاتيح [{id, key, used, dailyLimit, is_active}, ...]
   * @param {string} strategy - الاستراتيجية (random, least_used, round_robin)
   * @returns {Object|null} أفضل مفتاح أو null
   */
  selectBestKey(keys = [], strategy = this.strategies.RANDOM) {
    if (!keys || keys.length === 0) {
      console.warn('⚠️ لا توجد مفاتيح متاحة');
      return null;
    }

    // تصفية المفاتيح المتاحة (نشطة وغير ممتلئة)
    const availableKeys = this.getAvailableKeys(keys);

    if (availableKeys.length === 0) {
      console.warn('❌ جميع المفاتيح ممتلئة أو معطلة');
      return null;
    }

    // اختيار حسب الاستراتيجية
    let selectedKey;
    switch (strategy) {
      case this.strategies.LEAST_USED:
        selectedKey = this.selectLeastUsedKey(availableKeys);
        break;
      case this.strategies.ROUND_ROBIN:
        selectedKey = this.selectRoundRobinKey(availableKeys);
        break;
      case this.strategies.RANDOM:
      default:
        selectedKey = this.selectRandomKey(availableKeys);
    }

    return selectedKey;
  }

  /**
   * تصفية المفاتيح المتاحة (نشطة وغير ممتلئة)
   */
  getAvailableKeys(keys) {
    return keys.filter(key => {
      // التحقق من أن المفتاح نشط
      if (!key.is_active) {
        console.log(`⚠️ المفتاح ${key.id} معطل`);
        return false;
      }

      // التحقق من عدم امتلاء الحد
      if (key.used >= key.dailyLimit) {
        console.log(`⚠️ المفتاح ${key.id} وصل حده (${key.used}/${key.dailyLimit})`);
        return false;
      }

      // التحقق من البيانات الأساسية
      if (!key.id || !key.key) {
        console.warn('⚠️ مفتاح بدون بيانات صحيحة');
        return false;
      }

      return true;
    });
  }

  /**
   * اختيار عشوائي من المفاتيح المتاحة
   * ✅ الأفضل للتوزيع العادل
   */
  selectRandomKey(availableKeys) {
    if (availableKeys.length === 0) return null;
    
    const randomIndex = Math.floor(Math.random() * availableKeys.length);
    const selectedKey = availableKeys[randomIndex];
    
    console.log(`🎲 اختيار مفتاح عشوائي: ${selectedKey.id} (${selectedKey.used}/${selectedKey.dailyLimit})`);
    
    return selectedKey;
  }

  /**
   * اختيار أقل المفاتيح استهلاكاً
   * ✅ الأفضل لموازنة ا��حمل
   */
  selectLeastUsedKey(availableKeys) {
    if (availableKeys.length === 0) return null;

    const leastUsed = availableKeys.reduce((min, key) => {
      const minPercentage = (min.used / min.dailyLimit) * 100;
      const keyPercentage = (key.used / key.dailyLimit) * 100;
      return keyPercentage < minPercentage ? key : min;
    });

    const percentage = ((leastUsed.used / leastUsed.dailyLimit) * 100).toFixed(1);
    console.log(`📊 اختيار أقل مفتاح استهلاكاً: ${leastUsed.id} (${percentage}%)`);

    return leastUsed;
  }

  /**
   * اختيار دوري (Round Robin)
   * ✅ الأفضل للتوزيع المنتظم
   */
  selectRoundRobinKey(availableKeys) {
    if (availableKeys.length === 0) return null;

    const selectedKey = availableKeys[this.roundRobinIndex % availableKeys.length];
    this.roundRobinIndex++;

    console.log(`🔄 اختيار دوري: ${selectedKey.id} (الترتيب: ${this.roundRobinIndex})`);

    return selectedKey;
  }

  /**
   * التحقق من صحة المفتاح
   */
  isKeyValid(key) {
    if (!key) return false;
    if (!key.is_active) return false;
    if (key.used >= key.dailyLimit) return false;
    if (!key.id || !key.key) return false;
    return true;
  }

  /**
   * التحقق من توفر مفاتيح
   */
  hasAvailableKeys(keys) {
    return this.getAvailableKeys(keys).length > 0;
  }

  /**
   * الحصول على إحصائيات المفاتيح
   */
  getKeysStats(keys) {
    const available = this.getAvailableKeys(keys);
    const disabled = keys.filter(k => !k.is_active);
    const full = keys.filter(k => k.is_active && k.used >= k.dailyLimit);

    const stats = {
      total: keys.length,
      available: available.length,
      disabled: disabled.length,
      full: full.length,
      average_usage: 0,
      total_capacity: 0,
      total_used: 0
    };

    if (keys.length > 0) {
      stats.total_capacity = keys.reduce((sum, k) => sum + k.dailyLimit, 0);
      stats.total_used = keys.reduce((sum, k) => sum + k.used, 0);
      stats.average_usage = (stats.total_used / stats.total_capacity * 100).toFixed(1);
    }

    return stats;
  }

  /**
   * اختيار البديل في حالة الطوارئ
   * (مفتاح قد يكون معطل لكن نحاول معه)
   */
  selectEmergencyKey(keys) {
    if (!keys || keys.length === 0) return null;

    // محاولة استخدام أي مفتاح نشط حتى لو وصل حده
    const activeKeys = keys.filter(k => k.is_active);
    if (activeKeys.length > 0) {
      return activeKeys[Math.floor(Math.random() * activeKeys.length)];
    }

    // كملاذ أخير، أي مفتاح موجود
    return keys[0] || null;
  }

  /**
   * ترتيب المفاتيح حسب الأداء
   */
  rankKeys(keys) {
    return keys
      .map(key => ({
        ...key,
        usage_percentage: key.dailyLimit > 0 ? (key.used / key.dailyLimit * 100).toFixed(1) : 0,
        remaining: key.dailyLimit - key.used,
        health: this.getKeyHealth(key)
      }))
      .sort((a, b) => {
        // ترتيب حسب الصحة أولاً
        const healthDiff = b.health - a.health;
        if (healthDiff !== 0) return healthDiff;
        
        // ثم حسب الاستهلاك
        return a.usage_percentage - b.usage_percentage;
      });
  }

  /**
   * حساب صحة المفتاح (0-100)
   */
  getKeyHealth(key) {
    if (!key.is_active) return 0;
    
    const usage = key.dailyLimit > 0 ? (key.used / key.dailyLimit) * 100 : 0;
    
    if (usage >= 100) return 0;      // ممتلئ
    if (usage >= 90) return 10;      // حرج
    if (usage >= 75) return 25;      // تحذير
    if (usage >= 50) return 50;      // م��وسط
    if (usage >= 25) return 75;      // جيد
    return 100;                       // ممتاز
  }

  /**
   * الحصول على توصية للمدير
   */
  getAdminRecommendation(keys) {
    const stats = this.getKeysStats(keys);
    const recommendations = [];

    if (stats.available === 0) {
      recommendations.push('🔴 جميع المفاتيح ممتلئة أو معطلة - أضف مفاتيح جديدة فوراً!');
    } else if (stats.available <= 1) {
      recommendations.push('⚠️ مفتاح واحد فقط متاح - أضف المزيد قريباً');
    }

    if (stats.disabled > 0) {
      recommendations.push(`⚠️ ${stats.disabled} مفتاح معطل - تحقق من الحالة`);
    }

    const avgUsage = parseFloat(stats.average_usage);
    if (avgUsage >= 80) {
      recommendations.push('🔥 الاستهلاك عالي جداً - قد تحتاج لمفاتيح إضافية');
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ كل شيء بحالة جيدة');
    }

    return recommendations;
  }

  /**
   * محاكاة استخدام المفتاح (للاختبار)
   */
  simulateKeyUsage(keys, tokensToAdd = 500) {
    const selectedKey = this.selectBestKey(keys);
    if (!selectedKey) {
      console.log('❌ لا يمكن محاكاة - لا توجد مفاتيح متاحة');
      return null;
    }

    const updatedKeys = keys.map(k => 
      k.id === selectedKey.id 
        ? { ...k, used: k.used + tokensToAdd }
        : k
    );

    console.log(`🧪 محاكاة: استخدام ${tokensToAdd} token من ${selectedKey.id}`);

    return { selectedKey, updatedKeys };
  }
}

// إنشاء instance للاستخدام
export const keyRotation = new SmartKeyRotation();

/**
 * دوال مساعدة سريعة
 */

/**
 * اختيار مفتاح عشوائي بسيط
 */
export function pickRandomKey(keys) {
  const available = keys.filter(k => k.is_active && k.used < k.dailyLimit);
  if (available.length === 0) return null;
  return available[Math.floor(Math.random() * available.length)];
}

/**
 * التحقق من توفر مفاتيح
 */
export function hasKeys(keys) {
  return keys && keys.filter(k => k.is_active && k.used < k.dailyLimit).length > 0;
}

/**
 * الحصول على عدد المفاتيح المتاحة
 */
export function getAvailableKeyCount(keys) {
  if (!keys) return 0;
  return keys.filter(k => k.is_active && k.used < k.dailyLimit).length;
}

/**
 * الحصول على إجمالي السعة المتبقية
 */
export function getRemainingCapacity(keys) {
  if (!keys) return 0;
  return keys.reduce((sum, k) => {
    if (!k.is_active) return sum;
    return sum + Math.max(0, k.dailyLimit - k.used);
  }, 0);
}
