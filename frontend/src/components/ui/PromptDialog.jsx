import { useEffect, useState } from 'react';

export default function PromptDialog({ dialog, onCancel, onSubmit }) {
  const [value, setValue] = useState(dialog?.defaultValue || '');

  useEffect(() => {
    setValue(dialog?.defaultValue || '');
  }, [dialog]);

  if (!dialog) return null;

  return (
    <div className="fixed inset-0 z-[245] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
      <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-[#0D1117] p-8 shadow-2xl">
        <div className="space-y-3">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-blue-400">
            {dialog.eyebrow || 'Input'}
          </p>
          <h3 className="text-2xl font-black tracking-tight text-white">{dialog.title}</h3>
          {dialog.description && (
            <p className="text-sm leading-relaxed text-gray-400">{dialog.description}</p>
          )}
        </div>

        <div className="mt-6">
          <input
            autoFocus
            type="text"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={dialog.placeholder || ''}
            className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none transition-all placeholder:text-gray-600 focus:border-blue-500"
          />
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
            onClick={() => onSubmit(value)}
            className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white transition-all hover:bg-blue-500"
          >
            {dialog.confirmLabel || 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  );
}
