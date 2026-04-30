-- 1. Tambahkan kolom untuk Album dan Store Selection di tabel releases
ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS album_name TEXT;
ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS selected_stores TEXT[] DEFAULT '{}';

-- 2. Ubah default quota pengguna baru menjadi 1 (1 Token Gratis)
ALTER TABLE public.profiles ALTER COLUMN quota SET DEFAULT 1;

-- 3. (Opsional) Berikan 1 Token gratis untuk pengguna yang saat ini kuotanya 0
ALTER TABLE public.profiles DISABLE TRIGGER protect_profile_sensitive_fields_trigger;
UPDATE public.profiles SET quota = 1 WHERE quota = 0;
ALTER TABLE public.profiles ENABLE TRIGGER protect_profile_sensitive_fields_trigger;
