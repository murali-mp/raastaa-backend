import { PrismaClient, PriceBand } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

/**
 * OpenStreetMap Restaurant Scraper - 100% FREE!
 *
 * Uses OpenStreetMap's Overpass API to fetch REAL restaurant data
 * No API key needed, completely free, unlimited requests!
 *
 * Data source: OpenStreetMap (community-contributed, real places)
 *
 * Usage:
 * npm run scrape-osm
 */

const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';

// Bangalore bounding box coordinates
// Format: [south, west, north, east]
const BANGALORE_AREAS = [
  { name: 'Central Bangalore', bbox: [12.95, 77.55, 13.00, 77.65] },
  { name: 'North Bangalore', bbox: [13.00, 77.55, 13.10, 77.65] },
  { name: 'South Bangalore', bbox: [12.85, 77.55, 12.95, 77.65] },
  { name: 'East Bangalore', bbox: [12.95, 77.65, 13.00, 77.75] },
  { name: 'West Bangalore', bbox: [12.95, 77.50, 13.00, 77.60] },
  { name: 'Whitefield Area', bbox: [12.95, 77.70, 13.05, 77.80] },
  { name: 'Koramangala-HSR', bbox: [12.90, 77.62, 12.95, 77.68] },
  { name: 'Indiranagar', bbox: [12.96, 77.63, 13.00, 77.67] },
  { name: 'Jayanagar', bbox: [12.91, 77.58, 12.94, 77.62] },
  { name: 'BTM-Bannerghatta', bbox: [12.88, 77.60, 12.92, 77.66] },
];

interface OSMPlace {
  type: string;
  id: number;
  lat: number;
  lon: number;
  tags: {
    name?: string;
    'name:en'?: string;
    amenity?: string;
    cuisine?: string;
    'addr:street'?: string;
    'addr:housenumber'?: string;
    'addr:city'?: string;
    'addr:postcode'?: string;
    'addr:state'?: string;
    phone?: string;
    'contact:phone'?: string;
    website?: string;
    'contact:website'?: string;
    opening_hours?: string;
    diet_vegan?: string;
    diet_vegetarian?: string;
    organic?: string;
    takeaway?: string;
    delivery?: string;
    outdoor_seating?: string;
    wheelchair?: string;
    description?: string;
    brand?: string;
    operator?: string;
  };
}

interface OSMResponse {
  elements: OSMPlace[];
}

// Build Overpass query for restaurants
function buildOverpassQuery(bbox: number[]): string {
  const [south, west, north, east] = bbox;
  const bboxStr = `${south},${west},${north},${east}`;

  return `
    [out:json][timeout:60];
    (
      node["amenity"="restaurant"](${bboxStr});
      node["amenity"="cafe"](${bboxStr});
      node["amenity"="fast_food"](${bboxStr});
      node["amenity"="food_court"](${bboxStr});
      node["amenity"="bar"](${bboxStr});
      node["amenity"="pub"](${bboxStr});
      node["amenity"="ice_cream"](${bboxStr});
      way["amenity"="restaurant"](${bboxStr});
      way["amenity"="cafe"](${bboxStr});
      way["amenity"="fast_food"](${bboxStr});
      way["amenity"="food_court"](${bboxStr});
      way["amenity"="bar"](${bboxStr});
      way["amenity"="pub"](${bboxStr});
    );
    out center;
  `;
}

// Extract area from coordinates (reverse geocode approximation)
function getAreaFromCoordinates(lat: number, lon: number): string {
  // Simple area mapping based on coordinates
  if (lat >= 12.96 && lat <= 13.00 && lon >= 12.63 && lon <= 77.67) return 'Indiranagar';
  if (lat >= 12.90 && lat <= 12.95 && lon >= 77.62 && lon <= 77.68) return 'Koramangala';
  if (lat >= 12.90 && lat <= 12.93 && lon >= 77.60 && lon <= 77.65) return 'HSR Layout';
  if (lat >= 12.91 && lat <= 12.94 && lon >= 77.58 && lon <= 77.62) return 'Jayanagar';
  if (lat >= 12.95 && lat <= 13.10 && lon >= 77.70 && lon <= 77.80) return 'Whitefield';
  if (lat >= 12.97 && lat <= 13.02 && lon >= 77.58 && lon <= 77.62) return 'Malleshwaram';
  if (lat >= 12.88 && lat <= 12.92 && lon >= 77.60 && lon <= 77.66) return 'BTM Layout';
  if (lat >= 12.93 && lat <= 12.97 && lon >= 77.60 && lon <= 77.64) return 'MG Road';
  if (lat >= 12.85 && lat <= 12.91 && lon >= 77.49 && lon <= 77.53) return 'Rajarajeshwari Nagar';
  if (lat >= 13.02 && lat <= 13.08 && lon >= 77.56 && lon <= 77.62) return 'Hebbal';

  return 'Bangalore';
}

// Map OSM cuisine types to our tags
function extractCuisineTags(cuisine?: string, amenity?: string): string[] {
  const cuisines: string[] = [];

  if (!cuisine && !amenity) return ['Restaurant'];

  // Map amenity type
  if (amenity) {
    switch (amenity) {
      case 'cafe':
        cuisines.push('Cafe');
        break;
      case 'fast_food':
        cuisines.push('Fast Food');
        break;
      case 'bar':
      case 'pub':
        cuisines.push('Bar');
        break;
      case 'ice_cream':
        cuisines.push('Dessert');
        break;
    }
  }

  // Map cuisine types
  if (cuisine) {
    const types = cuisine.toLowerCase().split(/[;,]/);
    for (const type of types) {
      const trimmed = type.trim();
      if (trimmed.includes('indian') && trimmed.includes('south')) cuisines.push('South Indian');
      else if (trimmed.includes('indian') && trimmed.includes('north')) cuisines.push('North Indian');
      else if (trimmed.includes('indian')) cuisines.push('Indian');
      else if (trimmed.includes('chinese')) cuisines.push('Chinese');
      else if (trimmed.includes('italian')) cuisines.push('Italian');
      else if (trimmed.includes('pizza')) cuisines.push('Italian');
      else if (trimmed.includes('burger')) cuisines.push('Burger');
      else if (trimmed.includes('chicken')) cuisines.push('Fast Food');
      else if (trimmed.includes('biryani')) cuisines.push('Biryani');
      else if (trimmed.includes('thai')) cuisines.push('Thai');
      else if (trimmed.includes('japanese')) cuisines.push('Japanese');
      else if (trimmed.includes('korean')) cuisines.push('Korean');
      else if (trimmed.includes('mexican')) cuisines.push('Mexican');
      else if (trimmed.includes('seafood')) cuisines.push('Seafood');
      else if (trimmed.includes('vegetarian')) cuisines.push('Vegetarian');
      else if (trimmed.includes('vegan')) cuisines.push('Vegan');
      else if (trimmed.includes('sandwich')) cuisines.push('Sandwich');
      else if (trimmed.includes('coffee')) cuisines.push('Cafe');
      else if (trimmed.includes('bakery')) cuisines.push('Bakery');
      else if (trimmed.includes('dessert') || trimmed.includes('ice_cream')) cuisines.push('Dessert');
    }
  }

  return cuisines.length > 0 ? [...new Set(cuisines)] : ['Restaurant'];
}

// Extract dietary tags
function extractDietaryTags(tags: OSMPlace['tags']): string[] {
  const dietary: string[] = [];

  if (tags.diet_vegetarian === 'yes' || tags.diet_vegetarian === 'only') {
    dietary.push('Vegetarian');
  }
  if (tags.diet_vegan === 'yes' || tags.diet_vegan === 'only') {
    dietary.push('Vegan');
  }
  if (tags.organic === 'yes') {
    dietary.push('Organic');
  }

  return dietary;
}

// Extract feature tags
function extractFeatureTags(tags: OSMPlace['tags']): string[] {
  const features: string[] = [];

  if (tags.takeaway === 'yes') features.push('Takeaway');
  if (tags.delivery === 'yes') features.push('Delivery');
  if (tags.outdoor_seating === 'yes') features.push('Outdoor Seating');
  if (tags.wheelchair === 'yes') features.push('Wheelchair Accessible');

  return features;
}

// Estimate price band from tags (OSM doesn't have price info usually)
function estimatePriceBand(tags: OSMPlace['tags']): PriceBand {
  const amenity = tags.amenity;
  const brand = tags.brand?.toLowerCase();

  // Fast food and street food = LOW
  if (amenity === 'fast_food') return 'LOW';

  // Well-known expensive brands
  if (brand?.includes('starbucks') || brand?.includes('costa')) return 'HIGH';

  // Fine dining keywords
  if (tags.description?.toLowerCase().includes('fine dining')) return 'PREMIUM';

  // Default to medium
  return 'MEDIUM';
}

// Calculate popularity score (without ratings, we use other signals)
function calculatePopularityScore(tags: OSMPlace['tags']): number {
  let score = 70.0; // Base score

  // Well-known brands get higher score
  if (tags.brand) score += 10;

  // Has website = more established
  if (tags.website || tags['contact:website']) score += 5;

  // Has phone = more professional
  if (tags.phone || tags['contact:phone']) score += 5;

  // Has full address = more complete data
  if (tags['addr:street'] && tags['addr:housenumber']) score += 5;

  // Has opening hours = more complete data
  if (tags.opening_hours) score += 5;

  return Math.min(95.0, score);
}

// Parse OSM opening hours (simplified)
function parseOpeningHours(opening_hours?: string): any {
  if (!opening_hours) return null;

  // OSM opening_hours can be very complex
  // For now, we'll store it as-is in a simple format
  // Example: "Mo-Fr 10:00-22:00; Sa-Su 09:00-23:00"

  try {
    // Simple parsing for common patterns
    if (opening_hours === '24/7') {
      return {
        monday: { open: '00:00', close: '23:59' },
        tuesday: { open: '00:00', close: '23:59' },
        wednesday: { open: '00:00', close: '23:59' },
        thursday: { open: '00:00', close: '23:59' },
        friday: { open: '00:00', close: '23:59' },
        saturday: { open: '00:00', close: '23:59' },
        sunday: { open: '00:00', close: '23:59' },
      };
    }

    // For complex formats, return null (would need proper OSM opening_hours parser)
    return null;
  } catch {
    return null;
  }
}

// Build full address
function buildAddress(tags: OSMPlace['tags']): string {
  const parts: string[] = [];

  if (tags['addr:housenumber']) parts.push(tags['addr:housenumber']);
  if (tags['addr:street']) parts.push(tags['addr:street']);

  if (parts.length === 0 && tags.name) {
    return `${tags.name}, Bangalore`;
  }

  parts.push('Bangalore');

  return parts.join(', ');
}

// Fetch restaurants from OpenStreetMap
async function fetchRestaurants(areaName: string, bbox: number[]): Promise<OSMPlace[]> {
  console.log(`\n🔍 Fetching restaurants from: ${areaName}`);

  try {
    const query = buildOverpassQuery(bbox);

    const response = await axios.post<OSMResponse>(
      OVERPASS_API_URL,
      query,
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 60000, // 60 second timeout
      }
    );

    const places = response.data.elements || [];

    // Filter: must have a name
    const namedPlaces = places.filter(p => p.tags?.name || p.tags?.['name:en']);

    console.log(`   Found ${namedPlaces.length} restaurants with names`);

    // Respect rate limits (be nice to OSM servers)
    await new Promise(resolve => setTimeout(resolve, 2000));

    return namedPlaces;
  } catch (error: any) {
    console.error(`   ❌ Error fetching from ${areaName}:`, error.message);
    return [];
  }
}

// Save restaurant to database
async function saveRestaurant(place: OSMPlace): Promise<boolean> {
  try {
    const tags = place.tags;
    const name = tags.name || tags['name:en'];

    if (!name) {
      console.log(`   ⚠️  Skipping - No name`);
      return false;
    }

    // Get coordinates (handle both node and way)
    const lat = place.lat || (place as any).center?.lat;
    const lon = place.lon || (place as any).center?.lon;

    if (!lat || !lon) {
      console.log(`   ⚠️  Skipping ${name} - No coordinates`);
      return false;
    }

    // Check if already exists
    const existing = await prisma.vendor.findFirst({
      where: {
        name: name,
        location: {
          latitude: {
            gte: lat - 0.0001,
            lte: lat + 0.0001,
          },
          longitude: {
            gte: lon - 0.0001,
            lte: lon + 0.0001,
          },
        },
      },
    });

    if (existing) {
      console.log(`   ℹ️  Already exists: ${name}`);
      return false;
    }

    // Extract area
    const area = getAreaFromCoordinates(lat, lon);
    const address = buildAddress(tags);

    // Create location
    const location = await prisma.location.create({
      data: {
        address: address,
        area: area,
        city: 'Bangalore',
        state: 'Karnataka',
        country: 'India',
        postalCode: tags['addr:postcode'] || '',
        latitude: lat,
        longitude: lon,
      },
    });

    // Create vendor
    const vendor = await prisma.vendor.create({
      data: {
        name: name,
        description: tags.description || tags.cuisine || `${tags.amenity || 'Restaurant'} in ${area}`,
        locationId: location.id,
        priceBand: estimatePriceBand(tags),
        popularityScore: calculatePopularityScore(tags),
        isVerified: false, // OSM data is community-contributed
        contactPhone: tags.phone || tags['contact:phone'],
        websiteUrl: tags.website || tags['contact:website'],
      },
    });

    // Create tags
    const cuisineTags = extractCuisineTags(tags.cuisine, tags.amenity);
    const dietaryTags = extractDietaryTags(tags);
    const featureTags = extractFeatureTags(tags);
    const vibeTags = tags.amenity === 'bar' || tags.amenity === 'pub' ? ['Bar'] : ['Casual'];

    const allTagNames = [...cuisineTags, ...dietaryTags, ...vibeTags, ...featureTags];

    for (const tagName of allTagNames) {
      let tag = await prisma.tag.findFirst({ where: { name: tagName } });

      if (!tag) {
        let category: 'CUISINE' | 'DIETARY' | 'VIBE' | 'FEATURE' = 'FEATURE';
        if (cuisineTags.includes(tagName)) category = 'CUISINE';
        else if (dietaryTags.includes(tagName)) category = 'DIETARY';
        else if (vibeTags.includes(tagName)) category = 'VIBE';

        tag = await prisma.tag.create({
          data: { name: tagName, category },
        });
      }

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
    const hours = parseOpeningHours(tags.opening_hours);
    if (hours) {
      await prisma.vendorOperationalInfo.create({
        data: {
          vendorId: vendor.id,
          openingHours: hours,
          acceptsReservations: false,
          paymentMethods: [],
        },
      });
    }

    console.log(`   ✅ Saved: ${name} (${area})`);
    return true;
  } catch (error: any) {
    console.error(`   ❌ Error saving:`, error.message);
    return false;
  }
}

// Clear database
async function clearDatabase() {
  console.log('🗑️  Clearing existing database...\n');

  // Delete in correct order to avoid foreign key constraints
  try {
    await prisma.vendorOperationalInfo.deleteMany();
    await prisma.menuItem.deleteMany();
    await prisma.review.deleteMany();
    await prisma.visit.deleteMany();
    await prisma.vendor.deleteMany(); // This should cascade delete vendor-tag relations
    await prisma.location.deleteMany();
    await prisma.tag.deleteMany();

    console.log('✅ Database cleared!\n');
    console.log('─'.repeat(80));
  } catch (error: any) {
    console.error('⚠️  Error clearing database:', error.message);
    console.log('Continuing anyway...\n');
  }
}

// Main scraping function
async function scrapeOpenStreetMap() {
  console.log('🚀 Starting OpenStreetMap Restaurant Scraper\n');
  console.log('✅ 100% FREE - No API key needed!\n');
  console.log('─'.repeat(80));

  let totalPlaces = 0;
  let savedPlaces = 0;

  for (const area of BANGALORE_AREAS) {
    const places = await fetchRestaurants(area.name, area.bbox);
    totalPlaces += places.length;

    for (const place of places) {
      const saved = await saveRestaurant(place);
      if (saved) savedPlaces++;

      // Small delay to be nice to database
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  console.log('\n' + '─'.repeat(80));
  console.log(`\n✅ Scraping Complete!\n`);
  console.log(`📊 Summary:`);
  console.log(`   Areas searched: ${BANGALORE_AREAS.length}`);
  console.log(`   Places found: ${totalPlaces}`);
  console.log(`   Restaurants saved: ${savedPlaces}`);
  console.log(`\n🎉 Database populated with REAL OpenStreetMap data!\n`);
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  const skipClear = args.includes('--skip-clear');

  try {
    if (!skipClear) {
      await clearDatabase();
    }

    await scrapeOpenStreetMap();
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
