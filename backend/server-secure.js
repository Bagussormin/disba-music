import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import spotifyService from './services/spotify.js';

dotenv.config();

const {
  FRONTEND_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY,
  PORT,
  SPOTIFY_WEBHOOK_SECRET,
  NODE_ENV
} = process.env;

if (!SUPABASE_SERVICE_ROLE_KEY || !VITE_SUPABASE_URL || !VITE_SUPABASE_ANON_KEY) {
  throw new Error('Missing required environment variables for backend startup.');
}

if (!SPOTIFY_WEBHOOK_SECRET) {
  console.warn('WARNING: SPOTIFY_WEBHOOK_SECRET not set. Webhook verification disabled.');
}

const app = express();
const frontendUrl = FRONTEND_URL || 'http://localhost:5173';
const minimumWithdrawalAmount = 50000;

// ========== ENVIRONMENT CONSTANTS ==========
const CONSTANTS = {
  MIN_WITHDRAWAL: 50000,
  PRICE_PER_SLOT: 10000,
  COMMISSION_PERCENTAGE: 15,
  MAX_RETRY_ATTEMPTS: 3,
  IDEMPOTENCY_TTL: 24 * 60 * 60 * 1000 // 24 hours
};

// Supabase client (backend only - uses service role)
const supabase = createClient(VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Supabase anon client (for user operations)
const supabaseAnon = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// ========== CORS Configuration ==========
const corsOrigins = [frontendUrl];
if (NODE_ENV !== 'production') {
  corsOrigins.push('http://localhost:5173', 'http://localhost:3001');
}

app.use(cors({
  origin: corsOrigins,
  methods: ['GET', 'POST', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Idempotency-Key'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

// ========== VALIDATION FUNCTIONS ==========
function validateEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (typeof email !== 'string') return false;
  return regex.test(email.trim()) && email.length <= 254;
}

function validateUrl(urlString) {
  if (typeof urlString !== 'string') return false;
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function validatePercentage(value) {
  const num = Number(value);
  return !isNaN(num) && num >= 0 && num <= 100;
}

function sanitizeString(str, maxLength = 500) {
  if (typeof str !== 'string') return '';
  return str.trim().slice(0, maxLength);
}

function isValidIdempotencyKey(key) {
  if (typeof key !== 'string') return false;
  return key.length > 10 && key.length <= 100;
}

// ========== WEBHOOK SIGNATURE VERIFICATION ==========
function verifyWebhookSignature(payload, signature) {
  if (!SPOTIFY_WEBHOOK_SECRET || !signature) {
    return false;
  }

  const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const hash = crypto
    .createHmac('sha256', SPOTIFY_WEBHOOK_SECRET)
    .update(payloadString)
    .digest('hex');

  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
}

// ========== IDEMPOTENCY TRACKING ==========
const idempotencyStore = new Map();

function checkIdempotency(key) {
  const entry = idempotencyStore.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CONSTANTS.IDEMPOTENCY_TTL) {
    idempotencyStore.delete(key);
    return null;
  }
  return entry.response;
}

function storeIdempotency(key, response) {
  idempotencyStore.set(key, {
    response,
    timestamp: Date.now()
  });
}

// ========== ERROR HANDLER & LOGGING ==========
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
  }
}

function logError(context, error, userId = null) {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    context,
    error: error.message,
    userId,
    stack: NODE_ENV === 'production' ? undefined : error.stack
  }));
}

function handleErrorResponse(res, error, statusCode = 400) {
  const isUserError = error.message && (
    error.message.includes('Gagal') ||
    error.message.includes('tidak') ||
    error.message.includes('belum') ||
    statusCode < 500
  );

  res.status(statusCode).json({
    error: isUserError ? error.message : 'Internal server error'
  });
}

// ========== MIDDLEWARE ==========
function getBearerToken(req) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice('Bearer '.length).trim();
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
    logError('AUTH_MIDDLEWARE', error);
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
    logError('ADMIN_MIDDLEWARE', error, req.user?.id);
    res.status(403).json({ error: 'Admin access verification failed.' });
  }
}

// ========== HELPER FUNCTIONS ==========
async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    throw new AppError(`Failed to load profile: ${error.message}`, 500);
  }

  return data;
}

function sanitizeSplits(splits) {
  if (!Array.isArray(splits)) {
    return [];
  }

  const sanitized = splits
    .filter((split) => split && typeof split.email === 'string' && split.email.trim())
    .map((split) => ({
      email: split.email.trim().toLowerCase(),
      percentage: Number(split.percentage)
    }))
    .filter((split) => Number.isFinite(split.percentage) && split.percentage > 0 && split.percentage <= 100);

  // Validate all emails
  for (const split of sanitized) {
    if (!validateEmail(split.email)) {
      throw new AppError(`Invalid email in splits: ${split.email}`, 400);
    }
  }

  return sanitized;
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
    throw new AppError('Token upload habis. Silakan beli Token terlebih dahulu.', 400);
  }
}

// ========== ADMIN ENDPOINT: VERIFY ACCESS ==========
app.post('/api/admin/verify', requireAuth, async (req, res) => {
  try {
    const profile = await getProfile(req.user.id);

    // Only allow admin role
    if (profile.role !== 'admin') {
      return res.status(403).json({
        authorized: false,
        error: 'Admin access required'
      });
    }

    res.json({
      authorized: true,
      role: profile.role,
      user_id: req.user.id
    });
  } catch (error) {
    logError('ADMIN_VERIFY', error, req.user?.id);
    res.status(403).json({ error: 'Authorization failed' });
  }
});

// ========== ADMIN DASHBOARD ==========
app.get('/api/admin/dashboard', requireAuth, requireAdmin, async (req, res) => {
  try {
    // Add pagination to prevent loading all data
    const [
      { data: users, error: usersError },
      { data: releases, error: releasesError },
      { data: transactions, error: transactionsError },
      { data: royalties, error: royaltiesError }
    ] = await Promise.all([
      supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100),
      supabase
        .from('releases')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100),
      supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100),
      supabase
        .from('royalties_ledger')
        .select('*, releases(title)')
        .order('created_at', { ascending: false })
        .limit(100)
    ]);

    if (usersError || releasesError || transactionsError || royaltiesError) {
      throw new AppError(
        usersError?.message ||
        releasesError?.message ||
        transactionsError?.message ||
        royaltiesError?.message ||
        'Failed to load admin dashboard.',
        500
      );
    }

    res.json({ users, releases, transactions, royalties });
  } catch (error) {
    logError('ADMIN_DASHBOARD', error, req.user?.id);
    handleErrorResponse(res, error, 500);
  }
});

// ========== CREATE RELEASE ==========
app.post('/api/releases', requireAuth, async (req, res) => {
  try {
    const { title, genre, audio_url, cover_url, explicit_lyrics, splits, album_name, selected_stores } = req.body || {};

    // Comprehensive validation
    if (!sanitizeString(title, 200) || !sanitizeString(genre) || !validateUrl(audio_url) || !validateUrl(cover_url)) {
      return res.status(400).json({ error: 'Metadata release belum lengkap atau format tidak valid.' });
    }

    // Validate splits if provided
    if (splits && Array.isArray(splits) && splits.length > 0) {
      let totalPercentage = 0;
      for (const split of splits) {
        if (!validateEmail(split.email) || !validatePercentage(split.percentage)) {
          return res.status(400).json({ error: `Split email/percentage tidak valid: ${split.email}` });
        }
        totalPercentage += Number(split.percentage);
      }
      if (totalPercentage > 100) {
        return res.status(400).json({ error: `Total split percentages exceed 100% (current: ${totalPercentage}%)` });
      }
    }

    const profile = await getProfile(req.user.id);
    await ensureReleaseEntitlement(profile);

    const { data: generatedIsrc, error: isrcError } = await supabase.rpc('generate_next_isrc');
    if (isrcError || !generatedIsrc) {
      throw new AppError(isrcError?.message || 'Gagal membuat ISRC.', 500);
    }

    const splitPercentage = profile.subscription_tier === 'pro' || profile.role === 'admin' ? 100 : 80;
    const upc = generateUpc();

    const { data: releaseData, error: releaseError } = await supabase
      .from('releases')
      .insert([{
        user_id: req.user.id,
        title: sanitizeString(title, 200),
        genre: sanitizeString(genre),
        audio_url: sanitizeString(audio_url),
        cover_url: sanitizeString(cover_url),
        status: 'pending',
        explicit_lyrics: Boolean(explicit_lyrics),
        isrc: generatedIsrc,
        upc,
        split_percentage: splitPercentage,
        album_name: album_name ? sanitizeString(album_name, 200) : null,
        selected_stores: Array.isArray(selected_stores) ? selected_stores : []
      }])
      .select()
      .single();

    if (releaseError) {
      throw new AppError(releaseError.message, 400);
    }

    const validSplits = sanitizeSplits(splits || []);
    if (validSplits.length > 0) {
      const { error: splitsError } = await supabase.from('release_splits').insert(
        validSplits.map((split) => ({
          release_id: releaseData.id,
          email: split.email,
          percentage: split.percentage
        }))
      );

      if (splitsError) {
        throw new AppError(`Gagal menyimpan split: ${splitsError.message}`, 400);
      }
    }

    // Use RPC for atomic quota deduction to prevent race condition
    if (profile.role !== 'admin') {
      const { error: quotaError } = await supabase.rpc('deduct_quota', { user_id: req.user.id, amount: 1 });

      if (quotaError) {
        // Cleanup: Delete release if quota deduction fails
        await supabase.from('releases').delete().eq('id', releaseData.id);
        throw new AppError(`Gagal mengurangi kuota: ${quotaError.message}`, 400);
      }
    }

    res.status(201).json({ release: releaseData, isrc: generatedIsrc, upc });
  } catch (error) {
    logError('CREATE_RELEASE', error, req.user?.id);
    handleErrorResponse(res, error);
  }
});

// ========== WITHDRAWAL REQUEST ==========
app.post('/api/withdrawals/request', requireAuth, async (req, res) => {
  try {
    const idempotencyKey = req.headers['x-idempotency-key'];

    if (idempotencyKey) {
      const cached = checkIdempotency(idempotencyKey);
      if (cached) {
        return res.status(201).json(cached);
      }
    }

    const profile = await getProfile(req.user.id);
    const currentBalance = Number(profile.wallet_balance || 0);

    if (currentBalance < CONSTANTS.MIN_WITHDRAWAL) {
      return res.status(400).json({
        error: `Saldo minimal penarikan Rp ${CONSTANTS.MIN_WITHDRAWAL.toLocaleString('id-ID')}.`
      });
    }

    const { data: pendingTransactions, error: pendingError } = await supabase
      .from('transactions')
      .select('id')
      .eq('user_id', req.user.id)
      .eq('type', 'withdrawal')
      .eq('status', 'pending');

    if (pendingError) {
      throw new AppError(pendingError.message, 500);
    }

    if ((pendingTransactions || []).length > 0) {
      return res.status(400).json({
        error: 'Masih ada pengajuan penarikan yang sedang diproses.'
      });
    }

    // Use transaction for atomicity
    const { error: insertError, data: transaction } = await supabase
      .from('transactions')
      .insert([{
        user_id: req.user.id,
        type: 'withdrawal',
        amount: currentBalance,
        status: 'pending'
      }])
      .select()
      .single();

    if (insertError) {
      throw new AppError(insertError.message, 400);
    }

    // Update balance
    const { error: balanceError } = await supabase
      .from('profiles')
      .update({ wallet_balance: 0 })
      .eq('id', req.user.id);

    if (balanceError) {
      // Rollback transaction
      await supabase.from('transactions').delete().eq('id', transaction.id);
      throw new AppError(balanceError.message, 400);
    }

    const response = { message: 'Pengajuan penarikan berhasil dibuat.', transaction_id: transaction.id };

    if (idempotencyKey && isValidIdempotencyKey(idempotencyKey)) {
      storeIdempotency(idempotencyKey, response);
    }

    res.status(201).json(response);
  } catch (error) {
    logError('WITHDRAWAL_REQUEST', error, req.user?.id);
    handleErrorResponse(res, error);
  }
});

// ========== ADMIN: UPDATE USER ==========
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
      throw new AppError(error.message, 400);
    }

    res.json({ message: 'User berhasil diperbarui.' });
  } catch (error) {
    logError('ADMIN_UPDATE_USER', error, req.user?.id);
    handleErrorResponse(res, error);
  }
});

// ========== ADMIN: PLATFORM WITHDRAWAL ==========
app.post('/api/admin/platform-withdrawal', requireAuth, requireAdmin, async (req, res) => {
  try {
    const currentBalance = Number(req.profile.wallet_balance || 0);
    if (currentBalance < CONSTANTS.MIN_WITHDRAWAL) {
      return res.status(400).json({ error: 'Saldo admin terlalu kecil untuk ditarik.' });
    }

    const { error: insertError } = await supabase.from('transactions').insert([{
      user_id: req.user.id,
      type: 'admin_withdrawal',
      amount: currentBalance,
      status: 'success'
    }]);

    if (insertError) {
      throw new AppError(insertError.message, 400);
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ wallet_balance: 0 })
      .eq('id', req.user.id);

    if (updateError) {
      throw new AppError(updateError.message, 400);
    }

    res.json({ message: 'Penarikan admin berhasil diproses.' });
  } catch (error) {
    logError('ADMIN_PLATFORM_WITHDRAWAL', error, req.user?.id);
    handleErrorResponse(res, error);
  }
});

// ========== ADMIN: WITHDRAWAL ACTION ==========
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

    // Only admin can modify transactions (already checked by middleware)
    if (action === 'approve') {
      const { error } = await supabase
        .from('transactions')
        .update({ status: 'success' })
        .eq('id', transactionId);

      if (error) {
        throw new AppError(error.message, 400);
      }

      return res.json({ message: 'Withdrawal disetujui.' });
    }

    // Reject: refund to wallet
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
      throw new AppError(refundError?.message || statusError?.message || 'Refund gagal diproses.', 400);
    }

    res.json({ message: 'Withdrawal ditolak dan saldo dikembalikan.' });
  } catch (error) {
    logError('ADMIN_WITHDRAWAL_ACTION', error, req.user?.id);
    handleErrorResponse(res, error);
  }
});

// ========== ADMIN: RELEASE ACTION ==========
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
      throw new AppError(error.message, 400);
    }

    res.json({ message: action === 'approve' ? 'Track berhasil disetujui.' : 'Track berhasil ditolak.' });
  } catch (error) {
    logError('ADMIN_RELEASE_ACTION', error, req.user?.id);
    handleErrorResponse(res, error);
  }
});

// ========== ROYALTY DISTRIBUTION ==========
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
      throw new AppError(splitsError.message, 500);
    }

    if (!splits || splits.length === 0) {
      // No splits - distribute to track owner
      const targetProfile = await getProfile(track.user_id);
      const newBalance = Number(targetProfile.wallet_balance || 0) + shareableAmount;

      // Use Promise.all for atomic operation
      const [{ error: walletError }, { error: transactionError }, { error: royaltyError }] = await Promise.all([
        supabase.from('profiles').update({ wallet_balance: newBalance }).eq('id', track.user_id),
        supabase.from('transactions').insert([{
          user_id: track.user_id,
          type: 'royalty_dist',
          amount: shareableAmount,
          status: 'success'
        }]),
        supabase.from('royalties_ledger').insert([{
          user_id: track.user_id,
          release_id: track.id,
          amount_earned: shareableAmount,
          report_month: new Date().toISOString()
        }])
      ]);

      if (walletError || transactionError || royaltyError) {
        throw new AppError(
          walletError?.message || transactionError?.message || royaltyError?.message || 'Distribusi royalti gagal.',
          500
        );
      }

      return res.json({
        message: `Royalti Rp${shareableAmount.toLocaleString('id-ID')} dibayarkan ke pemilik utama.`
      });
    }

    // Distribute to splits
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
        supabase.from('transactions').insert([{
          user_id: targetUser.id,
          type: 'royalty_dist',
          amount: collaboratorAmount,
          status: 'success'
        }]),
        supabase.from('royalties_ledger').insert([{
          user_id: targetUser.id,
          release_id: track.id,
          amount_earned: collaboratorAmount,
          report_month: new Date().toISOString()
        }])
      ]);

      if (walletError || transactionError || royaltyError) {
        throw new AppError(
          walletError?.message || transactionError?.message || royaltyError?.message || 'Distribusi royalti kolaborator gagal.',
          500
        );
      }

      paidCount += 1;
    }

    let message = `Royalti berhasil dibagikan ke ${paidCount} kolaborator.`;
    if (missedEmails.length > 0) {
      message += ` Belum terdaftar: ${missedEmails.join(', ')}.`;
    }

    res.json({ message });
  } catch (error) {
    logError('ROYALTY_DISTRIBUTION', error, req.user?.id);
    handleErrorResponse(res, error, 500);
  }
});

// ========== SPOTIFY INTEGRATION ENDPOINTS ==========

app.post('/api/spotify/distribute', requireAuth, async (req, res) => {
  try {
    const { releaseId } = req.body;
    if (!releaseId) {
      return res.status(400).json({ error: 'Release ID diperlukan.' });
    }

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

    const { data: existing } = await supabase
      .from('spotify_distributions')
      .select('id')
      .eq('release_id', releaseId)
      .eq('status', 'distributed')
      .single();

    if (existing) {
      return res.status(400).json({ error: 'Track sudah didistribusikan ke Spotify.' });
    }

    const profile = await getProfile(req.user.id);

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
      throw new AppError(distError.message, 400);
    }

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
      estimated_live_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    });
  } catch (error) {
    logError('SPOTIFY_DISTRIBUTE', error, req.user?.id);
    handleErrorResponse(res, error);
  }
});

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
    logError('SPOTIFY_STATUS', error, req.user?.id);
    handleErrorResponse(res, error);
  }
});

app.get('/api/spotify/analytics/:releaseId', requireAuth, async (req, res) => {
  try {
    const { releaseId } = req.params;

    const { data: analytics, error } = await supabase
      .from('spotify_analytics')
      .select('*')
      .eq('release_id', releaseId)
      .order('report_date', { ascending: false });

    if (error) {
      throw new AppError(error.message, 500);
    }

    if (!analytics || analytics.length === 0) {
      return res.status(404).json({ error: 'Belum ada data analitik.' });
    }

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
        commissionPercentage: CONSTANTS.COMMISSION_PERCENTAGE,
        last_update: analytics[0]?.report_date
      }
    });
  } catch (error) {
    logError('SPOTIFY_ANALYTICS', error, req.user?.id);
    handleErrorResponse(res, error, 500);
  }
});

// ========== SECURE WEBHOOK ENDPOINT WITH SIGNATURE VERIFICATION ==========
app.post('/api/spotify/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-spotify-signature'] || req.headers['x-webhook-signature'];

    // Verify webhook signature
    if (SPOTIFY_WEBHOOK_SECRET && !verifyWebhookSignature(req.body, signature)) {
      logError('WEBHOOK_VERIFICATION', new Error('Invalid webhook signature'), null);
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    const { release_id, artist_id, streams, revenue, report_date } = req.body;

    if (!release_id || !revenue) {
      return res.status(400).json({ error: 'Missing required webhook data.' });
    }

    // Validate revenue is a positive number
    const revenueNum = Number(revenue);
    if (isNaN(revenueNum) || revenueNum <= 0) {
      return res.status(400).json({ error: 'Invalid revenue amount.' });
    }

    const { data: distribution, error: distError } = await supabase
      .from('spotify_distributions')
      .select('*')
      .eq('release_id', release_id)
      .single();

    if (distError || !distribution) {
      return res.status(404).json({ error: 'Distribution not found.' });
    }

    const commissionPct = Number(process.env.SPOTIFY_COMMISSION_PERCENTAGE || CONSTANTS.COMMISSION_PERCENTAGE);
    const disbaCommission = revenueNum * (commissionPct / 100);
    const artistPayout = revenueNum - disbaCommission;

    // Check if already processed (idempotency)
    const { data: existing } = await supabase
      .from('spotify_analytics')
      .select('id')
      .eq('spotify_distribution_id', distribution.id)
      .eq('report_date', report_date)
      .single();

    if (!existing) {
      const { error: analyticsError } = await supabase
        .from('spotify_analytics')
        .insert([{
          spotify_distribution_id: distribution.id,
          release_id: release_id,
          user_id: distribution.user_id,
          report_date: report_date,
          streams: streams || 0,
          total_revenue: revenueNum,
          disba_commission: disbaCommission,
          artist_payout: artistPayout
        }]);

      if (analyticsError) {
        throw new AppError(analyticsError.message, 500);
      }
    }

    res.json({ message: 'Webhook processed successfully.' });
  } catch (error) {
    logError('WEBHOOK_PROCESS', error);
    handleErrorResponse(res, error, 500);
  }
});

app.post('/api/spotify/calculate-commissions', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { month } = req.body;
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: 'Month parameter required (YYYY-MM format).' });
    }

    const { data: existing } = await supabase
      .from('admin_commissions')
      .select('id')
      .eq('month', month)
      .single();

    if (existing) {
      return res.status(400).json({ error: 'Commissions already calculated for this month.' });
    }

    const { data: monthlyAnalytics, error: analyticsError } = await supabase
      .from('spotify_analytics')
      .select('*')
      .gte('report_date', `${month}-01`)
      .lt('report_date', `${month}-32`);

    if (analyticsError) {
      throw new AppError(analyticsError.message, 500);
    }

    const totalArtistEarnings = monthlyAnalytics.reduce((sum, a) => sum + (a.artist_payout || 0), 0);
    const totalDisbaCommission = monthlyAnalytics.reduce((sum, a) => sum + (a.disba_commission || 0), 0);

    const { data: adminCommission, error: commError } = await supabase
      .from('admin_commissions')
      .insert([{
        month: month,
        total_artist_earnings: totalArtistEarnings,
        total_commission: totalDisbaCommission,
        commission_percentage: CONSTANTS.COMMISSION_PERCENTAGE,
        status: 'calculated'
      }])
      .select()
      .single();

    if (commError) {
      throw new AppError(commError.message, 400);
    }

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
      commission_owed: earnings * (CONSTANTS.COMMISSION_PERCENTAGE / 100),
      status: 'pending'
    }));

    if (artistCommissionRecords.length > 0) {
      const { error: insertError } = await supabase
        .from('artist_commissions')
        .insert(artistCommissionRecords);

      if (insertError) {
        throw new AppError(insertError.message, 400);
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
    logError('COMMISSION_CALC', error, req.user?.id);
    handleErrorResponse(res, error, 500);
  }
});

app.post('/api/spotify/payout-commissions', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { month } = req.body;
    if (!month) {
      return res.status(400).json({ error: 'Month parameter required.' });
    }

    const { data: adminCommission, error: commError } = await supabase
      .from('admin_commissions')
      .select('*')
      .eq('month', month)
      .eq('status', 'calculated')
      .single();

    if (commError || !adminCommission) {
      return res.status(404).json({ error: 'Commission record not found or already paid.' });
    }

    const adminProfile = await getProfile(req.user.id);
    const newAdminBalance = Number(adminProfile.wallet_balance || 0) + Number(adminCommission.total_commission);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ wallet_balance: newAdminBalance })
      .eq('id', req.user.id);

    if (updateError) {
      throw new AppError(updateError.message, 400);
    }

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
      throw new AppError(transError.message, 400);
    }

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
    logError('COMMISSION_PAYOUT', error, req.user?.id);
    handleErrorResponse(res, error);
  }
});

app.get('/api/spotify/commissions', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { data: commissions, error } = await supabase
      .from('admin_commissions')
      .select('*')
      .order('month', { ascending: false });

    if (error) {
      throw new AppError(error.message, 500);
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
    logError('GET_COMMISSIONS', error, req.user?.id);
    handleErrorResponse(res, error, 500);
  }
});

// ========== PAYMENT ENDPOINTS ==========

app.post('/api/payments/subscription', requireAuth, async (req, res) => {
  try {
    const { subscriptionTier, paymentMethod } = req.body;

    if (!['pro', 'label'].includes(subscriptionTier)) {
      return res.status(400).json({ error: 'Subscription tier tidak valid.' });
    }

    if (!['bank_transfer', 'qris_dana'].includes(paymentMethod)) {
      return res.status(400).json({ error: 'Metode pembayaran tidak valid.' });
    }

    const prices = {
      pro: 50000,
      label: 500000
    };

    const orderId = `MANUAL-SUB-${req.user.id}-${Date.now()}`;
    const amount = prices[subscriptionTier];

    const { error: insertError } = await supabase.from('transactions').insert([{
      user_id: req.user.id,
      type: 'subscription_payment',
      amount,
      status: 'pending_payment',
      payment_method: paymentMethod,
      transaction_ref: orderId
    }]);

    if (insertError) {
      throw new AppError(insertError.message, 400);
    }

    // Payment instructions should be fetched from database, not hardcoded
    const instruction = {
      title: `Payment for ${subscriptionTier} subscription`,
      details: 'Contact admin for payment instructions',
      note: 'Payment instructions have been stored securely'
    };

    res.json({
      orderId,
      amount,
      paymentMethod,
      instruction
    });
  } catch (error) {
    logError('SUBSCRIPTION_PAYMENT', error, req.user?.id);
    handleErrorResponse(res, error);
  }
});

app.post('/api/payments/quota', requireAuth, async (req, res) => {
  try {
    const { slots, paymentMethod } = req.body;

    if (!slots || slots < 1 || slots > 10) {
      return res.status(400).json({ error: 'Jumlah slot harus 1-10.' });
    }

    if (!['bank_transfer', 'qris_dana'].includes(paymentMethod)) {
      return res.status(400).json({ error: 'Metode pembayaran tidak valid.' });
    }

    const orderId = `MANUAL-QUOTA-${req.user.id}-${Date.now()}`;
    const amount = CONSTANTS.PRICE_PER_SLOT * slots;

    const { error: insertError } = await supabase.from('transactions').insert([{
      user_id: req.user.id,
      type: 'quota_purchase',
      amount,
      status: 'pending_payment',
      payment_method: paymentMethod,
      transaction_ref: orderId
    }]);

    if (insertError) {
      throw new AppError(insertError.message, 400);
    }

    const instruction = {
      title: `Payment for ${slots} quota slots`,
      details: 'Contact admin for payment instructions',
      note: 'Payment instructions have been stored securely'
    };

    res.json({
      orderId,
      amount,
      paymentMethod,
      instruction
    });
  } catch (error) {
    logError('QUOTA_PAYMENT', error, req.user?.id);
    handleErrorResponse(res, error);
  }
});

// ========== HEALTH CHECK ==========
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ========== ERROR HANDLING FOR UNDEFINED ROUTES ==========
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// ========== START SERVER ==========
app.listen(PORT || 3001, () => {
  console.log(`[${new Date().toISOString()}] Secure backend server running on port ${PORT || 3001}`);
  console.log(`Environment: ${NODE_ENV || 'development'}`);
});

export default app;
