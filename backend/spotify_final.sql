-- Spotify Integration Tables for DISBA Music (SUPER CLEAN VERSION)
-- Run this in Supabase SQL Editor

-- Table untuk track distribution ke Spotify
CREATE TABLE IF NOT EXISTS public.spotify_distributions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    release_id UUID REFERENCES public.releases(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    spotify_track_id TEXT UNIQUE,
    spotify_uri TEXT,
    status TEXT DEFAULT 'pending',
    distribution_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table untuk track Spotify analytics & royalties
CREATE TABLE IF NOT EXISTS public.spotify_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    spotify_distribution_id UUID REFERENCES public.spotify_distributions(id) ON DELETE CASCADE,
    release_id UUID REFERENCES public.releases(id),
    user_id UUID REFERENCES auth.users(id),
    report_date DATE NOT NULL,
    streams BIGINT DEFAULT 0,
    total_revenue NUMERIC DEFAULT 0.00,
    disba_commission NUMERIC DEFAULT 0.00,
    artist_payout NUMERIC DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(spotify_distribution_id, report_date)
);

-- Table untuk commission tracking
CREATE TABLE IF NOT EXISTS public.admin_commissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    month DATE NOT NULL,
    total_artist_earnings NUMERIC DEFAULT 0.00,
    total_commission NUMERIC DEFAULT 0.00,
    commission_percentage NUMERIC DEFAULT 15.00,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(month)
);

-- Table untuk track commission per artist
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

-- Add columns untuk Spotify di releases table
ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS spotify_track_id TEXT;
ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS spotify_status TEXT DEFAULT 'not_distributed';

-- Enable RLS untuk semua Spotify tables
ALTER TABLE public.spotify_distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spotify_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artist_commissions ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_spotify_distributions_release_id ON public.spotify_distributions(release_id);
CREATE INDEX IF NOT EXISTS idx_spotify_distributions_user_id ON public.spotify_distributions(user_id);
CREATE INDEX IF NOT EXISTS idx_spotify_distributions_status ON public.spotify_distributions(status);
CREATE INDEX IF NOT EXISTS idx_spotify_analytics_release_id ON public.spotify_analytics(release_id);
CREATE INDEX IF NOT EXISTS idx_spotify_analytics_user_id ON public.spotify_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_spotify_analytics_report_date ON public.spotify_analytics(report_date);
CREATE INDEX IF NOT EXISTS idx_admin_commissions_month ON public.admin_commissions(month);
CREATE INDEX IF NOT EXISTS idx_artist_commissions_user_id ON public.artist_commissions(user_id);
