# Supabase Edge Functions for Webhook Processing
# These functions handle revenue webhooks from music platforms

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { platform } = req.url.split('/').pop() || ''
    const payload = await req.json()

    // Verify webhook signature based on platform
    const isValid = await verifyWebhookSignature(platform, payload, req.headers)

    if (!isValid) {
      return new Response(
        JSON.stringify({ error: 'Invalid webhook signature' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Process revenue data
    await processRevenueWebhook(supabaseClient, platform, payload)

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('Webhook processing error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

async function verifyWebhookSignature(platform, payload, headers) {
  const secret = Deno.env.get(`${platform.toUpperCase()}_WEBHOOK_SECRET`)
  if (!secret) return false

  const signature = headers.get('x-webhook-signature')
  if (!signature) return false

  // Implement HMAC verification based on platform
  // This is a simplified version - implement proper verification for each platform
  return true // Placeholder - implement actual verification
}

async function processRevenueWebhook(supabase, platform, payload) {
  const { release_id, revenue, streams, date, track_id } = payload

  // Find distribution record
  const { data: distribution } = await supabase
    .from('spotify_distributions')
    .select('*')
    .eq('platform_track_id', track_id)
    .eq('platform', platform)
    .single()

  if (!distribution) {
    console.warn('Distribution not found for webhook:', payload)
    return
  }

  // Calculate commission (15% DISBA, 85% Artist)
  const disbaCommission = revenue * 0.15
  const artistPayout = revenue * 0.85

  // Save to royalties_ledger
  await supabase.from('royalties_ledger').insert([{
    user_id: distribution.user_id,
    release_id: distribution.release_id,
    platform: platform,
    streams: streams || 0,
    revenue: revenue,
    disba_commission: disbaCommission,
    artist_payout: artistPayout,
    payout_date: date || new Date().toISOString().split('T')[0],
    status: 'pending'
  }])

  // Update artist wallet balance
  const { data: profile } = await supabase
    .from('profiles')
    .select('wallet_balance')
    .eq('id', distribution.user_id)
    .single()

  if (profile) {
    await supabase
      .from('profiles')
      .update({ wallet_balance: (profile.wallet_balance || 0) + artistPayout })
      .eq('id', distribution.user_id)
  }

  // Monthly admin commission tracking
  const month = new Date().toISOString().slice(0, 7) // YYYY-MM
  await supabase.from('admin_commissions').upsert([{
    month: month,
    total_revenue: revenue,
    total_commission: disbaCommission
  }], { onConflict: 'month' })

  console.log(`Processed ${platform} revenue: ${revenue} IDR, Commission: ${disbaCommission} IDR`)
}