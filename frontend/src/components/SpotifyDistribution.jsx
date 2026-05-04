import React, { useEffect, useEffectEvent, useState } from 'react';
import { Upload, Music, Globe, TrendingUp, CheckCircle, Clock, AlertCircle, Share2 } from 'lucide-react';

const PLATFORM_LABELS = {
  spotify: 'Spotify',
  tune_core: 'TuneCore',
  apple_music: 'Apple Music'
};

/**
 * Spotify Distribution Component
 * Displays distribution status, analytics, and allows artists to distribute tracks
 */
export function SpotifyDistribution({ releases, onDistribute, apiUrl, accessToken }) {
  const [selectedRelease, setSelectedRelease] = useState(null);
  const [distributingId, setDistributingId] = useState(null);
  const [showDistributeModal, setShowDistributeModal] = useState(false);
  const [distributionStats, setDistributionStats] = useState(null);
  const [distributionMap, setDistributionMap] = useState({});
  const [loading, setLoading] = useState(false);
  const releaseIdsKey = (releases || []).map((release) => release.id).join(',');

  const fetchDistributionStatus = useEffectEvent(async () => {
    if (!accessToken) {
      setDistributionMap({});
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/api/distribution/status`, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load distribution status');
      }

      const grouped = (data.distributions || []).reduce((acc, distribution) => {
        if (!acc[distribution.release_id]) {
          acc[distribution.release_id] = [];
        }

        acc[distribution.release_id].push(distribution);
        return acc;
      }, {});

      setDistributionMap(grouped);
    } catch (error) {
      console.warn('Distribution status warning:', error.message);
      setDistributionMap({});
    }
  });

  useEffect(() => {
    fetchDistributionStatus();
  }, [apiUrl, accessToken, releaseIdsKey, fetchDistributionStatus]);

  const getSelectedPlatforms = (release) => {
    if (Array.isArray(release?.selected_stores) && release.selected_stores.length > 0) {
      return [...new Set(release.selected_stores)];
    }

    return ['spotify'];
  };

  const getReleaseDistributionState = (release) => {
    const selectedPlatforms = getSelectedPlatforms(release);
    const distributions = distributionMap[release.id] || [];
    const distributedPlatforms = [];
    const pendingPlatforms = [];
    const failedPlatforms = [];

    distributions.forEach((distribution) => {
      if (distribution.status === 'distributed' && !distributedPlatforms.includes(distribution.platform)) {
        distributedPlatforms.push(distribution.platform);
      }

      if (distribution.status === 'pending' && !pendingPlatforms.includes(distribution.platform)) {
        pendingPlatforms.push(distribution.platform);
      }

      if ((distribution.status === 'error' || distribution.status === 'rejected') && !failedPlatforms.includes(distribution.platform)) {
        failedPlatforms.push(distribution.platform);
      }
    });

    const remainingPlatforms = selectedPlatforms.filter(
      (platform) => !distributedPlatforms.includes(platform) && !pendingPlatforms.includes(platform)
    );

    let overallStatus = 'not_distributed';
    if (remainingPlatforms.length === 0 && pendingPlatforms.length === 0 && distributedPlatforms.length > 0) {
      overallStatus = 'distributed';
    } else if (pendingPlatforms.length > 0 && distributedPlatforms.length === 0) {
      overallStatus = 'pending';
    } else if (distributedPlatforms.length > 0 || pendingPlatforms.length > 0) {
      overallStatus = 'partial';
    }

    return {
      distributions,
      selectedPlatforms,
      distributedPlatforms,
      pendingPlatforms,
      failedPlatforms,
      remainingPlatforms,
      overallStatus,
      canViewAnalytics: distributedPlatforms.includes('spotify')
    };
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
      partial: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50',
      released: 'bg-green-500/20 text-green-400 border-green-500/50',
      distributed: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
      rejected: 'bg-red-500/20 text-red-400 border-red-500/50',
      not_distributed: 'bg-gray-500/20 text-gray-400 border-gray-500/50'
    };

    return colors[status] || colors.pending;
  };

  const getPlatformChipClass = (platform, state) => {
    if (state.distributedPlatforms.includes(platform)) {
      return 'bg-green-500/15 text-green-300 border border-green-500/30';
    }

    if (state.pendingPlatforms.includes(platform)) {
      return 'bg-yellow-500/15 text-yellow-300 border border-yellow-500/30';
    }

    if (state.failedPlatforms.includes(platform)) {
      return 'bg-red-500/15 text-red-300 border border-red-500/30';
    }

    return 'bg-white/5 text-gray-300 border border-white/10';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'distributed':
        return <CheckCircle size={16} />;
      case 'partial':
        return <Globe size={16} />;
      case 'pending':
        return <Clock size={16} />;
      case 'rejected':
        return <AlertCircle size={16} />;
      default:
        return <Music size={16} />;
    }
  };

  const handleDistribute = async (release) => {
    if (!release) return;

    const releaseState = getReleaseDistributionState(release);
    const platformsToSend = releaseState.remainingPlatforms.length > 0
      ? releaseState.remainingPlatforms
      : releaseState.selectedPlatforms;

    setDistributingId(release.id);
    setLoading(true);

    try {
      const response = await fetch(`${apiUrl}/api/distribution/distribute`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          releaseId: release.id,
          platforms: platformsToSend
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to distribute track');
      }

      const errorSuffix = data.errors?.length ? `\n\nSebagian platform gagal: ${data.errors.join(', ')}` : '';
      alert(`✅ ${data.message}${errorSuffix}`);
      setSelectedRelease(null);
      setShowDistributeModal(false);
      setDistributionStats(null);
      await fetchDistributionStatus();
      if (typeof onDistribute === 'function') {
        onDistribute(release.id);
      }
    } catch (error) {
      alert(`❌ Error: ${error.message}`);
    } finally {
      setDistributingId(null);
      setLoading(false);
    }
  };

  const handleViewAnalytics = async (release) => {
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/api/spotify/analytics/${release.id}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const data = await response.json();
      setDistributionStats(data);
      setSelectedRelease(release);
    } catch (error) {
      alert(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const totalReleases = releases?.length || 0;
  const liveReleaseCount = (releases || []).filter(
    (release) => getReleaseDistributionState(release).distributedPlatforms.length > 0
  ).length;
  const livePlatformCount = (releases || []).reduce(
    (sum, release) => sum + getReleaseDistributionState(release).distributedPlatforms.length,
    0
  );
  const modalDistributionState = selectedRelease ? getReleaseDistributionState(selectedRelease) : null;
  const modalPlatforms = modalDistributionState
    ? (modalDistributionState.remainingPlatforms.length > 0
      ? modalDistributionState.remainingPlatforms
      : modalDistributionState.selectedPlatforms)
    : [];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black mb-2">🎵 Store Distribution</h2>
          <p className="text-gray-400 text-sm">
            Distribute your tracks ke Spotify, TuneCore, Apple Music dan store lain secara fleksibel.
          </p>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/30 px-4 py-2 rounded-xl">
          <p className="text-[10px] text-blue-300 uppercase font-bold tracking-widest">AGREGATOR MODE</p>
          <p className="text-xl font-black text-blue-400">15% Commission</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white/[0.02] border border-white/[0.05] p-6 rounded-[2rem]">
          <div className="flex items-center gap-3 mb-3">
            <Music className="text-blue-500" size={20} />
            <span className="text-[10px] text-gray-500 font-bold uppercase">Total Releases</span>
          </div>
          <p className="text-3xl font-black">{totalReleases}</p>
          <p className="text-[10px] text-gray-600 mt-2">Upload siap distribusi</p>
        </div>

        <div className="bg-white/[0.02] border border-white/[0.05] p-6 rounded-[2rem]">
          <div className="flex items-center gap-3 mb-3">
            <Globe className="text-green-500" size={20} />
            <span className="text-[10px] text-gray-500 font-bold uppercase">Live Releases</span>
          </div>
          <p className="text-3xl font-black">{liveReleaseCount}</p>
          <p className="text-[10px] text-gray-600 mt-2">{livePlatformCount} platform aktif</p>
        </div>

        <div className="bg-white/[0.02] border border-white/[0.05] p-6 rounded-[2rem]">
          <div className="flex items-center gap-3 mb-3">
            <TrendingUp className="text-purple-500" size={20} />
            <span className="text-[10px] text-gray-500 font-bold uppercase">Total Streams</span>
          </div>
          <p className="text-3xl font-black">
            {distributionStats?.summary?.totalStreams?.toLocaleString() || '0'}
          </p>
          <p className="text-[10px] text-gray-600 mt-2">Dari semua tracks Spotify</p>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-bold">Your Releases</h3>

        {releases && releases.length > 0 ? (
          <div className="space-y-3">
            {releases.map((release) => {
              const releaseState = getReleaseDistributionState(release);
              const actionLabel = releaseState.distributedPlatforms.length > 0 ? 'Distribute Remaining' : 'Distribute';

              return (
                <div
                  key={release.id}
                  className="bg-white/[0.02] border border-white/[0.05] p-6 rounded-[2rem] hover:bg-white/[0.04] transition-all group"
                >
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {release.cover_url && (
                          <img
                            src={release.cover_url}
                            alt={release.title}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                        )}
                        <div>
                          <h4 className="font-bold text-white group-hover:text-blue-400 transition-colors">
                            {release.title}
                          </h4>
                          <p className="text-[10px] text-gray-500">{release.genre}</p>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-4 text-[10px] text-gray-500">
                        <span>ISRC: <span className="text-blue-400">{release.isrc}</span></span>
                        <span>UPC: <span className="text-blue-400">{release.upc}</span></span>
                        {release.explicit_lyrics && (
                          <span className="bg-red-500/20 text-red-400 px-2 py-1 rounded">🔞 EXPLICIT</span>
                        )}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
                        {releaseState.selectedPlatforms.map((platform) => (
                          <span
                            key={platform}
                            className={`px-3 py-1 rounded-full uppercase tracking-[0.18em] ${getPlatformChipClass(platform, releaseState)}`}
                          >
                            {PLATFORM_LABELS[platform] || platform.replace('_', ' ')}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-3">
                      <span
                        className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold border ${getStatusColor(
                          releaseState.overallStatus
                        )}`}
                      >
                        {getStatusIcon(releaseState.overallStatus)}
                        {releaseState.overallStatus.replace('_', ' ').toUpperCase()}
                      </span>

                      <div className="flex gap-2">
                        {releaseState.remainingPlatforms.length > 0 && (
                          <button
                            onClick={() => {
                              setSelectedRelease(release);
                              setShowDistributeModal(true);
                            }}
                            disabled={distributingId === release.id || loading}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-[10px] font-bold rounded-lg hover:bg-blue-700 transition-all disabled:opacity-60"
                          >
                            <Upload size={12} />
                            {distributingId === release.id ? 'Distributing...' : actionLabel}
                          </button>
                        )}

                        {releaseState.canViewAnalytics && (
                          <>
                            <button
                              onClick={() => handleViewAnalytics(release)}
                              disabled={loading}
                              className="flex items-center gap-2 px-4 py-2 bg-green-600/20 text-green-400 text-[10px] font-bold rounded-lg hover:bg-green-600/30 transition-all border border-green-500/30"
                            >
                              <TrendingUp size={12} />
                              Analytics
                            </button>
                            <button
                              onClick={() => alert('Share feature coming soon!')}
                              className="flex items-center gap-2 px-4 py-2 bg-purple-600/20 text-purple-400 text-[10px] font-bold rounded-lg hover:bg-purple-600/30 transition-all border border-purple-500/30"
                            >
                              <Share2 size={12} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white/[0.02] border border-dashed border-white/[0.1] p-12 rounded-[2rem] text-center">
            <Music size={40} className="mx-auto mb-3 opacity-50" />
            <p className="text-gray-500">No releases yet. Upload your first track!</p>
          </div>
        )}
      </div>

      {selectedRelease && distributionStats && (
        <div className="bg-white/[0.02] border border-white/[0.05] p-8 rounded-[2rem] space-y-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-black">📊 Analytics: {selectedRelease.title}</h3>
            <button
              onClick={() => {
                setSelectedRelease(null);
                setDistributionStats(null);
              }}
              className="text-gray-500 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="grid md:grid-cols-4 gap-4">
            <div className="bg-blue-500/10 p-4 rounded-xl border border-blue-500/20">
              <p className="text-[10px] text-gray-500 uppercase mb-1">Total Streams</p>
              <p className="text-2xl font-black text-blue-400">
                {distributionStats.summary?.totalStreams?.toLocaleString()}
              </p>
            </div>
            <div className="bg-green-500/10 p-4 rounded-xl border border-green-500/20">
              <p className="text-[10px] text-gray-500 uppercase mb-1">Total Revenue</p>
              <p className="text-2xl font-black text-green-400">
                Rp {distributionStats.summary?.totalRevenue?.toLocaleString('id-ID')}
              </p>
            </div>
            <div className="bg-purple-500/10 p-4 rounded-xl border border-purple-500/20">
              <p className="text-[10px] text-gray-500 uppercase mb-1">Your Payout (85%)</p>
              <p className="text-2xl font-black text-purple-400">
                Rp {distributionStats.summary?.totalArtistPayout?.toLocaleString('id-ID')}
              </p>
            </div>
            <div className="bg-yellow-500/10 p-4 rounded-xl border border-yellow-500/20">
              <p className="text-[10px] text-gray-500 uppercase mb-1">DISBA Commission (15%)</p>
              <p className="text-2xl font-black text-yellow-400">
                Rp {distributionStats.summary?.totalDisbaCommission?.toLocaleString('id-ID')}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold">📈 Monthly Breakdown</h4>
            {distributionStats.analytics?.slice(0, 12).map((record, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-white/[0.02] rounded-lg border border-white/[0.05]">
                <div>
                  <p className="font-bold text-sm">{record.report_date}</p>
                  <p className="text-[10px] text-gray-500">{record.streams.toLocaleString()} streams</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-400">
                    Rp {record.artist_payout?.toLocaleString('id-ID')}
                  </p>
                  <p className="text-[10px] text-gray-500">
                    (DISBA: Rp {record.disba_commission?.toLocaleString('id-ID')})
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showDistributeModal && selectedRelease && modalDistributionState && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white/[0.02] border border-white/[0.1] p-8 rounded-[2rem] max-w-md w-full space-y-6">
            <div className="text-center">
              <Globe className="mx-auto mb-3 text-blue-500" size={40} />
              <h3 className="text-2xl font-black mb-2">Distribute to Selected Stores</h3>
              <p className="text-gray-500 text-sm">
                {modalPlatforms.map((platform) => PLATFORM_LABELS[platform] || platform).join(', ')} akan diproses dalam 24-48 jam.
              </p>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-xl">
              <p className="text-[10px] font-bold text-blue-300 mb-2">📊 EARNINGS SPLIT</p>
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm">Your payout per stream</span>
                <span className="font-bold text-green-400">85%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">DISBA commission</span>
                <span className="font-bold text-yellow-400">15%</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center p-3 bg-white/[0.02] rounded-lg">
                <span className="text-[10px] text-gray-500">Track</span>
                <span className="font-bold">{selectedRelease.title}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white/[0.02] rounded-lg">
                <span className="text-[10px] text-gray-500">ISRC</span>
                <span className="font-bold text-blue-400 text-sm">{selectedRelease.isrc}</span>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                {modalPlatforms.map((platform) => (
                  <span
                    key={platform}
                    className="bg-white/5 text-gray-300 border border-white/10 px-3 py-1 rounded-full text-[10px] uppercase tracking-[0.18em]"
                  >
                    {PLATFORM_LABELS[platform] || platform.replace('_', ' ')}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDistributeModal(false)}
                className="flex-1 px-4 py-3 bg-white/10 text-white rounded-lg font-bold hover:bg-white/20 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDistribute(selectedRelease)}
                disabled={loading}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? 'Distributing...' : '✓ Confirm & Distribute'}
              </button>
            </div>

            <p className="text-[10px] text-gray-600 text-center">
              By confirming, you agree that this track is original and you own all rights
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default SpotifyDistribution;
