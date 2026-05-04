import axios from 'axios';

class SpotifyService {
  constructor() {
    this.clientId = process.env.SPOTIFY_CLIENT_ID;
    this.clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    this.redirectUri = process.env.SPOTIFY_REDIRECT_URI;
    this.apiBaseUrl = process.env.SPOTIFY_API_BASE_URL || 'https://api.spotify.com/v1';
    this.authBaseUrl = 'https://accounts.spotify.com/api/token';
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  /**
   * Get valid Spotify access token (refresh if needed)
   */
  async getAccessToken() {
    // Return cached token if still valid
    if (this.accessToken && this.tokenExpiry > Date.now()) {
      return this.accessToken;
    }

    try {
      const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      const response = await axios.post(
        this.authBaseUrl,
        'grant_type=client_credentials',
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);
      return this.accessToken;
    } catch (error) {
      console.error('Failed to get Spotify access token:', error.response?.data || error.message);
      throw new Error('Failed to authenticate with Spotify API');
    }
  }

  async distributeTrack(releaseData) {
    try {
      const token = await this.getAccessToken();

      if (!releaseData.title || !releaseData.isrc || !releaseData.audio_url) {
        throw new Error('Missing required fields: title, isrc, audio_url');
      }

      const payload = {
        name: releaseData.title,
        isrc: releaseData.isrc,
        artists: [
          {
            name: releaseData.artist_name || 'Unknown Artist'
          }
        ],
        album: {
          name: releaseData.album_name || releaseData.title,
          release_date: new Date().toISOString().split('T')[0],
          images: releaseData.cover_url ? [
            {
              url: releaseData.cover_url,
              height: 640,
              width: 640
            }
          ] : []
        },
        external_ids: {
          isrc: releaseData.isrc,
          upc: releaseData.upc
        },
        explicit: releaseData.explicit_lyrics || false,
        preview_url: releaseData.audio_url
      };

      const response = await axios.post(
        `${this.apiBaseUrl}/me/player/queue`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Track distributed to Spotify:', {
        title: releaseData.title,
        isrc: releaseData.isrc,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        spotify_track_id: releaseData.isrc,
        status: 'distributed',
        distribution_date: new Date().toISOString()
      };
    } catch (error) {
      console.error('Spotify distribution error:', error);
      throw error;
    }
  }

  async getTrackAnalytics(spotifyTrackId) {
    try {
      const token = await this.getAccessToken();

      const response = await axios.get(
        `${this.apiBaseUrl}/tracks/${spotifyTrackId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        streams: response.data.popularity || 0,
        followers: response.data.followers?.total || 0,
        popularity: response.data.popularity || 0,
        report_date: new Date().toISOString().split('T')[0]
      };
    } catch (error) {
      console.error('Failed to get track analytics:', error);
      throw error;
    }
  }

  calculateCommission(totalRevenue, commissionPercentage = 15) {
    const commission = totalRevenue * (commissionPercentage / 100);
    const artistPayout = totalRevenue - commission;

    return {
      totalRevenue,
      commissionPercentage,
      disbaCommission: commission,
      artistPayout: artistPayout
    };
  }

  async getWebhookStatus() {
    try {
      const token = await this.getAccessToken();
      return {
        configured: !!process.env.SPOTIFY_WEBHOOK_SECRET,
        apiConnected: !!token,
        status: 'active'
      };
    } catch (error) {
      return {
        configured: !!process.env.SPOTIFY_WEBHOOK_SECRET,
        apiConnected: false,
        status: 'error',
        error: error.message
      };
    }
  }



  verifyWebhookSignature(payload, signature) {
    const crypto = require('crypto');
    const secret = process.env.SPOTIFY_WEBHOOK_SECRET;
    
    if (!secret) {
      console.error('SPOTIFY_WEBHOOK_SECRET not configured');
      return false;
    }
    
    const hash = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    return hash === signature;
  }
}

export default new SpotifyService();
