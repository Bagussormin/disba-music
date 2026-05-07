-- ============================================================
-- DISBA MUSIC — COMPLETE SUPABASE MIGRATION
-- Jalankan SELURUH script ini di Supabase SQL Editor
-- Versi: 2.0 — DDEX Aggregator Edition
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABEL DASAR
-- ============================================================

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    email TEXT,
    role TEXT DEFAULT 'artist',
    quota INT DEFAULT 1,
    wallet_balance NUMERIC DEFAULT 0.00,
    subscription_tier TEXT DEFAULT 'inactive',
    subscription_active_until TIMESTAMP WITH TIME ZONE,
    split_percentage NUMERIC DEFAULT 80,
    artist_stage_name TEXT,
    bio TEXT,
    website_url TEXT,
    instagram_handle TEXT,
    label_name TEXT,
    country TEXT DEFAULT 'ID',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.releases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    genre TEXT,
    audio_url TEXT,
    cover_url TEXT,
    status TEXT DEFAULT 'pending',
    isrc TEXT UNIQUE,
    upc TEXT,
    explicit_lyrics BOOLEAN DEFAULT FALSE,
    split_percentage NUMERIC DEFAULT 80,
    album_name TEXT,
    selected_stores TEXT[] DEFAULT '{}',
    spotify_track_id TEXT,
    spotify_status TEXT DEFAULT 'not_distributed',
    release_date DATE,
    language TEXT DEFAULT 'id',
    primary_genre TEXT,
    secondary_genre TEXT,
    label TEXT,
    copyright_year INT DEFAULT EXTRACT(YEAR FROM NOW())::INT,
    copyright_holder TEXT,
    production_year INT DEFAULT EXTRACT(YEAR FROM NOW())::INT,
    production_holder TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.royalties_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    release_id UUID REFERENCES public.releases(id),
    amount_earned NUMERIC DEFAULT 0.00,
    report_month DATE NOT NULL,
    platform TEXT DEFAULT 'spotify',
    streams BIGINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    type TEXT,
    amount NUMERIC NOT NULL,
    status TEXT DEFAULT 'pending',
    payment_method TEXT,
    transaction_ref TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.store_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    release_id UUID REFERENCES public.releases(id),
    store_name TEXT NOT NULL,
    streams_count BIGINT DEFAULT 0,
    revenue NUMERIC DEFAULT 0.00,
    report_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.release_splits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    release_id UUID REFERENCES public.releases(id),
    email TEXT NOT NULL,
    percentage NUMERIC NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- TABEL DISTRIBUSI (DDEX Multi-Platform Aggregator)
-- ============================================================

-- Tabel utama distribusi — mendukung semua platform
CREATE TABLE IF NOT EXISTS public.spotify_distributions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    release_id UUID REFERENCES public.releases(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    -- Platform info
    platform TEXT NOT NULL DEFAULT 'spotify',
    platform_track_id TEXT,
    platform_uri TEXT,
    -- Spotify-specific (backward compat)
    spotify_track_id TEXT,
    spotify_uri TEXT,
    -- DDEX delivery info
    ddex_ref TEXT,
    ddex_xml TEXT,
    delivery_format TEXT DEFAULT 'ddex_ern41',
    delivery_batch_id TEXT,
    -- Status tracking
    status TEXT DEFAULT 'queued',
    -- Status lifecycle: queued → processing → delivered → live → rejected
    delivery_note TEXT,
    -- Timestamps
    distribution_date TIMESTAMP WITH TIME ZONE,
    estimated_live_date TIMESTAMP WITH TIME ZONE,
    live_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabel analytics per platform
CREATE TABLE IF NOT EXISTS public.spotify_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    spotify_distribution_id UUID REFERENCES public.spotify_distributions(id) ON DELETE CASCADE,
    release_id UUID REFERENCES public.releases(id),
    user_id UUID REFERENCES auth.users(id),
    platform TEXT DEFAULT 'spotify',
    report_date DATE NOT NULL,
    streams BIGINT DEFAULT 0,
    downloads BIGINT DEFAULT 0,
    total_revenue NUMERIC DEFAULT 0.00,
    disba_commission NUMERIC DEFAULT 0.00,
    artist_payout NUMERIC DEFAULT 0.00,
    currency TEXT DEFAULT 'IDR',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(spotify_distribution_id, report_date)
);

-- Tabel komisi admin bulanan
CREATE TABLE IF NOT EXISTS public.admin_commissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    month DATE NOT NULL,
    total_artist_earnings NUMERIC DEFAULT 0.00,
    total_commission NUMERIC DEFAULT 0.00,
    commission_percentage NUMERIC DEFAULT 15.00,
    status TEXT DEFAULT 'pending',
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(month)
);

-- Tabel komisi per artist
CREATE TABLE IF NOT EXISTS public.artist_commissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    admin_commission_id UUID REFERENCES public.admin_commissions(id),
    artist_earnings NUMERIC DEFAULT 0.00,
    commission_owed NUMERIC DEFAULT 0.00,
    status TEXT DEFAULT 'pending',
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- DDEX DELIVERY QUEUE (Core Aggregator Table)
-- ============================================================

-- Antrian pengiriman ke DSP — workflow inti aggregator
CREATE TABLE IF NOT EXISTS public.delivery_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    release_id UUID REFERENCES public.releases(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    -- Target platforms (array, bisa multi-platform sekaligus)
    platforms TEXT[] NOT NULL DEFAULT '{spotify}',
    -- DDEX data
    ddex_xml TEXT,
    ddex_ern_version TEXT DEFAULT '4.1',
    isrc TEXT,
    upc TEXT,
    -- Status: pending → approved → generating_ddex → delivering → delivered → live → failed
    status TEXT DEFAULT 'pending',
    priority INT DEFAULT 0,
    -- Admin notes
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    delivery_attempt INT DEFAULT 0,
    last_attempt_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    live_at TIMESTAMP WITH TIME ZONE,
    -- Metadata snapshot (untuk DDEX generation)
    metadata_snapshot JSONB,
    error_log TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Log setiap aksi distribusi (audit trail)
CREATE TABLE IF NOT EXISTS public.distribution_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    delivery_queue_id UUID REFERENCES public.delivery_queue(id),
    release_id UUID REFERENCES public.releases(id),
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    platform TEXT,
    status_from TEXT,
    status_to TEXT,
    message TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- ALTER TABLE — Tambah kolom yang mungkin belum ada
-- ============================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'artist';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS quota INT DEFAULT 1;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC DEFAULT 0.00;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'inactive';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_active_until TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS split_percentage NUMERIC DEFAULT 80;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS artist_stage_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS label_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'ID';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS genre TEXT;
ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS audio_url TEXT;
ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS cover_url TEXT;
ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS isrc TEXT;
ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS upc TEXT;
ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS explicit_lyrics BOOLEAN DEFAULT FALSE;
ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS split_percentage NUMERIC DEFAULT 80;
ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS album_name TEXT;
ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS selected_stores TEXT[] DEFAULT '{}';
ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS spotify_track_id TEXT;
ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS spotify_status TEXT DEFAULT 'not_distributed';
ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS release_date DATE;
ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'id';
ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS label TEXT;
ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS copyright_year INT DEFAULT EXTRACT(YEAR FROM NOW())::INT;
ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS copyright_holder TEXT;
ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS description TEXT;

-- Spotify Distributions (New Columns for Multi-Platform)
ALTER TABLE public.spotify_distributions ADD COLUMN IF NOT EXISTS platform TEXT NOT NULL DEFAULT 'spotify';
ALTER TABLE public.spotify_distributions ADD COLUMN IF NOT EXISTS platform_track_id TEXT;
ALTER TABLE public.spotify_distributions ADD COLUMN IF NOT EXISTS platform_uri TEXT;
ALTER TABLE public.spotify_distributions ADD COLUMN IF NOT EXISTS ddex_ref TEXT;
ALTER TABLE public.spotify_distributions ADD COLUMN IF NOT EXISTS ddex_xml TEXT;
ALTER TABLE public.spotify_distributions ADD COLUMN IF NOT EXISTS delivery_format TEXT DEFAULT 'ddex_ern41';
ALTER TABLE public.spotify_distributions ADD COLUMN IF NOT EXISTS delivery_batch_id TEXT;
ALTER TABLE public.spotify_distributions ADD COLUMN IF NOT EXISTS delivery_note TEXT;
ALTER TABLE public.spotify_distributions ADD COLUMN IF NOT EXISTS distribution_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.spotify_distributions ADD COLUMN IF NOT EXISTS estimated_live_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.spotify_distributions ADD COLUMN IF NOT EXISTS live_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.spotify_distributions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Spotify Analytics (New Columns)
ALTER TABLE public.spotify_analytics ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'spotify';
ALTER TABLE public.spotify_analytics ADD COLUMN IF NOT EXISTS disba_commission NUMERIC DEFAULT 0.00;
ALTER TABLE public.spotify_analytics ADD COLUMN IF NOT EXISTS artist_payout NUMERIC DEFAULT 0.00;
ALTER TABLE public.spotify_analytics ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'IDR';

-- ============================================================
-- TYPE SAFETY — Pastikan kolom ID adalah UUID
-- ============================================================
DO $$ 
BEGIN 
    BEGIN ALTER TABLE public.profiles ALTER COLUMN id TYPE UUID USING id::UUID; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER TABLE public.releases ALTER COLUMN user_id TYPE UUID USING user_id::UUID; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER TABLE public.royalties_ledger ALTER COLUMN user_id TYPE UUID USING user_id::UUID; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER TABLE public.transactions ALTER COLUMN user_id TYPE UUID USING user_id::UUID; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER TABLE public.spotify_distributions ALTER COLUMN user_id TYPE UUID USING user_id::UUID; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER TABLE public.spotify_analytics ALTER COLUMN user_id TYPE UUID USING user_id::UUID; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER TABLE public.delivery_queue ALTER COLUMN user_id TYPE UUID USING user_id::UUID; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER TABLE public.distribution_logs ALTER COLUMN user_id TYPE UUID USING user_id::UUID; EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

-- Hapus kolom Midtrans yang tidak dipakai lagi (opsional, comment out jika masih butuh)
-- ALTER TABLE public.transactions DROP COLUMN IF EXISTS midtrans_order_id;
-- ALTER TABLE public.transactions DROP COLUMN IF EXISTS snap_token;

-- ============================================================
-- HAPUS POLICIES LAMA
-- ============================================================

DROP POLICY IF EXISTS "Users can view their own royalties" ON public.royalties_ledger;
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own analytics" ON public.store_analytics;
DROP POLICY IF EXISTS "Users can view their splits" ON public.release_splits;
DROP POLICY IF EXISTS "Users can view their own releases" ON public.releases;
DROP POLICY IF EXISTS "Users can insert their own releases" ON public.releases;
DROP POLICY IF EXISTS "Admins can manage royalties" ON public.royalties_ledger;
DROP POLICY IF EXISTS "Users can insert their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can view own distributions" ON public.spotify_distributions;
DROP POLICY IF EXISTS "Users can view own analytics" ON public.spotify_analytics;
DROP POLICY IF EXISTS "Admins can view all distributions" ON public.spotify_distributions;
DROP POLICY IF EXISTS "Users can view own delivery queue" ON public.delivery_queue;
DROP POLICY IF EXISTS "Users can view own distribution logs" ON public.distribution_logs;
DROP POLICY IF EXISTS p_prof_v ON public.profiles;
DROP POLICY IF EXISTS p_prof_u ON public.profiles;
DROP POLICY IF EXISTS p_trx_v ON public.transactions;
DROP POLICY IF EXISTS p_tra_v ON public.transactions;
DROP POLICY IF EXISTS p_rel_v ON public.releases;
DROP POLICY IF EXISTS p_rel_i ON public.releases;
DROP POLICY IF EXISTS p_roy_v ON public.royalties_ledger;
DROP POLICY IF EXISTS p_store_v ON public.store_analytics;
DROP POLICY IF EXISTS p_split_v ON public.release_splits;

-- ============================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.royalties_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.release_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spotify_distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spotify_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artist_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distribution_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES — PROFILES
-- ============================================================

CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE USING (auth.uid()::text = id::text);

-- ============================================================
-- RLS POLICIES — RELEASES
-- ============================================================

CREATE POLICY "Users can view their own releases" ON public.releases
FOR SELECT USING (auth.uid()::text = user_id::text);

-- Backend (service_role) akan insert releases, bukan user langsung
-- INSERT handled by backend with service_role key

-- ============================================================
-- RLS POLICIES — TRANSACTIONS
-- ============================================================

CREATE POLICY "Users can view their own transactions" ON public.transactions
FOR SELECT USING (auth.uid()::text = user_id::text);

-- ============================================================
-- RLS POLICIES — ROYALTIES
-- ============================================================

CREATE POLICY "Users can view their own royalties" ON public.royalties_ledger
FOR SELECT USING (auth.uid()::text = user_id::text);

-- ============================================================
-- RLS POLICIES — STORE ANALYTICS
-- ============================================================

CREATE POLICY "Users can view their own analytics" ON public.store_analytics
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.releases
        WHERE releases.id = store_analytics.release_id
          AND releases.user_id::text = auth.uid()::text
    )
);

-- ============================================================
-- RLS POLICIES — RELEASE SPLITS
-- ============================================================

CREATE POLICY "Users can view their splits" ON public.release_splits
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.releases
        WHERE releases.id = release_splits.release_id
          AND releases.user_id::text = auth.uid()::text
    )
    OR email = (SELECT email FROM auth.users WHERE id::text = auth.uid()::text)
);

-- ============================================================
-- RLS POLICIES — DISTRIBUTION TABLES
-- ============================================================

CREATE POLICY "Users can view own distributions" ON public.spotify_distributions
FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view own analytics" ON public.spotify_analytics
FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view own artist commissions" ON public.artist_commissions
FOR SELECT USING (auth.uid()::text = user_id::text);

-- Admin commissions hanya bisa dilihat service role (backend)
-- tidak perlu policy karena backend pakai service_role key

CREATE POLICY "Users can view own delivery queue" ON public.delivery_queue
FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view own distribution logs" ON public.distribution_logs
FOR SELECT USING (auth.uid()::text = user_id::text);

-- ============================================================
-- INDEXES — PERFORMA
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_releases_user_id ON public.releases(user_id);
CREATE INDEX IF NOT EXISTS idx_releases_status ON public.releases(status);
CREATE INDEX IF NOT EXISTS idx_releases_isrc ON public.releases(isrc);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_royalties_user_id ON public.royalties_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_distributions_release_id ON public.spotify_distributions(release_id);
CREATE INDEX IF NOT EXISTS idx_distributions_user_id ON public.spotify_distributions(user_id);
CREATE INDEX IF NOT EXISTS idx_distributions_status ON public.spotify_distributions(status);
CREATE INDEX IF NOT EXISTS idx_distributions_platform ON public.spotify_distributions(platform);
CREATE INDEX IF NOT EXISTS idx_analytics_release_id ON public.spotify_analytics(release_id);
CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON public.spotify_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_report_date ON public.spotify_analytics(report_date);
CREATE INDEX IF NOT EXISTS idx_delivery_queue_release_id ON public.delivery_queue(release_id);
CREATE INDEX IF NOT EXISTS idx_delivery_queue_user_id ON public.delivery_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_delivery_queue_status ON public.delivery_queue(status);
CREATE INDEX IF NOT EXISTS idx_distribution_logs_release_id ON public.distribution_logs(release_id);

-- ============================================================
-- FUNGSI ISRC GENERATOR
-- ============================================================

CREATE OR REPLACE FUNCTION public.generate_next_isrc()
RETURNS TEXT AS $$
DECLARE
    country_code TEXT := 'ID';
    registrant_code TEXT := 'DBM';
    current_year TEXT := TO_CHAR(NOW(), 'YY');
    last_isrc TEXT;
    last_seq INT;
    new_seq TEXT;
BEGIN
    SELECT isrc INTO last_isrc
    FROM public.releases
    WHERE isrc LIKE country_code || registrant_code || current_year || '%'
    ORDER BY isrc DESC
    LIMIT 1;

    IF last_isrc IS NULL THEN
        last_seq := 0;
    ELSE
        last_seq := RIGHT(last_isrc, 5)::INT;
    END IF;

    last_seq := last_seq + 1;
    new_seq := LPAD(last_seq::TEXT, 5, '0');

    RETURN country_code || registrant_code || current_year || new_seq;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FUNGSI UPC GENERATOR
-- ============================================================

CREATE OR REPLACE FUNCTION public.generate_next_upc()
RETURNS TEXT AS $$
DECLARE
    base_prefix TEXT := '880';
    disba_code TEXT := '4821';
    seq INT;
    raw TEXT;
    check_digit INT;
    i INT;
    digit INT;
    sum INT := 0;
BEGIN
    SELECT COUNT(*) + 1 INTO seq FROM public.releases WHERE upc IS NOT NULL;
    raw := base_prefix || disba_code || LPAD(seq::TEXT, 4, '0') || '0';

    FOR i IN 1..LENGTH(raw) LOOP
        digit := SUBSTRING(raw, i, 1)::INT;
        IF i % 2 = 1 THEN sum := sum + digit;
        ELSE sum := sum + (digit * 3);
        END IF;
    END LOOP;

    check_digit := (10 - (sum % 10)) % 10;
    RETURN SUBSTRING(raw, 1, LENGTH(raw) - 1) || check_digit::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TRIGGER — PROTECT PROFILE SENSITIVE FIELDS
-- ============================================================

CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_fields()
RETURNS TRIGGER AS $$
BEGIN
    IF COALESCE(current_setting('request.jwt.claim.role', true), '') <> 'service_role' THEN
        IF NEW.role IS DISTINCT FROM OLD.role
           OR NEW.email IS DISTINCT FROM OLD.email
           OR NEW.quota IS DISTINCT FROM OLD.quota
           OR NEW.wallet_balance IS DISTINCT FROM OLD.wallet_balance
           OR NEW.subscription_tier IS DISTINCT FROM OLD.subscription_tier
           OR NEW.subscription_active_until IS DISTINCT FROM OLD.subscription_active_until
           OR NEW.split_percentage IS DISTINCT FROM OLD.split_percentage THEN
            RAISE EXCEPTION 'Updating protected profile fields is not allowed directly. Use the backend API.';
        END IF;
    END IF;
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS protect_profile_sensitive_fields_trigger ON public.profiles;
CREATE TRIGGER protect_profile_sensitive_fields_trigger
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profile_sensitive_fields();

-- ============================================================
-- TRIGGER — AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role, quota, subscription_tier)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        'artist',
        1,
        'inactive'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- SELESAI — Semua tabel, index, policies, fungsi sudah dibuat
-- ============================================================
