import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

// Singleton Prisma Client instance
let prisma: PrismaClient;

export const getPrismaClient = (): PrismaClient => {
  if (!prisma) {
    prisma = new PrismaClient({
      log: [
        { level: 'warn', emit: 'event' },
        { level: 'error', emit: 'event' },
      ],
    });

    // Log warnings and errors
    prisma.$on('warn' as never, (e: any) => {
      logger.warn('Prisma warning:', e);
    });

    prisma.$on('error' as never, (e: any) => {
      logger.error('Prisma error:', e);
    });

    // Handle graceful shutdown
    process.on('beforeExit', async () => {
      await prisma.$disconnect();
    });
  }

  return prisma;
};

export const db = getPrismaClient();
