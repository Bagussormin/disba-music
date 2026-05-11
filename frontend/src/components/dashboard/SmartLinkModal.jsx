import { Activity, ChevronRight, Disc3, ExternalLink, Music, X } from 'lucide-react';
import { buildPlatformSearchUrl } from '../../utils/shareLinks';

export default function SmartLinkModal({ track, shareUrl, onClose, onCopyLink }) {
  if (!track) return null;

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/60 p-6 backdrop-blur-3xl">
      <div className="w-full max-w-sm overflow-hidden rounded-[3rem] border border-white/10 bg-[#0D1117] shadow-2xl">
        <div className="relative h-64">
          <img
            src={track.cover_url}
            alt={track.title}
            className="h-full w-full object-cover"
          />
          <button
            type="button"
            onClick={onClose}
            className="absolute right-6 top-6 rounded-full bg-black/40 p-2 backdrop-blur-md transition-all hover:bg-black/60"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-8 text-center">
          <h2 className="text-2xl font-black">{track.title}</h2>
          <p className="mb-8 mt-1 text-xs font-bold uppercase tracking-widest text-gray-500">
            {track.artistName || 'Original Artist'}
          </p>

          <div className="space-y-3">
            {[
              { id: 'spotify', name: 'Spotify', icon: Music, color: 'hover:bg-[#1DB954]/20 hover:text-[#1DB954]' },
              { id: 'apple', name: 'Apple Music', icon: Disc3, color: 'hover:bg-[#FA243C]/20 hover:text-[#FA243C]' },
              { id: 'youtube', name: 'YouTube Music', icon: Activity, color: 'hover:bg-[#FF0000]/20 hover:text-[#FF0000]' }
            ].map((store) => (
              <a
                key={store.id}
                href={buildPlatformSearchUrl(track, store.id)}
                target="_blank"
                rel="noreferrer"
                className={`flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 p-4 transition-all ${store.color}`}
              >
                <div className="flex items-center gap-3">
                  <store.icon size={20} />
                  <span className="text-sm font-bold">{store.name}</span>
                </div>
                <ChevronRight size={16} className="opacity-40" />
              </a>
            ))}
          </div>

          <button
            type="button"
            onClick={onCopyLink}
            className="mt-8 text-[11px] font-bold uppercase tracking-widest text-blue-400 transition-colors hover:text-blue-300"
          >
            Copy Shareable Link
          </button>

          <a
            href={shareUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-gray-400 transition-colors hover:text-white"
          >
            <ExternalLink size={14} />
            Open Public Share Page
          </a>
        </div>
      </div>
    </div>
  );
}
