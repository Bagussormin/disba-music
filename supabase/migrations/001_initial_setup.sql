-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.release_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.royalties_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spotify_distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spotify_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artist_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_commissions ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Releases policies
CREATE POLICY "Users can view own releases" ON public.releases
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create releases" ON public.releases
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own releases" ON public.releases
    FOR UPDATE USING (auth.uid() = user_id);

-- Admin can view all releases
CREATE POLICY "Admins can view all releases" ON public.releases
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Release splits policies
CREATE POLICY "Users can view splits for own releases" ON public.release_splits
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.releases
            WHERE id = release_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create splits for own releases" ON public.release_splits
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.releases
            WHERE id = release_id AND user_id = auth.uid()
        )
    );

-- Transactions policies
CREATE POLICY "Users can view own transactions" ON public.transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create transactions" ON public.transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admin can view all transactions
CREATE POLICY "Admins can view all transactions" ON public.transactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Royalties ledger policies
CREATE POLICY "Users can view own royalties" ON public.royalties_ledger
    FOR SELECT USING (auth.uid() = user_id);

-- Admin can view all royalties
CREATE POLICY "Admins can view all royalties" ON public.royalties_ledger
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Spotify distributions policies
CREATE POLICY "Users can view own distributions" ON public.spotify_distributions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create distributions" ON public.spotify_distributions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admin can view all distributions
CREATE POLICY "Admins can view all distributions" ON public.spotify_distributions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Analytics policies
CREATE POLICY "Users can view analytics for own tracks" ON public.spotify_analytics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.spotify_distributions
            WHERE id = spotify_distribution_id AND user_id = auth.uid()
        )
    );

-- Artist commissions policies
CREATE POLICY "Users can view own commissions" ON public.artist_commissions
    FOR SELECT USING (auth.uid() = user_id);

-- Admin commissions policies (admin only)
CREATE POLICY "Admins can view admin commissions" ON public.admin_commissions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_releases_user_id ON public.releases(user_id);
CREATE INDEX IF NOT EXISTS idx_releases_status ON public.releases(status);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);
CREATE INDEX IF NOT EXISTS idx_royalties_user_id ON public.royalties_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_distributions_user_id ON public.spotify_distributions(user_id);
CREATE INDEX IF NOT EXISTS idx_distributions_platform ON public.spotify_distributions(platform);
CREATE INDEX IF NOT EXISTS idx_analytics_distribution_id ON public.spotify_analytics(spotify_distribution_id);

-- Create function to generate ISRC
CREATE OR REPLACE FUNCTION generate_next_isrc()
RETURNS TEXT AS $$
DECLARE
    current_year TEXT := EXTRACT(YEAR FROM NOW())::TEXT;
    current_month TEXT := LPAD(EXTRACT(MONTH FROM NOW())::TEXT, 2, '0');
    country_code TEXT := 'ID'; -- Indonesia
    registrant_code TEXT := 'DBM'; -- DISBA Music
    next_sequence INT;
BEGIN
    -- Get next sequence number
    SELECT COALESCE(MAX(CAST(SUBSTRING(isrc FROM 10) AS INT)), 0) + 1
    INTO next_sequence
    FROM public.releases
    WHERE SUBSTRING(isrc FROM 1, 9) = current_year || country_code || registrant_code;

    -- Return formatted ISRC
    RETURN current_year || country_code || registrant_code || LPAD(next_sequence::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;