# ⚡ DISBA Music - QUICK START PRODUCTION (30 Menit)

Panduan cepat untuk deploy disba-music ke production dan mulai terima pembayaran dalam 30 menit.

---

## 🎯 LANGKAH 1: Setup Midtrans Account (5 MENIT)

### Di Midtrans
1. Buka https://midtrans.com → Sign Up
2. Pilih "For Merchants / Business"  
3. Fill form dengan detail bisnis
4. Verify email
5. Dashboard → Settings → API Keys → Copy:
   - **Server Key** (simpan aman)
   - **Client Key** (bisa public)

**SIMPAN DI FILE TEKS SEMENTARA UNTUK LANGKAH BERIKUTNYA!**

---

## 🎯 LANGKAH 2: Setup Backend Environment (5 MENIT)

### Buat file `.env.production` di folder `backend/`

```bash
# Copy ke file .env.production di backend/ folder

# ===== SUPABASE =====
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR-SERVICE-ROLE-KEY
FRONTEND_URL=https://your-domain.com

# ===== MIDTRANS (dari Midtrans Dashboard) =====
MIDTRANS_SERVER_KEY=YOUR-MIDTRANS-SERVER-KEY
VITE_MIDTRANS_CLIENT_KEY=YOUR-MIDTRANS-CLIENT-KEY
VITE_MIDTRANS_IS_PRODUCTION=false

# ===== SPOTIFY =====
SPOTIFY_CLIENT_ID=YOUR-SPOTIFY-CLIENT-ID
SPOTIFY_CLIENT_SECRET=YOUR-SPOTIFY-CLIENT-SECRET
SPOTIFY_REDIRECT_URI=https://api.your-domain.com/api/spotify/callback
SPOTIFY_COMMISSION_PERCENTAGE=15
SPOTIFY_ARTIST_PAYOUT_PERCENTAGE=85

# ===== SERVER =====
PORT=3001
```

**❓ MANA CARI INI?**
- `SUPABASE_URL & SERVICE_ROLE_KEY`: Dashboard Supabase → Project Settings → API
- `MIDTRANS Keys`: Midtrans Dashboard → Settings → API Keys
- `SPOTIFY Keys`: https://developer.spotify.com/dashboard → Your App → API Keys

---

## 🎯 LANGKAH 3: Deploy Backend (5 MENIT)

### Pake Vercel (GRATIS, RECOMMENDED)

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Login ke Vercel
vercel login

# 3. Pergi ke folder backend
cd backend

# 4. Deploy ke production
vercel --prod --name disba-backend

# 5. Ketika ditanya environment, pilih "Create a new project"
# 6. Link environment variables from .env.production
# 7. COPY & SIMPAN URL yang diberikan (contoh: https://disba-backend.vercel.app)
```

**✅ Backend sekarang LIVE!**

---

## 🎯 LANGKAH 4: Setup Frontend Environment (2 MENIT)

### Buat file `.env.production` di folder `frontend/`

```bash
# Copy ke file .env.production di frontend/ folder

VITE_API_URL=https://disba-backend.vercel.app
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-KEY
VITE_MIDTRANS_CLIENT_KEY=YOUR-MIDTRANS-CLIENT-KEY
VITE_MIDTRANS_IS_PRODUCTION=false
```

**INGAT: Ganti `https://disba-backend.vercel.app` dengan URL backend dari Langkah 3!**

---

## 🎯 LANGKAH 5: Deploy Frontend (5 MENIT)

```bash
# 1. Pergi ke folder frontend
cd frontend

# 2. Build untuk production
npm run build

# 3. Deploy ke Vercel
vercel --prod --name disba-music

# 4. Link environment variables from .env.production
# 5. COPY URL yang diberikan (contoh: https://disba-music.vercel.app)
```

**✅ Frontend sekarang LIVE!**

---

## 🎯 LANGKAH 6: Setup Custom Domain (OPTIONAL - 5 MENIT)

### Di Vercel (Frontend)
1. Project Settings → Domains
2. Add Custom Domain (domain yang sudah Anda beli)
3. Follow instruksi DNS

### Di Vercel (Backend)
1. Project Settings → Domains  
2. Add Custom Domain (contoh: api.your-domain.com)
3. Follow instruksi DNS

---

## 🎯 LANGKAH 7: Test Payment Flow (5 MENIT)

### Test Subscription Payment

1. Buka https://disba-music.vercel.app
2. Sign up / Login
3. Klik "Upgrade Subscription" 
4. Midtrans modal akan muncul
5. **Test Card** (dari Midtrans):
   ```
   Number: 4111 1111 1111 1111
   Exp: 12/25
   CVV: 123
   ```
6. Click "Pay"
7. **✅ PAYMENT BERHASIL!**
8. Check dashboard - subscription seharusnya update

### Verify di Midtrans Dashboard
- Buka https://app.sandbox.midtrans.com
- Login
- Dashboard → Transactions
- Cari transaction yang baru dibuat
- Status harus "Settlement" atau "Capture"

---

## ✅ SELESAI! Sekarang Apa?

### SEGERA LAKUKAN:
1. ✅ Share link ke first 10 users (teman, kolega, music groups)
2. ✅ Buat minimal 3 social media posts tentang launch
3. ✅ Setup email support (support@your-domain.com)
4. ✅ Monitor dashboard setiap hari

### LANGKAH BERIKUTNYA (MINGGU DEPAN):
1. Switch Midtrans ke PRODUCTION (bukan sandbox)
2. Setup bank account verification untuk withdrawal
3. Launch marketing campaign
4. Improve UI/UX berdasarkan user feedback

---

## 🆘 TROUBLESHOOTING

### "Payment button tidak muncul"
- Check console di browser (F12)
- Verify `VITE_API_URL` benar di frontend `.env`
- Pastikan backend alive: `https://your-backend.vercel.app/api/payments/client-key`

### "Midtrans modal tidak muncul"
- Check apakah `window.snap` tersedia di console
- Verify Midtrans script di `frontend/index.html`
- Reload page tanpa cache (Ctrl+Shift+R)

### "Payment failed"
- Check Midtrans test card (4111 1111 1111 1111)
- Verify `MIDTRANS_SERVER_KEY` di backend `.env`
- Check error di browser console

### "Database connection error"
- Verify `VITE_SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY`
- Check Supabase project masih aktif
- Test connection dari Supabase Query Editor

---

## 📊 DASHBOARD LINKS (SIMPAN INI!)

Setelah deploy, bookmark ini:
- Frontend: https://your-domain.com
- Backend API: https://api.your-domain.com
- Vercel Projects: https://vercel.com/dashboard
- Midtrans Dashboard: https://app.sandbox.midtrans.com (sandbox) / https://app.midtrans.com (production)
- Supabase Dashboard: https://app.supabase.com

---

## 🎉 READY TO EARN MONEY!

Kamu sekarang sudah punya:
- ✅ Platform distribusi musik live
- ✅ Payment gateway aktif (sandbox)
- ✅ Dashboard untuk artists & admin
- ✅ Automatic revenue tracking

**LANGKAH SELANJUTNYA: MARKETING & GET FIRST 100 USERS!**

---

**Duration: ~30 MENIT**
**Cost: GRATIS (Vercel, Supabase free tier)**
**Status: PRODUCTION READY** 🚀
