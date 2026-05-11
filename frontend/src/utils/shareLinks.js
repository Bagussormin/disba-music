export function buildPlatformSearchUrl(track, platformName) {
  const query = encodeURIComponent(`${track.title} ${track.artistName || ''}`.trim());
  const platformUrls = {
    spotify: `https://open.spotify.com/search/${query}`,
    apple: `https://music.apple.com/us/search?term=${query}`,
    youtube: `https://music.youtube.com/search?q=${query}`
  };

  return platformUrls[platformName];
}

export function buildReleaseSharePath(releaseId) {
  return `/share/${releaseId}`;
}

export function buildReleaseShareUrl(releaseId, origin = '') {
  const path = buildReleaseSharePath(releaseId);
  if (!origin) return path;
  return `${origin.replace(/\/$/, '')}${path}`;
}
