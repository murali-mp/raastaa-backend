# 🍽️ Adding Bangalore Vendors to Your Database

I've created **15 real Bangalore vendors** ready to seed into your database!

## Quick Steps

### 1. Open DigitalOcean Database Console

1. Go to https://cloud.digitalocean.com/databases
2. Click on **raastaa-db** database
3. Click **"Console"** tab (or "Open Console" button)
4. You'll see a SQL terminal

### 2. Run the Seed Script

Copy and paste the entire contents of [`seed-database.sql`](./seed-database.sql) into the console and press Enter.

**That's it!** The script will add:
- 15 locations across Bangalore
- 15 vendors (real places!)
- All with proper coordinates

## The Vendors (All Real Places!)

| Name | Area | Famous For | Price |
|------|------|------------|-------|
| **Brahmin's Coffee Bar** | Basavanagudi | Idli, vada since 1965 | ₹ |
| **Vidyarthi Bhavan** | Basavanagudi | Crispy masala dosa | ₹ |
| **Veena Stores** | Koramangala | Masala dosa since 1948 | ₹ |
| **CTR** | Malleshwaram | Benne masala dosa | ₹ |
| **Koshy's** | Church Street | Continental since 1940 | ₹₹ |
| **Empire Restaurant** | Brigade Road | Mughlai biryani | ₹₹ |
| **Shivaji Military Hotel** | Residency Road | Mutton curry | ₹ |
| **Siddappa Donne Biryani** | VV Puram | Biryani in donne | ₹ |
| **Sri Raghavendra** | VV Puram | Jalebis, vadas | ₹ |
| **Truffles** | Koramangala | Burgers, shakes | ₹₹ |
| **Hole in the Wall** | Indiranagar | Pancakes, coffee | ₹₹ |
| **Meghana Foods** | HSR Layout | Andhra biryani | ₹₹ |
| **Nagarjuna** | Whitefield | Andhra cuisine | ₹₹ |
| **Punjabi Dhaba** | Banashankari | North Indian | ₹ |
| **A2B** | Electronic City | South Indian veg | ₹ |

## Test It Works

After running the SQL script, test the API:

```bash
# Get vendors near Indiranagar (12.9716, 77.6412)
curl "https://raastaa-app-duuy3.ondigitalocean.app/api/v1/vendors/nearby?latitude=12.9716&longitude=77.5946&radiusKm=10" | jq '.data.vendors | length'

# Should return 15 (all vendors within 10km)

# Search for dosa places
curl "https://raastaa-app-duuy3.ondigitalocean.app/api/v1/vendors/search?q=dosa" | jq '.data.vendors[].name'

# Should return: Veena Stores, Vidyarthi Bhavan, CTR, etc.
```

## Coverage Map

The vendors cover all major areas:
- **Central Bangalore**: MG Road, Church Street, Residency Road
- **South**: VV Puram, Jayanagar, Basavanagudi, Banashankari
- **East**: Indiranagar, Koramangala, HSR Layout, Whitefield
- **North**: Malleshwaram
- **Far South**: Electronic City

Distance from city center (Vidhana Soudha ~12.9796, 77.5913):
- Closest: Koshy's (~0.8km)
- Farthest: Whitefield (~19km), Electronic City (~20km)

## What's Next?

After seeding:
1. ✅ Backend has real data
2. ✅ API returns actual vendors
3. 🎯 Build iOS app in Release mode
4. 🎯 Test on device with real location
5. 🎯 See nearby vendors on map!

## Troubleshooting

**Problem:** SQL script fails
- **Solution:** Make sure migrations ran. Check tables exist: `\dt` in console

**Problem:** No vendors returned from API
- **Solution:** Increase radius: `radiusKm=20` or check your coordinates are in Bangalore

**Problem:** Can't access console
- **Solution:** Use psql: `psql "YOUR_DATABASE_URL" < seed-database.sql`

---

**Ready?** Open the DigitalOcean console and paste the SQL! 🚀
