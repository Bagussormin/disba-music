# 🔍 SUPABASE PROJECT VERIFICATION CHECKLIST

**Project URL:** https://hwxrxwfrpilxkpdlolph.supabase.co  
**Check Date:** 2 Mei 2026  
**Purpose:** Verify database setup is complete and matches code requirements

---

## ✅ VERIFICATION STEPS

### STEP 1: Database Connection Test

**Login ke Supabase:**
1. Go to https://app.supabase.com
2. Find project: `hwxrxwfrpilxkpdlolph`
3. Go to **SQL Editor**
4. Paste this test query:
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   ORDER BY table_name;
   ```
5. Click **Run**
6. Should see list of tables below

---

### STEP 2: Check Required Tables ✅

Run this query in SQL Editor and verify all tables exist:

```sql
SELECT 
    CASE 
        WHEN table_name = 'profiles' THEN '✅ profiles'
        WHEN table_name = 'releases' THEN '✅ releases'
        WHEN table_name = 'transactions' THEN '✅ transactions'
        WHEN table_name = 'royalties_ledger' THEN '✅ royalties_ledger'
        WHEN table_name = 'release_splits' THEN '✅ release_splits'
        WHEN table_name = 'store_analytics' THEN '✅ store_analytics'
        ELSE '❌ ' || table_name
    END as table_status
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

**Expected Result (6 tables):**
```
✅ profiles
✅ releases
✅ transactions
✅ royalties_ledger
✅ release_splits
✅ store_analytics
```

If any table is missing → Run migrations (see step below)

---

### STEP 3: Table Structure Verification ✅

For each table, run these queries:

#### **Table: `profiles`**
```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles'
ORDER BY ordinal_position;
```

**Should have columns:**
```
✅ id (UUID)
✅ full_name (TEXT)
✅ email (TEXT)
✅ role (TEXT)
✅ quota (INT)
✅ wallet_balance (NUMERIC)
✅ subscription_tier (TEXT)
✅ subscription_active_until (TIMESTAMP)
✅ split_percentage (NUMERIC)
✅ created_at (TIMESTAMP)
```

#### **Table: `releases`**
```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'releases'
ORDER BY ordinal_position;
```

**Should have columns:**
```
✅ id (UUID)
✅ user_id (UUID)
✅ title (TEXT)
✅ genre (TEXT)
✅ audio_url (TEXT)
✅ cover_url (TEXT)
✅ status (TEXT)
✅ isrc (TEXT)
✅ upc (TEXT)
✅ explicit_lyrics (BOOLEAN)
✅ split_percentage (NUMERIC)
✅ created_at (TIMESTAMP)
```

#### **Table: `transactions`**
```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'transactions'
ORDER BY ordinal_position;
```

**Should have columns:**
```
✅ id (UUID)
✅ user_id (UUID)
✅ type (TEXT)
✅ amount (NUMERIC)
✅ status (TEXT)
✅ payment_method (TEXT)
✅ transaction_ref (TEXT)
✅ midtrans_order_id (TEXT) - unused but ok
✅ snap_token (TEXT) - unused but ok
✅ created_at (TIMESTAMP)
```

#### **Table: `royalties_ledger`**
```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'royalties_ledger'
ORDER BY ordinal_position;
```

**Should have columns:**
```
✅ id (UUID)
✅ user_id (UUID)
✅ release_id (UUID)
✅ amount_earned (NUMERIC)
✅ report_month (DATE)
✅ created_at (TIMESTAMP)
```

#### **Table: `release_splits`**
```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'release_splits'
ORDER BY ordinal_position;
```

**Should have columns:**
```
✅ id (UUID)
✅ release_id (UUID)
✅ email (TEXT)
✅ percentage (NUMERIC)
✅ status (TEXT)
✅ created_at (TIMESTAMP)
```

#### **Table: `store_analytics`**
```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'store_analytics'
ORDER BY ordinal_position;
```

**Should have columns:**
```
✅ id (UUID)
✅ release_id (UUID)
✅ store_name (TEXT)
✅ streams_count (BIGINT)
✅ revenue (NUMERIC)
✅ report_date (DATE)
✅ created_at (TIMESTAMP)
```

---

### STEP 4: Check Functions ✅

Run this query to verify functions exist:

```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public'
ORDER BY routine_name;
```

**Should show (2 functions):**
```
✅ generate_next_isrc()
✅ protect_profile_sensitive_fields()
```

Test function:
```sql
SELECT public.generate_next_isrc();
```

Should return something like: `IDDBM2600001`

---

### STEP 5: Check Row Level Security (RLS) ✅

Go to **Authentication** → **Policies** (or SQL Editor):

Run this to check RLS is enabled:
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
```

**All should show `true` (RLS enabled):**
```
✅ profiles - rowsecurity: t
✅ releases - rowsecurity: t
✅ royalties_ledger - rowsecurity: t
✅ transactions - rowsecurity: t
✅ store_analytics - rowsecurity: t
✅ release_splits - rowsecurity: t
```

Verify policies exist:
```sql
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

**Should show (minimum 7 policies):**
```
✅ profiles - "Users can view their own profile"
✅ profiles - "Users can update their own profile"
✅ releases - "Users can view their own releases"
✅ transactions - "Users can view their own transactions"
✅ royalties_ledger - "Users can view their own royalties"
✅ release_splits - "Users can view their splits"
✅ store_analytics - "Users can view their own analytics"
```

---

### STEP 6: Check API Keys Setup ✅

Go to **Settings** → **API**:

Verify these are visible and copy them:

1. **Project URL** 
   - Should be: `https://hwxrxwfrpilxkpdlolph.supabase.co`
   - ✅ Copy and save

2. **anon public key** (for frontend)
   - Format: long string starting with `eyJ...`
   - ✅ Copy and save as `VITE_SUPABASE_ANON_KEY`

3. **service_role secret key** (for backend)
   - Format: long string starting with `eyJ...`
   - ⚠️ KEEP SECRET - for backend only
   - ✅ Copy and save as `SUPABASE_SERVICE_ROLE_KEY`

---

### STEP 7: Authentication Setup ✅

Go to **Authentication** → **Providers**:

**Check Email provider:**
- [ ] Email provider is enabled (toggle ON)
- [ ] Email/Password authentication working
- [ ] Email confirmations optional (for dev) or required (for prod)

**For testing:**
Go to **User Management**:
- Try creating test user
- Verify user appears with correct email
- Check if you can view user details

---

### STEP 8: Test Database Connection from Code ✅

Run this in your terminal to test connection:

```bash
# Navigate to backend
cd backend

# Create test file
cat > test_supabase.js << 'EOF'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://hwxrxwfrpilxkpdlolph.supabase.co'
const supabaseKey = 'your-anon-key-here' // Replace with actual key

const supabase = createClient(supabaseUrl, supabaseKey)

// Test connection
const { data, error } = await supabase.from('profiles').select('count', { count: 'exact' })

if (error) {
  console.error('❌ Connection failed:', error.message)
} else {
  console.log('✅ Connection successful!')
  console.log('Total profiles:', data?.length || 0)
}
EOF

# Run test
node test_supabase.js
```

**Expected output:**
```
✅ Connection successful!
Total profiles: 0
```

---

### STEP 9: Test Backend Connection ✅

```bash
# Set environment variables
export VITE_SUPABASE_URL='https://hwxrxwfrpilxkpdlolph.supabase.co'
export SUPABASE_SERVICE_ROLE_KEY='your-service-role-key'
export FRONTEND_URL='http://localhost:5173'

# Start backend
npm run dev
```

**Expected output:**
```
Secure backend server running on port 3001
```

Then test an endpoint:
```bash
curl -X GET http://localhost:3001/api/admin/dashboard \
  -H "Authorization: Bearer invalid-token"
```

**Expected response:**
```json
{"error":"Invalid or expired session."}
```

This means backend is running and connected to Supabase!

---

### STEP 10: Test Frontend Connection ✅

```bash
# Navigate to frontend
cd frontend

# Create .env.local
cat > .env.local << 'EOF'
VITE_SUPABASE_URL=https://hwxrxwfrpilxkpdlolph.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_API_URL=http://localhost:3001
EOF

# Start frontend
npm run dev
```

**Expected output:**
```
  VITE v6.0.7 starting dev server at:
  ➜  Local:   http://localhost:5173/
```

Open http://localhost:5173 in browser:
- Should see Disba Music landing page
- No "Missing environment variable" errors
- Can signup/login

---

## 🔧 IF TABLES ARE MISSING - Run Migrations

If any tables are missing from STEP 2, run the migration:

1. Go to Supabase: **SQL Editor**
2. Click **New Query**
3. Copy entire content from: `backend/supabase_migrations.sql`
4. Paste into SQL Editor
5. Click **Run** button
6. Wait for completion message
7. Return to STEP 2 to verify

---

## ✅ FINAL VERIFICATION CHECKLIST

After completing all steps above, check all boxes:

- [ ] **Tables:** All 6 tables exist (profiles, releases, transactions, royalties_ledger, release_splits, store_analytics)
- [ ] **Columns:** Each table has all required columns with correct data types
- [ ] **Functions:** Both functions exist and generate_next_isrc() works
- [ ] **RLS:** All tables have RLS enabled with correct policies
- [ ] **API Keys:** Project URL, anon key, and service_role key are accessible
- [ ] **Auth:** Email provider is enabled
- [ ] **Backend:** Connects to Supabase successfully
- [ ] **Frontend:** Loads without environment variable errors
- [ ] **Signup/Login:** User creation works in Supabase
- [ ] **Payment Tables:** `transactions` table accepts test inserts

---

## 🎯 Status Summary

| Component | Status | Notes |
|-----------|--------|-------|
| Tables | ❓ Check STEP 2 | Run migration if missing |
| Columns | ❓ Check STEP 3 | Verify each table structure |
| Functions | ❓ Check STEP 4 | Must exist for ISRC generation |
| RLS Policies | ❓ Check STEP 5 | Essential for security |
| API Keys | ❓ Check STEP 6 | Needed for frontend/backend |
| Authentication | ❓ Check STEP 7 | Email provider enabled? |
| Backend Connection | ❓ Check STEP 8-9 | Test with npm run dev |
| Frontend Connection | ❓ Check STEP 10 | Test frontend startup |

---

## 📝 Notes

- **VITE_SUPABASE_URL** = Always `https://hwxrxwfrpilxkpdlolph.supabase.co`
- **VITE_SUPABASE_ANON_KEY** = Public key (safe to expose)
- **SUPABASE_SERVICE_ROLE_KEY** = Secret key (NEVER expose, backend only!)
- RLS policies automatically protect user data
- Functions are used for generating ISRC codes

---

## 🆘 If Something Fails

1. **"Table does not exist"** 
   → Run migrations (see section above)

2. **"Permission denied"** 
   → Check RLS policies enabled on STEP 5

3. **"Invalid API Key"** 
   → Verify key is correct in STEP 6
   → Regenerate if needed in Settings → API

4. **"Cannot connect to Supabase"** 
   → Check internet connection
   → Verify URL is correct
   → Check API key is not expired

5. **Frontend shows "Missing environment variable"** 
   → Create .env.local file with correct vars
   → Restart frontend dev server (npm run dev)

---

**Good luck with setup! Beri tahu hasil pemeriksaan.** ✅

