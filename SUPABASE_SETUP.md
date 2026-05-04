# DISBA Music Supabase Setup Guide

## Prerequisites
- Supabase CLI installed (`npm install -g supabase`)
- Supabase account and project created
- API keys from music distribution platforms

## Quick Setup

### 1. Run Setup Script
```bash
chmod +x setup-supabase.sh
./setup-supabase.sh
```

### 2. Manual Setup (Alternative)

#### Link to Supabase Project
```bash
supabase login
supabase link --project-ref hwxrxwfrpilxkpdlolph
```

#### Set Environment Variables
```bash
# Webhook Secrets
supabase secrets set SPOTIFY_WEBHOOK_SECRET=your_spotify_secret
supabase secrets set TUNECORE_WEBHOOK_SECRET=your_tunecore_secret
supabase secrets set APPLE_MUSIC_WEBHOOK_SECRET=your_apple_secret

# API Keys
supabase secrets set SPOTIFY_DISTRIBUTION_API_KEY=your_spotify_api_key
supabase secrets set TUNECORE_DISTRIBUTION_API_KEY=your_tunecore_api_key
supabase secrets set APPLE_MUSIC_DISTRIBUTION_API_KEY=your_apple_api_key
```

#### Deploy Edge Functions
```bash
supabase functions deploy process-revenue-webhook
```

#### Run Database Migrations
```bash
supabase db push
```

## Supabase Dashboard Configuration

### 1. Environment Variables
Go to **Settings > Edge Functions > Environment Variables** and set:
- `SPOTIFY_WEBHOOK_SECRET`
- `TUNECORE_WEBHOOK_SECRET`
- `APPLE_MUSIC_WEBHOOK_SECRET`

### 2. API Keys
Go to **Settings > API** and note your:
- Project URL
- Anon Key
- Service Role Key

### 3. Database
Go to **SQL Editor** and run the migration file:
```sql
-- Copy contents of supabase/migrations/001_initial_setup.sql
```

## Music Platform Webhook Configuration

### Spotify Distribution Partner
1. Go to your Spotify distribution dashboard
2. Add webhook URL: `https://your-project.supabase.co/functions/v1/process-revenue-webhook/spotify`
3. Set webhook secret to match `SPOTIFY_WEBHOOK_SECRET`

### TuneCore
1. Go to TuneCore API settings
2. Add webhook URL: `https://your-project.supabase.co/functions/v1/process-revenue-webhook/tunecore`
3. Set webhook secret to match `TUNECORE_WEBHOOK_SECRET`

### Apple Music
1. Go to Apple Music distribution settings
2. Add webhook URL: `https://your-project.supabase.co/functions/v1/process-revenue-webhook/apple_music`
3. Set webhook secret to match `APPLE_MUSIC_WEBHOOK_SECRET`

## Testing

### Test Webhook Endpoint
```bash
curl -X POST https://your-project.supabase.co/functions/v1/process-revenue-webhook/spotify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-anon-key" \
  -d '{
    "track_id": "test-track-123",
    "revenue": 100000,
    "streams": 1000,
    "date": "2026-05-05"
  }'
```

### Test Database Connection
```bash
curl https://hwxrxwfrpilxkpdlolph.supabase.co/rest/v1/profiles?select=* \
  -H "apikey: your-anon-key"
```

## Troubleshooting

### Common Issues
1. **Webhook signature verification fails**: Check webhook secrets match between platforms and Supabase
2. **Database connection fails**: Verify RLS policies and API keys
3. **Edge function deployment fails**: Check function syntax and dependencies

### Logs
Check function logs in Supabase Dashboard > Edge Functions > process-revenue-webhook > Logs