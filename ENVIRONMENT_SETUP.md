# 🔧 Environment Setup Guide - Disba Music

**Version:** 2.0 (Manual Payment Implementation)  
**Status:** ✅ Production Ready

---

## 📋 Required Environment Variables

### Frontend Environment Variables

Set these in your Vercel project or `.env` file:

```bash
# Supabase Configuration (REQUIRED)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# API Configuration (OPTIONAL - defaults to http://localhost:3001)
VITE_API_URL=https://your-backend-url.com
```

**Obtaining These Values:**
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public` key → `VITE_SUPABASE_ANON_KEY`

### Backend Environment Variables

Set these in your backend deployment platform or `.env` file:

```bash
# Supabase Configuration (REQUIRED)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
VITE_SUPABASE_URL=https://your-project.supabase.co

# Frontend URL for CORS (REQUIRED for production)
FRONTEND_URL=https://your-frontend-url.com

# Server Port (OPTIONAL - defaults to 3001)
PORT=3001

# Environment Mode (OPTIONAL - for development)
NODE_ENV=production
```

**Obtaining These Values:**
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`
5. `FRONTEND_URL` is your production frontend domain (e.g., `https://disba-music.vercel.app`)

---

## 🚀 Setup Instructions by Platform

### Vercel (Recommended for Frontend)

1. **Connect Repository**
   - Go to [Vercel](https://vercel.com)
   - Click "New Project"
   - Select your GitHub repository
   - Click "Import"

2. **Set Environment Variables**
   - Go to **Settings** → **Environment Variables**
   - Add:
     ```
     VITE_SUPABASE_URL = https://your-project.supabase.co
     VITE_SUPABASE_ANON_KEY = your-anon-key-here
     VITE_API_URL = https://your-backend-url.com
     ```
   - Click "Save"

3. **Deploy**
   - Click "Deploy"
   - Wait for build to complete

### Railway / Render / Fly.io (For Backend)

**Example for Railway:**

1. **Create New Project**
   - Go to [Railway](https://railway.app)
   - Click "New Project"
   - Select "GitHub Repo"
   - Choose your repository

2. **Configure Service**
   - Select your repository
   - Choose `backend/package.json`
   - Click "Deploy"

3. **Set Environment Variables**
   - Go to **Variables**
   - Add all backend variables from above
   - Redeploy

4. **Get Backend URL**
   - Find your backend URL (e.g., `https://disba-backend.up.railway.app`)
   - Set this as `VITE_API_URL` in frontend

---

## 🔐 Security Best Practices

### DO:
- ✅ Keep `SUPABASE_SERVICE_ROLE_KEY` secret (backend only)
- ✅ Use environment variables, never hardcode secrets
- ✅ Rotate keys regularly
- ✅ Use different keys for dev/staging/production

### DON'T:
- ❌ Commit `.env` files to git
- ❌ Share keys in Slack/email
- ❌ Use same keys across environments
- ❌ Log sensitive values
- ❌ Expose service role key to frontend

---

## ✅ Verification Checklist

After setting environment variables, verify:

1. **Frontend Can Load**
   ```
   Frontend loads without "Missing environment variable" error
   ```

2. **Backend Can Start**
   ```
   GET https://your-backend-url.com/api/admin/dashboard
   Should return: { error: 'Missing bearer token.' } (401)
   ```

3. **Database Connection Works**
   ```
   Login to app → should connect to Supabase
   Check user created in Supabase auth.users table
   ```

4. **Payment Flow Works**
   ```
   Login → Pricing → Try to upgrade subscription
   Should see payment methods (Bank Transfer, QRIS/DANA)
   Should display payment instructions
   ```

---

## 🆘 Troubleshooting

### "Missing environment variable: VITE_SUPABASE_URL"

**Cause:** Environment variable not set in Vercel

**Fix:**
1. Go to Vercel project settings
2. Add `VITE_SUPABASE_URL` environment variable
3. Click "Save and Deploy"

### "Cannot reach backend API"

**Cause:** `VITE_API_URL` not set or incorrect

**Fix:**
1. Check backend is deployed and running
2. Set `VITE_API_URL` to correct backend domain
3. Ensure CORS is configured correctly

### Backend returns 403 "Admin access required"

**Cause:** Endpoint requires admin role

**Fix:**
- Normal users can't access admin endpoints
- This is expected behavior
- Contact admin to grant access

### Payment modal shows error "Invalid session"

**Cause:** User session expired

**Fix:**
- User should logout and login again
- Check browser localStorage for valid token

---

## 📱 Local Development Setup

If running locally:

1. **Install Dependencies**
   ```bash
   cd frontend && npm install
   cd ../backend && npm install
   ```

2. **Create `.env` files**

   **frontend/.env.local:**
   ```bash
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   VITE_API_URL=http://localhost:3001
   ```

   **backend/.env:**
   ```bash
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   VITE_SUPABASE_URL=https://your-project.supabase.co
   FRONTEND_URL=http://localhost:5173
   PORT=3001
   NODE_ENV=development
   ```

3. **Start Services**
   ```bash
   # Terminal 1 - Backend
   cd backend
   npm run dev

   # Terminal 2 - Frontend
   cd frontend
   npm run dev
   ```

4. **Access Application**
   - Frontend: http://localhost:5173
   - Backend: http://localhost:3001

---

## 🔄 Updating Environment Variables

To update variables in production:

1. **Vercel:**
   - Go to project Settings → Environment Variables
   - Edit or add new variables
   - Click "Save and Deploy"
   - Redeploy project

2. **Railway/Render:**
   - Go to project Variables
   - Edit values
   - Automatic redeploy (usually)

---

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [Railway Documentation](https://docs.railway.app)

---

**Last Updated:** 2 Mei 2026
