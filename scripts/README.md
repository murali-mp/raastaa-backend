# Vendor Import Script

This script imports vendor data from Google Places JSON format into the Raastaa database.

## What Was Added

### Database Changes
- **Vendor table**: Added `placeId`, `averageRating`, and `totalRatings` fields
- **VendorOperationalInfo table**: Added `googleMapsUrl` field
- Opening hours already existed but now properly utilized

### Backend Changes
- Updated serializers to include new fields in API responses
- Migration applied to production database

### Frontend Changes (iOS App)
- **VendorDetailView**:
  - Displays star ratings with review count
  - Shows opening hours in a formatted list
  - "Open in Google Maps" button that opens the vendor in Google Maps

- **DiscoverVendorCard** (Carousel cards):
  - Shows star rating and review count below vendor name

- **VendorListRow** (List view):
  - Displays star rating with review count

## Usage

### 1. Prepare Your JSON File

Your JSON file should contain an array of vendors in this format:

\`\`\`json
[
  {
    "place_id": "ChIJ-_DCbuk9rjsR5QhuvfgnaW0",
    "name": "Rakshith Chicken and Mutton Center",
    "lat": 12.9816227,
    "lng": 77.54301579999999,
    "rating": 4.7,
    "ratings_total": 36,
    "address": "19/1, 9th cross road, Bengaluru, Karnataka 560079, India",
    "area": "Bengaluru",
    "types": ["establishment", "food", "point_of_interest", "store"],
    "google_maps_url": "https://maps.google.com/?cid=7883876571972241637",
    "phone": null,
    "website": null,
    "price_level": 2,
    "hours": [
      "Monday: 6:30 AM – 9:00 PM",
      "Tuesday: 6:30 AM – 9:00 PM",
      "Wednesday: 6:30 AM – 9:00 PM",
      "Thursday: 6:30 AM – 9:00 PM",
      "Friday: 6:30 AM – 9:00 PM",
      "Saturday: 6:30 AM – 9:00 PM",
      "Sunday: 5:30 AM – 9:00 PM"
    ]
  }
]
\`\`\`

### 2. Run the Import Script

\`\`\`bash
npm run import-vendors /path/to/your/vendors.json
\`\`\`

The script will:
- Create new vendors if they don't exist (based on `place_id`)
- Update existing vendors if they already exist
- Convert opening hours from Google format to database format
- Create locations for each vendor
- Create operational info with Google Maps URL and opening hours
- Show progress every 100 vendors
- Display final summary with import/update/error counts

### 3. Example

\`\`\`bash
# If your JSON file is in the current directory
npm run import-vendors ./vendors-data.json

# If it's somewhere else
npm run import-vendors ~/Downloads/google-vendors.json
\`\`\`

## How the Script Works

### Opening Hours Conversion
The script converts Google's opening hours format:
- **From**: `"Monday: 6:30 AM – 9:00 PM"`
- **To**: `{"monday": "06:30-21:00"}`

### Price Level Mapping
- Price level 1 → LOW ($)
- Price level 2 → MEDIUM ($$)
- Price level 3 → HIGH ($$$)
- Price level 4 → PREMIUM ($$$$)

### Location Handling
Each vendor gets a location record with:
- Latitude and longitude from Google data
- Area and city extracted from the address
- Full address stored for reference

### Duplicate Detection
The script uses **name + location** (within 50 meters) to detect duplicates:
- If a vendor with the same name exists within 50m → **UPDATE**
- If no matching vendor exists → **CREATE NEW**
- Uses PostgreSQL/PostGIS spatial queries for accurate distance calculation

## Output Example

\`\`\`
Reading vendor data from ./vendors.json...
Found 8000 vendors to import
Progress: 100 imported, 0 updated, 0 errors
Progress: 200 imported, 0 updated, 0 errors
...
Progress: 7900 imported, 100 updated, 0 errors

✅ Import complete!
   - Imported: 7900
   - Updated: 100
   - Errors: 0

🎉 All done!
\`\`\`

## Error Handling

If the script encounters errors:
- It continues processing remaining vendors
- Logs the error to console
- Shows error count in final summary

Common errors:
- Invalid address format
- Missing required fields
- Database connection issues

## What Gets Updated in the App

After importing, users will see in the iOS app:

### Vendor Detail Screen
- ⭐ Star rating with review count (e.g., "4.7 (36 reviews)")
- 🕐 Opening hours section showing all days
- 🗺️ "Open in Google Maps" button (links to Google Maps)

### Vendor Cards (Discover Feed)
- ⭐ Star rating below vendor name (e.g., "4.7 (36)")

### Vendor List View
- ⭐ Star rating with review count in the info row

## Notes

- The script is **idempotent** - you can run it multiple times safely
- Existing vendor data is **preserved** and only updated with new Google data
- The script does **NOT** delete any vendors
- Opening hours are stored in **24-hour format** in the database
- All timestamps use the database's timezone settings
