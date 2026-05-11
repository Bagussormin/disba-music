import {
  Activity,
  Calendar,
  DollarSign,
  Globe,
  LogOut,
  Music,
  Package,
  ShieldCheck,
  Wallet
} from 'lucide-react';
import logo from '../../assets/logo-disba.png';

const ADMIN_TABS = [
  { id: 'admin', label: 'Overview', icon: ShieldCheck },
  { id: 'users', label: 'Artists', icon: Globe },
  { id: 'releases', label: 'Releases', icon: Music },
  { id: 'queue', label: 'Delivery Queue', icon: Package },
  { id: 'ledger', label: 'Ledger', icon: DollarSign },
  { id: 'events', label: 'Venues', icon: Calendar }
];

const ARTIST_TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: Activity },
  { id: 'music', label: 'My Music', icon: Music },
  { id: 'wallet', label: 'Wallet', icon: Wallet }
];

export default function AppNavigation({
  profile,
  activeTab,
  onTabChange,
  onSignOut,
  signingOut
}) {
  const tabs = profile.role === 'admin' ? ADMIN_TABS : ARTIST_TABS;

  return (
    <nav className="sticky top-0 z-50 border-b border-white/[0.05] bg-black/20 backdrop-blur-xl">
      <div className="mx-auto flex h-auto max-w-7xl flex-col gap-4 px-6 py-4 xl:h-20 xl:flex-row xl:items-center xl:justify-between xl:gap-6 xl:py-0">
        <div className="flex min-w-0 items-center gap-3">
          <img src={logo} alt="Disba Logo" className="h-10 w-auto" />
          <div className="min-w-0">
            <h2 className="text-2xl font-black tracking-tighter">DISBA</h2>
            <span className="inline-block rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-blue-400">
              {profile.role === 'admin'
                ? 'PLATFORM ADMIN'
                : profile.subscription_tier === 'pro'
                  ? 'ARTIST PRO'
                  : 'ARTIST INACTIVE'}
            </span>
          </div>
        </div>

        <div className="flex flex-1 flex-wrap gap-2 rounded-[2rem] bg-white/5 p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40'
                  : 'text-gray-500 hover:text-white'
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onSignOut}
          disabled={signingOut}
          className="flex shrink-0 items-center justify-center gap-2 rounded-xl border border-transparent px-4 py-2 text-gray-400 transition-all hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="hidden text-[10px] font-bold uppercase tracking-widest lg:block">
            {signingOut ? 'Signing Out' : 'Sign Out'}
          </span>
          <LogOut size={18} />
        </button>
      </div>
    </nav>
  );
}
