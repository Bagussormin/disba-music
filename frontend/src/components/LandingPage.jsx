import React, { useState } from 'react';
import { 
  Disc3, Play, Activity, Settings, Zap, Music, DollarSign,
  Instagram, Twitter, Youtube, Mail, ArrowRight, Check,
  Headphones, X
} from 'lucide-react';
import logo from '../assets/logo-disba.png';

const LandingPage = ({ onLogin, onGoogleLogin, setShowLogin, showLogin, adminClickCount, onAdminClick }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const partners = [
    { name: 'Spotify', icon: <Disc3 size={32} /> },
    { name: 'Apple Music', icon: <Music size={32} /> },
    { name: 'Instagram', icon: <Instagram size={32} /> },
    { name: 'TikTok', icon: <Activity size={32} /> },
    { name: 'YouTube Music', icon: <Youtube size={32} /> },
    { name: 'Amazon Music', icon: <Zap size={32} /> },
  ];

  const sessions = [
    { title: 'Nana Darby - Full session', link: '#' },
    { title: 'Luke Moss - Full session', link: '#' },
    { title: 'Oh - Full Session', link: '#' },
    { title: 'Tinnedfruit - Full session', link: '#' },
    { title: 'Soot Sprite - Full session', link: '#' },
    { title: 'Sam Brockington - Full session', link: '#' },
    { title: 'Slightly - Full session', link: '#' },
    { title: 'School Disco - Full session', link: '#' },
    { title: 'King Creature - Full session', link: '#' },
  ];

  return (
    <div className="min-h-screen bg-[#07090E] text-white selection:bg-blue-500/30 font-sans">
      
      {/* Background glow retained */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 blur-[150px] animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-white/5 blur-[150px] animate-pulse"></div>
      </div>

      {/* Navbar Minimalist */}
      <nav className="fixed top-0 w-full z-[100] transition-all border-b border-white/5 bg-[#07090E]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-pointer">
            <img src={logo} alt="Disba Logo" className="h-10 w-auto group-hover:scale-110 transition-transform" />
            <h1 className="text-xl font-black tracking-tight">DISBA</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => { setIsSignUp(false); setShowLogin(true); }}
              className="text-sm font-bold text-gray-300 hover:text-white transition-colors hidden sm:block"
            >
              Log in
            </button>
            <button 
              onClick={() => { setIsSignUp(true); setShowLogin(true); }}
              className="bg-blue-600 hover:bg-blue-500 px-6 py-2 rounded-full font-bold text-sm shadow-lg shadow-blue-600/20 transition-all font-sans"
            >
              Sign up
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative pt-48 pb-32 overflow-hidden flex flex-col items-center justify-center text-center px-6">
        <div className="relative z-10 max-w-4xl space-y-10">
          <h2 className="text-5xl md:text-[5.5rem] font-black tracking-tight leading-[1] text-white">
            Music distribution <br />
            <span className="text-blue-500">simplified</span>
          </h2>
          
          <div className="space-y-6 max-w-2xl mx-auto pt-4">
            <p className="text-xl md:text-2xl font-medium text-gray-200">
              Stream and sell your music around the world on Spotify, Apple Music, and more!
            </p>
            <p className="text-lg md:text-xl text-gray-400">
              Choose from our <span className="text-white font-bold">FREE</span> text or <span className="text-white font-bold">Premium</span> service (keep 100% of the royalties)
            </p>
          </div>
          
          <div className="pt-8">
            <button 
              onClick={() => setShowLogin(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white px-12 py-5 rounded-full font-black text-xl shadow-xl shadow-blue-600/30 transition-all hover:-translate-y-1"
            >
              Get Started Now
            </button>
          </div>
        </div>
      </header>

      {/* Numbers Section */}
      <section className="py-32 relative border-t border-white/5 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-6 text-center space-y-20">
          <div className="max-w-3xl mx-auto space-y-6">
            <h3 className="text-4xl md:text-6xl font-black tracking-tight">The numbers speak for themselves</h3>
            <p className="text-xl text-gray-400">
              We're the leading digital music distributor in Asia, working with new artists every day and partnering with new services all the time to get their music heard around the world.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12 pt-8">
            <div className="space-y-4">
              <h4 className="text-6xl md:text-8xl font-black text-blue-500">95%</h4>
              <p className="text-xl font-bold text-gray-300 uppercase tracking-widest">Market Coverage</p>
            </div>
            <div className="space-y-4">
              <h4 className="text-6xl md:text-8xl font-black text-white">67.9k+</h4>
              <p className="text-xl font-bold text-gray-300 uppercase tracking-widest">Artists</p>
            </div>
            <div className="space-y-4">
              <h4 className="text-6xl md:text-8xl font-black text-white">283.8k+</h4>
              <p className="text-xl font-bold text-gray-300 uppercase tracking-widest">Tracks</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-32 relative">
        <div className="max-w-7xl mx-auto px-6">
          <h3 className="text-4xl md:text-6xl font-black tracking-tight text-center mb-24">How it works</h3>
          
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: '1', title: 'Upload', desc: 'Upload your tracks, artwork and metadata' },
              { step: '2', title: 'Select Stores', desc: 'Choose where you want your music to be heard' },
              { step: '3', title: 'Choose Plan', desc: 'Select our Free or Premium plan' },
              { step: '4', title: 'Get Paid', desc: 'Keep 100% of your rights and earn royalties' },
            ].map((f, i) => (
              <div key={i} className="glass p-10 rounded-[2.5rem] relative text-center group hover:border-blue-500/50 transition-colors shadow-2xl">
                <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center text-4xl font-black mx-auto mb-8 shadow-lg shadow-blue-600/40 text-white">
                  {f.step}
                </div>
                <h4 className="text-2xl font-bold mb-4">{f.title}</h4>
                <p className="text-gray-400 font-medium">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Partners */}
      <section id="stores" className="py-32 bg-white/[0.02] border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6 text-center space-y-16">
          <div className="max-w-4xl mx-auto space-y-6">
            <h3 className="text-4xl md:text-6xl font-black tracking-tight">Distribute to the largest music platforms</h3>
            <p className="text-xl text-gray-400">
              We are currently partnered with over 50 of the biggest digital platforms and we're always adding more.
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-6 gap-8 items-center justify-center pt-8 opacity-70">
            {partners.map((p, i) => (
              <div key={i} className="flex flex-col items-center gap-4 hover:opacity-100 transition-opacity hover:text-blue-400 cursor-pointer">
                {p.icon}
                <span className="font-bold text-sm tracking-wider uppercase">{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-32 relative">
        <div className="max-w-7xl mx-auto px-6 text-center space-y-20">
          <div className="max-w-4xl mx-auto space-y-8">
            <h3 className="text-4xl md:text-6xl font-black tracking-tight leading-tight">
              Our Free and Premium plans offer the most flexible pricing for music distribution
            </h3>
            <p className="text-2xl font-bold text-blue-400">
              You can change payment model at any time!
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto pt-8">
            <div className="glass p-14 rounded-[3rem] text-left hover:border-white/20 transition-all">
              <h4 className="text-4xl font-black mb-4">Free</h4>
              <p className="text-gray-400 mb-10 text-xl">No upfront costs. You keep 85% of royalties.</p>
              <ul className="space-y-6 mb-16">
                {['Zero upfront fees', 'Unlimited uploads', 'All platform features included', 'Keep 85% royalties'].map((item, i) => (
                  <li key={i} className="flex items-center gap-4 text-xl">
                    <Check className="text-blue-500" size={28} />
                    {item}
                  </li>
                ))}
              </ul>
              <button 
                onClick={() => setShowLogin(true)}
                className="w-full bg-white/10 hover:bg-white/20 py-5 rounded-full font-bold text-xl transition-colors border border-white/10"
              >
                Sign Up Free
              </button>
            </div>

            <div className="bg-gradient-to-br from-blue-600 to-[#0A2540] p-14 rounded-[3rem] text-left relative overflow-hidden group hover:shadow-2xl hover:shadow-blue-600/20 transition-all">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:scale-110 transition-transform"></div>
              <h4 className="text-4xl font-black mb-4 text-white">Premium</h4>
              <p className="text-blue-200 mb-10 text-xl font-medium">Small upfront fee. Keep 100% of your royalties forever.</p>
              <ul className="space-y-6 mb-16">
                {['Single - $10', 'EP - $20', 'Album - $30', 'Extended Album - $45', 'Keep 100% royalties'].map((item, i) => (
                  <li key={i} className="flex items-center gap-4 text-xl font-medium text-white">
                    <Check className="text-white" size={28} />
                    {item}
                  </li>
                ))}
              </ul>
              <button 
                onClick={() => setShowLogin(true)}
                className="w-full bg-white text-blue-900 hover:bg-gray-100 py-5 rounded-full font-black text-xl transition-colors shadow-xl"
              >
                Upgrade to Premium
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Sessions */}
      <section className="py-32 bg-white/[0.02] border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6 space-y-20">
          <div className="max-w-4xl space-y-6 text-center mx-auto">
            <h3 className="text-4xl md:text-6xl font-black tracking-tight">Disba Sessions showcases exciting, new independent artists</h3>
            <p className="text-xl text-gray-400 leading-relaxed pt-4">
              Our live sessions feature some of the hottest rising artists from all walks of life. Join us as we bring these amazing bands and artists to the global stage with each session.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {sessions.map((s, i) => (
              <a key={i} href={s.link} className="glass p-6 rounded-2xl flex items-center gap-4 hover:bg-white/10 transition-colors group cursor-pointer border border-white/10 hover:border-white/20">
                <div className="w-14 h-14 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-lg shadow-red-600/40">
                  <Play size={24} className="text-white ml-1 filter drop-shadow-md" />
                </div>
                <span className="font-bold text-[15px]">{s.title}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="pt-32 pb-16">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-12 mb-20">
          <div className="space-y-6 md:col-span-1">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Disba Logo" className="h-12 w-auto" />
              <h1 className="text-3xl font-black tracking-tight">DISBA</h1>
            </div>
            <p className="text-gray-500 text-base">
              Music distribution simplified.
            </p>
            <div className="flex items-center gap-4 pt-4">
              <a href="#" className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"><Instagram size={20} /></a>
              <a href="#" className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"><Twitter size={20} /></a>
              <a href="#" className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"><Youtube size={20} /></a>
            </div>
          </div>

          <div>
            <h5 className="font-bold mb-8 text-lg">Distribution</h5>
            <ul className="space-y-5 text-gray-400 text-base">
              <li><a href="#pricing" className="hover:text-blue-400 transition-colors cursor-pointer">Pricing</a></li>
              <li><a href="#how-it-works" className="hover:text-blue-400 transition-colors cursor-pointer">How it works</a></li>
              <li><a href="#stores" className="hover:text-blue-400 transition-colors cursor-pointer">Stores</a></li>
            </ul>
          </div>

          <div>
            <h5 className="font-bold mb-8 text-lg">Services</h5>
            <ul className="space-y-5 text-gray-400 text-base">
              <li><a href="#" className="hover:text-blue-400 transition-colors cursor-pointer">Publishing</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors cursor-pointer">YouTube Network</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors cursor-pointer">SoundCloud Network</a></li>
            </ul>
          </div>

          <div>
            <h5 className="font-bold mb-8 text-lg">Company</h5>
            <ul className="space-y-5 text-gray-400 text-base">
              <li><a href="#" className="hover:text-blue-400 transition-colors cursor-pointer">About Us</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors cursor-pointer">Terms of Use</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors cursor-pointer">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors cursor-pointer">Contact</a></li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
          <p 
            onClick={onAdminClick}
            className="text-gray-600 text-sm cursor-pointer hover:text-blue-500 transition-colors font-medium"
          >
            © {new Date().getFullYear()} Disba Music. All rights reserved. {adminClickCount > 0 && `[${adminClickCount}/5]`}
          </p>
        </div>
      </footer>

      {/* Login / Signup Modal */}
      {showLogin && (
        <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0f1219] border border-white/10 w-full max-w-md p-8 rounded-3xl shadow-2xl relative">
            <button 
              onClick={() => setShowLogin(false)}
              className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>

            <div className="flex items-center gap-3 mb-8">
              <img src={logo} alt="Disba Logo" className="h-10 w-auto" />
              <h1 className="text-2xl font-black tracking-tight">DISBA</h1>
            </div>

            <h2 className="text-xl font-bold mb-6">
              {isSignUp ? 'Create your account' : 'Welcome back'}
            </h2>

            <form 
              onSubmit={(e) => { 
                e.preventDefault(); 
                onLogin(e.target.email.value, e.target.password.value, isSignUp); 
              }} 
              className="space-y-4"
            >
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Email address</label>
                <input name="email" type="email" placeholder="you@example.com" required className="w-full bg-black/40 border border-white/10 px-5 py-4 rounded-xl text-white outline-none focus:border-blue-500 transition-colors" />
              </div>
              <div className="mb-6">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Password</label>
                <input name="password" type="password" placeholder="••••••••" required className="w-full bg-black/40 border border-white/10 px-5 py-4 rounded-xl text-white outline-none focus:border-blue-500 transition-colors" />
              </div>
              
              <div className="flex flex-col gap-3 pt-2">
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20 active:scale-95">
                  {isSignUp ? 'Sign up' : 'Log in'}
                </button>
              </div>
            </form>

            <div className="mt-8 flex items-center gap-4 before:flex-1 before:h-px before:bg-white/10 after:flex-1 after:h-px after:bg-white/10">
              <span className="text-gray-500 text-sm font-bold">OR</span>
            </div>
            
            <button 
              onClick={onGoogleLogin}
              className="w-full mt-8 bg-white/5 border border-white/10 px-6 py-4 rounded-xl hover:bg-white/10 transition-all flex items-center justify-center gap-3 font-bold group"
            >
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5 group-hover:scale-110 transition-transform" />
              Continue with Google
            </button>

            <p className="text-center text-sm text-gray-500 mt-8 font-medium">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button type="button" onClick={() => setIsSignUp(!isSignUp)} className="text-blue-400 hover:text-white font-bold transition-colors">
                {isSignUp ? 'Log in' : 'Sign up'}
              </button>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;
