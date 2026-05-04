import spotifyService from './spotify.js';
import tuneCoreService from './tunecore.js';
import appleMusicService from './appleMusic.js';

const PLATFORM_CONFIG = {
  spotify: {
    id: 'spotify',
    name: 'Spotify',
    description: 'Direct Spotify distribution and analytics',
    service: spotifyService,
    trackPrefix: 'spotify:track:'
  },
  tune_core: {
    id: 'tune_core',
    name: 'TuneCore',
    description: 'Wide aggregator distribution to multiple stores',
    service: tuneCoreService,
    trackPrefix: 'tunecore:track:'
  },
  apple_music: {
    id: 'apple_music',
    name: 'Apple Music',
    description: 'Apple Music and iTunes distribution',
    service: appleMusicService,
    trackPrefix: 'apple:track:'
  }
};

class DistributionService {
  normalizePlatforms(platforms = ['spotify']) {
    const requestedPlatforms = Array.isArray(platforms) && platforms.length > 0 ? platforms : ['spotify'];
    return [...new Set(requestedPlatforms.filter((platform) => typeof platform === 'string' && platform.trim()))];
  }

  getProviders() {
    return Object.values(PLATFORM_CONFIG).map(({ id, name, description }) => ({ id, name, description }));
  }

  async getArtistName(supabase, release) {
    if (release.artist_name) {
      return release.artist_name;
    }

    const { data } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', release.user_id)
      .maybeSingle();

    return data?.full_name || 'Unknown Artist';
  }

  async distributeRelease(supabase, release, platforms = ['spotify']) {
    const selectedPlatforms = this.normalizePlatforms(platforms);
    const result = {
      releaseId: release.id,
      requestedPlatforms: selectedPlatforms,
      distributed: [],
      skipped: [],
      errors: []
    };

    const { data: existingDistributions, error: existingError } = await supabase
      .from('spotify_distributions')
      .select('platform, status')
      .eq('release_id', release.id)
      .in('platform', selectedPlatforms)
      .in('status', ['pending', 'distributed']);

    if (existingError) {
      throw new Error(existingError.message);
    }

    const lockedPlatforms = new Set((existingDistributions || []).map((distribution) => distribution.platform));
    const platformsToSend = selectedPlatforms.filter((platform) => !lockedPlatforms.has(platform));

    if (platformsToSend.length === 0) {
      result.skipped = selectedPlatforms;
      return result;
    }

    const artistName = await this.getArtistName(supabase, release);

    for (const platform of platformsToSend) {
      const provider = PLATFORM_CONFIG[platform];
      if (!provider) {
        result.errors.push(`Unknown distribution provider: ${platform}`);
        continue;
      }

      const releasePayload = {
        title: release.title,
        artist_name: artistName,
        album_name: release.album_name || release.title,
        audio_url: release.audio_url,
        cover_url: release.cover_url,
        isrc: release.isrc,
        upc: release.upc,
        explicit_lyrics: release.explicit_lyrics
      };

      try {
        const platformResult = await provider.service.distributeTrack(releasePayload);
        const platformTrackId = platformResult.platform_track_id || platformResult.spotify_track_id || null;
        const platformUri = platformResult.platform_uri || platformResult.spotify_uri || null;

        const distributionRecord = {
          release_id: release.id,
          user_id: release.user_id,
          platform: provider.id,
          platform_track_id: platformTrackId,
          platform_uri: platformUri,
          spotify_track_id: provider.id === 'spotify' ? platformTrackId : null,
          spotify_uri: provider.id === 'spotify' ? platformUri : null,
          status: platformResult.status || 'distributed',
          distribution_date: platformResult.distribution_date || new Date().toISOString()
        };

        const { error: distError } = await supabase.from('spotify_distributions').insert([distributionRecord]);
        if (distError) {
          throw new Error(distError.message);
        }

        if (platform === 'spotify') {
          await supabase
            .from('releases')
            .update({
              spotify_track_id: distributionRecord.spotify_track_id,
              spotify_status: 'distributed'
            })
            .eq('id', release.id);
        }

        result.distributed.push({ platform: provider.id, ...platformResult });
      } catch (error) {
        result.errors.push(`${provider.name} failed: ${error.message}`);
      }
    }

    return result;
  }
}

export default new DistributionService();