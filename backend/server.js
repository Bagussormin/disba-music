import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import midtransClient from 'midtrans-client';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

dotenv.config();

const {
  FRONTEND_URL,
  MIDTRANS_SERVER_KEY,
  SUPABASE_SERVICE_ROLE_KEY,
  VITE_MIDTRANS_CLIENT_KEY,
  VITE_MIDTRANS_IS_PRODUCTION,
  VITE_SUPABASE_URL,
  PORT
} = process.env;

if (!MIDTRANS_SERVER_KEY || !SUPABASE_SERVICE_ROLE_KEY || !VITE_SUPABASE_URL) {
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

const snap = new midtransClient.Snap({
  isProduction: VITE_MIDTRANS_IS_PRODUCTION === 'true',
  serverKey: MIDTRANS_SERVER_KEY,
  clientKey: VITE_MIDTRANS_CLIENT_KEY
});

const purchaseCatalog = {
  subscription: {
    amount: 150000,
    transactionType: 'subscription_payment',
    title: 'DISBA PRO'
  },
  quota: {
    amount: 100000,
    transactionType: 'quota_purchase',
    title: '1x Upload Slot'
  }
};

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
  if (profile.role === 'admin' || profile.subscription_tier === 'pro') {
    return;
  }

  if ((profile.quota || 0) <= 0) {
    throw new Error('Kuota upload habis. Silakan beli slot upload terlebih dahulu.');
  }
}

async function applySuccessfulPayment(transactionRow) {
  if (!transactionRow?.user_id) {
    return;
  }

  if (transactionRow.type === 'subscription_payment') {
    const { error } = await supabase
      .from('profiles')
      .update({
        subscription_tier: 'pro',
        quota: 999,
        split_percentage: 100
      })
      .eq('id', transactionRow.user_id);

    if (error) {
      throw new Error(`Failed to upgrade profile: ${error.message}`);
    }
  }

  if (transactionRow.type === 'quota_purchase') {
    const profile = await getProfile(transactionRow.user_id);
    const { error } = await supabase
      .from('profiles')
      .update({ quota: (profile.quota || 0) + 1 })
      .eq('id', transactionRow.user_id);

    if (error) {
      throw new Error(`Failed to increase quota: ${error.message}`);
    }
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

app.post('/api/checkout', requireAuth, async (req, res) => {
  try {
    const purchaseType = req.body?.purchase_type;
    const purchase = purchaseCatalog[purchaseType];

    if (!purchase) {
      return res.status(400).json({ error: 'Unsupported purchase type.' });
    }

    const profile = await getProfile(req.user.id);
    if (purchaseType === 'subscription' && profile.subscription_tier === 'pro') {
      return res.status(400).json({ error: 'Akun ini sudah PRO.' });
    }

    const orderId = generateOrderId();
    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: purchase.amount
      },
      customer_details: {
        first_name: profile.full_name || 'Artist',
        email: req.user.email
      },
      item_details: [
        {
          id: purchase.transactionType,
          name: purchase.title,
          price: purchase.amount,
          quantity: 1
        }
      ]
    };

    const transaction = await snap.createTransaction(parameter);

    const { error: dbError } = await supabase.from('transactions').insert({
      midtrans_order_id: orderId,
      user_id: req.user.id,
      amount: purchase.amount,
      status: 'pending',
      type: purchase.transactionType,
      payment_method: 'midtrans_snap',
      snap_token: transaction.token
    });

    if (dbError) {
      throw new Error(`Failed to persist transaction: ${dbError.message}`);
    }

    res.json({
      token: transaction.token,
      redirect_url: transaction.redirect_url,
      order_id: orderId,
      amount: purchase.amount
    });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/releases', requireAuth, async (req, res) => {
  try {
    const { title, genre, audio_url, cover_url, explicit_lyrics, splits } = req.body || {};
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
        split_percentage: splitPercentage
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

    if (profile.role !== 'admin' && profile.subscription_tier !== 'pro') {
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
      if (!['free', 'pro'].includes(req.body.subscription_tier)) {
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

app.post('/api/midtrans-webhook', async (req, res) => {
  try {
    const { order_id, status_code, gross_amount, signature_key, transaction_status, payment_type } = req.body || {};
    if (!order_id || !status_code || !gross_amount || !signature_key || !transaction_status) {
      return res.status(400).json({ error: 'Invalid webhook payload.' });
    }

    const generatedSig = crypto
      .createHash('sha512')
      .update(order_id + status_code + gross_amount + MIDTRANS_SERVER_KEY)
      .digest('hex');

    if (generatedSig !== signature_key) {
      return res.status(403).json({ error: 'Invalid signature payload.' });
    }

    const { data: transactionRow, error: transactionError } = await supabase
      .from('transactions')
      .select('*')
      .eq('midtrans_order_id', order_id)
      .single();

    if (transactionError || !transactionRow) {
      return res.status(200).json({ message: 'Transaction not registered locally.' });
    }

    let mappedStatus = 'pending';
    if (transaction_status === 'capture' || transaction_status === 'settlement') {
      mappedStatus = 'settlement';
    } else if (['cancel', 'deny', 'expire'].includes(transaction_status)) {
      mappedStatus = 'expire';
    }

    const alreadySettled = ['settlement', 'success'].includes(transactionRow.status);
    const { error: updateError } = await supabase
      .from('transactions')
      .update({
        status: mappedStatus,
        payment_method: payment_type || transactionRow.payment_method
      })
      .eq('id', transactionRow.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    if (mappedStatus === 'settlement' && !alreadySettled) {
      await applySuccessfulPayment(transactionRow);
    }

    res.status(200).json({ message: 'Notification handled.' });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

app.listen(PORT || 3001, () => {
  console.log(`Secure backend server running on port ${PORT || 3001}`);
});
