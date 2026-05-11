import { useState } from 'react';
import {
  Activity,
  DollarSign,
  Headphones,
  Music,
  Pause,
  Play,
  Share2,
  Sparkles,
  UploadCloud,
  User,
  Wallet
} from 'lucide-react';
import { supabase } from '../../supabase';
import SpotifyDistribution from '../SpotifyDistribution';

const ARTIST_STATS = (profile, releases) => [
  {
    label: 'Total Releases',
    value: releases.length,
    icon: Music,
    color: 'text-blue-500',
    detail: 'Catalog'
  },
  {
    label: 'Live in Stores',
    value: releases.filter((release) => release.status === 'released').length,
    icon: Headphones,
    color: 'text-purple-500',
    detail: 'Approved'
  },
  {
    label: 'Royalties Earned',
    value: `Rp ${(profile.wallet_balance || 0).toLocaleString('id-ID')}`,
    icon: DollarSign,
    color: 'text-green-500',
    detail: 'Available'
  }
];

function StatCard({ stat }) {
  return (
    <div className="rounded-[2rem] border border-white/[0.05] bg-white/[0.02] p-6 backdrop-blur-md">
      <div className={`${stat.color} mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-current/10`}>
        <stat.icon size={20} />
      </div>
      <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-gray-500">{stat.label}</p>
      <h3 className="text-2xl font-black">{stat.value}</h3>
      <p className="mt-2 text-xs font-bold uppercase tracking-widest text-gray-600">{stat.detail}</p>
    </div>
  );
}

function ReleaseStatusBadge({ status }) {
  const styles = {
    released: 'bg-green-500/10 text-green-400 border-green-500/20',
    pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
    not_distributed: 'bg-white/10 text-gray-300 border-white/10'
  };

  const label = {
    released: 'Released',
    pending: 'Pending Review',
    rejected: 'Rejected',
    not_distributed: 'Draft'
  }[status] || status;

  return (
    <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${styles[status] || styles.not_distributed}`}>
      {label}
    </span>
  );
}

export default function ArtistDashboard({
  activeTab,
  profile,
  setProfile,
  releases,
  transactions,
  royalties,
  session,
  apiUrl,
  apiRequest,
  onRefresh,
  onRequestWithdrawal,
  onNotify,
  onConfirm,
  onOpenSmartLink,
  playingTrackId,
  onTogglePlayback,
  onStopPlayback
}) {
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('EDM');
  const [audioLink, setAudioLink] = useState('');
  const [coverFile, setCoverFile] = useState(null);
  const [explicit, setExplicit] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [splits, setSplits] = useState([{ email: '', percentage: 100 }]);

  const handleUpdateIdentity = async (event) => {
    event.preventDefault();

    try {
      const response = await apiRequest('/api/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          whatsapp: profile.whatsapp || '',
          instagram: profile.instagram || '',
          bank_account: profile.bank_account || '',
          bank_name: profile.bank_name || ''
        })
      });

      if (response.profile) {
        setProfile(response.profile);
      }

      onNotify({
        title: 'Identitas tersimpan',
        description: 'Profil pembayaran dan kontak sudah diperbarui.',
        variant: 'success'
      });
      onRefresh();
    } catch (error) {
      onNotify({
        title: 'Gagal menyimpan identitas',
        description: error.message,
        variant: 'error'
      });
    }
  };

  const handleUploadRelease = async (event) => {
    event.preventDefault();

    if (profile.quota <= 0 && profile.role !== 'admin' && profile.subscription_tier !== 'pro') {
      onNotify({
        title: 'Kuota upload habis',
        description: 'Silakan upgrade ke Pro atau beli slot upload baru untuk melanjutkan.',
        variant: 'error'
      });
      return;
    }

    if (!title || !audioLink || !coverFile) {
      onNotify({
        title: 'Metadata belum lengkap',
        description: 'Mohon isi judul, audio, dan cover artwork terlebih dahulu.',
        variant: 'error'
      });
      return;
    }

    setUploading(true);
    try {
      const fileName = `${Date.now()}.${coverFile.name.split('.').pop()}`;
      const { error: uploadError } = await supabase.storage.from('rilisan').upload(`covers/${fileName}`, coverFile);

      if (uploadError) {
        throw new Error(`Gagal mengunggah cover: ${uploadError.message}`);
      }

      const { data: { publicUrl } } = supabase.storage.from('rilisan').getPublicUrl(`covers/${fileName}`);

      const result = await apiRequest('/api/releases', {
        method: 'POST',
        body: JSON.stringify({
          title,
          genre,
          audio_url: audioLink,
          cover_url: publicUrl,
          explicit_lyrics: explicit,
          splits
        })
      });

      setTitle('');
      setGenre('EDM');
      setAudioLink('');
      setCoverFile(null);
      setExplicit(false);
      setSplits([{ email: '', percentage: 100 }]);

      onNotify({
        title: 'Release berhasil dikirim',
        description: `Karya masuk antrean dengan ISRC ${result.isrc}.`,
        variant: 'success'
      });
      onRefresh();
    } catch (error) {
      onNotify({
        title: 'Upload gagal',
        description: error.message,
        variant: 'error'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleCopyUpgradeMessage = async () => {
    const shouldOpen = await onConfirm({
      title: 'Buka WhatsApp konfirmasi?',
      description: 'Kami akan membuka WhatsApp dengan template pesan konfirmasi pembayaran Pro Plan.',
      confirmLabel: 'Buka WhatsApp'
    });

    if (!shouldOpen) return;

    window.open(
      `https://wa.me/6282164187865?text=${encodeURIComponent(`Halo, saya ingin konfirmasi pembayaran Disba Music Pro Plan atas nama ${profile.full_name || '...'} `)}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  if (activeTab === 'dashboard') {
    return (
      <div className="space-y-10">
        <div className="relative overflow-hidden rounded-[3rem] border border-white/5 shadow-2xl">
          <div
            className="h-[400px] w-full scale-105 transition-transform duration-1000"
            style={{ background: 'radial-gradient(ellipse at 60% 40%, #1e3a6e 0%, #0f2040 40%, #07090E 85%)' }}
          />
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: 'radial-gradient(circle at 30% 60%, rgba(79,70,229,0.2) 0%, transparent 50%), radial-gradient(circle at 80% 30%, rgba(37,99,235,0.15) 0%, transparent 50%)'
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#07090E] via-[#07090E]/40 to-transparent" />
          <div className="absolute bottom-12 left-12 right-12 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
            <div>
              <h1 className="mb-4 text-5xl font-black tracking-tighter md:text-6xl">
                Good Evening, {profile.full_name || 'Artist'}
              </h1>
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-blue-400">
                <Sparkles size={14} />
                {profile.subscription_tier === 'pro'
                  ? 'Premium Aggregator Active'
                  : 'Account Inactive - Upgrade Required'}
              </p>
            </div>

            {profile.subscription_tier !== 'pro' && (
              <button
                type="button"
                onClick={handleCopyUpgradeMessage}
                className="rounded-full bg-white px-8 py-4 text-sm font-black uppercase tracking-widest text-black transition-all hover:bg-blue-500 hover:text-white"
              >
                Upgrade to Pro
              </button>
            )}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {ARTIST_STATS(profile, releases).map((stat) => (
            <StatCard key={stat.label} stat={stat} />
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[2.5rem] border border-white/[0.05] bg-gradient-to-br from-blue-900/20 to-transparent p-8">
            <div className="mb-8 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-2xl font-black tracking-tight">Recent Releases</h3>
                <p className="mt-1 text-xs font-bold uppercase tracking-widest text-gray-500">
                  Preview audio and open your smart links
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {releases.slice(0, 4).map((release) => (
                <div
                  key={release.id}
                  className="flex flex-col gap-4 rounded-[2rem] border border-white/[0.05] bg-white/[0.02] p-4 md:flex-row md:items-center"
                >
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl">
                    <img
                      src={release.cover_url}
                      alt={release.title}
                      className="h-full w-full object-cover"
                    />
                    {release.audio_url && (
                      <button
                        type="button"
                        onClick={() => onTogglePlayback(release.id)}
                        className="absolute inset-0 flex items-center justify-center bg-black/45 transition-colors hover:bg-black/30"
                      >
                        {playingTrackId === release.id ? (
                          <Pause className="fill-current text-white" />
                        ) : (
                          <Play className="fill-current text-white" />
                        )}
                      </button>
                    )}
                    {playingTrackId === release.id && release.audio_url && (
                      <audio
                        autoPlay
                        src={release.audio_url}
                        onEnded={onStopPlayback}
                        className="hidden"
                      />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-3">
                      <h4 className="text-lg font-black">{release.title}</h4>
                      <ReleaseStatusBadge status={release.status || release.spotify_status} />
                    </div>
                    <p className="text-[10px] font-mono uppercase tracking-widest text-gray-500">
                      {release.genre} · ISRC {release.isrc || '-'} · UPC {release.upc || '-'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onOpenSmartLink(release)}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-blue-300 transition-all hover:bg-blue-500 hover:text-white"
                  >
                    <Share2 size={14} />
                    Smart Link
                  </button>
                </div>
              ))}

              {releases.length === 0 && (
                <div className="rounded-[2rem] border border-dashed border-white/10 p-10 text-center text-sm text-gray-500">
                  Belum ada release. Upload karya pertamamu dari tab My Music.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[2.5rem] border border-white/[0.05] bg-white/[0.02] p-8">
            <h3 className="text-2xl font-black tracking-tight">Identity Snapshot</h3>
            <p className="mt-1 text-xs font-bold uppercase tracking-widest text-gray-500">
              Payout and contact details
            </p>

            <div className="mt-8 space-y-4 text-sm">
              {[
                ['WhatsApp', profile.whatsapp || 'Belum diisi'],
                ['Instagram', profile.instagram || 'Belum diisi'],
                ['Bank / E-Wallet', profile.bank_name || 'Belum diisi'],
                ['Nomor Tujuan', profile.bank_account || 'Belum diisi']
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-white/5 bg-black/20 p-4">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-gray-500">{label}</p>
                  <p className="font-semibold text-white">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'music') {
    return (
      <div className="space-y-10">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <div className="mb-6 rounded-3xl border border-white/[0.05] bg-white/[0.02] p-6">
              <h3 className="mb-4 flex items-center gap-2 font-bold">
                <User size={20} className="text-blue-500" />
                Informasi Identitas & Pembayaran
              </h3>
              <form onSubmit={handleUpdateIdentity} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-gray-500">
                      WhatsApp
                    </label>
                    <input
                      type="text"
                      value={profile.whatsapp || ''}
                      onChange={(event) => setProfile({ ...profile, whatsapp: event.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm outline-none focus:border-blue-500"
                      placeholder="08..."
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-gray-500">
                      Instagram
                    </label>
                    <input
                      type="text"
                      value={profile.instagram || ''}
                      onChange={(event) => setProfile({ ...profile, instagram: event.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm outline-none focus:border-blue-500"
                      placeholder="@username"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-gray-500">
                      Nama Bank/E-Wallet
                    </label>
                    <input
                      type="text"
                      value={profile.bank_name || ''}
                      onChange={(event) => setProfile({ ...profile, bank_name: event.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm outline-none focus:border-blue-500"
                      placeholder="BCA / DANA"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-gray-500">
                      No Rekening / No HP
                    </label>
                    <input
                      type="text"
                      value={profile.bank_account || ''}
                      onChange={(event) => setProfile({ ...profile, bank_account: event.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm outline-none focus:border-blue-500"
                      placeholder="1234567890"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full rounded-xl border border-blue-500/30 bg-blue-600/20 py-3 text-xs font-bold text-blue-400 transition-all hover:bg-blue-600 hover:text-white"
                >
                  Simpan Identitas
                </button>
              </form>
            </div>

            {profile.quota > 0 || profile.subscription_tier === 'pro' || profile.role === 'admin' ? (
              <div className="rounded-3xl border border-white/[0.05] bg-white/[0.02] p-6">
                <div className="mb-6 flex items-center gap-3">
                  <div className="rounded-lg bg-blue-500/10 p-2 text-blue-400">
                    <UploadCloud size={20} />
                  </div>
                  <h3 className="font-bold">New Release</h3>
                </div>

                <form onSubmit={handleUploadRelease} className="space-y-5">
                  <div>
                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-gray-500">
                      Track/Album Title
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm outline-none focus:border-blue-500"
                      placeholder="e.g. Cerita Malam"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-gray-500">
                        Genre
                      </label>
                      <select
                        value={genre}
                        onChange={(event) => setGenre(event.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-[13px] outline-none"
                      >
                        <option>Pop</option>
                        <option>EDM</option>
                        <option>Hip Hop</option>
                        <option>Dangdut</option>
                      </select>
                    </div>
                    <div className="mt-6 flex items-center">
                      <label className="flex cursor-pointer items-center gap-2 text-[11px] font-bold text-gray-400">
                        <input
                          type="checkbox"
                          checked={explicit}
                          onChange={(event) => setExplicit(event.target.checked)}
                          className="h-4 w-4 cursor-pointer accent-red-500"
                        />
                        EXPLICIT LYRICS
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-gray-500">
                      Audio WAV Link
                    </label>
                    <input
                      type="url"
                      value={audioLink}
                      onChange={(event) => setAudioLink(event.target.value)}
                      className="w-full rounded-xl border border-blue-900/30 bg-blue-900/5 p-3 font-mono text-xs text-blue-300 outline-none focus:border-blue-500"
                      placeholder="https://..."
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-gray-500">
                      Cover Artwork (3000x3000px)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => setCoverFile(event.target.files?.[0] || null)}
                      className="w-full text-xs file:mr-4 file:rounded-full file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-white/20"
                    />
                  </div>

                  <div className="space-y-3 rounded-2xl border border-white/5 bg-black/20 p-4">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                        Revenue Splits
                      </label>
                      <button
                        type="button"
                        onClick={() => setSplits([...splits, { email: '', percentage: 0 }])}
                        className="rounded-md bg-blue-500/10 px-2 py-1 text-[9px] font-bold text-blue-400 transition-all hover:bg-blue-500/20"
                      >
                        + Add Collaborator
                      </button>
                    </div>

                    {splits.map((split, index) => (
                      <div key={`${split.email}-${index}`} className="flex gap-2">
                        <input
                          type="email"
                          placeholder="Email"
                          value={split.email}
                          onChange={(event) => {
                            const nextSplits = [...splits];
                            nextSplits[index].email = event.target.value;
                            setSplits(nextSplits);
                          }}
                          className="flex-1 rounded-lg border border-white/5 bg-white/5 p-2 text-[10px] outline-none"
                        />
                        <input
                          type="number"
                          placeholder="%"
                          value={split.percentage}
                          onChange={(event) => {
                            const nextSplits = [...splits];
                            nextSplits[index].percentage = Number.parseInt(event.target.value || '0', 10);
                            setSplits(nextSplits);
                          }}
                          className="w-16 rounded-lg border border-white/5 bg-white/5 p-2 text-[10px] outline-none"
                        />
                      </div>
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={uploading}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-white py-4 text-sm font-bold text-black transition-all hover:bg-gray-200 disabled:opacity-60"
                  >
                    {uploading ? 'Publishing...' : (<><Sparkles size={16} /> Publish to Stores</>)}
                  </button>
                </form>
              </div>
            ) : (
              <div className="relative overflow-hidden rounded-3xl border border-blue-500/30 bg-gradient-to-br from-indigo-900/30 to-blue-900/10 p-8 text-center">
                <h3 className="mb-2 text-2xl font-black">Upgrade to Pro</h3>
                <p className="mb-6 text-xs text-gray-400">
                  Distribute unlimited tracks and keep 100% earnings.
                </p>

                <div className="mb-6 space-y-6 rounded-2xl border border-white/5 bg-black/40 p-6 text-left">
                  <div>
                    <h4 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-blue-400">
                      <Wallet size={16} />
                      Transfer Bank
                    </h4>
                    <div className="space-y-2 rounded-xl bg-white/5 p-4 text-sm">
                      <div className="flex justify-between border-b border-white/5 pb-2">
                        <span className="text-gray-500">Bank</span>
                        <span className="font-bold text-white">BCA</span>
                      </div>
                      <div className="flex justify-between border-b border-white/5 pb-2">
                        <span className="text-gray-500">No. Rekening</span>
                        <span className="font-mono text-lg font-bold tracking-wider text-white">3491608259</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Atas Nama</span>
                        <span className="font-bold text-white">Bagus Arifianto Sormin</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-blue-400">
                      <Activity size={16} />
                      E-Wallet / QRIS
                    </h4>
                    <div className="rounded-xl bg-white/5 p-4 text-center">
                      <img src="/qris-dana.jpeg" alt="QRIS DANA" className="mx-auto mb-3 w-48 rounded-xl bg-white p-2 shadow-lg" />
                      <p className="text-xs text-gray-400">
                        Scan QRIS di atas menggunakan aplikasi DANA atau e-wallet lainnya.
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCopyUpgradeMessage}
                  className="w-full rounded-xl bg-green-600 py-4 font-bold text-white shadow-lg transition-all hover:bg-green-500"
                >
                  Konfirmasi via WhatsApp
                </button>
              </div>
            )}
          </div>

          <div className="lg:col-span-8 space-y-6">
            <SpotifyDistribution
              releases={releases}
              apiUrl={apiUrl}
              accessToken={session?.access_token}
              onDataRefresh={onRefresh}
              onNotify={onNotify}
              onConfirm={onConfirm}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <div className="grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <div className="rounded-[2rem] border border-green-500/20 bg-gradient-to-br from-green-900/40 via-black to-emerald-900/10 p-8 shadow-2xl">
            <DollarSign className="mb-6 text-green-500" size={24} />
            <p className="mb-2 text-sm font-bold uppercase tracking-widest text-gray-400">Available Balance</p>
            <h1 className="mb-8 text-5xl font-black tracking-tighter text-white">
              Rp {(profile.wallet_balance || 0).toLocaleString('id-ID')}
            </h1>
            <button
              type="button"
              onClick={onRequestWithdrawal}
              className="w-full rounded-xl bg-white py-4 font-bold text-black shadow-xl transition-all hover:bg-gray-100"
            >
              Withdraw Funds
            </button>
          </div>
        </div>

        <div className="lg:col-span-7">
          <h3 className="mb-6 text-xl font-bold">Ledger & History</h3>
          <div className="overflow-hidden rounded-3xl border border-white/[0.05] bg-white/[0.02]">
            {transactions.length === 0 ? (
              <div className="p-10 text-center text-sm text-gray-500">No transactions yet.</div>
            ) : (
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-white/[0.05] text-[10px] uppercase tracking-widest text-gray-500">
                    <th className="p-4 font-normal">Date</th>
                    <th className="p-4 font-normal">Type</th>
                    <th className="p-4 font-normal">Status</th>
                    <th className="p-4 text-right font-normal">Amount</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {transactions.map((transaction) => {
                    const isDebit = transaction.type === 'withdrawal';
                    const typeLabel = {
                      subscription_payment: 'Subscription',
                      quota_purchase: 'Beli Slot',
                      royalty_dist: 'Royalti',
                      withdrawal: 'Penarikan',
                      admin_withdrawal: 'Admin Withdraw'
                    }[transaction.type] || transaction.type;

                    return (
                      <tr key={transaction.id} className="border-b border-white/[0.02] transition-colors hover:bg-white/[0.01]">
                        <td className="p-4 font-mono text-xs text-gray-400">
                          {new Date(transaction.created_at).toLocaleDateString('id-ID')}
                        </td>
                        <td className="p-4 text-xs font-bold text-gray-300">{typeLabel}</td>
                        <td className="p-4">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                              transaction.status === 'success'
                                ? 'bg-green-500/10 text-green-400'
                                : transaction.status === 'pending'
                                  ? 'bg-yellow-500/10 text-yellow-400'
                                  : 'bg-red-500/10 text-red-400'
                            }`}
                          >
                            {transaction.status}
                          </span>
                        </td>
                        <td className={`p-4 text-right font-mono font-bold ${isDebit ? 'text-red-400' : 'text-green-400'}`}>
                          {isDebit ? '-' : '+'}Rp {(transaction.amount || 0).toLocaleString('id-ID')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-6 text-xl font-bold">Royalty Reports</h3>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {royalties.length === 0 ? (
            <div className="text-sm text-gray-500">No royalty reports yet.</div>
          ) : (
            royalties.map((royalty) => (
              <div
                key={royalty.id}
                className="flex items-center justify-between rounded-3xl border border-white/[0.05] bg-white/[0.02] p-6"
              >
                <div>
                  <p className="mb-1 text-[10px] font-bold uppercase text-gray-500">
                    {royalty.releases?.title || 'Unknown'}
                  </p>
                  <h4 className="text-lg font-black text-green-400">
                    + Rp {(royalty.amount_earned || 0).toLocaleString('id-ID')}
                  </h4>
                  <p className="mt-1 text-[9px] text-gray-600">
                    {new Date(royalty.report_month || royalty.created_at).toLocaleDateString('id-ID', {
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
                <span className="rounded bg-green-500/10 px-2 py-1 text-[9px] font-bold uppercase text-green-500">
                  PAID
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
