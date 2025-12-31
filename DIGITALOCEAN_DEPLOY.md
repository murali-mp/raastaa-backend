# DigitalOcean App Platform Deployment

## Prerequisites
- DigitalOcean account with $200 credits
- GitHub repository (already done ✅)

## Step 1: Create PostgreSQL Database

1. Go to https://cloud.digitalocean.com/databases
2. Click **"Create Database"**
3. Choose:
   - **Database Engine:** PostgreSQL 15
   - **Region:** Bangalore (blr1) 🇮🇳 - Perfect for your users!
   - **Plan:** Basic - $15/month (covered by credits)
   - **Name:** raastaa-db
4. Click **"Create Database"**
5. Wait 2-3 minutes for provisioning

### Database Setup

Once database is ready:
1. Click on database → **"Connection Details"** tab
2. Copy the connection string (will be used as DATABASE_URL)

**Note:** PostGIS is NOT required! The backend now uses simple Haversine distance calculations which work perfectly for city-scale distances like Bangalore. This is actually more efficient and doesn't require special extensions.

## Step 2: Create Redis (Optional but Recommended)

1. Go to https://cloud.digitalocean.com/databases
2. Click **"Create Database"**
3. Choose:
   - **Database Engine:** Redis
   - **Region:** Bangalore (blr1)
   - **Plan:** Basic - $15/month
   - **Name:** raastaa-redis
4. Click **"Create Database"**

## Step 3: Deploy App

1. Go to https://cloud.digitalocean.com/apps
2. Click **"Create App"**
3. Choose **"GitHub"** as source
4. Select repository: `raastaa-backend`
5. Branch: `main`
6. Click **"Next"**

### Configure App Settings

**Region:** Bangalore (blr1)

**Build Command:**
```bash
npm ci && npx prisma generate && npm run build
```

**Run Command:**
```bash
npx prisma migrate deploy && npm start
```

> **Note:** The run command first applies database migrations, then starts the server.

**Environment Variables:**

Click "Edit" and add these:

```
NODE_ENV=production
PORT=8080

# Database (get from database dashboard)
DATABASE_URL=postgresql://doadmin:PASSWORD@HOST:25060/raastaa?sslmode=require

# JWT Secrets (use the ones generated earlier)
JWT_SECRET=847e4b3de35f2697917f7a0e4e2b853ec05a8a64b84b1398f8356c80ebc35b2b55f143d06fd2043d7ab360058c1fe541d6c79aaff3a6320ea3b60b4e28a9ddf1
JWT_REFRESH_SECRET=a32b91abdd919f98ef3f574cf7e1ee8e9a828fab1034326007e34d27b494a90027b74b18f48908fba56fc58436b606d97a1a6e53ca9fd60e8570522eebeadca4

# CORS
CORS_ORIGINS=*

# Logging
LOG_LEVEL=info

# Redis (optional - only add if you created Redis database)
# REDIS_URL=rediss://default:PASSWORD@HOST:25061
```

### Generate JWT Secrets

Run this locally to generate secrets:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# Copy output for JWT_SECRET

node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# Copy output for JWT_REFRESH_SECRET
```

**Plan:** Professional - $25/month (1GB RAM, covered by credits)

Click **"Next"** → **"Create Resources"**

## Step 4: Deploy & Test

DigitalOcean will:
1. Clone your repo
2. Build the app
3. Run migrations
4. Deploy to Bangalore datacenter

Your API will be at:
```
https://raastaa-backend-xxxxx.ondigitalocean.app
```

Test it:
```bash
curl https://your-app-url.ondigitalocean.app/health
```

## Cost Breakdown (With Your $200 Credits)

| Service | Cost/Month | Notes |
|---------|------------|-------|
| App (API Server) | $25 | Professional tier, 1GB RAM |
| PostgreSQL | $15 | 1GB RAM, 10GB storage |
| Redis (optional) | $15 | 1GB RAM |
| **Total** | **$40-55/month** | |

**Your $200 credits = 3-5 months FREE!** 🎉

Or skip Redis and it's $40/month = 5 months free.

## Benefits of DigitalOcean

✅ **Bangalore datacenter** - 5-10ms latency locally!
✅ **Your $200 credits** - Run free for months
✅ **PostgreSQL + Redis** - Fully managed
✅ **Auto-scaling** - Handles traffic spikes
✅ **SSL/HTTPS** - Automatic
✅ **Monitoring** - Built-in dashboards

## Alternative: DigitalOcean Droplet (Even Cheaper)

If you want to maximize your credits, you could use a Droplet:

**Droplet in Bangalore:**
- Cost: $6/month (cheapest option)
- Full control
- Install PostgreSQL + Redis yourself
- $200 = 33 months of hosting! 🤯

But App Platform is easier and fully managed.

## Next Steps

1. Create PostgreSQL database in Bangalore
2. Enable PostGIS extension
3. Create Redis (optional)
4. Deploy app via App Platform
5. Update iOS Backend.swift with your URL
6. Test and launch! 🚀

Need help with any step?
