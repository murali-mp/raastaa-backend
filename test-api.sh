#!/bin/bash

API_URL="https://raastaa-app-duuy3.ondigitalocean.app/api/v1"
echo "🧪 Testing Raastaa Backend API"
echo "================================"
echo ""

# Test 1: Health Check
echo "1️⃣  Health Check:"
curl -s "$API_URL/../health" | jq '.'
echo ""

# Test 2: Signup
echo "2️⃣  User Signup:"
SIGNUP_RESPONSE=$(curl -s -X POST "$API_URL/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@raastaa.com",
    "password": "Test1234!",
    "name": "Test User"
  }')
echo "$SIGNUP_RESPONSE" | jq '.'
ACCESS_TOKEN=$(echo "$SIGNUP_RESPONSE" | jq -r '.data.tokens.accessToken // empty')
echo ""

# Test 3: Login
echo "3️⃣  User Login:"
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@raastaa.com",
    "password": "Test1234!"
  }')
echo "$LOGIN_RESPONSE" | jq '.'
if [ -z "$ACCESS_TOKEN" ]; then
  ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.tokens.accessToken // empty')
fi
echo ""

# Test 4: Get User Profile (requires auth)
if [ ! -z "$ACCESS_TOKEN" ]; then
  echo "4️⃣  Get User Profile (authenticated):"
  curl -s -X GET "$API_URL/users/me" \
    -H "Authorization: Bearer $ACCESS_TOKEN" | jq '.'
  echo ""
fi

# Test 5: Nearby Vendors (requires coordinates)
echo "5️⃣  Search Nearby Vendors (Bangalore coordinates):"
curl -s -X GET "$API_URL/vendors/nearby?latitude=12.9716&longitude=77.5946&radiusKm=5" | jq '.'
echo ""

# Test 6: Wallet Info (requires auth)
if [ ! -z "$ACCESS_TOKEN" ]; then
  echo "6️⃣  Get Wallet Info (authenticated):"
  curl -s -X GET "$API_URL/wallet" \
    -H "Authorization: Bearer $ACCESS_TOKEN" | jq '.'
  echo ""
fi

# Test 7: Get Challenges (requires auth)
if [ ! -z "$ACCESS_TOKEN" ]; then
  echo "7️⃣  Get Challenges (authenticated):"
  curl -s -X GET "$API_URL/challenges" \
    -H "Authorization: Bearer $ACCESS_TOKEN" | jq '.'
  echo ""
fi

echo "✅ API Tests Complete!"
