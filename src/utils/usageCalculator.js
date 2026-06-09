/**
 * 📊 حاسبة الاستهلاك ونسب الاستخدام (Usage Calculator)
 * 
 * المميزات:
 * ✅ حساب نسب الاستهلاك بالمية (%)
 * ✅ توليد تقارير تفصيلية
 * ✅ تقييم صحة الاستهلاك
 * ✅ توقعات الانتهاء
 * ✅ تحذيرات ذكية
 * ✅ إحصائيات متقدمة
 */

/**
 * حساب نسبة الاستهلاك بالمية
 * @param {number} used - المستخدم
 * @param {number} limit - الحد الكلي
 * @returns {Object} {percentage, remaining, consumed, status}
 */
export function calculatePercentage(used = 0, limit = 10000) {
  if (limit <= 0) return { percentage: 0, remaining: 0, consumed: 0, status: 'invalid' };

  const percentage = (used / limit) * 100;
  const remaining = Math.max(0, limit - used);
  const consumed = Math.min(used, limit);

  return {
    percentage: parseFloat(percentage.toFixed(2)),
    remaining,
    consumed,
    status: getStatus(percentage),
    color: getStatusColor(percentage)
  };
}

/**
 * تحديد حالة الاستهلاك
 */
function getStatus(percentage) {
  if (percentage >= 100) return 'ممتلئ';
  if (percentage >= 90) return 'حرج';
  if (percentage >= 75) return 'تحذير';
  if (percentage >= 50) return 'متوسط';
  if (percentage >= 25) return 'جيد';
  return 'ممتاز';
}

/**
 * اللون المناسب للحالة
 */
function getStatusColor(percentage) {
  if (percentage >= 100) return '#ef4444'; // أحمر
  if (percentage >= 90) return '#dc2626';  // أحمر داكن
  if (percentage >= 75) return '#f59e0b'; // برتقالي
  if (percentage >= 50) return '#eab308'; // أصفر
  return '#22c55e';                       // أخضر
}

/**
 * حساب الاستهلاك الإجمالي للمستخدم
 */
export function getTotalUserConsumption(user, keys = []) {
  if (!user || !keys) {
    return {
      total: 0,
      daily_limit: 10000,
      percentage: 0,
      keys_count: 0,
      error: 'بيانات ناقصة'
    };
  }

  const dailyLimit = user.daily_limit || 10000;
  const totalUsed = keys.reduce((sum, key) => sum + (key.used || 0), 0);
  const percentage = calculatePercentage(totalUsed, dailyLimit).percentage;

  return {
    total: totalUsed,
    daily_limit: dailyLimit,
    percentage: percentage,
    remaining: dailyLimit - totalUsed,
    keys_count: keys.length,
    active_keys: keys.filter(k => k.is_active).length,
    empty_keys: keys.filter(k => k.used >= k.dailyLimit).length,
    status: getStatus(percentage),
    color: getStatusColor(percentage)
  };
}

/**
 * توليد تقرير استهلاك تفصيلي
 */
export function generateDetailedReport(user, keys = [], usage = {}) {
  const totalConsumption = getTotalUserConsumption(user, keys);

  const keyDetails = keys.map(key => {
    const keyUsage = calculatePercentage(key.used, key.daily_limit);
    return {
      id: key.id,
      name: key.key_name || 'بدون اسم',
      daily_limit: key.daily_limit,
      used: key.used,
      percentage: keyUsage.percentage,
      remaining: keyUsage.remaining,
      status: keyUsage.status,
      color: keyUsage.color,
      is_active: key.is_active,
      created_at: key.created_at,
      health: getKeyHealth(key)
    };
  });

  // ترتيب المفاتيح حسب الاستهلاك
  const sortedKeys = keyDetails.sort((a, b) => b.percentage - a.percentage);

  return {
    user_name: user.name,
    user_email: user.email,
    summary: totalConsumption,
    keys: sortedKeys,
    stats: {
      most_used_key: sortedKeys[0] || null,
      least_used_key: sortedKeys[sortedKeys.length - 1] || null,
      average_usage: sortedKeys.length > 0 
        ? (sortedKeys.reduce((sum, k) => sum + k.percentage, 0) / sortedKeys.length).toFixed(2)
        : 0
    },
    warnings: generateWarnings(totalConsumption, sortedKeys),
    recommendations: generateRecommendations(totalConsumption, sortedKeys),
    generated_at: new Date().toISOString()
  };
}

/**
 * توليد التحذيرات
 */
function generateWarnings(consumption, keys) {
  const warnings = [];

  if (consumption.percentage >= 100) {
    warnings.push({
      level: 'critical',
      message: '🔴 لقد وصلت إلى الحد الأقصى من الاستهلاك',
      icon: '⛔'
    });
  } else if (consumption.percentage >= 90) {
    warnings.push({
      level: 'danger',
      message: '🔴 أنت في منطقة الخطر (90%+)',
      icon: '⚠️'
    });
  } else if (consumption.percentage >= 75) {
    warnings.push({
      level: 'warning',
      message: '🟠 الاستهلاك مرتفع (75%+)',
      icon: '⚡'
    });
  }

  const fullKeys = keys.filter(k => k.used >= k.daily_limit);
  if (fullKeys.length > 0) {
    warnings.push({
      level: 'warning',
      message: `🟠 ${fullKeys.length} مفتاح ممتلئ`,
      icon: '🔑'
    });
  }

  const disabledKeys = keys.filter(k => !k.is_active);
  if (disabledKeys.length > 0) {
    warnings.push({
      level: 'info',
      message: `ℹ️ ${disabledKeys.length} مفتاح معطل`,
      icon: '🚫'
    });
  }

  return warnings;
}

/**
 * توليد التوصيات
 */
function generateRecommendations(consumption, keys) {
  const recommendations = [];

  if (consumption.percentage >= 80) {
    recommendations.push('💡 استخدم المفاتيح بحذر أكثر لتجنب انقطاع الخدمة');
  }

  if (consumption.percentage >= 90) {
    recommendations.push('📞 تواصل مع المسؤول لزيادة حدك اليومي');
  }

  if (consumption.percentage >= 100) {
    recommendations.push('🛑 استقف فوراً - لقد انتهى حدك اليومي');
  }

  const mostUsedKey = keys[0];
  if (mostUsedKey && mostUsedKey.percentage > 80) {
    recommendations.push(`⚖️ يتم استخدام المفتاح "${mostUsedKey.name}" بكثرة - حاول موازنة الاستخدام`);
  }

  const availableKeys = keys.filter(k => k.is_active && k.used < k.daily_limit);
  if (availableKeys.length <= 1) {
    recommendations.push('⚠️ لديك مفتاح واحد فقط متاح - أخبر المسؤول');
  }

  return recommendations;
}

/**
 * حساب صحة المفتاح
 */
function getKeyHealth(key) {
  if (!key.is_active) return { health: 0, label: 'معطل' };

  const usage = key.daily_limit > 0 ? (key.used / key.daily_limit) * 100 : 0;

  if (usage >= 100) return { health: 0, label: 'ممتلئ' };
  if (usage >= 90) return { health: 10, label: 'حرج' };
  if (usage >= 75) return { health: 25, label: 'تحذير' };
  if (usage >= 50) return { health: 50, label: 'متوسط' };
  if (usage >= 25) return { health: 75, label: 'جيد' };
  return { health: 100, label: 'ممتاز' };
}

/**
 * توقع متى ينتهي الحد (بناءً على معدل الاستهلاك)
 */
export function estimateEndTime(used, dailyLimit, hoursElapsed = 1) {
  if (hoursElapsed <= 0 || dailyLimit <= 0) {
    return { hours_remaining: 0, will_end_today: false, end_time: null };
  }

  const hourlyRate = used / hoursElapsed;
  const remaining = dailyLimit - used;
  const hoursRemaining = hourlyRate > 0 ? remaining / hourlyRate : Infinity;

  const now = new Date();
  const endTime = new Date(now.getTime() + hoursRemaining * 60 * 60 * 1000);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const willEndToday = endTime <= endOfDay;

  return {
    hours_remaining: Math.floor(hoursRemaining),
    minutes_remaining: Math.floor((hoursRemaining * 60) % 60),
    will_end_today: willEndToday,
    end_time: endTime.toISOString(),
    hourly_rate: Math.floor(hourlyRate),
    message: willEndToday 
      ? `سينتهي الحد اليوم الساعة ${endTime.toLocaleTimeString('ar-EG')}`
      : `سينتهي الحد بعد ${Math.floor(hoursRemaining)} ساعة`
  };
}

/**
 * مقارنة استهلاك المستخدم مع المتوسط
 */
export function compareWithAverage(userConsumption, allUsers = []) {
  if (allUsers.length === 0) {
    return {
      user_percentage: userConsumption.percentage,
      average_percentage: 0,
      rank: 'لا توجد بيانات مقارنة'
    };
  }

  const percentages = allUsers.map(u => calculatePercentage(u.total, u.daily_limit).percentage);
  const averagePercentage = percentages.reduce((a, b) => a + b, 0) / percentages.length;

  const rank = percentages.filter(p => p > userConsumption.percentage).length + 1;
  const totalUsers = percentages.length;

  return {
    user_percentage: userConsumption.percentage,
    average_percentage: parseFloat(averagePercentage.toFixed(2)),
    rank,
    total_users: totalUsers,
    percentile: ((rank / totalUsers) * 100).toFixed(0),
    comparison: userConsumption.percentage > averagePercentage 
      ? `أعلى من المتوسط بـ ${(userConsumption.percentage - averagePercentage).toFixed(2)}%`
      : `أقل من المتوسط بـ ${(averagePercentage - userConsumption.percentage).toFixed(2)}%`
  };
}

/**
 * توليد ملخص يومي
 */
export function generateDailySummary(users = [], keys = []) {
  const summaries = users.map(user => {
    const userKeys = keys.filter(k => k.user_id === user.id);
    const consumption = getTotalUserConsumption(user, userKeys);
    return {
      user_id: user.id,
      user_name: user.name,
      ...consumption
    };
  });

  const totalConsumption = summaries.reduce((sum, s) => sum + s.total, 0);
  const totalLimit = summaries.reduce((sum, s) => sum + s.daily_limit, 0);
  const averageUsage = summaries.length > 0 
    ? (totalConsumption / totalLimit * 100).toFixed(2)
    : 0;

  return {
    summary_date: new Date().toISOString().split('T')[0],
    total_users: users.length,
    total_consumption: totalConsumption,
    total_limit: totalLimit,
    average_usage: parseFloat(averageUsage),
    top_users: summaries
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 5),
    critical_users: summaries.filter(s => s.percentage >= 80),
    all_summaries: summaries
  };
}

/**
 * تحويل الأرقام إلى صيغة مقروءة
 */
export function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
  return num.toString();
}

/**
 * تحويل التاريخ إلى صيغة عربية
 */
export function formatArabicDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * الحصول على إحصائيات سريعة للـ Dashboard
 */
export function getQuickStats(users = [], keys = []) {
  const totalUsers = users.length;
  const totalKeys = keys.length;
  const activeKeys = keys.filter(k => k.is_active).length;
  const fullKeys = keys.filter(k => k.used >= k.daily_limit).length;

  const allConsumption = users.map(u => {
    const userKeys = keys.filter(k => k.user_id === u.id);
    return getTotalUserConsumption(u, userKeys);
  });

  const criticalUsers = allConsumption.filter(c => c.percentage >= 80).length;
  const totalTokensUsed = allConsumption.reduce((sum, c) => sum + c.total, 0);

  return {
    total_users: totalUsers,
    total_keys: totalKeys,
    active_keys: activeKeys,
    full_keys: fullKeys,
    critical_users: criticalUsers,
    total_tokens_used: totalTokensUsed,
    system_health: calculateSystemHealth(allConsumption),
    alert_count: criticalUsers + fullKeys
  };
}

/**
 * حساب صحة النظام العامة
 */
function calculateSystemHealth(consumptions = []) {
  if (consumptions.length === 0) return 100;

  const avgUsage = consumptions.reduce((sum, c) => sum + c.percentage, 0) / consumptions.length;
  const criticalCount = consumptions.filter(c => c.percentage >= 80).length;
  
  let health = 100;
  health -= avgUsage; // تقليل بناءً على الاستهلاك العام
  health -= (criticalCount * 5); // تقليل إضافي لكل مستخدم حرج

  return Math.max(0, Math.min(100, Math.floor(health)));
}
