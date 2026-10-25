-- ==============================================================================
-- FLYING CHEETAH LABS - PRODUCTION DATABASE & SECURITY MIGRATION SCRIPT
-- TARGET: SUPABASE POSTGRESQL (100% Free Tier - $0/Month)
-- ADMIN: flyingcheetah.agency@gmail.com
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. CUSTOM ROLES & STATUSES
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('admin', 'client');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lead_status') THEN
        CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'closed', 'converted');
    END IF;
END $$;

-- 3. PROFILES TABLE (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL DEFAULT '',
    email TEXT UNIQUE NOT NULL,
    avatar_url TEXT DEFAULT '',
    role user_role NOT NULL DEFAULT 'client',
    phone TEXT DEFAULT '',
    company_name TEXT DEFAULT '',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. LEADS & INQUIRIES TABLE
CREATE TABLE IF NOT EXISTS public.leads_inquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL CHECK (char_length(trim(name)) >= 2),
    email TEXT NOT NULL CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    phone TEXT NOT NULL CHECK (char_length(trim(phone)) >= 7),
    service TEXT NOT NULL DEFAULT 'Operations Audit',
    service_interested TEXT GENERATED ALWAYS AS (service) STORED, -- Backward compatibility alias
    message TEXT DEFAULT '',
    source_page TEXT DEFAULT 'index.html',
    status lead_status NOT NULL DEFAULT 'new',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. CALCULATOR ESTIMATES TABLE
CREATE TABLE IF NOT EXISTS public.calculator_estimates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    monthly_orders INT NOT NULL CHECK (monthly_orders >= 0),
    aov NUMERIC(12, 2) NOT NULL CHECK (aov >= 0),
    average_order_value NUMERIC(12, 2) GENERATED ALWAYS AS (aov) STORED, -- Compatibility alias
    estimated_savings NUMERIC(12, 2) NOT NULL DEFAULT 0,
    projected_roi NUMERIC(12, 2) GENERATED ALWAYS AS (estimated_savings) STORED, -- Compatibility alias
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. PERFORMANCE INDEXES (< 5ms response time)
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads_inquiries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_email ON public.leads_inquiries(email);
CREATE INDEX IF NOT EXISTS idx_estimates_user_id ON public.calculator_estimates(user_id);

-- 7. AUTOMATIC TIMESTAMP TRIGGER
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON public.profiles;
CREATE TRIGGER trigger_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_leads_updated_at ON public.leads_inquiries;
CREATE TRIGGER trigger_leads_updated_at
    BEFORE UPDATE ON public.leads_inquiries
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 8. AUTOMATIC USER SYNC & ADMIN DESIGNATION
-- Automatically designates flyingcheetah.agency@gmail.com as 'admin'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    detected_name TEXT;
    detected_avatar TEXT;
    assigned_role public.user_role;
BEGIN
    detected_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1)
    );

    detected_avatar := COALESCE(
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.raw_user_meta_data->>'picture',
        ''
    );

    -- Designate official agency email as admin automatically
    IF lower(NEW.email) = 'flyingcheetah.agency@gmail.com' 
       OR NEW.email IN ('bhagatmukhiya@gmail.com', 'yashgaikwad@gmail.com') THEN
        assigned_role := 'admin'::public.user_role;
    ELSE
        assigned_role := 'client'::public.user_role;
    END IF;

    INSERT INTO public.profiles (id, full_name, email, avatar_url, role, metadata)
    VALUES (
        NEW.id,
        detected_name,
        lower(NEW.email),
        detected_avatar,
        assigned_role,
        COALESCE(NEW.raw_user_meta_data, '{}'::jsonb)
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        full_name = EXCLUDED.full_name,
        avatar_url = EXCLUDED.avatar_url,
        role = EXCLUDED.role,
        updated_at = timezone('utc'::text, now());

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 9. SECURITY DEFINER HELPER FOR RLS
-- Verifies if current authenticated user is flyingcheetah.agency@gmail.com or has 'admin' role
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
    current_email TEXT;
    current_role public.user_role;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Check JWT claims or auth.users table
    SELECT lower(email) INTO current_email
    FROM auth.users
    WHERE id = auth.uid();

    IF current_email = 'flyingcheetah.agency@gmail.com' THEN
        RETURN TRUE;
    END IF;

    -- Check profiles table
    SELECT role INTO current_role 
    FROM public.profiles 
    WHERE id = auth.uid();

    RETURN (current_role = 'admin'::public.user_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 10. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calculator_estimates ENABLE ROW LEVEL SECURITY;

-- 10A. Profiles Policies
DROP POLICY IF EXISTS "Public profiles read policy" ON public.profiles;
CREATE POLICY "Public profiles read policy"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid() OR public.is_admin())
    WITH CHECK (id = auth.uid() OR public.is_admin());

-- 10B. Leads & Inquiries Policies
-- RULE 1: Public visitors can INSERT leads, but CANNOT view or read any other leads.
DROP POLICY IF EXISTS "Public visitors can insert leads" ON public.leads_inquiries;
CREATE POLICY "Public visitors can insert leads"
    ON public.leads_inquiries FOR INSERT
    TO public
    WITH CHECK (true);

-- RULE 2: ONLY flyingcheetah.agency@gmail.com (Admins) has permission to SELECT data.
DROP POLICY IF EXISTS "Only admin can select leads" ON public.leads_inquiries;
CREATE POLICY "Only admin can select leads"
    ON public.leads_inquiries FOR SELECT
    TO authenticated
    USING (public.is_admin());

-- RULE 3: ONLY flyingcheetah.agency@gmail.com (Admins) has permission to UPDATE lead status.
DROP POLICY IF EXISTS "Only admin can update leads" ON public.leads_inquiries;
CREATE POLICY "Only admin can update leads"
    ON public.leads_inquiries FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- RULE 4: ONLY flyingcheetah.agency@gmail.com (Admins) has permission to DELETE leads.
DROP POLICY IF EXISTS "Only admin can delete leads" ON public.leads_inquiries;
CREATE POLICY "Only admin can delete leads"
    ON public.leads_inquiries FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- 10C. Calculator Estimates Policies
DROP POLICY IF EXISTS "Anyone can insert calculator estimates" ON public.calculator_estimates;
CREATE POLICY "Anyone can insert calculator estimates"
    ON public.calculator_estimates FOR INSERT
    TO public
    WITH CHECK (true);

DROP POLICY IF EXISTS "Users view their own estimates or admin views all" ON public.calculator_estimates;
CREATE POLICY "Users view their own estimates or admin views all"
    ON public.calculator_estimates FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR public.is_admin());

-- ==============================================================================
-- END OF MIGRATION SCRIPT
-- ==============================================================================
