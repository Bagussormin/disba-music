export default function ConfirmDialog({ dialog, onCancel, onConfirm }) {
  if (!dialog) return null;

  return (
    <div className="fixed inset-0 z-[240] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
      <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-[#0D1117] p-8 shadow-2xl">
        <div className="space-y-3">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-blue-400">
            {dialog.eyebrow || 'Konfirmasi'}
          </p>
          <h3 className="text-2xl font-black tracking-tight text-white">{dialog.title}</h3>
          {dialog.description && (
            <p className="text-sm leading-relaxed text-gray-400">{dialog.description}</p>
          )}
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-gray-300 transition-all hover:bg-white/10 hover:text-white"
          >
            {dialog.cancelLabel || 'Batal'}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-2xl px-5 py-3 text-sm font-black text-white transition-all ${
              dialog.danger
                ? 'bg-rose-600 hover:bg-rose-500'
                : 'bg-blue-600 hover:bg-blue-500'
            }`}
          >
            {dialog.confirmLabel || 'Lanjutkan'}
          </button>
        </div>
      </div>
    </div>
  );
}
