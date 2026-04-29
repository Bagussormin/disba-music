import { useState, useEffect, useEffectEvent } from 'react'
import { supabase } from './supabase'
import { 
  Disc3, LogOut, ChevronRight, Check, DollarSign, Globe, Activity, Globe2, ShieldCheck, 
  Trash2, Plus, Users, LayoutDashboard, Music, Package, Wallet, History,
  Zap, Mail, Globe as GlobeIcon, Sparkles as SparklesIcon, LogOut as LogOutIcon,
  Sparkles, UploadCloud, Pause, Play, Settings, ArrowRightCircle
} from 'lucide-react';
import LandingPage from './components/LandingPage';
import logo from './assets/logo-disba.png';

function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState({ role: 'artist', quota: 0, wallet_balance: 0, subscription_tier: 'free' })
  const [activeTab, setActiveTab] = useState('dashboard') 
  const [allReleases, setAllReleases] = useState([])
  const [allTransactions, setAllTransactions] = useState([])
  const [allRoyalties, setAllRoyalties] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [loadingData, setLoadingData] = useState(true)

  // Form States
  const [title, setTitle] = useState('')
  const [genre, setGenre] = useState('EDM')
  const [audioLink, setAudioLink] = useState('')
  const [coverFile, setCoverFile] = useState(null)
  const [explicit, setExplicit] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [splits, setSplits] = useState([{ email: '', percentage: 100 }])
  const [selectedTrack, setSelectedTrack] = useState(null)
  const [showSmartLink, setShowSmartLink] = useState(false)
  const [showLogin, setShowLogin] = useState(false) 
  const [isAdminPortal, setIsAdminPortal] = useState(false) 
  const [adminClickCount, setAdminClickCount] = useState(0)
  const [playingTrackId, setPlayingTrackId] = useState(null)
  const [selectedUserForManage, setSelectedUserForManage] = useState(null)

  // Auth States
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
  const syncSession = useEffectEvent(async (nextSession) => {
    setSession(nextSession)
    if (nextSession) {
      await fetchData(nextSession.user.id, nextSession.access_token)
    }
  })

  useEffect(() => {
    // Inject Midtrans Snap script
    const isProduction = import.meta.env.VITE_MIDTRANS_IS_PRODUCTION === 'true';
    const midtransScriptUrl = isProduction 
      ? 'https://app.midtrans.com/snap/snap.js' 
      : 'https://app.sandbox.midtrans.com/snap/snap.js';
    let scriptTag = document.createElement('script');
    scriptTag.src = midtransScriptUrl;
    scriptTag.setAttribute('data-client-key', import.meta.env.VITE_MIDTRANS_CLIENT_KEY || 'SB-Mid-client-YOUR_CLIENT_KEY');
    document.body.appendChild(scriptTag);

    supabase.auth.getSession().then(({ data: { session } }) => syncSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => syncSession(nextSession))
    
    // Secret Admin Path Detection (Hash and Query Param)
    const checkAdminPath = () => {
      const urlParams = new URLSearchParams(window.location.search);
      if (window.location.hash === '#admin' || urlParams.get('access') === 'admin') {
        setIsAdminPortal(true);
      } else {
        setIsAdminPortal(false);
      }
    };
    
    checkAdminPath();
    window.addEventListener('hashchange', checkAdminPath);
    
    return () => {
      subscription.unsubscribe();
      window.removeEventListener('hashchange', checkAdminPath);
    };
  }, [syncSession])

  const apiRequest = async (path, options = {}, accessToken = session?.access_token) => {
    if (!accessToken) {
      throw new Error('Sesi login tidak ditemukan.');
    }

    const headers = {
      Authorization: `Bearer ${accessToken}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {})
    };

    const response = await fetch(`${apiUrl}${path}`, {
      ...options,
      headers
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || 'Permintaan ke server gagal.');
    }

    return payload;
  }

  const fetchData = async (userId, accessToken = session?.access_token) => {
    setLoadingData(true)
    const { data: profData } = await supabase.from('profiles').select('*').eq('id', userId).single()
    const p = profData || { role: 'artist', quota: 0, wallet_balance: 0, subscription_tier: 'free' }

    setProfile(p)

    if (p.role === 'admin' && accessToken) {
      try {
        const dashboard = await apiRequest('/api/admin/dashboard', {}, accessToken)
        setAllUsers(dashboard.users || [])
        setAllReleases(dashboard.releases || [])
        setAllTransactions(dashboard.transactions || [])
        setAllRoyalties(dashboard.royalties || [])
      } catch (error) {
        alert(error.message)
        setAllUsers([])
        setAllReleases([])
        setAllTransactions([])
        setAllRoyalties([])
      }
    } else {
      const { data: releases } = await supabase.from('releases').select('*').eq('user_id', userId).order('created_at', { ascending: false })
      setAllReleases(releases || [])

      const { data: trans } = await supabase.from('transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false })
      setAllTransactions(trans || [])

      const { data: roys } = await supabase.from('royalties_ledger').select('*, releases(title)').eq('user_id', userId).order('created_at', { ascending: false })
      setAllRoyalties(roys || [])
    }

    if (p.role === 'admin' && activeTab === 'dashboard') setActiveTab('admin')
    setLoadingData(false)
  }

  const handleAuth = async (emailOrEvent, passwordArg, isSignUp) => {
    let loginEmail = email;
    let loginPassword = password;
    
    if (emailOrEvent && emailOrEvent.preventDefault) {
      emailOrEvent.preventDefault();
    } else if (typeof emailOrEvent === 'string') {
      loginEmail = emailOrEvent;
      loginPassword = passwordArg;
    }

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email: loginEmail, password: loginPassword })
      if (error) alert(error.message)
      else alert("Registration successful! Check your email to confirm.")
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword })
      if (error) alert(error.message)
      else if (isAdminPortal) setActiveTab('admin')
    }
  }

  const handleUpdateUser = async (userId, updates) => {
     try {
        await apiRequest(`/api/admin/users/${userId}`, {
          method: 'PATCH',
          body: JSON.stringify(updates)
        });
        alert("✅ User management updated successfully.");
        fetchData(session.user.id);
        setSelectedUserForManage(null);
     } catch (error) {
        alert("❌ Error updating user: " + error.message);
     }
  }

  const togglePlayback = (trackId) => {
    if (playingTrackId === trackId) setPlayingTrackId(null);
    else setPlayingTrackId(trackId);
  }

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) alert(error.message);
  }

  const handleMidtransPayment = async (purchaseType = 'subscription') => {
    try {
      const data = await apiRequest('/api/checkout', {
        method: 'POST',
        body: JSON.stringify({ purchase_type: purchaseType })
      });

      if (data.token && window.snap) {
        window.snap.pay(data.token, {
          onSuccess: function(){
            alert("✅ Pembayaran berhasil diproses. Status akun akan diperbarui setelah webhook dari Midtrans masuk.");
            fetchData(session.user.id);
          },
          onPending: function(){
            alert("⏳ Menunggu pembayaran Anda...");
          },
          onError: function(){
            alert("❌ Pembayaran gagal dilakukan.");
          },
          onClose: function(){
            console.log('Jendela snap ditutup sebelum menyelesaikan pembayaran.');
          }
        });
      } else {
        alert("Gagal menghubungi gateway Midtrans: " + (data.error || "Snap token missing."));
      }
    } catch (e) {
      alert("Checkout API Error: " + e.message + " (Apakah server backend sudah menyala?)");
    }
  }

  const requestWithdrawal = async () => {
    if (profile.wallet_balance < 50000) return alert("❌ Saldo minimal penarikan Rp 50.000")
    
    // Check if there is already a pending withdrawal
    const hasPending = allTransactions.some(t => t.type === 'withdrawal' && t.status === 'pending');
    if (hasPending) {
      return alert("❌ Anda masih memiliki pengajuan penarikan yang sedang diproses.");
    }

    const confirm = window.confirm(`Cairkan saldo sebesar Rp ${profile.wallet_balance.toLocaleString('id-ID')}?`)
    if (confirm) {
      try {
        await apiRequest('/api/withdrawals/request', { method: 'POST' });
        alert("💸 Pengajuan Berhasil. Mohon tunggu verifikasi admin.")
      } catch (error) {
        alert("❌ Gagal: " + error.message)
      }
      fetchData(session.user.id)
    }
  }

  const handleWithdrawalAction = async (transaction, action) => {
    try {
      await apiRequest(`/api/admin/withdrawals/${transaction.id}`, {
        method: 'POST',
        body: JSON.stringify({ action })
      });
      alert(action === 'approve' ? "✅ Withdrawal Approved Successfully" : "❌ Withdrawal Rejected. Balance refunded to artist.");
    } catch (error) {
      alert(error.message);
    }
    fetchData(session.user.id);
  }

  const handleAdminWithdrawal = async () => {
    if (profile.wallet_balance < 50000) return alert("❌ Admin balance too low for withdrawal.");
    const confirm = window.confirm(`Withdraw Admin Platform Fees: Rp ${profile.wallet_balance.toLocaleString('id-ID')}?`);
    if (confirm) {
       try {
         await apiRequest('/api/admin/platform-withdrawal', { method: 'POST' });
         alert("💸 Platform fees withdrawn successfully.");
       } catch (error) {
         alert("❌ " + error.message);
       }
       fetchData(session.user.id);
    }
  }

  const handleUploadLagu = async (e) => {
    e.preventDefault()
    if (profile.quota <= 0 && profile.role !== 'admin' && profile.subscription_tier !== 'pro') {
        return alert("❌ Kuota upload habis. Silakan beli slot upload seharga Rp 100.000 untuk melanjutkan.");
    }
    if (!title || !audioLink || !coverFile) return alert("Harap isi semua metadata (Judul, Audio, Cover)");
    
    setUploading(true)
    try {
      const fileName = `${Date.now()}.${coverFile.name.split('.').pop()}`
      const { error: upError } = await supabase.storage.from('rilisan').upload(`covers/${fileName}`, coverFile)
      if (upError) throw new Error("Gagal mengunggah cover: " + upError.message);
      
      const { data: { publicUrl } } = supabase.storage.from('rilisan').getPublicUrl(`covers/${fileName}`)

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

      alert(`🚀 Sukses! Karya masuk antrean dengan ISRC: ${result.isrc}`);
      setTitle(''); setAudioLink(''); setCoverFile(null);
      fetchData(session.user.id)
    } catch (err) { alert(err.message) } finally { setUploading(false) }
  }

  const handleAdminReject = async (track) => {
    try {
      await apiRequest(`/api/admin/releases/${track.id}/action`, {
        method: 'POST',
        body: JSON.stringify({ action: 'reject' })
      });
      alert('❌ Track Ditolak. Artist akan diberitahu.')
    } catch (error) {
      alert(error.message);
    }
    fetchData(session.user.id)
  }

  const handleAdminApprove = async (track) => {
    try {
      await apiRequest(`/api/admin/releases/${track.id}/action`, {
        method: 'POST',
        body: JSON.stringify({ action: 'approve' })
      });
      alert("✅ Track Approved & Live on Spotify Stores");
    } catch (error) {
      alert(error.message);
    }
    fetchData(session.user.id);
  }

  const handleAdminRoyaltyMock = async (track) => {
    try {
      const result = await apiRequest(`/api/admin/releases/${track.id}/royalties/mock`, {
        method: 'POST',
        body: JSON.stringify({ total_amount: 100000 })
      });
      alert(result.message);
    } catch (error) {
      alert(error.message);
    }
    fetchData(session.user.id);
  }

  if (!session) {
    // ADMIN SECRET LOGIN VIEW
    if (isAdminPortal) {
      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-6 font-sans">
          <div className="w-full max-w-md bg-white/[0.02] border border-white/[0.1] p-12 rounded-[3.5rem] backdrop-blur-3xl shadow-2xl">
            <div className="text-center mb-10">
               <ShieldCheck className="text-blue-500 mx-auto mb-4" size={48} />
               <h1 className="text-3xl font-black tracking-tighter text-white">ADMIN CONTROL</h1>
               <p className="text-gray-500 text-[10px] uppercase tracking-widest mt-2">Private Secure Gateway</p>
            </div>
            <form className="space-y-4" onSubmit={handleAuth}>
               <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-black/50 p-4 rounded-2xl border border-white/10 outline-none text-white focus:border-blue-500" placeholder="System Admin Email" />
               <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-black/50 p-4 rounded-2xl border border-white/10 outline-none text-white focus:border-blue-500" placeholder="Master Access Key" />
               <button type="submit" className="w-full bg-white text-black py-4 rounded-2xl font-black hover:bg-gray-200 transition-all">ENTER SYSTEM</button>
            </form>
            <p className="text-center text-[9px] text-gray-700 mt-8">DECRYPT_AES_256_ACTIVE</p>
          </div>
        </div>
      )
    }

    // REGULAR ARTIST LANDING VIEW
    return (
      <LandingPage 
        onLogin={handleAuth} 
        onGoogleLogin={handleGoogleLogin} 
        showLogin={showLogin} 
        setShowLogin={setShowLogin} 
        adminClickCount={adminClickCount}
        onAdminClick={() => {
          const newCount = adminClickCount + 1;
          if (newCount >= 5) {
            setIsAdminPortal(true);
            setAdminClickCount(0);
          } else {
            setAdminClickCount(newCount);
          }
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#07090E] text-white font-sans selection:bg-blue-500/30">
      <nav className="border-b border-white/[0.05] bg-black/20 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Disba Logo" className="h-10 w-auto" />
            <h2 className="text-2xl font-black tracking-tighter">DISBA</h2>
            <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ml-4 hidden md:block">
              {profile.role === 'admin' ? 'PLATFORM ADMIN' : (profile.subscription_tier === 'pro' ? 'ARTIST PRO' : 'ARTIST FREE')}
            </span>
          </div>
          
          <div className="flex bg-white/5 p-1 rounded-full scale-90 md:scale-100">
            {profile.role === 'admin' ? (
              <>
                {[
                  { id: 'admin', label: 'Overview', icon: ShieldCheck },
                  { id: 'users', label: 'Artists', icon: Globe },
                  { id: 'releases', label: 'Releases', icon: Music },
                  { id: 'ledger', label: 'Ledger', icon: DollarSign }
                ].map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-5 py-2 rounded-full text-[11px] font-bold transition-all flex items-center gap-2 ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-gray-500 hover:text-white'}`}>
                    <tab.icon size={14} /> {tab.label}
                  </button>
                ))}
              </>
            ) : (
              <>
                {[
                  { id: 'dashboard', label: 'Dashboard', icon: Activity },
                  { id: 'music', label: 'My Music', icon: Music },
                  { id: 'wallet', label: 'Wallet', icon: Wallet }
                ].map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-5 py-2 rounded-full text-[11px] font-bold transition-all flex items-center gap-2 ${activeTab === tab.id ? 'bg-white/10 text-white shadow-lg shadow-black/40' : 'text-gray-500 hover:text-white'}`}>
                    <tab.icon size={14} /> {tab.label}
                  </button>
                ))}
              </>
            )}
          </div>

          <button 
            onClick={() => supabase.auth.signOut()} 
            className="flex items-center gap-2 text-gray-400 hover:text-red-500 transition-all px-4 py-2 rounded-xl hover:bg-red-500/10 relative z-20 cursor-pointer border border-transparent hover:border-red-500/50"
          >
            <span className="text-[10px] font-bold uppercase tracking-widest hidden lg:block">Sign Out</span>
            <LogOut size={18} />
          </button>
        </div>
      </nav>

      {loadingData && <div className="h-1 bg-blue-600 w-full animate-pulse"></div>}

      <main className="max-w-7xl mx-auto p-6 py-12">
        {activeTab === 'dashboard' && (
          <div className="space-y-10">
            {/* Premium Header */}
            <div className="relative h-[400px] rounded-[3rem] overflow-hidden group shadow-2xl border border-white/5">
              <div className="w-full h-full scale-105 group-hover:scale-100 transition-transform duration-1000" style={{background: 'radial-gradient(ellipse at 60% 40%, #1e3a6e 0%, #0f2040 40%, #07090E 85%)'}}></div>
              <div className="absolute inset-0" style={{backgroundImage: 'radial-gradient(circle at 30% 60%, rgba(79,70,229,0.2) 0%, transparent 50%), radial-gradient(circle at 80% 30%, rgba(37,99,235,0.15) 0%, transparent 50%)', backgroundSize: '100% 100%'}}></div>
              <div className="absolute inset-0 bg-gradient-to-t from-[#07090E] via-[#07090E]/40 to-transparent"></div>
              <div className="absolute bottom-12 left-12 right-12 flex flex-col md:flex-row items-end justify-between gap-6">
                <div>
                  <h1 className="text-6xl font-black tracking-tighter mb-4 animate-in fade-in slide-in-from-bottom-4 duration-700">Good Evening, {profile.full_name || 'Artist'}</h1>
                  <p className="text-blue-400 font-bold tracking-[0.2em] text-xs uppercase flex items-center gap-2">
                    <Sparkles size={14} /> {profile.subscription_tier === 'pro' ? 'Premium Aggregator Active' : 'Free Tier Distribution'}
                  </p>
                </div>
                <div className="flex gap-4">
                  <button onClick={() => setActiveTab('music')} className="bg-white text-black px-8 py-4 rounded-2xl font-bold text-sm hover:scale-105 transition-all shadow-xl shadow-white/10">Release New Music</button>
                  {profile.subscription_tier !== 'pro' && (
                    <button onClick={handleMidtransPayment} className="bg-blue-600/20 text-blue-400 border border-blue-500/30 px-8 py-4 rounded-2xl font-bold text-sm backdrop-blur-md hover:bg-blue-600/30 transition-all">Go Pro</button>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid md:grid-cols-4 gap-6">
              {[
                { label: 'Total Streams', value: '1.2M', icon: Activity, color: 'text-blue-500', trend: '+12%' },
                { label: 'Royalties Earned', value: `Rp ${(profile.wallet_balance || 0).toLocaleString('id-ID')}`, icon: DollarSign, color: 'text-green-500', trend: 'Monthly' },
                { label: 'Global Reaches', value: '142', icon: Disc3, color: 'text-purple-500', trend: 'Countries' },
                { label: 'Active Releases', value: allReleases.length, icon: Music, color: 'text-indigo-500', trend: 'All Stores' }
              ].map((stat, i) => (
                <div key={i} className="bg-white/[0.02] border border-white/[0.05] p-8 rounded-[2.5rem] hover:bg-white/[0.04] transition-all group backdrop-blur-sm">
                  <div className={`${stat.color} bg-current/10 w-12 h-12 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                    <stat.icon size={24} />
                  </div>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">{stat.label}</p>
                  <div className="flex items-center justify-between">
                    <h3 className="text-3xl font-black">{stat.value}</h3>
                    <span className="text-[10px] bg-white/5 px-2 py-1 rounded text-gray-400">{stat.trend}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Visual Analytics Section */}
            <div className="grid lg:grid-cols-2 gap-8">
              <div className="bg-white/[0.02] border border-white/[0.05] p-10 rounded-[3rem] relative overflow-hidden group">
                <div className="flex items-center justify-between mb-10">
                  <h3 className="text-xl font-bold">Monthly Performance</h3>
                  <select className="bg-white/5 border-none text-[10px] font-bold px-3 py-1 rounded-full outline-none">
                    <option>Last 30 Days</option>
                  </select>
                </div>
                {/* Simulated SVG Graph */}
                <div className="h-48 flex items-end gap-2 px-2">
                  {[40, 70, 45, 90, 65, 80, 55, 100, 85, 75, 40, 60].map((h, i) => (
                    <div key={i} className="flex-1 bg-gradient-to-t from-blue-600/20 to-blue-500/60 rounded-t-lg group-hover:to-blue-400 transition-all duration-500 relative" style={{ height: `${h}%` }}>
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 text-[8px] font-bold text-blue-300">{h}k</div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-4 text-[10px] font-bold text-gray-600 uppercase tracking-widest px-2">
                  <span>Jan</span><span>Mar</span><span>Jun</span><span>Sep</span><span>Dec</span>
                </div>
              </div>

              <div className="bg-white/[0.02] border border-white/[0.05] p-10 rounded-[3rem]">
                <h3 className="text-xl font-bold mb-8">Store Distribution</h3>
                <div className="space-y-6">
                  {[
                    { name: 'Spotify', pct: 65, color: 'bg-green-500' },
                    { name: 'Apple Music', pct: 20, color: 'bg-red-400' },
                    { name: 'YouTube Music', pct: 10, color: 'bg-red-600' },
                    { name: 'Others', pct: 5, color: 'bg-blue-400' }
                  ].map((store, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between text-[11px] font-bold text-gray-500">
                        <span>{store.name}</span>
                        <span>{store.pct}%</span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <div className={`h-full ${store.color} transition-all duration-1000`} style={{ width: `${store.pct}%` }}></div>
                      </div>
</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'music' && (
          <div className="space-y-10">
            <div className="grid lg:grid-cols-12 gap-10">
              {/* Release Metadata Form */}
              <div className="lg:col-span-4">
                {(profile.quota > 0 || profile.subscription_tier === 'pro' || profile.role === 'admin') ? (
                  <div className="bg-white/[0.02] border border-white/[0.05] p-6 rounded-3xl">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="bg-blue-500/10 p-2 rounded-lg text-blue-400"><UploadCloud size={20} /></div>
                      <h3 className="font-bold">New Release</h3>
                    </div>
                    <form onSubmit={handleUploadLagu} className="space-y-5">
                      <div>
                        <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2 block">Track/Album Title</label>
                        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-black/30 border border-white/10 p-3 rounded-xl text-sm outline-none focus:border-blue-500" placeholder="e.g. Cerita Malam" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2 block">Genre</label>
                          <select value={genre} onChange={(e) => setGenre(e.target.value)} className="w-full bg-black/30 border border-white/10 p-3 rounded-xl text-[13px] outline-none">
                            <option>Pop</option><option>EDM</option><option>Hip Hop</option><option>Dangdut</option>
                          </select>
                        </div>
                        <div className="flex items-center mt-6">
                          <label className="text-[11px] flex items-center gap-2 cursor-pointer text-gray-400 font-bold">
                            <input type="checkbox" checked={explicit} onChange={(e) => setExplicit(e.target.checked)} className="accent-red-500 w-4 h-4 cursor-pointer" /> EXPLICIT LYRICS
                          </label>
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2 block">Audio WAV Link</label>
                        <input type="url" value={audioLink} onChange={(e) => setAudioLink(e.target.value)} className="w-full bg-blue-900/5 text-blue-300 border border-blue-900/30 p-3 rounded-xl text-xs font-mono outline-none focus:border-blue-500" placeholder="https://..." />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2 block">Cover Artwork (3000x3000px)</label>
                        <input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files[0])} className="w-full text-xs file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/20" />
                      </div>
                      <div className="bg-black/20 p-4 rounded-2xl border border-white/5 space-y-3">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Revenue Splits</label>
                          <button type="button" onClick={() => setSplits([...splits, { email: '', percentage: 0 }])} className="text-[9px] bg-blue-500/10 text-blue-400 px-2 py-1 rounded-md font-bold hover:bg-blue-500/20 transition-all">+ Add Collaborator</button>
                        </div>
                        {splits.map((s, i) => (
                          <div key={i} className="flex gap-2">
                            <input type="email" placeholder="Email" value={s.email} onChange={(e) => {
                              const newSplits = [...splits]; newSplits[i].email = e.target.value; setSplits(newSplits);
                            }} className="flex-1 bg-white/5 border border-white/5 p-2 rounded-lg text-[10px] outline-none" />
                            <input type="number" placeholder="%" value={s.percentage} onChange={(e) => {
                              const newSplits = [...splits]; newSplits[i].percentage = parseInt(e.target.value); setSplits(newSplits);
                            }} className="w-16 bg-white/5 border border-white/5 p-2 rounded-lg text-[10px] outline-none" />
                          </div>
                        ))}
                      </div>
                      <button type="submit" disabled={uploading} className="w-full bg-white text-black hover:bg-gray-200 py-4 rounded-xl font-bold text-sm transition-all mt-4 flex items-center justify-center gap-2">
                        {uploading ? 'Publishing...' : <><Sparkles size={16}/> Publish to Stores</>}
                      </button>
                    </form>
                  </div>
                ) : (
                  <div className="bg-gradient-to-br from-indigo-900/30 to-blue-900/10 border border-blue-500/30 p-8 rounded-3xl text-center relative overflow-hidden">
                    <h3 className="text-2xl font-black mb-2">Upgrade to Pro</h3>
                    <p className="text-gray-400 text-xs mb-8">Distribute UNLIMITED tracks and keep 100% earnings.</p>
                    <button onClick={handleMidtransPayment} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg transition-all">Pay with Midtrans (QRIS)</button>
                  </div>
                )}
              </div>

              {/* Discography Column */}
              <div className="lg:col-span-8 space-y-6">
                <h3 className="text-xl font-bold">Your Discography</h3>
                {allReleases.length === 0 ? (
                  <div className="p-16 border border-dashed border-white/10 rounded-[3rem] text-center">
                    <Disc3 className="mx-auto text-gray-700 mb-6 animate-spin" size={48} />
                    <p className="text-gray-500 text-sm">Start your journey today by releasing your first masterpiece.</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {allReleases.map(track => (
                      <div key={track.id} className="bg-white/[0.02] border border-white/[0.05] p-4 flex items-center gap-6 rounded-2xl hover:bg-white/[0.04] transition-all">
                        <div className="relative group/cover w-20 h-20 shrink-0">
                          <img src={track.cover_url} className="w-full h-full rounded-xl object-cover shadow-lg" alt="cover" />
                          <button 
                            onClick={() => togglePlayback(track.id)}
                            className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/cover:opacity-100 transition-all rounded-xl"
                          >
                            {playingTrackId === track.id ? <Pause className="text-white fill-current" /> : <Play className="text-white fill-current" />}
                          </button>
                          {playingTrackId === track.id && (
                            <audio 
                              src={track.audio_url} 
                              autoPlay 
                              onEnded={() => setPlayingTrackId(null)} 
                              className="hidden"
                            />
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-lg">{track.title}</h4>
                          <p className="text-xs text-gray-500 font-mono mb-2">{track.isrc || 'ISRC Processing...'}</p>
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className={`text-[9px] font-bold px-3 py-1 rounded-full uppercase ${track.status === 'released' ? 'bg-green-500/10 text-green-400' : track.status === 'rejected' ? 'bg-red-500/10 text-red-400' : 'bg-yellow-500/10 text-yellow-500'}`}>
                              {track.status === 'released' ? '✓ Live in Stores' : track.status === 'rejected' ? '✗ Ditolak' : '⏳ In Review'}
                            </span>
                            {track.status === 'released' && (
                              <button
                                onClick={() => { setSelectedTrack(track); setShowSmartLink(true); }}
                                className="text-[9px] font-bold px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-all uppercase tracking-wide"
                              >
                                Smart Link
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'wallet' && (
          <div className="space-y-12">
            <div className="grid lg:grid-cols-12 gap-10">
              <div className="lg:col-span-5">
                <div className="bg-gradient-to-br from-green-900/40 via-black to-emerald-900/10 border border-green-500/20 p-8 rounded-[2rem] shadow-2xl">
                  <DollarSign className="text-green-500 mb-6" size={24} />
                  <p className="text-gray-400 text-sm font-bold uppercase tracking-widest mb-2">Available Balance</p>
                  <h1 className="text-5xl font-black text-white tracking-tighter mb-8">Rp {(profile.wallet_balance || 0).toLocaleString('id-ID')}</h1>
                  <button onClick={requestWithdrawal} className="w-full bg-white text-black font-bold py-4 rounded-xl shadow-xl hover:bg-gray-100 transition-all">Withdraw Funds</button>
                </div>
              </div>
              <div className="lg:col-span-7">
                <h3 className="text-xl font-bold mb-6">Ledger & History</h3>
                <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl overflow-hidden">
                  {allTransactions.length === 0 ? (<div className="p-10 text-center text-gray-500 text-sm">No transactions yet.</div>) : (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/[0.05] text-[10px] uppercase tracking-widest text-gray-500">
                          <th className="p-4 font-normal">Date</th>
                          <th className="p-4 font-normal">Type</th>
                          <th className="p-4 font-normal">Status</th>
                          <th className="p-4 font-normal text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {allTransactions.map(t => {
                          const isDebit = t.type === 'withdrawal';
                          const typeLabel = { subscription_payment: 'Subscription', quota_purchase: 'Beli Slot', royalty_dist: 'Royalti', withdrawal: 'Penarikan', admin_withdrawal: 'Admin Withdraw' }[t.type] || t.type;
                          return (
                            <tr key={t.id} className="border-b border-white/[0.02] hover:bg-white/[0.01] transition-colors">
                              <td className="p-4 text-gray-400 font-mono text-xs">{new Date(t.created_at).toLocaleDateString('id-ID')}</td>
                              <td className="p-4 text-xs font-bold text-gray-300">{typeLabel}</td>
                              <td className="p-4">
                                <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${t.status === 'success' ? 'bg-green-500/10 text-green-400' : t.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-red-500/10 text-red-400'}`}>
                                  {t.status}
                                </span>
                              </td>
                              <td className={`p-4 text-right font-mono font-bold ${isDebit ? 'text-red-400' : 'text-green-400'}`}>
                                {isDebit ? '-' : '+'}Rp {(t.amount || 0).toLocaleString('id-ID')}
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
            <div className="mt-12">
                <h3 className="text-xl font-bold mb-6">Royalty Reports</h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {allRoyalties.length === 0 ? <div className="text-gray-500 text-sm">No royalty reports yet.</div> : allRoyalties.map((r, i) => (
                    <div key={i} className="bg-white/[0.02] border border-white/[0.05] p-6 rounded-3xl flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">{r.releases?.title || 'Unknown'}</p>
                        <h4 className="text-lg font-black text-green-400">+ Rp {(r.amount_earned || 0).toLocaleString('id-ID')}</h4>
                        <p className="text-[9px] text-gray-600 mt-1">{new Date(r.report_month || r.created_at).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</p>
                      </div>
                      <span className="text-[9px] bg-green-500/10 text-green-500 px-2 py-1 rounded font-bold uppercase">PAID</span>
                    </div>
                  ))}
                </div>
            </div>
          </div>
        )}

        {/* ADMIN OVERVIEW TAB */}
        {activeTab === 'admin' && profile.role === 'admin' && (
           <div className="space-y-10">
             <div className="flex items-center justify-between">
                <div>
                   <h1 className="text-4xl font-black tracking-tighter">Command Center</h1>
                   <p className="text-gray-500 text-xs mt-1 uppercase tracking-widest font-bold">Platform Wide Oversight</p>
                </div>
                <div className="flex items-center gap-2">
                   <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                   <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">System Healthy</span>
                </div>
             </div>

             <div className="grid md:grid-cols-4 gap-6">
                {[
                  { label: 'Total Artists', value: allUsers.filter(u => u.role === 'artist').length, icon: Globe, color: 'text-blue-500' },
                  { label: 'Active Releases', value: allReleases.length, icon: Music, color: 'text-purple-500' },
                  { label: 'Platform Balance', value: `Rp ${allUsers.reduce((sum, u) => sum + (u.wallet_balance || 0), 0).toLocaleString('id-ID')}`, icon: DollarSign, color: 'text-green-500' },
                  { label: 'Pending Payouts', value: allTransactions.filter(t => t.type === 'withdrawal' && t.status === 'pending').length, icon: Activity, color: 'text-orange-500' }
                ].map((stat, i) => (
                  <div key={i} className="bg-white/[0.02] border border-white/[0.05] p-8 rounded-[2.5rem] backdrop-blur-md">
                     <div className={`${stat.color} bg-current/10 w-10 h-10 rounded-2xl flex items-center justify-center mb-6`}>
                        <stat.icon size={20} />
                     </div>
                     <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">{stat.label}</p>
                     <h3 className="text-2xl font-black">{stat.value}</h3>
                  </div>
                ))}
             </div>

             <div className="bg-gradient-to-br from-blue-900/20 to-transparent border border-white/[0.05] p-10 rounded-[3rem]">
                <div className="flex items-center justify-between mb-8">
                   <h3 className="text-xl font-bold">Recent Platform Activity</h3>
                   <button onClick={() => setActiveTab('ledger')} className="text-[10px] font-bold text-blue-400 uppercase tracking-widest hover:text-blue-300 transition-colors">View Master Logs →</button>
                </div>
                <div className="space-y-4">
                   {allTransactions.slice(0, 5).map((t, i) => (
                     <div key={i} className="flex items-center justify-between p-4 bg-white/[0.02] rounded-2xl border border-white/[0.02]">
                        <div className="flex items-center gap-4">
                           <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                           <p className="text-xs">{t.type.toUpperCase()} - User {t.user_id}</p>
                        </div>
                        <p className="text-xs font-mono font-bold">Rp {t.amount.toLocaleString('id-ID')}</p>
                     </div>
                   ))}
                </div>
             </div>
           </div>
        )}

        {/* ADMIN USERS TAB */}
        {activeTab === 'users' && profile.role === 'admin' && (
          <div className="space-y-8">
             <div className="flex items-center justify-between">
                <h2 className="text-3xl font-black tracking-tighter">Artist Management</h2>
                <div className="bg-white/5 px-4 py-2 rounded-xl text-xs font-bold text-gray-400">{allUsers.length} Users Found</div>
             </div>

             <div className="bg-white/[0.02] border border-white/[0.05] rounded-[3rem] overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/[0.05] text-[10px] uppercase font-bold text-gray-500">
                      <th className="p-6">Artist / Email</th>
                      <th className="p-6">Status</th>
                      <th className="p-6">Wallet</th>
                      <th className="p-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                  {allUsers.map(user => (
                    <tr key={user.id} className="border-b border-white/[0.01] hover:bg-white/[0.02] transition-colors">
                      <td className="p-6">
                         <div className="font-bold">{user.full_name || 'Incognito Artist'}</div>
                         <div className="text-[10px] text-gray-500 font-mono italic">{user.email || 'no-email@link.com'}</div>
                      </td>
                      <td className="p-6">
                         <span className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase ${user.subscription_tier === 'pro' ? 'bg-blue-500/10 text-blue-400' : 'bg-white/5 text-gray-500'}`}>
                           {user.subscription_tier === 'pro' ? 'PRO' : 'FREE'}
                         </span>
                         {user.role === 'admin' && <span className="ml-2 px-2 py-1 bg-purple-500/10 text-purple-400 rounded-md text-[9px] font-bold uppercase tracking-widest">ADMIN</span>}
                      </td>
                      <td className="p-6 font-mono font-bold text-green-400">Rp {(user.wallet_balance || 0).toLocaleString('id-ID')}</td>
                      <td className="p-6 text-right">
                         <button 
                           onClick={() => setSelectedUserForManage(user)}
                           className="text-[10px] font-bold text-blue-400 hover:text-white uppercase transition-colors flex items-center gap-2 ml-auto"
                         >
                           <Settings size={12} /> Manage Access
                         </button>
                      </td>
                    </tr>
                  ))}
                  </tbody>
                </table>
             </div>
          </div>
        )}

        {/* ADMIN RELEASES TAB (Unified Pipeline) */}
        {activeTab === 'releases' && profile.role === 'admin' && (
          <div className="space-y-8">
             <div className="flex items-center justify-between">
               <h2 className="text-3xl font-black tracking-tighter">Global Pipeline</h2>
               <div className="flex items-center gap-3">
                 <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                 <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{allReleases.filter(r => r.status === 'pending').length} Pending Review</span>
               </div>
             </div>
             <div className="grid gap-4">
                  {allReleases.length === 0 ? (
                    <div className="p-16 border border-dashed border-white/10 rounded-[3rem] text-center">
                      <Music className="mx-auto text-gray-700 mb-4" size={40} />
                      <p className="text-gray-500 text-sm">Belum ada release dari artis manapun.</p>
                    </div>
                  ) : allReleases.map(track => (
                    <div key={track.id} className="flex flex-col md:flex-row gap-6 bg-white/[0.02] p-6 border border-white/[0.05] rounded-[2rem] items-center">
                      <div className="relative group/cover w-20 h-20 shrink-0">
                        <img src={track.cover_url} className="w-full h-full rounded-2xl object-cover shadow-lg" alt="cover"/>
                        <button 
                          onClick={() => togglePlayback(track.id)}
                          className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/cover:opacity-100 transition-all rounded-2xl"
                        >
                          {playingTrackId === track.id ? <Pause className="text-white fill-current" /> : <Play className="text-white fill-current" />}
                        </button>
                        {playingTrackId === track.id && (
                          <audio 
                            src={track.audio_url} 
                            autoPlay 
                            onEnded={() => setPlayingTrackId(null)} 
                            className="hidden"
                          />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <strong className="block font-bold text-lg">{track.title}</strong>
                          {track.status === 'ready_to_distribute' && (
                            <span className="bg-blue-600 text-[8px] font-bold px-2 py-0.5 rounded-full">PAID</span>
                          )}
                        </div>
                        <div className="text-[10px] font-mono text-gray-500 space-y-1 uppercase tracking-widest">
                           <div>Artist ID: {track.user_id.slice(0,8)}... | GENRE: {track.genre}</div>
                           {track.isrc && <div className="text-blue-400">ISRC: {track.isrc} | UPC: {track.upc}</div>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {track.status === 'released' ? (
                          <div className="px-6 py-3 bg-green-500/10 border border-green-500/20 text-green-500 rounded-xl text-[10px] font-bold uppercase tracking-widest">Live in Stores</div>
                        ) : (
                          <>
                             <button onClick={() => handleAdminApprove(track)} className="bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded-xl text-[10px] font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-900/20">
                                <Check size={14} /> Approve & Release
                             </button>
                             <button onClick={() => handleAdminReject(track)} className="bg-red-500/10 hover:bg-red-500/20 px-6 py-3 rounded-xl text-[10px] font-bold text-red-400 transition-all uppercase">Reject</button>
                          </>
                        )}
                        <button onClick={() => handleAdminRoyaltyMock(track)} title="Simulate Royalty Distribution" className="bg-white/5 hover:bg-white/10 px-4 py-3 rounded-xl text-[10px] font-bold text-gray-500 transition-all uppercase flex items-center gap-1"><DollarSign size={14}/> Royalti</button>
                      </div>
                    </div>
                  ))}
                </div>
          </div>
        )}

        {/* ADMIN LEDGER TAB (Financials) */}
        {activeTab === 'ledger' && profile.role === 'admin' && (
           <div className="space-y-8">
              <div className="flex items-center justify-between">
                 <h2 className="text-3xl font-black tracking-tighter">Financial Oversight</h2>
                 <button onClick={handleAdminWithdrawal} className="bg-green-600 hover:bg-green-500 text-white px-8 py-3 rounded-xl font-bold text-xs transition-all shadow-lg shadow-green-900/20">Withdraw Platform Fees</button>
              </div>

              <div className="grid lg:grid-cols-2 gap-8">
                 <div className="space-y-6">
                    <h3 className="text-xl font-bold flex items-center gap-2"><ArrowRightCircle className="text-blue-400" /> Pending Withdrawals</h3>
                    <div className="space-y-4">
                       {allTransactions.filter(t => t.type === 'withdrawal' && t.status === 'pending').length === 0 ? (
                         <div className="p-12 text-center bg-white/[0.02] border border-white/[0.05] rounded-[2rem] text-gray-600 text-sm">No pending requests</div>
                       ) : (
                         allTransactions.filter(t => t.type === 'withdrawal' && t.status === 'pending').map(t => (
                           <div key={t.id} className="bg-white/[0.02] border border-white/[0.05] p-6 rounded-3xl flex items-center justify-between">
                              <div>
                                 <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">User: {t.user_id.slice(0,8)}...</p>
                                 <h4 className="text-xl font-black">Rp {t.amount.toLocaleString('id-ID')}</h4>
                              </div>
                              <div className="flex gap-2">
                                 <button onClick={() => handleWithdrawalAction(t, 'approve')} className="bg-green-600/10 text-green-500 px-4 py-2 rounded-lg text-[10px] font-bold uppercase hover:bg-green-600/20">Approve</button>
                                 <button onClick={() => handleWithdrawalAction(t, 'reject')} className="bg-red-600/10 text-red-500 px-4 py-2 rounded-lg text-[10px] font-bold uppercase hover:bg-red-600/20">Reject</button>
                              </div>
                           </div>
                         ))
                       )}
                    </div>
                 </div>

                 <div className="space-y-6">
                    <h3 className="text-xl font-bold flex items-center gap-2"><Sparkles className="text-blue-400" /> Platform Revenue</h3>
                    <div className="bg-[#12161D] border border-white/[0.05] p-10 rounded-[3rem] relative overflow-hidden">
                       <DollarSign className="absolute -top-10 -right-10 text-white/5" size={200} />
                       <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-2">Available to Withdraw</p>
                       <h2 className="text-5xl font-black text-white tracking-tighter mb-8">Rp {(profile.wallet_balance || 0).toLocaleString('id-ID')}</h2>
                       <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-[10px] text-gray-400 leading-relaxed uppercase tracking-widest">
                          Accumulated fees from artist release payouts (20%). Secure your earnings through Midtrans Payouts.
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        )}
        {/* Smart Link Modal */}
        {showSmartLink && selectedTrack && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-3xl bg-black/60">
            <div className="bg-[#0D1117] border border-white/10 w-full max-w-sm rounded-[3rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
               <div className="relative h-64">
                 <img src={selectedTrack.cover_url} className="w-full h-full object-cover" />
                 <button onClick={() => setShowSmartLink(false)} className="absolute top-6 right-6 bg-black/40 backdrop-blur-md p-2 rounded-full hover:bg-black/60 transition-all">
                   <LogOut size={16} className="rotate-180" />
                 </button>
               </div>
               <div className="p-8 text-center">
                 <h2 className="text-2xl font-black mb-1">{selectedTrack.title}</h2>
                 <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-8">{profile.full_name || 'Original Artist'}</p>
                 
                 <div className="space-y-3">
                   {[
                     { name: 'Spotify', icon: Music, color: 'hover:bg-[#1DB954]/20 hover:text-[#1DB954]' },
                     { name: 'Apple Music', icon: Disc3, color: 'hover:bg-[#FA243C]/20 hover:text-[#FA243C]' },
                     { name: 'YouTube Music', icon: Activity, color: 'hover:bg-[#FF0000]/20 hover:text-[#FF0000]' }
                   ].map((store, i) => (
                     <button key={i} className={`w-full bg-white/5 border border-white/5 p-4 rounded-2xl flex items-center justify-between group transition-all ${store.color}`}>
                       <div className="flex items-center gap-3">
                         <store.icon size={20} />
                         <span className="font-bold text-sm">{store.name}</span>
                       </div>
                       <ChevronRight size={16} className="opacity-40 group-hover:opacity-100 transition-opacity" />
                     </button>
                   ))}
                 </div>
                 
                 <button onClick={() => { navigator.clipboard.writeText(window.location.href); alert("Smart Link Copied!"); }} className="mt-8 text-[11px] font-bold text-blue-400 uppercase tracking-widest hover:text-blue-300 transition-colors">
                   Copy Shareable Link
                 </button>
               </div>
            </div>
          </div>
        )}

        {/* MANAGE ACCESS MODAL */}
        {selectedUserForManage && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 backdrop-blur-3xl bg-black/80">
            <div className="bg-[#0D1117] border border-white/10 w-full max-w-lg rounded-[3rem] p-12 shadow-2xl animate-in zoom-in-95 duration-300">
               <div className="flex items-center justify-between mb-10">
                  <div>
                    <h3 className="text-3xl font-black tracking-tighter">Manage Permission</h3>
                    <p className="text-gray-500 text-xs mt-1 uppercase font-bold tracking-widest">{selectedUserForManage.email}</p>
                  </div>
                  <button onClick={() => setSelectedUserForManage(null)} className="text-gray-500 hover:text-white uppercase text-[10px] font-bold bg-white/5 px-4 py-2 rounded-xl">Close</button>
               </div>

               <div className="space-y-8">
                  <div className="grid grid-cols-1 gap-4">
                     <div className="space-y-3">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Subscription Tier</label>
                        <select 
                          value={selectedUserForManage.subscription_tier} 
                          onChange={(e) => handleUpdateUser(selectedUserForManage.id, { subscription_tier: e.target.value })}
                          className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none focus:border-blue-500 transition-all font-bold text-sm"
                        >
                           <option value="free" className="bg-black">Free Plan</option>
                           <option value="pro" className="bg-black">Premium Pro</option>
                        </select>
                     </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Upload Quota Allocation</label>
                    <div className="flex items-center gap-4">
                       <button 
                         onClick={() => handleUpdateUser(selectedUserForManage.id, { quota: (selectedUserForManage.quota || 0) + 1 })}
                         className="flex-1 bg-blue-600 hover:bg-blue-500 py-4 rounded-2xl font-black text-xs transition-all shadow-lg shadow-blue-900/20"
                       >
                         GRANT +1 SLOT
                       </button>
                       <button 
                         onClick={() => handleUpdateUser(selectedUserForManage.id, { quota: Math.max(0, (selectedUserForManage.quota || 0) - 1) })}
                         className="flex-1 bg-white/5 hover:bg-white/10 py-4 rounded-2xl font-black text-xs transition-all text-gray-500"
                       >
                         REVOKE SLOT
                       </button>
                    </div>
                    <p className="text-center text-[10px] text-gray-600 font-bold uppercase tracking-widest">Current Quota: {selectedUserForManage.quota} Slots</p>
                  </div>

                  <div className="pt-6 border-t border-white/5">
                     <div className="flex items-center gap-3 text-red-500/40 p-4 rounded-2xl border border-red-500/10 bg-red-500/5">
                        <ShieldCheck size={20} />
                        <p className="text-[10px] font-bold uppercase tracking-tighter leading-relaxed">Warning: Changes to platform roles or subscription status impact revenue sharing and access privileges immediately.</p>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
