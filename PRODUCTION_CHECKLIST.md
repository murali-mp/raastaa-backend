# 🚀 Production Launch Checklist

## Pre-Deployment

### Security
- [ ] Generate new JWT secrets (don't use defaults)
- [ ] Enable HTTPS (automatic on all platforms)
- [ ] Set secure CORS origins (not `*`)
- [ ] Review rate limiting settings
- [ ] Enable helmet.js (already configured)
- [ ] Set NODE_ENV=production

### Database
- [ ] Enable PostGIS extension
- [ ] Run all migrations
- [ ] Create database backups
- [ ] Set up connection pooling
- [ ] Add database indexes (already in migrations)

### Monitoring
- [ ] Set up error tracking (Sentry)
- [ ] Configure logging (Winston already setup)
- [ ] Set up uptime monitoring
- [ ] Add health check endpoint (already at /health)

### Environment Variables
```bash
# Required
DATABASE_URL="postgresql://..."
REDIS_URL="redis://..."
JWT_SECRET="..."
JWT_REFRESH_SECRET="..."
NODE_ENV="production"
PORT="3000"

# Recommended
CORS_ORIGINS="https://yourdomain.com"
LOG_LEVEL="warn"
RATE_LIMIT_MAX_REQUESTS="100"

# Optional
SENTRY_DSN="..."
```

## Deployment Steps

### 1. Choose Platform
- [ ] Render.com (easiest, Singapore)
- [ ] Fly.io (Mumbai, lowest latency for Bangalore)
- [ ] Railway.app (simple, good DX)

### 2. Deploy Backend
- [ ] Push code to GitHub
- [ ] Connect platform to repository
- [ ] Configure environment variables
- [ ] Deploy and verify

### 3. Database Setup
- [ ] Enable PostGIS extension
- [ ] Run migrations: `npx prisma migrate deploy`
- [ ] Seed initial data (optional)
- [ ] Test connection from backend

### 4. Test API
```bash
# Health check
curl https://your-api.com/health

# Sign up test user
curl -X POST https://your-api.com/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","name":"Test"}'

# Login
curl -X POST https://your-api.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Test vendors (with token)
curl "https://your-api.com/api/v1/vendors/nearby?latitude=12.9716&longitude=77.5946&radius=5000" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 5. Update iOS App
- [ ] Update Backend.swift with production URL
- [ ] Test in DEBUG mode first
- [ ] Build release version
- [ ] Test on physical device

### 6. Production iOS Build
```swift
// Backend.swift
public static let baseURL: String = {
    #if DEBUG
    return "http://localhost:3000/api/v1"
    #else
    return "https://your-api.onrender.com/api/v1"  // Production URL
    #endif
}()
```

## Post-Deployment

### Monitoring
- [ ] Watch server logs for errors
- [ ] Check database performance
- [ ] Monitor API response times
- [ ] Track user signups

### Performance
- [ ] Measure API latency from India
- [ ] Check cold start times (if on free tier)
- [ ] Monitor database query times
- [ ] Review Redis cache hit rates

### User Testing
- [ ] Create test account from iOS app
- [ ] Test all integrated features:
  - [ ] Sign up / login
  - [ ] Nearby vendors search
  - [ ] Vendor details
  - [ ] Wallet balance
  - [ ] Transaction history
  - [ ] Challenge claiming
- [ ] Test from multiple locations in Bangalore
- [ ] Test on different iOS devices

### Documentation
- [ ] Update README with production URL
- [ ] Document API endpoints
- [ ] Create user guide
- [ ] Write troubleshooting guide

## Bangalore-Specific Optimizations

### Choose Best Region
- ✅ **Fly.io Mumbai** - 20-30ms latency
- ⚠️ Render Singapore - 50-80ms latency
- ⚠️ AWS ap-south-1 Mumbai - 25-40ms latency

### Seed Bangalore Data
- [ ] Add real Bangalore vendors
- [ ] Add accurate GPS coordinates
- [ ] Add popular areas (Koramangala, Indiranagar, etc.)
- [ ] Add local tags (dosa, filter coffee, biryani)

### Test from Bangalore
```bash
# Test latency
ping your-api.onrender.com

# Test API from Indian IP
curl -w "@curl-format.txt" https://your-api.com/health
```

## Cost Management

### Free Tier Limits
**Render:**
- 750 hours/month web service
- 1GB PostgreSQL
- Sleeps after 15min inactivity

**Fly.io:**
- 3 shared-cpu-1x VMs
- 160GB bandwidth
- Mumbai region included

**Railway:**
- $5/month free credit
- Usage-based after that

### Upgrade Path
When you hit limits:
1. Start with Fly.io Mumbai ($5-10/month)
2. Upgrade database if needed ($7-15/month)
3. Add Redis persistence ($5/month)
4. Total: ~$20-30/month for production

## Emergency Procedures

### API Down
1. Check platform status page
2. Review logs for errors
3. Verify database connection
4. Check environment variables
5. Restart service if needed

### Database Issues
1. Check connection string
2. Verify PostGIS is installed
3. Check connection pool limits
4. Review slow queries
5. Consider adding read replica

### High Latency
1. Check server region (Mumbai best)
2. Enable Redis caching
3. Optimize database queries
4. Add connection pooling
5. Consider CDN for assets

## Rollback Plan

If deployment fails:
```bash
# Render: Rollback to previous version
render rollback

# Railway: Deploy previous commit
railway up --commit <previous-commit-sha>

# Fly: Deploy previous release
fly releases
fly deploy --image <previous-image>
```

## Launch Day Checklist

### Morning of Launch
- [ ] Verify API is up
- [ ] Check all endpoints working
- [ ] Database has seed data
- [ ] Monitor logs in real-time

### During Launch
- [ ] Watch for errors
- [ ] Monitor signup rate
- [ ] Check API response times
- [ ] Be ready to scale

### After Launch
- [ ] Review first day metrics
- [ ] Check user feedback
- [ ] Fix any critical bugs
- [ ] Plan optimizations

## Success Metrics

### Week 1
- API uptime > 99%
- Response time < 200ms (Mumbai)
- Zero critical errors
- 50+ signups (target)

### Month 1
- Scale infrastructure as needed
- Add monitoring dashboards
- Implement user feedback
- Plan new features

---

## Quick Commands Reference

```bash
# Deploy to Fly.io Mumbai
fly launch --region bom

# Deploy to Render
git push origin main  # Auto-deploys

# Deploy to Railway
railway up

# Check logs
fly logs  # Fly
render logs --tail  # Render
railway logs  # Railway

# Connect to database
fly postgres connect -a raastaa-backend-db
railway connect postgres

# Run migrations
fly ssh console -C "npx prisma migrate deploy"
railway run npx prisma migrate deploy
```

---

**Ready to launch? Follow this checklist and you'll have a production app serving all of Bangalore! 🚀**
