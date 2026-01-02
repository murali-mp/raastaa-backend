import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Remove area suffixes from vendor names
 *
 * Examples:
 * - "The Black Pearl - HSR" → "The Black Pearl"
 * - "Cafe Coffee Day - RR Nagar" → "Cafe Coffee Day"
 * - "Royal Delight House - Jayanagar" → "Royal Delight House"
 */

async function cleanupVendorNames(dryRun: boolean = true) {
  console.log(`🧹 Cleaning up vendor names (DRY RUN: ${dryRun})...\n`);

  // Get all vendors
  const vendors = await prisma.vendor.findMany({
    include: {
      location: true,
    },
  });

  console.log(`Found ${vendors.length} vendors to check\n`);

  const updates: Array<{
    id: string;
    oldName: string;
    newName: string;
    area: string;
  }> = [];

  // Pattern to match area suffixes
  // Matches: " - AreaName", " -AreaName", "- AreaName", "-AreaName"
  const areaSuffixPattern = /\s*-\s*[A-Za-z\s]+$/;

  for (const vendor of vendors) {
    const match = vendor.name.match(areaSuffixPattern);

    if (match) {
      const suffix = match[0].trim();
      const newName = vendor.name.replace(areaSuffixPattern, '').trim();

      // Only update if the name actually changes
      if (newName !== vendor.name && newName.length > 0) {
        updates.push({
          id: vendor.id,
          oldName: vendor.name,
          newName,
          area: vendor.location.area,
        });
      }
    }
  }

  console.log(`Found ${updates.length} vendor names to clean\n`);

  if (updates.length === 0) {
    console.log('✅ No vendor names need cleaning!\n');
    return;
  }

  // Show first 20 examples
  console.log('Examples of changes:\n');
  for (let i = 0; i < Math.min(updates.length, 20); i++) {
    const update = updates[i];
    console.log(`${i + 1}. "${update.oldName}"`);
    console.log(`   → "${update.newName}"`);
    console.log(`   Area: ${update.area}\n`);
  }

  if (updates.length > 20) {
    console.log(`... and ${updates.length - 20} more\n`);
  }

  console.log(`\n📊 SUMMARY:\n`);
  console.log(`Total vendors: ${vendors.length}`);
  console.log(`Names to clean: ${updates.length}`);

  if (dryRun) {
    console.log('\n⚠️  DRY RUN - No changes made to database');
    console.log('Run with --confirm to actually update names\n');
    return { updates };
  }

  // Actually update the names
  console.log('\n📝 Updating vendor names...\n');

  let updated = 0;
  for (const item of updates) {
    try {
      await prisma.vendor.update({
        where: { id: item.id },
        data: { name: item.newName },
      });

      updated++;
      if (updated % 50 === 0) {
        console.log(`   Updated ${updated}/${updates.length}...`);
      }
    } catch (error) {
      console.error(`   ❌ Failed to update ${item.oldName}:`, error);
    }
  }

  console.log(`\n✅ Successfully updated ${updated} vendor names!\n`);

  return { updates, updated };
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--confirm');

  if (dryRun) {
    console.log('🔍 Running in DRY RUN mode (no changes will be made)\n');
    console.log('To actually update names, run: npm run cleanup-names -- --confirm\n');
    console.log('─'.repeat(80) + '\n');
  } else {
    console.log('⚠️  RUNNING IN UPDATE MODE - This will modify vendor names!\n');
    console.log('─'.repeat(80) + '\n');
  }

  try {
    await cleanupVendorNames(dryRun);
  } catch (error) {
    console.error('❌ Error cleaning names:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
