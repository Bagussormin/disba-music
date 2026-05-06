/**
 * TuneCore Service — Disba Music Aggregator
 *
 * TuneCore Partnership API:
 * Untuk menggunakan TuneCore sebagai sub-aggregator/white-label:
 * https://www.tunecore.com/partner-api
 * Butuh aplikasi bisnis resmi ke TuneCore Partner Program.
 */
import axios from 'axios';
import crypto from 'crypto';

class TuneCoreService {
  constructor() {
    this.apiUrl = process.env.TUNECORE_DISTRIBUTION_API_URL;
    this.apiKey = process.env.TUNECORE_DISTRIBUTION_API_KEY;
  }

  get isConfigured() {
    return !!(this.apiUrl && this.apiKey &&
      !this.apiKey.includes('your_') && !this.apiUrl.includes('your_'));
  }

  /**
   * Submit distribusi ke TuneCore Partner API
   * Dipanggil hanya jika TuneCore dipilih sebagai platform/sub-aggregator
   */
  async distributeTrack(releaseData) {
    if (!this.isConfigured) {
      throw new Error('TuneCore Partner API belum dikonfigurasi. Set TUNECORE_DISTRIBUTION_API_URL dan TUNECORE_DISTRIBUTION_API_KEY di environment variables.');
    }

    if (!releaseData.title || !releaseData.isrc || !releaseData.audio_url) {
      throw new Error('Missing required fields: title, isrc, audio_url');
    }

    const payload = {
      title: releaseData.title,
      artist_name: releaseData.artist_name || 'Unknown Artist',
      album_name: releaseData.album_name || releaseData.title,
      audio_url: releaseData.audio_url,
      cover_url: releaseData.cover_url,
      isrc: releaseData.isrc,
      upc: releaseData.upc,
      explicit: Boolean(releaseData.explicit_lyrics),
      genre: releaseData.genre,
      release_date: releaseData.release_date || new Date().toISOString().split('T')[0],
      language: releaseData.language || 'id',
      label: releaseData.label || 'Disba Music'
    };

    const response = await axios.post(`${this.apiUrl}/releases`, payload, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'X-Partner-ID': 'DISBA_MUSIC'
      },
      timeout: 30000
    });

    if (!response.data?.platform_track_id && !response.data?.id) {
      throw new Error('TuneCore partner did not return a valid tracking response.');
    }

    return {
      success: true,
      platform_track_id: response.data.platform_track_id || response.data.id,
      platform_uri: response.data.platform_uri || response.data.url,
      status: response.data.status || 'processing',
      distribution_date: response.data.distribution_date || new Date().toISOString()
    };
  }

  verifyWebhookSignature(payload, signature) {
    const secret = process.env.TUNECORE_WEBHOOK_SECRET;
    if (!secret) return false;
    const hash = crypto
      .createHmac('sha256', secret)
      .update(typeof payload === 'string' ? payload : JSON.stringify(payload))
      .digest('hex');
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
  }

  async getStatus() {
    return {
      configured: this.isConfigured,
      webhookConfigured: !!process.env.TUNECORE_WEBHOOK_SECRET,
      status: this.isConfigured ? 'ready' : 'not-configured'
    };
  }
}

export default new TuneCoreService();