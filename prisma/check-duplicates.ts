import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface DuplicateGroup {
  name: string;
  area: string;
  count: number;
  vendors: Array<{
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    area: string;
    address: string;
    popularityScore: number;
    createdAt: Date;
  }>;
}

async function checkDuplicates() {
  console.log('🔍 Checking for duplicate restaurants in the database...\n');

  // Method 1: Find duplicates by exact name match
  console.log('📋 Method 1: Checking for exact name duplicates...');
  const nameGroups = await prisma.vendor.groupBy({
    by: ['name'],
    _count: {
      name: true,
    },
    having: {
      name: {
        _count: {
          gt: 1,
        },
      },
    },
  });

  console.log(`Found ${nameGroups.length} restaurant names with duplicates\n`);

  if (nameGroups.length > 0) {
    console.log('Duplicate names found:');
    for (const group of nameGroups.slice(0, 10)) {
      console.log(`  - "${group.name}" appears ${group._count.name} times`);
    }
    if (nameGroups.length > 10) {
      console.log(`  ... and ${nameGroups.length - 10} more`);
    }
    console.log();
  }

  // Method 2: Find duplicates by name AND location (same area)
  console.log('📍 Method 2: Checking for name + area duplicates...');
  const duplicateGroups: DuplicateGroup[] = [];

  for (const nameGroup of nameGroups) {
    const vendors = await prisma.vendor.findMany({
      where: {
        name: nameGroup.name,
      },
      include: {
        location: true,
      },
    });

    // Group by area
    const areaGroups = new Map<string, typeof vendors>();
    for (const vendor of vendors) {
      const area = vendor.location.area;
      if (!areaGroups.has(area)) {
        areaGroups.set(area, []);
      }
      areaGroups.get(area)!.push(vendor);
    }

    // Check for duplicates in same area
    for (const [area, vendorsInArea] of areaGroups) {
      if (vendorsInArea.length > 1) {
        duplicateGroups.push({
          name: nameGroup.name,
          area,
          count: vendorsInArea.length,
          vendors: vendorsInArea.map(v => ({
            id: v.id,
            name: v.name,
            latitude: v.location.latitude,
            longitude: v.location.longitude,
            area: v.location.area,
            address: v.location.fullAddress,
            popularityScore: v.popularityScore,
            createdAt: v.createdAt,
          })),
        });
      }
    }
  }

  console.log(`Found ${duplicateGroups.length} duplicate groups (same name + area)\n`);

  if (duplicateGroups.length > 0) {
    console.log('Detailed duplicate analysis:\n');
    for (let i = 0; i < Math.min(duplicateGroups.length, 20); i++) {
      const group = duplicateGroups[i];
      console.log(`${i + 1}. "${group.name}" in ${group.area} - ${group.count} duplicates:`);
      for (const vendor of group.vendors) {
        console.log(`   • ID: ${vendor.id.substring(0, 8)}... | Location: ${vendor.latitude.toFixed(4)}, ${vendor.longitude.toFixed(4)} | Score: ${vendor.popularityScore} | Created: ${vendor.createdAt.toISOString().split('T')[0]}`);
        console.log(`     Address: ${vendor.address}`);
      }
      console.log();
    }
    if (duplicateGroups.length > 20) {
      console.log(`... and ${duplicateGroups.length - 20} more duplicate groups\n`);
    }
  }

  // Method 3: Find duplicates by very close coordinates (within ~10 meters)
  console.log('🎯 Method 3: Checking for location-based duplicates (same coordinates)...');

  const allVendors = await prisma.vendor.findMany({
    include: {
      location: true,
    },
  });

  const locationDuplicates: Array<{
    vendors: typeof allVendors;
    lat: number;
    lng: number;
  }> = [];

  // Group by rounded coordinates (to 4 decimal places ~11 meters)
  const coordGroups = new Map<string, typeof allVendors>();
  for (const vendor of allVendors) {
    const lat = Math.round(vendor.location.latitude * 10000) / 10000;
    const lng = Math.round(vendor.location.longitude * 10000) / 10000;
    const key = `${lat},${lng}`;

    if (!coordGroups.has(key)) {
      coordGroups.set(key, []);
    }
    coordGroups.get(key)!.push(vendor);
  }

  for (const [key, vendors] of coordGroups) {
    if (vendors.length > 1) {
      const [lat, lng] = key.split(',').map(Number);
      locationDuplicates.push({ vendors, lat, lng });
    }
  }

  console.log(`Found ${locationDuplicates.length} locations with multiple restaurants at same coordinates\n`);

  if (locationDuplicates.length > 0) {
    console.log('Locations with multiple restaurants:');
    for (let i = 0; i < Math.min(locationDuplicates.length, 10); i++) {
      const loc = locationDuplicates[i];
      console.log(`  ${i + 1}. ${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)} - ${loc.vendors.length} restaurants:`);
      for (const v of loc.vendors.slice(0, 3)) {
        console.log(`     - ${v.name} (${v.location.area})`);
      }
      if (loc.vendors.length > 3) {
        console.log(`     ... and ${loc.vendors.length - 3} more`);
      }
    }
    if (locationDuplicates.length > 10) {
      console.log(`  ... and ${locationDuplicates.length - 10} more locations`);
    }
    console.log();
  }

  // Summary statistics
  console.log('📊 SUMMARY:\n');
  console.log(`Total restaurants in database: ${allVendors.length}`);
  console.log(`Duplicate name groups: ${nameGroups.length}`);
  console.log(`Duplicate name + area groups: ${duplicateGroups.length}`);
  console.log(`Locations with multiple restaurants: ${locationDuplicates.length}`);

  const totalDuplicateVendors = duplicateGroups.reduce((sum, g) => sum + g.count - 1, 0);
  console.log(`\nEstimated duplicate records to clean: ${totalDuplicateVendors}`);
  console.log(`Database after cleanup: ~${allVendors.length - totalDuplicateVendors} restaurants`);

  return {
    nameGroups,
    duplicateGroups,
    locationDuplicates,
    totalDuplicateVendors,
  };
}

async function main() {
  try {
    await checkDuplicates();
  } catch (error) {
    console.error('❌ Error checking duplicates:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
