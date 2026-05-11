import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import distributionService from './services/distribution.js';
import spotifyService from './services/spotify.js';
import ddexService from './services/ddex.js';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
const PORT_FINAL = process.env.PORT || 3001;
const FRONTEND_URL_FINAL = process.env.FRONTEND_URL || 'https://disba-music.vercel.app';
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'disba_music_default_secret_2026';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ CRITICAL ERROR: Missing Supabase credentials.');
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your production environment.');
  process.exit(1);
}

const app = express();
const frontendUrl = FRONTEND_URL_FINAL;
const minimumWithdrawalAmount = 50000;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: {
    transport: ws,
    params: {
      eventsPerSecond: 10
    }
  },
  global: {
    fetch: (...args) => fetch(...args)
  }
});

// ============================================================
// CORS & MIDDLEWARE
// ============================================================

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [frontendUrl, 'https://disba-music.vercel.app'] 
    : [frontendUrl, 'http://localhost:5173', 'https://disba-music.vercel.app'],
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function getBearerToken(req) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice('Bearer '.length).trim();
}

async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw new Error(`Failed to load profile: ${error.message}`);
  return data;
}

async function requireAuth(req, res, next) {
  try {
    const accessToken = getBearerToken(req);
    if (!accessToken) return res.status(401).json({ error: 'Missing bearer token.' });
    const { data, error } = await supabase.auth.getUser(accessToken);
    if (error || !data?.user) return res.status(401).json({ error: 'Invalid or expired session.' });
    req.accessToken = accessToken;
    req.user = data.user;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Authentication failed.' });
  }
}

async function requireAdmin(req, res, next) {
  try {
    const profile = await getProfile(req.user.id);
    if (profile.role !== 'admin') return res.status(403).json({ error: 'Admin access required.' });
    req.profile = profile;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Failed to validate admin access.' });
  }
}

function sanitizeSplits(splits) {
  if (!Array.isArray(splits)) return [];
  return splits
    .filter(s => s && typeof s.email === 'string' && s.email.trim())
    .map(s => ({ email: s.email.trim().toLowerCase(), percentage: Number(s.percentage) }))
    .filter(s => Number.isFinite(s.percentage) && s.percentage > 0 && s.percentage <= 100);
}

function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function sanitizeLineup(lineup) {
  if (Array.isArray(lineup)) {
    return lineup.map((item) => String(item || '').trim()).filter(Boolean);
  }

  if (typeof lineup === 'string') {
    return lineup
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function sanitizeEventPayload(payload = {}) {
  const title = String(payload.title || '').trim();
  const venue = String(payload.venue || '').trim();
  const date = String(payload.date || '').trim();
  const description = String(payload.description || '').trim();
  const price = String(payload.price || '').trim();
  const status = String(payload.status || 'SELLING FAST').trim();
  const color = String(payload.color || 'bg-orange-500').trim();
  const image = payload.image ? String(payload.image).trim() : null;
  const lineup = sanitizeLineup(payload.lineup);

  if (!title || !venue || !date || !description || !price || lineup.length === 0) {
    throw new Error('Data event belum lengkap. Mohon isi title, venue, date, description, price, dan lineup.');
  }

  return { title, venue, date, description, price, status, color, image, lineup };
}

function generateUpc() {
  const base = `8804821${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}0`;
  const digits = base.split('').map(Number);
  const sum = digits.reduce((acc, d, i) => acc + (i % 2 === 0 ? d : d * 3), 0);
  const check = (10 - (sum % 10)) % 10;
  return base.slice(0, -1) + check;
}

// ============================================================
// HEALTH CHECK
// ============================================================

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    platform: 'Disba Music Aggregator',
    ddexVersion: 'ERN 4.1',
    platforms: distributionService.getActivePlatforms().map(p => p.name)
  });
});

// ============================================================
// PUBLIC LANDING CONTENT
// ============================================================

app.get('/api/landing', async (req, res) => {
  try {
    const [{ data: djs, error: djsError }, { data: events, error: eventsError }] = await Promise.all([
      supabase.from('djs').select('*').order('rank', { ascending: true }),
      supabase.from('events').select('*').order('created_at', { ascending: false })
    ]);

    if (djsError) throw new Error(djsError.message);
    if (eventsError) throw new Error(eventsError.message);

    const trackTitles = [...new Set((djs || []).flatMap((dj) => dj.recent_tracks || []).filter(Boolean))];
    let releases = [];

    if (trackTitles.length > 0) {
      const { data: releasesData, error: releasesError } = await supabase
        .from('releases')
        .select('title, audio_url, cover_url, status, spotify_status')
        .not('audio_url', 'is', null)
        .in('title', trackTitles);

      if (releasesError) throw new Error(releasesError.message);
      releases = releasesData || [];
    }

    const releaseMap = new Map(releases.map((release) => [normalizeText(release.title), release]));

    const mappedDjs = (djs || []).map((dj) => ({
      ...dj,
      recent_tracks: (dj.recent_tracks || []).map((trackTitle) => {
        const exactMatch = releaseMap.get(normalizeText(trackTitle));
        const fallbackMatch = releases.find((release) => normalizeText(release.title).includes(normalizeText(trackTitle)));
        const match = exactMatch || fallbackMatch || null;

        return {
          title: trackTitle,
          audio_url: match?.audio_url || null,
          cover_url: match?.cover_url || null,
          release_status: match?.spotify_status || match?.status || null
        };
      })
    }));

    res.json({
      djs: mappedDjs,
      events: events || []
    });
  } catch (error) {
    console.error('Landing content error:', error);
    res.status(500).json({ error: 'Gagal memuat landing content.' });
  }
});

app.get('/api/public/releases/:releaseId', async (req, res) => {
  try {
    const { data: release, error: releaseError } = await supabase
      .from('releases')
      .select('id, user_id, title, genre, audio_url, cover_url, isrc, upc, status, spotify_status, created_at')
      .eq('id', req.params.releaseId)
      .eq('status', 'released')
      .maybeSingle();

    if (releaseError) throw new Error(releaseError.message);
    if (!release) {
      return res.status(404).json({ error: 'Release publik tidak ditemukan.' });
    }

    const { data: ownerProfile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, artist_stage_name')
      .eq('id', release.user_id)
      .maybeSingle();

    if (profileError) throw new Error(profileError.message);

    res.json({
      release: {
        id: release.id,
        title: release.title,
        genre: release.genre,
        audio_url: release.audio_url,
        cover_url: release.cover_url,
        isrc: release.isrc,
        upc: release.upc,
        spotify_status: release.spotify_status,
        created_at: release.created_at,
        artistName: ownerProfile?.artist_stage_name || ownerProfile?.full_name || 'Disba Artist'
      }
    });
  } catch (error) {
    console.error('Public release fetch error:', error);
    res.status(500).json({ error: 'Gagal memuat release publik.' });
  }
});

// ============================================================
// ADMIN DASHBOARD
// ============================================================

app.get('/api/admin/dashboard', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [
      { data: users },
      { data: releases },
      { data: transactions },
      { data: royalties },
      { data: deliveryQueue },
      { data: events }
    ] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('releases').select('*').order('created_at', { ascending: false }),
      supabase.from('transactions').select('*').order('created_at', { ascending: false }),
      supabase.from('royalties_ledger').select('*, releases(title)').order('created_at', { ascending: false }),
      supabase.from('delivery_queue').select('*, releases(title, isrc, upc)').order('created_at', { ascending: false }).limit(50),
      supabase.from('events').select('*').order('created_at', { ascending: false })
    ]);

    res.json({ users, releases, transactions, royalties, deliveryQueue, events });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// RELEASES
// ============================================================

app.post('/api/releases', requireAuth, async (req, res) => {
  try {
    const { title, genre, audio_url, cover_url, explicit_lyrics, splits, album_name, selected_stores, release_date, language, label } = req.body || {};

    if (!title || !genre || !audio_url || !cover_url) {
      return res.status(400).json({ error: 'Metadata release belum lengkap (title, genre, audio_url, cover_url).' });
    }

    const profile = await getProfile(req.user.id);

    if (profile.role !== 'admin') {
      if ((profile.quota || 0) <= 0) {
        return res.status(400).json({ error: 'Kuota upload habis. Silakan upgrade ke Pro atau beli slot upload.' });
      }
    }

    const { data: generatedIsrc, error: isrcError } = await supabase.rpc('generate_next_isrc');
    if (isrcError || !generatedIsrc) throw new Error(isrcError?.message || 'Gagal membuat ISRC.');

    const upc = generateUpc();
    const splitPercentage = profile.subscription_tier === 'pro' || profile.role === 'admin' ? 100 : 80;

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
        selected_stores: Array.isArray(selected_stores) ? selected_stores : [],
        release_date: release_date || null,
        language: language || 'id',
        label: label || profile.label_name || 'Disba Music',
        copyright_holder: profile.artist_stage_name || profile.full_name,
        copyright_year: new Date().getFullYear()
      }])
      .select()
      .single();

    if (releaseError) throw new Error(releaseError.message);

    const validSplits = sanitizeSplits(splits);
    const totalSplitPct = validSplits.reduce((sum, s) => sum + s.percentage, 0);
    if (totalSplitPct > 100) throw new Error('Total split kolaborator tidak boleh melebihi 100%.');

    if (validSplits.length > 0) {
      const { error: splitsError } = await supabase.from('release_splits').insert(
        validSplits.map(s => ({ release_id: releaseData.id, email: s.email, percentage: s.percentage }))
      );
      if (splitsError) throw new Error(`Gagal menyimpan split: ${splitsError.message}`);
    }

    if (profile.role !== 'admin') {
      await supabase
        .from('profiles')
        .update({ quota: Math.max(0, (profile.quota || 0) - 1) })
        .eq('id', req.user.id);
    }

    res.status(201).json({ release: releaseData, isrc: generatedIsrc, upc });
  } catch (error) {
    console.error('Create release error:', error);
    res.status(400).json({ error: error.message });
  }
});

// ============================================================
// DISTRIBUTION — AGGREGATOR ENDPOINTS
// ============================================================

/**
 * GET /api/distribution/platforms
 * Daftar semua platform yang tersedia
 */
app.get('/api/distribution/platforms', requireAuth, (req, res) => {
  res.json({
    platforms: distributionService.getActivePlatforms()
  });
});

/**
 * POST /api/distribution/submit
 * Artist submit release ke delivery queue (multi-platform)
 */
app.post('/api/distribution/submit', requireAuth, async (req, res) => {
  try {
    const { releaseId, platforms } = req.body;
    if (!releaseId) return res.status(400).json({ error: 'Release ID diperlukan.' });

    const { data: release } = await supabase
      .from('releases')
      .select('*')
      .eq('id', releaseId)
      .eq('user_id', req.user.id)
      .single();

    if (!release) return res.status(404).json({ error: 'Release tidak ditemukan.' });

    if (release.status === 'pending') {
      return res.status(400).json({ error: 'Release harus disetujui admin terlebih dahulu.' });
    }

    const profile = await getProfile(req.user.id);
    const queueEntry = await distributionService.submitToQueue(supabase, release, profile, platforms || ['spotify']);

    res.status(201).json({
      message: 'Release berhasil masuk ke antrian distribusi! Admin akan mereview dalam 1-2 hari kerja.',
      queue: queueEntry,
      platforms: queueEntry.platforms,
      status: 'pending'
    });
  } catch (error) {
    console.error('Distribution submit error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/distribution/status/:releaseId
 * Cek status distribusi sebuah release
 */
app.get('/api/distribution/status/:releaseId', requireAuth, async (req, res) => {
  try {
    const { releaseId } = req.params;

    const [{ data: distributions }, { data: queue }] = await Promise.all([
      supabase.from('spotify_distributions').select('*').eq('release_id', releaseId).eq('user_id', req.user.id),
      supabase.from('delivery_queue').select('*').eq('release_id', releaseId).eq('user_id', req.user.id).maybeSingle()
    ]);

    const { data: analytics } = await supabase
      .from('spotify_analytics')
      .select('*')
      .eq('release_id', releaseId)
      .order('report_date', { ascending: false })
      .limit(12);

    const totalStreams = (analytics || []).reduce((sum, a) => sum + (a.streams || 0), 0);
    const totalRevenue = (analytics || []).reduce((sum, a) => sum + (a.artist_payout || 0), 0);

    res.json({
      distributions: distributions || [],
      queue,
      analytics: analytics || [],
      summary: { totalStreams, totalRevenue }
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/distribution/logs/:releaseId
 * Audit log lengkap proses distribusi
 */
app.get('/api/distribution/logs/:releaseId', requireAuth, async (req, res) => {
  try {
    const { data: logs } = await supabase
      .from('distribution_logs')
      .select('*')
      .eq('release_id', req.params.releaseId)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    res.json({ logs: logs || [] });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ============================================================
// ADMIN — DELIVERY QUEUE MANAGEMENT
// ============================================================

/**
 * GET /api/admin/delivery-queue
 * Lihat semua antrian pengiriman (admin only)
 */
app.get('/api/admin/delivery-queue', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    let query = supabase
      .from('delivery_queue')
      .select('*, releases(title, isrc, upc, genre, cover_url), profiles(full_name, artist_stage_name, email)')
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);

    const { data: queue, error } = await query;
    if (error) throw new Error(error.message);

    res.json({ queue: queue || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/delivery-queue/:queueId/approve
 * Admin approve → generate DDEX XML
 */
app.post('/api/admin/delivery-queue/:queueId/approve', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { queueId } = req.params;
    const result = await distributionService.approveAndGenerateDDEX(supabase, queueId, req.user.id);

    res.json({
      message: `✅ DDEX ERN 4.1 generated. Dikirim ke: ${result.platforms.join(', ')}. Estimasi live: ${new Date(result.estimatedLiveDate).toLocaleDateString('id-ID')}.`,
      ddexGenerated: true,
      platforms: result.platforms,
      estimatedLiveDate: result.estimatedLiveDate
    });
  } catch (error) {
    console.error('Admin approve queue error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/admin/delivery-queue/:queueId/reject
 * Admin tolak pengiriman
 */
app.post('/api/admin/delivery-queue/:queueId/reject', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { queueId } = req.params;
    const { reason } = req.body;

    const { data: queueEntry } = await supabase
      .from('delivery_queue')
      .select('*')
      .eq('id', queueId)
      .single();

    if (!queueEntry) return res.status(404).json({ error: 'Queue entry tidak ditemukan.' });

    await supabase
      .from('delivery_queue')
      .update({ status: 'rejected', rejection_reason: reason || 'Ditolak oleh admin.' })
      .eq('id', queueId);

    await supabase
      .from('releases')
      .update({ status: 'rejected' })
      .eq('id', queueEntry.release_id);

    res.json({ message: 'Pengajuan distribusi ditolak.' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/admin/distribution/confirm-live
 * Admin konfirmasi track sudah live di DSP
 */
app.post('/api/admin/distribution/confirm-live', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { releaseId, platform, platformTrackId } = req.body;
    if (!releaseId || !platform) {
      return res.status(400).json({ error: 'releaseId dan platform wajib diisi.' });
    }

    const result = await distributionService.confirmLive(supabase, releaseId, platform, platformTrackId, req.user.id);
    res.json({ message: `✅ Track dikonfirmasi LIVE di ${platform}!`, ...result });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ============================================================
// ADMIN — ROYALTY INPUT MANUAL
// ============================================================

/**
 * POST /api/admin/royalties/input
 * Admin input data royalti dari laporan DSP
 */
app.post('/api/admin/royalties/input', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { releaseId, platform, streams, revenueUSD, reportDate } = req.body;
    if (!releaseId || !platform || !revenueUSD || !reportDate) {
      return res.status(400).json({ error: 'releaseId, platform, revenueUSD, dan reportDate wajib diisi.' });
    }

    const result = await distributionService.processRoyaltyReport(
      supabase, releaseId, platform,
      streams || 0, parseFloat(revenueUSD), reportDate
    );

    res.json({ message: '✅ Royalti berhasil diinput dan dikreditkan ke wallet artist.', ...result });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ============================================================
// ADMIN — USER & RELEASE MANAGEMENT
// ============================================================

app.patch('/api/profile', requireAuth, async (req, res) => {
  try {
    const allowedUpdates = {};
    const allowedFields = ['full_name', 'artist_stage_name', 'label_name', 'whatsapp', 'instagram', 'bank_account', 'bank_name'];

    for (const field of allowedFields) {
      if (typeof req.body?.[field] === 'string') {
        allowedUpdates[field] = req.body[field].trim();
      }
    }

    if (Object.keys(allowedUpdates).length === 0) {
      return res.status(400).json({ error: 'Tidak ada data profil yang dapat diperbarui.' });
    }

    allowedUpdates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('profiles')
      .update(allowedUpdates)
      .eq('id', req.user.id)
      .select('*')
      .single();

    if (error) throw new Error(error.message);

    res.json({ message: 'Profil berhasil diperbarui.', profile: data });
  } catch (error) {
    console.error('Update profile error:', error);
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

    const { error } = await supabase.from('profiles').update(allowedUpdates).eq('id', userId);
    if (error) throw new Error(error.message);

    res.json({ message: 'User berhasil diperbarui.' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/admin/events', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    res.json({ events: data || [] });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/admin/events', requireAuth, requireAdmin, async (req, res) => {
  try {
    const payload = sanitizeEventPayload(req.body);
    const { data, error } = await supabase
      .from('events')
      .insert(payload)
      .select('*')
      .single();

    if (error) throw new Error(error.message);

    res.status(201).json({ message: 'Event berhasil dibuat.', event: data });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(400).json({ error: error.message });
  }
});

app.patch('/api/admin/events/:eventId', requireAuth, requireAdmin, async (req, res) => {
  try {
    const payload = sanitizeEventPayload(req.body);
    const { data, error } = await supabase
      .from('events')
      .update(payload)
      .eq('id', req.params.eventId)
      .select('*')
      .single();

    if (error) throw new Error(error.message);

    res.json({ message: 'Event berhasil diperbarui.', event: data });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/admin/events/:eventId', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { error } = await supabase.from('events').delete().eq('id', req.params.eventId);
    if (error) throw new Error(error.message);

    res.json({ message: 'Event berhasil dihapus.' });
  } catch (error) {
    console.error('Delete event error:', error);
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
    const { error } = await supabase.from('releases').update({ status: nextStatus }).eq('id', releaseId);
    if (error) throw new Error(error.message);

    res.json({ message: action === 'approve' ? '✅ Track disetujui. Artist bisa submit ke delivery queue.' : '❌ Track ditolak.' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ============================================================
// ADMIN — WITHDRAWALS
// ============================================================

app.post('/api/admin/withdrawals/:transactionId', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { transactionId } = req.params;
    const action = req.body?.action;
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Action tidak valid.' });
    }

    const { data: transaction } = await supabase
      .from('transactions').select('*').eq('id', transactionId).single();

    if (!transaction) return res.status(404).json({ error: 'Transaksi tidak ditemukan.' });
    if (transaction.type !== 'withdrawal' || transaction.status !== 'pending') {
      return res.status(400).json({ error: 'Transaksi ini tidak bisa diproses lagi.' });
    }

    if (action === 'approve') {
      await supabase.from('transactions').update({ status: 'success' }).eq('id', transactionId);
      return res.json({ message: '✅ Withdrawal disetujui.' });
    }

    const targetProfile = await getProfile(transaction.user_id);
    const restoredBalance = Number(targetProfile.wallet_balance || 0) + Number(transaction.amount || 0);

    await Promise.all([
      supabase.from('profiles').update({ wallet_balance: restoredBalance }).eq('id', transaction.user_id),
      supabase.from('transactions').update({ status: 'failed' }).eq('id', transactionId)
    ]);

    res.json({ message: '❌ Withdrawal ditolak dan saldo dikembalikan.' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/admin/platform-withdrawal', requireAuth, requireAdmin, async (req, res) => {
  try {
    const currentBalance = Number(req.profile.wallet_balance || 0);
    if (currentBalance < minimumWithdrawalAmount) {
      return res.status(400).json({ error: 'Saldo admin terlalu kecil untuk ditarik.' });
    }

    await Promise.all([
      supabase.from('transactions').insert([{
        user_id: req.user.id, type: 'admin_withdrawal',
        amount: currentBalance, status: 'success'
      }]),
      supabase.from('profiles').update({ wallet_balance: 0 }).eq('id', req.user.id)
    ]);

    res.json({ message: '✅ Penarikan platform berhasil diproses.' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ============================================================
// WALLET
// ============================================================

app.get('/api/wallet/balance', requireAuth, async (req, res) => {
  try {
    const profile = await getProfile(req.user.id);
    res.json({ balance: profile.wallet_balance || 0, minimum_withdrawal: minimumWithdrawalAmount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load balance.' });
  }
});

app.post('/api/withdrawals/request', requireAuth, async (req, res) => {
  try {
    const profile = await getProfile(req.user.id);
    const currentBalance = Number(profile.wallet_balance || 0);

    if (currentBalance < minimumWithdrawalAmount) {
      return res.status(400).json({ error: `Saldo minimal penarikan Rp ${minimumWithdrawalAmount.toLocaleString('id-ID')}.` });
    }

    const { data: pending } = await supabase
      .from('transactions').select('id')
      .eq('user_id', req.user.id).eq('type', 'withdrawal').eq('status', 'pending');

    if ((pending || []).length > 0) {
      return res.status(400).json({ error: 'Masih ada pengajuan penarikan yang sedang diproses.' });
    }

    await Promise.all([
      supabase.from('transactions').insert([{
        user_id: req.user.id, type: 'withdrawal',
        amount: currentBalance, status: 'pending'
      }]),
      supabase.from('profiles').update({ wallet_balance: 0 }).eq('id', req.user.id)
    ]);

    res.json({ message: '💸 Pengajuan penarikan berhasil. Mohon tunggu verifikasi admin.' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ============================================================
// WEBHOOK — DSP ROYALTY NOTIFICATIONS
// ============================================================

/**
 * POST /api/webhooks/royalty
 * Endpoint untuk menerima laporan royalti dari DSP (webhook)
 * DSP akan POST ke endpoint ini setiap bulan
 */
app.post('/api/webhooks/royalty', async (req, res) => {
  try {
    const signature = req.headers['x-disba-signature'] || req.headers['x-webhook-signature'];
    const { platform, release_id, streams, revenue_usd, report_date } = req.body;

    if (!platform || !release_id || !revenue_usd || !report_date) {
      return res.status(400).json({ error: 'Missing required webhook fields.' });
    }

    // Verify signature (gunakan secret sesuai platform)
    if (signature && process.env.WEBHOOK_SECRET) {
      const hash = crypto
        .createHmac('sha256', process.env.WEBHOOK_SECRET)
        .update(JSON.stringify(req.body))
        .digest('hex');
      if (hash !== signature) {
        return res.status(401).json({ error: 'Invalid webhook signature.' });
      }
    }

    const result = await distributionService.processRoyaltyReport(
      supabase, release_id, platform,
      streams || 0, parseFloat(revenue_usd), report_date
    );

    res.json({ message: 'Webhook processed.', ...result });
  } catch (error) {
    console.error('Royalty webhook error:', error);
    res.status(400).json({ error: error.message });
  }
});

// ============================================================
// LEGACY SPOTIFY ENDPOINTS (backward compat)
// ============================================================

app.get('/api/spotify/status/:releaseId', requireAuth, async (req, res) => {
  try {
    const { data: distribution } = await supabase
      .from('spotify_distributions')
      .select('*')
      .eq('release_id', req.params.releaseId)
      .eq('user_id', req.user.id)
      .eq('platform', 'spotify')
      .maybeSingle();

    if (!distribution) {
      return res.status(404).json({ error: 'Distribusi Spotify belum ada.' });
    }

    res.json({ distribution, status: distribution.status });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/spotify/analytics/:releaseId', requireAuth, async (req, res) => {
  try {
    const { data: analytics } = await supabase
      .from('spotify_analytics')
      .select('*')
      .eq('release_id', req.params.releaseId)
      .eq('user_id', req.user.id)
      .order('report_date', { ascending: false });

    const totalStreams = (analytics || []).reduce((sum, a) => sum + (a.streams || 0), 0);
    const totalRevenue = (analytics || []).reduce((sum, a) => sum + (a.total_revenue || 0), 0);
    const totalArtistPayout = (analytics || []).reduce((sum, a) => sum + (a.artist_payout || 0), 0);
    const totalDisbaCommission = (analytics || []).reduce((sum, a) => sum + (a.disba_commission || 0), 0);

    res.json({
      analytics: analytics || [],
      summary: { totalStreams, totalRevenue, totalArtistPayout, totalDisbaCommission }
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ============================================================
// START SERVER
// ============================================================

const port = PORT_FINAL;
app.listen(port, () => {
  console.log(`🎵 Disba Music Aggregator Backend — Port ${port}`);
  console.log(`📡 Frontend URL: ${frontendUrl}`);
  console.log(`🔗 DDEX ERN 4.1 — Ready`);
  console.log(`🌐 Active platforms: ${distributionService.getActivePlatforms().map(p => p.name).join(', ')}`);
});
