import { useCallback, useEffect, useState } from 'react';
import {
  Upload, Music, Globe, TrendingUp, CheckCircle, Clock,
  AlertCircle, Loader2, Radio, ChevronDown, ChevronUp,
  ExternalLink, FileCode, RefreshCw
} from 'lucide-react';

const PLATFORM_DISPLAY = {
  spotify:      { name: 'Spotify',       color: '#1DB954', emoji: '🎵' },
  apple_music:  { name: 'Apple Music',   color: '#FC3C44', emoji: '🍎' },
  youtube_music:{ name: 'YouTube Music', color: '#FF0000', emoji: '▶️' },
  tidal:        { name: 'TIDAL',         color: '#00FFFF', emoji: '🌊' },
  amazon_music: { name: 'Amazon Music',  color: '#00A8E1', emoji: '📦' },
  deezer:       { name: 'Deezer',        color: '#A238FF', emoji: '🎶' },
  joox:         { name: 'JOOX',          color: '#00C853', emoji: '🎼' },
  resso:        { name: 'Resso/TikTok',  color: '#010101', emoji: '🎤' },
};

const STATUS_CONFIG = {
  pending:    { label: 'Menunggu Review', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30', icon: Clock },
  approved:   { label: 'Disetujui', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30', icon: CheckCircle },
  processing: { label: 'Sedang Dikirim', color: 'text-purple-400 bg-purple-500/10 border-purple-500/30', icon: Loader2 },
  live:       { label: 'LIVE 🔴', color: 'text-green-400 bg-green-500/10 border-green-500/30', icon: Radio },
  distributed:{ label: 'Terdistribusi', color: 'text-green-400 bg-green-500/10 border-green-500/30', icon: CheckCircle },
  rejected:   { label: 'Ditolak', color: 'text-red-400 bg-red-500/10 border-red-500/30', icon: AlertCircle },
  failed:     { label: 'Gagal', color: 'text-red-400 bg-red-500/10 border-red-500/30', icon: AlertCircle },
  not_distributed: { label: 'Belum Didistribusikan', color: 'text-gray-400 bg-gray-500/10 border-gray-500/30', icon: Music },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.not_distributed;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold border ${cfg.color}`}>
      <Icon size={12} className={status === 'processing' ? 'animate-spin' : ''} />
      {cfg.label}
    </span>
  );
}

export function SpotifyDistribution({
  releases = [],
  apiUrl,
  accessToken,
  onDataRefresh,
  onNotify,
  onConfirm
}) {
  const [platforms, setPlatforms] = useState([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState(['spotify']);
  const [submitting, setSubmitting] = useState(null);
  const [expandedRelease, setExpandedRelease] = useState(null);
  const [analyticsMap, setAnalyticsMap] = useState({});
  const [queueMap, setQueueMap] = useState({});
  const [loadingAnalytics, setLoadingAnalytics] = useState({});

  const fetchPlatforms = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/api/distribution/platforms`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPlatforms(data.platforms || []);
      }
    } catch {
      // fallback: use static list
      setPlatforms(Object.keys(PLATFORM_DISPLAY).map(id => ({ id, name: PLATFORM_DISPLAY[id].name })));
    }
  }, [accessToken, apiUrl]);

  useEffect(() => {
    fetchPlatforms();
  }, [fetchPlatforms]);

  const togglePlatform = (platformId) => {
    setSelectedPlatforms(prev =>
      prev.includes(platformId)
        ? prev.filter(p => p !== platformId)
        : [...prev, platformId]
    );
  };

  const handleSubmitDistribution = async (release) => {
    if (selectedPlatforms.length === 0) {
      onNotify?.({
        title: 'Pilih platform distribusi',
        description: 'Minimal 1 platform tujuan harus dipilih sebelum submit.',
        variant: 'error'
      });
      return;
    }

    const confirmed = await (onConfirm?.({
      title: 'Submit distribusi release ini?',
      description: `Track "${release.title}" akan dikirim ke ${selectedPlatforms.map((platform) => PLATFORM_DISPLAY[platform]?.name || platform).join(', ')}. Komisi Disba Music 15% dari royalti.`,
      confirmLabel: 'Submit Distribusi'
    }) ?? Promise.resolve(true));

    if (!confirmed) return;

    setSubmitting(release.id);
    try {
      const res = await fetch(`${apiUrl}/api/distribution/submit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ releaseId: release.id, platforms: selectedPlatforms })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal submit distribusi.');

      onNotify?.({
        title: 'Distribusi berhasil diajukan',
        description: data.message,
        variant: 'success'
      });
      if (onDataRefresh) onDataRefresh();
      await loadReleaseStatus(release.id);
    } catch (err) {
      onNotify?.({
        title: 'Submit distribusi gagal',
        description: err.message,
        variant: 'error'
      });
    } finally {
      setSubmitting(null);
    }
  };

  const loadReleaseStatus = async (releaseId) => {
    setLoadingAnalytics(prev => ({ ...prev, [releaseId]: true }));
    try {
      const res = await fetch(`${apiUrl}/api/distribution/status/${releaseId}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAnalyticsMap(prev => ({ ...prev, [releaseId]: data }));
        setQueueMap(prev => ({ ...prev, [releaseId]: data.queue }));
      }
    } catch { /* silent */ }
    setLoadingAnalytics(prev => ({ ...prev, [releaseId]: false }));
  };

  const toggleExpand = async (releaseId) => {
    if (expandedRelease === releaseId) {
      setExpandedRelease(null);
      return;
    }
    setExpandedRelease(releaseId);
    if (!analyticsMap[releaseId]) {
      await loadReleaseStatus(releaseId);
    }
  };

  const totalDistributed = releases.filter(r => r.spotify_status === 'distributed' || r.spotify_status === 'live').length;
  const totalStreams = Object.values(analyticsMap).reduce((sum, d) => sum + (d?.summary?.totalStreams || 0), 0);
  const platformOptions = platforms.length > 0
    ? platforms.map((platform) => ({
        id: platform.id,
        name: platform.name,
        emoji: PLATFORM_DISPLAY[platform.id]?.emoji || '🎵'
      }))
    : Object.entries(PLATFORM_DISPLAY).map(([id, cfg]) => ({ id, name: cfg.name, emoji: cfg.emoji }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-3xl font-black tracking-tighter">🌐 Distribution Hub</h2>
          <p className="text-gray-500 text-xs mt-1 uppercase tracking-widest font-bold">
            DDEX ERN 4.1 · Multi-Platform Aggregator
          </p>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/30 px-5 py-3 rounded-2xl text-right">
          <p className="text-[9px] text-blue-400 uppercase font-bold tracking-widest">Disba Commission</p>
          <p className="text-2xl font-black text-blue-400">15%</p>
          <p className="text-[9px] text-gray-500">Artist dapat 85%</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Releases', value: releases.length, icon: Music, color: 'text-blue-500' },
          { label: 'Live di Stores', value: totalDistributed, icon: Radio, color: 'text-green-500' },
          { label: 'Total Streams', value: totalStreams.toLocaleString(), icon: TrendingUp, color: 'text-purple-500' },
        ].map((stat, i) => (
          <div key={i} className="bg-white/[0.02] border border-white/[0.05] p-5 rounded-[2rem]">
            <stat.icon className={`${stat.color} mb-3`} size={18} />
            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mb-1">{stat.label}</p>
            <p className="text-2xl font-black">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Platform Selector */}
      <div className="bg-white/[0.02] border border-white/[0.05] p-6 rounded-[2rem]">
        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-4">
          🎯 Pilih Target Platform Distribusi
        </p>
        <div className="flex flex-wrap gap-2">
          {platformOptions.map((platform) => {
            const selected = selectedPlatforms.includes(platform.id);
            return (
              <button
                key={platform.id}
                onClick={() => togglePlatform(platform.id)}
                className={`px-4 py-2 rounded-xl text-[11px] font-bold transition-all border ${
                  selected
                    ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                    : 'bg-white/5 border-white/10 text-gray-500 hover:text-white hover:border-white/20'
                }`}
              >
                {platform.emoji} {platform.name}
              </button>
            );
          })}
        </div>
        {selectedPlatforms.length > 0 && (
          <p className="text-[10px] text-blue-400 mt-3 font-bold">
            ✓ {selectedPlatforms.length} platform dipilih — akan dikirim via DDEX ERN 4.1
          </p>
        )}
      </div>

      {/* Releases List */}
      <div className="space-y-3">
        <h3 className="text-xl font-bold">My Releases</h3>

        {releases.length === 0 ? (
          <div className="bg-white/[0.02] border border-dashed border-white/10 p-12 rounded-[2rem] text-center">
            <Music size={36} className="mx-auto mb-3 text-gray-700" />
            <p className="text-gray-500 text-sm">Belum ada release. Upload track pertamamu!</p>
          </div>
        ) : (
          releases.map(release => {
            const queue = queueMap[release.id];
            const analytics = analyticsMap[release.id];
            const isExpanded = expandedRelease === release.id;
            const isLoading = loadingAnalytics[release.id];
            const displayStatus = queue?.status || release.spotify_status || 'not_distributed';
            const canSubmit = release.status === 'released' && displayStatus === 'not_distributed';

            return (
              <div key={release.id} className="bg-white/[0.02] border border-white/[0.05] rounded-[2rem] overflow-hidden">
                {/* Release Row */}
                <div className="flex items-center gap-4 p-5">
                  {release.cover_url && (
                    <img src={release.cover_url} alt={release.title} className="w-14 h-14 rounded-xl object-cover shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h4 className="font-bold text-white">{release.title}</h4>
                      {release.explicit_lyrics && (
                        <span className="text-[8px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded font-bold">EXPLICIT</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3 text-[10px] text-gray-600 font-mono">
                      <span>ISRC: <span className="text-blue-400">{release.isrc}</span></span>
                      <span>UPC: <span className="text-blue-400">{release.upc}</span></span>
                      <span className="text-gray-600">{release.genre}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <StatusBadge status={displayStatus} />

                    {canSubmit && (
                      <button
                        onClick={() => handleSubmitDistribution(release)}
                        disabled={submitting === release.id || selectedPlatforms.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold rounded-xl transition-all disabled:opacity-60"
                      >
                        {submitting === release.id
                          ? <><Loader2 size={12} className="animate-spin" /> Submitting...</>
                          : <><Upload size={12} /> Distribusikan</>
                        }
                      </button>
                    )}

                    {release.status === 'pending' && (
                      <span className="text-[10px] text-yellow-400 font-bold">Menunggu Approval Admin</span>
                    )}

                    <button
                      onClick={() => toggleExpand(release.id)}
                      className="text-gray-500 hover:text-white transition-colors p-1"
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-white/[0.05] p-6 space-y-6 bg-black/20">
                    {isLoading ? (
                      <div className="flex items-center gap-2 text-gray-500 text-sm">
                        <Loader2 size={14} className="animate-spin" /> Memuat status distribusi...
                      </div>
                    ) : (
                      <>
                        {/* Distribution Status per Platform */}
                        {analytics?.distributions?.length > 0 && (
                          <div>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-3">Status Per Platform</p>
                            <div className="grid grid-cols-2 gap-2">
                              {analytics.distributions.map(dist => {
                                const platformCfg = PLATFORM_DISPLAY[dist.platform] || { name: dist.platform, emoji: '🎵' };
                                return (
                                  <div key={dist.id} className="flex items-center justify-between bg-white/5 p-3 rounded-xl">
                                    <span className="text-sm font-bold">{platformCfg.emoji} {platformCfg.name}</span>
                                    <StatusBadge status={dist.status} />
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Queue Status */}
                        {queue && (
                          <div className="bg-blue-500/5 border border-blue-500/20 p-4 rounded-2xl">
                            <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mb-2">DDEX Delivery Queue</p>
                            <div className="flex flex-wrap gap-4 text-sm">
                              <span>Status: <strong>{queue.status}</strong></span>
                              {queue.approved_at && <span>Approved: <strong>{new Date(queue.approved_at).toLocaleDateString('id-ID')}</strong></span>}
                              {queue.platforms && <span>Platforms: <strong>{queue.platforms.join(', ')}</strong></span>}
                            </div>
                            {queue.rejection_reason && (
                              <p className="text-red-400 text-xs mt-2">Alasan ditolak: {queue.rejection_reason}</p>
                            )}
                          </div>
                        )}

                        {/* Analytics Summary */}
                        {analytics?.summary?.totalStreams > 0 && (
                          <div>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-3">Royalti</p>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="bg-white/5 p-4 rounded-2xl">
                                <p className="text-[9px] text-gray-500 uppercase mb-1">Total Streams</p>
                                <p className="text-2xl font-black">{analytics.summary.totalStreams.toLocaleString()}</p>
                              </div>
                              <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-2xl">
                                <p className="text-[9px] text-gray-500 uppercase mb-1">Payout (85%)</p>
                                <p className="text-2xl font-black text-green-400">
                                  Rp {(analytics.summary.totalRevenue || 0).toLocaleString('id-ID')}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* No data yet */}
                        {!queue && !analytics?.distributions?.length && (
                          <div className="text-center text-gray-600 text-sm py-4">
                            <Globe size={24} className="mx-auto mb-2 opacity-40" />
                            <p>Belum ada data distribusi. Submit track ke platform setelah diapprove admin.</p>
                          </div>
                        )}

                        {/* Refresh button */}
                        <button
                          onClick={() => loadReleaseStatus(release.id)}
                          className="flex items-center gap-2 text-[10px] text-gray-500 hover:text-white transition-colors font-bold uppercase"
                        >
                          <RefreshCw size={12} /> Refresh Status
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* DDEX Info Banner */}
      <div className="bg-white/[0.02] border border-white/[0.05] p-6 rounded-[2rem]">
        <div className="flex items-start gap-4">
          <FileCode className="text-blue-400 shrink-0 mt-1" size={20} />
          <div>
            <p className="font-bold text-sm mb-1">Disba Music menggunakan standar DDEX ERN 4.1</p>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              DDEX (Digital Data Exchange) adalah standar industri musik internasional yang digunakan oleh
              semua aggregator besar (DistroKid, TuneCore, CD Baby). Setiap rilisan yang didistribusikan
              otomatis menghasilkan DDEX XML yang dikirim ke server DSP (Spotify, Apple Music, dll).
              Proses review admin memastikan kualitas metadata sebelum pengiriman.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SpotifyDistribution;
