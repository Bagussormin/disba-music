import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ChevronLeft,
  Copy,
  Disc3,
  ExternalLink,
  Pause,
  Play,
  Share2
} from 'lucide-react';
import { buildPlatformSearchUrl } from '../utils/shareLinks';

const PLATFORM_LINKS = [
  { id: 'spotify', label: 'Spotify', accent: 'text-[#1DB954] border-[#1DB954]/30 bg-[#1DB954]/10' },
  { id: 'apple', label: 'Apple Music', accent: 'text-[#FA243C] border-[#FA243C]/30 bg-[#FA243C]/10' },
  { id: 'youtube', label: 'YouTube Music', accent: 'text-[#FF0000] border-[#FF0000]/30 bg-[#FF0000]/10' }
];

function formatDate(dateString) {
  if (!dateString) return 'Unknown';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

export default function PublicReleasePage({ apiUrl, onNotify }) {
  const { releaseId } = useParams();
  const [release, setRelease] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();

    const loadRelease = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await fetch(`${apiUrl}/api/public/releases/${releaseId}`, {
          signal: controller.signal
        });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload.error || 'Release tidak ditemukan.');
        }

        setRelease(payload.release || null);
      } catch (fetchError) {
        if (fetchError.name === 'AbortError') return;
        setError(fetchError.message || 'Gagal memuat halaman share.');
      } finally {
        setLoading(false);
      }
    };

    loadRelease();

    return () => controller.abort();
  }, [apiUrl, releaseId]);

  const togglePlayback = async () => {
    if (!audioRef.current || !release?.audio_url) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    try {
      await audioRef.current.play();
      setIsPlaying(true);
    } catch {
      onNotify?.({
        title: 'Preview tidak bisa diputar',
        description: 'Browser menolak autoplay untuk release ini.',
        variant: 'error'
      });
    }
  };

  const handleShare = async () => {
    if (!release) return;

    try {
      if (navigator.share) {
        await navigator.share({
          title: `${release.title} - ${release.artistName}`,
          text: `Listen to ${release.title} by ${release.artistName} on Disba Music.`,
          url: window.location.href
        });
        return;
      }

      await navigator.clipboard.writeText(window.location.href);
      onNotify?.({
        title: 'Link disalin',
        description: 'URL share page sudah siap dibagikan.',
        variant: 'success'
      });
    } catch (shareError) {
      if (shareError?.name === 'AbortError') return;
      onNotify?.({
        title: 'Gagal membagikan link',
        description: 'Coba lagi dari browser lain atau salin link secara manual.',
        variant: 'error'
      });
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      onNotify?.({
        title: 'Link disalin',
        description: 'Share URL berhasil masuk ke clipboard.',
        variant: 'success'
      });
    } catch {
      onNotify?.({
        title: 'Gagal menyalin link',
        description: 'Browser tidak mengizinkan clipboard saat ini.',
        variant: 'error'
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07090E] px-6 py-16 text-white">
        <div className="mx-auto max-w-5xl animate-pulse space-y-6">
          <div className="h-8 w-36 rounded-full bg-white/10" />
          <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="aspect-square rounded-[3rem] bg-white/10" />
            <div className="space-y-5">
              <div className="h-5 w-28 rounded-full bg-white/10" />
              <div className="h-16 w-3/4 rounded-3xl bg-white/10" />
              <div className="h-6 w-1/2 rounded-2xl bg-white/10" />
              <div className="h-40 rounded-[2rem] bg-white/10" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !release) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#07090E] px-6 text-white">
        <div className="w-full max-w-xl rounded-[2.5rem] border border-white/10 bg-white/[0.02] p-10 text-center">
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-blue-400">Share Page</p>
          <h1 className="mt-4 text-4xl font-black tracking-tight">Release tidak tersedia</h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-gray-400">
            {error || 'Track ini belum tersedia secara publik atau sudah tidak aktif.'}
          </p>
          <Link
            to="/"
            className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-white/10"
          >
            <ChevronLeft size={16} />
            Kembali ke Disba
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07090E] px-6 py-10 text-white selection:bg-blue-500/30">
      <div className="mx-auto max-w-6xl">
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-bold text-gray-300 transition-all hover:bg-white/10 hover:text-white"
        >
          <ChevronLeft size={16} />
          Back to Disba
        </Link>

        <div className="overflow-hidden rounded-[3rem] border border-white/10 bg-white/[0.02] shadow-2xl">
          <div className="grid gap-10 p-6 lg:grid-cols-[0.95fr_1.05fr] lg:p-10">
            <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10">
              <img
                src={release.cover_url}
                alt={release.title}
                className="aspect-square h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
              <button
                type="button"
                onClick={togglePlayback}
                className="absolute bottom-6 left-6 flex items-center gap-3 rounded-full bg-black/60 px-5 py-3 text-sm font-bold backdrop-blur-md transition-all hover:bg-black/80"
              >
                {isPlaying ? <Pause size={18} /> : <Play size={18} fill="currentColor" />}
                {isPlaying ? 'Pause Preview' : 'Play Preview'}
              </button>
              <audio
                ref={audioRef}
                src={release.audio_url}
                onEnded={() => setIsPlaying(false)}
                className="hidden"
              />
            </div>

            <div className="flex flex-col justify-center space-y-8">
              <div className="space-y-4">
                <p className="text-[11px] font-black uppercase tracking-[0.3em] text-blue-400">
                  Disba Smart Link
                </p>
                <h1 className="text-5xl font-black uppercase leading-none tracking-tight md:text-6xl">
                  {release.title}
                </h1>
                <p className="text-lg font-bold uppercase tracking-[0.2em] text-gray-400">
                  {release.artistName}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[2rem] border border-white/10 bg-black/30 p-5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Genre</p>
                  <p className="mt-2 text-lg font-black">{release.genre || 'Unspecified'}</p>
                </div>
                <div className="rounded-[2rem] border border-white/10 bg-black/30 p-5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Published</p>
                  <p className="mt-2 text-lg font-black">{formatDate(release.created_at)}</p>
                </div>
                <div className="rounded-[2rem] border border-white/10 bg-black/30 p-5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">ISRC</p>
                  <p className="mt-2 text-lg font-black">{release.isrc || '-'}</p>
                </div>
                <div className="rounded-[2rem] border border-white/10 bg-black/30 p-5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">UPC</p>
                  <p className="mt-2 text-lg font-black">{release.upc || '-'}</p>
                </div>
              </div>

              <div className="space-y-3">
                {PLATFORM_LINKS.map((platform) => (
                  <a
                    key={platform.id}
                    href={buildPlatformSearchUrl(release, platform.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between rounded-[1.75rem] border border-white/10 bg-white/5 px-5 py-4 transition-all hover:bg-white/10"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${platform.accent}`}>
                        {platform.label}
                      </div>
                      <span className="text-sm font-bold text-gray-200">Open search result</span>
                    </div>
                    <ExternalLink size={16} className="text-gray-500" />
                  </a>
                ))}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={handleShare}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-sm font-black uppercase tracking-widest text-white transition-all hover:bg-blue-500"
                >
                  <Share2 size={16} />
                  Share Link
                </button>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-bold text-gray-200 transition-all hover:bg-white/10"
                >
                  <Copy size={16} />
                  Copy URL
                </button>
                {release.audio_url && (
                  <a
                    href={release.audio_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-bold text-gray-200 transition-all hover:bg-white/10"
                  >
                    <Disc3 size={16} />
                    Open Source Audio
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
