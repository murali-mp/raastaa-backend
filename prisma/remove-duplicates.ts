import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Remove duplicate restaurants from the database
 *
 * Strategy:
 * 1. Find all vendors with the same name in the same area
 * 2. For each duplicate group, keep the one with:
 *    - Highest popularity score (primary)
 *    - OR earliest creation date (secondary)
 * 3. Delete all other duplicates
 */

interface DuplicateGroup {
  name: string;
  area: string;
  vendors: Array<{
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    area: string;
    popularityScore: number;
    createdAt: Date;
    hasOperationalInfo: boolean;
    hasMenuItems: boolean;
    tagCount: number;
  }>;
}

async function findDuplicateGroups(): Promise<DuplicateGroup[]> {
  console.log('🔍 Finding duplicate restaurants...\n');

  // Find names that appear multiple times
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

  console.log(`Found ${nameGroups.length} restaurant names with potential duplicates\n`);

  const duplicateGroups: DuplicateGroup[] = [];

  for (const nameGroup of nameGroups) {
    const vendors = await prisma.vendor.findMany({
      where: {
        name: nameGroup.name,
      },
      include: {
        location: true,
        operationalInfo: true,
        menuItems: true,
        tags: true,
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

    // Find duplicates in same area
    for (const [area, vendorsInArea] of areaGroups) {
      if (vendorsInArea.length > 1) {
        duplicateGroups.push({
          name: nameGroup.name,
          area,
          vendors: vendorsInArea.map(v => ({
            id: v.id,
            name: v.name,
            latitude: v.location.latitude,
            longitude: v.location.longitude,
            area: v.location.area,
            popularityScore: v.popularityScore,
            createdAt: v.createdAt,
            hasOperationalInfo: !!v.operationalInfo,
            hasMenuItems: v.menuItems.length > 0,
            tagCount: v.tags.length,
          })),
        });
      }
    }
  }

  return duplicateGroups;
}

async function removeDuplicates(dryRun: boolean = true) {
  console.log(`🧹 Starting duplicate removal (DRY RUN: ${dryRun})...\n`);

  const duplicateGroups = await findDuplicateGroups();

  if (duplicateGroups.length === 0) {
    console.log('✅ No duplicates found! Database is clean.\n');
    return;
  }

  console.log(`Found ${duplicateGroups.length} duplicate groups to clean\n`);

  let totalDeleted = 0;
  const deletionPlan: Array<{ id: string; name: string; area: string; reason: string }> = [];

  for (const group of duplicateGroups) {
    // Sort to determine which one to keep
    // Priority: 1) Highest popularity, 2) Has operational info, 3) Has menu items, 4) Most tags, 5) Earliest creation
    const sorted = [...group.vendors].sort((a, b) => {
      // 1. Popularity score (descending)
      if (a.popularityScore !== b.popularityScore) {
        return b.popularityScore - a.popularityScore;
      }
      // 2. Has operational info
      if (a.hasOperationalInfo !== b.hasOperationalInfo) {
        return a.hasOperationalInfo ? -1 : 1;
      }
      // 3. Has menu items
      if (a.hasMenuItems !== b.hasMenuItems) {
        return a.hasMenuItems ? -1 : 1;
      }
      // 4. Tag count (descending)
      if (a.tagCount !== b.tagCount) {
        return b.tagCount - a.tagCount;
      }
      // 5. Creation date (ascending - keep older)
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    const toKeep = sorted[0];
    const toDelete = sorted.slice(1);

    console.log(`📦 Group: "${group.name}" in ${group.area}`);
    console.log(`   ✅ KEEPING: ID ${toKeep.id.substring(0, 8)}... | Score: ${toKeep.popularityScore} | OpInfo: ${toKeep.hasOperationalInfo} | Menu: ${toKeep.hasMenuItems} | Tags: ${toKeep.tagCount}`);

    for (const vendor of toDelete) {
      console.log(`   ❌ DELETING: ID ${vendor.id.substring(0, 8)}... | Score: ${vendor.popularityScore} | OpInfo: ${vendor.hasOperationalInfo} | Menu: ${vendor.hasMenuItems} | Tags: ${vendor.tagCount}`);
      deletionPlan.push({
        id: vendor.id,
        name: vendor.name,
        area: vendor.area,
        reason: `Duplicate of ${toKeep.id.substring(0, 8)}... (lower priority)`,
      });
      totalDeleted++;
    }
    console.log();
  }

  console.log(`\n📊 DELETION SUMMARY:\n`);
  console.log(`Total duplicate groups: ${duplicateGroups.length}`);
  console.log(`Records to delete: ${totalDeleted}`);
  console.log(`Records to keep: ${duplicateGroups.length}`);

  if (dryRun) {
    console.log('\n⚠️  DRY RUN - No changes made to database');
    console.log('Run with dryRun=false to actually delete duplicates\n');
    return { deletionPlan, totalDeleted };
  }

  // Actually delete the duplicates
  console.log('\n🗑️  Deleting duplicates...\n');

  let deleted = 0;
  for (const item of deletionPlan) {
    try {
      // Delete the vendor (cascading delete will handle related records)
      await prisma.vendor.delete({ where: { id: item.id } });

      deleted++;
      if (deleted % 10 === 0) {
        console.log(`   Deleted ${deleted}/${totalDeleted}...`);
      }
    } catch (error) {
      console.error(`   ❌ Failed to delete ${item.name} (${item.id}):`, error);
    }
  }

  console.log(`\n✅ Successfully deleted ${deleted} duplicate restaurants!\n`);

  // Verify final count
  const finalCount = await prisma.vendor.count();
  console.log(`📊 Final database count: ${finalCount} restaurants\n`);

  return { deletionPlan, totalDeleted: deleted };
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--confirm');

  if (dryRun) {
    console.log('🔍 Running in DRY RUN mode (no changes will be made)\n');
    console.log('To actually delete duplicates, run: npm run deduplicate -- --confirm\n');
    console.log('─'.repeat(80) + '\n');
  } else {
    console.log('⚠️  RUNNING IN DELETE MODE - This will permanently remove duplicates!\n');
    console.log('─'.repeat(80) + '\n');
  }

  try {
    await removeDuplicates(dryRun);
  } catch (error) {
    console.error('❌ Error removing duplicates:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
