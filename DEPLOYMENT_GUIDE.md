# 🚀 Complete Deployment Guide

## Fastest Path: Use the Deploy Script

```bash
cd /Users/murali/Desktop/raasta-all/raastaa-backend
./deploy.sh
```

Choose your platform and the script handles everything!

---

## Manual Deployment Instructions

See `DEPLOY_NOW.md` for quick start guide with all platforms.

For detailed step-by-step instructions for each platform, see below:

### 1. Fly.io Mumbai (Best for Bangalore - 20-30ms latency)

```bash
# Install CLI
brew install flyctl

# Login
fly auth login

# Launch in Mumbai
fly launch --region bom --name raastaa-backend

# Create PostgreSQL
fly postgres create --name raastaa-db --region bom
fly postgres attach raastaa-db

# Enable PostGIS
fly postgres connect -a raastaa-db
CREATE EXTENSION IF NOT EXISTS postgis;
\q

# Set secrets
fly secrets set JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
fly secrets set JWT_REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")

# Deploy
fly deploy

# Run migrations
fly ssh console -C "npx prisma migrate deploy"
```

Your API: `https://raastaa-backend.fly.dev`

### 2. Render.com (Easiest - Free Tier)

1. Push code to GitHub
2. Go to https://dashboard.render.com
3. Click "New +" → "Blueprint"
4. Select your `raastaa-backend` repo
5. Render auto-deploys using `render.yaml`
6. Enable PostGIS in database
7. Update JWT secrets in environment

Your API: `https://raastaa-api.onrender.com`

### 3. Railway.app (Simple)

```bash
# Install CLI
npm install -g @railway/cli

# Login
railway login

# Init project
railway init

# Add services
railway add --plugin postgresql
railway add --plugin redis

# Deploy
railway up

# Open dashboard to set env vars
railway open
```

---

## Post-Deployment

### 1. Test API

```bash
API_URL="https://your-api-url.com"

# Health check
curl $API_URL/health

# Sign up
curl -X POST $API_URL/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@bangalore.com","password":"test123","name":"Test User"}'
```

### 2. Update iOS App

Edit `Backend.swift`:
```swift
return "https://your-api-url.com/api/v1"  // Production URL
```

### 3. Monitor

- Check logs on platform dashboard
- Setup uptime monitoring (uptimerobot.com)
- Monitor latency from Bangalore

---

## Platform Comparison

| Platform | Region | Latency* | Free Tier | Cost/Month |
|----------|--------|----------|-----------|------------|
| Fly.io | Mumbai 🇮🇳 | 20-30ms | Yes | $5-10 |
| Render | Singapore | 60-80ms | Yes | Free/$21 |
| Railway | Singapore | 60-80ms | $5 credit | $10-20 |

*Latency from Bangalore

**Recommendation:** Fly.io Mumbai for best performance in India!

---

## Need Help?

- See `DEPLOY_NOW.md` for quick start
- See `PRODUCTION_CHECKLIST.md` for launch prep
- Check platform docs for troubleshooting
