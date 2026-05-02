-- ========== SECURITY FIXES & ATOMIC OPERATIONS ==========

-- Function to atomically deduct quota (prevents race condition)
CREATE OR REPLACE FUNCTION deduct_quota(user_id UUID, amount INTEGER DEFAULT 1)
RETURNS boolean AS $$
DECLARE
  current_quota INTEGER;
BEGIN
  -- Lock the row to prevent concurrent updates
  SELECT quota INTO current_quota FROM profiles WHERE id = user_id FOR UPDATE;
  
  IF current_quota IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  IF current_quota < amount THEN
    RAISE EXCEPTION 'Insufficient quota';
  END IF;
  
  -- Atomically update
  UPDATE profiles SET quota = quota - amount WHERE id = user_id;
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql;

-- Function to verify webhook signature (for Spotify integration)
CREATE OR REPLACE FUNCTION verify_webhook_signature(
  payload TEXT,
  signature TEXT,
  secret TEXT
)
RETURNS boolean AS $$
DECLARE
  calculated_signature TEXT;
BEGIN
  -- This is a placeholder - HMAC verification should be done in application
  -- For now, return true if signature provided
  RETURN signature IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- Add unique constraint for idempotency
ALTER TABLE transactions
ADD CONSTRAINT unique_idempotency_key UNIQUE (idempotency_key)
WHERE idempotency_key IS NOT NULL;

-- Create table for payment instructions (move from hardcoded)
CREATE TABLE IF NOT EXISTS payment_instructions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_method TEXT NOT NULL,
  title TEXT NOT NULL,
  bank_name TEXT,
  account_name TEXT,
  account_number TEXT,
  bank_code TEXT,
  qr_code_data TEXT,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT valid_payment_method CHECK (payment_method IN ('bank_transfer', 'qris', 'dana', 'qris_dana'))
);

-- Add RLS policies for payment_instructions
ALTER TABLE payment_instructions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to payment instructions" ON payment_instructions
  FOR SELECT USING (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_payment_instructions_method 
  ON payment_instructions(payment_method);

-- Insert default payment instructions
INSERT INTO payment_instructions (payment_method, title, note) VALUES
  ('bank_transfer', 'Transfer Bank BCA', 'Contact admin for bank details'),
  ('qris_dana', 'QRIS DANA', 'Contact admin for QRIS code')
ON CONFLICT DO NOTHING;

-- Add webhook verification logging table
CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL,
  status TEXT NOT NULL,
  signature_valid BOOLEAN,
  payload JSONB,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS for webhook logs
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can read webhook logs" ON webhook_logs
  FOR SELECT USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

-- Add idempotency_key column to transactions if not exists
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS idempotency_key UUID UNIQUE;

-- Create index for transaction lookups by user and status
CREATE INDEX IF NOT EXISTS idx_transactions_user_status 
  ON transactions(user_id, status);

CREATE INDEX IF NOT EXISTS idx_transactions_user_type 
  ON transactions(user_id, type);

-- Add index for releases queries (admin dashboard pagination)
CREATE INDEX IF NOT EXISTS idx_releases_created_at_desc 
  ON releases(created_at DESC);

-- Add index for royalties queries (admin dashboard pagination)
CREATE INDEX IF NOT EXISTS idx_royalties_ledger_created_at_desc 
  ON royalties_ledger(created_at DESC);

-- ========== END SECURITY FIXES ==========
