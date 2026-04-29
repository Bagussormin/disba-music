-- Migration untuk Disba-Music Platform
-- Jalankan di SQL Editor Supabase

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS amount NUMERIC;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS transaction_ref TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS midtrans_order_id TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS snap_token TEXT;
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_midtrans_order_id_key;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_midtrans_order_id_key UNIQUE (midtrans_order_id);

-- Drop legacy policies first so old deployments do not block policy refresh.
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

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.royalties_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.release_splits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own royalties" ON public.royalties_ledger
FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view their own transactions" ON public.transactions
FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE USING (auth.uid()::text = id::text);

CREATE POLICY "Users can view their own analytics" ON public.store_analytics
FOR SELECT USING (
    EXISTS (
        SELECT 1
        FROM public.releases
        WHERE releases.id::text = store_analytics.release_id::text
          AND releases.user_id::text = auth.uid()::text
    )
);

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

CREATE POLICY "Users can view their own releases" ON public.releases
FOR SELECT USING (auth.uid()::text = user_id::text);

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
