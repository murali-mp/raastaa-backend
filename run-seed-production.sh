#!/bin/bash

# Run the seed script against production database
# This connects directly to your DigitalOcean PostgreSQL database

echo "🌱 Seeding Production Database"
echo "================================"
echo ""
echo "This will add 15 real Bangalore vendors to your database"
echo ""

echo "📡 Connecting to production database..."
echo ""
echo "❌ ERROR: You need to set DATABASE_URL environment variable"
echo ""
echo "Get your DATABASE_URL from:"
echo "  DigitalOcean → Databases → raastaa-db → Connection Details"
echo ""
echo "Then run:"
echo "  DATABASE_URL='your-connection-string-here' ./run-seed-production.sh"
echo ""
exit 1

# Uncomment and set your DATABASE_URL:
# DATABASE_URL="postgresql://user:password@host:port/database?sslmode=require"

# DATABASE_URL="$DATABASE_URL" npm run seed

echo ""
echo "✅ Done! Test the API:"
echo "curl 'https://raastaa-app-duuy3.ondigitalocean.app/api/v1/vendors/nearby?latitude=12.9716&longitude=77.5946&radiusKm=10'"
