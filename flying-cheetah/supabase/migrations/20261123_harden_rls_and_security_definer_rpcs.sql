-- ==============================================================================
-- FLYING CHEETAH LABS - SECURITY & RLS HARDENING MIGRATION
-- Applied live to Supabase project: txqtkpxdyoatzdgkcsry
-- Migration name: harden_rls_and_security_definer_rpcs
-- ==============================================================================

-- 1. Drop overly permissive public SELECT/ALL policies leaking PII or allowing anon writes
DROP POLICY IF EXISTS "Admins read leads" ON public.leads_inquiries;
DROP POLICY IF EXISTS "Public can insert leads" ON public.leads_inquiries;
DROP POLICY IF EXISTS "Admins read demos" ON public.demo_bookings;
DROP POLICY IF EXISTS "Admins manage fleet orders" ON public.fleet_orders;
DROP POLICY IF EXISTS "Public read fleet order" ON public.fleet_orders;
DROP POLICY IF EXISTS "Public can view delivery by order_ref" ON public.fleet_orders;

-- 2. Add strict authenticated admin policies on demo_bookings
DROP POLICY IF EXISTS "Only admin can select demos" ON public.demo_bookings;
CREATE POLICY "Only admin can select demos"
    ON public.demo_bookings FOR SELECT
    TO authenticated
    USING (public.is_admin());

DROP POLICY IF EXISTS "Only admin can update demos" ON public.demo_bookings;
CREATE POLICY "Only admin can update demos"
    ON public.demo_bookings FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Only admin can delete demos" ON public.demo_bookings;
CREATE POLICY "Only admin can delete demos"
    ON public.demo_bookings FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- 3. Remove deprecated SECURITY DEFINER RPC and lock down privileged OTP/password RPCs to service_role ONLY
DROP FUNCTION IF EXISTS public.fc_verify_and_update_password_deprecated(text, text, text);

REVOKE ALL ON FUNCTION public.fc_store_password_otp(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fc_store_password_otp(text, text) TO service_role;

REVOKE ALL ON FUNCTION public.fc_verify_and_update_password(text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fc_verify_and_update_password(text, text, text, text) TO service_role;

-- 4. Lock down trigger & internal SECURITY DEFINER functions from public RPC invocation
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_n8n_on_lead_insert() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

-- 5. Pin immutable search_path on all 4 flagged functions (clears Supabase Security Advisor 0011)
ALTER FUNCTION public.handle_updated_at() SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.notify_n8n_on_lead_insert() SET search_path = public, extensions;
ALTER FUNCTION public.match_knowledge_base(vector, double precision, integer) SET search_path = public, extensions;
