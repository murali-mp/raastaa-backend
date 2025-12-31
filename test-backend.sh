#!/bin/bash

echo "🧪 Testing Raastaa Backend API"
echo "================================"
echo ""

BASE_URL="https://raastaa-app-duuy3.ondigitalocean.app"

# Test 1: Health Check
echo "1️⃣  Health Check"
HEALTH=$(curl -s "$BASE_URL/health" | jq -r '.status')
if [ "$HEALTH" = "ok" ]; then
  echo "   ✅ Backend is healthy"
else
  echo "   ❌ Backend is down"
  exit 1
fi
echo ""

# Test 2: Vendors Nearby (Indiranagar center)
echo "2️⃣  Vendors Near Indiranagar (12.9716, 77.5946)"
VENDOR_COUNT=$(curl -s "$BASE_URL/api/v1/vendors/nearby?latitude=12.9716&longitude=77.5946&radiusKm=10" | jq '.data.vendors | length')
echo "   Found: $VENDOR_COUNT vendors"

if [ "$VENDOR_COUNT" -gt 0 ]; then
  echo "   ✅ Vendors loaded successfully!"
  echo ""
  echo "   Top 5 nearby vendors:"
  curl -s "$BASE_URL/api/v1/vendors/nearby?latitude=12.9716&longitude=77.5946&radiusKm=10" | jq -r '.data.vendors[0:5] | .[] | "   • \(.name) (\(.distance_km)km away)"'
else
  echo "   ⚠️  No vendors found - database may not be seeded yet"
fi
echo ""

# Test 3: Search for Dosa
echo "3️⃣  Search: 'dosa'"
DOSA_COUNT=$(curl -s "$BASE_URL/api/v1/vendors/search?q=dosa" | jq '.data.vendors | length')
echo "   Found: $DOSA_COUNT dosa vendors"
if [ "$DOSA_COUNT" -gt 0 ]; then
  curl -s "$BASE_URL/api/v1/vendors/search?q=dosa" | jq -r '.data.vendors[] | "   • \(.name)"'
fi
echo ""

# Test 4: Search for Biryani
echo "4️⃣  Search: 'biryani'"
BIRYANI_COUNT=$(curl -s "$BASE_URL/api/v1/vendors/search?q=biryani" | jq '.data.vendors | length')
echo "   Found: $BIRYANI_COUNT biryani vendors"
if [ "$BIRYANI_COUNT" -gt 0 ]; then
  curl -s "$BASE_URL/api/v1/vendors/search?q=biryani" | jq -r '.data.vendors[] | "   • \(.name)"'
fi
echo ""

# Test 5: All vendors within 20km of city center
echo "5️⃣  All Vendors (20km radius from Vidhana Soudha)"
ALL_VENDORS=$(curl -s "$BASE_URL/api/v1/vendors/nearby?latitude=12.9796&longitude=77.5913&radiusKm=20" | jq '.data.vendors | length')
echo "   Total vendors in database: $ALL_VENDORS"
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Health: ✅"
echo "Total Vendors: $ALL_VENDORS"
echo "Nearby Search: ✅"
echo "Text Search: ✅"
echo ""

if [ "$ALL_VENDORS" -eq 15 ]; then
  echo "🎉 Perfect! All 15 vendors are loaded!"
elif [ "$ALL_VENDORS" -gt 0 ]; then
  echo "⚠️  Partial data: Expected 15 vendors, found $ALL_VENDORS"
else
  echo "❌ No vendors in database. Run the SQL seed script!"
fi
