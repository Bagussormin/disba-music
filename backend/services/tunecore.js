import axios from 'axios';

class TuneCoreService {
  constructor() {
    this.apiUrl = process.env.TUNECORE_DISTRIBUTION_API_URL;
    this.apiKey = process.env.TUNECORE_DISTRIBUTION_API_KEY;
  }

  async distributeTrack(releaseData) {
    if (!this.apiUrl || !this.apiKey) {
      throw new Error('TuneCore distribution service is not configured. Set TUNECORE_DISTRIBUTION_API_URL and TUNECORE_DISTRIBUTION_API_KEY.');
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
      explicit_lyrics: Boolean(releaseData.explicit_lyrics)
    };

    try {
      const response = await axios.post(this.apiUrl, payload, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.data || !response.data.platform_track_id) {
        throw new Error('TuneCore partner did not return a valid tracking response.');
      }

      return {
        success: true,
        platform_track_id: response.data.platform_track_id,
        platform_uri: response.data.platform_uri || response.data.uri,
        status: response.data.status || 'distributed',
        distribution_date: response.data.distribution_date || new Date().toISOString()
      };
    } catch (error) {
      console.error('TuneCore distribution error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error || error.message);
    }
  }

  verifyWebhookSignature(payload, signature) {
    const crypto = require('crypto');
    const secret = process.env.TUNECORE_WEBHOOK_SECRET;
    
    if (!secret) {
      console.error('TUNECORE_WEBHOOK_SECRET not configured');
      return false;
    }
    
    const hash = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    return hash === signature;
  }

  async getWebhookStatus() {
    return {
      configured: !!(this.apiUrl && this.apiKey),
      webhookSecretConfigured: !!process.env.TUNECORE_WEBHOOK_SECRET,
      status: (this.apiUrl && this.apiKey) ? 'ready' : 'not-configured'
    };
  }

export default new TuneCoreService();