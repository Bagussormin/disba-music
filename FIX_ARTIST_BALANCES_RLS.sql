-- QUICK FIX: Enable RLS on artist_balances table
-- Jalankan query ini di Supabase SQL Editor

-- STEP 1: Force enable RLS
ALTER TABLE public.artist_balances ENABLE ROW LEVEL SECURITY;

-- STEP 2: Drop old policies jika ada
DROP POLICY IF EXISTS "Users can view their own balance" ON public.artist_balances;
DROP POLICY IF EXISTS "Users can update their own balance" ON public.artist_balances;

-- STEP 3: Create new policies
CREATE POLICY "artist_balances_select" ON public.artist_balances
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "artist_balances_insert" ON public.artist_balances
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "artist_balances_update" ON public.artist_balances
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- STEP 4: Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'artist_balances';

-- Result should show: artist_balances | true
