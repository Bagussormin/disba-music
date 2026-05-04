import axios from 'axios';

class AppleMusicService {
  constructor() {
    this.apiUrl = process.env.APPLE_MUSIC_DISTRIBUTION_API_URL;
    this.apiKey = process.env.APPLE_MUSIC_DISTRIBUTION_API_KEY;
  }

  async distributeTrack(releaseData) {
    if (!this.apiUrl || !this.apiKey) {
      throw new Error('Apple Music distribution service is not configured. Set APPLE_MUSIC_DISTRIBUTION_API_URL and APPLE_MUSIC_DISTRIBUTION_API_KEY.');
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
        throw new Error('Apple Music partner did not return a valid tracking response.');
      }

      return {
        success: true,
        platform_track_id: response.data.platform_track_id,
        platform_uri: response.data.platform_uri || response.data.uri,
        status: response.data.status || 'distributed',
        distribution_date: response.data.distribution_date || new Date().toISOString()
      };
    } catch (error) {
      console.error('Apple Music distribution error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error || error.message);
    }
  }
}

export default new AppleMusicService();