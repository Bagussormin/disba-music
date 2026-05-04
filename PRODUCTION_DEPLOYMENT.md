# DISBA Music - Production Deployment Checklist

## ✅ Environment Configuration
- [ ] Set VITE_API_URL to production API domain
- [ ] Configure all Spotify API credentials
- [ ] Configure TuneCore API credentials  
- [ ] Configure Apple Music API credentials
- [ ] Set JWT_SECRET (minimum 32 characters)
- [ ] Set ENCRYPTION_KEY (minimum 32 characters)
- [ ] Configure database connection string
- [ ] Setup SMTP for email notifications
- [ ] Configure Sentry for error tracking

## ✅ API Integrations
- [ ] Spotify Developer Account (https://developer.spotify.com)
  - [ ] Client ID configured
  - [ ] Client Secret secured
  - [ ] Redirect URI set to production domain
  - [ ] Webhook secret generated and stored
  
- [ ] TuneCore Partner API (https://tunecore.com/partner-api)
  - [ ] API Key configured
  - [ ] API URL set
  - [ ] Webhook secret generated
  
- [ ] Apple Music Integration (https://developer.apple.com/musickit)
  - [ ] API Key configured
  - [ ] Team ID set
  - [ ] Webhook secret generated

## ✅ Backend Setup
- [ ] Install production dependencies: `npm install --production`
- [ ] Run database migrations: `npm run migrate`
- [ ] Setup Edge Functions: `npx supabase functions deploy process-revenue-webhook`
- [ ] Configure webhook secrets in Supabase
- [ ] Test all API endpoints
- [ ] Setup error handling and logging

## ✅ Frontend Setup  
- [ ] Set VITE_API_URL environment variable
- [ ] Build production bundle: `npm run build`
- [ ] Test all features with production API
- [ ] Verify authentication flow
- [ ] Test distribution functionality

## ✅ Payment Processing (Future)
- [ ] Setup payment gateway account
- [ ] Configure webhook handlers
- [ ] Test withdrawal flow (simulate)
- [ ] Setup payout automation

## ✅ Security Hardening
- [ ] Enable HTTPS/TLS on all endpoints
- [ ] Configure CORS properly
- [ ] Setup rate limiting
- [ ] Enable webhook signature verification
- [ ] Rotate all secrets
- [ ] Setup firewall rules
- [ ] Configure DDoS protection

## ✅ Monitoring & Logging
- [ ] Setup error tracking (Sentry)
- [ ] Configure log aggregation
- [ ] Setup performance monitoring
- [ ] Create alerting rules
- [ ] Setup backup procedures

## ✅ Go-Live Checklist
- [ ] All endpoints tested in production
- [ ] Database backed up
- [ ] Team trained on operations
- [ ] Support channels setup
- [ ] Rollback plan documented
- [ ] Launch announcement ready
