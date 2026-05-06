/**
 * Spotify Service — Disba Music Aggregator
 *
 * CATATAN PENTING:
 * Spotify TIDAK memiliki API distribusi publik.
 * Distribusi ke Spotify dilakukan via DDEX ERN delivery (lihat ddex.js).
 * Service ini hanya untuk membaca data publik Spotify (search, preview, dll).
 *
 * Untuk menjadi Spotify Delivery Partner resmi:
 * https://artists.spotify.com/en/partner
 */
import axios from 'axios';
import crypto from 'crypto';

class SpotifyService {
  constructor() {
    this.clientId = process.env.SPOTIFY_CLIENT_ID;
    this.clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    this.apiBaseUrl = 'https://api.spotify.com/v1';
    this.authBaseUrl = 'https://accounts.spotify.com/api/token';
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  get isConfigured() {
    return !!(this.clientId && this.clientSecret &&
      !this.clientId.includes('your_') && !this.clientSecret.includes('your_'));
  }

  /**
   * Ambil access token menggunakan Client Credentials flow
   * (hanya untuk endpoint publik Spotify — TIDAK bisa untuk distribusi)
   */
  async getAccessToken() {
    if (this.accessToken && this.tokenExpiry > Date.now()) {
      return this.accessToken;
    }

    if (!this.isConfigured) {
      throw new Error('Spotify Client ID/Secret belum dikonfigurasi.');
    }

    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const response = await axios.post(
      this.authBaseUrl,
      'grant_type=client_credentials',
      {
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    this.accessToken = response.data.access_token;
    this.tokenExpiry = Date.now() + response.data.expires_in * 1000;
    return this.accessToken;
  }

  /**
   * Cari track di Spotify berdasarkan ISRC
   * (Untuk verifikasi setelah distribusi berhasil)
   */
  async findTrackByISRC(isrc) {
    if (!this.isConfigured) {
      return null;
    }

    try {
      const token = await this.getAccessToken();
      const response = await axios.get(
        `${this.apiBaseUrl}/search`,
        {
          params: { q: `isrc:${isrc}`, type: 'track', limit: 1 },
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      const tracks = response.data?.tracks?.items;
      return tracks?.length > 0 ? tracks[0] : null;
    } catch (error) {
      console.error('Spotify search error:', error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Verifikasi status HMAC webhook dari Spotify
   */
  verifyWebhookSignature(payload, signature) {
    const secret = process.env.SPOTIFY_WEBHOOK_SECRET;
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
      note: 'Distribusi ke Spotify dilakukan via DDEX ERN 4.1 workflow — bukan Spotify API langsung.',
      deliveryMethod: 'DDEX ERN 4.1'
    };
  }
}

export default new SpotifyService();
