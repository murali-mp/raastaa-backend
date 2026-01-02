import { PrismaClient, PriceBand } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

/**
 * Google Places API Restaurant Scraper
 *
 * This script uses Google Places API to fetch REAL restaurant data
 * for Bangalore and populate the database with verified information.
 *
 * Setup:
 * 1. Get API key from: https://console.cloud.google.com/google/maps-apis
 * 2. Enable: Places API (New) and Geocoding API
 * 3. Set in .env: GOOGLE_PLACES_API_KEY=your_api_key_here
 *
 * Usage:
 * npm run scrape-places
 */

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const PLACES_API_URL = 'https://places.googleapis.com/v1/places:searchText';

if (!GOOGLE_PLACES_API_KEY) {
  console.error('❌ ERROR: GOOGLE_PLACES_API_KEY not found in .env file');
  console.log('\n📝 Setup Instructions:');
  console.log('1. Go to: https://console.cloud.google.com/google/maps-apis');
  console.log('2. Create a project and enable "Places API (New)"');
  console.log('3. Create an API key');
  console.log('4. Add to .env file: GOOGLE_PLACES_API_KEY=your_key_here\n');
  process.exit(1);
}

// Bangalore areas to search
const BANGALORE_AREAS = [
  'Koramangala, Bangalore',
  'Indiranagar, Bangalore',
  'HSR Layout, Bangalore',
  'Jayanagar, Bangalore',
  'Whitefield, Bangalore',
  'MG Road, Bangalore',
  'Brigade Road, Bangalore',
  'Commercial Street, Bangalore',
  'BTM Layout, Bangalore',
  'Electronic City, Bangalore',
  'Marathahalli, Bangalore',
  'Rajajinagar, Bangalore',
  'Basavanagudi, Bangalore',
  'Malleshwaram, Bangalore',
  'Yelahanka, Bangalore',
  'JP Nagar, Bangalore',
  'Bannerghatta Road, Bangalore',
  'Sarjapur Road, Bangalore',
  'Rajarajeshwari Nagar, Bangalore',
  'Hebbal, Bangalore',
];

interface GooglePlace {
  id: string;
  displayName: { text: string };
  formattedAddress?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  types?: string[];
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  regularOpeningHours?: {
    weekdayDescriptions?: string[];
    openNow?: boolean;
  };
  editorialSummary?: {
    text: string;
  };
  primaryType?: string;
  primaryTypeDisplayName?: { text: string };
  goodForChildren?: boolean;
  servesBeer?: boolean;
  servesWine?: boolean;
  servesCocktails?: boolean;
  servesVegetarianFood?: boolean;
  servesBreakfast?: boolean;
  servesLunch?: boolean;
  servesDinner?: boolean;
  takeout?: boolean;
  delivery?: boolean;
  dineIn?: boolean;
  reservable?: boolean;
  paymentOptions?: {
    acceptsCreditCards?: boolean;
    acceptsDebitCards?: boolean;
    acceptsCashOnly?: boolean;
  };
}

// Map Google price level to our PriceBand
function mapPriceLevel(priceLevel?: string): PriceBand {
  if (!priceLevel) return 'MEDIUM';

  switch (priceLevel) {
    case 'PRICE_LEVEL_INEXPENSIVE':
      return 'LOW';
    case 'PRICE_LEVEL_MODERATE':
      return 'MEDIUM';
    case 'PRICE_LEVEL_EXPENSIVE':
      return 'HIGH';
    case 'PRICE_LEVEL_VERY_EXPENSIVE':
      return 'PREMIUM';
    default:
      return 'MEDIUM';
  }
}

// Extract cuisine types from Google place types
function extractCuisineTypes(types?: string[], primaryType?: string): string[] {
  const cuisineMap: { [key: string]: string } = {
    'indian_restaurant': 'Indian',
    'south_indian_restaurant': 'South Indian',
    'north_indian_restaurant': 'North Indian',
    'chinese_restaurant': 'Chinese',
    'italian_restaurant': 'Italian',
    'japanese_restaurant': 'Japanese',
    'thai_restaurant': 'Thai',
    'mexican_restaurant': 'Mexican',
    'pizza_restaurant': 'Italian',
    'seafood_restaurant': 'Seafood',
    'vegetarian_restaurant': 'Vegetarian',
    'fast_food_restaurant': 'Fast Food',
    'cafe': 'Cafe',
    'bakery': 'Bakery',
    'bar': 'Bar',
    'barbecue_restaurant': 'BBQ',
    'breakfast_restaurant': 'Breakfast',
    'brunch_restaurant': 'Brunch',
    'sandwich_shop': 'Sandwich',
    'hamburger_restaurant': 'Burger',
    'ice_cream_shop': 'Dessert',
    'dessert_shop': 'Dessert',
    'coffee_shop': 'Cafe',
  };

  const cuisines: string[] = [];
  const allTypes = [...(types || []), primaryType].filter(Boolean);

  for (const type of allTypes) {
    if (type && cuisineMap[type]) {
      cuisines.push(cuisineMap[type]);
    }
  }

  return cuisines.length > 0 ? [...new Set(cuisines)] : ['Restaurant'];
}

// Extract dietary tags
function extractDietaryTags(place: GooglePlace): string[] {
  const dietary: string[] = [];

  if (place.servesVegetarianFood) {
    dietary.push('Vegetarian');
  }

  return dietary;
}

// Extract vibe tags
function extractVibeTags(place: GooglePlace): string[] {
  const vibes: string[] = [];

  if (place.goodForChildren) {
    vibes.push('Family-Friendly');
  }

  if (place.servesBeer || place.servesWine || place.servesCocktails) {
    vibes.push('Bar');
  }

  // Add more based on types
  if (place.types?.includes('fine_dining_restaurant')) {
    vibes.push('Fine Dining');
  } else if (place.types?.includes('casual_dining_restaurant')) {
    vibes.push('Casual');
  } else if (place.types?.includes('fast_food_restaurant')) {
    vibes.push('Quick Bite');
  }

  return vibes.length > 0 ? vibes : ['Casual'];
}

// Extract feature tags
function extractFeatureTags(place: GooglePlace): string[] {
  const features: string[] = [];

  if (place.takeout) features.push('Takeaway');
  if (place.delivery) features.push('Delivery');
  if (place.dineIn) features.push('Dine-in');
  if (place.reservable) features.push('Reservations');
  if (place.regularOpeningHours?.openNow) features.push('Open Now');

  return features;
}

// Calculate popularity score from rating and review count
function calculatePopularityScore(rating?: number, reviewCount?: number): number {
  if (!rating || !reviewCount) return 70.0;

  // Formula: (rating / 5) * 60 + log scale of reviews
  const ratingScore = (rating / 5) * 60;
  const reviewScore = Math.min(30, Math.log10(reviewCount + 1) * 10);

  return Math.min(97.5, ratingScore + reviewScore);
}

// Parse opening hours
function parseOpeningHours(weekdayDescriptions?: string[]): any {
  if (!weekdayDescriptions || weekdayDescriptions.length === 0) {
    return null;
  }

  const daysMap: { [key: string]: string } = {
    'Monday': 'monday',
    'Tuesday': 'tuesday',
    'Wednesday': 'wednesday',
    'Thursday': 'thursday',
    'Friday': 'friday',
    'Saturday': 'saturday',
    'Sunday': 'sunday',
  };

  const hours: any = {};

  for (const desc of weekdayDescriptions) {
    // Format: "Monday: 9:00 AM – 10:00 PM"
    const parts = desc.split(':');
    if (parts.length < 2) continue;

    const day = parts[0].trim();
    const timeRange = parts.slice(1).join(':').trim();

    if (daysMap[day]) {
      if (timeRange.toLowerCase().includes('closed')) {
        hours[daysMap[day]] = { open: null, close: null };
      } else {
        // Try to parse time range
        const times = timeRange.split('–').map(t => t.trim());
        if (times.length === 2) {
          hours[daysMap[day]] = { open: times[0], close: times[1] };
        }
      }
    }
  }

  return Object.keys(hours).length > 0 ? hours : null;
}

// Search for restaurants in a specific area
async function searchRestaurants(area: string, maxResults: number = 20): Promise<GooglePlace[]> {
  console.log(`\n🔍 Searching for restaurants in: ${area}`);

  try {
    const response = await axios.post(
      PLACES_API_URL,
      {
        textQuery: `restaurants in ${area}`,
        maxResultCount: maxResults,
        languageCode: 'en',
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
          'X-Goog-FieldMask': [
            'places.id',
            'places.displayName',
            'places.formattedAddress',
            'places.location',
            'places.rating',
            'places.userRatingCount',
            'places.priceLevel',
            'places.types',
            'places.nationalPhoneNumber',
            'places.internationalPhoneNumber',
            'places.websiteUri',
            'places.regularOpeningHours',
            'places.editorialSummary',
            'places.primaryType',
            'places.primaryTypeDisplayName',
            'places.goodForChildren',
            'places.servesBeer',
            'places.servesWine',
            'places.servesCocktails',
            'places.servesVegetarianFood',
            'places.servesBreakfast',
            'places.servesLunch',
            'places.servesDinner',
            'places.takeout',
            'places.delivery',
            'places.dineIn',
            'places.reservable',
            'places.paymentOptions',
          ].join(','),
        },
      }
    );

    const places = response.data.places || [];
    console.log(`   Found ${places.length} restaurants`);

    // Add delay to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));

    return places;
  } catch (error: any) {
    if (error.response?.status === 429) {
      console.error('   ⚠️  Rate limit exceeded. Waiting 60 seconds...');
      await new Promise(resolve => setTimeout(resolve, 60000));
      return searchRestaurants(area, maxResults);
    }

    console.error(`   ❌ Error searching ${area}:`, error.response?.data || error.message);
    return [];
  }
}

// Save restaurant to database
async function saveRestaurant(place: GooglePlace, areaName: string): Promise<void> {
  try {
    // Extract area name from address
    const extractedArea = areaName.split(',')[0].trim();

    // Skip if no location data
    if (!place.location?.latitude || !place.location?.longitude) {
      console.log(`   ⚠️  Skipping ${place.displayName.text} - No location data`);
      return;
    }

    // Check if restaurant already exists (by name and approximate location)
    const existing = await prisma.vendor.findFirst({
      where: {
        name: place.displayName.text,
        location: {
          latitude: {
            gte: place.location.latitude - 0.001,
            lte: place.location.latitude + 0.001,
          },
          longitude: {
            gte: place.location.longitude - 0.001,
            lte: place.location.longitude + 0.001,
          },
        },
      },
    });

    if (existing) {
      console.log(`   ℹ️  Already exists: ${place.displayName.text}`);
      return;
    }

    // Create location
    const location = await prisma.location.create({
      data: {
        address: place.formattedAddress || '',
        area: extractedArea,
        city: 'Bangalore',
        state: 'Karnataka',
        country: 'India',
        postalCode: '',
        latitude: place.location.latitude,
        longitude: place.location.longitude,
      },
    });

    // Create vendor
    const vendor = await prisma.vendor.create({
      data: {
        name: place.displayName.text,
        description: place.editorialSummary?.text || place.primaryTypeDisplayName?.text || 'Restaurant in Bangalore',
        locationId: location.id,
        priceBand: mapPriceLevel(place.priceLevel),
        popularityScore: calculatePopularityScore(place.rating, place.userRatingCount),
        isVerified: (place.userRatingCount || 0) > 100, // Verified if >100 reviews
        contactPhone: place.nationalPhoneNumber || place.internationalPhoneNumber,
        contactEmail: null,
        websiteUrl: place.websiteUri,
      },
    });

    // Create tags
    const cuisineTags = extractCuisineTypes(place.types, place.primaryType);
    const dietaryTags = extractDietaryTags(place);
    const vibeTags = extractVibeTags(place);
    const featureTags = extractFeatureTags(place);

    const allTagNames = [...cuisineTags, ...dietaryTags, ...vibeTags, ...featureTags];

    for (const tagName of allTagNames) {
      // Find or create tag
      let tag = await prisma.tag.findFirst({ where: { name: tagName } });

      if (!tag) {
        // Determine category
        let category: 'CUISINE' | 'DIETARY' | 'VIBE' | 'FEATURE' = 'FEATURE';
        if (cuisineTags.includes(tagName)) category = 'CUISINE';
        else if (dietaryTags.includes(tagName)) category = 'DIETARY';
        else if (vibeTags.includes(tagName)) category = 'VIBE';

        tag = await prisma.tag.create({
          data: { name: tagName, category },
        });
      }

      // Link tag to vendor
      await prisma.vendor.update({
        where: { id: vendor.id },
        data: {
          tags: {
            connect: { id: tag.id },
          },
        },
      });
    }

    // Create operational info if hours available
    if (place.regularOpeningHours?.weekdayDescriptions) {
      const hours = parseOpeningHours(place.regularOpeningHours.weekdayDescriptions);

      if (hours) {
        await prisma.vendorOperationalInfo.create({
          data: {
            vendorId: vendor.id,
            openingHours: hours,
            averageWaitTime: null,
            acceptsReservations: place.reservable || false,
            paymentMethods: [],
          },
        });
      }
    }

    console.log(`   ✅ Saved: ${place.displayName.text} (${place.rating || 'N/A'}⭐, ${place.userRatingCount || 0} reviews)`);
  } catch (error: any) {
    console.error(`   ❌ Error saving ${place.displayName.text}:`, error.message);
  }
}

// Main scraping function
async function scrapeGooglePlaces() {
  console.log('🚀 Starting Google Places Restaurant Scraper\n');
  console.log('─'.repeat(80));

  let totalRestaurants = 0;
  let savedRestaurants = 0;

  for (const area of BANGALORE_AREAS) {
    const places = await searchRestaurants(area, 20);
    totalRestaurants += places.length;

    for (const place of places) {
      await saveRestaurant(place, area);
      savedRestaurants++;
    }
  }

  console.log('\n' + '─'.repeat(80));
  console.log(`\n✅ Scraping Complete!\n`);
  console.log(`📊 Summary:`);
  console.log(`   Areas searched: ${BANGALORE_AREAS.length}`);
  console.log(`   Restaurants found: ${totalRestaurants}`);
  console.log(`   Restaurants saved: ${savedRestaurants}`);
  console.log(`\n🎉 Database populated with REAL Google Maps data!\n`);
}

// Clear all existing vendors
async function clearDatabase() {
  console.log('🗑️  Clearing existing database...\n');

  // Delete in correct order due to foreign keys
  await prisma.vendorOperationalInfo.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.review.deleteMany();
  await prisma.visit.deleteMany();
  await prisma.vendor.update({
    where: {},
    data: {
      tags: {
        set: [],
      },
    },
  });
  await prisma.vendor.deleteMany();
  await prisma.location.deleteMany();
  await prisma.tag.deleteMany();

  console.log('✅ Database cleared!\n');
  console.log('─'.repeat(80));
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  const skipClear = args.includes('--skip-clear');

  try {
    if (!skipClear) {
      await clearDatabase();
    }

    await scrapeGooglePlaces();
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
