import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create tags
  console.log('Creating tags...');
  const cuisineTags = [
    'South Indian',
    'North Indian',
    'Chinese',
    'Italian',
    'Street Food',
    'Bakery',
    'Cafe',
    'Fast Food',
  ];

  const vibeTags = [
    'Casual',
    'Romantic',
    'Family-Friendly',
    'Trendy',
    'Cozy',
  ];

  const featureTags = [
    'Outdoor Seating',
    'WiFi',
    'Parking',
    'Live Music',
    'Pet-Friendly',
    'Takeaway',
    'Home Delivery',
  ];

  const dietaryTags = [
    'Vegetarian',
    'Vegan',
    'Gluten-Free',
    'Halal',
    'Jain',
  ];

  const tagPromises = [
    ...cuisineTags.map(name => 
      prisma.tag.upsert({
        where: { name },
        update: {},
        create: { name, category: 'CUISINE' },
      })
    ),
    ...vibeTags.map(name =>
      prisma.tag.upsert({
        where: { name },
        update: {},
        create: { name, category: 'VIBE' },
      })
    ),
    ...featureTags.map(name =>
      prisma.tag.upsert({
        where: { name },
        update: {},
        create: { name, category: 'FEATURE' },
      })
    ),
    ...dietaryTags.map(name =>
      prisma.tag.upsert({
        where: { name },
        update: {},
        create: { name, category: 'DIETARY' },
      })
    ),
  ];

  await Promise.all(tagPromises);
  console.log('✓ Tags created');

  // Create sample vendors (Bangalore locations)
  console.log('Creating sample vendors...');

  const brahminsCoffeeBarLocation = await prisma.location.create({
    data: {
      latitude: 12.9416,
      longitude: 77.5612,
      city: 'Bangalore',
      area: 'Basavanagudi',
      fullAddress: 'Basavanagudi, Bangalore, Karnataka 560004',
    },
  });

  const brahminsCoffeeBar = await prisma.vendor.create({
    data: {
      locationId: brahminsCoffeeBarLocation.id,
      name: "Brahmins' Coffee Bar",
      description: 'Iconic Bangalore breakfast spot serving authentic South Indian food since 1965',
      priceBand: 'LOW',
      isVerified: true,
      popularityScore: 95.5,
      status: 'ACTIVE',
    },
  });

  // Add operational info
  await prisma.vendorOperationalInfo.create({
    data: {
      vendorId: brahminsCoffeeBar.id,
      openingHours: {
        monday: '06:30-11:00, 16:00-20:00',
        tuesday: '06:30-11:00, 16:00-20:00',
        wednesday: '06:30-11:00, 16:00-20:00',
        thursday: '06:30-11:00, 16:00-20:00',
        friday: '06:30-11:00, 16:00-20:00',
        saturday: '06:30-11:00, 16:00-20:00',
        sunday: '06:30-11:00, 16:00-20:00',
      },
      contactPhone: '+91-80-2661-0588',
    },
  });

  // Add tags
  const southIndianTag = await prisma.tag.findUnique({ where: { name: 'South Indian' } });
  const casualTag = await prisma.tag.findUnique({ where: { name: 'Casual' } });
  const vegetarianTag = await prisma.tag.findUnique({ where: { name: 'Vegetarian' } });

  if (southIndianTag && casualTag && vegetarianTag) {
    await prisma.vendorTag.createMany({
      data: [
        { vendorId: brahminsCoffeeBar.id, tagId: southIndianTag.id },
        { vendorId: brahminsCoffeeBar.id, tagId: casualTag.id },
        { vendorId: brahminsCoffeeBar.id, tagId: vegetarianTag.id },
      ],
    });
  }

  // Add menu items
  await prisma.menuItem.createMany({
    data: [
      {
        vendorId: brahminsCoffeeBar.id,
        name: 'Masala Dosa',
        description: 'Crispy dosa with potato filling',
        priceMin: 45,
        priceMax: 45,
        currency: 'INR',
        sortOrder: 1,
      },
      {
        vendorId: brahminsCoffeeBar.id,
        name: 'Filter Coffee',
        description: 'Traditional South Indian filter coffee',
        priceMin: 20,
        priceMax: 20,
        currency: 'INR',
        sortOrder: 2,
      },
    ],
  });

  console.log('✓ Sample vendors created');

  // Create challenges
  console.log('Creating challenges...');

  await prisma.challenge.createMany({
    data: [
      {
        title: 'First Foodie',
        description: 'Visit 5 different places',
        challengeType: 'VISIT_COUNT',
        targetCount: 5,
        rewardPoints: 100,
        isActive: true,
      },
      {
        title: 'Review Master',
        description: 'Write 3 reviews',
        challengeType: 'REVIEW_COUNT',
        targetCount: 3,
        rewardPoints: 150,
        isActive: true,
      },
      {
        title: 'Explorer',
        description: 'Try 3 different cuisine types',
        challengeType: 'TAG_EXPLORER',
        targetCount: 3,
        rewardPoints: 200,
        isActive: true,
      },
    ],
  });

  console.log('✓ Challenges created');

  console.log('✅ Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
