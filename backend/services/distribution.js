import ddexService from './ddex.js';

/**
 * DistributionService — Core Aggregator Engine
 *
 * Mengelola alur distribusi musik dari Disba Music ke semua DSP
 * menggunakan standar DDEX ERN 4.1.
 *
 * Alur:
 *   Artist submit → Admin approve → DDEX XML generated → Queue ke DSP
 *   → DSP confirm (via webhook) → Status jadi 'live'
 */

const PLATFORM_CONFIG = {
  spotify: {
    id: 'spotify',
    name: 'Spotify',
    description: 'Streaming terbesar di dunia, 600M+ pengguna',
    ddexPartyId: 'PADPIDA2009121001A',
    estimatedLiveDays: 2,
    royaltyRatePerStream: 0.003, // USD per stream (rata-rata)
    active: true
  },
  apple_music: {
    id: 'apple_music',
    name: 'Apple Music',
    description: 'Ekosistem Apple, 100M+ subscriber',
    ddexPartyId: 'PADPIDA2009121101A',
    estimatedLiveDays: 3,
    royaltyRatePerStream: 0.01,
    active: true
  },
  youtube_music: {
    id: 'youtube_music',
    name: 'YouTube Music',
    description: 'Platform musik Google, integrasi YouTube',
    ddexPartyId: 'PADPIDA2006081601A',
    estimatedLiveDays: 5,
    royaltyRatePerStream: 0.002,
    active: true
  },
  tidal: {
    id: 'tidal',
    name: 'TIDAL',
    description: 'Lossless audio quality, 4M+ subscriber',
    ddexPartyId: 'PADPIDA2014010101A',
    estimatedLiveDays: 3,
    royaltyRatePerStream: 0.013,
    active: true
  },
  amazon_music: {
    id: 'amazon_music',
    name: 'Amazon Music',
    description: 'Ekosistem Amazon Prime, 100M+ pengguna',
    ddexPartyId: 'PADPIDA2004020901A',
    estimatedLiveDays: 5,
    royaltyRatePerStream: 0.004,
    active: true
  },
  deezer: {
    id: 'deezer',
    name: 'Deezer',
    description: '16M+ tracks, populer di Eropa',
    ddexPartyId: 'PADPIDA2009040901A',
    estimatedLiveDays: 4,
    royaltyRatePerStream: 0.0064,
    active: true
  },
  joox: {
    id: 'joox',
    name: 'JOOX',
    description: 'Platform musik terbesar di Asia Tenggara',
    ddexPartyId: 'PADPIDA2015061601A',
    estimatedLiveDays: 3,
    royaltyRatePerStream: 0.001,
    active: true
  },
  resso: {
    id: 'resso',
    name: 'Resso / TikTok Music',
    description: 'Platform musik dari ByteDance',
    ddexPartyId: 'PADPIDA2020010101A',
    estimatedLiveDays: 3,
    royaltyRatePerStream: 0.001,
    active: true
  }
};

class DistributionService {
  /**
   * Dapatkan daftar semua platform yang aktif
   */
  getActivePlatforms() {
    return Object.values(PLATFORM_CONFIG).filter(p => p.active);
  }

  /**
   * Validasi dan normalisasi daftar platform
   */
  normalizePlatforms(platforms = ['spotify']) {
    const requestedPlatforms = Array.isArray(platforms) && platforms.length > 0
      ? platforms
      : ['spotify'];

    return [...new Set(
      requestedPlatforms
        .filter(p => typeof p === 'string' && p.trim())
        .filter(p => PLATFORM_CONFIG[p.toLowerCase()])
    )];
  }

  /**
   * Submit release ke delivery queue (langkah pertama setelah artist upload)
   * Status: pending (menunggu admin approval)
   */
  async submitToQueue(supabase, release, profile, platforms = ['spotify']) {
    const selectedPlatforms = this.normalizePlatforms(platforms);

    if (selectedPlatforms.length === 0) {
      throw new Error('Tidak ada platform yang valid dipilih.');
    }

    // Validasi metadata via DDEX service
    const validation = ddexService.validateMetadata(release, profile);
    if (!validation.valid) {
      throw new Error(`Metadata tidak lengkap: ${validation.errors.join(', ')}`);
    }

    // Cek apakah sudah ada queue untuk release ini
    const { data: existing } = await supabase
      .from('delivery_queue')
      .select('id, status')
      .eq('release_id', release.id)
      .not('status', 'in', '("rejected","failed")')
      .maybeSingle();

    if (existing) {
      throw new Error(`Release ini sudah ada di antrian pengiriman dengan status: ${existing.status}`);
    }

    // Snapshot metadata untuk DDEX generation nanti
    const metadataSnapshot = {
      title: release.title,
      genre: release.genre,
      audio_url: release.audio_url,
      cover_url: release.cover_url,
      isrc: release.isrc,
      upc: release.upc,
      explicit_lyrics: release.explicit_lyrics,
      album_name: release.album_name,
      release_date: release.release_date,
      language: release.language,
      label: release.label,
      copyright_year: release.copyright_year,
      copyright_holder: release.copyright_holder,
      artist_name: profile.artist_stage_name || profile.full_name,
      label_name: profile.label_name,
      country: profile.country || 'ID'
    };

    const { data: queueEntry, error } = await supabase
      .from('delivery_queue')
      .insert([{
        release_id: release.id,
        user_id: release.user_id,
        platforms: selectedPlatforms,
        isrc: release.isrc,
        upc: release.upc,
        status: 'pending',
        metadata_snapshot: metadataSnapshot
      }])
      .select()
      .single();

    if (error) throw new Error(`Gagal memasukkan ke delivery queue: ${error.message}`);

    // Log aksi
    await this._log(supabase, {
      delivery_queue_id: queueEntry.id,
      release_id: release.id,
      user_id: release.user_id,
      action: 'SUBMITTED_TO_QUEUE',
      status_from: null,
      status_to: 'pending',
      message: `Release "${release.title}" disubmit ke ${selectedPlatforms.join(', ')} — menunggu review admin.`,
      metadata: { platforms: selectedPlatforms }
    });

    return queueEntry;
  }

  /**
   * Admin approve delivery → generate DDEX XML dan tandai siap kirim
   */
  async approveAndGenerateDDEX(supabase, queueId, adminUserId) {
    const { data: queueEntry, error: queueError } = await supabase
      .from('delivery_queue')
      .select('*')
      .eq('id', queueId)
      .single();

    if (queueError || !queueEntry) {
      throw new Error('Delivery queue entry tidak ditemukan.');
    }

    if (queueEntry.status !== 'pending') {
      throw new Error(`Queue entry sudah dalam status: ${queueEntry.status}`);
    }

    // Ambil release dan profile terbaru
    const { data: release } = await supabase
      .from('releases')
      .select('*')
      .eq('id', queueEntry.release_id)
      .single();

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', queueEntry.user_id)
      .single();

    if (!release || !profile) {
      throw new Error('Data release atau artist tidak ditemukan.');
    }

    // Generate DDEX XML
    const metadata = queueEntry.metadata_snapshot || {};
    const releaseForDDEX = { ...release, ...metadata };
    const ddexXml = ddexService.generateERN(releaseForDDEX, profile, queueEntry.platforms);

    // Hitung estimasi tanggal live
    const maxDays = Math.max(
      ...queueEntry.platforms.map(p => PLATFORM_CONFIG[p]?.estimatedLiveDays || 5)
    );
    const estimatedLive = new Date(Date.now() + maxDays * 24 * 60 * 60 * 1000).toISOString();

    // Update status ke 'approved' + simpan DDEX XML
    const { error: updateError } = await supabase
      .from('delivery_queue')
      .update({
        status: 'approved',
        ddex_xml: ddexXml,
        approved_by: adminUserId,
        approved_at: new Date().toISOString(),
        delivery_attempt: 0
      })
      .eq('id', queueId);

    if (updateError) throw new Error(updateError.message);

    // Buat distribution records per platform
    for (const platform of queueEntry.platforms) {
      const { error: distError } = await supabase
        .from('spotify_distributions')
        .insert([{
          release_id: queueEntry.release_id,
          user_id: queueEntry.user_id,
          platform,
          ddex_ref: `DISBA-${queueEntry.release_id.slice(0, 8).toUpperCase()}`,
          ddex_xml: ddexXml,
          delivery_format: 'ddex_ern41',
          delivery_batch_id: queueId,
          status: 'processing',
          distribution_date: new Date().toISOString(),
          estimated_live_date: estimatedLive
        }]);

      if (distError) {
        console.error(`Failed to create distribution record for ${platform}:`, distError.message);
      }
    }

    // Update release spotify_status
    await supabase
      .from('releases')
      .update({ spotify_status: 'processing', status: 'released' })
      .eq('id', queueEntry.release_id);

    // Log
    await this._log(supabase, {
      delivery_queue_id: queueId,
      release_id: queueEntry.release_id,
      user_id: queueEntry.user_id,
      action: 'ADMIN_APPROVED',
      status_from: 'pending',
      status_to: 'approved',
      message: `DDEX ERN 4.1 XML generated. Dikirim ke: ${queueEntry.platforms.join(', ')}. Est. live: ${estimatedLive}`,
      metadata: { approved_by: adminUserId, platforms: queueEntry.platforms, estimatedLive }
    });

    return {
      queueEntry,
      ddexXml,
      platforms: queueEntry.platforms,
      estimatedLiveDate: estimatedLive
    };
  }

  /**
   * Konfirmasi track sudah live di DSP (admin atau via webhook DSP)
   */
  async confirmLive(supabase, releaseId, platform, platformTrackId = null, adminUserId = null) {
    const { data: dist, error } = await supabase
      .from('spotify_distributions')
      .select('*')
      .eq('release_id', releaseId)
      .eq('platform', platform)
      .maybeSingle();

    if (error || !dist) {
      throw new Error(`Distribution record tidak ditemukan untuk platform ${platform}`);
    }

    const updateData = {
      status: 'live',
      live_date: new Date().toISOString()
    };

    if (platformTrackId) {
      updateData.platform_track_id = platformTrackId;
      updateData.platform_uri = `${platform}:track:${platformTrackId}`;
      if (platform === 'spotify') {
        updateData.spotify_track_id = platformTrackId;
        updateData.spotify_uri = `spotify:track:${platformTrackId}`;
      }
    }

    await supabase
      .from('spotify_distributions')
      .update(updateData)
      .eq('id', dist.id);

    // Cek apakah semua platform untuk release ini sudah live
    const { data: allDists } = await supabase
      .from('spotify_distributions')
      .select('status, platform')
      .eq('release_id', releaseId);

    const allLive = allDists?.every(d => d.status === 'live');
    if (allLive) {
      await supabase
        .from('releases')
        .update({ spotify_status: 'distributed' })
        .eq('id', releaseId);

      // Update delivery queue juga
      await supabase
        .from('delivery_queue')
        .update({ status: 'live', live_at: new Date().toISOString() })
        .eq('release_id', releaseId);
    }

    await this._log(supabase, {
      release_id: releaseId,
      user_id: dist.user_id,
      action: 'CONFIRMED_LIVE',
      status_from: 'processing',
      status_to: 'live',
      platform,
      message: `Track confirmed LIVE di ${platform}${platformTrackId ? ` — ID: ${platformTrackId}` : ''}`,
      metadata: { platform, platformTrackId, confirmedBy: adminUserId }
    });

    return { success: true, platform, liveDate: new Date().toISOString() };
  }

  /**
   * Proses royalti yang masuk dari DSP (via webhook atau input manual admin)
   */
  async processRoyaltyReport(supabase, releaseId, platform, streams, revenueUSD, reportDate) {
    const { data: dist } = await supabase
      .from('spotify_distributions')
      .select('*')
      .eq('release_id', releaseId)
      .eq('platform', platform)
      .maybeSingle();

    if (!dist) throw new Error('Distribution record tidak ditemukan.');

    // Konversi USD ke IDR (rate kasar, idealnya pakai live forex)
    const usdToIdr = parseFloat(process.env.USD_TO_IDR_RATE || '16000');
    const revenueIDR = revenueUSD * usdToIdr;
    const commissionPct = parseFloat(process.env.SPOTIFY_COMMISSION_PERCENTAGE || '15');
    const disbaCommission = revenueIDR * (commissionPct / 100);
    const artistPayout = revenueIDR - disbaCommission;

    // Cek duplikat
    const { data: existing } = await supabase
      .from('spotify_analytics')
      .select('id')
      .eq('spotify_distribution_id', dist.id)
      .eq('report_date', reportDate)
      .maybeSingle();

    if (existing) {
      return { message: 'Laporan untuk tanggal ini sudah diproses.', existing: true };
    }

    // Insert analytics
    const { error: analyticsError } = await supabase
      .from('spotify_analytics')
      .insert([{
        spotify_distribution_id: dist.id,
        release_id: releaseId,
        user_id: dist.user_id,
        platform,
        report_date: reportDate,
        streams: streams || 0,
        total_revenue: revenueIDR,
        disba_commission: disbaCommission,
        artist_payout: artistPayout
      }]);

    if (analyticsError) throw new Error(analyticsError.message);

    // Kredit wallet artist
    const { data: profile } = await supabase
      .from('profiles')
      .select('wallet_balance')
      .eq('id', dist.user_id)
      .single();

    const newBalance = Number(profile?.wallet_balance || 0) + artistPayout;

    await supabase
      .from('profiles')
      .update({ wallet_balance: newBalance })
      .eq('id', dist.user_id);

    // Insert royalty ledger
    await supabase
      .from('royalties_ledger')
      .insert([{
        user_id: dist.user_id,
        release_id: releaseId,
        amount_earned: artistPayout,
        report_month: reportDate,
        platform,
        streams
      }]);

    // Insert transaksi
    await supabase
      .from('transactions')
      .insert([{
        user_id: dist.user_id,
        type: 'royalty_dist',
        amount: artistPayout,
        status: 'success',
        description: `Royalti ${platform} — ${streams.toLocaleString()} streams — ${reportDate}`
      }]);

    await this._log(supabase, {
      release_id: releaseId,
      user_id: dist.user_id,
      action: 'ROYALTY_PROCESSED',
      platform,
      message: `Royalti masuk: ${streams.toLocaleString()} streams, Rp ${artistPayout.toLocaleString('id-ID')} (artist) + Rp ${disbaCommission.toLocaleString('id-ID')} (Disba)`,
      metadata: { streams, revenueUSD, revenueIDR, disbaCommission, artistPayout }
    });

    return { success: true, artistPayout, disbaCommission, streams };
  }

  /**
   * Helper: Log setiap aksi distribusi
   */
  async _log(supabase, logData) {
    try {
      await supabase.from('distribution_logs').insert([{
        delivery_queue_id: logData.delivery_queue_id || null,
        release_id: logData.release_id,
        user_id: logData.user_id,
        action: logData.action,
        platform: logData.platform || null,
        status_from: logData.status_from || null,
        status_to: logData.status_to || null,
        message: logData.message,
        metadata: logData.metadata || null
      }]);
    } catch (err) {
      console.error('Distribution log error:', err.message);
    }
  }
}

export default new DistributionService();