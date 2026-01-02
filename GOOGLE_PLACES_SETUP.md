# Google Places API Setup Guide

## 🎯 Overview

This guide shows you how to set up the Google Places API to scrape **REAL restaurant data** from Google Maps for your Raastaa app.

---

## 📋 Prerequisites

- Google Cloud account (free tier available)
- Credit card for Google Cloud (won't be charged on free tier)
- ~30 minutes for setup

---

## 🚀 Step-by-Step Setup

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"Select a project"** → **"New Project"**
3. Enter project name: `raastaa-places-api`
4. Click **"Create"**

### Step 2: Enable Places API (New)

1. In the Google Cloud Console, go to **"APIs & Services"** → **"Library"**
2. Search for: **"Places API (New)"**
3. Click on it and click **"Enable"**

**Important**: Make sure you enable the **NEW** Places API, not the old one!

### Step 3: Create API Key

1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"Create Credentials"** → **"API Key"**
3. Copy the API key that appears
4. Click **"Restrict Key"** (recommended for security)

### Step 4: Restrict API Key (Recommended)

1. Under **"API restrictions"**, select **"Restrict key"**
2. Check **"Places API (New)"**
3. Click **"Save"**

### Step 5: Set Up Billing (Required)

Google Places API requires billing to be enabled, but offers a **$200/month free credit**.

1. Go to **"Billing"** in Google Cloud Console
2. Click **"Link a billing account"** or **"Create billing account"**
3. Enter your credit card details
4. You won't be charged unless you exceed the free tier

**Free Tier Limits**:
- $200 free credit per month
- Text Search: $32 per 1,000 requests
- ~6,250 free requests per month
- Our script will make ~400 requests (well within free tier!)

### Step 6: Add API Key to .env

1. Open your `.env` file in the `raastaa-backend` directory
2. Add this line:

```bash
GOOGLE_PLACES_API_KEY=your_api_key_here
```

Replace `your_api_key_here` with the API key you copied in Step 3.

**Example**:
```bash
# .env file
DATABASE_URL=postgresql://...
JWT_SECRET=...
GOOGLE_PLACES_API_KEY=AIzaSyABCDEF123456789_example_key_here
```

### Step 7: Install Dependencies

Run this command to install axios (needed for API calls):

```bash
npm install
```

---

## 🏃‍♂️ Running the Scraper

### Option 1: Clear Database + Scrape Fresh Data

This will **DELETE ALL** existing restaurants and add real Google Maps data:

```bash
npm run scrape-places
```

**What it does**:
1. ✅ Deletes all existing vendors, locations, and tags
2. ✅ Searches 20 areas in Bangalore
3. ✅ Fetches ~20 restaurants per area (400+ total)
4. ✅ Gets REAL data from Google Maps:
   - Name, address, exact location
   - Rating and review count
   - Price level
   - Phone number, website
   - Opening hours
   - Cuisine types
   - Features (takeaway, delivery, dine-in)

### Option 2: Keep Existing Data + Add More

If you want to keep existing data and just add more:

```bash
npm run scrape-places -- --skip-clear
```

---

## 📊 Expected Results

### Areas Covered

The scraper will search these 20 areas:
- Koramangala
- Indiranagar
- HSR Layout
- Jayanagar
- Whitefield
- MG Road
- Brigade Road
- Commercial Street
- BTM Layout
- Electronic City
- Marathahalli
- Rajajinagar
- Basavanagudi
- Malleshwaram
- Yelahanka
- JP Nagar
- Bannerghatta Road
- Sarjapur Road
- Rajarajeshwari Nagar
- Hebbal

### Data Quality

✅ **Real restaurant names** (not generated)
✅ **Accurate addresses** from Google Maps
✅ **Exact GPS coordinates** (latitude/longitude)
✅ **Real ratings** (from Google reviews)
✅ **Verified phone numbers** and websites
✅ **Actual opening hours**
✅ **Correct price levels** ($, $$, $$$, $$$$)
✅ **Authentic cuisine types**

---

## 🔍 How It Works

### 1. Search Phase

For each area, the script calls Google Places API:
```
"restaurants in Koramangala, Bangalore"
"restaurants in Indiranagar, Bangalore"
... etc
```

### 2. Data Extraction

For each restaurant, it extracts:
- Basic info (name, address, location)
- Rating & reviews
- Price level → mapped to our PriceBand (LOW/MEDIUM/HIGH/PREMIUM)
- Phone number and website
- Opening hours → parsed into our format
- Types → converted to cuisine tags
- Features → takeaway, delivery, dine-in, etc.

### 3. Smart Mapping

**Price Level**:
- `PRICE_LEVEL_INEXPENSIVE` → `LOW` ($)
- `PRICE_LEVEL_MODERATE` → `MEDIUM` ($$)
- `PRICE_LEVEL_EXPENSIVE` → `HIGH` ($$$)
- `PRICE_LEVEL_VERY_EXPENSIVE` → `PREMIUM` ($$$$)

**Cuisine Tags**:
- `indian_restaurant` → Indian
- `south_indian_restaurant` → South Indian
- `chinese_restaurant` → Chinese
- `italian_restaurant` → Italian
- `cafe` → Cafe
- ... and more

**Popularity Score** (calculated from rating + review count):
```
score = (rating / 5) * 60 + log10(reviews) * 10
```
- High rating + many reviews = 90-97 score
- Good rating + some reviews = 75-85 score
- Average rating + few reviews = 70-75 score

### 4. Duplicate Detection

The script automatically skips duplicates by checking:
- Same name + similar location (within ~100 meters)

---

## ⚠️ Important Notes

### Rate Limits

- Google allows ~100 requests per minute
- Script includes automatic delays (1 second between requests)
- If rate limited, script waits 60 seconds and retries

### Cost Estimate

For 20 areas × 20 restaurants = 400 requests:
- Cost: 400 × $0.032 = **$12.80**
- Free credit: **$200/month**
- **Remaining**: $187.20

You can run this script ~15 times per month without any charges!

### API Quotas

If you hit quota limits, you can:
1. Wait until next day (quotas reset)
2. Reduce areas in the script
3. Increase billing limit in Google Cloud

---

## 🛠️ Customization

### Add More Areas

Edit `scrape-google-places.ts` and add to `BANGALORE_AREAS` array:

```typescript
const BANGALORE_AREAS = [
  'Koramangala, Bangalore',
  'Your New Area, Bangalore', // Add here
  // ...
];
```

### Change Results Per Area

Change `maxResults` in the search call:

```typescript
const places = await searchRestaurants(area, 50); // Get 50 instead of 20
```

### Filter by Type

Add filters to the search query:

```typescript
textQuery: `fine dining restaurants in ${area}`,
// or
textQuery: `cafes in ${area}`,
// or
textQuery: `vegetarian restaurants in ${area}`,
```

---

## 🐛 Troubleshooting

### Error: "GOOGLE_PLACES_API_KEY not found"

**Solution**: Add the API key to your `.env` file

### Error: "API key not valid"

**Solutions**:
1. Check if you copied the full API key
2. Make sure Places API (New) is enabled
3. Check API key restrictions

### Error: "This API method requires billing to be enabled"

**Solution**: Enable billing in Google Cloud Console (see Step 5)

### Error: "Rate limit exceeded"

**Solution**: Script automatically handles this. Just wait for it to retry.

### No restaurants saved

**Possible causes**:
1. API key restrictions too strict
2. No restaurants found in search area
3. Database connection issues

**Solution**: Check console logs for specific errors

---

## ✅ Verification

After running the scraper, verify the data:

```bash
# Open Prisma Studio
npm run prisma:studio
```

Check:
- ✅ Restaurant names look real (not "Restaurant 123")
- ✅ Addresses are complete
- ✅ Lat/Long coordinates are in Bangalore area (12.9-13.1, 77.5-77.8)
- ✅ Ratings and review counts exist
- ✅ Phone numbers and websites populated
- ✅ Opening hours structured properly

---

## 🎯 Next Steps

After scraping:

1. **Test the app**: Open your iOS app and check the map
2. **Verify markers**: Restaurants should appear at correct locations
3. **Check details**: Tap markers to see real restaurant info
4. **Test search**: Search for real restaurant names
5. **Test filters**: Filter by cuisine, price, etc.

---

## 📚 References

- [Google Places API (New) Documentation](https://developers.google.com/maps/documentation/places/web-service/place-search)
- [Places API Pricing](https://developers.google.com/maps/billing-and-pricing/pricing#places)
- [API Key Best Practices](https://developers.google.com/maps/api-security-best-practices)

---

## 🎉 Success!

Once the scraper runs successfully, your database will have:
- ✅ 400+ REAL restaurants from Google Maps
- ✅ Accurate locations and addresses
- ✅ Verified ratings and reviews
- ✅ Complete contact information
- ✅ Actual opening hours
- ✅ Professional data quality

**No more fake data - everything is real and verified by Google Maps!** 🗺️✨
