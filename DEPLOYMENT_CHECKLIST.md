# ✅ DEPLOYMENT CHECKLIST - DISBA Music Production Launch

Print this out atau copy ke checklist app. Check off setiap step setelah selesai.

---

## 📋 PHASE 1: PREPARATION (Before Deployment)

### Account Setup
- [ ] Created Midtrans account at https://midtrans.com
- [ ] Verified email di Midtrans
- [ ] Accessed Midtrans Dashboard
- [ ] Copied Sandbox Server Key
- [ ] Copied Sandbox Client Key
- [ ] Saved credentials di file teks sementara

### Code Verification
- [ ] Verified `backend/services/midtrans.js` exists
- [ ] Verified payment endpoints di `backend/server.js`
- [ ] Verified `frontend/src/components/PricingPage.jsx` exists
- [ ] Verified `frontend/src/components/PaymentModal.jsx` exists
- [ ] Verified Midtrans script di `frontend/index.html`
- [ ] Verified PricingPage imported di `frontend/src/App.jsx`
- [ ] Verified pricing tab added ke navigation

### Local Testing
- [ ] Run backend: `cd backend && npm start`
- [ ] Run frontend: `cd frontend && npm run dev`
- [ ] Verify no console errors
- [ ] Verify API endpoints accessible
- [ ] Verify database connected

### Environment Files
- [ ] Created `backend/.env.production` with all keys
- [ ] Created `frontend/.env.production` with all keys
- [ ] Verified NO credentials committed to Git
- [ ] Added `.env.production` to `.gitignore` jika belum

---

## 🌐 PHASE 2: BACKEND DEPLOYMENT

### Vercel Setup
- [ ] Installed Vercel CLI: `npm i -g vercel`
- [ ] Logged in to Vercel: `vercel login`
- [ ] Navigated to backend folder: `cd backend`

### Backend Deployment
- [ ] Ran: `vercel --prod --name disba-backend`
- [ ] Selected "Create a new project"
- [ ] Set environment variables (copy dari .env.production):
  - [ ] VITE_SUPABASE_URL
  - [ ] SUPABASE_SERVICE_ROLE_KEY
  - [ ] MIDTRANS_SERVER_KEY
  - [ ] VITE_MIDTRANS_CLIENT_KEY
  - [ ] SPOTIFY_CLIENT_ID
  - [ ] SPOTIFY_CLIENT_SECRET
  - [ ] SPOTIFY_REDIRECT_URI
- [ ] Deployment completed successfully
- [ ] **COPIED BACKEND URL** (contoh: https://disba-backend.vercel.app)
- [ ] Saved backend URL ke file teks

### Backend Verification
- [ ] Opened: `https://disba-backend.vercel.app/api/payments/client-key`
- [ ] Got valid JSON response
- [ ] No 500 errors

---

## 🎨 PHASE 3: FRONTEND DEPLOYMENT

### Update Frontend Environment
- [ ] Opened `frontend/.env.production`
- [ ] Updated `VITE_API_URL=` dengan backend URL dari Phase 2
- [ ] Verified file saved

### Frontend Deployment
- [ ] Navigated to frontend folder: `cd frontend`
- [ ] Ran: `vercel --prod --name disba-music`
- [ ] Set environment variables:
  - [ ] VITE_API_URL (dari backend deployment)
  - [ ] VITE_SUPABASE_URL
  - [ ] VITE_SUPABASE_ANON_KEY
  - [ ] VITE_MIDTRANS_CLIENT_KEY
  - [ ] VITE_MIDTRANS_IS_PRODUCTION=false
- [ ] Deployment completed successfully
- [ ] **COPIED FRONTEND URL** (contoh: https://disba-music.vercel.app)
- [ ] Saved frontend URL ke file teks

### Frontend Verification
- [ ] Opened frontend URL di browser
- [ ] Tidak ada console errors (F12 → Console)
- [ ] Landing page loaded properly
- [ ] Login form accessible

---

## 🔐 PHASE 4: PAYMENT FLOW TESTING

### Test Account Setup
- [ ] Signed up dengan email test (misal: test@example.com)
- [ ] Email terverifikasi
- [ ] Login successful

### Test Subscription Payment
- [ ] Navigated to "Pricing" tab
- [ ] Clicked "Upgrade Subscription" untuk Pro tier
- [ ] Midtrans modal appeared
- [ ] Used test card: **4111 1111 1111 1111**
- [ ] Expiry: **12/25**
- [ ] CVV: **123**
- [ ] Clicked "Pay"
- [ ] Payment berhasil di-process
- [ ] Redirected ke dashboard
- [ ] Verified subscription tier changed ke "pro"

### Test Quota Purchase
- [ ] Clicked "Buy Quota" button
- [ ] Input slots: 1
- [ ] Used same test card
- [ ] Payment berhasil
- [ ] Verified quota increased di dashboard

### Test Withdrawal Request
- [ ] Manually add balance di Supabase untuk test
- [ ] Clicked "Withdraw Funds" di Wallet tab
- [ ] Withdrawal request berhasil dibuat
- [ ] Admin dashboard → Approve/Reject test
- [ ] Verified transaction status updated

### Verify di Midtrans Dashboard
- [ ] Logged in ke Midtrans sandbox: https://app.sandbox.midtrans.com
- [ ] Dashboard → Transactions
- [ ] Found test transactions
- [ ] Status: "Settlement" atau "Capture"
- [ ] Amount correct

---

## 🌍 PHASE 5: CUSTOM DOMAIN (Optional)

### Buy Domain
- [ ] Purchased domain di Namecheap/GoDaddy/etc (contoh: music.example.com)
- [ ] Domain registrar unlocked/active
- [ ] Admin access available

### Setup Backend Domain
- [ ] Vercel Backend Project → Settings → Domains
- [ ] Added: **api.music.example.com**
- [ ] Followed Vercel DNS instructions
- [ ] Updated DNS records di domain registrar
- [ ] Waited for DNS propagation (30 min - 24 jam)
- [ ] Verified: curl https://api.music.example.com/api/payments/client-key

### Setup Frontend Domain
- [ ] Vercel Frontend Project → Settings → Domains
- [ ] Added: **music.example.com**
- [ ] Followed Vercel DNS instructions
- [ ] Waited for DNS propagation
- [ ] Verified: https://music.example.com loads

### Update Backend Environment
- [ ] Updated `SPOTIFY_REDIRECT_URI` ke: https://api.music.example.com/api/spotify/callback
- [ ] Redeployed backend
- [ ] Verified new URL works

---

## 🎯 PHASE 6: SECURITY & MONITORING

### Security Checklist
- [ ] Verified HTTPS enabled (green lock di browser)
- [ ] Verified environment variables jangan di-log
- [ ] Verified CORS properly configured (bukan *)
- [ ] Verified rate limiting di place untuk API
- [ ] Verified input validation di semua endpoints
- [ ] Verified error messages jangan expose sensitive info

### Monitoring Setup
- [ ] Added email untuk error notifications
- [ ] Setup Vercel analytics dashboard access
- [ ] Added Supabase monitoring alerts
- [ ] Created daily checklist untuk monitoring

### Backup & Recovery
- [ ] Enabled automatic Supabase backups
- [ ] Tested backup restore process
- [ ] Saved recovery procedures di file teks

---

## 📢 PHASE 7: MARKETING LAUNCH

### Email Campaign
- [ ] Created email list (minimal 50 emails)
- [ ] Wrote launch announcement email
- [ ] Sent to first batch (10 emails)
- [ ] Tracked open/click rates
- [ ] Prepared follow-up emails

### Social Media
- [ ] Created TikTok post about launch
- [ ] Created Instagram post about launch
- [ ] Created Twitter/X post about launch
- [ ] Posted 3x today
- [ ] Set reminder untuk post daily

### Community Building
- [ ] Created Telegram group untuk users
- [ ] Invited first 10 users
- [ ] Shared dashboard access instructions
- [ ] Setup daily support response time (max 1 jam)

### First Users Tracking
- [ ] Documented first 5 signups dengan tanggal
- [ ] Tracked first payment attempt
- [ ] Tracked first successful payment
- [ ] Celebrated with team/friends!

---

## ✨ PHASE 8: OPTIMIZATION & SCALING

### Performance Monitoring
- [ ] Verified page load time < 3 seconds
- [ ] Verified API response time < 500ms
- [ ] Checked browser console untuk warnings
- [ ] Tested di 3G connection speed

### Bug Reporting
- [ ] Created bug tracking (GitHub Issues or Trello)
- [ ] Documented any issues found
- [ ] Priority 1: Payment issues
- [ ] Priority 2: Login issues  
- [ ] Priority 3: UI/UX improvements

### User Feedback
- [ ] Created form untuk user feedback
- [ ] Asked first 10 users tentang experience
- [ ] Documented improvement suggestions
- [ ] Planned v1.1 features

---

## 📊 PHASE 9: BUSINESS METRICS

### Day 1 Metrics
- [ ] Total users: ____
- [ ] Free tier: ____
- [ ] Pro tier: ____
- [ ] Revenue collected: Rp ____

### Week 1 Goals
- [ ] Target users: 10+
- [ ] Target revenue: Rp 50,000+
- [ ] Check daily at 9 AM

### Communication
- [ ] Setup support email responses
- [ ] Send daily update ke team
- [ ] Weekly review meeting scheduled

---

## 🚀 GO-LIVE CONFIRMATION

### Final Checklist Before Announcing
- [ ] Backend deployed dan tested ✅
- [ ] Frontend deployed dan tested ✅
- [ ] Payment flow tested end-to-end ✅
- [ ] Database working ✅
- [ ] Midtrans webhook verified ✅
- [ ] Support email setup ✅
- [ ] First test users created ✅
- [ ] Marketing materials ready ✅

### GO-LIVE! 🎉
- [ ] Posted launch announcement
- [ ] Emailed first 20 users
- [ ] Posted social media blitz
- [ ] Shared with personal network
- [ ] Created launch tweet/post
- [ ] Invited 5 influencers untuk trial

---

## 📝 NOTES & OBSERVATIONS

```
Date Started: ___________
Date Deployed: ___________
First User: ___________
First Payment: ___________

Issues Encountered:
1. ___________________________
2. ___________________________
3. ___________________________

Solutions Applied:
1. ___________________________
2. ___________________________
3. ___________________________

Next Steps:
1. ___________________________
2. ___________________________
3. ___________________________
```

---

## ⏱️ TIME TRACKING

- Phase 1 (Prep): _____ menit
- Phase 2 (Backend): _____ menit  
- Phase 3 (Frontend): _____ menit
- Phase 4 (Testing): _____ menit
- Phase 5 (Domain): _____ menit
- Phase 6 (Security): _____ menit
- Phase 7 (Marketing): _____ menit
- **Total Time: _____ menit** (Target: 120 menit)

---

## 🎯 SUCCESS CRITERIA

Deployment sukses jika:
- ✅ All 4 payment types working (subscription, quota, withdrawal)
- ✅ No errors di production
- ✅ First 10 users signed up
- ✅ At least 1 test payment successful
- ✅ Database backed up
- ✅ Monitoring in place
- ✅ Support team ready

---

**PRINT THIS CHECKLIST AND CHECK OFF AS YOU GO!**

---

*Created: May 1, 2026*  
*Status: Ready for Execution*  
*Estimated Time: 2 hours*  
*Expected Revenue: Rp 50k+ on Day 1*
