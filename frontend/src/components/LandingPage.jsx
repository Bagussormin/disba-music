import React, { useState, useEffect } from 'react';
import { 
  Disc3, Play, Activity, Zap, Music, Instagram, Twitter, Youtube, 
  ArrowRight, Check, Headphones, X, Flame, Star, TrendingUp, Users, Calendar, MapPin, Heart
} from 'lucide-react';
import logo from '../assets/logo-disba.png';
import heroBg from '../assets/hero-bg.png';
import dj1 from '../assets/dj-1.png';
import dj2 from '../assets/dj-2.png';
import event1 from '../assets/event-1.png';

const LandingPage = ({ onLogin, onGoogleLogin, setShowLogin, showLogin, adminClickCount, onAdminClick }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const trendingDJs = [
    { name: 'DJ Vortex', rank: 1, plays: '1.2M', likes: '45k', image: dj1, badge: 'Trending' },
    { name: 'Luna Ray', rank: 2, plays: '890k', likes: '32k', image: dj2, badge: 'Rising' },
    { name: 'Nova Pulse', rank: 3, plays: '750k', likes: '28k', image: dj1, badge: 'Hot' },
    { name: 'Zenith', rank: 4, plays: '620k', likes: '21k', image: dj2, badge: 'Top 10' },
  ];

  const hotEvents = [
    { title: 'Neon Pulse Night', venue: 'Skyline Lounge', date: 'Tonight', image: event1, status: 'Almost Full', color: 'bg-red-500' },
    { title: 'Techno Underground', venue: 'The Vault', date: 'Friday', image: event1, status: 'Hot This Week', color: 'bg-orange-500' },
    { title: 'Bass Drop 2024', venue: 'Arena Stage', date: 'Saturday', image: event1, status: 'Selling Fast', color: 'bg-blue-500' },
  ];

  const trendingRemixes = [
    { title: 'Midnight Drive (Remix)', artist: 'DJ Vortex', plays: '250k', image: dj1 },
    { title: 'Neon Lights (Deep Mix)', artist: 'Luna Ray', plays: '180k', image: dj2 },
    { title: 'Summer Ghost', artist: 'Nova Pulse', plays: '145k', image: dj1 },
  ];

  return (
    <div className="min-h-screen bg-[#07090E] text-white selection:bg-blue-500/30 font-sans relative overflow-x-hidden">
      
      {/* Background noise and glows */}
      <div className="fixed inset-0 z-0 pointer-events-none noise"></div>
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-blue-600/10 blur-[120px] rounded-full animate-pulse"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-purple-600/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Navbar */}
      <nav className={`fixed top-0 w-full z-[100] transition-all duration-300 border-b ${scrolled ? 'bg-[#07090E]/90 backdrop-blur-xl border-white/10 py-3' : 'bg-transparent border-transparent py-5'}`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <img src={logo} alt="Disba Logo" className="h-10 w-auto group-hover:scale-110 transition-transform duration-500" />
            <h1 className="text-xl font-black tracking-tighter text-glow-blue">DISBA</h1>
          </div>
          
          <div className="flex items-center gap-6">
            <button 
              onClick={() => { setIsSignUp(false); setShowLogin(true); }}
              className="text-sm font-bold text-gray-400 hover:text-white transition-colors hidden sm:block uppercase tracking-widest"
            >
              Log in
            </button>
            <button 
              onClick={() => { setIsSignUp(true); setShowLogin(true); }}
              className="bg-white text-black hover:bg-blue-500 hover:text-white px-8 py-2.5 rounded-full font-black text-sm transition-all duration-300 shadow-lg hover:shadow-blue-500/40"
            >
              JOIN THE MOVEMENT
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative min-h-screen flex items-center justify-center px-6 pt-20 overflow-hidden">
        {/* Cinematic Background Image */}
        <div className="absolute inset-0 z-0">
          <img src={heroBg} alt="Nightlife" className="w-full h-full object-cover opacity-40 scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#07090E] via-[#07090E]/60 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-[#07090E]/40 via-transparent to-transparent"></div>
        </div>

        <div className="relative z-10 max-w-5xl text-center space-y-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-black uppercase tracking-[0.2em]">
            <Flame size={14} className="animate-pulse" />
            Voted #1 Nightlife Platform
          </div>
          
          <h2 className="text-6xl md:text-[7rem] font-black tracking-tighter leading-[0.9] text-white uppercase italic">
            Discover <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600 text-glow-blue">Who Runs</span> <br />
            The Night.
          </h2>
          
          <p className="text-xl md:text-2xl font-medium text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Discover trending DJs, hottest events, and rising nightlife culture in your city.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-4">
            <button 
              onClick={() => setShowLogin(true)}
              className="group relative bg-blue-600 hover:bg-blue-500 text-white px-12 py-5 rounded-full font-black text-xl transition-all duration-300 hover:scale-105 hover:shadow-[0_0_40px_rgba(37,99,235,0.4)] flex items-center gap-3"
            >
              EXPLORE DJs
              <ArrowRight size={24} className="group-hover:translate-x-2 transition-transform" />
            </button>
            <button 
              onClick={() => setShowLogin(true)}
              className="px-12 py-5 rounded-full font-black text-xl border-2 border-white/20 hover:border-white hover:bg-white/5 transition-all duration-300"
            >
              TRENDING THIS WEEK
            </button>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce opacity-30">
          <div className="w-1 h-12 bg-gradient-to-b from-white to-transparent rounded-full"></div>
        </div>
      </header>

      {/* Section 1: Trending DJs */}
      <section className="py-32 relative z-10 bg-nightlife">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-blue-500 font-black uppercase tracking-widest text-sm">
                <TrendingUp size={18} />
                Live Charts
              </div>
              <h3 className="text-5xl md:text-7xl font-black tracking-tighter uppercase italic">Trending DJs <span className="text-gray-700">/ This Week</span></h3>
            </div>
            <button className="text-gray-400 hover:text-white font-bold flex items-center gap-2 group transition-colors">
              VIEW ALL RANKINGS <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {trendingDJs.map((dj, i) => (
              <div key={i} className="group relative glass rounded-[2rem] overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:border-blue-500/50 hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                <div className="aspect-[4/5] relative overflow-hidden">
                  <img src={dj.image} alt={dj.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
                  
                  {/* Rank Badge */}
                  <div className="absolute top-6 left-6 w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center font-black text-xl shadow-lg border-2 border-white/20">
                    {dj.rank}
                  </div>

                  {/* Trending Badge */}
                  <div className="absolute top-6 right-6 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[10px] font-black uppercase tracking-widest">
                    {dj.badge}
                  </div>

                  {/* Stats Overlay */}
                  <div className="absolute bottom-6 left-6 right-6 space-y-2">
                    <h4 className="text-2xl font-black uppercase italic tracking-tighter">{dj.name}</h4>
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
      <section className="py-32 relative border-y border-white/5 bg-white/[0.01]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-center gap-4 mb-16">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/10"></div>
            <h3 className="text-4xl md:text-6xl font-black tracking-tighter uppercase italic text-center px-8">Hot Events <span className="text-blue-500">Nearby</span></h3>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/10"></div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {hotEvents.map((event, i) => (
              <div key={i} className="group glass-dark rounded-3xl overflow-hidden border-white/[0.03] hover:border-white/20 transition-all duration-300">
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
                  <button onClick={() => setShowLogin(true)} className="w-full py-4 rounded-xl border border-white/10 hover:bg-white hover:text-black font-black text-sm uppercase tracking-widest transition-all">
                    GET TICKETS
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 3: Trending Remix */}
      <section className="py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center space-y-4 mb-20">
            <h3 className="text-5xl md:text-7xl font-black tracking-tighter uppercase italic">Trending Remixes</h3>
            <p className="text-xl text-gray-400 font-medium italic">Perception &gt; Feature. Hear the future of nightlife.</p>
          </div>

          <div className="space-y-6 max-w-5xl mx-auto">
            {trendingRemixes.map((remix, i) => (
              <div key={i} className="glass p-4 sm:p-6 rounded-3xl flex flex-col sm:flex-row items-center gap-8 group hover:bg-white/5 transition-all">
                <div className="w-24 h-24 rounded-2xl overflow-hidden relative flex-shrink-0">
                  <img src={remix.image} alt={remix.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-blue-600/60 transition-colors cursor-pointer">
                    <Play fill="white" size={32} />
                  </div>
                </div>
                
                <div className="flex-1 space-y-2 text-center sm:text-left">
                  <h4 className="text-2xl font-black uppercase tracking-tight">{remix.title}</h4>
                  <p className="text-blue-400 font-bold uppercase text-sm tracking-widest">{remix.artist}</p>
                </div>

                <div className="hidden lg:block flex-[2] px-8 opacity-40 group-hover:opacity-100 transition-opacity">
                  <div className="flex items-center gap-1 h-12">
                    {[...Array(40)].map((_, j) => (
                      <div key={j} className="w-1 bg-blue-500 rounded-full transition-all duration-300" style={{ height: `${Math.random() * 100}%` }}></div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-xs font-black text-gray-500 uppercase tracking-[0.2em]">Plays</div>
                    <div className="text-xl font-black">{remix.plays}</div>
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
      <section className="py-32 relative overflow-hidden">
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

      {/* Footer */}
      <footer className="pt-32 pb-16 bg-black">
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
              <li><a href="#" className="hover:text-blue-400 transition-colors">Top DJs</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">Hot Events</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">Charts</a></li>
            </ul>
          </div>

          <div>
            <h5 className="font-black mb-8 text-lg uppercase tracking-widest text-white/50">For DJs</h5>
            <ul className="space-y-5 text-gray-400 text-base font-bold uppercase tracking-wider">
              <li><a href="#pricing" className="hover:text-blue-400 transition-colors">Pricing</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">Benefits</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">Success Stories</a></li>
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
          <div className="bg-[#0f1219] border border-white/10 w-full max-w-md p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
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
