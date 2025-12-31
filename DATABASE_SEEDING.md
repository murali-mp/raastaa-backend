# Seeding Production Database

## Option 1: DigitalOcean Database Console (Recommended)

1. Go to https://cloud.digitalocean.com/databases
2. Click on **raastaa-db**
3. Go to **"Users & Databases"** tab
4. Click **"Open Console"** button
5. Copy and paste the contents of `seed-database.sql`
6. Press Enter to execute

## Option 2: psql Command Line

If you have psql installed:

```bash
# Get connection string from DigitalOcean dashboard
psql "postgresql://doadmin:PASSWORD@HOST:25060/raastaa?sslmode=require" < seed-database.sql
```

## What Gets Seeded

### 15 Real Bangalore Vendors:

**VV Puram Food Street (Thindi Beedi):**
- Sri Raghavendra Sweets & Snacks - Jalebis, vadas
- Siddappa Donne Biryani - Traditional biryani

**Koramangala:**
- Veena Stores - Legendary masala dosa (since 1948)
- Truffles - Burgers and American food

**Indiranagar:**
- Hole in the Wall Cafe - Pancakes and coffee

**Church Street/MG Road:**
- Koshy's - Historic Continental & Indian (since 1940)
- Shivaji Military Hotel - Karnataka non-veg meals
- Empire Restaurant - Mughlai biryanis

**Basavanagudi/Jayanagar:**
- Vidyarthi Bhavan - Crispy masala dosa
- Brahmin's Coffee Bar - Legendary idli/vada (since 1965)

**Malleshwaram:**
- CTR - Famous benne masala dosa

**HSR Layout:**
- Meghana Foods - Andhra biryani

**Whitefield:**
- Nagarjuna - Andhra cuisine

**Banashankari:**
- Punjabi Dhaba - North Indian street food

**Electronic City:**
- A2B - South Indian vegetarian

## Test After Seeding

```bash
# Get vendors near Indiranagar
curl "https://raastaa-app-duuy3.ondigitalocean.app/api/v1/vendors/nearby?latitude=12.9716&longitude=77.5946&radiusKm=5" | jq '.'

# Search for vendors
curl "https://raastaa-app-duuy3.ondigitalocean.app/api/v1/vendors/search?q=dosa" | jq '.'
```

## Database Access

If you need direct database access:

**Host:** `db-postgresql-blr1-89153-do-user-18676068-0.l.db.ondigitalocean.com`
**Port:** `25060`
**User:** `doadmin`
**Password:** Get from DigitalOcean dashboard
**Database:** `raastaa`
**SSL:** Required

## Troubleshooting

If the SQL script fails:
1. Check that migrations have run (`vendors` and `locations` tables exist)
2. Verify UUID extension is enabled: `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`
3. Check for duplicate entries if running multiple times (script uses `ON CONFLICT DO NOTHING`)

## Next Steps

After seeding:
1. Test the nearby vendors API
2. Test vendor search
3. Update your iOS app to fetch real data
4. Build in Release mode and test on device
