import { ShieldCheck } from 'lucide-react';

export default function ManageUserModal({ user, onClose, onUpdateUser }) {
  if (!user) return null;

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/80 p-6 backdrop-blur-3xl">
      <div className="w-full max-w-lg rounded-[3rem] border border-white/10 bg-[#0D1117] p-12 shadow-2xl">
        <div className="mb-10 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-3xl font-black tracking-tighter">Manage Permission</h3>
            <p className="mt-1 text-xs font-bold uppercase tracking-widest text-gray-500">
              {user.email}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-white/5 px-4 py-2 text-[10px] font-bold uppercase text-gray-500 transition-colors hover:text-white"
          >
            Close
          </button>
        </div>

        <div className="space-y-8">
          <div className="space-y-3">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
              Subscription Tier
            </label>
            <select
              value={user.subscription_tier}
              onChange={(event) => onUpdateUser(user.id, { subscription_tier: event.target.value })}
              className="w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-sm font-bold outline-none transition-all focus:border-blue-500"
            >
              <option value="free" className="bg-black">Free Plan</option>
              <option value="inactive" className="bg-black">Inactive</option>
              <option value="pro" className="bg-black">Premium Pro</option>
            </select>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
              Upload Quota Allocation
            </label>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => onUpdateUser(user.id, { quota: (user.quota || 0) + 1 })}
                className="flex-1 rounded-2xl bg-blue-600 py-4 text-xs font-black transition-all hover:bg-blue-500"
              >
                GRANT +1 SLOT
              </button>
              <button
                type="button"
                onClick={() => onUpdateUser(user.id, { quota: Math.max(0, (user.quota || 0) - 1) })}
                className="flex-1 rounded-2xl bg-white/5 py-4 text-xs font-black text-gray-500 transition-all hover:bg-white/10"
              >
                REVOKE SLOT
              </button>
            </div>
            <p className="text-center text-[10px] font-bold uppercase tracking-widest text-gray-600">
              Current Quota: {user.quota || 0} Slots
            </p>
          </div>

          <div className="border-t border-white/5 pt-6">
            <div className="flex items-center gap-3 rounded-2xl border border-red-500/10 bg-red-500/5 p-4 text-red-500/40">
              <ShieldCheck size={20} />
              <p className="text-[10px] font-bold uppercase leading-relaxed tracking-tighter">
                Warning: changes to subscription status and quota affect artist access and revenue flow immediately.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
