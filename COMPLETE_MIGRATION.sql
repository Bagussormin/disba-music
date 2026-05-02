-- COMPLETE MIGRATION - Disba Music Platform v2.0
-- Include All Required Tables for Manual Payment + Spotify Integration
-- Jalankan di Supabase SQL Editor

-- ============================================================
-- ENABLE EXTENSION
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- CORE TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    email TEXT,
    role TEXT DEFAULT 'artist',
    quota INT DEFAULT 0,
    wallet_balance NUMERIC DEFAULT 0.00,
    subscription_tier TEXT DEFAULT 'free',
    subscription_active_until TIMESTAMP WITH TIME ZONE,
    split_percentage NUMERIC DEFAULT 80,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.releases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT,
    genre TEXT,
    audio_url TEXT,
    cover_url TEXT,
    status TEXT DEFAULT 'pending',
    isrc TEXT UNIQUE,
    upc TEXT,
    explicit_lyrics BOOLEAN DEFAULT FALSE,
    split_percentage NUMERIC DEFAULT 80,
    album_name TEXT,
    selected_stores TEXT[],
    spotify_track_id TEXT,
    spotify_status TEXT,
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
    midtrans_order_id TEXT UNIQUE,
    snap_token TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.royalties_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    release_id UUID REFERENCES public.releases(id),
    amount_earned NUMERIC DEFAULT 0.00,
    report_month DATE NOT NULL,
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

CREATE TABLE IF NOT EXISTS public.store_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    release_id UUID REFERENCES public.releases(id),
    store_name TEXT NOT NULL,
    streams_count BIGINT DEFAULT 0,
    revenue NUMERIC DEFAULT 0.00,
    report_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- SPOTIFY INTEGRATION TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.spotify_distributions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    release_id UUID REFERENCES public.releases(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    spotify_track_id TEXT UNIQUE,
    spotify_uri TEXT,
    status TEXT DEFAULT 'pending',
    distribution_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.spotify_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    spotify_distribution_id UUID REFERENCES public.spotify_distributions(id),
    release_id UUID REFERENCES public.releases(id),
    user_id UUID REFERENCES auth.users(id),
    report_date DATE NOT NULL,
    streams BIGINT DEFAULT 0,
    total_revenue NUMERIC DEFAULT 0.00,
    disba_commission NUMERIC DEFAULT 0.00,
    artist_payout NUMERIC DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- COMMISSION TRACKING TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.admin_commissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    month TEXT NOT NULL UNIQUE,
    total_artist_earnings NUMERIC DEFAULT 0.00,
    total_commission NUMERIC DEFAULT 0.00,
    commission_percentage NUMERIC DEFAULT 15,
    status TEXT DEFAULT 'calculated',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.artist_commissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    admin_commission_id UUID REFERENCES public.admin_commissions(id),
    artist_earnings NUMERIC DEFAULT 0.00,
    commission_owed NUMERIC DEFAULT 0.00,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.artist_balances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) UNIQUE ON DELETE CASCADE,
    balance NUMERIC DEFAULT 0.00,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- ADD COLUMNS IF NOT EXISTS
-- ============================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'artist';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS quota INT DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC DEFAULT 0.00;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_active_until TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS split_percentage NUMERIC DEFAULT 80;

ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS genre TEXT;
ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS audio_url TEXT;
ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS cover_url TEXT;
ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS isrc TEXT UNIQUE;
ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS upc TEXT;
ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS explicit_lyrics BOOLEAN DEFAULT FALSE;
ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS split_percentage NUMERIC DEFAULT 80;
ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS album_name TEXT;
ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS selected_stores TEXT[];
ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS spotify_track_id TEXT;
ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS spotify_status TEXT;

ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS amount NUMERIC;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS transaction_ref TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS midtrans_order_id TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS snap_token TEXT;
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_midtrans_order_id_key;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_midtrans_order_id_key UNIQUE (midtrans_order_id);

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
ALTER TABLE public.artist_balances ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- DROP OLD POLICIES
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
DROP POLICY IF EXISTS p_prof_v ON public.profiles;
DROP POLICY IF EXISTS p_prof_u ON public.profiles;
DROP POLICY IF EXISTS p_trx_v ON public.transactions;
DROP POLICY IF EXISTS p_tra_v ON public.transactions;
DROP POLICY IF EXISTS p_rel_v ON public.releases;
DROP POLICY IF EXISTS p_rel_i ON public.releases;
DROP POLICY IF EXISTS p_roy_v ON public.royalties_ledger;
DROP POLICY IF EXISTS p_store_v ON public.store_analytics;
DROP POLICY IF EXISTS p_split_v ON public.release_splits;
DROP POLICY IF EXISTS "Users can view spotify distributions" ON public.spotify_distributions;
DROP POLICY IF EXISTS "Users can view spotify analytics" ON public.spotify_analytics;
DROP POLICY IF EXISTS "Users can view artist commissions" ON public.artist_commissions;
DROP POLICY IF EXISTS "Users can view artist balances" ON public.artist_balances;

-- ============================================================
-- CREATE NEW RLS POLICIES
-- ============================================================

-- Profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE USING (auth.uid()::text = id::text);

-- Releases
CREATE POLICY "Users can view their own releases" ON public.releases
FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert their own releases" ON public.releases
FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Transactions
CREATE POLICY "Users can view their own transactions" ON public.transactions
FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert their own transactions" ON public.transactions
FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Royalties Ledger
CREATE POLICY "Users can view their own royalties" ON public.royalties_ledger
FOR SELECT USING (auth.uid()::text = user_id::text);

-- Store Analytics
CREATE POLICY "Users can view their own analytics" ON public.store_analytics
FOR SELECT USING (
    EXISTS (
        SELECT 1
        FROM public.releases
        WHERE releases.id::text = store_analytics.release_id::text
          AND releases.user_id::text = auth.uid()::text
    )
);

-- Release Splits
CREATE POLICY "Users can view their splits" ON public.release_splits
FOR SELECT USING (
    EXISTS (
        SELECT 1
        FROM public.releases
        WHERE releases.id::text = release_splits.release_id::text
          AND releases.user_id::text = auth.uid()::text
    )
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Spotify Distributions
CREATE POLICY "Users can view their spotify distributions" ON public.spotify_distributions
FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert spotify distributions" ON public.spotify_distributions
FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Spotify Analytics
CREATE POLICY "Users can view their spotify analytics" ON public.spotify_analytics
FOR SELECT USING (auth.uid()::text = user_id::text);

-- Artist Commissions (Users can see their own)
CREATE POLICY "Users can view their artist commissions" ON public.artist_commissions
FOR SELECT USING (auth.uid()::text = user_id::text);

-- Artist Balances (CRITICAL: RLS MUST BE TRUE!)
CREATE POLICY "Users can view their own balance" ON public.artist_balances
FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own balance" ON public.artist_balances
FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Admin Commissions (Admin only)
CREATE POLICY "Admins can view commissions" ON public.admin_commissions
FOR SELECT USING (
    EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
);

-- ============================================================
-- FUNCTIONS
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
            RAISE EXCEPTION 'Updating protected profile fields is not allowed.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS protect_profile_sensitive_fields_trigger ON public.profiles;
CREATE TRIGGER protect_profile_sensitive_fields_trigger
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profile_sensitive_fields();

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================
