-- Webhook secrets and API keys configuration
-- These should be set in Supabase Dashboard > Settings > Edge Functions > Environment Variables

-- Required Environment Variables for Edge Functions:
-- SUPABASE_URL - Your Supabase project URL
-- SUPABASE_ANON_KEY - Your Supabase anon key
-- SPOTIFY_WEBHOOK_SECRET - Secret for Spotify webhook verification
-- TUNECORE_WEBHOOK_SECRET - Secret for TuneCore webhook verification
-- APPLE_MUSIC_WEBHOOK_SECRET - Secret for Apple Music webhook verification

-- Webhook URLs for music platforms:
-- Spotify: https://your-project.supabase.co/functions/v1/process-revenue-webhook/spotify
-- TuneCore: https://your-project.supabase.co/functions/v1/process-revenue-webhook/tunecore
-- Apple Music: https://your-project.supabase.co/functions/v1/process-revenue-webhook/apple_music

-- API Keys (set in Supabase Dashboard > Settings > API):
-- SPOTIFY_DISTRIBUTION_API_KEY
-- TUNECORE_DISTRIBUTION_API_KEY
-- APPLE_MUSIC_DISTRIBUTION_API_KEY