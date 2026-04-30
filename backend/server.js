import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import spotifyService from './services/spotify.js';

dotenv.config();

const {
  FRONTEND_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  VITE_SUPABASE_URL,
  PORT
} = process.env;

if (!SUPABASE_SERVICE_ROLE_KEY || !VITE_SUPABASE_URL) {
  throw new Error('Missing required environment variables for backend startup.');
}

const app = express();
const frontendUrl = FRONTEND_URL || 'http://localhost:5173';
const minimumWithdrawalAmount = 50000;

const supabase = createClient(VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});



app.use(cors({
  origin: [frontendUrl, 'http://localhost:5173'],
  methods: ['GET', 'POST', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

function getBearerToken(req) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.slice('Bearer '.length).trim();
}

async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    throw new Error(`Failed to load profile for user ${userId}: ${error.message}`);
  }

  return data;
}

async function requireAuth(req, res, next) {
  try {
    const accessToken = getBearerToken(req);
    if (!accessToken) {
      return res.status(401).json({ error: 'Missing bearer token.' });
    }

    const { data, error } = await supabase.auth.getUser(accessToken);
    if (error || !data?.user) {
      return res.status(401).json({ error: 'Invalid or expired session.' });
    }

    req.accessToken = accessToken;
    req.user = data.user;
    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    res.status(500).json({ error: 'Authentication failed.' });
  }
}

async function requireAdmin(req, res, next) {
  try {
    const profile = await getProfile(req.user.id);
    if (profile.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required.' });
    }

    req.profile = profile;
    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    res.status(500).json({ error: 'Failed to validate admin access.' });
  }
}

function sanitizeSplits(splits) {
  if (!Array.isArray(splits)) {
    return [];
  }

  return splits
    .filter((split) => split && typeof split.email === 'string' && split.email.trim())
    .map((split) => ({
      email: split.email.trim().toLowerCase(),
      percentage: Number(split.percentage)
    }))
    .filter((split) => Number.isFinite(split.percentage) && split.percentage > 0 && split.percentage <= 100);
}

function generateOrderId() {
  return `DBM-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
}

function generateUpc() {
  return Math.floor(Math.random() * 1000000000000).toString().padStart(12, '0');
}

async function ensureReleaseEntitlement(profile) {
  if (profile.role === 'admin') {
    return;
  }

  if ((profile.quota || 0) <= 0) {
    throw new Error('Token upload habis. Silakan beli Token terlebih dahulu.');
  }
}



app.get('/api/admin/dashboard', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [{ data: users, error: usersError }, { data: releases, error: releasesError }, { data: transactions, error: transactionsError }, { data: royalties, error: royaltiesError }] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('releases').select('*').order('created_at', { ascending: false }),
      supabase.from('transactions').select('*').order('created_at', { ascending: false }),
      supabase.from('royalties_ledger').select('*, releases(title)').order('created_at', { ascending: false })
    ]);

    if (usersError || releasesError || transactionsError || royaltiesError) {
      throw new Error(
        usersError?.message ||
        releasesError?.message ||
        transactionsError?.message ||
        royaltiesError?.message ||
        'Failed to load admin dashboard.'
      );
    }

    res.json({ users, releases, transactions, royalties });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ error: error.message });
  }
});



app.post('/api/releases', requireAuth, async (req, res) => {
  try {
    const { title, genre, audio_url, cover_url, explicit_lyrics, splits, album_name, selected_stores } = req.body || {};
    if (!title || !genre || !audio_url || !cover_url) {
      return res.status(400).json({ error: 'Metadata release belum lengkap.' });
    }

    const profile = await getProfile(req.user.id);
    await ensureReleaseEntitlement(profile);

    const { data: generatedIsrc, error: isrcError } = await supabase.rpc('generate_next_isrc');
    if (isrcError || !generatedIsrc) {
      throw new Error(isrcError?.message || 'Gagal membuat ISRC.');
    }

    const splitPercentage = profile.subscription_tier === 'pro' || profile.role === 'admin' ? 100 : 80;
    const upc = generateUpc();

    const { data: releaseData, error: releaseError } = await supabase
      .from('releases')
      .insert([{
        user_id: req.user.id,
        title: String(title).trim(),
        genre: String(genre).trim(),
        audio_url: String(audio_url).trim(),
        cover_url: String(cover_url).trim(),
        status: 'pending',
        explicit_lyrics: Boolean(explicit_lyrics),
        isrc: generatedIsrc,
        upc,
        split_percentage: splitPercentage,
        album_name: album_name ? String(album_name).trim() : null,
        selected_stores: Array.isArray(selected_stores) ? selected_stores : []
      }])
      .select()
      .single();

    if (releaseError) {
      throw new Error(releaseError.message);
    }

    const validSplits = sanitizeSplits(splits);
    const totalSplitPercentage = validSplits.reduce((sum, split) => sum + split.percentage, 0);
    if (totalSplitPercentage > 100) {
      throw new Error('Total split kolaborator tidak boleh melebihi 100%.');
    }

    if (validSplits.length > 0) {
      const { error: splitsError } = await supabase.from('release_splits').insert(
        validSplits.map((split) => ({
          release_id: releaseData.id,
          email: split.email,
          percentage: split.percentage
        }))
      );

      if (splitsError) {
        throw new Error(`Gagal menyimpan split: ${splitsError.message}`);
      }
    }

    if (profile.role !== 'admin') {
      const { error: quotaError } = await supabase
        .from('profiles')
        .update({ quota: Math.max(0, (profile.quota || 0) - 1) })
        .eq('id', req.user.id);

      if (quotaError) {
        throw new Error(`Gagal mengurangi kuota: ${quotaError.message}`);
      }
    }

    res.status(201).json({ release: releaseData, isrc: generatedIsrc, upc });
  } catch (error) {
    console.error('Create release error:', error);
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/withdrawals/request', requireAuth, async (req, res) => {
  try {
    const profile = await getProfile(req.user.id);
    const currentBalance = Number(profile.wallet_balance || 0);

    if (currentBalance < minimumWithdrawalAmount) {
      return res.status(400).json({ error: `Saldo minimal penarikan Rp ${minimumWithdrawalAmount.toLocaleString('id-ID')}.` });
    }

    const { data: pendingTransactions, error: pendingError } = await supabase
      .from('transactions')
      .select('id')
      .eq('user_id', req.user.id)
      .eq('type', 'withdrawal')
      .eq('status', 'pending');

    if (pendingError) {
      throw new Error(pendingError.message);
    }

    if ((pendingTransactions || []).length > 0) {
      return res.status(400).json({ error: 'Masih ada pengajuan penarikan yang sedang diproses.' });
    }

    const { error: insertError } = await supabase.from('transactions').insert([{
      user_id: req.user.id,
      type: 'withdrawal',
      amount: currentBalance,
      status: 'pending'
    }]);

    if (insertError) {
      throw new Error(insertError.message);
    }

    const { error: balanceError } = await supabase
      .from('profiles')
      .update({ wallet_balance: 0 })
      .eq('id', req.user.id);

    if (balanceError) {
      throw new Error(balanceError.message);
    }

    res.json({ message: 'Pengajuan penarikan berhasil dibuat.' });
  } catch (error) {
    console.error('Withdrawal request error:', error);
    res.status(400).json({ error: error.message });
  }
});

app.patch('/api/admin/users/:userId', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const allowedUpdates = {};

    if (typeof req.body?.subscription_tier === 'string') {
      if (!['free', 'inactive', 'pro'].includes(req.body.subscription_tier)) {
        return res.status(400).json({ error: 'subscription_tier tidak valid.' });
      }
      allowedUpdates.subscription_tier = req.body.subscription_tier;
      allowedUpdates.split_percentage = req.body.subscription_tier === 'pro' ? 100 : 80;
    }

    if (typeof req.body?.quota === 'number') {
      allowedUpdates.quota = Math.max(0, Math.floor(req.body.quota));
    }

    if (Object.keys(allowedUpdates).length === 0) {
      return res.status(400).json({ error: 'Tidak ada perubahan yang diizinkan.' });
    }

    const { error } = await supabase
      .from('profiles')
      .update(allowedUpdates)
      .eq('id', userId);

    if (error) {
      throw new Error(error.message);
    }

    res.json({ message: 'User berhasil diperbarui.' });
  } catch (error) {
    console.error('Admin update user error:', error);
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/admin/platform-withdrawal', requireAuth, requireAdmin, async (req, res) => {
  try {
    const currentBalance = Number(req.profile.wallet_balance || 0);
    if (currentBalance < minimumWithdrawalAmount) {
      return res.status(400).json({ error: 'Saldo admin terlalu kecil untuk ditarik.' });
    }

    const { error: insertError } = await supabase.from('transactions').insert([{
      user_id: req.user.id,
      type: 'admin_withdrawal',
      amount: currentBalance,
      status: 'success'
    }]);

    if (insertError) {
      throw new Error(insertError.message);
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ wallet_balance: 0 })
      .eq('id', req.user.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    res.json({ message: 'Penarikan admin berhasil diproses.' });
  } catch (error) {
    console.error('Admin platform withdrawal error:', error);
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/admin/withdrawals/:transactionId', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { transactionId } = req.params;
    const action = req.body?.action;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Action tidak valid.' });
    }

    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (transactionError || !transaction) {
      return res.status(404).json({ error: 'Transaksi tidak ditemukan.' });
    }

    if (transaction.type !== 'withdrawal' || transaction.status !== 'pending') {
      return res.status(400).json({ error: 'Transaksi ini tidak bisa diproses lagi.' });
    }

    if (action === 'approve') {
      const { error } = await supabase
        .from('transactions')
        .update({ status: 'success' })
        .eq('id', transactionId);

      if (error) {
        throw new Error(error.message);
      }

      return res.json({ message: 'Withdrawal disetujui.' });
    }

    const targetProfile = await getProfile(transaction.user_id);
    const restoredBalance = Number(targetProfile.wallet_balance || 0) + Number(transaction.amount || 0);

    const [{ error: refundError }, { error: statusError }] = await Promise.all([
      supabase
        .from('profiles')
        .update({ wallet_balance: restoredBalance })
        .eq('id', transaction.user_id),
      supabase
        .from('transactions')
        .update({ status: 'failed' })
        .eq('id', transactionId)
    ]);

    if (refundError || statusError) {
      throw new Error(refundError?.message || statusError?.message || 'Refund gagal diproses.');
    }

    res.json({ message: 'Withdrawal ditolak dan saldo dikembalikan.' });
  } catch (error) {
    console.error('Admin withdrawal action error:', error);
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/admin/releases/:releaseId/action', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { releaseId } = req.params;
    const action = req.body?.action;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Action tidak valid.' });
    }

    const nextStatus = action === 'approve' ? 'released' : 'rejected';
    const { error } = await supabase
      .from('releases')
      .update({ status: nextStatus })
      .eq('id', releaseId);

    if (error) {
      throw new Error(error.message);
    }

    res.json({ message: action === 'approve' ? 'Track berhasil disetujui.' : 'Track berhasil ditolak.' });
  } catch (error) {
    console.error('Admin release action error:', error);
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/admin/releases/:releaseId/royalties/mock', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { releaseId } = req.params;
    const totalFromSpotify = Number(req.body?.total_amount || 100000);

    const { data: track, error: trackError } = await supabase
      .from('releases')
      .select('*')
      .eq('id', releaseId)
      .single();

    if (trackError || !track) {
      return res.status(404).json({ error: 'Release tidak ditemukan.' });
    }

    const splitPct = Number(track.split_percentage || 80);
    const shareableAmount = totalFromSpotify * (splitPct / 100);

    const { data: splits, error: splitsError } = await supabase
      .from('release_splits')
      .select('*')
      .eq('release_id', releaseId);

    if (splitsError) {
      throw new Error(splitsError.message);
    }

    if (!splits || splits.length === 0) {
      const targetProfile = await getProfile(track.user_id);
      const newBalance = Number(targetProfile.wallet_balance || 0) + shareableAmount;

      const [{ error: walletError }, { error: transactionError }, { error: royaltyError }] = await Promise.all([
        supabase.from('profiles').update({ wallet_balance: newBalance }).eq('id', track.user_id),
        supabase.from('transactions').insert([{ user_id: track.user_id, type: 'royalty_dist', amount: shareableAmount, status: 'success' }]),
        supabase.from('royalties_ledger').insert([{ user_id: track.user_id, release_id: track.id, amount_earned: shareableAmount, report_month: new Date().toISOString() }])
      ]);

      if (walletError || transactionError || royaltyError) {
        throw new Error(walletError?.message || transactionError?.message || royaltyError?.message || 'Distribusi royalti gagal.');
      }

      return res.json({ message: `Royalti Rp${shareableAmount.toLocaleString('id-ID')} dibayarkan ke pemilik utama.` });
    }

    let paidCount = 0;
    const missedEmails = [];

    for (const split of splits) {
      const collaboratorAmount = shareableAmount * (Number(split.percentage || 0) / 100);
      const { data: targetUser, error: userError } = await supabase
        .from('profiles')
        .select('id, wallet_balance')
        .eq('email', split.email)
        .single();

      if (userError || !targetUser) {
        missedEmails.push(split.email);
        continue;
      }

      const newBalance = Number(targetUser.wallet_balance || 0) + collaboratorAmount;
      const [{ error: walletError }, { error: transactionError }, { error: royaltyError }] = await Promise.all([
        supabase.from('profiles').update({ wallet_balance: newBalance }).eq('id', targetUser.id),
        supabase.from('transactions').insert([{ user_id: targetUser.id, type: 'royalty_dist', amount: collaboratorAmount, status: 'success' }]),
        supabase.from('royalties_ledger').insert([{ user_id: targetUser.id, release_id: track.id, amount_earned: collaboratorAmount, report_month: new Date().toISOString() }])
      ]);

      if (walletError || transactionError || royaltyError) {
        throw new Error(walletError?.message || transactionError?.message || royaltyError?.message || 'Distribusi royalti kolaborator gagal.');
      }

      paidCount += 1;
    }

    let message = `Royalti berhasil dibagikan ke ${paidCount} kolaborator.`;
    if (missedEmails.length > 0) {
      message += ` Belum terdaftar: ${missedEmails.join(', ')}.`;
    }

    res.json({ message });
  } catch (error) {
    console.error('Mock royalty distribution error:', error);
    res.status(400).json({ error: error.message });
  }
});




// ========== SPOTIFY INTEGRATION ENDPOINTS ==========

/**
 * POST /api/spotify/distribute
 * Distribute a track to Spotify
 * Body: { releaseId, artistName?, albumName? }
 */
app.post('/api/spotify/distribute', requireAuth, async (req, res) => {
  try {
    const { releaseId } = req.body;
    if (!releaseId) {
      return res.status(400).json({ error: 'Release ID diperlukan.' });
    }

    // Get release data
    const { data: release, error: releaseError } = await supabase
      .from('releases')
      .select('*')
      .eq('id', releaseId)
      .eq('user_id', req.user.id)
      .single();

    if (releaseError || !release) {
      return res.status(404).json({ error: 'Release tidak ditemukan.' });
    }

    if (release.status !== 'released' && release.status !== 'pending') {
      return res.status(400).json({ error: 'Release harus sudah approved untuk didistribusikan.' });
    }

    // Check if already distributed
    const { data: existing } = await supabase
      .from('spotify_distributions')
      .select('id')
      .eq('release_id', releaseId)
      .eq('status', 'distributed')
      .single();

    if (existing) {
      return res.status(400).json({ error: 'Track sudah didistribusikan ke Spotify.' });
    }

    // Get artist profile name
    const profile = await getProfile(req.user.id);

    // Call Spotify service to distribute
    const distributionResult = await spotifyService.distributeTrack({
      title: release.title,
      artist_name: profile.full_name || 'Unknown Artist',
      album_name: req.body.albumName || release.title,
      audio_url: release.audio_url,
      cover_url: release.cover_url,
      isrc: release.isrc,
      upc: release.upc,
      explicit_lyrics: release.explicit_lyrics
    });

    // Save distribution record
    const { data: distribution, error: distError } = await supabase
      .from('spotify_distributions')
      .insert([{
        release_id: releaseId,
        user_id: req.user.id,
        spotify_track_id: distributionResult.spotify_track_id,
        spotify_uri: distributionResult.spotify_uri,
        status: 'distributed',
        distribution_date: distributionResult.distribution_date
      }])
      .select()
      .single();

    if (distError) {
      throw new Error(distError.message);
    }

    // Update release with Spotify info
    await supabase
      .from('releases')
      .update({
        spotify_track_id: distributionResult.spotify_track_id,
        spotify_status: 'distributed'
      })
      .eq('id', releaseId);

    res.status(201).json({
      message: 'Track berhasil didistribusikan ke Spotify!',
      distribution: distribution,
      spotify_uri: distributionResult.spotify_uri,
      estimated_live_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 jam
    });
  } catch (error) {
    console.error('Spotify distribution error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/spotify/status/:releaseId
 * Get distribution status of a track
 */
app.get('/api/spotify/status/:releaseId', requireAuth, async (req, res) => {
  try {
    const { releaseId } = req.params;

    const { data: distribution, error } = await supabase
      .from('spotify_distributions')
      .select('*')
      .eq('release_id', releaseId)
      .eq('user_id', req.user.id)
      .single();

    if (error || !distribution) {
      return res.status(404).json({ error: 'Distribusi tidak ditemukan.' });
    }

    // Get analytics if distributed
    let analytics = null;
    if (distribution.status === 'distributed') {
      const { data: analyticsData } = await supabase
        .from('spotify_analytics')
        .select('*')
        .eq('spotify_distribution_id', distribution.id)
        .order('report_date', { ascending: false })
        .limit(1)
        .single();

      analytics = analyticsData;
    }

    res.json({
      distribution,
      analytics,
      streams: analytics?.streams || 0,
      revenue: analytics?.total_revenue || 0
    });
  } catch (error) {
    console.error('Get status error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/spotify/analytics/:releaseId
 * Get detailed analytics for a track
 */
app.get('/api/spotify/analytics/:releaseId', requireAuth, async (req, res) => {
  try {
    const { releaseId } = req.params;

    // Get all analytics for this release
    const { data: analytics, error } = await supabase
      .from('spotify_analytics')
      .select('*')
      .eq('release_id', releaseId)
      .order('report_date', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    if (!analytics || analytics.length === 0) {
      return res.status(404).json({ error: 'Belum ada data analitik.' });
    }

    // Calculate totals
    const totalStreams = analytics.reduce((sum, a) => sum + (a.streams || 0), 0);
    const totalRevenue = analytics.reduce((sum, a) => sum + (a.total_revenue || 0), 0);
    const totalDisbaCommission = analytics.reduce((sum, a) => sum + (a.disba_commission || 0), 0);
    const totalArtistPayout = analytics.reduce((sum, a) => sum + (a.artist_payout || 0), 0);

    res.json({
      analytics,
      summary: {
        totalStreams,
        totalRevenue,
        totalDisbaCommission,
        totalArtistPayout,
        commissionPercentage: 15,
        last_update: analytics[0]?.report_date
      }
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/spotify/webhook
 * Receive royalty updates from Spotify (simulated)
 */
app.post('/api/spotify/webhook', async (req, res) => {
  try {
    const { release_id, artist_id, streams, revenue, report_date } = req.body;

    if (!release_id || !revenue) {
      return res.status(400).json({ error: 'Missing required webhook data.' });
    }

    // Get distribution record
    const { data: distribution, error: distError } = await supabase
      .from('spotify_distributions')
      .select('*')
      .eq('release_id', release_id)
      .single();

    if (distError || !distribution) {
      return res.status(404).json({ error: 'Distribution not found.' });
    }

    // Calculate commission
    const commissionPct = Number(process.env.SPOTIFY_COMMISSION_PERCENTAGE || 15);
    const disbaCommission = revenue * (commissionPct / 100);
    const artistPayout = revenue - disbaCommission;

    // Check if this report already exists
    const { data: existing } = await supabase
      .from('spotify_analytics')
      .select('id')
      .eq('spotify_distribution_id', distribution.id)
      .eq('report_date', report_date)
      .single();

    if (!existing) {
      // Insert analytics record
      const { error: analyticsError } = await supabase
        .from('spotify_analytics')
        .insert([{
          spotify_distribution_id: distribution.id,
          release_id: release_id,
          user_id: distribution.user_id,
          report_date: report_date,
          streams: streams || 0,
          total_revenue: revenue,
          disba_commission: disbaCommission,
          artist_payout: artistPayout
        }]);

      if (analyticsError) {
        throw new Error(analyticsError.message);
      }

      // Update artist wallet ONLY (for commission distribution later)
      // Don't add to wallet yet - commission is calculated monthly
    }

    res.json({ message: 'Webhook processed successfully.' });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/spotify/calculate-commissions
 * Calculate monthly commissions (admin only)
 * Run this at end of each month
 */
app.post('/api/spotify/calculate-commissions', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { month } = req.body; // Format: YYYY-MM
    if (!month) {
      return res.status(400).json({ error: 'Month parameter required (YYYY-MM format).' });
    }

    const monthDate = new Date(`${month}-01`);

    // Check if already calculated for this month
    const { data: existing } = await supabase
      .from('admin_commissions')
      .select('id')
      .eq('month', month)
      .single();

    if (existing) {
      return res.status(400).json({ error: 'Commissions already calculated for this month.' });
    }

    // Get all analytics for this month
    const { data: monthlyAnalytics, error: analyticsError } = await supabase
      .from('spotify_analytics')
      .select('*')
      .gte('report_date', `${month}-01`)
      .lt('report_date', `${month}-32`);

    if (analyticsError) {
      throw new Error(analyticsError.message);
    }

    // Calculate totals
    const totalArtistEarnings = monthlyAnalytics.reduce((sum, a) => sum + (a.artist_payout || 0), 0);
    const totalDisbaCommission = monthlyAnalytics.reduce((sum, a) => sum + (a.disba_commission || 0), 0);

    // Create admin commission record
    const { data: adminCommission, error: commError } = await supabase
      .from('admin_commissions')
      .insert([{
        month: monthDate.toISOString().split('T')[0],
        total_artist_earnings: totalArtistEarnings,
        total_commission: totalDisbaCommission,
        commission_percentage: 15,
        status: 'calculated'
      }])
      .select()
      .single();

    if (commError) {
      throw new Error(commError.message);
    }

    // Create artist commission records for each user
    const userCommissions = {};
    monthlyAnalytics.forEach(analytic => {
      if (!userCommissions[analytic.user_id]) {
        userCommissions[analytic.user_id] = 0;
      }
      userCommissions[analytic.user_id] += analytic.artist_payout;
    });

    const artistCommissionRecords = Object.entries(userCommissions).map(([userId, earnings]) => ({
      user_id: userId,
      admin_commission_id: adminCommission.id,
      artist_earnings: earnings,
      commission_owed: earnings * 0.15,
      status: 'pending'
    }));

    if (artistCommissionRecords.length > 0) {
      const { error: insertError } = await supabase
        .from('artist_commissions')
        .insert(artistCommissionRecords);

      if (insertError) {
        throw new Error(insertError.message);
      }
    }

    res.json({
      message: 'Commission calculation complete.',
      admin_commission: adminCommission,
      summary: {
        month,
        totalArtistEarnings,
        totalDisbaCommission,
        artistsAffected: Object.keys(userCommissions).length
      }
    });
  } catch (error) {
    console.error('Commission calculation error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/spotify/payout-commissions
 * Transfer commissions to DISBA admin wallet (admin only)
 */
app.post('/api/spotify/payout-commissions', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { month } = req.body; // Format: YYYY-MM
    if (!month) {
      return res.status(400).json({ error: 'Month parameter required.' });
    }

    // Get admin commission record
    const { data: adminCommission, error: commError } = await supabase
      .from('admin_commissions')
      .select('*')
      .eq('month', month)
      .eq('status', 'calculated')
      .single();

    if (commError || !adminCommission) {
      return res.status(404).json({ error: 'Commission record not found or already paid.' });
    }

    // Get admin profile
    const adminProfile = await getProfile(req.user.id);

    // Add commission to admin wallet
    const newAdminBalance = Number(adminProfile.wallet_balance || 0) + Number(adminCommission.total_commission);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ wallet_balance: newAdminBalance })
      .eq('id', req.user.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    // Record transaction
    const { error: transError } = await supabase
      .from('transactions')
      .insert([{
        user_id: req.user.id,
        type: 'spotify_commission',
        amount: adminCommission.total_commission,
        status: 'success',
        payment_method: 'internal_transfer'
      }]);

    if (transError) {
      throw new Error(transError.message);
    }

    // Update commission status
    await supabase
      .from('admin_commissions')
      .update({ status: 'paid' })
      .eq('id', adminCommission.id);

    res.json({
      message: 'Commission payout successful!',
      amount: adminCommission.total_commission,
      new_balance: newAdminBalance,
      month
    });
  } catch (error) {
    console.error('Payout error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/spotify/commissions
 * Get commission history (admin only)
 */
app.get('/api/spotify/commissions', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { data: commissions, error } = await supabase
      .from('admin_commissions')
      .select('*')
      .order('month', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    res.json({
      commissions,
      summary: {
        total_commissions: commissions.reduce((sum, c) => sum + (c.total_commission || 0), 0),
        total_paid: commissions.filter(c => c.status === 'paid').reduce((sum, c) => sum + (c.total_commission || 0), 0),
        pending_amount: commissions.filter(c => c.status === 'pending' || c.status === 'calculated').reduce((sum, c) => sum + (c.total_commission || 0), 0)
      }
    });
  } catch (error) {
    console.error('Get commissions error:', error);
    res.status(400).json({ error: error.message });
  }
});

// ========== END SPOTIFY ENDPOINTS ==========


app.listen(PORT || 3001, () => {
  console.log(`Secure backend server running on port ${PORT || 3001}`);
});
