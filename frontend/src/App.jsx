import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { supabase } from './supabase';
import AppNavigation from './components/dashboard/AppNavigation';
import ConfirmDialog from './components/ui/ConfirmDialog';
import PromptDialog from './components/ui/PromptDialog';
import ToastViewport from './components/ui/ToastViewport';
import { buildReleaseShareUrl } from './utils/shareLinks';

const LandingPage = lazy(() => import('./components/LandingPage'));
const AdminPortalLogin = lazy(() => import('./components/dashboard/AdminPortalLogin'));
const ArtistDashboard = lazy(() => import('./components/dashboard/ArtistDashboard'));
const AdminDashboard = lazy(() => import('./components/dashboard/AdminDashboard'));
const ManageUserModal = lazy(() => import('./components/dashboard/ManageUserModal'));
const SmartLinkModal = lazy(() => import('./components/dashboard/SmartLinkModal'));
const PublicReleasePage = lazy(() => import('./components/PublicReleasePage'));

const DEFAULT_PROFILE = {
  role: 'artist',
  quota: 0,
  wallet_balance: 0,
  subscription_tier: 'inactive'
};

function SuspenseFallback({ fullScreen = false }) {
  return (
    <div className={`${fullScreen ? 'min-h-screen' : 'min-h-[240px]'} flex items-center justify-center bg-[#07090E] px-6 text-white`}>
      <div className="space-y-3 text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-blue-500/30 border-t-blue-400" />
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-gray-500">Loading Disba</p>
      </div>
    </div>
  );
}

function App() {
  const location = useLocation();
  const isPublicShareRoute = location.pathname.startsWith('/share/');

  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [allReleases, setAllReleases] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]);
  const [allRoyalties, setAllRoyalties] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [allDeliveryQueue, setAllDeliveryQueue] = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [isAdminPortal, setIsAdminPortal] = useState(false);
  const [adminClickCount, setAdminClickCount] = useState(0);
  const [playingTrackId, setPlayingTrackId] = useState(null);
  const [selectedUserForManage, setSelectedUserForManage] = useState(null);
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [signingOut, setSigningOut] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [toasts, setToasts] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [promptDialog, setPromptDialog] = useState(null);

  const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001' : '');

  const pushToast = useCallback(({ title, description, variant = 'info' }) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((current) => [...current, { id, title, description, variant }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 4500);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const requestConfirm = useCallback((options) => (
    new Promise((resolve) => {
      setConfirmDialog({ ...options, resolve });
    })
  ), []);

  const closeConfirm = useCallback((value) => {
    setConfirmDialog((current) => {
      current?.resolve?.(value);
      return null;
    });
  }, []);

  const requestPrompt = useCallback((options) => (
    new Promise((resolve) => {
      setPromptDialog({ ...options, resolve });
    })
  ), []);

  const closePrompt = useCallback((value) => {
    setPromptDialog((current) => {
      current?.resolve?.(value);
      return null;
    });
  }, []);

  const apiRequest = useCallback(async (path, options = {}, accessToken = session?.access_token) => {
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
  }, [apiUrl, session?.access_token]);

  const fetchData = useCallback(async (userId, accessToken = session?.access_token) => {
    setLoadingData(true);

    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('Failed to load profile:', profileError.message);
      }

      const nextProfile = profileData || DEFAULT_PROFILE;
      setProfile(nextProfile);

      if (nextProfile.role === 'admin' && accessToken) {
        const dashboard = await apiRequest('/api/admin/dashboard', {}, accessToken);
        setAllUsers(dashboard.users || []);
        setAllReleases(dashboard.releases || []);
        setAllTransactions(dashboard.transactions || []);
        setAllRoyalties(dashboard.royalties || []);
        setAllDeliveryQueue(dashboard.deliveryQueue || []);
        setAllEvents(dashboard.events || []);
        setActiveTab((current) => (current === 'dashboard' ? 'admin' : current));
      } else {
        const [{ data: releases }, { data: transactions }, { data: royalties }] = await Promise.all([
          supabase.from('releases').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
          supabase.from('transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
          supabase.from('royalties_ledger').select('*, releases(title)').eq('user_id', userId).order('created_at', { ascending: false })
        ]);

        setAllReleases(releases || []);
        setAllTransactions(transactions || []);
        setAllRoyalties(royalties || []);
        setAllUsers([]);
        setAllDeliveryQueue([]);
        setAllEvents([]);
      }
    } catch (error) {
      pushToast({
        title: 'Gagal memuat dashboard',
        description: error.message,
        variant: 'error'
      });
      setAllUsers([]);
      setAllReleases([]);
      setAllTransactions([]);
      setAllRoyalties([]);
      setAllDeliveryQueue([]);
      setAllEvents([]);
    } finally {
      setLoadingData(false);
    }
  }, [apiRequest, pushToast, session?.access_token]);

  const syncSession = useCallback(async (nextSession) => {
    setSession(nextSession);
    if (nextSession) {
      await fetchData(nextSession.user.id, nextSession.access_token);
    }
  }, [fetchData]);

  useEffect(() => {
    if (isPublicShareRoute) {
      return undefined;
    }

    supabase.auth.getSession().then(({ data: { session: nextSession } }) => syncSession(nextSession));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => syncSession(nextSession));

    const checkAdminPath = () => {
      const urlParams = new URLSearchParams(window.location.search);
      setIsAdminPortal(window.location.hash === '#admin' || urlParams.get('access') === 'admin');
    };

    checkAdminPath();
    window.addEventListener('hashchange', checkAdminPath);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('hashchange', checkAdminPath);
    };
  }, [isPublicShareRoute, syncSession]);

  const handleAuth = async (emailOrEvent, passwordArg, isSignUp) => {
    let loginEmail = email;
    let loginPassword = password;

    if (emailOrEvent && emailOrEvent.preventDefault) {
      emailOrEvent.preventDefault();
    } else if (typeof emailOrEvent === 'string') {
      loginEmail = emailOrEvent;
      loginPassword = passwordArg;
    }

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email: loginEmail, password: loginPassword });
        if (error) throw error;

        pushToast({
          title: 'Registrasi berhasil',
          description: 'Cek inbox email untuk melakukan konfirmasi akun.',
          variant: 'success'
        });
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
      if (error) throw error;

      setShowLogin(false);
      if (isAdminPortal) {
        setActiveTab('admin');
      }
    } catch (error) {
      pushToast({
        title: isSignUp ? 'Registrasi gagal' : 'Login gagal',
        description: error.message,
        variant: 'error'
      });
    }
  };

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });

    if (error) {
      pushToast({
        title: 'Google login gagal',
        description: error.message,
        variant: 'error'
      });
    }
  };

  const handleSignOut = async () => {
    if (signingOut) return;

    try {
      setSigningOut(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setSession(null);
      setProfile(DEFAULT_PROFILE);
      setAllReleases([]);
      setAllTransactions([]);
      setAllRoyalties([]);
      setAllUsers([]);
      setAllDeliveryQueue([]);
      setAllEvents([]);
      setActiveTab('dashboard');
      setSelectedTrack(null);
      setSelectedUserForManage(null);
      setPlayingTrackId(null);
      setShowLogin(false);
    } catch (error) {
      pushToast({
        title: 'Gagal logout',
        description: error.message || 'Coba lagi beberapa saat lagi.',
        variant: 'error'
      });
    } finally {
      setSigningOut(false);
    }
  };

  const handleRequestWithdrawal = async () => {
    if ((profile.wallet_balance || 0) < 50000) {
      pushToast({
        title: 'Saldo belum cukup',
        description: 'Minimal penarikan adalah Rp 50.000.',
        variant: 'error'
      });
      return;
    }

    const hasPending = allTransactions.some((transaction) => transaction.type === 'withdrawal' && transaction.status === 'pending');
    if (hasPending) {
      pushToast({
        title: 'Masih ada withdrawal berjalan',
        description: 'Tunggu pengajuan sebelumnya selesai diproses terlebih dahulu.',
        variant: 'error'
      });
      return;
    }

    const confirmed = await requestConfirm({
      title: 'Ajukan withdrawal sekarang?',
      description: `Saldo sebesar Rp ${(profile.wallet_balance || 0).toLocaleString('id-ID')} akan diajukan ke admin untuk diverifikasi.`,
      confirmLabel: 'Ajukan Withdrawal'
    });

    if (!confirmed) return;

    try {
      await apiRequest('/api/withdrawals/request', { method: 'POST' });
      pushToast({
        title: 'Withdrawal diajukan',
        description: 'Permintaan payout berhasil dikirim ke admin.',
        variant: 'success'
      });
      await fetchData(session.user.id);
    } catch (error) {
      pushToast({
        title: 'Gagal mengajukan withdrawal',
        description: error.message,
        variant: 'error'
      });
    }
  };

  const handleUpdateUser = async (userId, updates) => {
    try {
      await apiRequest(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
      });

      pushToast({
        title: 'User diperbarui',
        description: 'Perubahan akses artist berhasil disimpan.',
        variant: 'success'
      });
      setSelectedUserForManage(null);
      await fetchData(session.user.id);
    } catch (error) {
      pushToast({
        title: 'Gagal memperbarui user',
        description: error.message,
        variant: 'error'
      });
    }
  };

  const handleOpenSmartLink = (track) => {
    if (track.status !== 'released') {
      pushToast({
        title: 'Smart link belum aktif',
        description: 'Share page publik hanya tersedia setelah release disetujui.',
        variant: 'info'
      });
      return;
    }

    setSelectedTrack({
      ...track,
      artistName: profile.artist_stage_name || profile.full_name || 'Original Artist'
    });
  };

  const selectedTrackShareUrl = useMemo(() => {
    if (!selectedTrack?.id || typeof window === 'undefined') return '';
    return buildReleaseShareUrl(selectedTrack.id, window.location.origin);
  }, [selectedTrack]);

  const handleCopySmartLink = async () => {
    if (!selectedTrackShareUrl) return;

    try {
      await navigator.clipboard.writeText(selectedTrackShareUrl);
      pushToast({
        title: 'Smart link disalin',
        description: 'Tautan release publik siap dibagikan.',
        variant: 'success'
      });
    } catch {
      pushToast({
        title: 'Gagal menyalin tautan',
        description: 'Browser tidak mengizinkan clipboard saat ini.',
        variant: 'error'
      });
    }
  };

  const authenticatedApp = (
    <div className="min-h-screen bg-[#07090E] font-sans text-white selection:bg-blue-500/30">
      <AppNavigation
        profile={profile}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onSignOut={handleSignOut}
        signingOut={signingOut}
      />

      {loadingData && <div className="h-1 w-full animate-pulse bg-blue-600" />}

      <main className="mx-auto max-w-7xl p-6 py-12">
        <Suspense fallback={<SuspenseFallback />}>
          {profile.role === 'admin' ? (
            <AdminDashboard
              activeTab={activeTab}
              profile={profile}
              users={allUsers}
              releases={allReleases}
              transactions={allTransactions}
              deliveryQueue={allDeliveryQueue}
              events={allEvents}
              playingTrackId={playingTrackId}
              onTogglePlayback={(trackId) => setPlayingTrackId((current) => (current === trackId ? null : trackId))}
              onStopPlayback={() => setPlayingTrackId(null)}
              onRefresh={() => fetchData(session.user.id)}
              onManageUser={setSelectedUserForManage}
              onNotify={pushToast}
              onConfirm={requestConfirm}
              onPrompt={requestPrompt}
              apiRequest={apiRequest}
            />
          ) : (
            <ArtistDashboard
              activeTab={activeTab}
              profile={profile}
              setProfile={setProfile}
              releases={allReleases}
              transactions={allTransactions}
              royalties={allRoyalties}
              session={session}
              apiUrl={apiUrl}
              apiRequest={apiRequest}
              onRefresh={() => fetchData(session.user.id)}
              onRequestWithdrawal={handleRequestWithdrawal}
              onNotify={pushToast}
              onConfirm={requestConfirm}
              onOpenSmartLink={handleOpenSmartLink}
              playingTrackId={playingTrackId}
              onTogglePlayback={(trackId) => setPlayingTrackId((current) => (current === trackId ? null : trackId))}
              onStopPlayback={() => setPlayingTrackId(null)}
            />
          )}
        </Suspense>
      </main>
    </div>
  );

  const defaultRouteElement = !session ? (
    <Suspense fallback={<SuspenseFallback fullScreen />}>
      {isAdminPortal ? (
        <AdminPortalLogin
          email={email}
          password={password}
          onEmailChange={setEmail}
          onPasswordChange={setPassword}
          onSubmit={handleAuth}
        />
      ) : (
        <LandingPage
          onLogin={handleAuth}
          onGoogleLogin={handleGoogleLogin}
          showLogin={showLogin}
          setShowLogin={setShowLogin}
          adminClickCount={adminClickCount}
          apiUrl={apiUrl}
          onNotify={pushToast}
          onAdminClick={() => {
            const nextCount = adminClickCount + 1;
            if (nextCount >= 5) {
              setIsAdminPortal(true);
              setAdminClickCount(0);
            } else {
              setAdminClickCount(nextCount);
            }
          }}
        />
      )}
    </Suspense>
  ) : authenticatedApp;

  return (
    <>
      <Routes>
        <Route
          path="/share/:releaseId"
          element={(
            <Suspense fallback={<SuspenseFallback fullScreen />}>
              <PublicReleasePage apiUrl={apiUrl} onNotify={pushToast} />
            </Suspense>
          )}
        />
        <Route path="*" element={defaultRouteElement} />
      </Routes>

      <Suspense fallback={null}>
        {session && selectedTrack && (
          <SmartLinkModal
            track={selectedTrack}
            shareUrl={selectedTrackShareUrl}
            onClose={() => setSelectedTrack(null)}
            onCopyLink={handleCopySmartLink}
          />
        )}

        {session && selectedUserForManage && (
          <ManageUserModal
            user={selectedUserForManage}
            onClose={() => setSelectedUserForManage(null)}
            onUpdateUser={handleUpdateUser}
          />
        )}
      </Suspense>

      <ConfirmDialog
        dialog={confirmDialog}
        onCancel={() => closeConfirm(false)}
        onConfirm={() => closeConfirm(true)}
      />

      <PromptDialog
        dialog={promptDialog}
        onCancel={() => closePrompt(null)}
        onSubmit={(value) => closePrompt(value)}
      />

      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}

export default App;
