# 🚨 Fix: Tables Don't Exist

The error means the database migrations haven't run yet. Here's how to fix it:

## Quick Fix Steps

### 1. Check DigitalOcean App Logs

1. Go to https://cloud.digitalocean.com/apps
2. Click on your **raastaa-backend** app
3. Click **"Runtime Logs"** tab
4. Look for errors about migrations or Prisma

**Common issue:** The app's startup command should run migrations, but it might have failed.

### 2. Run Migrations Manually

#### Option A: Using DigitalOcean Console (Easiest)

1. Go to your app in DigitalOcean
2. Click **"Console"** tab
3. Run these commands:

```bash
npx prisma migrate deploy
```

This will create all the tables.

#### Option B: From Your Local Machine

```bash
# Set the DATABASE_URL (get from DigitalOcean database connection details)
DATABASE_URL="postgresql://doadmin:PASSWORD@HOST:25060/raastaa?sslmode=require"

# Run migrations
DATABASE_URL="$DATABASE_URL" npx prisma migrate deploy
```

### 3. Verify Tables Were Created

Back in the PostgreSQL console (psql):

```sql
-- List all tables
\dt

-- You should see:
-- locations
-- vendors
-- users
-- auth_identities
-- wallets
-- etc.
```

### 4. Then Run the Seed Script

Once tables exist, copy and paste the seed script again:

```sql
INSERT INTO locations (id, latitude, longitude, city, area, full_address)
VALUES
  ('550e8400-e29b-41d4-a716-446655440001'::uuid, 12.9425, 77.5748, 'Bangalore', 'VV Puram', 'VV Puram Food Street...
  -- rest of the script
```

## What Went Wrong?

The Docker container's CMD in `Dockerfile` should run:
```dockerfile
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
```

If migrations failed, check:
1. **DATABASE_URL** is set correctly in DigitalOcean environment variables
2. **PRISMA_CLI_BINARY_TARGETS** is set to `debian-openssl-3.0.x`
3. App has network access to the database

## Need More Help?

**Check if migrations exist:**
```bash
cd /Users/murali/Desktop/raasta-all/raastaa-backend
ls -la prisma/migrations/
```

**Check Dockerfile:**
```bash
grep CMD Dockerfile
# Should show: npx prisma migrate deploy && npm start
```

Let me know what you see in the DigitalOcean runtime logs!
