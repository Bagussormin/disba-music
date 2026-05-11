import { useEffect, useState } from 'react';
import {
  Activity,
  ArrowRightCircle,
  Calendar,
  Check,
  DollarSign,
  Globe,
  Music,
  Pause,
  Play,
  Settings,
  Sparkles,
  Trash2
} from 'lucide-react';

const EMPTY_EVENT_FORM = {
  title: '',
  venue: '',
  date: '',
  image: '',
  description: '',
  price: '',
  status: 'SELLING FAST',
  color: 'bg-orange-500',
  lineup: ''
};

function AdminStatCard({ stat }) {
  return (
    <div className="rounded-[2.5rem] border border-white/[0.05] bg-white/[0.02] p-8 backdrop-blur-md">
      <div className={`${stat.color} mb-6 flex h-10 w-10 items-center justify-center rounded-2xl bg-current/10`}>
        <stat.icon size={20} />
      </div>
      <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-gray-500">{stat.label}</p>
      <h3 className="text-2xl font-black">{stat.value}</h3>
    </div>
  );
}

function QueueStatusBadge({ status }) {
  const styles = {
    pending: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300',
    approved: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
    processing: 'border-purple-500/30 bg-purple-500/10 text-purple-300',
    live: 'border-green-500/30 bg-green-500/10 text-green-300',
    rejected: 'border-red-500/30 bg-red-500/10 text-red-300'
  };

  return (
    <span className={`rounded-full border px-2 py-1 text-[9px] font-bold uppercase ${styles[status] || styles.pending}`}>
      {status}
    </span>
  );
}

function mapEventToForm(event) {
  return {
    title: event.title || '',
    venue: event.venue || '',
    date: event.date || '',
    image: event.image || '',
    description: event.description || '',
    price: event.price || '',
    status: event.status || 'SELLING FAST',
    color: event.color || 'bg-orange-500',
    lineup: Array.isArray(event.lineup) ? event.lineup.join(', ') : event.lineup || ''
  };
}

export default function AdminDashboard({
  activeTab,
  profile,
  users,
  releases,
  transactions,
  deliveryQueue,
  events,
  playingTrackId,
  onTogglePlayback,
  onStopPlayback,
  onRefresh,
  onManageUser,
  onNotify,
  onConfirm,
  onPrompt,
  apiRequest
}) {
  const [eventForm, setEventForm] = useState(EMPTY_EVENT_FORM);
  const [editingEventId, setEditingEventId] = useState(null);
  const [submittingEvent, setSubmittingEvent] = useState(false);
  const [submittingRoyalty, setSubmittingRoyalty] = useState(false);

  useEffect(() => {
    if (!events.some((event) => event.id === editingEventId)) {
      setEditingEventId(null);
    }
  }, [editingEventId, events]);

  const resetEventForm = () => {
    setEventForm(EMPTY_EVENT_FORM);
    setEditingEventId(null);
  };

  const handleReleaseAction = async (release, action) => {
    const confirmed = await onConfirm({
      title: action === 'approve' ? 'Approve release ini?' : 'Reject release ini?',
      description: action === 'approve'
        ? `Release "${release.title}" akan ditandai siap lanjut ke distribusi.`
        : `Release "${release.title}" akan ditolak dari pipeline.`,
      confirmLabel: action === 'approve' ? 'Approve Release' : 'Reject Release',
      danger: action !== 'approve'
    });

    if (!confirmed) return;

    try {
      await apiRequest(`/api/admin/releases/${release.id}/action`, {
        method: 'POST',
        body: JSON.stringify({ action })
      });

      onNotify({
        title: action === 'approve' ? 'Release disetujui' : 'Release ditolak',
        description: action === 'approve'
          ? 'Artist sekarang bisa mengirim release ke delivery queue.'
          : 'Status release berhasil diperbarui ke rejected.',
        variant: action === 'approve' ? 'success' : 'info'
      });
      onRefresh();
    } catch (error) {
      onNotify({
        title: 'Aksi release gagal',
        description: error.message,
        variant: 'error'
      });
    }
  };

  const handleWithdrawalAction = async (transaction, action) => {
    const confirmed = await onConfirm({
      title: action === 'approve' ? 'Approve withdrawal?' : 'Reject withdrawal?',
      description: `Permintaan withdrawal Rp ${(transaction.amount || 0).toLocaleString('id-ID')} akan diproses.`,
      confirmLabel: action === 'approve' ? 'Approve' : 'Reject',
      danger: action !== 'approve'
    });

    if (!confirmed) return;

    try {
      await apiRequest(`/api/admin/withdrawals/${transaction.id}`, {
        method: 'POST',
        body: JSON.stringify({ action })
      });
      onNotify({
        title: action === 'approve' ? 'Withdrawal disetujui' : 'Withdrawal ditolak',
        description: action === 'approve'
          ? 'Permintaan payout artist sudah disetujui.'
          : 'Saldo artist otomatis dikembalikan.',
        variant: 'success'
      });
      onRefresh();
    } catch (error) {
      onNotify({
        title: 'Gagal memproses withdrawal',
        description: error.message,
        variant: 'error'
      });
    }
  };

  const handleAdminWithdrawal = async () => {
    if ((profile.wallet_balance || 0) < 50000) {
      onNotify({
        title: 'Saldo admin terlalu kecil',
        description: 'Minimal Rp 50.000 diperlukan untuk menarik fee platform.',
        variant: 'error'
      });
      return;
    }

    const confirmed = await onConfirm({
      title: 'Tarik fee platform sekarang?',
      description: `Saldo admin sebesar Rp ${(profile.wallet_balance || 0).toLocaleString('id-ID')} akan dipindahkan.`,
      confirmLabel: 'Tarik Dana'
    });

    if (!confirmed) return;

    try {
      await apiRequest('/api/admin/platform-withdrawal', { method: 'POST' });
      onNotify({
        title: 'Fee platform ditarik',
        description: 'Penarikan saldo admin berhasil diproses.',
        variant: 'success'
      });
      onRefresh();
    } catch (error) {
      onNotify({
        title: 'Penarikan admin gagal',
        description: error.message,
        variant: 'error'
      });
    }
  };

  const handleQueueApprove = async (entry) => {
    const confirmed = await onConfirm({
      title: 'Approve distribusi ini?',
      description: 'Sistem akan membuat DDEX ERN 4.1 dan meneruskan release ke platform tujuan.',
      confirmLabel: 'Approve & Generate DDEX'
    });

    if (!confirmed) return;

    try {
      await apiRequest(`/api/admin/delivery-queue/${entry.id}/approve`, { method: 'POST' });
      onNotify({
        title: 'Distribusi disetujui',
        description: 'DDEX ERN 4.1 berhasil dibuat dan pengiriman dimulai.',
        variant: 'success'
      });
      onRefresh();
    } catch (error) {
      onNotify({
        title: 'Approve distribusi gagal',
        description: error.message,
        variant: 'error'
      });
    }
  };

  const handleQueueReject = async (entry) => {
    const reason = await onPrompt({
      title: 'Alasan penolakan',
      description: 'Isi alasan opsional agar artist menerima konteks yang jelas.',
      placeholder: 'Mis. metadata belum lengkap'
    });

    if (reason === null) return;

    try {
      await apiRequest(`/api/admin/delivery-queue/${entry.id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason })
      });
      onNotify({
        title: 'Distribusi ditolak',
        description: 'Entry queue sudah dipindahkan ke status rejected.',
        variant: 'info'
      });
      onRefresh();
    } catch (error) {
      onNotify({
        title: 'Penolakan distribusi gagal',
        description: error.message,
        variant: 'error'
      });
    }
  };

  const handleConfirmLive = async (entry) => {
    const platformTrackId = await onPrompt({
      title: 'Masukkan Platform Track ID',
      description: 'Opsional. Biarkan kosong jika ID dari DSP belum tersedia.',
      placeholder: 'spotify:track:...'
    });

    if (platformTrackId === null) return;

    try {
      await apiRequest('/api/admin/distribution/confirm-live', {
        method: 'POST',
        body: JSON.stringify({
          releaseId: entry.release_id,
          platform: (entry.platforms || ['spotify'])[0],
          platformTrackId
        })
      });
      onNotify({
        title: 'Track dikonfirmasi live',
        description: 'Status distribusi berhasil diperbarui menjadi live.',
        variant: 'success'
      });
      onRefresh();
    } catch (error) {
      onNotify({
        title: 'Konfirmasi live gagal',
        description: error.message,
        variant: 'error'
      });
    }
  };

  const handleRoyaltySubmit = async (event) => {
    event.preventDefault();
    setSubmittingRoyalty(true);

    try {
      const formData = new FormData(event.currentTarget);
      await apiRequest('/api/admin/royalties/input', {
        method: 'POST',
        body: JSON.stringify({
          releaseId: formData.get('releaseId'),
          platform: formData.get('platform'),
          streams: Number.parseInt(formData.get('streams') || '0', 10),
          revenueUSD: Number.parseFloat(formData.get('revenueUSD')),
          reportDate: formData.get('reportDate')
        })
      });

      event.currentTarget.reset();
      onNotify({
        title: 'Royalti dikreditkan',
        description: 'Wallet artist berhasil diperbarui dari laporan DSP.',
        variant: 'success'
      });
      onRefresh();
    } catch (error) {
      onNotify({
        title: 'Input royalti gagal',
        description: error.message,
        variant: 'error'
      });
    } finally {
      setSubmittingRoyalty(false);
    }
  };

  const handleEventSubmit = async (event) => {
    event.preventDefault();
    setSubmittingEvent(true);

    try {
      const path = editingEventId ? `/api/admin/events/${editingEventId}` : '/api/admin/events';
      const method = editingEventId ? 'PATCH' : 'POST';

      await apiRequest(path, {
        method,
        body: JSON.stringify(eventForm)
      });

      onNotify({
        title: editingEventId ? 'Event diperbarui' : 'Event diterbitkan',
        description: editingEventId
          ? 'Perubahan event berhasil disimpan.'
          : 'Event baru sekarang tampil di landing page.',
        variant: 'success'
      });

      resetEventForm();
      onRefresh();
    } catch (error) {
      onNotify({
        title: 'Gagal menyimpan event',
        description: error.message,
        variant: 'error'
      });
    } finally {
      setSubmittingEvent(false);
    }
  };

  const handleDeleteEvent = async (eventItem) => {
    const confirmed = await onConfirm({
      title: 'Hapus event ini?',
      description: `"${eventItem.title}" akan dihapus dari landing page dan daftar admin.`,
      confirmLabel: 'Hapus Event',
      danger: true
    });

    if (!confirmed) return;

    try {
      await apiRequest(`/api/admin/events/${eventItem.id}`, { method: 'DELETE' });
      onNotify({
        title: 'Event dihapus',
        description: 'Event berhasil dihapus dari sistem.',
        variant: 'success'
      });

      if (editingEventId === eventItem.id) {
        resetEventForm();
      }

      onRefresh();
    } catch (error) {
      onNotify({
        title: 'Gagal menghapus event',
        description: error.message,
        variant: 'error'
      });
    }
  };

  if (activeTab === 'admin') {
    const stats = [
      { label: 'Total Artists', value: users.filter((user) => user.role === 'artist').length, icon: Globe, color: 'text-blue-500' },
      { label: 'Active Releases', value: releases.length, icon: Music, color: 'text-purple-500' },
      { label: 'Platform Balance', value: `Rp ${Number(profile.wallet_balance || 0).toLocaleString('id-ID')}`, icon: DollarSign, color: 'text-green-500' },
      { label: 'Pending Payouts', value: transactions.filter((tx) => tx.type === 'withdrawal' && tx.status === 'pending').length, icon: Activity, color: 'text-orange-500' }
    ];

    return (
      <div className="space-y-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black tracking-tighter">Command Center</h1>
            <p className="mt-1 text-xs font-bold uppercase tracking-widest text-gray-500">
              Platform Wide Oversight
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 animate-pulse rounded-full bg-green-500" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">System Healthy</span>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-4">
          {stats.map((stat) => (
            <AdminStatCard key={stat.label} stat={stat} />
          ))}
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="rounded-[3rem] border border-white/[0.05] bg-gradient-to-br from-blue-900/20 to-transparent p-10">
            <div className="mb-8 flex items-center justify-between">
              <h3 className="text-xl font-bold">Recent Platform Activity</h3>
            </div>

            <div className="space-y-4">
              {transactions.slice(0, 5).map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between rounded-2xl border border-white/[0.02] bg-white/[0.02] p-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                    <p className="text-xs">{transaction.type?.toUpperCase()} - User {transaction.user_id?.slice(0, 8)}</p>
                  </div>
                  <p className="text-xs font-bold font-mono">Rp {Number(transaction.amount || 0).toLocaleString('id-ID')}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[3rem] border border-white/[0.05] bg-white/[0.02] p-10">
            <h3 className="mb-6 text-xl font-bold">Event Snapshot</h3>
            <div className="space-y-4">
              {events.slice(0, 4).map((eventItem) => (
                <div key={eventItem.id} className="rounded-2xl border border-white/[0.05] bg-black/20 p-4">
                  <div className="mb-2 flex items-center justify-between gap-4">
                    <h4 className="font-bold text-white">{eventItem.title}</h4>
                    <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-1 text-[9px] font-bold uppercase text-blue-300">
                      {eventItem.status}
                    </span>
                  </div>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-gray-500">
                    {eventItem.date} · {eventItem.venue}
                  </p>
                </div>
              ))}
              {events.length === 0 && (
                <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-gray-500">
                  Belum ada event yang dibuat.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'users') {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-black tracking-tighter">Artist Management</h2>
          <div className="rounded-xl bg-white/5 px-4 py-2 text-xs font-bold text-gray-400">
            {users.length} Users Found
          </div>
        </div>

        <div className="overflow-hidden rounded-[3rem] border border-white/[0.05] bg-white/[0.02]">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/[0.05] text-[10px] font-bold uppercase text-gray-500">
                <th className="p-6">Artist / Email</th>
                <th className="p-6">Status</th>
                <th className="p-6">Wallet</th>
                <th className="p-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {users.map((user) => (
                <tr key={user.id} className="border-b border-white/[0.01] transition-colors hover:bg-white/[0.02]">
                  <td className="p-6">
                    <div className="font-bold">{user.full_name || 'Incognito Artist'}</div>
                    <div className="text-[10px] italic text-gray-500">{user.email || 'no-email@link.com'}</div>
                  </td>
                  <td className="p-6">
                    <span className={`rounded-md px-2 py-1 text-[9px] font-bold uppercase ${
                      user.subscription_tier === 'pro'
                        ? 'bg-blue-500/10 text-blue-400'
                        : 'bg-white/5 text-gray-500'
                    }`}>
                      {user.subscription_tier === 'pro' ? 'PRO' : String(user.subscription_tier || 'inactive').toUpperCase()}
                    </span>
                    {user.role === 'admin' && (
                      <span className="ml-2 rounded-md bg-purple-500/10 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-purple-400">
                        ADMIN
                      </span>
                    )}
                  </td>
                  <td className="p-6 font-mono font-bold text-green-400">
                    Rp {Number(user.wallet_balance || 0).toLocaleString('id-ID')}
                  </td>
                  <td className="p-6 text-right">
                    <button
                      type="button"
                      onClick={() => onManageUser(user)}
                      className="ml-auto flex items-center gap-2 text-[10px] font-bold uppercase text-blue-400 transition-colors hover:text-white"
                    >
                      <Settings size={12} />
                      Manage Access
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (activeTab === 'releases') {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-black tracking-tighter">Global Pipeline</h2>
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-yellow-400" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
              {releases.filter((release) => release.status === 'pending').length} Pending Review
            </span>
          </div>
        </div>

        <div className="grid gap-4">
          {releases.length === 0 ? (
            <div className="rounded-[3rem] border border-dashed border-white/10 p-16 text-center">
              <Music className="mx-auto mb-4 text-gray-700" size={40} />
              <p className="text-sm text-gray-500">Belum ada release dari artis manapun.</p>
            </div>
          ) : (
            releases.map((release) => (
              <div
                key={release.id}
                className="flex flex-col items-center gap-6 rounded-[2rem] border border-white/[0.05] bg-white/[0.02] p-6 md:flex-row"
              >
                <div className="relative h-20 w-20 shrink-0">
                  <img
                    src={release.cover_url}
                    alt={release.title}
                    className="h-full w-full rounded-2xl object-cover shadow-lg"
                  />
                  {release.audio_url && (
                    <button
                      type="button"
                      onClick={() => onTogglePlayback(release.id)}
                      className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/40"
                    >
                      {playingTrackId === release.id ? (
                        <Pause className="fill-current text-white" />
                      ) : (
                        <Play className="fill-current text-white" />
                      )}
                    </button>
                  )}
                  {playingTrackId === release.id && release.audio_url && (
                    <audio autoPlay src={release.audio_url} onEnded={onStopPlayback} className="hidden" />
                  )}
                </div>

                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <strong className="block text-lg font-bold">{release.title}</strong>
                  </div>
                  <div className="space-y-1 text-[10px] font-mono uppercase tracking-widest text-gray-500">
                    <div>Artist ID: {release.user_id?.slice(0, 8)}... · Genre: {release.genre}</div>
                    {release.isrc && <div className="text-blue-400">ISRC: {release.isrc} · UPC: {release.upc}</div>}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {release.status === 'released' ? (
                    <div className="rounded-xl border border-green-500/20 bg-green-500/10 px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-green-500">
                      Live in Stores
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => handleReleaseAction(release, 'approve')}
                        className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-[10px] font-bold transition-all hover:bg-blue-500"
                      >
                        <Check size={14} />
                        Approve & Release
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReleaseAction(release, 'reject')}
                        className="rounded-xl bg-red-500/10 px-6 py-3 text-[10px] font-bold uppercase text-red-400 transition-all hover:bg-red-500/20"
                      >
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  if (activeTab === 'queue') {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-black tracking-tighter">Delivery Queue</h2>
            <p className="mt-1 text-xs font-bold uppercase tracking-widest text-gray-500">
              Multi-platform DDEX review and dispatch
            </p>
          </div>
        </div>

        {deliveryQueue.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-white/10 p-14 text-center text-sm text-gray-500">
            Belum ada antrian distribusi saat ini.
          </div>
        ) : (
          <div className="space-y-4">
            {deliveryQueue.map((entry) => (
              <div key={entry.id} className="rounded-[2rem] border border-white/[0.05] bg-white/[0.02] p-6">
                <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
                  <div className="flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-3">
                      <h4 className="font-bold text-white">{entry.releases?.title || 'Unknown Track'}</h4>
                      <QueueStatusBadge status={entry.status} />
                    </div>
                    <div className="space-y-1 text-[10px] font-mono text-gray-500">
                      <div>
                        ISRC: <span className="text-blue-400">{entry.releases?.isrc || entry.isrc}</span> · UPC:{' '}
                        <span className="text-blue-400">{entry.releases?.upc || entry.upc}</span>
                      </div>
                      <div>
                        Platforms: <span className="font-bold text-purple-400">{(entry.platforms || []).join(', ')}</span>
                      </div>
                      <div>
                        Artist:{' '}
                        <span className="text-white">
                          {entry.profiles?.artist_stage_name || entry.profiles?.full_name || 'Unknown'}
                        </span>
                      </div>
                      <div>
                        Submitted:{' '}
                        {new Date(entry.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </div>
                      {entry.rejection_reason && <div className="text-red-400">Alasan ditolak: {entry.rejection_reason}</div>}
                    </div>
                  </div>

                  {entry.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleQueueApprove(entry)}
                        className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-[10px] font-bold transition-all hover:bg-blue-500"
                      >
                        <Check size={13} />
                        Approve & Generate DDEX
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQueueReject(entry)}
                        className="rounded-xl bg-red-500/10 px-5 py-2.5 text-[10px] font-bold uppercase text-red-400 transition-all hover:bg-red-500/20"
                      >
                        Tolak
                      </button>
                    </div>
                  )}

                  {entry.status === 'approved' && (
                    <button
                      type="button"
                      onClick={() => handleConfirmLive(entry)}
                      className="rounded-xl border border-green-500/30 bg-green-600/20 px-5 py-2.5 text-[10px] font-bold text-green-400 transition-all hover:bg-green-600/30"
                    >
                      Konfirmasi Live
                    </button>
                  )}

                  {(entry.status === 'live' || entry.status === 'processing') && (
                    <div className="flex flex-col gap-1 text-right">
                      {entry.approved_at && (
                        <p className="text-[10px] text-gray-500">
                          Approved: {new Date(entry.approved_at).toLocaleDateString('id-ID')}
                        </p>
                      )}
                      {entry.live_at && (
                        <p className="text-[10px] font-bold text-green-400">
                          Live: {new Date(entry.live_at).toLocaleDateString('id-ID')}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="rounded-[2rem] border border-white/[0.05] bg-white/[0.02] p-8">
          <h3 className="mb-6 flex items-center gap-2 text-lg font-bold">
            <DollarSign className="text-green-500" size={20} />
            Input Royalti dari DSP
          </h3>

          <form onSubmit={handleRoyaltySubmit} className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-gray-500">Release ID</label>
              <select name="releaseId" required className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm outline-none focus:border-blue-500">
                <option value="">-- Pilih Release --</option>
                {releases
                  .filter((release) => ['distributed', 'live', 'processing'].includes(release.spotify_status))
                  .map((release) => (
                    <option key={release.id} value={release.id}>
                      {release.title} ({release.isrc})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-gray-500">Platform</label>
              <select name="platform" required className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm outline-none focus:border-blue-500">
                {['spotify', 'apple_music', 'youtube_music', 'tidal', 'amazon_music', 'deezer', 'joox', 'resso'].map((platform) => (
                  <option key={platform} value={platform}>
                    {platform.replace('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-gray-500">Jumlah Streams</label>
              <input type="number" name="streams" min="0" className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm outline-none focus:border-blue-500" placeholder="e.g. 10000" />
            </div>

            <div>
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-gray-500">Revenue (USD)</label>
              <input type="number" name="revenueUSD" min="0" step="0.01" required className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm outline-none focus:border-blue-500" placeholder="e.g. 12.50" />
            </div>

            <div>
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-gray-500">Tanggal Laporan</label>
              <input type="date" name="reportDate" required className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm outline-none focus:border-blue-500" />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={submittingRoyalty}
                className="w-full rounded-xl bg-green-600 py-3 text-sm font-bold text-white transition-all hover:bg-green-500 disabled:opacity-60"
              >
                {submittingRoyalty ? 'Menyimpan...' : 'Input Royalti → Kredit Wallet Artist'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (activeTab === 'ledger') {
    const pendingWithdrawals = transactions.filter((transaction) => transaction.type === 'withdrawal' && transaction.status === 'pending');

    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-black tracking-tighter">Financial Oversight</h2>
          <button
            type="button"
            onClick={handleAdminWithdrawal}
            className="rounded-xl bg-green-600 px-8 py-3 text-xs font-bold text-white transition-all shadow-lg shadow-green-900/20 hover:bg-green-500"
          >
            Withdraw Platform Fees
          </button>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-6">
            <h3 className="flex items-center gap-2 text-xl font-bold">
              <ArrowRightCircle className="text-blue-400" />
              Pending Withdrawals
            </h3>
            <div className="space-y-4">
              {pendingWithdrawals.length === 0 ? (
                <div className="rounded-[2rem] border border-white/[0.05] bg-white/[0.02] p-12 text-center text-sm text-gray-600">
                  No pending requests
                </div>
              ) : (
                pendingWithdrawals.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between rounded-3xl border border-white/[0.05] bg-white/[0.02] p-6"
                  >
                    <div>
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                        User: {transaction.user_id?.slice(0, 8)}...
                      </p>
                      <h4 className="text-xl font-black">Rp {Number(transaction.amount || 0).toLocaleString('id-ID')}</h4>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleWithdrawalAction(transaction, 'approve')}
                        className="rounded-lg bg-green-600/10 px-4 py-2 text-[10px] font-bold uppercase text-green-500 hover:bg-green-600/20"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => handleWithdrawalAction(transaction, 'reject')}
                        className="rounded-lg bg-red-600/10 px-4 py-2 text-[10px] font-bold uppercase text-red-500 hover:bg-red-600/20"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="flex items-center gap-2 text-xl font-bold">
              <Sparkles className="text-blue-400" />
              Platform Revenue
            </h3>
            <div className="relative overflow-hidden rounded-[3rem] border border-white/[0.05] bg-[#12161D] p-10">
              <DollarSign className="absolute -right-10 -top-10 text-white/5" size={200} />
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-gray-500">Available to Withdraw</p>
              <h2 className="mb-8 text-5xl font-black tracking-tighter text-white">
                Rp {Number(profile.wallet_balance || 0).toLocaleString('id-ID')}
              </h2>
              <div className="rounded-2xl border border-white/5 bg-white/5 p-4 text-[10px] uppercase tracking-widest text-gray-400">
                Accumulated fees from artist release payouts. Withdraw them safely through the admin channel.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tighter">Venue & Event Management</h2>
          <p className="mt-1 text-xs font-bold uppercase tracking-widest text-gray-500">
            Create, edit, and remove landing page events
          </p>
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-3xl border border-white/[0.05] bg-white/[0.02] p-6">
          <div className="mb-6 flex items-center justify-between gap-4">
            <h3 className="flex items-center gap-2 font-bold">
              <Calendar size={20} className="text-blue-500" />
              {editingEventId ? 'Edit Event' : 'Create New Event'}
            </h3>
            {editingEventId && (
              <button
                type="button"
                onClick={resetEventForm}
                className="rounded-xl bg-white/5 px-4 py-2 text-[10px] font-bold uppercase text-gray-400 transition-colors hover:text-white"
              >
                Batal Edit
              </button>
            )}
          </div>

          <form onSubmit={handleEventSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase text-gray-500">Event Title</label>
                <input value={eventForm.title} onChange={(event) => setEventForm({ ...eventForm, title: event.target.value })} required className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm" placeholder="e.g. Midnight Madness" />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase text-gray-500">Venue</label>
                <input value={eventForm.venue} onChange={(event) => setEventForm({ ...eventForm, venue: event.target.value })} required className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm" placeholder="e.g. Soedirman Bistro" />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase text-gray-500">Date</label>
                <input value={eventForm.date} onChange={(event) => setEventForm({ ...eventForm, date: event.target.value })} required className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm" placeholder="e.g. FRIDAY, 10 PM" />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase text-gray-500">Price</label>
                <input value={eventForm.price} onChange={(event) => setEventForm({ ...eventForm, price: event.target.value })} required className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm" placeholder="e.g. FDC 150K" />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-[10px] font-bold uppercase text-gray-500">Image URL (optional)</label>
                <input value={eventForm.image} onChange={(event) => setEventForm({ ...eventForm, image: event.target.value })} className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm" placeholder="https://..." />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-[10px] font-bold uppercase text-gray-500">Description</label>
                <textarea value={eventForm.description} onChange={(event) => setEventForm({ ...eventForm, description: event.target.value })} required className="h-24 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm" placeholder="Event description..." />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase text-gray-500">Lineup (comma separated)</label>
                <input value={eventForm.lineup} onChange={(event) => setEventForm({ ...eventForm, lineup: event.target.value })} required className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm" placeholder="DJ Ndrow, DJ Vortex" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase text-gray-500">Status</label>
                  <input value={eventForm.status} onChange={(event) => setEventForm({ ...eventForm, status: event.target.value })} className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase text-gray-500">Badge Color Class</label>
                  <input value={eventForm.color} onChange={(event) => setEventForm({ ...eventForm, color: event.target.value })} className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm" />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={submittingEvent}
              className="mt-4 w-full rounded-xl bg-blue-600 py-3 font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-500 disabled:opacity-60"
            >
              {submittingEvent ? 'Menyimpan...' : editingEventId ? 'Simpan Perubahan Event' : 'Publish Event'}
            </button>
          </form>
        </div>

        <div className="space-y-4">
          {events.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-white/10 p-12 text-center text-sm text-gray-500">
              Belum ada event. Buat event pertama dari panel kiri.
            </div>
          ) : (
            events.map((eventItem) => (
              <div key={eventItem.id} className="overflow-hidden rounded-[2rem] border border-white/[0.05] bg-white/[0.02]">
                <div className="flex flex-col gap-5 p-5 md:flex-row">
                  <img
                    src={eventItem.image || '/hero-bg.png'}
                    alt={eventItem.title}
                    className="h-32 w-full rounded-2xl object-cover md:w-44"
                  />

                  <div className="flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-3">
                      <h4 className="text-xl font-black">{eventItem.title}</h4>
                      <span className={`rounded-full px-3 py-1 text-[9px] font-bold uppercase text-white ${eventItem.color || 'bg-blue-500'}`}>
                        {eventItem.status}
                      </span>
                    </div>
                    <p className="text-[10px] font-mono uppercase tracking-widest text-gray-500">
                      {eventItem.date} · {eventItem.venue} · {eventItem.price}
                    </p>
                    <p className="mt-3 text-sm leading-relaxed text-gray-400">{eventItem.description}</p>
                    <p className="mt-3 text-[10px] font-bold uppercase tracking-widest text-blue-300">
                      Lineup: {(eventItem.lineup || []).join(', ')}
                    </p>
                  </div>

                  <div className="flex flex-row gap-2 md:flex-col">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingEventId(eventItem.id);
                        setEventForm(mapEventToForm(eventItem));
                      }}
                      className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-[10px] font-bold uppercase text-blue-300 transition-all hover:bg-blue-500 hover:text-white"
                    >
                      Edit
                      </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteEvent(eventItem)}
                      className="flex items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-[10px] font-bold uppercase text-red-300 transition-all hover:bg-red-500/20"
                    >
                      <Trash2 size={12} />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
