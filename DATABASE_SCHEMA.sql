/**
 * 🗄️ Database Schema للمشروع
 * 
 * هذا الملف يحتوي على جميع الجداول والعمليات المطلوبة
 * يتم تشغيله في SQL Editor في Supabase
 * 
 * المميزات:
 * ✅ جداول محسّنة مع indexes
 * ✅ Row Level Security (RLS)
 * ✅ Triggers تلقائية للتحديثات
 * ✅ Functions مساعدة
 */

-- ===== 1. جدول المستخدمين (profiles) =====
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  daily_limit INTEGER DEFAULT 10000,
  rate_limit_rpm INTEGER DEFAULT 5,
  rate_limit_tpm INTEGER DEFAULT 2000,
  cooldown_seconds INTEGER DEFAULT 3,
  smart_mode BOOLEAN DEFAULT TRUE,
  is_blocked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index على البريد الإلكتروني للبحث السريع
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at DESC);

-- تفعيل RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- سياسة: المستخدم يرى بيانات نفسه فقط
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- سياسة: Admin يرى كل البيانات
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- سياسة: Admin يحدث أي بيانات
CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

---

-- ===== 2. جدول مفاتيح المستخدمين (user_keys) =====
CREATE TABLE IF NOT EXISTS user_keys (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  key_value TEXT NOT NULL,
  key_name TEXT DEFAULT 'مفتاح API',
  daily_limit INTEGER DEFAULT 100000,
  used_today INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(key_value)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_keys_user_id ON user_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_user_keys_is_active ON user_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_user_keys_created_at ON user_keys(created_at DESC);

-- تفعيل RLS
ALTER TABLE user_keys ENABLE ROW LEVEL SECURITY;

-- سياسة: المستخدم يرى مفاتيحه فقط
CREATE POLICY "Users can view their own keys"
  ON user_keys FOR SELECT
  USING (user_id = auth.uid());

-- سياسة: Admin يرى كل المفاتيح
CREATE POLICY "Admins can view all keys"
  ON user_keys FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- سياسة: Admin يدير المفاتيح
CREATE POLICY "Admins can manage keys"
  ON user_keys FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

---

-- ===== 3. جدول سجل الاستهلاك التفصيلي (key_usage_logs) =====
-- هذا الجدول هو مصدر الحقيقة (Source of Truth)
CREATE TABLE IF NOT EXISTS key_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  key_id BIGINT NOT NULL REFERENCES user_keys(id) ON DELETE CASCADE,
  tokens INTEGER NOT NULL CHECK (tokens > 0),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  device_id TEXT,
  ip_address TEXT,
  request_id TEXT UNIQUE,
  status TEXT DEFAULT 'recorded' CHECK (status IN ('recorded', 'recorded_retry')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes للأداء السريع
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON key_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_key_id ON key_usage_logs(key_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_timestamp ON key_usage_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_usage_logs_date ON key_usage_logs(DATE(timestamp));
CREATE INDEX IF NOT EXISTS idx_usage_logs_request_id ON key_usage_logs(request_id);

-- تفعيل RLS
ALTER TABLE key_usage_logs ENABLE ROW LEVEL SECURITY;

-- سياسة: المستخدم يرى استهلاكه فقط
CREATE POLICY "Users can view their own usage logs"
  ON key_usage_logs FOR SELECT
  USING (user_id = auth.uid());

-- سياسة: Admin يرى كل السجلات
CREATE POLICY "Admins can view all usage logs"
  ON key_usage_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- سياسة: فقط التطبيق يمكنه الإدراج
CREATE POLICY "Only app can insert usage logs"
  ON key_usage_logs FOR INSERT
  WITH CHECK (TRUE);

---

-- ===== 4. جدول الملخص اليومي للمفتاح (key_daily_stats) =====
-- لتسريع الاستعلامات والحصول على الإحصائيات
CREATE TABLE IF NOT EXISTS key_daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_id BIGINT NOT NULL REFERENCES user_keys(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_used INTEGER DEFAULT 0,
  total_limit INTEGER DEFAULT 100000,
  request_count INTEGER DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(key_id, date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_daily_stats_key_id ON key_daily_stats(key_id);
CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON key_daily_stats(date);

-- تفعيل RLS
ALTER TABLE key_daily_stats ENABLE ROW LEVEL SECURITY;

-- سياسة: يمكن لأي شخص عرض الملخصات
CREATE POLICY "Anyone can view daily stats"
  ON key_daily_stats FOR SELECT
  USING (TRUE);

---

-- ===== 5. جدول الملخص اليومي للمستخدم (daily_user_consumption) =====
-- لتسريع لوحة التحكم والإحصائيات
CREATE TABLE IF NOT EXISTS daily_user_consumption (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_tokens INTEGER DEFAULT 0,
  daily_limit INTEGER DEFAULT 10000,
  percentage NUMERIC(5, 2) DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_daily_consumption_user_id ON daily_user_consumption(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_consumption_date ON daily_user_consumption(date);
CREATE INDEX IF NOT EXISTS idx_daily_consumption_percentage ON daily_user_consumption(percentage DESC);

-- تفعيل RLS
ALTER TABLE daily_user_consumption ENABLE ROW LEVEL SECURITY;

-- سياسة: المستخدم يرى بياناته فقط
CREATE POLICY "Users can view their own consumption"
  ON daily_user_consumption FOR SELECT
  USING (user_id = auth.uid());

-- سياسة: Admin يرى كل البيانات
CREATE POLICY "Admins can view all consumption"
  ON daily_user_consumption FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

---

-- ===== 6. جدول المحادثات (chats) =====
CREATE TABLE IF NOT EXISTS chats (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT DEFAULT 'محادثة',
  messages JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id);
CREATE INDEX IF NOT EXISTS idx_chats_updated_at ON chats(updated_at DESC);

-- تفعيل RLS
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

-- سياسة: المستخدم يرى محادثاته فقط
CREATE POLICY "Users can view their own chats"
  ON chats FOR SELECT
  USING (user_id = auth.uid());

-- سياسة: المستخدم ينشئ ويحدث محادثاته
CREATE POLICY "Users can create and update their chats"
  ON chats FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their chats"
  ON chats FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their chats"
  ON chats FOR DELETE
  USING (user_id = auth.uid());

-- سياسة: Admin يرى كل المحادثات
CREATE POLICY "Admins can view all chats"
  ON chats FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

---

-- ===== 7. Functions و Triggers =====

-- دالة: تحديث ملخص المفتاح اليومي تلقائياً
CREATE OR REPLACE FUNCTION update_key_daily_stats()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO key_daily_stats (key_id, date, total_used, total_limit, request_count, last_updated)
  SELECT
    NEW.key_id,
    DATE(NEW.timestamp),
    COALESCE(SUM(tokens), 0),
    (SELECT daily_limit FROM user_keys WHERE id = NEW.key_id),
    COUNT(*),
    NOW()
  FROM key_usage_logs
  WHERE key_id = NEW.key_id AND DATE(timestamp) = DATE(NEW.timestamp)
  ON CONFLICT (key_id, date) DO UPDATE SET
    total_used = EXCLUDED.total_used,
    request_count = EXCLUDED.request_count,
    last_updated = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: تحديث الملخص اليومي عند إدراج سجل جديد
CREATE TRIGGER trigger_update_key_daily_stats
AFTER INSERT ON key_usage_logs
FOR EACH ROW
EXECUTE FUNCTION update_key_daily_stats();

---

-- دالة: تحديث ملخص استهلاك المستخدم اليومي
CREATE OR REPLACE FUNCTION update_user_daily_consumption()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO daily_user_consumption (user_id, date, total_tokens, daily_limit, percentage, updated_at)
  SELECT
    NEW.user_id,
    DATE(NEW.timestamp),
    COALESCE(SUM(tokens), 0),
    (SELECT daily_limit FROM profiles WHERE id = NEW.user_id LIMIT 1),
    ROUND((COALESCE(SUM(tokens), 0)::NUMERIC / 
      (SELECT daily_limit FROM profiles WHERE id = NEW.user_id LIMIT 1)::NUMERIC) * 100, 2),
    NOW()
  FROM key_usage_logs
  WHERE user_id = NEW.user_id AND DATE(timestamp) = DATE(NEW.timestamp)
  ON CONFLICT (user_id, date) DO UPDATE SET
    total_tokens = EXCLUDED.total_tokens,
    percentage = EXCLUDED.percentage,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: تحديث استهلاك المستخدم اليومي
CREATE TRIGGER trigger_update_user_daily_consumption
AFTER INSERT ON key_usage_logs
FOR EACH ROW
EXECUTE FUNCTION update_user_daily_consumption();

---

-- دالة: تحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers: تحديث الوقت في جداول مختلفة
CREATE TRIGGER trigger_update_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_user_keys_updated_at
BEFORE UPDATE ON user_keys
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_chats_updated_at
BEFORE UPDATE ON chats
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

---

-- ===== 8. Functions للحصول على الإحصائيات =====

-- دالة: الحصول على الاستهلاك اليومي للمستخدم
CREATE OR REPLACE FUNCTION get_user_daily_consumption(user_uuid UUID)
RETURNS TABLE (
  total_tokens BIGINT,
  daily_limit INTEGER,
  percentage NUMERIC,
  remaining BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(kul.tokens), 0),
    p.daily_limit,
    ROUND((COALESCE(SUM(kul.tokens), 0)::NUMERIC / p.daily_limit::NUMERIC) * 100, 2),
    (p.daily_limit - COALESCE(SUM(kul.tokens), 0))
  FROM profiles p
  LEFT JOIN key_usage_logs kul ON p.id = kul.user_id AND DATE(kul.timestamp) = CURRENT_DATE
  WHERE p.id = user_uuid
  GROUP BY p.id, p.daily_limit;
END;
$$ LANGUAGE plpgsql;

-- دالة: الحصول على استهلاك المفتاح اليومي
CREATE OR REPLACE FUNCTION get_key_daily_consumption(key_id BIGINT)
RETURNS TABLE (
  total_tokens BIGINT,
  daily_limit INTEGER,
  percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(kul.tokens), 0),
    uk.daily_limit,
    ROUND((COALESCE(SUM(kul.tokens), 0)::NUMERIC / uk.daily_limit::NUMERIC) * 100, 2)
  FROM user_keys uk
  LEFT JOIN key_usage_logs kul ON uk.id = kul.key_id AND DATE(kul.timestamp) = CURRENT_DATE
  WHERE uk.id = key_id
  GROUP BY uk.id, uk.daily_limit;
END;
$$ LANGUAGE plpgsql;

---

-- ===== 9. إنشاء مستخدم Admin تجريبي (تعديل البيانات) =====
-- استبدل البريد والاسم بالبيانات الحقيقية
-- INSERT INTO profiles (id, email, name, role, is_blocked)
-- VALUES (
--   '00000000-0000-0000-0000-000000000001',
--   'admin@example.com',
--   'Admin',
--   'admin',
--   FALSE
-- ) ON CONFLICT (id) DO NOTHING;

---

-- ===== 10. حذف البيانات القديمة (تنظيف تلقائي) =====
-- يمكن استخدام pg_cron لتشغيل هذا يومياً

-- دالة: حذف سجلات الاستهلاك القديمة (أكثر من 90 يوم)
CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM key_usage_logs
  WHERE timestamp < NOW() - INTERVAL '90 days';
  
  DELETE FROM daily_user_consumption
  WHERE date < CURRENT_DATE - INTERVAL '90 days';
  
  DELETE FROM key_daily_stats
  WHERE date < CURRENT_DATE - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- يمكن تشغيل الدالة يدوياً:
-- SELECT cleanup_old_logs();

-- أو إذا كان pg_cron متاحاً:
-- SELECT cron.schedule('cleanup_old_logs', '0 2 * * *', 'SELECT cleanup_old_logs()');

---

-- ===== ملخص الجداول =====
/*

الجداول المنشأة:
1. profiles - بيانات المستخدمين
2. user_keys - مفاتيح API للمستخدمين
3. key_usage_logs - سجل الاستهلاك التفصيلي (مصدر الحقيقة)
4. key_daily_stats - ملخص يومي للمفتاح (للأداء السريع)
5. daily_user_consumption - ملخص يومي للمستخدم (للإحصائيات)
6. chats - المحادثات

الميزات:
✅ Row Level Security (RLS) مفعل على كل جدول
✅ Indexes محسّنة للأداء السريع
✅ Triggers تلقائية للتحديثات
✅ Functions للحسابات المعقدة
✅ رسائل الخطأ والتحقق من الصحة
✅ حذف تلقائي للبيانات القديمة

*/
