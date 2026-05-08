import React, { useState, useEffect, useMemo } from 'react';
import { 
  Disc3, Play, Activity, Zap, Music, Instagram, Twitter, Youtube, 
  ArrowRight, Check, Headphones, X, Flame, Star, TrendingUp, Users, Calendar, MapPin, Heart, ArrowLeft, Share2, Ticket, Volume2
} from 'lucide-react';
import logo from '../assets/logo-disba.png';
import heroBg from '../assets/hero-bg.png';
import dj1 from '../assets/dj-1.png';
import dj2 from '../assets/dj-2.png';
import event1 from '../assets/event-1.png';
import { supabase } from '../supabase';

// Helper to map snake_case from DB to camelCase used in component
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
  recentTracks: dj.recent_tracks || [],
  upcoming: dj.upcoming
});

const mapEvent = (event) => ({
  id: event.id,
  title: event.title,
  venue: event.venue,
  date: event.date,
  image: event.image || event1,
  status: event.status,
  color: event.color,
  lineup: event.lineup || [],
  description: event.description,
  price: event.price
});


const LandingPage = ({ onLogin, onGoogleLogin, setShowLogin, showLogin, adminClickCount, onAdminClick }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [currentView, setCurrentView] = useState('home'); // 'home', 'dj-profile', 'event-detail'
  const [selectedDJ, setSelectedDJ] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [nowPlaying, setNowPlaying] = useState(null);
  
  const [djs, setDjs] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const [{ data: djsData }, { data: eventsData }] = await Promise.all([
          supabase.from('djs').select('*').order('rank', { ascending: true }),
          supabase.from('events').select('*').order('created_at', { ascending: false })
        ]);
        
        if (djsData) setDjs(djsData.map(mapDJ));
        if (eventsData) setEvents(eventsData.map(mapEvent));
      } catch (error) {
        console.error('Error fetching landing content:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchContent();

    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleDJClick = (e, dj) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedDJ(dj);
    setCurrentView('dj-profile');
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleEventClick = (e, event) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedEvent(event);
    setCurrentView('event-detail');
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handlePlayRemix = (e, track, artist) => {
    e.preventDefault();
    e.stopPropagation();
    setNowPlaying({ title: track, artist: artist });
  };

  const handleGoHome = (e) => {
    if (e) e.preventDefault();
    setCurrentView('home');
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  // SUB-COMPONENT: DJ Profile View
  const DJProfileView = ({ dj }) => (
    <div className="animate-in fade-in duration-500 pt-32 pb-32 relative z-[10]">
      <div className="max-w-7xl mx-auto px-6">
        <button onClick={handleGoHome} className="flex items-center gap-2 text-gray-400 hover:text-white mb-12 font-bold uppercase tracking-widest text-sm group">
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" /> BACK TO CHARTS
        </button>

        <div className="grid lg:grid-cols-12 gap-16 items-start">
          <div className="lg:col-span-5 relative">
            <div className="aspect-[4/5] rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl relative group">
              <img src={dj.image} alt={dj.stageName} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
              
              <div className="absolute top-8 left-8 w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center font-black text-2xl shadow-xl border-2 border-white/20">
                {dj.rank}
              </div>
              
              <div className="absolute top-8 right-8 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-black uppercase tracking-[0.2em]">
                {dj.badge}
              </div>
            </div>
            
            <div className="mt-8 flex gap-4">
              <button onClick={() => setShowLogin(true)} className="flex-1 bg-white text-black py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-500 hover:text-white transition-all shadow-xl">FOLLOW</button>
              <button className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"><Share2 size={24} /></button>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-12">
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-blue-500 font-black uppercase tracking-widest text-sm">
                <Music size={18} />
                {dj.genre}
              </div>
              <h2 className="text-6xl md:text-8xl font-black tracking-tighter uppercase italic leading-none">{dj.stageName}</h2>
              <p className="text-xl text-gray-500 font-bold uppercase tracking-widest italic">{dj.name} • {dj.location}</p>
            </div>

            <div className="grid grid-cols-3 gap-8">
              <div>
                <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">PLAYS</div>
                <div className="text-3xl font-black">{dj.plays}</div>
              </div>
              <div>
                <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">LIKES</div>
                <div className="text-3xl font-black">{dj.likes}</div>
              </div>
              <div>
                <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">FANS</div>
                <div className="text-3xl font-black">{(parseFloat(dj.likes.replace('k','')) * 1.5).toFixed(1)}k</div>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
                <Activity size={24} className="text-blue-500" /> BIO
              </h3>
              <p className="text-xl text-gray-400 leading-relaxed max-w-2xl">{dj.bio}</p>
            </div>

            <div className="space-y-6">
              <h3 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
                <Volume2 size={24} className="text-blue-500" /> RECENT TRACKS
              </h3>
              <div className="space-y-3">
                {dj.recentTracks.map((track, i) => (
                  <div key={i} className="glass p-5 rounded-2xl flex items-center justify-between group hover:bg-white/5 transition-all cursor-pointer" onClick={(e) => handlePlayRemix(e, track, dj.stageName)}>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-blue-600/10 flex items-center justify-center text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-all">
                        <Play size={18} fill="currentColor" />
                      </div>
                      <span className="font-bold text-lg">{track}</span>
                    </div>
                    <span className="text-xs text-gray-500 font-bold">03:45</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-8 rounded-[2rem] bg-blue-600/5 border border-blue-500/20 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="space-y-2 text-center sm:text-left">
                <div className="text-[10px] text-blue-500 font-black uppercase tracking-[0.2em]">UPCOMING APPEARANCE</div>
                <h4 className="text-2xl font-black uppercase">{dj.upcoming}</h4>
              </div>
              <button onClick={() => setShowLogin(true)} className="bg-blue-600 text-white px-8 py-3 rounded-full font-black text-sm uppercase tracking-widest shadow-lg shadow-blue-600/20">GET ACCESS</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // SUB-COMPONENT: Event Detail View
  const EventDetailView = ({ event }) => (
    <div className="animate-in fade-in duration-500 pt-32 pb-32 relative z-[10]">
      <div className="max-w-7xl mx-auto px-6">
        <button onClick={handleGoHome} className="flex items-center gap-2 text-gray-400 hover:text-white mb-12 font-bold uppercase tracking-widest text-sm group">
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" /> BACK TO EVENTS
        </button>

        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-10">
            <div className="space-y-6">
              <div className={`inline-block px-4 py-1.5 rounded-full ${event.color} text-[10px] font-black uppercase tracking-[0.2em] shadow-lg animate-pulse`}>
                {event.status}
              </div>
              <h2 className="text-6xl md:text-8xl font-black tracking-tighter uppercase italic leading-none">{event.title}</h2>
              <div className="flex items-center gap-8 text-xl font-bold uppercase tracking-widest text-gray-400">
                <span className="flex items-center gap-2"><Calendar size={24} className="text-blue-500" /> {event.date}</span>
                <span className="flex items-center gap-2"><MapPin size={24} className="text-blue-500" /> {event.venue}</span>
              </div>
            </div>

            <p className="text-2xl text-gray-300 leading-relaxed italic border-l-4 border-blue-500 pl-8 font-medium">
              "{event.description}"
            </p>

            <div className="space-y-6">
              <h3 className="text-xs text-gray-500 font-black uppercase tracking-[0.3em]">THE LINEUP</h3>
              <div className="flex flex-wrap gap-4">
                {event.lineup.map((name, i) => (
                  <div key={i} className="glass px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-lg hover:border-blue-500 transition-all cursor-pointer">
                    {name}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6 pt-4">
              <button onClick={() => setShowLogin(true)} className="flex-1 w-full bg-blue-600 hover:bg-blue-500 text-white px-12 py-5 rounded-2xl font-black text-xl flex items-center justify-center gap-3 shadow-xl shadow-blue-600/30">
                <Ticket size={24} /> BUY TICKETS • {event.price}
              </button>
              <button className="w-full sm:w-auto p-5 rounded-2xl border border-white/20 hover:border-white transition-all">
                <Share2 size={24} />
              </button>
            </div>
          </div>

          <div className="relative">
            <div className="aspect-square rounded-[4rem] overflow-hidden border border-white/10 shadow-2xl relative rotate-3 hover:rotate-0 transition-transform duration-700 group">
              <img src={event.image} alt={event.title} className="w-full h-full object-cover opacity-80" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
              <div className="absolute inset-0 bg-blue-600/20 mix-blend-overlay"></div>
            </div>
            
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-blue-500/20 blur-[60px] rounded-full"></div>
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-purple-500/20 blur-[60px] rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#07090E] text-white selection:bg-blue-500/30 font-sans relative overflow-x-hidden">
      
      {/* Background noise and glows */}
      <div className="fixed inset-0 z-0 pointer-events-none noise"></div>
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-blue-600/10 blur-[120px] rounded-full animate-pulse"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-purple-600/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Navbar */}
      <nav className={`fixed top-0 w-full z-[100] transition-all duration-500 border-b ${scrolled || currentView !== 'home' ? 'bg-[#07090E]/90 backdrop-blur-xl border-white/10 py-3' : 'bg-transparent border-transparent py-5'}`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-pointer" onClick={handleGoHome}>
            <img src={logo} alt="Disba Logo" className="h-10 w-auto group-hover:scale-110 transition-transform duration-500" />
            <h1 className="text-xl font-black tracking-tighter text-glow-blue italic">DISBA</h1>
          </div>
          
          <div className="flex items-center gap-6">
            <button 
              onClick={() => { setIsSignUp(false); setShowLogin(true); }}
              className="text-sm font-bold text-gray-400 hover:text-white transition-colors hidden sm:block uppercase tracking-[0.2em]"
            >
              Log in
            </button>
            <button 
              onClick={() => { setIsSignUp(true); setShowLogin(true); }}
              className="bg-white text-black hover:bg-blue-500 hover:text-white px-8 py-2.5 rounded-full font-black text-sm transition-all duration-500 shadow-lg hover:shadow-blue-500/40"
            >
              JOIN THE MOVEMENT
            </button>
          </div>
        </div>
      </nav>

      {/* VIEW CONDITIONAL RENDERING */}
      {currentView === 'home' && (
        <div className="relative z-10">
          {/* Hero Section */}
          <header className="relative min-h-screen flex items-center justify-center px-6 pt-20 overflow-hidden">
            <div className="absolute inset-0 z-0">
              <img src={heroBg} alt="Nightlife" className="w-full h-full object-cover opacity-40 scale-105 animate-slow-spin-v-slow" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#07090E] via-[#07090E]/60 to-transparent"></div>
            </div>

            <div className="relative z-10 max-w-5xl text-center space-y-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-black uppercase tracking-[0.2em] animate-fade-in">
                <Flame size={14} className="animate-pulse" />
                Voted #1 Nightlife Platform
              </div>
              
              <h2 className="text-6xl md:text-[7rem] font-black tracking-tighter leading-[0.9] text-white uppercase italic animate-slide-up">
                Discover <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600 text-glow-blue">Who Runs</span> <br />
                The Night.
              </h2>
              
              <p className="text-xl md:text-2xl font-medium text-gray-300 max-w-2xl mx-auto leading-relaxed animate-fade-in-delayed">
                Discover trending DJs, hottest events, and rising nightlife culture in your city.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-4 animate-fade-in-delayed">
                <button 
                  onClick={() => { document.getElementById('charts').scrollIntoView({ behavior: 'smooth' }); }}
                  className="group relative bg-blue-600 hover:bg-blue-500 text-white px-12 py-5 rounded-full font-black text-xl transition-all duration-300 hover:scale-105 hover:shadow-[0_0_40px_rgba(37,99,235,0.4)] flex items-center gap-3"
                >
                  EXPLORE DJs
                  <ArrowRight size={24} className="group-hover:translate-x-2 transition-transform" />
                </button>
                <button 
                  onClick={() => { document.getElementById('charts').scrollIntoView({ behavior: 'smooth' }); }}
                  className="px-12 py-5 rounded-full font-black text-xl border-2 border-white/20 hover:border-white hover:bg-white/5 transition-all duration-300"
                >
                  TRENDING THIS WEEK
                </button>
              </div>
            </div>
          </header>

          {/* Section 1: Trending DJs */}
          <section id="charts" className="py-32 bg-nightlife relative z-[20]">
            <div className="max-w-7xl mx-auto px-6">
              <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-blue-500 font-black uppercase tracking-widest text-sm">
                    <TrendingUp size={18} />
                    Live Charts
                  </div>
                  <h3 className="text-5xl md:text-7xl font-black tracking-tighter uppercase italic">Trending DJs <span className="text-gray-700">/ This Week</span></h3>
                </div>
                <button 
                  onClick={() => { document.getElementById('charts').scrollIntoView({ behavior: 'smooth' }); }}
                  className="text-gray-400 hover:text-white font-bold flex items-center gap-2 group transition-colors uppercase tracking-widest text-sm"
                >
                  VIEW ALL RANKINGS <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {loading ? (
                  [...Array(4)].map((_, i) => (
                    <div key={i} className="aspect-[4/5] bg-white/5 rounded-[2rem] animate-pulse"></div>
                  ))
                ) : djs.map((dj, i) => (
                  <div 
                    key={dj.id} 
                    onClick={(e) => handleDJClick(e, dj)} 
                    className="group relative glass rounded-[2rem] overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:border-blue-500/50 hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)] cursor-pointer"
                  >
                    <div className="aspect-[4/5] relative overflow-hidden">
                      <img src={dj.image} alt={dj.stageName} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
                      
                      <div className="absolute top-6 left-6 w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center font-black text-xl shadow-lg border-2 border-white/20">
                        {dj.rank}
                      </div>

                      <div className="absolute top-6 right-6 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[10px] font-black uppercase tracking-widest">
                        {dj.badge}
                      </div>

                      <div className="absolute bottom-6 left-6 right-6 space-y-2">
                        <h4 className="text-2xl font-black uppercase italic tracking-tighter">{dj.stageName}</h4>
                        <div className="flex items-center justify-between text-xs font-bold text-gray-400 uppercase tracking-widest">
                          <span className="flex items-center gap-1.5"><Play size={12} className="text-blue-500" /> {dj.plays} PLAYS</span>
                          <span className="flex items-center gap-1.5"><Heart size={12} className="text-pink-500" /> {dj.likes} LIKES</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Section 2: Hot Events */}
          <section className="py-32 relative border-y border-white/5 bg-white/[0.01] z-[20]">
            <div className="max-w-7xl mx-auto px-6">
              <div className="flex items-center justify-center gap-4 mb-16">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/10"></div>
                <h3 className="text-4xl md:text-6xl font-black tracking-tighter uppercase italic text-center px-8">Hot Events <span className="text-blue-500">Nearby</span></h3>
                <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/10"></div>
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                {loading ? (
                  [...Array(3)].map((_, i) => (
                    <div key={i} className="h-96 bg-white/5 rounded-3xl animate-pulse"></div>
                  ))
                ) : events.map((event) => (
                  <div 
                    key={event.id} 
                    onClick={(e) => handleEventClick(e, event)} 
                    className="group glass-dark rounded-3xl overflow-hidden border-white/[0.03] hover:border-white/20 transition-all duration-300 cursor-pointer"
                  >
                    <div className="h-64 relative overflow-hidden">
                      <img src={event.image} alt={event.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors"></div>
                      <div className={`absolute top-4 right-4 px-4 py-1.5 rounded-full ${event.color} text-[10px] font-black uppercase tracking-widest shadow-lg animate-pulse`}>
                        {event.status}
                      </div>
                    </div>
                    <div className="p-8 space-y-6">
                      <div className="flex justify-between items-start">
                        <h4 className="text-2xl font-black uppercase tracking-tight leading-tight">{event.title}</h4>
                        <div className="text-right">
                          <div className="text-blue-500 font-black text-lg">{event.date}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 text-sm text-gray-400 font-bold uppercase tracking-wider">
                        <span className="flex items-center gap-2"><MapPin size={16} className="text-blue-500" /> {event.venue}</span>
                      </div>
                      <button className="w-full py-4 rounded-xl border border-white/10 group-hover:bg-white group-hover:text-black font-black text-sm uppercase tracking-widest transition-all">
                        GET TICKETS
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Section 3: Trending Remix */}
          <section className="py-32 relative z-[20]">
            <div className="max-w-7xl mx-auto px-6">
              <div className="text-center space-y-4 mb-20">
                <h3 className="text-5xl md:text-7xl font-black tracking-tighter uppercase italic">Trending Remixes</h3>
                <p className="text-xl text-gray-400 font-medium italic">Perception &gt; Feature. Hear the future of nightlife.</p>
              </div>

              <div className="space-y-6 max-w-5xl mx-auto">
                {loading ? (
                  [...Array(3)].map((_, i) => (
                    <div key={i} className="h-32 bg-white/5 rounded-3xl animate-pulse"></div>
                  ))
                ) : djs.map((dj) => (
                  <div key={dj.id} className="glass p-4 sm:p-6 rounded-3xl flex flex-col sm:flex-row items-center gap-8 group hover:bg-white/5 transition-all">
                    <div 
                      className="w-24 h-24 rounded-2xl overflow-hidden relative flex-shrink-0 cursor-pointer" 
                      onClick={(e) => handlePlayRemix(e, dj.recentTracks[0], dj.stageName)}
                    >
                      <img src={dj.image} alt={dj.stageName} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-blue-600/60 transition-colors">
                        <Play fill="white" size={32} />
                      </div>
                    </div>
                    
                    <div className="flex-1 space-y-2 text-center sm:text-left cursor-pointer" onClick={(e) => handleDJClick(e, dj)}>
                      <h4 className="text-2xl font-black uppercase tracking-tight">{dj.recentTracks[0]}</h4>
                      <p className="text-blue-400 font-bold uppercase text-sm tracking-widest">{dj.stageName}</p>
                    </div>

                    <div className="hidden lg:block flex-[2] px-8 opacity-40 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <div className="flex items-center gap-1 h-12">
                        {[...Array(40)].map((_, j) => (
                          <div key={j} className="w-1 bg-blue-500 rounded-full transition-all duration-300" style={{ height: `${20 + Math.random() * 80}%` }}></div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="text-xs font-black text-gray-500 uppercase tracking-[0.2em]">Plays</div>
                        <div className="text-xl font-black">{dj.plays}</div>
                      </div>
                      <div className="px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest">
                        Hot
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Section 4: Why DJs Use Disba */}
          <section className="py-32 relative overflow-hidden z-[20]">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-blue-600/5 blur-[150px] rounded-full"></div>
            <div className="max-w-7xl mx-auto px-6 relative z-10">
              <div className="grid lg:grid-cols-2 gap-20 items-center">
                <div className="space-y-8">
                  <h3 className="text-5xl md:text-7xl font-black tracking-tighter uppercase italic leading-[0.9]">
                    Why DJs <br />
                    <span className="text-blue-500">Dominate</span> <br />
                    With Disba
                  </h3>
                  <p className="text-xl text-gray-400 leading-relaxed max-w-lg">
                    Stop being just another technical file. Start being the movement. We give you the tools to climb charts and get booked.
                  </p>
                  <div className="pt-4">
                    <button 
                      onClick={() => setShowLogin(true)}
                      className="bg-white text-black px-12 py-5 rounded-full font-black text-xl hover:bg-blue-500 hover:text-white transition-all shadow-xl hover:shadow-blue-500/30"
                    >
                      START YOUR CAREER
                    </button>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-6">
                  {[
                    { title: 'Build Your Name', desc: 'Transform from a local DJ to a recognized brand.', icon: <Users size={32} /> },
                    { title: 'Get Discovered', desc: 'Direct visibility to club owners and event organizers.', icon: <Flame size={32} /> },
                    { title: 'Climb Local Charts', desc: 'Our unique ranking system puts you in the spotlight.', icon: <TrendingUp size={32} /> },
                    { title: 'Turn Bookings', desc: 'Direct link from your trending remixes to your booking inbox.', icon: <Calendar size={32} /> },
                  ].map((item, i) => (
                    <div key={i} className="glass p-8 rounded-[2.5rem] space-y-6 hover:border-blue-500/40 transition-colors">
                      <div className="w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
                        {item.icon}
                      </div>
                      <div className="space-y-3">
                        <h4 className="text-2xl font-black uppercase italic tracking-tight">{item.title}</h4>
                        <p className="text-gray-400 font-medium text-sm leading-relaxed">{item.desc}</p>
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

      {/* Persistent Mini Player (Simulated) */}
      {nowPlaying && (
        <div className="fixed bottom-0 left-0 right-0 z-[150] bg-black/80 backdrop-blur-2xl border-t border-white/10 p-4 sm:p-6 animate-in slide-in-from-bottom-full duration-500">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-6">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0 animate-slow-spin">
                <Disc3 className="text-white" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-black uppercase tracking-tight truncate">{nowPlaying.title}</div>
                <div className="text-[10px] text-blue-500 font-bold uppercase tracking-widest truncate">{nowPlaying.artist}</div>
              </div>
            </div>
            
            <div className="hidden md:flex flex-1 items-center gap-4 px-12">
              <span className="text-[10px] font-bold text-gray-500">01:42</span>
              <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 w-1/3 animate-pulse"></div>
              </div>
              <span className="text-[10px] font-bold text-gray-500">03:45</span>
            </div>

            <div className="flex items-center gap-4">
              <button onClick={() => setNowPlaying(null)} className="p-2 text-gray-500 hover:text-white transition-colors"><X size={20} /></button>
              <button className="bg-white text-black p-3 rounded-full hover:bg-blue-500 hover:text-white transition-all"><Volume2 size={20} /></button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="pt-32 pb-16 bg-black relative z-[10]">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-12 mb-20">
          <div className="space-y-8 md:col-span-1">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Disba Logo" className="h-12 w-auto" />
              <h1 className="text-3xl font-black tracking-tighter text-glow-blue italic">DISBA</h1>
            </div>
            <p className="text-gray-500 text-base leading-relaxed">
              The central hub for local nightlife culture. Discover, climb, and get booked.
            </p>
            <div className="flex items-center gap-4 pt-4">
              <a href="#" className="w-12 h-12 rounded-full glass flex items-center justify-center text-gray-400 hover:text-white hover:border-blue-500/50 transition-all"><Instagram size={24} /></a>
              <a href="#" className="w-12 h-12 rounded-full glass flex items-center justify-center text-gray-400 hover:text-white hover:border-blue-500/50 transition-all"><Twitter size={24} /></a>
              <a href="#" className="w-12 h-12 rounded-full glass flex items-center justify-center text-gray-400 hover:text-white hover:border-blue-500/50 transition-all"><Youtube size={24} /></a>
            </div>
          </div>

          <div>
            <h5 className="font-black mb-8 text-lg uppercase tracking-widest text-white/50">Discover</h5>
            <ul className="space-y-5 text-gray-400 text-base font-bold uppercase tracking-wider">
              <li className="cursor-pointer hover:text-blue-400 transition-colors" onClick={handleGoHome}>Top DJs</li>
              <li className="cursor-pointer hover:text-blue-400 transition-colors" onClick={handleGoHome}>Hot Events</li>
              <li className="cursor-pointer hover:text-blue-400 transition-colors" onClick={handleGoHome}>Charts</li>
            </ul>
          </div>

          <div>
            <h5 className="font-black mb-8 text-lg uppercase tracking-widest text-white/50">For DJs</h5>
            <ul className="space-y-5 text-gray-400 text-base font-bold uppercase tracking-wider">
              <li className="cursor-pointer hover:text-blue-400 transition-colors" onClick={() => setShowLogin(true)}>Pricing</li>
              <li className="cursor-pointer hover:text-blue-400 transition-colors" onClick={() => setShowLogin(true)}>Benefits</li>
              <li className="cursor-pointer hover:text-blue-400 transition-colors" onClick={() => setShowLogin(true)}>Success Stories</li>
            </ul>
          </div>

          <div>
            <h5 className="font-black mb-8 text-lg uppercase tracking-widest text-white/50">Company</h5>
            <ul className="space-y-5 text-gray-400 text-base font-bold uppercase tracking-wider">
              <li><a href="#" className="hover:text-blue-400 transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">Contact</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">Terms</a></li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 pt-12 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-6">
          <p onClick={onAdminClick} className="text-gray-700 text-sm cursor-pointer hover:text-blue-500 transition-colors font-bold tracking-widest uppercase">
            © {new Date().getFullYear()} DISBA NIGHTLIFE MOVEMENT. {adminClickCount > 0 && `[${adminClickCount}/5]`}
          </p>
          <div className="flex items-center gap-8 text-xs font-black uppercase tracking-[0.3em] text-gray-700">
            <span>Privasi</span>
            <span>Terms</span>
            <span>Cookies</span>
          </div>
        </div>
      </footer>

      {showLogin && (
        <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-[#0f1219] border border-white/10 w-full max-w-md p-10 rounded-[3rem] shadow-2xl relative overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 blur-3xl rounded-full"></div>
            
            <button 
              onClick={() => setShowLogin(false)}
              className="absolute top-8 right-8 text-gray-500 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>

            <div className="flex items-center gap-3 mb-12">
              <img src={logo} alt="Disba Logo" className="h-10 w-auto" />
              <h1 className="text-2xl font-black tracking-tighter italic">DISBA</h1>
            </div>

            <h2 className="text-3xl font-black mb-8 uppercase italic tracking-tight">
              {isSignUp ? 'Join The Movement' : 'Welcome Back'}
            </h2>

            <form 
              onSubmit={(e) => { 
                e.preventDefault(); 
                onLogin(e.target.email.value, e.target.password.value, isSignUp); 
              }} 
              className="space-y-6"
            >
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-3 block">Email address</label>
                <input name="email" type="email" placeholder="YOU@EXAMPLE.COM" required className="w-full bg-white/5 border border-white/10 px-6 py-5 rounded-2xl text-white outline-none focus:border-blue-500 transition-all font-bold tracking-widest placeholder:text-gray-700" />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-3 block">Password</label>
                <input name="password" type="password" placeholder="••••••••" required className="w-full bg-white/5 border border-white/10 px-6 py-5 rounded-2xl text-white outline-none focus:border-blue-500 transition-all font-bold tracking-widest placeholder:text-gray-700" />
              </div>
              
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white py-5 rounded-2xl font-black text-lg transition-all shadow-lg shadow-blue-600/20 active:scale-95 uppercase tracking-widest mt-4">
                {isSignUp ? 'Create Account' : 'Enter The Club'}
              </button>
            </form>

            <div className="mt-10 flex items-center gap-4 before:flex-1 before:h-px before:bg-white/5 after:flex-1 after:h-px after:bg-white/5">
              <span className="text-gray-700 text-xs font-black uppercase tracking-widest">OR</span>
            </div>
            
            <button 
              onClick={onGoogleLogin}
              className="w-full mt-10 bg-white/5 border border-white/10 px-6 py-5 rounded-2xl hover:bg-white/10 transition-all flex items-center justify-center gap-4 font-black uppercase tracking-widest group"
            >
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5 group-hover:scale-110 transition-transform" />
              Continue with Google
            </button>

            <p className="text-center text-sm text-gray-500 mt-10 font-bold uppercase tracking-widest">
              {isSignUp ? 'Already a member?' : "Not a member yet?"}{' '}
              <button type="button" onClick={() => setIsSignUp(!isSignUp)} className="text-blue-500 hover:text-white transition-colors">
                {isSignUp ? 'Login' : 'Sign Up'}
              </button>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;
