-- ============================================================================
-- FLYING CHEETAH LABS - PRODUCTION DATABASE SCHEMA (POSTGRESQL 16 / SUPABASE)
-- Initial Migration: 001_initial_schema.sql (100% Idempotent & Re-run Safe)
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- ENUMS (Safely created if not already present)
-- ----------------------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'client', 'agent');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'qualified', 'converted', 'closed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE demo_status AS ENUM ('confirmed', 'attended', 'cancelled', 'rescheduled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE message_channel AS ENUM ('whatsapp', 'instagram', 'rcs', 'sms', 'webchat');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE message_direction AS ENUM ('inbound', 'outbound');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE message_status AS ENUM ('queued', 'sent', 'delivered', 'read', 'failed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE voice_call_type AS ENUM ('cod_verification', 'cart_recovery', 'vip_loyalty', 'support');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE voice_call_status AS ENUM ('initiated', 'ringing', 'in_progress', 'completed', 'failed', 'busy');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE voice_call_intent AS ENUM ('confirmed', 'cancelled', 'rescheduled', 'unclear');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE courier_partner AS ENUM ('borzo', 'porter', 'dunzo');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE fleet_order_status AS ENUM ('assigning', 'rider_assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled', 'failed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ----------------------------------------------------------------------------
-- 1. USERS & PROFILES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE, -- References auth.users(id) if Supabase Auth is enabled
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255),
    full_name VARCHAR(150) NOT NULL,
    avatar_url TEXT,
    role user_role DEFAULT 'client' NOT NULL,
    phone VARCHAR(30),
    store_url VARCHAR(255),
    trial_active BOOLEAN DEFAULT TRUE NOT NULL,
    trial_started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    trial_days_left INT DEFAULT 14 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- ----------------------------------------------------------------------------
-- 2. LEADS & INQUIRIES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS leads_inquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    service_interested VARCHAR(100) DEFAULT 'General Consultation' NOT NULL,
    message TEXT,
    source_page VARCHAR(100) DEFAULT 'index.html' NOT NULL,
    status lead_status DEFAULT 'new' NOT NULL,
    utm_metadata JSONB DEFAULT '{}'::jsonb,
    assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_leads_email ON leads_inquiries(email);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads_inquiries(phone);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads_inquiries(created_at DESC);

-- ----------------------------------------------------------------------------
-- 3. DEMO BOOKINGS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS demo_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    company VARCHAR(150) NOT NULL,
    modules JSONB DEFAULT '[]'::jsonb NOT NULL,
    scheduled_time TIMESTAMPTZ NOT NULL,
    status demo_status DEFAULT 'confirmed' NOT NULL,
    google_calendar_event_id VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_demos_scheduled ON demo_bookings(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_demos_status ON demo_bookings(status);

-- ----------------------------------------------------------------------------
-- 4. OMNICHANNEL MESSAGES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS omnichannel_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id VARCHAR(100) NOT NULL,
    channel message_channel DEFAULT 'whatsapp' NOT NULL,
    direction message_direction NOT NULL,
    external_message_id VARCHAR(255),
    sender_id VARCHAR(100) NOT NULL,
    recipient_id VARCHAR(100) NOT NULL,
    content TEXT,
    media_url TEXT,
    status message_status DEFAULT 'queued' NOT NULL,
    metadata_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_omni_conv ON omnichannel_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_omni_channel ON omnichannel_messages(channel);
CREATE INDEX IF NOT EXISTS idx_omni_created ON omnichannel_messages(created_at DESC);

-- ----------------------------------------------------------------------------
-- 5. AI VOICE CALLS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_voice_calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_sid VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(30) NOT NULL,
    call_type voice_call_type DEFAULT 'cod_verification' NOT NULL,
    status voice_call_status DEFAULT 'initiated' NOT NULL,
    intent voice_call_intent DEFAULT 'unclear' NOT NULL,
    duration_seconds INT DEFAULT 0 NOT NULL,
    transcript TEXT,
    recording_url TEXT,
    customer_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_voice_sid ON ai_voice_calls(call_sid);
CREATE INDEX IF NOT EXISTS idx_voice_phone ON ai_voice_calls(phone);
CREATE INDEX IF NOT EXISTS idx_voice_status ON ai_voice_calls(status);

-- ----------------------------------------------------------------------------
-- 6. FLEET & HYPERLOCAL COURIER ORDERS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fleet_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_ref VARCHAR(100) NOT NULL,
    courier courier_partner DEFAULT 'borzo' NOT NULL,
    courier_order_id VARCHAR(100),
    tracking_number VARCHAR(100),
    tracking_url TEXT,
    pickup_address JSONB NOT NULL,
    delivery_address JSONB NOT NULL,
    rider_name VARCHAR(150),
    rider_phone VARCHAR(30),
    rider_lat FLOAT,
    rider_lng FLOAT,
    eta_minutes INT,
    status fleet_order_status DEFAULT 'assigning' NOT NULL,
    delivery_fee_inr NUMERIC(10, 2),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_fleet_order_ref ON fleet_orders(order_ref);
CREATE INDEX IF NOT EXISTS idx_fleet_courier ON fleet_orders(courier);
CREATE INDEX IF NOT EXISTS idx_fleet_status ON fleet_orders(status);

-- ----------------------------------------------------------------------------
-- 7. STOREFRONT SPEED AUDITS & CWV LOGS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS storefront_speed_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_url VARCHAR(255) NOT NULL,
    mobile_score INT NOT NULL,
    desktop_score INT NOT NULL,
    lcp_seconds NUMERIC(4, 2),
    fid_milliseconds NUMERIC(6, 2),
    cls_score NUMERIC(4, 3),
    potential_revenue_boost_pct NUMERIC(4, 1),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ----------------------------------------------------------------------------
-- 8. AUDIT LOGS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100),
    payload JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ----------------------------------------------------------------------------
-- TRIGGERS (Auto-update updated_at)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_modtime ON profiles;
CREATE TRIGGER update_profiles_modtime
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_leads_modtime ON leads_inquiries;
CREATE TRIGGER update_leads_modtime
    BEFORE UPDATE ON leads_inquiries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_demos_modtime ON demo_bookings;
CREATE TRIGGER update_demos_modtime
    BEFORE UPDATE ON demo_bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_voice_modtime ON ai_voice_calls;
CREATE TRIGGER update_voice_modtime
    BEFORE UPDATE ON ai_voice_calls
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_fleet_modtime ON fleet_orders;
CREATE TRIGGER update_fleet_modtime
    BEFORE UPDATE ON fleet_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE demo_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE omnichannel_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_voice_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE fleet_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE storefront_speed_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 1. Profiles Policy
DROP POLICY IF EXISTS "Admins full access to profiles" ON profiles;
CREATE POLICY "Admins full access to profiles" ON profiles
    FOR ALL USING (auth.jwt() ->> 'email' = 'flyingcheetah.agency@gmail.com' OR role = 'admin');

DROP POLICY IF EXISTS "Users read own profile" ON profiles;
CREATE POLICY "Users read own profile" ON profiles
    FOR SELECT USING (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "Users update own profile" ON profiles;
CREATE POLICY "Users update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = auth_user_id);

-- 2. Leads Policy (Public can insert; Admins can read/update)
DROP POLICY IF EXISTS "Public can insert leads" ON leads_inquiries;
CREATE POLICY "Public can insert leads" ON leads_inquiries
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins read leads" ON leads_inquiries;
CREATE POLICY "Admins read leads" ON leads_inquiries
    FOR SELECT USING (auth.jwt() ->> 'email' = 'flyingcheetah.agency@gmail.com');

DROP POLICY IF EXISTS "Admins update leads" ON leads_inquiries;
CREATE POLICY "Admins update leads" ON leads_inquiries
    FOR UPDATE USING (auth.jwt() ->> 'email' = 'flyingcheetah.agency@gmail.com');

-- 3. Demo Bookings Policy
DROP POLICY IF EXISTS "Public can book demos" ON demo_bookings;
CREATE POLICY "Public can book demos" ON demo_bookings
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins manage demos" ON demo_bookings;
CREATE POLICY "Admins manage demos" ON demo_bookings
    FOR ALL USING (auth.jwt() ->> 'email' = 'flyingcheetah.agency@gmail.com');

-- 4. Messages Policy
DROP POLICY IF EXISTS "Agents and Admins access messages" ON omnichannel_messages;
CREATE POLICY "Agents and Admins access messages" ON omnichannel_messages
    FOR ALL USING (auth.jwt() ->> 'email' = 'flyingcheetah.agency@gmail.com');

-- 5. Fleet Orders Policy
DROP POLICY IF EXISTS "Public read fleet order by tracking" ON fleet_orders;
CREATE POLICY "Public read fleet order by tracking" ON fleet_orders
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage fleet orders" ON fleet_orders;
CREATE POLICY "Admins manage fleet orders" ON fleet_orders
    FOR ALL USING (auth.jwt() ->> 'email' = 'flyingcheetah.agency@gmail.com');

-- ----------------------------------------------------------------------------
-- SEED INITIAL FOUNDER PROFILE
-- ----------------------------------------------------------------------------
INSERT INTO profiles (
    email,
    full_name,
    role,
    phone,
    trial_active,
    trial_days_left
) VALUES (
    'flyingcheetah.agency@gmail.com',
    'Bhagat Mukhiya (Founder)',
    'admin',
    '+91 98200 00000',
    TRUE,
    9999
) ON CONFLICT (email) DO NOTHING;
