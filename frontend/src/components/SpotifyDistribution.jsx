import React, { useState } from 'react';
import { Upload, Music, Globe, TrendingUp, CheckCircle, Clock, AlertCircle, Share2, Download } from 'lucide-react';

/**
 * Spotify Distribution Component
 * Displays distribution status, analytics, and allows artists to distribute tracks
 */
export function SpotifyDistribution({ releases, onDistribute, apiUrl, accessToken }) {
  const [selectedRelease, setSelectedRelease] = useState(null);
  const [distributingId, setDistributingId] = useState(null);
  const [showDistributeModal, setShowDistributeModal] = useState(false);
  const [distributionStats, setDistributionStats] = useState(null);
  const [loading, setLoading] = useState(false);

  // Get status badge color
  const getStatusColor = (status) => {
    const colors = {
      'pending': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
      'released': 'bg-green-500/20 text-green-400 border-green-500/50',
      'distributed': 'bg-blue-500/20 text-blue-400 border-blue-500/50',
      'rejected': 'bg-red-500/20 text-red-400 border-red-500/50',
      'not_distributed': 'bg-gray-500/20 text-gray-400 border-gray-500/50'
    };
    return colors[status] || colors['pending'];
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'distributed':
        return <CheckCircle size={16} />;
      case 'pending':
        return <Clock size={16} />;
      case 'rejected':
        return <AlertCircle size={16} />;
      default:
        return <Music size={16} />;
    }
  };

  // Handle distribution request
  const handleDistribute = async (release) => {
    if (!release) return;

    setDistributingId(release.id);
    setLoading(true);

    try {
      const response = await fetch(`${apiUrl}/api/spotify/distribute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          releaseId: release.id,
          albumName: release.title
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to distribute track');
      }

      alert('✅ Track berhasil didistribusikan ke Spotify!');
      setSelectedRelease(data.distribution);
      setShowDistributeModal(false);
      // Refresh parent data
      if (window.location.reload) {
        // Or call parent refresh function
      }
    } catch (error) {
      alert(`❌ Error: ${error.message}`);
    } finally {
      setDistributingId(null);
      setLoading(false);
    }
  };

  // Fetch analytics for a release
  const handleViewAnalytics = async (release) => {
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/api/spotify/analytics/${release.id}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black mb-2">🎵 Spotify Distribution</h2>
          <p className="text-gray-400 text-sm">
            Distribute your tracks ke Spotify dan track earnings real-time
          </p>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/30 px-4 py-2 rounded-xl">
          <p className="text-[10px] text-blue-300 uppercase font-bold tracking-widest">AGREGATOR MODE</p>
          <p className="text-xl font-black text-blue-400">15% Commission</p>
        </div>
      </div>

      {/* Distribution Stats */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white/[0.02] border border-white/[0.05] p-6 rounded-[2rem]">
          <div className="flex items-center gap-3 mb-3">
            <Music className="text-blue-500" size={20} />
            <span className="text-[10px] text-gray-500 font-bold uppercase">Total Releases</span>
          </div>
          <p className="text-3xl font-black">{releases?.length || 0}</p>
          <p className="text-[10px] text-gray-600 mt-2">Upload siap distribusi</p>
        </div>

        <div className="bg-white/[0.02] border border-white/[0.05] p-6 rounded-[2rem]">
          <div className="flex items-center gap-3 mb-3">
            <Globe className="text-green-500" size={20} />
            <span className="text-[10px] text-gray-500 font-bold uppercase">Distributed</span>
          </div>
          <p className="text-3xl font-black">
            {releases?.filter(r => r.spotify_status === 'distributed')?.length || 0}
          </p>
          <p className="text-[10px] text-gray-600 mt-2">Live di Spotify</p>
        </div>

        <div className="bg-white/[0.02] border border-white/[0.05] p-6 rounded-[2rem]">
          <div className="flex items-center gap-3 mb-3">
            <TrendingUp className="text-purple-500" size={20} />
            <span className="text-[10px] text-gray-500 font-bold uppercase">Total Streams</span>
          </div>
          <p className="text-3xl font-black">
            {distributionStats?.summary?.totalStreams?.toLocaleString() || '0'}
          </p>
          <p className="text-[10px] text-gray-600 mt-2">Dari semua tracks</p>
        </div>
      </div>

      {/* Releases List */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold">Your Releases</h3>

        {releases && releases.length > 0 ? (
          <div className="space-y-3">
            {releases.map((release) => (
              <div
                key={release.id}
                className="bg-white/[0.02] border border-white/[0.05] p-6 rounded-[2rem] hover:bg-white/[0.04] transition-all group"
              >
                <div className="flex items-start justify-between gap-6">
                  {/* Track Info */}
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

                    {/* Details */}
                    <div className="mt-3 flex flex-wrap gap-4 text-[10px] text-gray-500">
                      <span>ISRC: <span className="text-blue-400">{release.isrc}</span></span>
                      <span>UPC: <span className="text-blue-400">{release.upc}</span></span>
                      {release.explicit_lyrics && (
                        <span className="bg-red-500/20 text-red-400 px-2 py-1 rounded">🔞 EXPLICIT</span>
                      )}
                    </div>
                  </div>

                  {/* Status & Actions */}
                  <div className="flex flex-col items-end gap-3">
                    {/* Status Badge */}
                    <span
                      className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold border ${getStatusColor(
                        release.spotify_status
                      )}`}
                    >
                      {getStatusIcon(release.spotify_status)}
                      {(release.spotify_status || 'not_distributed').replace('_', ' ').toUpperCase()}
                    </span>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      {release.spotify_status !== 'distributed' && (
                        <button
                          onClick={() => {
                            setSelectedRelease(release);
                            setShowDistributeModal(true);
                          }}
                          disabled={distributingId === release.id || loading}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-[10px] font-bold rounded-lg hover:bg-blue-700 transition-all disabled:opacity-60"
                        >
                          <Upload size={12} />
                          {distributingId === release.id ? 'Distributing...' : 'Distribute'}
                        </button>
                      )}

                      {release.spotify_status === 'distributed' && (
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
            ))}
          </div>
        ) : (
          <div className="bg-white/[0.02] border border-dashed border-white/[0.1] p-12 rounded-[2rem] text-center">
            <Music size={40} className="mx-auto mb-3 opacity-50" />
            <p className="text-gray-500">No releases yet. Upload your first track!</p>
          </div>
        )}
      </div>

      {/* Analytics Modal */}
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

          {/* Summary Stats */}
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

          {/* Detailed Analytics */}
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

      {/* Distribution Modal */}
      {showDistributeModal && selectedRelease && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white/[0.02] border border-white/[0.1] p-8 rounded-[2rem] max-w-md w-full space-y-6">
            <div className="text-center">
              <Globe className="mx-auto mb-3 text-blue-500" size={40} />
              <h3 className="text-2xl font-black mb-2">Distribute to Spotify</h3>
              <p className="text-gray-500 text-sm">
                Your track will be live on Spotify within 24-48 hours
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
