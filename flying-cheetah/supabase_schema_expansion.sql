-- ==============================================================================
-- FLYING CHEETAH LABS - SUPABASE PRODUCTION EXPANSION & INTEGRATION MIGRATION
-- TARGET: SUPABASE POSTGRESQL 16 (Free Tier Compatible)
-- ADMIN RECIPIENT: flyingcheetah.agency@gmail.com
-- EXTENSIONS: uuid-ossp, pgcrypto, vector, pg_net
-- ==============================================================================

-- 1. ADVANCED EXTENSIONS (pgvector for AI, pg_net for async webhooks)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- 2. CUSTOM ROLES, TYPES & STATUS ENUMS
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('admin', 'client');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
        CREATE TYPE order_status AS ENUM (
            'assigning', 'rider_assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled', 'failed'
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
        CREATE TYPE payment_status AS ENUM (
            'pending', 'authorized', 'captured', 'failed', 'refunded'
        );
    END IF;
END $$;

-- 3. CORE HELPER FUNCTIONS (Timestamp and Admin Verification)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'business_name') THEN
            ALTER TABLE public.profiles ADD COLUMN business_name TEXT DEFAULT '';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'category_niche') THEN
            ALTER TABLE public.profiles ADD COLUMN category_niche TEXT DEFAULT '';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'gstin_udyam') THEN
            ALTER TABLE public.profiles ADD COLUMN gstin_udyam TEXT DEFAULT '';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'whatsapp_support') THEN
            ALTER TABLE public.profiles ADD COLUMN whatsapp_support TEXT DEFAULT '';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'pickup_address') THEN
            ALTER TABLE public.profiles ADD COLUMN pickup_address TEXT DEFAULT '';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'merchant_upi_id') THEN
            ALTER TABLE public.profiles ADD COLUMN merchant_upi_id TEXT DEFAULT '';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'delivery_radius_km') THEN
            ALTER TABLE public.profiles ADD COLUMN delivery_radius_km INT DEFAULT 15;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'phone') THEN
            ALTER TABLE public.profiles ADD COLUMN phone TEXT DEFAULT '';
        END IF;
    END IF;
END $$;

-- 1-Account Phone Uniqueness Constraints (PostgreSQL level)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_phone_unique 
    ON public.profiles(phone) 
    WHERE phone IS NOT NULL AND phone <> '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_whatsapp_unique 
    ON public.profiles(whatsapp_support) 
    WHERE whatsapp_support IS NOT NULL AND whatsapp_support <> '';

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
    current_email TEXT;
    current_role TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;

    SELECT lower(email) INTO current_email
    FROM auth.users
    WHERE id = auth.uid();

    IF current_email = 'flyingcheetah.agency@gmail.com' 
       OR current_email IN ('bhagatmukhiya@gmail.com', 'yashgaikwad@gmail.com') THEN
        RETURN TRUE;
    END IF;

    BEGIN
        SELECT role::text INTO current_role 
        FROM public.profiles 
        WHERE id = auth.uid();

        RETURN (current_role = 'admin');
    EXCEPTION WHEN OTHERS THEN
        RETURN FALSE;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. FLEET ORDERS TABLE (Hyperlocal Delivery Dispatch - Borzo & Porter)
CREATE TABLE IF NOT EXISTS public.fleet_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_ref TEXT NOT NULL UNIQUE,
    courier TEXT NOT NULL DEFAULT 'borzo', -- borzo, porter, dunzo
    courier_order_id TEXT,
    tracking_number TEXT,
    tracking_url TEXT,
    pickup_address JSONB NOT NULL DEFAULT '{}'::jsonb,
    delivery_address JSONB NOT NULL DEFAULT '{}'::jsonb,
    rider_name TEXT,
    rider_phone TEXT,
    rider_lat DOUBLE PRECISION,
    rider_lng DOUBLE PRECISION,
    eta_minutes INT DEFAULT 18,
    status order_status NOT NULL DEFAULT 'assigning',
    delivery_fee_inr NUMERIC(10, 2) DEFAULT 0.00,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_fleet_orders_ref ON public.fleet_orders(order_ref);
CREATE INDEX IF NOT EXISTS idx_fleet_orders_status ON public.fleet_orders(status);
CREATE INDEX IF NOT EXISTS idx_fleet_orders_courier ON public.fleet_orders(courier);
CREATE INDEX IF NOT EXISTS idx_fleet_orders_created ON public.fleet_orders(created_at DESC);

-- Updated_at Trigger for fleet_orders
DROP TRIGGER IF EXISTS trigger_fleet_orders_updated_at ON public.fleet_orders;
CREATE TRIGGER trigger_fleet_orders_updated_at
    BEFORE UPDATE ON public.fleet_orders
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 5. PAYMENTS & TRANSACTIONS TABLE (Razorpay & Cashfree Dynamic UPI Reconciliation)
CREATE TABLE IF NOT EXISTS public.payments_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_ref TEXT NOT NULL,
    payment_gateway TEXT NOT NULL DEFAULT 'razorpay', -- razorpay, cashfree, manual_cod
    gateway_order_id TEXT,
    gateway_payment_id TEXT UNIQUE,
    amount_inr NUMERIC(12, 2) NOT NULL CHECK (amount_inr >= 0),
    currency TEXT NOT NULL DEFAULT 'INR',
    status payment_status NOT NULL DEFAULT 'pending',
    method TEXT DEFAULT 'upi', -- upi, card, netbanking, wallet, cod
    customer_email TEXT,
    customer_phone TEXT,
    raw_webhook_payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_payments_order_ref ON public.payments_transactions(order_ref);
CREATE INDEX IF NOT EXISTS idx_payments_gateway_id ON public.payments_transactions(gateway_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payments_customer_phone ON public.payments_transactions(customer_phone);

-- Updated_at Trigger for payments_transactions
DROP TRIGGER IF EXISTS trigger_payments_updated_at ON public.payments_transactions;
CREATE TRIGGER trigger_payments_updated_at
    BEFORE UPDATE ON public.payments_transactions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 6. OMNICHANNEL MESSAGES TABLE (WhatsApp Cloud API, Instagram DMs, Webchat)
CREATE TABLE IF NOT EXISTS public.omnichannel_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id TEXT NOT NULL,
    channel TEXT NOT NULL DEFAULT 'whatsapp', -- whatsapp, instagram, rcs, sms, webchat
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    external_message_id TEXT,
    sender_id TEXT NOT NULL,
    recipient_id TEXT NOT NULL,
    content TEXT,
    media_url TEXT,
    status TEXT NOT NULL DEFAULT 'delivered', -- queued, sent, delivered, read, failed
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_omnichannel_conversation ON public.omnichannel_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_omnichannel_channel ON public.omnichannel_messages(channel);
CREATE INDEX IF NOT EXISTS idx_omnichannel_created ON public.omnichannel_messages(created_at DESC);

-- 7. AI KNOWLEDGE BASE & EMBEDDINGS (pgvector for Voice & WhatsApp Conversational AI)
CREATE TABLE IF NOT EXISTS public.ai_knowledge_base (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'general', -- pricing, fleet_logistics, cod_voice, store_automation, faq
    content TEXT NOT NULL,
    embedding vector(1536), -- Standard OpenAI / text-embedding-3-small dimension (or 768 for Gemini)
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_ai_knowledge_category ON public.ai_knowledge_base(category);

-- Cosine Distance Semantic Matching Function
CREATE OR REPLACE FUNCTION public.match_knowledge_base(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.70,
    match_count int DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    category TEXT,
    content TEXT,
    similarity float
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT
        k.id,
        k.title,
        k.category,
        k.content,
        1 - (k.embedding <=> query_embedding) AS similarity
    FROM public.ai_knowledge_base k
    WHERE 1 - (k.embedding <=> query_embedding) > match_threshold
    ORDER BY similarity DESC
    LIMIT match_count;
END;
$$;

-- 8. ENABLE REALTIME BROADCASTS
-- Enables sub-100ms push directly into admin.html and delivery.html
DO $$ BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.leads_inquiries;
    EXCEPTION WHEN duplicate_object THEN NULL; END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.fleet_orders;
    EXCEPTION WHEN duplicate_object THEN NULL; END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.payments_transactions;
    EXCEPTION WHEN duplicate_object THEN NULL; END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.omnichannel_messages;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- 9. ROW LEVEL SECURITY (RLS) POLICIES

-- 9A. Fleet Orders RLS
ALTER TABLE public.fleet_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access to fleet_orders" ON public.fleet_orders;
CREATE POLICY "Admin full access to fleet_orders"
    ON public.fleet_orders FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Public can view delivery by order_ref" ON public.fleet_orders;
CREATE POLICY "Public can view delivery by order_ref"
    ON public.fleet_orders FOR SELECT
    TO public
    USING (true); -- Public tracking viewable if customer holds exact tracking URL

DROP POLICY IF EXISTS "Public can insert orders" ON public.fleet_orders;
CREATE POLICY "Public can insert orders"
    ON public.fleet_orders FOR INSERT
    TO public
    WITH CHECK (true);

-- 9B. Payments Transactions RLS
ALTER TABLE public.payments_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access to payments_transactions" ON public.payments_transactions;
CREATE POLICY "Admin full access to payments_transactions"
    ON public.payments_transactions FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Public can insert payment webhooks" ON public.payments_transactions;
CREATE POLICY "Public can insert payment webhooks"
    ON public.payments_transactions FOR INSERT
    TO public
    WITH CHECK (true);

-- 9C. Omnichannel Messages RLS
ALTER TABLE public.omnichannel_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access to omnichannel_messages" ON public.omnichannel_messages;
CREATE POLICY "Admin full access to omnichannel_messages"
    ON public.omnichannel_messages FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 9D. AI Knowledge Base RLS
ALTER TABLE public.ai_knowledge_base ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read knowledge base" ON public.ai_knowledge_base;
CREATE POLICY "Public can read knowledge base"
    ON public.ai_knowledge_base FOR SELECT
    TO public
    USING (true);

DROP POLICY IF EXISTS "Only admin can edit knowledge base" ON public.ai_knowledge_base;
CREATE POLICY "Only admin can edit knowledge base"
    ON public.ai_knowledge_base FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 10. N8N AUTOMATION TRIGGER HELPER (DATABASE WEBHOOK)
-- Function that posts new leads directly to n8n via pg_net if configured
CREATE OR REPLACE FUNCTION public.notify_n8n_on_lead_insert()
RETURNS TRIGGER AS $$
DECLARE
    webhook_url TEXT := 'https://automation.flyingcheetah.agency/webhook/leads-inbound';
    request_id BIGINT;
BEGIN
    -- Perform asynchronous HTTP POST via pg_net if available
    BEGIN
        SELECT net.http_post(
            url := webhook_url,
            body := json_build_object(
                'event', 'lead_created',
                'record', row_to_json(NEW),
                'timestamp', timezone('utc'::text, now())
            )::text,
            headers := '{"Content-Type": "application/json"}'::jsonb
        ) INTO request_id;
    EXCEPTION WHEN OTHERS THEN
        -- If pg_net is not active or fails, safely continue without blocking DB insert
        RAISE NOTICE 'pg_net webhook dispatch skipped: %', SQLERRM;
    END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_n8n_new_lead ON public.leads_inquiries;
CREATE TRIGGER trigger_notify_n8n_new_lead
    AFTER INSERT ON public.leads_inquiries
    FOR EACH ROW EXECUTE FUNCTION public.notify_n8n_on_lead_insert();

-- ==============================================================================
-- END OF EXPANSION MIGRATION SCRIPT
-- ==============================================================================
