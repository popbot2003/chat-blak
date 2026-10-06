-- ============================================================
-- Chat-Blak
-- DATABASE_SCHEMA.sql
--
-- Purpose:
--   Reference snapshot of the live public schema.
--
-- Source:
--   Live Supabase database snapshot: 2026-10-06T22:20:04.653618+00:00
--   This file is documentation/reference; it is NOT a migration.
--
-- Scope:
--   public schema objects only. Supabase-managed schemas such as
--   auth, storage, realtime, vault, etc. are intentionally not
--   recreated here.
-- ============================================================

-- ============================================================
-- SEQUENCES
-- ============================================================
CREATE SEQUENCE public.admin_notifications_id_seq;
CREATE SEQUENCE public.api_keys_id_seq;
CREATE SEQUENCE public.key_check_logs_id_seq;
CREATE SEQUENCE public.org_discoveries_id_seq;
CREATE SEQUENCE public.task_logs_id_seq;
CREATE SEQUENCE public.usage_tracking_id_seq;

-- ============================================================
-- TABLES
-- ============================================================
CREATE TABLE public.admin_notifications (
    id bigint NOT NULL DEFAULT nextval('admin_notifications_id_seq'::regclass),
    user_id uuid,
    type text NOT NULL,
    title text NOT NULL,
    message text,
    data jsonb,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT admin_notifications_pkey PRIMARY KEY (id)
);

CREATE TABLE public.api_keys (
    id bigint NOT NULL DEFAULT nextval('api_keys_id_seq'::regclass),
    key_value text NOT NULL,
    key_name text DEFAULT 'مفتاح Groq'::text,
    daily_limit integer DEFAULT 1000000,
    used_today integer DEFAULT 0,
    last_reset_date date DEFAULT CURRENT_DATE,
    is_active boolean DEFAULT true,
    is_valid boolean DEFAULT true,
    invalid_reason text,
    last_checked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    org_id text,
    org_used_today bigint DEFAULT 0,
    org_daily_limit bigint DEFAULT 200000,
    rate_limited_until timestamp with time zone,
    last_rate_limit_at timestamp with time zone,
    reset_at timestamp with time zone,
    last_synced_at timestamp with time zone,
    failure_count integer DEFAULT 0,
    preferred_model text DEFAULT 'openai/gpt-oss-120b'::text,
    tpm_limit bigint DEFAULT 8000,
    rpm_limit bigint DEFAULT 30,
    used_requests_minute bigint DEFAULT 0,
    requests_reset_at timestamp with time zone,
    last_request_at timestamp with time zone,
    tpd_limit bigint DEFAULT 200000,
    rpd_limit bigint DEFAULT 1000,
    used_requests_today bigint DEFAULT 0,
    requests_reset_daily_at timestamp with time zone,
    used_tpm_minute bigint DEFAULT 0,
    used_tpd_today bigint DEFAULT 0,
    effective_tpd_limit bigint,
    CONSTRAINT api_keys_pkey PRIMARY KEY (id)
);

CREATE TABLE public.app_settings (
    key text NOT NULL,
    value jsonb NOT NULL,
    description text,
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT app_settings_pkey PRIMARY KEY (key)
);

CREATE TABLE public.chats (
    id text NOT NULL,
    user_id uuid,
    title text DEFAULT 'محادثة'::text,
    messages jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT chats_pkey PRIMARY KEY (id)
);

CREATE TABLE public.key_check_logs (
    id bigint NOT NULL DEFAULT nextval('key_check_logs_id_seq'::regclass),
    check_type text DEFAULT 'manual'::text,
    total_keys integer DEFAULT 0,
    valid_keys integer DEFAULT 0,
    invalid_keys integer DEFAULT 0,
    details jsonb,
    checked_at timestamp with time zone DEFAULT now(),
    CONSTRAINT key_check_logs_pkey PRIMARY KEY (id)
);

CREATE TABLE public.key_usage_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    key_id bigint,
    tokens integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT key_usage_logs_pkey PRIMARY KEY (id)
);

CREATE TABLE public.org_discoveries (
    id bigint NOT NULL DEFAULT nextval('org_discoveries_id_seq'::regclass),
    key_id text NOT NULL,
    org_id text NOT NULL,
    discovered_at timestamp with time zone DEFAULT now(),
    task_id text,
    notified boolean DEFAULT false,
    notes text,
    CONSTRAINT org_discoveries_pkey PRIMARY KEY (id)
);

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text NOT NULL,
    name text NOT NULL DEFAULT 'مستخدم'::text,
    role text DEFAULT 'user'::text,
    gender text DEFAULT 'ولد'::text,
    personality text DEFAULT 'blak'::text,
    daily_limit integer DEFAULT 50000,
    used_today integer DEFAULT 0,
    last_reset_date date DEFAULT CURRENT_DATE,
    last_login_date date,
    last_seen timestamp with time zone DEFAULT now(),
    is_blocked boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    plan text DEFAULT 'free'::text,
    custom_max_steps integer,
    custom_retry_wait_seconds integer,
    custom_max_concurrent_tasks integer,
    CONSTRAINT profiles_pkey PRIMARY KEY (id),
    CONSTRAINT profiles_email_key UNIQUE (email)
);

CREATE TABLE public.task_logs (
    id bigint NOT NULL DEFAULT nextval('task_logs_id_seq'::regclass),
    task_id uuid,
    event text NOT NULL,
    details jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT task_logs_pkey PRIMARY KEY (id)
);

CREATE TABLE public.task_steps (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    task_id uuid NOT NULL,
    step_index integer NOT NULL,
    title text,
    status text NOT NULL DEFAULT 'pending'::text,
    output text,
    error text,
    retry_count integer DEFAULT 0,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    key_used_id text,
    key_used_at timestamp with time zone DEFAULT now(),
    CONSTRAINT task_steps_pkey PRIMARY KEY (id),
    CONSTRAINT task_steps_task_id_step_index_key UNIQUE (task_id, step_index)
);

CREATE TABLE public.tasks (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    status text NOT NULL DEFAULT 'pending'::text,
    input text NOT NULL,
    plan jsonb,
    current_step integer DEFAULT 0,
    total_steps integer DEFAULT 0,
    result text,
    error text,
    retry_count integer DEFAULT 0,
    next_retry_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    context_summary text,
    summary_updated_at_step integer DEFAULT 0,
    chat_id text,
    planning_key_id text,
    merging_key_id text,
    CONSTRAINT tasks_pkey PRIMARY KEY (id)
);

CREATE TABLE public.usage_tracking (
    id bigint NOT NULL DEFAULT nextval('usage_tracking_id_seq'::regclass),
    key_id text NOT NULL,
    org_id text,
    model text,
    prompt_tokens integer DEFAULT 0,
    completion_tokens integer DEFAULT 0,
    total_tokens integer DEFAULT 0,
    task_id text,
    step_index integer,
    purpose text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT usage_tracking_pkey PRIMARY KEY (id)
);

CREATE TABLE public.user_usage_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid,
    tokens integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT user_usage_logs_pkey PRIMARY KEY (id)
);

-- ============================================================
-- CHECK CONSTRAINTS
-- ============================================================
ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_gender_check
    CHECK ((gender = ANY (ARRAY['ولد'::text, 'بنت'::text])));

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_plan_check
    CHECK ((plan = ANY (ARRAY['free'::text, 'pro'::text, 'enterprise'::text])));

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_role_check
    CHECK ((role = ANY (ARRAY['user'::text, 'admin'::text])));

ALTER TABLE ONLY public.task_steps
    ADD CONSTRAINT task_steps_status_check
    CHECK ((status = ANY (ARRAY['pending'::text, 'running'::text, 'completed'::text, 'failed'::text])));

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_status_check
    CHECK ((status = ANY (ARRAY['pending'::text, 'planning'::text, 'running'::text, 'waiting'::text, 'merging'::text, 'completed'::text, 'failed'::text, 'cancelled'::text])));

-- ============================================================
-- FOREIGN KEYS
-- ============================================================
ALTER TABLE ONLY public.chats
    ADD CONSTRAINT chats_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.key_usage_logs
    ADD CONSTRAINT key_usage_logs_key_id_fkey
    FOREIGN KEY (key_id) REFERENCES public.api_keys(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.task_logs
    ADD CONSTRAINT task_logs_task_id_fkey
    FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.task_steps
    ADD CONSTRAINT task_steps_task_id_fkey
    FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_usage_logs
    ADD CONSTRAINT user_usage_logs_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- ============================================================
-- INDEXES
-- ============================================================
CREATE UNIQUE INDEX admin_notifications_pkey ON public.admin_notifications USING btree (id);
CREATE INDEX idx_admin_notifications_user ON public.admin_notifications USING btree (user_id, is_read);
CREATE UNIQUE INDEX api_keys_pkey ON public.api_keys USING btree (id);
CREATE INDEX idx_api_keys_org_id ON public.api_keys USING btree (org_id);
CREATE INDEX idx_api_keys_rate_limited ON public.api_keys USING btree (rate_limited_until);
CREATE UNIQUE INDEX app_settings_pkey ON public.app_settings USING btree (key);
CREATE UNIQUE INDEX chats_pkey ON public.chats USING btree (id);
CREATE INDEX idx_chats_updated_at ON public.chats USING btree (updated_at DESC);
CREATE INDEX idx_chats_user_id ON public.chats USING btree (user_id);
CREATE UNIQUE INDEX key_check_logs_pkey ON public.key_check_logs USING btree (id);
CREATE INDEX idx_key_usage_key_id ON public.key_usage_logs USING btree (key_id);
CREATE UNIQUE INDEX key_usage_logs_pkey ON public.key_usage_logs USING btree (id);
CREATE INDEX idx_org_discoveries_org ON public.org_discoveries USING btree (org_id);
CREATE UNIQUE INDEX org_discoveries_pkey ON public.org_discoveries USING btree (id);
CREATE INDEX idx_profiles_email ON public.profiles USING btree (email);
CREATE INDEX idx_profiles_role ON public.profiles USING btree (role);
CREATE UNIQUE INDEX profiles_email_key ON public.profiles USING btree (email);
CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);
CREATE INDEX idx_task_logs_created_at ON public.task_logs USING btree (created_at DESC);
CREATE INDEX idx_task_logs_task_id ON public.task_logs USING btree (task_id);
CREATE UNIQUE INDEX task_logs_pkey ON public.task_logs USING btree (id);
CREATE INDEX idx_task_steps_status ON public.task_steps USING btree (status);
CREATE INDEX idx_task_steps_task_id ON public.task_steps USING btree (task_id);
CREATE UNIQUE INDEX task_steps_pkey ON public.task_steps USING btree (id);
CREATE UNIQUE INDEX task_steps_task_id_step_index_key ON public.task_steps USING btree (task_id, step_index);
CREATE INDEX idx_tasks_created_at ON public.tasks USING btree (created_at DESC);
CREATE INDEX idx_tasks_next_retry ON public.tasks USING btree (next_retry_at) WHERE (status = ANY (ARRAY['pending'::text, 'waiting'::text]));
CREATE INDEX idx_tasks_status ON public.tasks USING btree (status);
CREATE INDEX idx_tasks_user_id ON public.tasks USING btree (user_id);
CREATE UNIQUE INDEX tasks_pkey ON public.tasks USING btree (id);
CREATE INDEX idx_usage_key_date ON public.usage_tracking USING btree (key_id, created_at);
CREATE INDEX idx_usage_org_date ON public.usage_tracking USING btree (org_id, created_at);
CREATE INDEX idx_usage_purpose ON public.usage_tracking USING btree (purpose, created_at);
CREATE UNIQUE INDEX usage_tracking_pkey ON public.usage_tracking USING btree (id);
CREATE INDEX idx_user_usage_user_id ON public.user_usage_logs USING btree (user_id);
CREATE UNIQUE INDEX user_usage_logs_pkey ON public.user_usage_logs USING btree (id);

-- ============================================================
-- FUNCTIONS
-- ============================================================
CREATE OR REPLACE FUNCTION public.cancel_task(target_task_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.tasks
  SET status = 'cancelled',
      completed_at = NOW()
  WHERE id = target_task_id
    AND user_id = auth.uid()
    AND status IN ('pending','planning','running','waiting');

  IF FOUND THEN
    INSERT INTO public.task_logs (task_id, event, details)
    VALUES (target_task_id, 'cancelled_by_user', '{}'::jsonb);
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_task(task_input text, chat_id_input text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_task_id     UUID;
  settings        JSONB;
  max_days        INTEGER;
  active_count    INTEGER;
  max_concurrent  INTEGER;
  enabled         BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'غير مصرح';
  END IF;

  settings := public.get_effective_settings(auth.uid());

  IF settings IS NULL THEN
    RAISE EXCEPTION 'المستخدم غير موجود';
  END IF;

  enabled := COALESCE((settings->>'task_creation_enabled')::boolean, true);

  IF NOT enabled THEN
    RAISE EXCEPTION 'إنشاء المهام معطّل حاليًا';
  END IF;

  max_concurrent := COALESCE((settings->>'max_concurrent_tasks_per_user')::int, 3);

  SELECT COUNT(*) INTO active_count
  FROM public.tasks
  WHERE user_id = auth.uid()
    AND status IN ('pending','planning','running','waiting','merging');

  IF active_count >= max_concurrent THEN
    RAISE EXCEPTION 'وصلت للحد الأقصى من المهام المتزامنة (%).', max_concurrent;
  END IF;

  max_days := COALESCE((settings->>'max_task_duration_days')::int, 7);

  INSERT INTO public.tasks (
    user_id,
    input,
    chat_id,
    status,
    expires_at,
    next_retry_at
  )
  VALUES (
    auth.uid(),
    task_input,
    chat_id_input,
    'pending',
    NOW() + (max_days || ' days')::interval,
    NOW()
  )
  RETURNING id INTO new_task_id;

  INSERT INTO public.task_logs (task_id, event, details)
  VALUES (
    new_task_id,
    'created',
    jsonb_build_object(
      'input_length',
      length(task_input),
      'chat_id',
      chat_id_input
    )
  );

  RETURN new_task_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_user_auth()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  DELETE FROM auth.users WHERE id = OLD.id;
  RETURN OLD;
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_user_by_id(target_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  user_email TEXT;
  user_name TEXT;
BEGIN
  -- التحقق من وجود المستخدم
  SELECT email, name INTO user_email, user_name 
  FROM profiles WHERE id = target_user_id;
  
  IF user_email IS NULL THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'المستخدم غير موجود'
    );
  END IF;
  
  -- 1. حذف جميع المحادثات
  DELETE FROM chats WHERE user_id = target_user_id;
  
  -- 2. حذف سجلات الاستهلاك
  DELETE FROM user_usage_logs WHERE user_id = target_user_id;
  
  -- 3. حذف الملف الشخصي (بدون trigger)
  -- نستخدم EXECUTE لتجنب trigger
  EXECUTE 'DELETE FROM profiles WHERE id = $1' USING target_user_id;
  
  -- 4. حذف المستخدم من auth.users مباشرة
  DELETE FROM auth.users WHERE id = target_user_id;
  
  RETURN jsonb_build_object(
    'success', true, 
    'message', 'تم حذف المستخدم بنجاح',
    'user', user_name,
    'email', user_email
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', SQLERRM
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_profile_defaults_on_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF public.is_admin() THEN
        RETURN NEW;
    END IF;

    NEW.role        := 'user';
    NEW.plan        := 'free';
    NEW.is_blocked  := false;
    NEW.used_today  := 0;
    NEW.daily_limit := 50000;

    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_effective_settings(target_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_row     RECORD;
  settings_row RECORD;
  result       JSONB := '{}'::jsonb;
BEGIN
  SELECT custom_max_steps, custom_retry_wait_seconds, custom_max_concurrent_tasks, plan
  INTO user_row
  FROM public.profiles
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  FOR settings_row IN SELECT key, value FROM public.app_settings LOOP
    result := result || jsonb_build_object(settings_row.key, settings_row.value);
  END LOOP;

  -- Override with user-specific values when set
  IF user_row.custom_max_steps IS NOT NULL THEN
    result := result || jsonb_build_object('max_steps', to_jsonb(user_row.custom_max_steps));
  END IF;

  IF user_row.custom_retry_wait_seconds IS NOT NULL THEN
    result := result || jsonb_build_object('retry_wait_seconds', to_jsonb(user_row.custom_retry_wait_seconds));
  END IF;

  IF user_row.custom_max_concurrent_tasks IS NOT NULL THEN
    result := result || jsonb_build_object('max_concurrent_tasks_per_user', to_jsonb(user_row.custom_max_concurrent_tasks));
  END IF;

  result := result || jsonb_build_object('plan', to_jsonb(user_row.plan));

  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.increment_key_usage(key_id text, tokens_used integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    numeric_key_id bigint;
BEGIN
    numeric_key_id := key_id::bigint;

    UPDATE public.api_keys
    SET
        used_today = CASE
            WHEN last_reset_date < CURRENT_DATE THEN tokens_used
            ELSE used_today + tokens_used
        END,
        last_reset_date = CURRENT_DATE
    WHERE id = numeric_key_id;

    INSERT INTO public.key_usage_logs (key_id, tokens)
    VALUES (numeric_key_id, tokens_used);
END;
$function$;

CREATE OR REPLACE FUNCTION public.increment_user_usage(user_id uuid, tokens_used integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    today DATE := CURRENT_DATE;
BEGIN
    -- وضع علامة مؤقتة بأن التحديث صادر من دالة الاستخدام الموثوقة
    PERFORM set_config(
        'app.increment_user_usage',
        'true',
        true
    );

    -- تصفير الاستخدام إذا بدأ يوم جديد
    UPDATE public.profiles
    SET
        used_today = 0,
        last_reset_date = today
    WHERE id = user_id
      AND last_reset_date < today;

    -- إضافة التوكنز المستخدمة
    UPDATE public.profiles
    SET
        used_today = used_today + tokens_used
    WHERE id = user_id;

    -- تسجيل العملية في السجل
    INSERT INTO public.user_usage_logs (
        user_id,
        tokens
    )
    VALUES (
        user_id,
        tokens_used
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$function$;

CREATE OR REPLACE FUNCTION public.mark_org_rate_limited(p_key_id text, p_org_id text, p_until timestamp with time zone)
 RETURNS void
 LANGUAGE plpgsql
AS $function$ BEGIN UPDATE api_keys SET org_id = p_org_id, rate_limited_until = p_until, last_rate_limit_at = NOW() WHERE id = p_key_id::bigint; UPDATE api_keys SET rate_limited_until = p_until WHERE org_id = p_org_id AND id != p_key_id::bigint; END; $function$;

CREATE OR REPLACE FUNCTION public.notify_admin(p_type text, p_title text, p_message text, p_data jsonb DEFAULT NULL::jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$ BEGIN INSERT INTO admin_notifications (type, title, message, data) VALUES (p_type, p_title, p_message, p_data); END; $function$;

CREATE OR REPLACE FUNCTION public.protect_sensitive_profile_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    IF public.is_admin() THEN
        RETURN NEW;
    END IF;

    IF current_setting('app.increment_user_usage', true) = 'true' THEN
        NEW.role          := OLD.role;
        NEW.plan          := OLD.plan;
        NEW.daily_limit   := OLD.daily_limit;
        NEW.is_blocked    := OLD.is_blocked;
        NEW.id            := OLD.id;
        NEW.email         := OLD.email;
        NEW.created_at    := OLD.created_at;
        NEW.custom_max_steps              := OLD.custom_max_steps;
        NEW.custom_retry_wait_seconds     := OLD.custom_retry_wait_seconds;
        NEW.custom_max_concurrent_tasks   := OLD.custom_max_concurrent_tasks;
        RETURN NEW;
    END IF;

    NEW.role          := OLD.role;
    NEW.plan          := OLD.plan;
    NEW.daily_limit   := OLD.daily_limit;
    NEW.is_blocked    := OLD.is_blocked;
    NEW.used_today    := OLD.used_today;
    NEW.last_reset_date := OLD.last_reset_date;
    NEW.id            := OLD.id;
    NEW.email         := OLD.email;
    NEW.created_at    := OLD.created_at;
    NEW.custom_max_steps              := OLD.custom_max_steps;
    NEW.custom_retry_wait_seconds     := OLD.custom_retry_wait_seconds;
    NEW.custom_max_concurrent_tasks   := OLD.custom_max_concurrent_tasks;

    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.reset_daily_usage()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  today DATE := CURRENT_DATE;
BEGIN
  UPDATE profiles
  SET used_today = 0, last_reset_date = today
  WHERE last_reset_date < today;

  UPDATE api_keys
  SET used_today = 0, last_reset_date = today
  WHERE last_reset_date < today;
END;
$function$;

CREATE OR REPLACE FUNCTION public.reset_key_counters(p_key_id text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$ BEGIN UPDATE api_keys SET used_requests_minute = 0, requests_reset_at = NOW() + INTERVAL '60 seconds' WHERE id = p_key_id::bigint AND (requests_reset_at IS NULL OR requests_reset_at < NOW()); END; $function$;

CREATE OR REPLACE FUNCTION public.update_key_usage(p_key_id text, p_tokens bigint, p_requests bigint DEFAULT 1)
 RETURNS void
 LANGUAGE plpgsql
AS $function$ BEGIN UPDATE api_keys SET used_today = COALESCE(used_today, 0) + p_tokens, used_requests_minute = COALESCE(used_requests_minute, 0) + p_requests, used_requests_today = COALESCE(used_requests_today, 0) + p_requests, last_request_at = NOW() WHERE id = p_key_id::bigint; END; $function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- ============================================================
-- TRIGGERS
-- ============================================================
CREATE TRIGGER trigger_update_chats_updated_at
BEFORE UPDATE ON public.chats
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER on_profile_delete
AFTER DELETE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION delete_user_auth();

CREATE TRIGGER trigger_enforce_profile_defaults_on_insert
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION enforce_profile_defaults_on_insert();

CREATE TRIGGER trigger_protect_profile_fields
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION protect_sensitive_profile_fields();

CREATE TRIGGER trigger_update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_tasks_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.key_check_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.key_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_discoveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_usage_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES
-- ============================================================
CREATE POLICY keys_admin_all
ON public.api_keys
AS PERMISSIVE
FOR ALL
TO public
USING (is_admin())
;

CREATE POLICY app_settings_admin
ON public.app_settings
AS PERMISSIVE
FOR ALL
TO public
USING (is_admin())
;

CREATE POLICY app_settings_select
ON public.app_settings
AS PERMISSIVE
FOR SELECT
TO public
USING ((auth.uid() IS NOT NULL))
;

CREATE POLICY chats_delete
ON public.chats
AS PERMISSIVE
FOR DELETE
TO public
USING (((user_id = auth.uid()) OR is_admin()))
;

CREATE POLICY chats_insert
ON public.chats
AS PERMISSIVE
FOR INSERT
TO public
WITH CHECK ((user_id = auth.uid()))
;

CREATE POLICY chats_select
ON public.chats
AS PERMISSIVE
FOR SELECT
TO public
USING (((user_id = auth.uid()) OR is_admin()))
;

CREATE POLICY chats_update
ON public.chats
AS PERMISSIVE
FOR UPDATE
TO public
USING ((user_id = auth.uid()))
;

CREATE POLICY check_logs_all
ON public.key_check_logs
AS PERMISSIVE
FOR ALL
TO public
USING (is_admin())
;

CREATE POLICY key_logs_insert
ON public.key_usage_logs
AS PERMISSIVE
FOR INSERT
TO public
WITH CHECK ((auth.uid() IS NOT NULL))
;

CREATE POLICY key_logs_select
ON public.key_usage_logs
AS PERMISSIVE
FOR SELECT
TO public
USING (is_admin())
;

CREATE POLICY profiles_delete
ON public.profiles
AS PERMISSIVE
FOR DELETE
TO public
USING (((auth.uid() = id) OR is_admin()))
;

CREATE POLICY profiles_insert
ON public.profiles
AS PERMISSIVE
FOR INSERT
TO public
WITH CHECK ((auth.uid() = id))
;

CREATE POLICY profiles_select
ON public.profiles
AS PERMISSIVE
FOR SELECT
TO public
USING (((auth.uid() = id) OR is_admin()))
;

CREATE POLICY profiles_update
ON public.profiles
AS PERMISSIVE
FOR UPDATE
TO public
USING (((auth.uid() = id) OR is_admin()))
;

CREATE POLICY task_logs_admin_all
ON public.task_logs
AS PERMISSIVE
FOR ALL
TO public
USING (is_admin())
;

CREATE POLICY task_logs_select
ON public.task_logs
AS PERMISSIVE
FOR SELECT
TO public
USING ((EXISTS ( SELECT 1
   FROM tasks
  WHERE ((tasks.id = task_logs.task_id) AND ((tasks.user_id = auth.uid()) OR is_admin())))))
;

CREATE POLICY task_steps_admin_all
ON public.task_steps
AS PERMISSIVE
FOR ALL
TO public
USING (is_admin())
;

CREATE POLICY task_steps_select
ON public.task_steps
AS PERMISSIVE
FOR SELECT
TO public
USING ((EXISTS ( SELECT 1
   FROM tasks
  WHERE ((tasks.id = task_steps.task_id) AND ((tasks.user_id = auth.uid()) OR is_admin())))))
;

CREATE POLICY tasks_admin_all
ON public.tasks
AS PERMISSIVE
FOR ALL
TO public
USING (is_admin())
;

CREATE POLICY tasks_delete
ON public.tasks
AS PERMISSIVE
FOR DELETE
TO public
USING (((user_id = auth.uid()) OR is_admin()))
;

CREATE POLICY tasks_insert
ON public.tasks
AS PERMISSIVE
FOR INSERT
TO public
WITH CHECK ((user_id = auth.uid()))
;

CREATE POLICY tasks_select
ON public.tasks
AS PERMISSIVE
FOR SELECT
TO public
USING (((user_id = auth.uid()) OR is_admin()))
;

CREATE POLICY tasks_update
ON public.tasks
AS PERMISSIVE
FOR UPDATE
TO public
USING (((user_id = auth.uid()) OR is_admin()))
;

CREATE POLICY usage_logs_insert
ON public.user_usage_logs
AS PERMISSIVE
FOR INSERT
TO public
WITH CHECK ((user_id = auth.uid()))
;

CREATE POLICY usage_logs_select
ON public.user_usage_logs
AS PERMISSIVE
FOR SELECT
TO public
USING (((user_id = auth.uid()) OR is_admin()))
;

-- ============================================================
-- VIEWS
-- ============================================================
CREATE OR REPLACE VIEW public.v_key_usage_today AS
SELECT k.id AS key_id,
    k.org_id,
    k.used_today,
    k.daily_limit,
    (k.daily_limit - k.used_today) AS remaining,
    round((((k.used_today)::numeric / (NULLIF(k.daily_limit, 0))::numeric) * (100)::numeric), 2) AS usage_pct,
    count(ut.id) AS requests_today,
    sum(ut.total_tokens) AS tokens_today,
    max(ut.created_at) AS last_used_at
   FROM (api_keys k
     LEFT JOIN usage_tracking ut ON (((ut.key_id = (k.id)::text) AND (ut.created_at >= CURRENT_DATE))))
  WHERE (k.is_active = true)
  GROUP BY k.id, k.org_id, k.used_today, k.daily_limit;

CREATE OR REPLACE VIEW public.v_org_usage_today AS
SELECT org_id,
    count(DISTINCT key_id) AS keys_count,
    sum(tokens_today) AS total_tokens,
    sum(requests_today) AS total_requests,
    max(daily_limit) AS org_limit,
    ((max(daily_limit))::numeric - sum(tokens_today)) AS remaining,
    round(((sum(tokens_today) / (NULLIF(max(daily_limit), 0))::numeric) * (100)::numeric), 2) AS usage_pct
   FROM v_key_usage_today
  WHERE (org_id IS NOT NULL)
  GROUP BY org_id;

CREATE OR REPLACE VIEW public.v_purpose_usage_today AS
SELECT purpose,
    count(*) AS requests_count,
    sum(total_tokens) AS total_tokens,
    round(avg(total_tokens), 2) AS avg_tokens_per_request
   FROM usage_tracking
  WHERE (created_at >= CURRENT_DATE)
  GROUP BY purpose;

-- ============================================================
-- ENUMS / CUSTOM TYPES
-- ============================================================
-- No public enum types or additional custom PostgreSQL types
-- were present in the inspected snapshot.

-- ============================================================
-- RLS SUMMARY
-- ============================================================
-- RLS is enabled on all 13 public application tables.
-- FORCE ROW LEVEL SECURITY is false for all of them.

-- ============================================================
-- SNAPSHOT NOTES
-- ============================================================
-- Tables: 13
-- Columns (tables only): 139
-- Indexes: 36
-- Functions: 16
-- Triggers: 6
-- RLS policies: 25
-- Foreign keys: 7
-- Views: 3
-- Sequences: 6
-- Privilege rows captured in source snapshot: 448
--
-- Runtime row counts and table sizes are intentionally not encoded
-- as DDL because they are runtime statistics, not schema structure.
--
-- The privilege result was captured in the introspection snapshot
-- but is not replayed as GRANT statements in this reference file.
-- ============================================================
