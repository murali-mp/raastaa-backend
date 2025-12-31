#!/bin/bash

# Production seed script - run this to populate production database
# Get DATABASE_URL from DigitalOcean environment variables

echo "🌱 Seeding production database..."
echo "📋 Make sure you have DATABASE_URL from DigitalOcean environment variables"
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL environment variable is not set"
  echo ""
  echo "To run this script:"
  echo "1. Go to your DigitalOcean App → Settings → App-Level Environment Variables"
  echo "2. Copy the DATABASE_URL value"
  echo "3. Run: DATABASE_URL='your-connection-string' ./seed-production.sh"
  exit 1
fi

echo "✅ DATABASE_URL found"
echo "🚀 Running seed script..."
echo ""

tsx prisma/seed.ts

echo ""
echo "✨ Done! Check output above for results"
