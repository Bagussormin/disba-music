-- Migration untuk Disba-Music Platform Agregator
-- Jalankan perintah ini di SQL Editor pada Dashboard Supabase Anda

-- 1. Pastikan Tabel Profiles Ada (Base Table)
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

-- 2. Pastikan Tabel Releases Ada (Base Table)
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

-- 3. Tambahkan kolom jika tabel sudah ada sebelumnya (Idempotent)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'artist';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS quota INT DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC DEFAULT 0.00;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free';
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

-- 4. Membuat Tabel Pendukung
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

-- 5. Aktifkan RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.royalties_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.release_splits ENABLE ROW LEVEL SECURITY;

-- 6. Hapus Policy Lama (Mencegah Error Duplicate)
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can view their own royalties" ON public.royalties_ledger;
    DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transactions;
    DROP POLICY IF EXISTS "Admins can manage royalties" ON public.royalties_ledger;
    DROP POLICY IF EXISTS "Users can view their own releases" ON public.releases;
    DROP POLICY IF EXISTS "Users can insert their own releases" ON public.releases;
    DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can view their own analytics" ON public.store_analytics;
    DROP POLICY IF EXISTS "Users can view their splits" ON public.release_splits;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 7. Membuat Policy Baru (Disederhanakan untuk menghindari Rekursi)
CREATE POLICY "Users can view their own royalties" ON public.royalties_ledger
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own transactions" ON public.transactions
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view their own analytics" ON public.store_analytics
FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.releases WHERE id = release_id AND user_id = auth.uid()
));

CREATE POLICY "Users can view their splits" ON public.release_splits
FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.releases WHERE id = release_id AND user_id = auth.uid()
) OR email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Agar sistem bisa reload cache PostgREST (Opsional, dijalankan manual di SQL Editor jika butuh)
-- NOTIFY pgrst, 'reload schema';

-- 8. Fungsi ISRC Atomis
CREATE OR REPLACE FUNCTION generate_next_isrc()
RETURNS TEXT AS $$
DECLARE
    country_code TEXT := 'ID';
    registrant_code TEXT := 'DBM';
    current_year TEXT := TO_CHAR(NOW(), 'YY');
    last_isrc TEXT;
    last_seq INT;
    new_seq TEXT;
BEGIN
    SELECT isrc INTO last_isrc FROM public.releases 
    WHERE isrc LIKE country_code || registrant_code || current_year || '%'
    ORDER BY isrc DESC LIMIT 1;

    IF last_isrc IS NULL THEN last_seq := 0;
    ELSE last_seq := RIGHT(last_isrc, 5)::INT;
    END IF;

    last_seq := last_seq + 1;
    new_seq := LPAD(last_seq::TEXT, 5, '0');
    RETURN country_code || registrant_code || current_year || new_seq;
END;
$$ LANGUAGE plpgsql;

-- 9. Pembaruan Tabel Transactions Khusus Integrasi Midtrans
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS midtrans_order_id TEXT UNIQUE;
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_midtrans_order_id_key;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_midtrans_order_id_key UNIQUE (midtrans_order_id);
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS snap_token TEXT;
