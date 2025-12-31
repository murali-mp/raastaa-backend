import Redis from 'ioredis';
import { logger } from '../utils/logger';

let redisClient: Redis;

export const getRedisClient = (): Redis => {
  if (!redisClient) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    redisClient.on('connect', () => {
      logger.info('Redis connected successfully');
    });

    redisClient.on('error', (err) => {
      logger.error('Redis connection error:', err);
    });

    // Handle graceful shutdown
    process.on('beforeExit', async () => {
      await redisClient.quit();
    });
  }

  return redisClient;
};

export const redis = getRedisClient();
