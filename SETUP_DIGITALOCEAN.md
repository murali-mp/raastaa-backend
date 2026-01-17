# 🚀 Raastaa Backend - Digital Ocean Production Setup

Complete guide to deploy Raastaa backend on Digital Ocean infrastructure.

---

## 📋 Table of Contents

1. [Overview & Costs](#1-overview--costs)
2. [Create Digital Ocean Account](#2-create-digital-ocean-account)
3. [Set Up Managed PostgreSQL](#3-set-up-managed-postgresql)
4. [Set Up Managed Redis](#4-set-up-managed-redis)
5. [Set Up Spaces (S3 Storage)](#5-set-up-spaces-s3-storage)
6. [Create Droplet (Server)](#6-create-droplet-server)
7. [Server Setup & Dependencies](#7-server-setup--dependencies)
8. [Deploy the Application](#8-deploy-the-application)
9. [Set Up Nginx & SSL](#9-set-up-nginx--ssl)
10. [Domain & DNS Setup](#10-domain--dns-setup)
11. [Monitoring & Maintenance](#11-monitoring--maintenance)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Overview & Costs

### Architecture

```
                    ┌─────────────────┐
                    │   Cloudflare    │
                    │   (DNS + CDN)   │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  DO Droplet     │
                    │  (Node.js API)  │
                    │  nginx + PM2    │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────▼───────┐   ┌───────▼───────┐   ┌───────▼───────┐
│ DO Managed    │   │ DO Managed    │   │ DO Spaces     │
│ PostgreSQL    │   │ Redis         │   │ (Images/CDN)  │
│ + PostGIS     │   │               │   │               │
└───────────────┘   └───────────────┘   └───────────────┘
```

### Monthly Cost Estimate (India - BLR1)

| Service | Spec | Cost/Month |
|---------|------|------------|
| Droplet | 2 vCPU, 4GB RAM | $24 (~₹2,000) |
| Managed PostgreSQL | 1GB RAM, 10GB disk | $15 (~₹1,250) |
| Managed Redis | 1GB RAM | $15 (~₹1,250) |
| Spaces | 250GB + CDN | $5 (~₹400) |
| **Total** | | **~$59/month (~₹4,900)** |

> 💡 **Tip**: Start with Basic Droplet ($12/mo) for MVP, scale up later.

---

## 2. Create Digital Ocean Account

### Step 2.1: Sign Up

1. Go to [digitalocean.com](https://www.digitalocean.com/)
2. Sign up with email or GitHub
3. Add payment method (credit card or PayPal)
4. Use referral code for **$200 free credits** (60 days): `https://m.do.co/c/your-referral`

### Step 2.2: Create a Project

1. Go to **Projects** → **New Project**
2. Name: `raastaa`
3. Description: `Raastaa Backend Infrastructure`
4. Environment: `Production`
5. Click **Create Project**

---

## 3. Set Up Managed PostgreSQL

### Step 3.1: Create Database Cluster

1. Go to **Databases** → **Create Database Cluster**
2. Choose **PostgreSQL** (version 15)
3. Configuration:
   - **Datacenter**: Bangalore (BLR1)
   - **Plan**: Basic → $15/mo (1 GB RAM, 1 vCPU, 10 GB Disk)
   - **Cluster name**: `raastaa-db`
4. Click **Create Database Cluster**
5. Wait 5-10 minutes for provisioning

### Step 3.2: Enable PostGIS Extension

1. Once cluster is ready, go to **Settings** → **Trusted Sources**
2. Add your Droplet IP (or allow all for now)
3. Connect using the provided credentials:

```bash
# Install psql on your local machine first
# Connection string is in the dashboard

psql "postgresql://doadmin:PASSWORD@raastaa-db-do-user-XXXXX-0.db.ondigitalocean.com:25060/defaultdb?sslmode=require"
```

4. Enable PostGIS:

```sql
-- Create a new database for Raastaa
CREATE DATABASE raastaa;

-- Connect to the new database
\c raastaa

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Verify PostGIS
SELECT PostGIS_Version();

-- Exit
\q
```

### Step 3.3: Get Connection String

From the dashboard, copy the connection string. It looks like:

```
postgresql://doadmin:AVNS_xxxxx@raastaa-db-do-user-xxxxx-0.b.db.ondigitalocean.com:25060/raastaa?sslmode=require
```

Save this for your `.env` file.

---

## 4. Set Up Managed Redis

### Step 4.1: Create Redis Cluster

1. Go to **Databases** → **Create Database Cluster**
2. Choose **Redis** (version 7)
3. Configuration:
   - **Datacenter**: Bangalore (BLR1) - same as PostgreSQL
   - **Plan**: Basic → $15/mo (1 GB RAM)
   - **Cluster name**: `raastaa-redis`
4. Click **Create Database Cluster**
5. Wait 3-5 minutes for provisioning

### Step 4.2: Get Connection String

From the dashboard, copy the connection details:

```
rediss://default:AVNS_xxxxx@raastaa-redis-do-user-xxxxx-0.b.db.ondigitalocean.com:25061
```

> ⚠️ Note: It's `rediss://` (with double s) for TLS connection

---

## 5. Set Up Spaces (S3 Storage)

### Step 5.1: Create a Space

1. Go to **Spaces Object Storage** → **Create a Space**
2. Configuration:
   - **Datacenter**: Bangalore (BLR1)
   - **CDN**: ✅ Enable (for faster image loading)
   - **Name**: `raastaa` (globally unique)
   - **File Listing**: Restrict
3. Click **Create a Space**

### Step 5.2: Generate API Keys

1. Go to **API** (left sidebar) → **Spaces Keys**
2. Click **Generate New Key**
3. Name: `raastaa-backend`
4. **IMPORTANT**: Copy both Key and Secret immediately!

```
Key: DO00XXXXXXXXXXXXXXXXXX
Secret: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Step 5.3: Configure CORS

1. Go to your Space → **Settings** → **CORS Configurations**
2. Click **Add**:
   - **Origin**: `https://raastaa.app` (your domain)
   - **Allowed Methods**: GET, PUT, POST, DELETE, HEAD
   - **Allowed Headers**: `*`
   - **Access Control Max Age**: `3600`
3. Click **Save**

### Step 5.4: Your Space URLs

```
Bucket: raastaa
Endpoint: blr1.digitaloceanspaces.com
CDN Endpoint: raastaa.blr1.cdn.digitaloceanspaces.com
```

---

## 6. Create Droplet (Server)

### Step 6.1: Create Droplet

1. Go to **Droplets** → **Create Droplet**
2. Configuration:
   - **Region**: Bangalore (BLR1)
   - **Image**: Ubuntu 22.04 (LTS) x64
   - **Size**: Basic → Regular → $24/mo (2 vCPU, 4 GB RAM, 80 GB SSD)
   - **Authentication**: SSH Key (recommended) or Password
   - **Hostname**: `raastaa-api`
3. Click **Create Droplet**

### Step 6.2: Add SSH Key (if not already)

On your local machine:

```bash
# Generate SSH key if you don't have one
ssh-keygen -t ed25519 -C "your_email@example.com"

# Copy your public key
cat ~/.ssh/id_ed25519.pub

# Add this key in DO dashboard under Settings → Security → SSH Keys
```

### Step 6.3: Connect to Droplet

```bash
# Get the IP from the dashboard
ssh root@YOUR_DROPLET_IP

# Example:
ssh root@143.198.XXX.XXX
```

---

## 7. Server Setup & Dependencies

### Step 7.1: Update System

```bash
# Update packages
apt update && apt upgrade -y

# Install essential tools
apt install -y curl wget git build-essential
```

### Step 7.2: Create Deploy User

```bash
# Create a non-root user
adduser raastaa

# Add to sudo group
usermod -aG sudo raastaa

# Switch to new user
su - raastaa
```

### Step 7.3: Install Node.js 20

```bash
# Install Node.js via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node --version  # Should be v20.x
npm --version   # Should be v10.x
```

### Step 7.4: Install PM2 (Process Manager)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Set PM2 to start on boot
pm2 startup systemd -u raastaa --hp /home/raastaa
```

### Step 7.5: Install Nginx

```bash
sudo apt install -y nginx

# Start and enable
sudo systemctl start nginx
sudo systemctl enable nginx
```

### Step 7.6: Configure Firewall

```bash
# Allow SSH, HTTP, HTTPS
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable

# Check status
sudo ufw status
```

---

## 8. Deploy the Application

### Step 8.1: Clone Repository

```bash
# As raastaa user
cd /home/raastaa

# Clone your repo (replace with your actual repo)
git clone https://github.com/yourusername/raastaa-backend.git
cd raastaa-backend
```

### Step 8.2: Install Dependencies

```bash
npm install
```

### Step 8.3: Create Environment File

```bash
nano .env
```

Paste your production config:

```env
# ============================================
# SERVER
# ============================================
PORT=3000
NODE_ENV=production

# ============================================
# DATABASE (Digital Ocean Managed PostgreSQL)
# ============================================
DATABASE_URL="postgresql://doadmin:YOUR_PASSWORD@raastaa-db-do-user-XXXXX-0.b.db.ondigitalocean.com:25060/raastaa?sslmode=require"
DIRECT_URL="postgresql://doadmin:YOUR_PASSWORD@raastaa-db-do-user-XXXXX-0.b.db.ondigitalocean.com:25060/raastaa?sslmode=require"

# ============================================
# REDIS (Digital Ocean Managed Redis)
# ============================================
REDIS_URL="rediss://default:YOUR_PASSWORD@raastaa-redis-do-user-XXXXX-0.b.db.ondigitalocean.com:25061"

# ============================================
# JWT (Generate secure secrets!)
# ============================================
JWT_SECRET=RUN_openssl_rand_-base64_32_AND_PASTE_HERE
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# ============================================
# DIGITAL OCEAN SPACES
# ============================================
DO_SPACES_KEY=DO00XXXXXXXXXXXXXXXXXX
DO_SPACES_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
DO_SPACES_BUCKET=raastaa
DO_SPACES_ENDPOINT=blr1.digitaloceanspaces.com
DO_SPACES_CDN_ENDPOINT=raastaa.blr1.cdn.digitaloceanspaces.com

# ============================================
# RATE LIMITING
# ============================================
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_MAX_AUTH_REQUESTS=10

# ============================================
# APP
# ============================================
APP_NAME=Raastaa
APP_URL=https://api.raastaa.app
CORS_ORIGINS=https://raastaa.app,https://www.raastaa.app

# ============================================
# SMS OTP (MSG91)
# ============================================
MSG91_AUTH_KEY=your_msg91_auth_key
MSG91_TEMPLATE_ID=your_template_id
MSG91_SENDER_ID=RAASTA

# ============================================
# DISCORD WEBHOOKS (Optional)
# ============================================
DISCORD_ADMIN_WEBHOOK=https://discord.com/api/webhooks/xxx/xxx
```

Save with `Ctrl+X`, then `Y`, then `Enter`.

### Step 8.4: Generate Prisma Client & Migrate

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy
```

### Step 8.5: Build Application

```bash
npm run build
```

### Step 8.6: Start with PM2

```bash
# Start the application
pm2 start dist/server.js --name raastaa-api

# Save PM2 process list
pm2 save

# Check status
pm2 status
pm2 logs raastaa-api
```

---

## 9. Set Up Nginx & SSL

### Step 9.1: Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/raastaa
```

Paste:

```nginx
server {
    listen 80;
    server_name api.raastaa.app;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket support
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Step 9.2: Enable Site

```bash
# Create symlink
sudo ln -s /etc/nginx/sites-available/raastaa /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test config
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

### Step 9.3: Install SSL with Certbot

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d api.raastaa.app

# Follow prompts:
# - Enter email
# - Agree to terms
# - Choose to redirect HTTP to HTTPS (recommended)
```

### Step 9.4: Auto-Renewal

```bash
# Test auto-renewal
sudo certbot renew --dry-run

# Certbot automatically adds a cron job for renewal
```

---

## 10. Domain & DNS Setup

### Step 10.1: Add Domain to Digital Ocean

1. Go to **Networking** → **Domains**
2. Add your domain: `raastaa.app`
3. Create A record:
   - **Hostname**: `api`
   - **Will Direct To**: Your Droplet
   - **TTL**: 3600

### Step 10.2: Update Nameservers (at your registrar)

Point your domain to DO nameservers:
```
ns1.digitalocean.com
ns2.digitalocean.com
ns3.digitalocean.com
```

### Step 10.3: Recommended DNS Records

| Type | Hostname | Value | TTL |
|------|----------|-------|-----|
| A | @ | YOUR_DROPLET_IP | 3600 |
| A | api | YOUR_DROPLET_IP | 3600 |
| A | www | YOUR_DROPLET_IP | 3600 |
| CNAME | cdn | raastaa.blr1.cdn.digitaloceanspaces.com | 3600 |

---

## 11. Monitoring & Maintenance

### Step 11.1: Digital Ocean Monitoring

1. Go to your Droplet → **Graphs**
2. Enable **Monitoring** (free)
3. Set up **Alerts**:
   - CPU > 80% for 5 min
   - Memory > 80% for 5 min
   - Disk > 90%

### Step 11.2: PM2 Monitoring

```bash
# Real-time monitoring
pm2 monit

# View logs
pm2 logs raastaa-api --lines 100

# Check status
pm2 status
```

### Step 11.3: Useful Commands

```bash
# Restart app
pm2 restart raastaa-api

# Reload with zero downtime
pm2 reload raastaa-api

# Stop app
pm2 stop raastaa-api

# View all processes
pm2 list

# Check nginx status
sudo systemctl status nginx

# View nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### Step 11.4: Update Deployment

```bash
# SSH into server
ssh raastaa@YOUR_DROPLET_IP

# Go to project
cd /home/raastaa/raastaa-backend

# Pull latest code
git pull origin main

# Install new dependencies
npm install

# Run migrations
npx prisma migrate deploy

# Rebuild
npm run build

# Restart with zero downtime
pm2 reload raastaa-api
```

### Step 11.5: Automated Backups

Digital Ocean provides:
- **Database Backups**: Enabled by default on Managed Databases
- **Droplet Backups**: Enable for $4.80/mo (20% of Droplet cost)
- **Snapshots**: Manual snapshots anytime

---

## 12. Troubleshooting

### Issue: "Connection refused" to database

```bash
# Check if your Droplet IP is in trusted sources
# Go to DO Dashboard → Databases → raastaa-db → Settings → Trusted Sources
# Add your Droplet's IP

# Test connection from Droplet
psql "YOUR_DATABASE_URL"
```

### Issue: "SSL routines" Redis error

```bash
# Make sure you're using rediss:// (with double s) for TLS
# Check your REDIS_URL in .env
```

### Issue: PM2 app keeps crashing

```bash
# Check logs
pm2 logs raastaa-api --err --lines 50

# Check if port is in use
sudo lsof -i :3000

# Check memory
free -m

# Restart PM2
pm2 kill
pm2 start dist/server.js --name raastaa-api
```

### Issue: 502 Bad Gateway

```bash
# Check if Node app is running
pm2 status

# Check nginx config
sudo nginx -t

# Check nginx logs
sudo tail -f /var/log/nginx/error.log

# Restart everything
pm2 restart raastaa-api
sudo systemctl restart nginx
```

### Issue: SSL Certificate not working

```bash
# Renew certificate
sudo certbot renew

# Check certificate status
sudo certbot certificates

# Re-run certbot
sudo certbot --nginx -d api.raastaa.app
```

---

## 📋 Quick Reference

### SSH Access

```bash
ssh raastaa@YOUR_DROPLET_IP
```

### Service Management

```bash
# Application
pm2 status
pm2 restart raastaa-api
pm2 logs raastaa-api

# Web Server
sudo systemctl status nginx
sudo systemctl restart nginx

# SSL
sudo certbot renew
```

### Deploy New Version

```bash
cd /home/raastaa/raastaa-backend
git pull origin main
npm install
npx prisma migrate deploy
npm run build
pm2 reload raastaa-api
```

### Useful URLs

| Service | URL |
|---------|-----|
| API | https://api.raastaa.app |
| Health Check | https://api.raastaa.app/health |
| DO Dashboard | https://cloud.digitalocean.com |
| Spaces CDN | https://raastaa.blr1.cdn.digitaloceanspaces.com |

---

## ✅ Production Checklist

- [ ] Digital Ocean account created
- [ ] Managed PostgreSQL cluster running
- [ ] PostGIS extension enabled
- [ ] Managed Redis cluster running
- [ ] Spaces bucket created with CDN
- [ ] Spaces API keys generated
- [ ] Droplet created and accessible via SSH
- [ ] Node.js 20 installed on Droplet
- [ ] PM2 installed and configured
- [ ] Application deployed and running
- [ ] Nginx configured as reverse proxy
- [ ] SSL certificate installed
- [ ] Domain DNS configured
- [ ] Monitoring alerts set up
- [ ] Backups enabled

---

## 💰 Cost Optimization Tips

1. **Start Small**: Use Basic $12/mo Droplet, upgrade later
2. **Reserved Pricing**: Commit for 1 year = 20% savings
3. **Turn Off Dev Resources**: Delete unused Droplets
4. **Use Spaces CDN**: Reduces Droplet bandwidth costs
5. **Monitor Usage**: Set billing alerts

---

## 🆘 Support

- **Digital Ocean Support**: support.digitalocean.com
- **Community**: digitalocean.com/community
- **Status Page**: status.digitalocean.com

Happy deploying! 🚀🍜
