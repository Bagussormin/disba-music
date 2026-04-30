# 🎵 DISBA Music - Spotify Integration Setup Guide

## Overview
DISBA Music Spotify Integration memungkinkan Anda untuk:
- 📤 Distribute track ke Spotify
- 📊 Track analytics & streams  
- 💰 Menghasilkan revenue melalui commission split (15% DISBA, 85% Artist)
- 💸 Auto-calculate & payout commissions setiap bulan

---

## 🚀 QUICK START (5 menit)

### Step 1: Setup Spotify Developer Account
1. Go to https://developer.spotify.com/dashboard
2. Sign up or login dengan akun Spotify Anda
3. Accept terms & agree to policies
4. Click "Create an App"
5. Fill form:
   - App name: `DISBA Music Aggregator`
   - Accept terms
   - Create
6. Dapatkan:
   - **Client ID** ✅
   - **Client Secret** ✅

### Step 2: Update Environment Variables
Update `.env` di `/backend/`:
```bash
SPOTIFY_CLIENT_ID=your_client_id_from_step_1
SPOTIFY_CLIENT_SECRET=your_client_secret_from_step_1
SPOTIFY_REDIRECT_URI=http://localhost:3001/api/spotify/callback
SPOTIFY_WEBHOOK_SECRET=random_secret_string_12345
```

### Step 3: Run Database Migration
1. Go to Supabase Dashboard → SQL Editor
2. Copy & paste content dari `spotify_integration.sql`
3. Run Migration ✅

### Step 4: Install Dependencies
```bash
cd backend
npm install
```

### Step 5: Test the API
```bash
npm start
# Server running on port 3001
```

---

## 📡 API Endpoints

### 1. **Distribute Track to Spotify**
```
POST /api/spotify/distribute
Authorization: Bearer {accessToken}

Body:
{
  "releaseId": "uuid-of-release",
  "albumName": "Album Name (optional)"
}

Response:
{
  "message": "Track berhasil didistribusikan ke Spotify!",
  "distribution": {...},
  "spotify_uri": "spotify:track:xxxxx",
  "estimated_live_date": "2026-05-02T10:30:00Z"
}
```

### 2. **Get Distribution Status**
```
GET /api/spotify/status/:releaseId
Authorization: Bearer {accessToken}

Response:
{
  "distribution": {
    "id": "uuid",
    "status": "distributed",
    "spotify_track_id": "spotify:track:xxxxx",
    "distribution_date": "2026-05-01T10:00:00Z"
  },
  "analytics": {
    "streams": 1250,
    "total_revenue": 50000,
    "report_date": "2026-05-01"
  },
  "streams": 1250,
  "revenue": 50000
}
```

### 3. **Get Detailed Analytics**
```
GET /api/spotify/analytics/:releaseId
Authorization: Bearer {accessToken}

Response:
{
  "analytics": [
    {
      "report_date": "2026-05-01",
      "streams": 1250,
      "total_revenue": 50000,
      "disba_commission": 7500,      // 15%
      "artist_payout": 42500          // 85%
    }
  ],
  "summary": {
    "totalStreams": 10000,
    "totalRevenue": 400000,
    "totalDisbaCommission": 60000,
    "totalArtistPayout": 340000,
    "commissionPercentage": 15
  }
}
```

### 4. **Receive Royalty Webhook**
```
POST /api/spotify/webhook
(No auth required for webhooks)

Body:
{
  "release_id": "uuid",
  "artist_id": "artist-uuid",
  "streams": 1250,
  "revenue": 50000,
  "report_date": "2026-05-01"
}

Response:
{
  "message": "Webhook processed successfully."
}
```

### 5. **Calculate Monthly Commissions** (Admin)
```
POST /api/spotify/calculate-commissions
Authorization: Bearer {admin_accessToken}

Body:
{
  "month": "2026-05"  // Format: YYYY-MM
}

Response:
{
  "message": "Commission calculation complete.",
  "admin_commission": {
    "month": "2026-05-01",
    "total_artist_earnings": 1000000,
    "total_commission": 150000,
    "commission_percentage": 15,
    "status": "calculated"
  },
  "summary": {
    "month": "2026-05",
    "totalArtistEarnings": 1000000,
    "totalDisbaCommission": 150000,
    "artistsAffected": 45
  }
}
```

### 6. **Payout Commissions to DISBA Wallet** (Admin)
```
POST /api/spotify/payout-commissions
Authorization: Bearer {admin_accessToken}

Body:
{
  "month": "2026-05"
}

Response:
{
  "message": "Commission payout successful!",
  "amount": 150000,
  "new_balance": 1250000,
  "month": "2026-05"
}
```

### 7. **Get Commission History** (Admin)
```
GET /api/spotify/commissions
Authorization: Bearer {admin_accessToken}

Response:
{
  "commissions": [
    {
      "month": "2026-05-01",
      "total_commission": 150000,
      "status": "paid"
    }
  ],
  "summary": {
    "total_commissions": 450000,
    "total_paid": 300000,
    "pending_amount": 150000
  }
}
```

---

## 💰 Revenue Flow (How DISBA Makes Money)

```
Artist Uploads Track
        ↓
Admin Approves Release
        ↓
Artist Distributes to Spotify
        ↓
Spotify Tracks Streams & Revenue
        ↓
Revenue Report:
  - Total: Rp 100.000
  - DISBA Commission (15%): Rp 15.000 ✅
  - Artist Payout (85%): Rp 85.000 ✅
        ↓
End of Month: Admin Runs /calculate-commissions
        ↓
Commissions Calculated:
  - All artist earnings this month: Rp 5.000.000
  - DISBA share: Rp 750.000 ✅
        ↓
Admin Runs /payout-commissions
        ↓
DISBA Wallet += Rp 750.000 💸
        ↓
Admin can Withdraw via /api/admin/platform-withdrawal
```

---

## 🔄 Monthly Commission Process

### For Admin:

**Step 1: End of Month (e.g., May 31)**
```bash
curl -X POST http://localhost:3001/api/spotify/calculate-commissions \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"month": "2026-05"}'
```

**Step 2: Verify Calculations**
```bash
curl http://localhost:3001/api/spotify/commissions \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**Step 3: Transfer to Wallet**
```bash
curl -X POST http://localhost:3001/api/spotify/payout-commissions \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"month": "2026-05"}'
```

**Step 4: Withdraw**
```bash
curl -X POST http://localhost:3001/api/admin/platform-withdrawal \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

---

## 📊 Database Schema

### New Tables Created:

#### `spotify_distributions`
Tracks distribution history untuk setiap release
```sql
- id (UUID, PK)
- release_id (FK to releases)
- user_id (FK to auth.users)
- spotify_track_id (TEXT, UNIQUE)
- spotify_uri (TEXT)
- status (pending, distributed, rejected, error)
- distribution_date (TIMESTAMP)
```

#### `spotify_analytics`
Monthly royalty & stream data per track
```sql
- id (UUID, PK)
- spotify_distribution_id (FK)
- release_id (FK)
- user_id (FK)
- report_date (DATE)
- streams (BIGINT)
- total_revenue (NUMERIC)
- disba_commission (NUMERIC) -- 15%
- artist_payout (NUMERIC) -- 85%
```

#### `admin_commissions`
Monthly commission calculations
```sql
- id (UUID, PK)
- month (DATE, UNIQUE)
- total_artist_earnings (NUMERIC)
- total_commission (NUMERIC)
- commission_percentage (NUMERIC)
- status (pending, calculated, paid)
```

#### `artist_commissions`
Per-artist commission tracking
```sql
- id (UUID, PK)
- user_id (FK)
- admin_commission_id (FK)
- artist_earnings (NUMERIC)
- commission_owed (NUMERIC)
- status (pending, paid)
```

---

## 🧪 Testing Local Development

### Test Flow:

1. **Distribute a track:**
```bash
POST http://localhost:3001/api/spotify/distribute
Header: Authorization: Bearer USER_TOKEN
Body: {"releaseId": "release-uuid"}
```

2. **Check status:**
```bash
GET http://localhost:3001/api/spotify/status/release-uuid
Header: Authorization: Bearer USER_TOKEN
```

3. **Simulate Spotify webhook (mock royalties):**
```bash
POST http://localhost:3001/api/spotify/webhook
Body: {
  "release_id": "release-uuid",
  "streams": 5000,
  "revenue": 250000,
  "report_date": "2026-05-01"
}
```

4. **Calculate commissions:**
```bash
POST http://localhost:3001/api/spotify/calculate-commissions
Header: Authorization: Bearer ADMIN_TOKEN
Body: {"month": "2026-05"}
```

5. **Check commission history:**
```bash
GET http://localhost:3001/api/spotify/commissions
Header: Authorization: Bearer ADMIN_TOKEN
```

6. **Payout commissions:**
```bash
POST http://localhost:3001/api/spotify/payout-commissions
Header: Authorization: Bearer ADMIN_TOKEN
Body: {"month": "2026-05"}
```

---

## ⚠️ Important Notes

### Commission Calculation
- **DISBA keeps:** 15% dari setiap payout
- **Artist gets:** 85% dari setiap payout
- **Pro tier artists:** Bisa upgrade to 100% payout (jika ada fitur premium)

### Real-world Implementation
- Current implementation menggunakan **simulated Spotify responses**
- Untuk production, integrate dengan:
  - Spotify Distribution API (via partner like TuneCore/CD Baby)
  - Spotify for Artists API untuk analytics
  - Webhook dari Spotify untuk royalty reports

### Security
- Semua endpoints (kecuali webhook) require Bearer token authentication
- Webhook signature verification tersedia via `verifyWebhookSignature()`
- Admin-only endpoints protected by `requireAdmin` middleware

---

## 🎯 Next Steps

1. ✅ Setup Spotify Developer credentials
2. ✅ Run database migration
3. ✅ Test distribution endpoint
4. ✅ Setup monthly commission automation
5. 📋 **TODO:** Integrate with real Spotify Distribution API
6. 📋 **TODO:** Build frontend distribution UI
7. 📋 **TODO:** Setup automated webhooks
8. 📋 **TODO:** Add Apple Music, YouTube Music integration

---

## 📞 Support

For issues or questions:
1. Check `.env` has all required Spotify variables
2. Verify database migration ran successfully
3. Check backend logs: `npm start`
4. Verify artist is authenticated before distribution

---

**Status:** 🟢 **MVP Ready for Testing**

Generated: 2026-05-01
