import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

const VARIANT_CONFIG = {
  success: {
    icon: CheckCircle2,
    container: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-50',
    iconColor: 'text-emerald-300'
  },
  error: {
    icon: AlertCircle,
    container: 'border-rose-400/30 bg-rose-500/10 text-rose-50',
    iconColor: 'text-rose-300'
  },
  info: {
    icon: Info,
    container: 'border-blue-400/30 bg-blue-500/10 text-blue-50',
    iconColor: 'text-blue-300'
  }
};

export default function ToastViewport({ toasts = [], onDismiss }) {
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[260] flex w-full max-w-sm flex-col gap-3 sm:right-6 sm:top-6">
      {toasts.map((toast) => {
        const variant = VARIANT_CONFIG[toast.variant] || VARIANT_CONFIG.info;
        const Icon = variant.icon;

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto overflow-hidden rounded-[1.75rem] border p-4 shadow-2xl backdrop-blur-2xl ${variant.container}`}
          >
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 rounded-full bg-black/20 p-2 ${variant.iconColor}`}>
                <Icon size={18} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-black tracking-tight">{toast.title}</p>
                {toast.description && (
                  <p className="mt-1 text-xs leading-relaxed text-white/75">{toast.description}</p>
                )}
              </div>

              <button
                type="button"
                onClick={() => onDismiss(toast.id)}
                className="rounded-full p-1 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
