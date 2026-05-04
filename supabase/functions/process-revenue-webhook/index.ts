import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
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

    const urlParts = req.url.split('/')
    const platform = urlParts[urlParts.length - 1]
    const payload = await req.json()

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

  return true
}

async function processRevenueWebhook(supabase, platform, payload) {
  const { release_id, revenue, streams, date, track_id } = payload

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

  const disbaCommission = revenue * 0.15
  const artistPayout = revenue * 0.85

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

  const month = new Date().toISOString().slice(0, 7)
  await supabase.from('admin_commissions').upsert([{
    month: month,
    total_revenue: revenue,
    total_commission: disbaCommission
  }], { onConflict: 'month' })

  console.log(`Processed ${platform} revenue: ${revenue} IDR, Commission: ${disbaCommission} IDR`)
}