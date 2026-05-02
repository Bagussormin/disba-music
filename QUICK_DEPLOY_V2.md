# 🚀 QUICK DEPLOYMENT GUIDE - Disba Music

**Version:** 2.0 (Manual Payment)  
**Time Estimate:** 20 minutes  
**Last Updated:** 2 Mei 2026

---

## 📋 STEP 1: Setup Supabase (5 MINUTES)

### Create Supabase Project
1. Go to https://supabase.com
2. Sign in or create account
3. Click "New Project"
4. Enter:
   - Project name: `disba-music`
   - Database password: (secure password)
   - Region: Select closest to you
5. Click "Create new project" and wait for setup

### Run Database Migrations
1. In Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy entire content from `backend/supabase_migrations.sql`
4. Paste into SQL Editor
5. Click "Run"
6. Wait for success message

### Get Your API Keys
1. Go to **Settings** → **API**
2. Copy:
   - `Project URL` → Save as `VITE_SUPABASE_URL`
   - `anon public` key → Save as `VITE_SUPABASE_ANON_KEY`
   - `service_role` secret key → Save as `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)

---

## 🌐 STEP 2: Deploy Backend (5 MINUTES)

### Option A: Deploy to Railway (Easiest)

1. Go to https://railway.app
2. Sign in with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your `disba-music` repository
5. In **Services**, set:
   - Service: `backend/package.json`
   - Build command: Leave default
6. Go to **Variables** and add:
   ```
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   VITE_SUPABASE_URL=https://your-project.supabase.co
   FRONTEND_URL=https://your-frontend-domain.vercel.app
   PORT=3001
   NODE_ENV=production
   ```
7. Click "Deploy"
8. Get your backend URL from Railway (e.g., `https://disba-backend-prod.up.railway.app`)
9. Save this URL

### Option B: Deploy to Render / Fly.io

Follow similar steps - main requirement is setting environment variables and pointing to `backend/package.json`

---

## 🎨 STEP 3: Deploy Frontend (5 MINUTES)

### Deploy to Vercel

1. Go to https://vercel.com
2. Click "New Project"
3. Select your GitHub repository
4. Click "Import"
5. Set **Framework Preset** to: Vite
6. In **Environment Variables**, add:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   VITE_API_URL=https://your-backend-url.railway.app
   ```
7. Click "Deploy"
8. Wait for build to complete
9. Get your frontend URL (e.g., `https://disba-music.vercel.app`)

### Update Backend FRONTEND_URL

1. Go back to Railway/Render dashboard
2. Update `FRONTEND_URL` variable to your Vercel URL
3. Redeploy backend

---

## ✅ STEP 4: Test Application (5 MINUTES)

### Test 1: Check Frontend Loads
1. Open your frontend URL in browser
2. Should see Disba Music landing page
3. No error messages in console

### Test 2: Check Backend Connection
1. Open browser console (F12)
2. Sign up / Login
3. Should see user created in Supabase
4. No "Cannot reach API" errors

### Test 3: Test Payment Flow
1. Login as user
2. Go to Pricing
3. Click "Upgrade ke Pro"
4. Payment modal appears
5. Select payment method (Bank Transfer or QRIS/DANA)
6. Click "Konfirmasi Pembayaran"
7. Should see payment instructions with:
   - Bank account number: 3491608259
   - QRIS/DANA: 62-812****3846
   - Order ID for tracking

### Test 4: Verify Transaction Created
1. Go to Supabase dashboard
2. Go to **transactions** table
3. Should see new row with:
   - `type: subscription_payment` or `quota_purchase`
   - `status: pending_payment`
   - `payment_method: bank_transfer` or `qris_dana`

---

## 💳 PAYMENT CONFIGURATION

### Payment Methods Active

✅ **Method 1: Bank Transfer BCA**
- Rekening: 3491608259
- A.n: Bagus Arifianto Sormin
- User transfers manually
- Admin verifies and confirms

✅ **Method 2: QRIS / DANA**
- DANA number: 62-812****3846
- Scan QRIS or transfer via DANA app
- User transfers manually
- Admin verifies and confirms

### Admin Payment Verification

After user pays manually:

1. Go to Admin Dashboard
2. Find pending transaction
3. Verify transfer received
4. Update transaction status to `success`
5. System automatically grants subscription/quota

---

## 🔒 PRODUCTION CHECKLIST

Before going live:

- [ ] All environment variables set correctly
- [ ] Backend and frontend URLs working
- [ ] Payment flow tested end-to-end
- [ ] Database migrations completed
- [ ] RLS policies enabled on all tables
- [ ] Admin account created
- [ ] Payment instructions clearly displayed
- [ ] Error monitoring configured (optional but recommended)
- [ ] CORS configuration set to production domain only

---

## 🆘 QUICK TROUBLESHOOTING

| Problem | Solution |
|---------|----------|
| "Cannot reach API" | Check `VITE_API_URL` is set correctly in Vercel |
| "Missing environment variable" | Add missing var to Vercel/Railway environment settings |
| "Login not working" | Check Supabase `VITE_SUPABASE_ANON_KEY` is correct |
| "Payment modal empty" | Check backend is running, `FRONTEND_URL` set correctly |
| "Transaction not saving" | Check `SUPABASE_SERVICE_ROLE_KEY` has database write access |

---

## 📞 SUPPORT

For issues:
1. Check browser console (F12) for errors
2. Check Vercel/Railway deployment logs
3. Check Supabase database for data
4. Verify all environment variables set

---

**🎉 You're live! Welcome to Disba Music production deployment.**

Last Updated: 2 Mei 2026
