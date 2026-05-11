import { ShieldCheck } from 'lucide-react';

export default function AdminPortalLogin({
  email,
  password,
  onEmailChange,
  onPasswordChange,
  onSubmit
}) {
  return (
    <div className="min-h-screen bg-black p-6 font-sans">
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-full max-w-md rounded-[3.5rem] border border-white/[0.1] bg-white/[0.02] p-12 shadow-2xl backdrop-blur-3xl">
          <div className="mb-10 text-center">
            <ShieldCheck className="mx-auto mb-4 text-blue-500" size={48} />
            <h1 className="text-3xl font-black tracking-tighter text-white">ADMIN CONTROL</h1>
            <p className="mt-2 text-[10px] uppercase tracking-widest text-gray-500">
              Private Secure Gateway
            </p>
          </div>

          <form className="space-y-4" onSubmit={onSubmit}>
            <input
              type="email"
              value={email}
              onChange={(event) => onEmailChange(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/50 p-4 text-white outline-none focus:border-blue-500"
              placeholder="System Admin Email"
            />
            <input
              type="password"
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/50 p-4 text-white outline-none focus:border-blue-500"
              placeholder="Master Access Key"
            />
            <button
              type="submit"
              className="w-full rounded-2xl bg-white py-4 font-black text-black transition-all hover:bg-gray-200"
            >
              ENTER SYSTEM
            </button>
          </form>

          <p className="mt-8 text-center text-[9px] text-gray-700">DECRYPT_AES_256_ACTIVE</p>
        </div>
      </div>
    </div>
  );
}
