# 🌍 Deploy to Production - Quick Guide

Your backend is ready to go live! Here's the **fastest path** to get it working across Bangalore.

---

## 🚀 Fastest Option: Fly.io Mumbai (10 minutes)

**Why Fly.io?**
- ✅ Mumbai datacenter - **20-30ms latency** from Bangalore
- ✅ Free allowance covers small apps
- ✅ Simple CLI deployment
- ✅ Best performance for India

### Quick Deploy

```bash
cd /Users/murali/Desktop/raasta-all/raastaa-backend

# Run the deploy script
./deploy.sh

# Choose option 2 (Fly.io)
```

The script will:
1. Install Fly CLI
2. Create app in Mumbai
3. Setup PostgreSQL + PostGIS
4. Setup Redis
5. Generate secure JWT secrets
6. Deploy your backend

**Done!** Your API will be at: `https://raastaa-backend.fly.dev`

### Enable PostGIS

```bash
# Connect to database
fly postgres connect -a raastaa-backend-db

# Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;
\q

# Run migrations
fly ssh console -C "npx prisma migrate deploy"
```

---

## 💰 Free Tier Option: Render.com (15 minutes)

**Why Render?**
- ✅ Completely free tier available
- ✅ Auto-deploy from GitHub
- ✅ Includes PostgreSQL + Redis
- ⚠️ Singapore region (higher latency ~80ms)

### Steps

1. **Push to GitHub**
```bash
cd /Users/murali/Desktop/raasta-all/raastaa-backend
git init
git add .
git commit -m "Initial commit"

# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/raastaa-backend.git
git push -u origin main
```

2. **Deploy on Render**
- Go to [render.com/dashboard](https://dashboard.render.com)
- Click **"New +"** → **"Blueprint"**
- Connect GitHub repo
- Select `raastaa-backend`
- Click **"Apply"**

3. **Enable PostGIS**
```bash
# Get database URL from Render dashboard
psql "YOUR_EXTERNAL_DATABASE_URL"

CREATE EXTENSION IF NOT EXISTS postgis;
\q
```

**Done!** Your API will be at: `https://raastaa-api.onrender.com`

---

## 📱 Update iOS App

Once deployed, update the production URL in [Backend.swift](../raastaa-app/raastaaPackage/Sources/raastaaFeature/Services/Backend.swift):

```swift
public static let baseURL: String = {
    #if DEBUG
    return "http://localhost:3000/api/v1"
    #else
    return "https://raastaa-backend.fly.dev/api/v1"  // ← Your URL here
    #endif
}()
```

---

## ✅ Test It

```bash
# Replace with your URL
API_URL="https://raastaa-backend.fly.dev"

# Health check
curl $API_URL/health

# Sign up test user
curl -X POST $API_URL/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@bangalore.com","password":"test123","name":"Bangalore User"}'

# Login
curl -X POST $API_URL/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@bangalore.com","password":"test123"}'
```

---

## 📊 Compare Options

| Platform | Region | Latency | Cost | Setup Time |
|----------|--------|---------|------|------------|
| **Fly.io** | Mumbai 🇮🇳 | 20-30ms | ~$5/mo | 10 min |
| **Render** | Singapore 🇸🇬 | 50-80ms | Free | 15 min |
| **Railway** | Singapore 🇸🇬 | 50-80ms | $5 credit | 10 min |

**Recommendation for Bangalore:** Use Fly.io Mumbai for best performance!

---

## 🎯 What Happens After Deploy?

1. **Your iOS app works everywhere** - Anyone with internet can use it
2. **Multiple users** - Not limited to localhost
3. **Persistent data** - User accounts, vendors, all saved in cloud
4. **Real geospatial queries** - PostGIS finds nearby places accurately

---

## 🆘 Need Help?

- **Full guide:** See `DEPLOYMENT.md` for detailed instructions
- **Checklist:** See `PRODUCTION_CHECKLIST.md` for launch prep
- **Troubleshooting:** Check logs with `fly logs` or on platform dashboard

---

**Ready to go live? Run `./deploy.sh` and choose your platform! 🚀**
