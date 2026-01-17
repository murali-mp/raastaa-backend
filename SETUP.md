# 🚀 Raastaa Backend - Complete Setup Guide

This guide will walk you through setting up the Raastaa backend from scratch on macOS/Linux.

---

## 📋 Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Install Dependencies](#2-install-dependencies)
3. [Database Setup (PostgreSQL + PostGIS)](#3-database-setup-postgresql--postgis)
4. [Redis Setup](#4-redis-setup)
5. [Digital Ocean Spaces Setup](#5-digital-ocean-spaces-setup)
6. [Environment Configuration](#6-environment-configuration)
7. [Initialize the Project](#7-initialize-the-project)
8. [Run Database Migrations](#8-run-database-migrations)
9. [Start the Server](#9-start-the-server)
10. [Testing the API](#10-testing-the-api)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | 20+ | JavaScript runtime |
| npm | 10+ | Package manager |
| PostgreSQL | 15+ | Primary database |
| PostGIS | 3.3+ | Geospatial extension |
| Redis | 7+ | Caching & geo queries |

### Check Your Versions

```bash
node --version    # Should be v20.x or higher
npm --version     # Should be v10.x or higher
psql --version    # Should be 15.x or higher
redis-server --version  # Should be 7.x or higher
```

---

## 2. Install Dependencies

### macOS (using Homebrew)

```bash
# Install Homebrew if not installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js 20
brew install node@20
echo 'export PATH="/opt/homebrew/opt/node@20/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# Install PostgreSQL with PostGIS
brew install postgresql@15 postgis

    # Start PostgreSQL
    brew services start postgresql@15

# Install Redis
brew install redis

# Start Redis
brew services start redis
```

### Ubuntu/Debian

```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL 15
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt update
sudo apt install -y postgresql-15 postgresql-15-postgis-3

# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Install Redis
sudo apt install -y redis-server

# Start Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

---

## 3. Database Setup (PostgreSQL + PostGIS)

### Step 3.1: Create Database User

```bash
# Connect to PostgreSQL as superuser
sudo -u postgres psql

# In the PostgreSQL shell:
CREATE USER raastaa WITH PASSWORD 'your_secure_password_here';
ALTER USER raastaa CREATEDB;
\q
```

### Step 3.2: Create Database with PostGIS

```bash
# Connect as postgres user
sudo -u postgres psql

# Create the database
CREATE DATABASE raastaa OWNER raastaa;

# Connect to the new database
\c raastaa

# Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

# Verify PostGIS is installed
SELECT PostGIS_Version();

# Exit
\q
```

### Step 3.3: Test Connection

```bash
# Test the connection
psql -h localhost -U raastaa -d raastaa

# If successful, you should see:
# raastaa=>

# Type \q to exit
```

### Step 3.4: Get Your Connection String

Your `DATABASE_URL` will be:
```
postgresql://raastaa:your_secure_password_here@localhost:5432/raastaa?schema=public
```

---

## 4. Redis Setup

### Verify Redis is Running

```bash
# Check Redis status
redis-cli ping
# Should return: PONG

# Check Redis version
redis-cli INFO server | grep redis_version
```

### Configure Redis (Optional)

```bash
# Edit Redis config (macOS)
nano /opt/homebrew/etc/redis.conf

# Edit Redis config (Linux)
sudo nano /etc/redis/redis.conf

# Recommended settings for development:
# maxmemory 256mb
# maxmemory-policy allkeys-lru
```

### Redis Connection String

Your `REDIS_URL` will be:
```
redis://localhost:6379
```

If you set a password:
```
redis://:your_redis_password@localhost:6379
```

---

## 5. Digital Ocean Spaces Setup

Digital Ocean Spaces is used for storing images and media files.

### Step 5.1: Create a Space

1. Go to [Digital Ocean Control Panel](https://cloud.digitalocean.com/)
2. Click **Spaces Object Storage** → **Create a Space**
3. Choose a datacenter region (e.g., `blr1` for Bangalore)
4. Name your space: `raastaa` (or your preferred name)
5. Choose **Restrict File Listing** for security
6. Click **Create a Space**

### Step 5.2: Generate API Keys

1. Go to **API** → **Spaces Keys**
2. Click **Generate New Key**
3. Name it: `raastaa-backend`
4. Copy both the **Key** and **Secret** (you won't see the secret again!)

### Step 5.3: Configure CORS (for web uploads)

1. Go to your Space → **Settings** → **CORS Configurations**
2. Add a new rule:
   - **Origin**: `*` (or your specific domains)
   - **Allowed Methods**: `GET`, `PUT`, `POST`, `DELETE`
   - **Allowed Headers**: `*`
   - **Max Age**: `3600`

### Step 5.4: Your Space Credentials

```env
DO_SPACES_KEY=your_spaces_access_key
DO_SPACES_SECRET=your_spaces_secret_key
DO_SPACES_BUCKET=raastaa
DO_SPACES_ENDPOINT=blr1.digitaloceanspaces.com
DO_SPACES_CDN_ENDPOINT=raastaa.blr1.cdn.digitaloceanspaces.com
```

---

## 6. Environment Configuration

### Step 6.1: Create .env File

```bash
cd /Users/murali/Desktop/raastaa-backend
cp .env.example .env
```

### Step 6.2: Edit .env File

Open `.env` in your editor and fill in all values:

```env
# ============================================
# SERVER CONFIGURATION
# ============================================
PORT=3000
NODE_ENV=development

# ============================================
# DATABASE (PostgreSQL with PostGIS)
# ============================================
DATABASE_URL=postgresql://raastaa:your_password@localhost:5432/raastaa?schema=public
DIRECT_URL=postgresql://raastaa:your_password@localhost:5432/raastaa?schema=public

# ============================================
# REDIS
# ============================================
REDIS_URL=redis://localhost:6379

# ============================================
# JWT SECRETS (IMPORTANT: Change these!)
# Generate with: openssl rand -base64 32
# ============================================
JWT_SECRET=CHANGE_THIS_TO_A_RANDOM_STRING_AT_LEAST_32_CHARACTERS
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# ============================================
# DIGITAL OCEAN SPACES
# ============================================
DO_SPACES_KEY=your_spaces_access_key
DO_SPACES_SECRET=your_spaces_secret_key
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
# APP CONFIG
# ============================================
APP_NAME=Raastaa
APP_URL=http://localhost:3000
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# ============================================
# DISCORD WEBHOOKS (Optional - for alerts)
# ============================================
DISCORD_ADMIN_WEBHOOK=

# ============================================
# SMS OTP (MSG91 - Optional for dev)
# ============================================
MSG91_AUTH_KEY=
MSG91_TEMPLATE_ID=
MSG91_SENDER_ID=RAASTA
```

### Step 6.3: Generate Secure JWT Secrets

```bash
# Generate a secure random string for JWT_SECRET
openssl rand -base64 32

# Example output: K7x9mR2pQ5nL8vW1hY4jT6fA3dS0gU+bE=
# Use this as your JWT_SECRET
```

---

## 7. Initialize the Project

### Step 7.1: Install Node Dependencies

```bash
cd /Users/murali/Desktop/raastaa-backend

# Install all packages
npm install
```

### Step 7.2: Generate Prisma Client

```bash
# Generate the Prisma client based on your schema
npx prisma generate
```

This creates the TypeScript types for your database models.

---

## 8. Run Database Migrations

### Step 8.1: Run Migrations

```bash
# Apply all migrations to your database
npx prisma migrate dev --name init
```

This will:
- Create all tables in your database
- Set up indexes and constraints
- Enable PostGIS for geo queries

### Step 8.2: Verify Database

```bash
# Open Prisma Studio to view your database
npx prisma studio
```

This opens a web UI at `http://localhost:5555` where you can browse your database.

### Step 8.3: (Optional) Seed Data

If you want sample data:

```bash
# Create a seed file first if it doesn't exist
npm run db:seed
```

---

## 9. Start the Server

### Development Mode (with hot reload)

```bash
npm run dev
```

You should see:
```
🚀 Server running on port 3000
📊 Environment: development
🔗 API URL: http://localhost:3000
✅ Database connected
✅ Redis connected
```

### Production Mode

```bash
# Build TypeScript
npm run build

# Start production server
npm start
```

### Verify Server is Running

```bash
# Health check
curl http://localhost:3000/health

# Should return:
# {"status":"ok","timestamp":"2026-01-17T..."}
```

---

## 10. Testing the API

### Option 1: Use the TUI (Recommended)

```bash
npm run tui
```

This opens an interactive terminal app where you can:
- Request OTP and login
- Test all API endpoints
- View responses in formatted JSON

### Option 2: Use curl

```bash
# Request OTP
curl -X POST http://localhost:3000/api/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210"}'

# Verify OTP (in dev mode, check console for OTP)
curl -X POST http://localhost:3000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210", "otp": "123456"}'
```

### Option 3: Use Postman/Insomnia

Import the API collection or manually test:

**Base URL**: `http://localhost:3000/api`

**Headers**:
```
Content-Type: application/json
Authorization: Bearer <your_jwt_token>
```

---

## 11. Troubleshooting

### Issue: "Cannot connect to database"

```bash
# Check PostgreSQL is running
brew services list | grep postgresql  # macOS
sudo systemctl status postgresql      # Linux

# Restart PostgreSQL
brew services restart postgresql@15   # macOS
sudo systemctl restart postgresql     # Linux

# Test connection manually
psql -h localhost -U raastaa -d raastaa
```

### Issue: "Redis connection refused"

```bash
# Check Redis is running
redis-cli ping

# Start Redis
brew services start redis    # macOS
sudo systemctl start redis   # Linux

# Check Redis logs
tail -f /var/log/redis/redis-server.log  # Linux
```

### Issue: "PostGIS extension not found"

```bash
# Connect to your database
psql -h localhost -U raastaa -d raastaa

# Install PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

# Verify
SELECT PostGIS_Version();
```

### Issue: "Prisma migration failed"

```bash
# Reset the database (WARNING: deletes all data)
npx prisma migrate reset

# Re-run migrations
npx prisma migrate dev
```

### Issue: "Module not found" errors

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Regenerate Prisma
npx prisma generate
```

### Issue: "Port 3000 already in use"

```bash
# Find what's using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use a different port
PORT=3001 npm run dev
```

### View Server Logs

```bash
# Development logs are printed to console
npm run dev

# For production, consider using PM2
npm install -g pm2
pm2 start dist/server.js --name raastaa
pm2 logs raastaa
```

---

## 📚 Quick Reference

### NPM Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Build TypeScript to JavaScript |
| `npm start` | Start production server |
| `npm run tui` | Interactive API testing tool |
| `npm run typecheck` | Check TypeScript types |
| `npm run db:migrate` | Run database migrations |
| `npm run db:studio` | Open Prisma Studio GUI |
| `npm run db:generate` | Regenerate Prisma client |

### Project Structure

```
raastaa-backend/
├── prisma/schema.prisma    # Database schema
├── src/
│   ├── config/             # Configuration
│   ├── middleware/         # Express middleware
│   ├── modules/            # API modules
│   ├── utils/              # Utilities
│   ├── app.ts              # Express app
│   └── server.ts           # Entry point
├── scripts/tui.ts          # Testing TUI
├── .env                    # Environment variables
└── package.json            # Dependencies
```

### API Base URLs

- **Local Development**: `http://localhost:3000/api`
- **Health Check**: `http://localhost:3000/health`
- **Prisma Studio**: `http://localhost:5555`

---

## ✅ Setup Checklist

- [ ] Node.js 20+ installed
- [ ] PostgreSQL 15+ installed and running
- [ ] PostGIS extension enabled
- [ ] Redis 7+ installed and running
- [ ] Digital Ocean Spaces configured
- [ ] `.env` file created with all values
- [ ] `npm install` completed
- [ ] `npx prisma generate` completed
- [ ] `npx prisma migrate dev` completed
- [ ] Server starts without errors
- [ ] Health check returns OK

---

## 🆘 Need Help?

1. Check the [Troubleshooting](#11-troubleshooting) section
2. Review server logs: `npm run dev`
3. Check database: `npx prisma studio`
4. Verify environment: `cat .env`

Happy coding! 🍜
