
-- Migration: Create landing page content tables
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.djs (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    stage_name TEXT NOT NULL,
    rank INT,
    plays TEXT,
    likes TEXT,
    image TEXT,
    badge TEXT,
    genre TEXT,
    location TEXT,
    bio TEXT,
    recent_tracks TEXT[],
    upcoming TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.events (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    venue TEXT NOT NULL,
    date TEXT NOT NULL,
    image TEXT,
    status TEXT,
    color TEXT,
    lineup TEXT[],
    description TEXT,
    price TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.djs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access on djs" ON public.djs FOR SELECT USING (true);
CREATE POLICY "Allow public read access on events" ON public.events FOR SELECT USING (true);

-- Seed Data for DJs
INSERT INTO public.djs (name, stage_name, rank, plays, likes, image, badge, genre, location, bio, recent_tracks, upcoming)
VALUES 
('Andri Bayu', 'DJ VORTEX', 1, '124.5k', '12.4k', 'https://hwxrxwfrpilxkpdlolph.supabase.co/storage/v1/object/public/rilisan/assets/dj-1.png', 'Trending', 'Melodic Techno', 'Jakarta, ID', 'Pioneer of the Jakarta underground melodic techno scene. Known for atmospheric sets and deep basslines.', ARRAY['Midnight Drive (Original Mix)', 'Nebula Pulse', 'Jakarta After Dark'], 'Skyline Lounge - Tonight'),
('Siska Putri', 'LUNA RAY', 2, '98.2k', '8.7k', 'https://hwxrxwfrpilxkpdlolph.supabase.co/storage/v1/object/public/rilisan/assets/dj-2.png', 'Rising', 'Progressive House', 'Bali, ID', 'Blending traditional island vibes with modern progressive beats. A crowd favorite in the Bali club circuit.', ARRAY['Island Sunset', 'Neon Lights (Deep Mix)', 'Ocean Breath'], 'The Vault - Friday'),
('Bimo Seto', 'NOVA PULSE', 3, '75.1k', '6.2k', 'https://hwxrxwfrpilxkpdlolph.supabase.co/storage/v1/object/public/rilisan/assets/dj-1.png', 'Crowd Fav', 'Tech House', 'Bandung, ID', 'Energy is the name of the game. Bimo brings high-octane tech house that keeps the dancefloor moving.', ARRAY['Summer Ghost', 'Rhythm Machine', 'Bassline Theory'], 'Arena Stage - Saturday'),
('Dafa Pratama', 'ZENITH', 4, '62.8k', '5.1k', 'https://hwxrxwfrpilxkpdlolph.supabase.co/storage/v1/object/public/rilisan/assets/dj-2.png', 'Top 10', 'Industrial Techno', 'Surabaya, ID', 'Dark, raw, and uncompromising. Zenith is the sound of the industrial outskirts of Surabaya.', ARRAY['Steel Works', 'Cold Night', 'Transmission'], 'Warehouse 13 - Sunday')
ON CONFLICT DO NOTHING;

-- Seed Data for Events
INSERT INTO public.events (title, venue, date, image, status, color, lineup, description, price)
VALUES 
('NEON PULSE NIGHT', 'Skyline Lounge', 'TONIGHT', 'https://hwxrxwfrpilxkpdlolph.supabase.co/storage/v1/object/public/rilisan/assets/event-1.png', 'ALMOST FULL', 'bg-red-500', ARRAY['Andri Bayu (DJ Vortex)', 'Siska Putri (Luna Ray)'], 'An immersive neon experience at the highest point of the city. Join us for a night of melodic techno and progressive house.', 'IDR 150k'),
('TECHNO UNDERGROUND', 'The Vault', 'FRIDAY, MAY 10', 'https://hwxrxwfrpilxkpdlolph.supabase.co/storage/v1/object/public/rilisan/assets/event-1.png', 'HOT THIS WEEK', 'bg-orange-500', ARRAY['Bimo Seto (Nova Pulse)', 'Guest DJ'], 'Back to the basics. No phones, no lights, just the pulse of the underground in our most intimate venue.', 'IDR 200k'),
('BASS DROP 2024', 'Arena Stage', 'SATURDAY, MAY 11', 'https://hwxrxwfrpilxkpdlolph.supabase.co/storage/v1/object/public/rilisan/assets/event-1.png', 'SELLING FAST', 'bg-blue-500', ARRAY['Dafa Pratama (Zenith)', 'Vortex', 'Pulse'], 'The biggest bass event of the season. Featuring the full Disba roster and special international guests.', 'IDR 350k')
ON CONFLICT DO NOTHING;
