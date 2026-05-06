/**
 * Apple Music Service — Disba Music Aggregator
 *
 * Apple Music Content Provider Program:
 * https://developer.apple.com/contact/request/music-catalog-products/
 * Butuh Apple Developer account + approval sebagai content provider.
 * Delivery format: DDEX ERN via Apple's content delivery system.
 */
import axios from 'axios';
import crypto from 'crypto';

class AppleMusicService {
  constructor() {
    this.apiUrl = process.env.APPLE_MUSIC_DISTRIBUTION_API_URL;
    this.apiKey = process.env.APPLE_MUSIC_DISTRIBUTION_API_KEY;
    this.teamId = process.env.APPLE_MUSIC_TEAM_ID;
    this.keyId = process.env.APPLE_MUSIC_KEY_ID;
  }

  get isConfigured() {
    return !!(this.apiUrl && this.apiKey &&
      !this.apiKey.includes('your_') && !this.apiUrl.includes('your_'));
  }

  /**
   * Submit distribusi ke Apple Music Content Provider API
   */
  async distributeTrack(releaseData) {
    if (!this.isConfigured) {
      throw new Error('Apple Music Content Provider API belum dikonfigurasi. Set APPLE_MUSIC_DISTRIBUTION_API_URL dan APPLE_MUSIC_DISTRIBUTION_API_KEY di environment variables.');
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
      label: releaseData.label || 'Disba Music',
      storefront: 'ID'
    };

    const response = await axios.post(`${this.apiUrl}/catalog/delivery`, payload, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'Music-User-Token': this.teamId || ''
      },
      timeout: 30000
    });

    if (!response.data?.platform_track_id && !response.data?.id) {
      throw new Error('Apple Music did not return a valid tracking response.');
    }

    return {
      success: true,
      platform_track_id: response.data.platform_track_id || response.data.id,
      platform_uri: response.data.platform_uri || `apple:track:${response.data.id}`,
      status: response.data.status || 'processing',
      distribution_date: response.data.distribution_date || new Date().toISOString()
    };
  }

  verifyWebhookSignature(payload, signature) {
    const secret = process.env.APPLE_MUSIC_WEBHOOK_SECRET;
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
      webhookConfigured: !!process.env.APPLE_MUSIC_WEBHOOK_SECRET,
      status: this.isConfigured ? 'ready' : 'not-configured'
    };
  }
}

export default new AppleMusicService();