import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface GoogleVendorData {
  place_id: string;
  name: string;
  lat: number;
  lng: number;
  rating: number | null;
  ratings_total: number | null;
  address: string;
  area: string;
  types: string[];
  google_maps_url: string;
  phone: string | null;
  website: string | null;
  price_level: number | null;
  hours: string[] | null;
}

function parseOpeningHours(hours: string[] | null): Record<string, string> | null {
  if (!hours || hours.length === 0) return null;

  const hoursMap: Record<string, string> = {};
  const dayMap: Record<string, string> = {
    Monday: 'monday',
    Tuesday: 'tuesday',
    Wednesday: 'wednesday',
    Thursday: 'thursday',
    Friday: 'friday',
    Saturday: 'saturday',
    Sunday: 'sunday',
  };

  for (const hourString of hours) {
    // Format: "Monday: 6:30 AM – 9:00 PM"
    const parts = hourString.split(':');
    if (parts.length < 2) continue;

    const day = parts[0].trim();
    const timeRange = parts.slice(1).join(':').trim();

    const dayKey = dayMap[day];
    if (dayKey) {
      // Convert "6:30 AM – 9:00 PM" to "06:30-21:00" format
      const convertedTime = convertTimeRange(timeRange);
      if (convertedTime) {
        hoursMap[dayKey] = convertedTime;
      }
    }
  }

  return Object.keys(hoursMap).length > 0 ? hoursMap : null;
}

function convertTimeRange(timeRange: string): string | null {
  try {
    // Handle closed days
    if (timeRange.toLowerCase().includes('closed')) {
      return 'Closed';
    }

    // Split by dash or en-dash
    const parts = timeRange.split(/–|—|-/).map((p) => p.trim());
    if (parts.length !== 2) return null;

    const startTime = convertTo24Hour(parts[0]);
    const endTime = convertTo24Hour(parts[1]);

    if (!startTime || !endTime) return null;

    return `${startTime}-${endTime}`;
  } catch (error) {
    console.error(`Error converting time range: ${timeRange}`, error);
    return null;
  }
}

function convertTo24Hour(time: string): string | null {
  try {
    // Remove extra spaces
    time = time.trim();

    // Extract AM/PM
    const isPM = time.toUpperCase().includes('PM');
    const isAM = time.toUpperCase().includes('AM');

    if (!isPM && !isAM) return null;

    // Remove AM/PM
    time = time.replace(/AM|PM/gi, '').trim();

    // Parse hours and minutes
    const parts = time.split(':');
    let hours = parseInt(parts[0]);
    const minutes = parts[1] ? parseInt(parts[1]) : 0;

    // Convert to 24-hour format
    if (isPM && hours !== 12) {
      hours += 12;
    } else if (isAM && hours === 12) {
      hours = 0;
    }

    // Format as HH:MM
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  } catch (error) {
    console.error(`Error converting time: ${time}`, error);
    return null;
  }
}

function mapPriceLevel(priceLevel: number | null): string | null {
  if (priceLevel === null) return null;

  switch (priceLevel) {
    case 1:
      return 'LOW';
    case 2:
      return 'MEDIUM';
    case 3:
      return 'HIGH';
    case 4:
      return 'PREMIUM';
    default:
      return null;
  }
}

function getCityFromAddress(address: string): string | null {
  // Try to extract city from address
  // Format: "..., Bengaluru, Karnataka ..."
  const parts = address.split(',');
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim();
    if (
      part.includes('Bengaluru') ||
      part.includes('Bangalore') ||
      part.includes('Mumbai') ||
      part.includes('Delhi') ||
      part.includes('Hyderabad') ||
      part.includes('Chennai') ||
      part.includes('Kolkata') ||
      part.includes('Pune')
    ) {
      return part;
    }
  }
  return null;
}

async function importVendors(jsonFilePath: string) {
  console.log(`Reading vendor data from ${jsonFilePath}...`);

  const fileContent = fs.readFileSync(jsonFilePath, 'utf-8');
  const vendors: GoogleVendorData[] = JSON.parse(fileContent);

  console.log(`Found ${vendors.length} vendors to import`);

  let imported = 0;
  let updated = 0;
  let errors = 0;
  let skipped = 0;

  for (const vendorData of vendors) {
    try {
      // Check if vendor already exists by name and approximate location
      // We check if a vendor with the same name exists within ~50 meters
      const existingVendor = await prisma.$queryRaw<any[]>`
        SELECT v.*, l.latitude, l.longitude
        FROM vendors v
        JOIN locations l ON v.location_id = l.id
        WHERE LOWER(v.name) = LOWER(${vendorData.name})
        AND ST_DWithin(
          ST_MakePoint(l.longitude, l.latitude)::geography,
          ST_MakePoint(${vendorData.lng}, ${vendorData.lat})::geography,
          50
        )
        LIMIT 1
      `;

      const existingRecord = existingVendor[0];

      if (existingRecord) {
        // Update existing vendor
        const location = await prisma.location.update({
          where: { id: existingRecord.location_id },
          data: {
            latitude: vendorData.lat,
            longitude: vendorData.lng,
            city: getCityFromAddress(vendorData.address),
            area: vendorData.area,
            fullAddress: vendorData.address,
          },
        });

        const priceBand = mapPriceLevel(vendorData.price_level);

        await prisma.vendor.update({
          where: { id: existingRecord.id },
          data: {
            name: vendorData.name,
            priceBand: priceBand as any,
            averageRating: vendorData.rating,
            totalRatings: vendorData.ratings_total,
          },
        });

        // Update or create operational info
        await prisma.vendorOperationalInfo.upsert({
          where: { vendorId: existingRecord.id },
          create: {
            vendorId: existingRecord.id,
            openingHours: parseOpeningHours(vendorData.hours),
            googleMapsUrl: vendorData.google_maps_url,
            contactPhone: vendorData.phone,
            websiteUrl: vendorData.website,
          },
          update: {
            openingHours: parseOpeningHours(vendorData.hours),
            googleMapsUrl: vendorData.google_maps_url,
            contactPhone: vendorData.phone,
            websiteUrl: vendorData.website,
          },
        });

        updated++;
      } else {
        // Create new location
        const location = await prisma.location.create({
          data: {
            latitude: vendorData.lat,
            longitude: vendorData.lng,
            city: getCityFromAddress(vendorData.address),
            area: vendorData.area,
            fullAddress: vendorData.address,
          },
        });

        const priceBand = mapPriceLevel(vendorData.price_level);

        // Create new vendor
        const newVendor = await prisma.vendor.create({
          data: {
            name: vendorData.name,
            locationId: location.id,
            priceBand: priceBand as any,
            averageRating: vendorData.rating,
            totalRatings: vendorData.ratings_total,
            status: 'ACTIVE',
          },
        });

        // Create operational info
        await prisma.vendorOperationalInfo.create({
          data: {
            vendorId: newVendor.id,
            openingHours: parseOpeningHours(vendorData.hours),
            googleMapsUrl: vendorData.google_maps_url,
            contactPhone: vendorData.phone,
            websiteUrl: vendorData.website,
          },
        });

        imported++;
      }

      // Log progress every 100 vendors
      if ((imported + updated) % 100 === 0) {
        console.log(
          `Progress: ${imported} imported, ${updated} updated, ${errors} errors`
        );
      }
    } catch (error) {
      console.error(`Error importing vendor ${vendorData.name}:`, error);
      errors++;
    }
  }

  console.log(`\n✅ Import complete!`);
  console.log(`   - Imported: ${imported}`);
  console.log(`   - Updated: ${updated}`);
  console.log(`   - Errors: ${errors}`);
}

// Main execution
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('❌ Please provide the path to the JSON file');
  console.error('Usage: npm run import-vendors <path-to-json-file>');
  process.exit(1);
}

const jsonFilePath = path.resolve(args[0]);

if (!fs.existsSync(jsonFilePath)) {
  console.error(`❌ File not found: ${jsonFilePath}`);
  process.exit(1);
}

importVendors(jsonFilePath)
  .then(() => {
    console.log('🎉 All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
