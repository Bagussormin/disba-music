-- Legacy-safe patch for old deployments
-- Tidak mengubah tipe kolom lama yang sudah terikat policy lama.
-- Aman untuk schema lama yang campur text/uuid.

ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS amount NUMERIC;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS transaction_ref TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS midtrans_order_id TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS snap_token TEXT;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'artist';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS quota INT DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC DEFAULT 0.00;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_active_until TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS split_percentage NUMERIC DEFAULT 80;

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.royalties_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.release_splits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own releases" ON public.releases;
DROP POLICY IF EXISTS "Users can insert their own releases" ON public.releases;
DROP POLICY IF EXISTS "Users can view their own royalties" ON public.royalties_ledger;
DROP POLICY IF EXISTS "Admins can manage royalties" ON public.royalties_ledger;
DROP POLICY IF EXISTS "Users can view their own analytics" ON public.store_analytics;
DROP POLICY IF EXISTS "Users can view their splits" ON public.release_splits;
DROP POLICY IF EXISTS "Users can insert their own transactions" ON public.transactions;

DROP POLICY IF EXISTS p_prof_v ON public.profiles;
DROP POLICY IF EXISTS p_prof_u ON public.profiles;
DROP POLICY IF EXISTS p_rel_v ON public.releases;
DROP POLICY IF EXISTS p_rel_i ON public.releases;
DROP POLICY IF EXISTS p_trx_v ON public.transactions;
DROP POLICY IF EXISTS p_tra_v ON public.transactions;
DROP POLICY IF EXISTS p_roy_v ON public.royalties_ledger;
DROP POLICY IF EXISTS p_store_v ON public.store_analytics;
DROP POLICY IF EXISTS p_split_v ON public.release_splits;

CREATE POLICY "Users can view their own transactions"
ON public.transactions
FOR SELECT
USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid()::text = id::text);

CREATE POLICY "Users can view their own releases"
ON public.releases
FOR SELECT
USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view their own royalties"
ON public.royalties_ledger
FOR SELECT
USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view their own analytics"
ON public.store_analytics
FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM public.releases r
        WHERE r.id::text = store_analytics.release_id::text
          AND r.user_id::text = auth.uid()::text
    )
);

CREATE POLICY "Users can view their splits"
ON public.release_splits
FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM public.releases r
        WHERE r.id::text = release_splits.release_id::text
          AND r.user_id::text = auth.uid()::text
    )
    OR email = (
        SELECT au.email
        FROM auth.users au
        WHERE au.id = auth.uid()
    )
);

CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_fields()
RETURNS TRIGGER AS $$
BEGIN
    IF COALESCE(current_setting('request.jwt.claim.role', true), '') <> 'service_role' THEN
        IF NEW.role IS DISTINCT FROM OLD.role
           OR NEW.email IS DISTINCT FROM OLD.email
           OR NEW.quota IS DISTINCT FROM OLD.quota
           OR NEW.wallet_balance IS DISTINCT FROM OLD.wallet_balance
           OR NEW.subscription_tier IS DISTINCT FROM OLD.subscription_tier
           OR NEW.subscription_active_until IS DISTINCT FROM OLD.subscription_active_until
           OR NEW.split_percentage IS DISTINCT FROM OLD.split_percentage THEN
            RAISE EXCEPTION 'Updating protected profile fields is not allowed.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS protect_profile_sensitive_fields_trigger ON public.profiles;
CREATE TRIGGER protect_profile_sensitive_fields_trigger
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profile_sensitive_fields();
