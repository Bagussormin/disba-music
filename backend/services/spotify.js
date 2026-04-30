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

  /**
   * Upload track metadata to Spotify for distribution
   * Simulates distribution (real implementation would use TuneCore/CD Baby API)
   */
  async distributeTrack(releaseData) {
    try {
      const token = await this.getAccessToken();

      // Validate required fields
      if (!releaseData.title || !releaseData.isrc || !releaseData.audio_url) {
        throw new Error('Missing required fields: title, isrc, audio_url');
      }

      // Create track payload for Spotify
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

      // In real implementation, this would push to Spotify's distribution network
      // For now, we simulate a successful response
      const simulatedSpotifyTrackId = `spotify:track:${this._generateTrackId()}`;
      
      console.log('Track prepared for Spotify distribution:', {
        title: releaseData.title,
        isrc: releaseData.isrc,
        simulatedId: simulatedSpotifyTrackId
      });

      return {
        success: true,
        spotify_track_id: simulatedSpotifyTrackId,
        spotify_uri: simulatedSpotifyTrackId,
        status: 'distributed',
        distribution_date: new Date().toISOString()
      };
    } catch (error) {
      console.error('Spotify distribution error:', error);
      throw error;
    }
  }

  /**
   * Get analytics/streams data from Spotify for a track
   */
  async getTrackAnalytics(spotifyTrackId) {
    try {
      // Simulate getting analytics from Spotify
      // In production, this would call Spotify's analytics or Spotify for Artists API
      
      const simulatedData = {
        streams: Math.floor(Math.random() * 100000) + 1000, // Random streams
        followers: Math.floor(Math.random() * 5000),
        popularity: Math.floor(Math.random() * 100),
        revenue: Math.floor(Math.random() * 500000) / 100, // Revenue in IDR
        report_date: new Date().toISOString().split('T')[0]
      };

      return simulatedData;
    } catch (error) {
      console.error('Failed to get track analytics:', error);
      throw error;
    }
  }

  /**
   * Calculate commission and payout for a track
   */
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

  /**
   * Generate track ID (simulate)
   */
  _generateTrackId() {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  /**
   * Verify webhook signature from Spotify
   */
  verifyWebhookSignature(payload, signature) {
    // Implement HMAC-SHA256 verification
    const crypto = require('crypto');
    const secret = process.env.SPOTIFY_WEBHOOK_SECRET;
    
    const hash = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    return hash === signature;
  }
}

export default new SpotifyService();
