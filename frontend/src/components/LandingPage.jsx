import { useEffect, useRef, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Calendar,
  Disc3,
  Flame,
  Instagram,
  Mail,
  MapPin,
  MessageCircle,
  Music,
  Play,
  Share2,
  Ticket,
  TrendingUp,
  Users,
  Volume2,
  X
} from 'lucide-react';
import logo from '../assets/logo-disba.png';
import heroBg from '../assets/hero-bg.png';
import dj1 from '../assets/dj-1.png';
import dj2 from '../assets/dj-2.png';
import event1 from '../assets/event-1.png';

const SOCIAL_LINKS = {
  instagram: 'https://instagram.com/arifianto_29',
  email: 'mailto:disbamusic.official@gmail.com',
  whatsapp: 'https://wa.me/6282164187865'
};

const mapTrack = (track) => {
  if (typeof track === 'string') {
    return {
      title: track,
      audioUrl: null,
      coverUrl: null,
      releaseStatus: null
    };
  }

  return {
    title: track.title,
    audioUrl: track.audio_url || null,
    coverUrl: track.cover_url || null,
    releaseStatus: track.release_status || null
  };
};

const mapDJ = (dj) => ({
  id: dj.id,
  name: dj.name,
  stageName: dj.stage_name,
  rank: dj.rank,
  plays: dj.plays,
  likes: dj.likes,
  image: dj.image || (dj.id % 2 === 0 ? dj2 : dj1),
  badge: dj.badge,
  genre: dj.genre,
  location: dj.location,
  bio: dj.bio,
  recentTracks: (dj.recent_tracks || []).map(mapTrack),
  upcoming: dj.upcoming
});

const mapEvent = (event) => ({
  id: event.id,
  title: event.title,
  venue: event.venue,
  date: event.date,
  image: event.image || event1,
  status: event.status,
  color: event.color || 'bg-blue-500',
  lineup: event.lineup || [],
  description: event.description,
  price: event.price
});

function formatFanCount(likes) {
  if (!likes) return '0k';
  const numeric = Number.parseFloat(String(likes).replace('k', ''));
  if (!Number.isFinite(numeric)) return '0k';
  return `${(numeric * 1.5).toFixed(1)}k`;
}

export default function LandingPage({
  onLogin,
  onGoogleLogin,
  setShowLogin,
  showLogin,
  adminClickCount,
  onAdminClick,
  apiUrl,
  onNotify
}) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [currentView, setCurrentView] = useState('home');
  const [selectedDJ, setSelectedDJ] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [nowPlaying, setNowPlaying] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [djs, setDjs] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const audioRef = useRef(null);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await fetch(`${apiUrl}/api/landing`);
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload.error || 'Gagal memuat landing content.');
        }

        setDjs((payload.djs || []).map(mapDJ));
        setEvents((payload.events || []).map(mapEvent));
      } catch (error) {
        console.error('Error fetching landing content:', error);
        onNotify?.({
          title: 'Landing content belum tersedia',
          description: 'Data publik gagal dimuat. Coba refresh halaman sebentar lagi.',
          variant: 'error'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchContent();

    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [apiUrl, onNotify]);

  useEffect(() => {
    if (!nowPlaying || !audioRef.current) return;

    audioRef.current.src = nowPlaying.url;
    audioRef.current
      .play()
      .then(() => setIsPlaying(true))
      .catch(() => {
        setIsPlaying(false);
        onNotify?.({
          title: 'Autoplay diblokir',
          description: 'Tekan tombol play untuk memulai preview audio.',
          variant: 'info'
        });
      });
  }, [nowPlaying, onNotify]);

  const handleGoHome = () => {
    setCurrentView('home');
    setSelectedDJ(null);
    setSelectedEvent(null);
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const openDJProfile = (event, dj) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedDJ(dj);
    setCurrentView('dj-profile');
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const openEventDetail = (event, eventData) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedEvent(eventData);
    setCurrentView('event-detail');
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const handlePlayTrack = (event, track, artistName) => {
    event.preventDefault();
    event.stopPropagation();

    if (!track?.audioUrl) {
      onNotify?.({
        title: 'Preview belum tersedia',
        description: 'Track ini belum memiliki audio preview dari database.',
        variant: 'info'
      });
      return;
    }

    setNowPlaying({
      title: track.title,
      artist: artistName,
      url: track.audioUrl,
      coverUrl: track.coverUrl
    });
    setProgress(0);
  };

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    audioRef.current
      .play()
      .then(() => setIsPlaying(true))
      .catch(() => {
        onNotify?.({
          title: 'Gagal memutar audio',
          description: 'Browser menolak playback untuk saat ini.',
          variant: 'error'
        });
      });
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const current = audioRef.current.currentTime;
    const total = audioRef.current.duration;
    setProgress((current / total) * 100 || 0);
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setProgress(0);
  };

  const handleShare = async ({ title, text, url }) => {
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
        return;
      }

      await navigator.clipboard.writeText(url);
      onNotify?.({
        title: 'Link berhasil disalin',
        description: 'Tautan sudah siap untuk dibagikan.',
        variant: 'success'
      });
    } catch (error) {
      if (error?.name === 'AbortError') return;
      onNotify?.({
        title: 'Gagal membagikan tautan',
        description: 'Coba lagi atau gunakan browser yang mendukung Web Share.',
        variant: 'error'
      });
    }
  };

  const openTicketRequest = (eventData) => {
    const message = `Halo Disba Music, saya ingin info tiket untuk event ${eventData.title} di ${eventData.venue} (${eventData.date}).`;
    window.open(`https://wa.me/6282164187865?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  };

  const openPolicyRequest = (label) => {
    window.open(
      `mailto:disbamusic.official@gmail.com?subject=${encodeURIComponent(`Permintaan ${label} Disba Music`)}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const closePlayer = () => {
    setNowPlaying(null);
    setIsPlaying(false);
    setProgress(0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  const DJProfileView = ({ dj }) => (
    <div className="relative z-[10] animate-in fade-in pb-32 pt-32 duration-500">
      <div className="mx-auto max-w-7xl px-6">
        <button
          type="button"
          onClick={handleGoHome}
          className="group mb-12 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-gray-400 hover:text-white"
        >
          <ArrowLeft size={18} className="transition-transform group-hover:-translate-x-1" />
          BACK TO CHARTS
        </button>

        <div className="grid items-start gap-16 lg:grid-cols-12">
          <div className="relative lg:col-span-5">
            <div className="group relative aspect-[4/5] overflow-hidden rounded-[3rem] border border-white/10 shadow-2xl">
              <img src={dj.image} alt={dj.stageName} className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

              <div className="absolute left-8 top-8 flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/20 bg-blue-600 text-2xl font-black shadow-xl">
                {dj.rank}
              </div>

              <div className="absolute right-8 top-8 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.2em]">
                {dj.badge}
              </div>
            </div>

            <div className="mt-8 flex gap-4">
              <button
                type="button"
                onClick={() => setShowLogin(true)}
                className="flex-1 rounded-2xl bg-white py-4 font-black uppercase tracking-widest text-black shadow-xl transition-all hover:bg-blue-500 hover:text-white"
              >
                FOLLOW
              </button>
              <button
                type="button"
                onClick={() => handleShare({
                  title: dj.stageName,
                  text: `Discover ${dj.stageName} on Disba Nightlife Movement.`,
                  url: `${window.location.origin}/#dj-${dj.id}`
                })}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 transition-all hover:bg-white/10"
              >
                <Share2 size={24} />
              </button>
            </div>
          </div>

          <div className="space-y-12 lg:col-span-7">
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm font-black uppercase tracking-widest text-blue-500">
                <Music size={18} />
                {dj.genre}
              </div>
              <h2 className="text-6xl font-black uppercase italic leading-none tracking-tighter md:text-8xl">{dj.stageName}</h2>
              <p className="text-xl font-bold uppercase tracking-widest text-gray-500 italic">
                {dj.name} • {dj.location}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-8">
              <div>
                <div className="mb-1 text-[10px] font-black uppercase tracking-widest text-gray-500">PLAYS</div>
                <div className="text-3xl font-black">{dj.plays}</div>
              </div>
              <div>
                <div className="mb-1 text-[10px] font-black uppercase tracking-widest text-gray-500">LIKES</div>
                <div className="text-3xl font-black">{dj.likes}</div>
              </div>
              <div>
                <div className="mb-1 text-[10px] font-black uppercase tracking-widest text-gray-500">FANS</div>
                <div className="text-3xl font-black">{formatFanCount(dj.likes)}</div>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="flex items-center gap-3 text-2xl font-black uppercase tracking-tight">
                <Activity size={24} className="text-blue-500" />
                BIO
              </h3>
              <p className="max-w-2xl text-xl leading-relaxed text-gray-400">{dj.bio}</p>
            </div>

            <div className="space-y-6">
              <h3 className="flex items-center gap-3 text-2xl font-black uppercase tracking-tight">
                <Volume2 size={24} className="text-blue-500" />
                RECENT TRACKS
              </h3>
              <div className="space-y-3">
                {dj.recentTracks.map((track, index) => (
                  <button
                    key={`${track.title}-${index}`}
                    type="button"
                    className="glass group flex w-full items-center justify-between rounded-2xl p-5 text-left transition-all hover:bg-white/5"
                    onClick={(event) => handlePlayTrack(event, track, dj.stageName)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600/10 text-blue-500 transition-all group-hover:bg-blue-500 group-hover:text-white">
                        <Play size={18} fill="currentColor" />
                      </div>
                      <span className="text-lg font-bold">{track.title}</span>
                    </div>
                    <span className="text-xs font-bold text-gray-500">
                      {track.audioUrl ? 'Preview Ready' : 'No Preview'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col items-center justify-between gap-6 rounded-[2rem] border border-blue-500/20 bg-blue-600/5 p-8 sm:flex-row">
              <div className="space-y-2 text-center sm:text-left">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500">UPCOMING APPEARANCE</div>
                <h4 className="text-2xl font-black uppercase">{dj.upcoming}</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowLogin(true)}
                className="rounded-full bg-blue-600 px-8 py-3 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-blue-600/20"
              >
                GET ACCESS
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const EventDetailView = ({ event }) => (
    <div className="relative z-[10] animate-in fade-in pb-32 pt-32 duration-500">
      <div className="mx-auto max-w-7xl px-6">
        <button
          type="button"
          onClick={handleGoHome}
          className="group mb-12 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-gray-400 hover:text-white"
        >
          <ArrowLeft size={18} className="transition-transform group-hover:-translate-x-1" />
          BACK TO EVENTS
        </button>

        <div className="grid items-center gap-16 lg:grid-cols-2">
          <div className="space-y-10">
            <div className="space-y-6">
              <div className={`inline-block rounded-full px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] shadow-lg ${event.color}`}>
                {event.status}
              </div>
              <h2 className="text-6xl font-black uppercase italic leading-none tracking-tighter md:text-8xl">{event.title}</h2>
              <div className="flex flex-wrap items-center gap-8 text-xl font-bold uppercase tracking-widest text-gray-400">
                <span className="flex items-center gap-2">
                  <Calendar size={24} className="text-blue-500" />
                  {event.date}
                </span>
                <span className="flex items-center gap-2">
                  <MapPin size={24} className="text-blue-500" />
                  {event.venue}
                </span>
              </div>
            </div>

            <p className="border-l-4 border-blue-500 pl-8 text-2xl italic leading-relaxed text-gray-300">
              "{event.description}"
            </p>

            <div className="space-y-6">
              <h3 className="text-xs font-black uppercase tracking-[0.3em] text-gray-500">THE LINEUP</h3>
              <div className="flex flex-wrap gap-4">
                {event.lineup.map((name, index) => (
                  <div key={`${name}-${index}`} className="glass cursor-default rounded-2xl px-6 py-3 text-lg font-black uppercase tracking-widest transition-all hover:border-blue-500">
                    {name}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-6 pt-4 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => openTicketRequest(event)}
                className="flex w-full flex-1 items-center justify-center gap-3 rounded-2xl bg-blue-600 px-12 py-5 text-xl font-black text-white shadow-xl shadow-blue-600/30 transition-all hover:bg-blue-500"
              >
                <Ticket size={24} />
                BUY TICKETS • {event.price}
              </button>
              <button
                type="button"
                onClick={() => handleShare({
                  title: event.title,
                  text: `Join ${event.title} at ${event.venue} on ${event.date}.`,
                  url: `${window.location.origin}/#event-${event.id}`
                })}
                className="w-full rounded-2xl border border-white/20 p-5 transition-all hover:border-white sm:w-auto"
              >
                <Share2 size={24} />
              </button>
            </div>
          </div>

          <div className="relative">
            <div className="group relative aspect-square rotate-3 overflow-hidden rounded-[4rem] border border-white/10 shadow-2xl transition-transform duration-700 hover:rotate-0">
              <img src={event.image} alt={event.title} className="h-full w-full object-cover opacity-80" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              <div className="absolute inset-0 bg-blue-600/20 mix-blend-overlay" />
            </div>

            <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-blue-500/20 blur-[60px]" />
            <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-cyan-500/20 blur-[60px]" />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#07090E] font-sans text-white selection:bg-blue-500/30">
      <div className="pointer-events-none fixed inset-0 z-0 noise" />
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute right-[-10%] top-[-10%] h-[600px] w-[600px] animate-pulse rounded-full bg-blue-600/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] h-[600px] w-[600px] animate-pulse rounded-full bg-cyan-600/10 blur-[120px]" style={{ animationDelay: '1s' }} />
      </div>

      <nav className={`fixed top-0 z-[100] w-full border-b transition-all duration-500 ${scrolled || currentView !== 'home' ? 'border-white/10 bg-[#07090E]/90 py-3 backdrop-blur-xl' : 'border-transparent bg-transparent py-5'}`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6">
          <button type="button" onClick={handleGoHome} className="group flex items-center gap-3">
            <img src={logo} alt="Disba Logo" className="h-10 w-auto transition-transform duration-500 group-hover:scale-110" />
            <h1 className="text-xl font-black italic tracking-tighter text-glow-blue">DISBA</h1>
          </button>

          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(false);
                setShowLogin(true);
              }}
              className="hidden text-sm font-bold uppercase tracking-[0.2em] text-gray-400 transition-colors hover:text-white sm:block"
            >
              Log in
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSignUp(true);
                setShowLogin(true);
              }}
              className="rounded-full bg-white px-8 py-2.5 text-sm font-black text-black shadow-lg transition-all duration-500 hover:bg-blue-500 hover:text-white hover:shadow-blue-500/40"
            >
              JOIN THE MOVEMENT
            </button>
          </div>
        </div>
      </nav>

      {currentView === 'home' && (
        <div className="relative z-10">
          <header className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 pt-20">
            <div className="absolute inset-0 z-0">
              <img src={heroBg} alt="Nightlife" className="h-full w-full animate-slow-spin-v-slow object-cover opacity-40 scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#07090E] via-[#07090E]/60 to-transparent" />
            </div>

            <div className="relative z-10 max-w-5xl space-y-12 text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-blue-400 animate-fade-in">
                <Flame size={14} className="animate-pulse" />
                Voted #1 Nightlife Platform
              </div>

              <h2 className="animate-slide-up py-4 text-5xl font-black uppercase italic leading-tight text-white md:text-[7rem]">
                Discover <br />
                <span className="bg-gradient-to-r from-blue-400 to-cyan-500 bg-clip-text text-transparent text-glow-blue">
                  Who Runs
                </span>
                <br />
                The Night.
              </h2>

              <p className="mx-auto max-w-2xl text-xl font-medium leading-relaxed text-gray-300 animate-fade-in-delayed md:text-2xl">
                Discover trending DJs, hottest events, and rising nightlife culture in your city.
              </p>

              <div className="flex flex-col items-center justify-center gap-6 pt-4 animate-fade-in-delayed sm:flex-row">
                <button
                  type="button"
                  onClick={() => document.getElementById('charts')?.scrollIntoView({ behavior: 'smooth' })}
                  className="group relative flex items-center gap-3 rounded-full bg-blue-600 px-12 py-5 text-xl font-black text-white transition-all duration-300 hover:scale-105 hover:bg-blue-500 hover:shadow-[0_0_40px_rgba(37,99,235,0.4)]"
                >
                  EXPLORE DJs
                  <ArrowRight size={24} className="transition-transform group-hover:translate-x-2" />
                </button>
                <button
                  type="button"
                  onClick={() => document.getElementById('events')?.scrollIntoView({ behavior: 'smooth' })}
                  className="rounded-full border-2 border-white/20 px-12 py-5 text-xl font-black transition-all duration-300 hover:border-white hover:bg-white/5"
                >
                  TRENDING THIS WEEK
                </button>
              </div>
            </div>
          </header>

          <section id="charts" className="relative z-[20] bg-nightlife py-32">
            <div className="mx-auto max-w-7xl px-6">
              <div className="mb-16 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-blue-500">
                    <TrendingUp size={18} />
                    Live Charts
                  </div>
                  <h3 className="text-5xl font-black uppercase italic tracking-tighter md:text-7xl">
                    Trending DJs <span className="text-gray-700">/ This Week</span>
                  </h3>
                </div>
              </div>

              <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-4">
                {loading
                  ? [...Array(4)].map((_, index) => (
                      <div key={index} className="h-[520px] animate-pulse rounded-[2.5rem] bg-white/5" />
                    ))
                  : djs.map((dj) => (
                      <button
                        key={dj.id}
                        type="button"
                        onClick={(event) => openDJProfile(event, dj)}
                        className="group overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/[0.02] text-left transition-all hover:-translate-y-2 hover:border-blue-500/40"
                      >
                        <div className="relative h-80 overflow-hidden">
                          <img src={dj.image} alt={dj.stageName} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                          <div className="absolute left-5 top-5 flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-lg font-black">
                            {dj.rank}
                          </div>
                          <div className="absolute right-5 top-5 rounded-full border border-white/20 bg-black/30 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em]">
                            {dj.badge}
                          </div>
                        </div>

                        <div className="space-y-6 p-8">
                          <div>
                            <p className="text-sm font-black uppercase tracking-[0.2em] text-blue-400">{dj.genre}</p>
                            <h4 className="mt-2 text-3xl font-black uppercase italic tracking-tight">{dj.stageName}</h4>
                            <p className="mt-2 text-xs font-bold uppercase tracking-widest text-gray-500">{dj.location}</p>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Plays</p>
                              <p className="text-xl font-black">{dj.plays}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Likes</p>
                              <p className="text-xl font-black">{dj.likes}</p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-widest text-gray-500">
                              {dj.recentTracks[0]?.audioUrl ? 'Preview Live' : 'Profile Only'}
                            </span>
                            <span className="text-sm font-black uppercase tracking-widest text-blue-400">
                              OPEN PROFILE
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
              </div>
            </div>
          </section>

          <section id="events" className="relative z-[20] py-32">
            <div className="mx-auto max-w-7xl px-6">
              <div className="mb-20 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-blue-500">
                    <Calendar size={18} />
                    Featured Events
                  </div>
                  <h3 className="text-5xl font-black uppercase italic tracking-tighter md:text-7xl">
                    Hot Events <span className="text-gray-700">/ Near You</span>
                  </h3>
                </div>
              </div>

              <div className="grid gap-8 lg:grid-cols-3">
                {loading
                  ? [...Array(3)].map((_, index) => (
                      <div key={index} className="h-[420px] animate-pulse rounded-[2.5rem] bg-white/5" />
                    ))
                  : events.map((eventData) => (
                      <div
                        key={eventData.id}
                        onClick={(event) => openEventDetail(event, eventData)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            openEventDetail(event, eventData);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        className="group overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/[0.02] text-left transition-all duration-300 hover:-translate-y-2"
                      >
                        <div className="relative h-64 overflow-hidden">
                          <img src={eventData.image} alt={eventData.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                          <div className="absolute inset-0 bg-black/40 transition-colors group-hover:bg-black/20" />
                          <div className={`absolute right-4 top-4 rounded-full px-4 py-1.5 text-[10px] font-black uppercase tracking-widest shadow-lg ${eventData.color}`}>
                            {eventData.status}
                          </div>
                        </div>

                        <div className="space-y-6 p-8">
                          <div className="flex items-start justify-between gap-4">
                            <h4 className="text-2xl font-black uppercase leading-tight tracking-tight">{eventData.title}</h4>
                            <div className="text-right">
                              <div className="text-lg font-black text-blue-500">{eventData.date}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-6 text-sm font-bold uppercase tracking-wider text-gray-400">
                            <span className="flex items-center gap-2">
                              <MapPin size={16} className="text-blue-500" />
                              {eventData.venue}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              openTicketRequest(eventData);
                            }}
                            className="w-full rounded-xl border border-white/10 py-4 text-sm font-black uppercase tracking-widest transition-all group-hover:bg-white group-hover:text-black"
                          >
                            GET TICKETS
                          </button>
                        </div>
                      </div>
                    ))}
              </div>
            </div>
          </section>

          <section className="relative z-[20] py-32">
            <div className="mx-auto max-w-7xl px-6">
              <div className="mb-20 space-y-4 text-center">
                <h3 className="text-5xl font-black uppercase italic tracking-tighter md:text-7xl">Trending Remixes</h3>
                <p className="text-xl font-medium italic text-gray-400">Database-powered previews. Hear the future of nightlife.</p>
              </div>

              <div className="mx-auto max-w-5xl space-y-6">
                {loading
                  ? [...Array(3)].map((_, index) => (
                      <div key={index} className="h-32 animate-pulse rounded-3xl bg-white/5" />
                    ))
                  : djs.map((dj) => (
                      <div key={dj.id} className="glass group flex flex-col items-center gap-8 rounded-3xl p-4 transition-all hover:bg-white/5 sm:flex-row sm:p-6">
                        <button
                          type="button"
                          className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-2xl"
                          onClick={(event) => handlePlayTrack(event, dj.recentTracks[0], dj.stageName)}
                        >
                          <img src={dj.image} alt={dj.stageName} className="h-full w-full object-cover" />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 transition-colors group-hover:bg-blue-600/60">
                            <Play fill="white" size={32} />
                          </div>
                        </button>

                        <button
                          type="button"
                          className="flex-1 space-y-2 text-center sm:text-left"
                          onClick={(event) => openDJProfile(event, dj)}
                        >
                          <h4 className="text-2xl font-black uppercase tracking-tight">{dj.recentTracks[0]?.title || 'Untitled Track'}</h4>
                          <p className="text-sm font-bold uppercase tracking-widest text-blue-400">{dj.stageName}</p>
                        </button>

                        <div className="hidden flex-[2] px-8 opacity-40 transition-opacity group-hover:opacity-100 lg:block">
                          <div className="flex h-12 items-center gap-1">
                            {[...Array(40)].map((_, index) => (
                              <div key={index} className="w-1 rounded-full bg-blue-500" style={{ height: `${20 + Math.random() * 80}%` }} />
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <div className="text-xs font-black uppercase text-gray-500">Plays</div>
                            <div className="text-xl font-black">{dj.plays}</div>
                          </div>
                          <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-blue-400">
                            {dj.recentTracks[0]?.audioUrl ? 'Hot Preview' : 'Hot Profile'}
                          </div>
                        </div>
                      </div>
                    ))}
              </div>
            </div>
          </section>

          <section className="relative z-[20] overflow-hidden py-32">
            <div className="absolute left-1/2 top-1/2 h-full w-full -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/5 blur-[150px]" />
            <div className="relative z-10 mx-auto max-w-7xl px-6">
              <div className="grid items-center gap-20 lg:grid-cols-2">
                <div className="space-y-8">
                  <h3 className="text-5xl font-black uppercase italic leading-[0.9] tracking-tighter md:text-7xl">
                    Why DJs <br />
                    <span className="text-blue-500">Dominate</span> <br />
                    With Disba
                  </h3>
                  <p className="max-w-lg text-xl leading-relaxed text-gray-400">
                    Stop being just another technical file. Start becoming the movement. We give you the tools to climb charts and get booked.
                  </p>
                  <div className="pt-4">
                    <button
                      type="button"
                      onClick={() => setShowLogin(true)}
                      className="rounded-full bg-white px-12 py-5 text-xl font-black text-black shadow-xl transition-all hover:bg-blue-500 hover:text-white hover:shadow-blue-500/30"
                    >
                      START YOUR CAREER
                    </button>
                  </div>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  {[
                    { title: 'Build Your Name', desc: 'Transform from a local DJ to a recognized brand.', icon: <Users size={32} /> },
                    { title: 'Get Discovered', desc: 'Direct visibility to club owners and event organizers.', icon: <Flame size={32} /> },
                    { title: 'Climb Local Charts', desc: 'Our ranking engine keeps you visible when momentum builds.', icon: <TrendingUp size={32} /> },
                    { title: 'Turn Interest Into Bookings', desc: 'Direct link from remix hype to booking conversations.', icon: <Calendar size={32} /> }
                  ].map((item) => (
                    <div key={item.title} className="glass space-y-6 rounded-[2.5rem] p-8 transition-colors hover:border-blue-500/40">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-600/10 text-blue-500">
                        {item.icon}
                      </div>
                      <div className="space-y-3">
                        <h4 className="text-2xl font-black italic tracking-tight">{item.title}</h4>
                        <p className="text-sm font-medium leading-relaxed text-gray-400">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {currentView === 'dj-profile' && selectedDJ && <DJProfileView dj={selectedDJ} />}
      {currentView === 'event-detail' && selectedEvent && <EventDetailView event={selectedEvent} />}

      {nowPlaying && (
        <div className="fixed bottom-0 left-0 right-0 z-[150] animate-in slide-in-from-bottom-full border-t border-white/10 bg-black/80 p-4 backdrop-blur-2xl duration-500 sm:p-6">
          <audio ref={audioRef} onTimeUpdate={handleTimeUpdate} onEnded={handleAudioEnded} />
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-6">
            <div className="flex min-w-0 items-center gap-4">
              <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-blue-600 ${isPlaying ? 'animate-slow-spin' : ''}`}>
                <Disc3 className="text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 truncate text-sm font-black uppercase tracking-tight">
                  {nowPlaying.title}
                  {nowPlaying.title.includes('Miracle') && nowPlaying.artist === 'DJ NDROW' && (
                    <a
                      href="https://screenapp.io/app/v/xBb4rbA7ZY"
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full bg-red-500/20 px-2 py-0.5 text-[9px] uppercase tracking-widest text-red-400 transition-all hover:bg-red-500 hover:text-white"
                    >
                      Watch Video
                    </a>
                  )}
                </div>
                <div className="truncate text-[10px] font-bold uppercase tracking-widest text-blue-500">{nowPlaying.artist}</div>
              </div>
            </div>

            <div className="hidden flex-1 items-center gap-4 px-12 md:flex">
              <span className="text-[10px] font-bold text-gray-500">
                {audioRef.current ? `${Math.floor(audioRef.current.currentTime / 60)}:${`0${Math.floor(audioRef.current.currentTime % 60)}`.slice(-2)}` : '0:00'}
              </span>
              <button
                type="button"
                className="h-1 flex-1 overflow-hidden rounded-full bg-white/10"
                onClick={(event) => {
                  if (!audioRef.current || Number.isNaN(audioRef.current.duration)) return;
                  const rect = event.currentTarget.getBoundingClientRect();
                  const position = (event.clientX - rect.left) / rect.width;
                  audioRef.current.currentTime = position * audioRef.current.duration;
                }}
              >
                <div className="h-full bg-blue-600 transition-all duration-100" style={{ width: `${progress}%` }} />
              </button>
              <span className="text-[10px] font-bold text-gray-500">
                {audioRef.current && !Number.isNaN(audioRef.current.duration)
                  ? `${Math.floor(audioRef.current.duration / 60)}:${`0${Math.floor(audioRef.current.duration % 60)}`.slice(-2)}`
                  : '0:00'}
              </span>
            </div>

            <div className="flex items-center gap-4">
              <button type="button" onClick={closePlayer} className="p-2 text-gray-500 transition-colors hover:text-white">
                <X size={20} />
              </button>
              <button type="button" onClick={togglePlay} className="rounded-full bg-white p-3 text-black transition-all hover:bg-blue-500 hover:text-white">
                {isPlaying ? <span className="px-1 text-xs font-black">||</span> : <Play size={20} fill="currentColor" />}
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="relative z-[10] bg-black pb-16 pt-32">
        <div className="mx-auto mb-20 grid max-w-7xl gap-12 px-6 md:grid-cols-4">
          <div className="space-y-8 md:col-span-1">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Disba Logo" className="h-12 w-auto" />
              <h1 className="text-3xl font-black italic tracking-tighter text-glow-blue">DISBA</h1>
            </div>
            <p className="text-base leading-relaxed text-gray-500">
              The central hub for local nightlife culture. Discover, climb, and get booked.
            </p>
            <div className="flex items-center gap-4 pt-4">
              <a href={SOCIAL_LINKS.instagram} target="_blank" rel="noreferrer" className="glass flex h-12 w-12 items-center justify-center rounded-full text-gray-400 transition-all hover:border-blue-500/50 hover:text-white">
                <Instagram size={24} />
              </a>
              <a href={SOCIAL_LINKS.email} className="glass flex h-12 w-12 items-center justify-center rounded-full text-gray-400 transition-all hover:border-blue-500/50 hover:text-white">
                <Mail size={24} />
              </a>
              <a href={SOCIAL_LINKS.whatsapp} target="_blank" rel="noreferrer" className="glass flex h-12 w-12 items-center justify-center rounded-full text-gray-400 transition-all hover:border-blue-500/50 hover:text-white">
                <MessageCircle size={24} />
              </a>
            </div>
          </div>

          <div>
            <h5 className="mb-8 text-lg font-black uppercase tracking-widest text-white/50">Discover</h5>
            <ul className="space-y-5 text-base font-bold uppercase tracking-wider text-gray-400">
              <li><button type="button" className="transition-colors hover:text-blue-400" onClick={() => document.getElementById('charts')?.scrollIntoView({ behavior: 'smooth' })}>Top DJs</button></li>
              <li><button type="button" className="transition-colors hover:text-blue-400" onClick={() => document.getElementById('events')?.scrollIntoView({ behavior: 'smooth' })}>Hot Events</button></li>
              <li><button type="button" className="transition-colors hover:text-blue-400" onClick={() => document.getElementById('charts')?.scrollIntoView({ behavior: 'smooth' })}>Charts</button></li>
            </ul>
          </div>

          <div>
            <h5 className="mb-8 text-lg font-black uppercase tracking-widest text-white/50">For DJs</h5>
            <ul className="space-y-5 text-base font-bold uppercase tracking-wider text-gray-400">
              <li><button type="button" className="transition-colors hover:text-blue-400" onClick={() => setShowLogin(true)}>Pricing</button></li>
              <li><button type="button" className="transition-colors hover:text-blue-400" onClick={() => setShowLogin(true)}>Benefits</button></li>
              <li><button type="button" className="transition-colors hover:text-blue-400" onClick={() => setShowLogin(true)}>Success Stories</button></li>
            </ul>
          </div>

          <div>
            <h5 className="mb-8 text-lg font-black uppercase tracking-widest text-white/50">Contact Us</h5>
            <ul className="space-y-5 text-sm font-bold tracking-wider text-gray-400">
              <li className="flex items-center gap-2">
                <Mail size={16} />
                <a href={SOCIAL_LINKS.email} className="transition-colors hover:text-blue-400">disbamusic.official@gmail.com</a>
              </li>
              <li className="flex items-center gap-2">
                WhatsApp:
                <a href={SOCIAL_LINKS.whatsapp} target="_blank" rel="noreferrer" className="transition-colors hover:text-blue-400">082164187865</a>
              </li>
              <li className="flex items-center gap-2">
                Instagram:
                <a href={SOCIAL_LINKS.instagram} target="_blank" rel="noreferrer" className="transition-colors hover:text-blue-400">@arifianto_29</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 border-t border-white/10 px-6 pt-12 md:flex-row">
          <p onClick={onAdminClick} className="cursor-pointer text-sm font-bold uppercase tracking-widest text-gray-700 transition-colors hover:text-blue-500">
            © {new Date().getFullYear()} DISBA NIGHTLIFE MOVEMENT. {adminClickCount > 0 && `[${adminClickCount}/5]`}
          </p>
          <div className="flex items-center gap-8 text-xs font-black uppercase tracking-[0.3em] text-gray-700">
            <button type="button" onClick={() => openPolicyRequest('Privacy Policy')} className="transition-colors hover:text-blue-500">Privasi</button>
            <button type="button" onClick={() => openPolicyRequest('Terms of Service')} className="transition-colors hover:text-blue-500">Terms</button>
            <button type="button" onClick={() => openPolicyRequest('Cookie Policy')} className="transition-colors hover:text-blue-500">Cookies</button>
          </div>
        </div>
      </footer>

      {showLogin && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md animate-in fade-in duration-300">
          <div className="relative w-full max-w-md overflow-hidden rounded-[3rem] border border-white/10 bg-[#0f1219] p-10 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-blue-600/10 blur-3xl" />

            <button
              type="button"
              onClick={() => setShowLogin(false)}
              className="absolute right-8 top-8 text-gray-500 transition-colors hover:text-white"
            >
              <X size={24} />
            </button>

            <div className="mb-12 flex items-center gap-3">
              <img src={logo} alt="Disba Logo" className="h-10 w-auto" />
              <h1 className="text-2xl font-black italic tracking-tighter">DISBA</h1>
            </div>

            <h2 className="mb-8 text-3xl font-black uppercase italic tracking-tight">
              {isSignUp ? 'Join The Movement' : 'Welcome Back'}
            </h2>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                onLogin(event.target.email.value, event.target.password.value, isSignUp);
              }}
              className="space-y-6"
            >
              <div>
                <label className="mb-3 block text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Email address</label>
                <input name="email" type="email" required placeholder="YOU@EXAMPLE.COM" className="w-full rounded-2xl border border-white/10 bg-white/5 px-6 py-5 font-bold tracking-widest text-white outline-none transition-all placeholder:text-gray-700 focus:border-blue-500" />
              </div>
              <div>
                <label className="mb-3 block text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Password</label>
                <input name="password" type="password" required placeholder="••••••••" className="w-full rounded-2xl border border-white/10 bg-white/5 px-6 py-5 font-bold tracking-widest text-white outline-none transition-all placeholder:text-gray-700 focus:border-blue-500" />
              </div>

              <button type="submit" className="mt-4 w-full rounded-2xl bg-blue-600 py-5 text-lg font-black uppercase tracking-widest text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-500 active:scale-95">
                {isSignUp ? 'Create Account' : 'Enter The Club'}
              </button>
            </form>

            <div className="mt-10 flex items-center gap-4 before:h-px before:flex-1 before:bg-white/5 after:h-px after:flex-1 after:bg-white/5">
              <span className="text-xs font-black uppercase tracking-widest text-gray-700">OR</span>
            </div>

            <button
              type="button"
              onClick={onGoogleLogin}
              className="group mt-10 flex w-full items-center justify-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-6 py-5 font-black uppercase tracking-widest transition-all hover:bg-white/10"
            >
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="h-5 w-5 transition-transform group-hover:scale-110" />
              Continue with Google
            </button>

            <p className="mt-10 text-center text-sm font-bold uppercase tracking-widest text-gray-500">
              {isSignUp ? 'Already a member?' : 'Not a member yet?'}{' '}
              <button type="button" onClick={() => setIsSignUp(!isSignUp)} className="text-blue-500 transition-colors hover:text-white">
                {isSignUp ? 'Login' : 'Sign Up'}
              </button>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
