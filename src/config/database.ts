import { PrismaClient, Prisma } from '@prisma/client';
import { logger } from '../utils/logger';

const createPrismaClient = () =>
  new PrismaClient({
    log: [
      { level: 'warn', emit: 'event' },
      { level: 'error', emit: 'event' },
    ],
  });

type PrismaClientWithEvents = ReturnType<typeof createPrismaClient>;

// Singleton Prisma Client instance
let prisma: PrismaClientWithEvents | undefined;

export const getPrismaClient = (): PrismaClientWithEvents => {
  if (!prisma) {
    prisma = createPrismaClient();

    // Log warnings and errors
    prisma.$on('warn', (e: Prisma.LogEvent) => {
      logger.warn('Prisma warning:', e);
    });

    prisma.$on('error', (e: Prisma.LogEvent) => {
      logger.error('Prisma error:', e);
    });

    // Handle graceful shutdown
    const client = prisma;
    process.on('beforeExit', async () => {
      await client.$disconnect();
    });
  }

  return prisma;
};

export const db = getPrismaClient();
