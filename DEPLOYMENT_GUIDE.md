# 🚀 DISBA Music - Deployment Checklist untuk Production

Dokumentasi lengkap untuk meluncurkan disba-music ke production dan mulai menghasilkan uang.

---

## 📋 PRE-DEPLOYMENT CHECKLIST

### 1. Setup Midtrans Account (Sandbox dulu, Production nanti)
- [ ] Buka https://midtrans.com
- [ ] Sign up untuk sandbox account
- [ ] Login ke Midtrans Dashboard
- [ ] Go to **Settings → API Keys**
- [ ] Copy **Server Key** dan **Client Key**
- [ ] Save di tempat aman

### 2. Verify Database Structure
- [ ] Pastikan Supabase project sudah setup
- [ ] Run migration: `spotify_integration.sql`
- [ ] Verify tables: `profiles`, `releases`, `transactions`, `royalties_ledger`
- [ ] Check Midtrans columns di `transactions` table:
  - `midtrans_order_id` (TEXT, UNIQUE)
  - `payment_method` (TEXT)

### 3. Environment Variables Setup

#### Backend `.env` (Production)
```bash
# Supabase
VITE_SUPABASE_URL=https://your-supabase-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
FRONTEND_URL=https://your-domain.com

# Midtrans (Sandbox)
MIDTRANS_SERVER_KEY=<sandbox-server-key>
VITE_MIDTRANS_CLIENT_KEY=<sandbox-client-key>
VITE_MIDTRANS_IS_PRODUCTION=false

# Spotify (get from spotify developer dashboard)
SPOTIFY_CLIENT_ID=your-client-id
SPOTIFY_CLIENT_SECRET=your-client-secret
SPOTIFY_REDIRECT_URI=https://api.your-domain.com/api/spotify/callback
SPOTIFY_COMMISSION_PERCENTAGE=15
SPOTIFY_ARTIST_PAYOUT_PERCENTAGE=85

# Server
PORT=3001
```

#### Frontend `.env` (Production)
```bash
VITE_API_URL=https://api.your-domain.com
VITE_SUPABASE_URL=https://your-supabase-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_MIDTRANS_CLIENT_KEY=<sandbox-client-key>
VITE_MIDTRANS_IS_PRODUCTION=false
```

---

## 🌐 DEPLOYMENT OPTIONS

### OPTION 1: Vercel (RECOMMENDED untuk MVP - GRATIS)

#### A. Deploy Backend
1. **Persiapan**
   ```bash
   cd backend
   npm install
   # Test locally: npm start
   ```

2. **Create `vercel.json`** di root backend folder:
   ```json
   {
     "version": 2,
     "builds": [
       { "src": "server.js", "use": "@vercel/node" }
     ],
     "routes": [
       { "src": "/(.*)", "dest": "server.js" }
     ],
     "env": {
       "VITE_SUPABASE_URL": "@supabase_url",
       "SUPABASE_SERVICE_ROLE_KEY": "@supabase_key",
       "MIDTRANS_SERVER_KEY": "@midtrans_server_key",
       "VITE_MIDTRANS_CLIENT_KEY": "@midtrans_client_key",
       "SPOTIFY_CLIENT_ID": "@spotify_client_id",
       "SPOTIFY_CLIENT_SECRET": "@spotify_client_secret"
     }
   }
   ```

3. **Deploy ke Vercel**
   ```bash
   npm i -g vercel
   vercel --prod
   ```
   - Set environment variables saat ditanya
   - Note API URL (akan seperti: https://disba-backend.vercel.app)

#### B. Deploy Frontend
1. **Build**
   ```bash
   cd frontend
   npm install
   npm run build
   ```

2. **Deploy ke Vercel**
   ```bash
   vercel --prod
   ```
   - Set `VITE_API_URL` ke backend URL dari step A
   - Note frontend URL

#### C. Setup Custom Domain
- Beli domain di Namecheap, GoDaddy, atau provider lain
- Di Vercel project settings, add custom domain
- Update DNS records mengikuti instruksi Vercel

---

### OPTION 2: Railway.app (ALTERNATIF)

1. Sign up di https://railway.app
2. Connect GitHub repo
3. Setup environment variables di Railway dashboard
4. Deploy backend dan frontend

---

### OPTION 3: Self-hosted (Untuk skala besar nanti)

- Setup VPS (DigitalOcean, Linode, dll)
- Install Node.js, PM2, Nginx
- Setup SSL dengan Let's Encrypt
- Configure reverse proxy Nginx

---

## ✅ POST-DEPLOYMENT TESTING

### Test Payment Flow (Sandbox)
```bash
# 1. Buka dashboard lokal atau deployed frontend
# 2. Login dengan akun dummy
# 3. Click "Upgrade Subscription" atau "Buy Quota"
# 4. Midtrans modal akan muncul
# 5. Gunakan test card Midtrans:
#    - Card: 4111 1111 1111 1111
#    - Exp: 12/25
#    - CVV: 123
# 6. Payment harus berhasil dan balance update
```

### Test Webhook Notification
```bash
# Di Midtrans Dashboard → Settings → HTTP Notification
# Set webhook URL: https://your-api-domain.com/api/payments/notification
# Test dengan "Send Sample HTTP Notification"
# Verify transaction status berubah ke "success"
```

### Test Withdrawal Flow
```bash
# 1. Artifically add balance ke user di Supabase
# 2. Click "Withdraw Funds"
# 3. Admin harus bisa approve/reject di admin dashboard
# 4. Verify balance berubah
```

---

## 💾 BACKUP & MONITORING

### Database Backup
- Enable automated backups di Supabase
- Export backup weekly ke safe location
- Test restore process monthly

### Monitoring
- Setup error tracking (Sentry)
- Monitor API response times
- Setup uptime monitoring (StatusPage)
- Daily log review dari backend

---

## 🚨 PRODUCTION SECURITY CHECKLIST

- [ ] HTTPS enabled (SSL certificate aktif)
- [ ] CORS properly configured (bukan *)
- [ ] Rate limiting di API endpoints
- [ ] Input validation di semua endpoints
- [ ] SQL injection protection (Supabase auto-handle)
- [ ] XSS protection di frontend
- [ ] Environment variables tidak di-commit ke git
- [ ] Sensitive logs jangan di-print ke console
- [ ] API keys hanya di-access dari backend (bukan frontend)

---

## 📊 MONITORING DASHBOARD (BULAN PERTAMA)

Metrics untuk track:
- DAU (Daily Active Users)
- Subscription conversion rate
- Average revenue per user
- Withdrawal requests vs approvals
- API error rate
- Payment success rate

---

## 🎯 LAUNCH CAMPAIGN (FIRST 100 USERS)

1. **Email Outreach**
   - Target: 500 Indonesian musicians/producers
   - Template: Beta launch invitation dengan early bird pricing

2. **Social Media Blitz**
   - TikTok: Music production tips + DISBA call
   - Instagram: Artist testimonials
   - Twitter: Tech updates
   - Post 3x per hari selama 2 minggu pertama

3. **Influencer Partnerships**
   - Target micro-influencers (10k-100k followers)
   - Offer: Free Pro tier untuk 3 bulan + 10 upload slots gratis

4. **Organic Growth**
   - SEO optimize landing page untuk "distribusi musik gratis"
   - Create YouTube tutorial: "Cara distribute musik ke Spotify pake DISBA"
   - Blog posts tentang revenue sharing

---

## 📞 SUPPORT CHANNELS

Setup sebelum launch:
- [ ] Email support: support@your-domain.com
- [ ] Telegram group untuk community
- [ ] WhatsApp business untuk urgent issues
- [ ] Discord server untuk technical support

---

## 💰 FIRST MILESTONE TARGETS

**Week 1-2:**
- 10 users sign up
- 5 tracks distributed
- Rp 0 revenue (free tier testing)

**Week 3-4:**
- 50 users
- 20 tracks
- 2-3 Pro subscriptions = Rp 100.000+

**Month 2:**
- 100+ users
- 100+ tracks
- Rp 250.000+ monthly revenue

**Month 3:**
- 200+ users
- 500+ tracks
- Rp 500.000+ monthly revenue

---

## 🔄 ROLLBACK PROCEDURE

Jika ada issue saat production:

1. **Database Issue**
   - Restore dari latest backup
   - Roll back schema changes

2. **Payment Issue**
   - Pause new payment transactions
   - Contact Midtrans support
   - Manually process approvals

3. **Backend Issue**
   - Revert ke previous commit
   - Redeploy ke Vercel
   - Notify users via status page

---

## 📱 CONTACT & ESCALATION

- **Technical Issues**: Cek logs, restart service
- **Payment Issues**: Contact Midtrans support 24/7
- **Database Issues**: Contact Supabase support
- **Domain/DNS Issues**: Contact domain registrar

---

**Status: READY FOR DEPLOYMENT**
Last Updated: May 1, 2026
