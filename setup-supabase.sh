#!/bin/bash

# Supabase CLI Setup Script
# This script helps set up Supabase project with all necessary configurations

echo "🚀 Setting up DISBA Music Supabase Project..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "npm install -g supabase"
    exit 1
fi

# Login to Supabase (if not already logged in)
echo "🔐 Please login to Supabase CLI:"
supabase login

# Initialize or link project
if [ ! -d ".supabase" ]; then
    echo "📁 Initializing Supabase project..."
    supabase init
else
    echo "🔗 Linking to existing Supabase project..."
    supabase link --project-ref hwxrxwfrpilxkpdlolph
fi

# Set up environment variables
echo "🔧 Setting up environment variables..."
supabase secrets set SPOTIFY_WEBHOOK_SECRET=your_spotify_webhook_secret_here
supabase secrets set TUNECORE_WEBHOOK_SECRET=your_tunecore_webhook_secret_here
supabase secrets set APPLE_MUSIC_WEBHOOK_SECRET=your_apple_music_webhook_secret_here

# Deploy edge functions
echo "⚙️ Deploying edge functions..."
supabase functions deploy process-revenue-webhook

# Run migrations
echo "🗃️ Running database migrations..."
supabase db push

# Set up auth hooks (if needed)
echo "🔐 Setting up authentication..."

echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Go to Supabase Dashboard > Edge Functions"
echo "2. Set environment variables for API keys:"
echo "   - SPOTIFY_DISTRIBUTION_API_KEY"
echo "   - TUNECORE_DISTRIBUTION_API_KEY"
echo "   - APPLE_MUSIC_DISTRIBUTION_API_KEY"
echo "3. Configure webhook URLs in music platform dashboards:"
echo "   - Spotify: https://your-project.supabase.co/functions/v1/process-revenue-webhook/spotify"
echo "   - TuneCore: https://your-project.supabase.co/functions/v1/process-revenue-webhook/tunecore"
echo "   - Apple Music: https://your-project.supabase.co/functions/v1/process-revenue-webhook/apple_music"
echo "4. Test webhook endpoints with sample data"