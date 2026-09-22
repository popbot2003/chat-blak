-- ============================================================
-- Chat-Blak
-- DATABASE_SCHEMA_CURRENT.sql
--
-- Purpose:
--   Reference snapshot of the CURRENT public database schema.
--
-- Important:
--   This file is a documentation snapshot, not the mechanism used
--   to manage future database changes.
--   Future structural changes should be recorded as migrations.
--
-- Source:
--   Extracted from the live Supabase database during September 2026.
-- ============================================================


-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE public.api_keys (
    id bigint NOT NULL,
    key_value text NOT NULL,
    key_name text DEFAULT 'مفتاح Groq'::text,
    daily_limit integer DEFAULT 1000000,
    used_today integer DEFAULT 0,
    last_reset_date date DEFAULT CURRENT_DATE,
    is_active boolean DEFAULT true,
    is_valid boolean DEFAULT true,
    invalid_reason text,
    last_checked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.chats (
    id text NOT NULL,
    user_id uuid,
    title text DEFAULT 'محادثة'::text,
    messages jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.key_check_logs (
    id bigint NOT NULL,
    check_type text DEFAULT 'manual'::text,
    total_keys integer DEFAULT 0,
    valid_keys integer DEFAULT 0,
    invalid_keys integer DEFAULT 0,
    details jsonb,
    checked_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.key_usage_logs (
    id uuid NOT NULL,
    key_id bigint,
    tokens integer NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text NOT NULL,
    name text NOT NULL DEFAULT 'مستخدم'::text,
    role text DEFAULT 'user'::text,
    gender text DEFAULT 'ولد'::text,
    personality text DEFAULT 'blak'::text,
    daily_limit integer DEFAULT 30000,
    used_today integer DEFAULT 0,
    last_reset_date date DEFAULT CURRENT_DATE,
    last_login_date date,
    last_seen timestamp with time zone DEFAULT now(),
    is_blocked boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.user_usage_logs (
    id uuid NOT NULL,
    user_id uuid,
    tokens integer NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


-- ============================================================
-- SEQUENCES
-- ============================================================

CREATE SEQUENCE public.api_keys_id_seq;

CREATE SEQUENCE public.key_check_logs_id_seq;


-- ============================================================
-- PRIMARY KEYS / UNIQUE CONSTRAINTS
-- ============================================================

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.chats
    ADD CONSTRAINT chats_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.key_check_logs
    ADD CONSTRAINT key_check_logs_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.key_usage_logs
    ADD CONSTRAINT key_usage_logs_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_email_key UNIQUE (email);

ALTER TABLE ONLY public.user_usage_logs
    ADD CONSTRAINT user_usage_logs_pkey PRIMARY KEY (id);


-- ============================================================
-- CHECK / NOT NULL CONSTRAINTS
-- ============================================================

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT "2200_19103_1_not_null" CHECK (id IS NOT NULL);

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT "2200_19103_2_not_null" CHECK (key_value IS NOT NULL);

ALTER TABLE ONLY public.chats
    ADD CONSTRAINT "2200_19118_1_not_null" CHECK (id IS NOT NULL);

ALTER TABLE ONLY public.key_check_logs
    ADD CONSTRAINT "2200_19159_1_not_null" CHECK (id IS NOT NULL);

ALTER TABLE ONLY public.key_usage_logs
    ADD CONSTRAINT "2200_19146_1_not_null" CHECK (id IS NOT NULL);

ALTER TABLE ONLY public.key_usage_logs
    ADD CONSTRAINT "2200_19146_3_not_null" CHECK (tokens IS NOT NULL);

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT "2200_19075_1_not_null" CHECK (id IS NOT NULL);

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT "2200_19075_2_not_null" CHECK (email IS NOT NULL);

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT "2200_19075_3_not_null" CHECK (name IS NOT NULL);

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_gender_check
        CHECK (gender = ANY (ARRAY['ولد'::text, 'بنت'::text]));

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_role_check
        CHECK (role = ANY (ARRAY['user'::text, 'admin'::text]));

ALTER TABLE ONLY public.user_usage_logs
    ADD CONSTRAINT "2200_19134_1_not_null" CHECK (id IS NOT NULL);

ALTER TABLE ONLY public.user_usage_logs
    ADD CONSTRAINT "2200_19134_3_not_null" CHECK (tokens IS NOT NULL);


-- ============================================================
-- FOREIGN KEYS
-- ============================================================

ALTER TABLE ONLY public.chats
    ADD CONSTRAINT chats_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id);

ALTER TABLE ONLY public.key_usage_logs
    ADD CONSTRAINT key_usage_logs_key_id_fkey
    FOREIGN KEY (key_id) REFERENCES public.api_keys(id);

ALTER TABLE ONLY public.user_usage_logs
    ADD CONSTRAINT user_usage_logs_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id);


-- ============================================================
-- INDEXES
-- ============================================================

CREATE UNIQUE INDEX api_keys_pkey
    ON public.api_keys USING btree (id);

CREATE UNIQUE INDEX chats_pkey
    ON public.chats USING btree (id);

CREATE INDEX idx_chats_updated_at
    ON public.chats USING btree (updated_at DESC);

CREATE INDEX idx_chats_user_id
    ON public.chats USING btree (user_id);

CREATE UNIQUE INDEX key_check_logs_pkey
    ON public.key_check_logs USING btree (id);

CREATE INDEX idx_key_usage_key_id
    ON public.key_usage_logs USING btree (key_id);

CREATE UNIQUE INDEX key_usage_logs_pkey
    ON public.key_usage_logs USING btree (id);

CREATE INDEX idx_profiles_email
    ON public.profiles USING btree (email);

CREATE INDEX idx_profiles_role
    ON public.profiles USING btree (role);

CREATE UNIQUE INDEX profiles_email_key
    ON public.profiles USING btree (email);

CREATE UNIQUE INDEX profiles_pkey
    ON public.profiles USING btree (id);

CREATE INDEX idx_user_usage_user_id
    ON public.user_usage_logs USING btree (user_id);

CREATE UNIQUE INDEX user_usage_logs_pkey
    ON public.user_usage_logs USING btree (id);


-- ============================================================
-- FUNCTIONS
-- ============================================================

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


CREATE OR REPLACE FUNCTION public.increment_key_usage(key_id text, tokens_used integer)
RETURNS void
LANGUAGE plpgsql
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
BEGIN
    PERFORM set_config('app.increment_user_usage', 'true', true);

    UPDATE public.profiles
    SET
        used_today = CASE
            WHEN last_reset_date < CURRENT_DATE THEN tokens_used
            ELSE used_today + tokens_used
        END,
        last_reset_date = CURRENT_DATE
    WHERE id = user_id;

    INSERT INTO public.user_usage_logs (user_id, tokens)
    VALUES (user_id, tokens_used);
END;
$function$;


CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $function$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND role = 'admin'
    );
END;
$function$;


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
        NEW.role := OLD.role;
        NEW.daily_limit := OLD.daily_limit;
        NEW.is_blocked := OLD.is_blocked;
        NEW.id := OLD.id;
        NEW.email := OLD.email;
        NEW.created_at := OLD.created_at;
        RETURN NEW;
    END IF;

    NEW.role := OLD.role;
    NEW.daily_limit := OLD.daily_limit;
    NEW.is_blocked := OLD.is_blocked;
    NEW.used_today := OLD.used_today;
    NEW.last_reset_date := OLD.last_reset_date;
    NEW.id := OLD.id;
    NEW.email := OLD.email;
    NEW.created_at := OLD.created_at;

    RETURN NEW;
END;
$function$;


CREATE OR REPLACE FUNCTION public.reset_daily_usage()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    UPDATE public.profiles
    SET
        used_today = 0,
        last_reset_date = CURRENT_DATE
    WHERE last_reset_date < CURRENT_DATE;

    UPDATE public.api_keys
    SET
        used_today = 0,
        last_reset_date = CURRENT_DATE
    WHERE last_reset_date < CURRENT_DATE;
END;
$function$;


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
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER on_profile_delete
AFTER DELETE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.delete_user_auth();

CREATE TRIGGER trigger_protect_profile_fields
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_sensitive_profile_fields();

CREATE TRIGGER trigger_update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.key_check_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.key_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_usage_logs ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- RLS POLICIES
-- ============================================================

-- api_keys
CREATE POLICY keys_admin_all
ON public.api_keys
AS PERMISSIVE
FOR ALL
TO public
USING (public.is_admin());


-- chats
CREATE POLICY chats_delete
ON public.chats
AS PERMISSIVE
FOR DELETE
TO public
USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY chats_insert
ON public.chats
AS PERMISSIVE
FOR INSERT
TO public
WITH CHECK (user_id = auth.uid());

CREATE POLICY chats_select
ON public.chats
AS PERMISSIVE
FOR SELECT
TO public
USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY chats_update
ON public.chats
AS PERMISSIVE
FOR UPDATE
TO public
USING (user_id = auth.uid());


-- key_check_logs
CREATE POLICY check_logs_all
ON public.key_check_logs
AS PERMISSIVE
FOR ALL
TO public
USING (public.is_admin());


-- key_usage_logs
CREATE POLICY key_logs_insert
ON public.key_usage_logs
AS PERMISSIVE
FOR INSERT
TO public
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY key_logs_select
ON public.key_usage_logs
AS PERMISSIVE
FOR SELECT
TO public
USING (public.is_admin());


-- profiles
CREATE POLICY profiles_delete
ON public.profiles
AS PERMISSIVE
FOR DELETE
TO public
USING (auth.uid() = id OR public.is_admin());

CREATE POLICY profiles_insert
ON public.profiles
AS PERMISSIVE
FOR INSERT
TO public
WITH CHECK (auth.uid() = id);

CREATE POLICY profiles_select
ON public.profiles
AS PERMISSIVE
FOR SELECT
TO public
USING (auth.uid() = id OR public.is_admin());

CREATE POLICY profiles_update
ON public.profiles
AS PERMISSIVE
FOR UPDATE
TO public
USING (auth.uid() = id OR public.is_admin());


-- user_usage_logs
CREATE POLICY usage_logs_insert
ON public.user_usage_logs
AS PERMISSIVE
FOR INSERT
TO public
WITH CHECK (user_id = auth.uid());

CREATE POLICY usage_logs_select
ON public.user_usage_logs
AS PERMISSIVE
FOR SELECT
TO public
USING (user_id = auth.uid() OR public.is_admin());


-- ============================================================
-- VIEWS
-- ============================================================
-- No public views currently exist.


-- ============================================================
-- RLS STATUS
-- ============================================================
-- RLS is enabled on all six public application tables:
--   api_keys
--   chats
--   key_check_logs
--   key_usage_logs
--   profiles
--   user_usage_logs
--
-- force row level security was not included because the inspected
-- PostgreSQL catalog did not expose the requested column.


-- ============================================================
-- END OF CURRENT SNAPSHOT
-- ============================================================
