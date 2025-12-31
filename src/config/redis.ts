import Redis from 'ioredis';
import { logger } from '../utils/logger';

let redisClient: Redis | null = null;

export const getRedisClient = (): Redis | null => {
  if (redisClient !== null) {
    return redisClient;
  }

  const redisUrl = process.env.REDIS_URL;
  
  // If no REDIS_URL is provided, Redis is optional
  if (!redisUrl) {
    logger.warn('REDIS_URL not configured - Redis features disabled');
    return null;
  }

  try {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) {
          logger.error('Redis connection failed after 3 retries - disabling Redis');
          return null; // Stop retrying
        }
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      lazyConnect: true, // Don't connect immediately
    });

    redisClient.on('connect', () => {
      logger.info('Redis connected successfully');
    });

    redisClient.on('error', (err) => {
      logger.error('Redis connection error:', err.message);
    });

    // Try to connect
    redisClient.connect().catch((err) => {
      logger.error('Failed to connect to Redis:', err.message);
      redisClient = null;
    });

    // Handle graceful shutdown
    process.on('beforeExit', async () => {
      if (redisClient) {
        await redisClient.quit();
      }
    });

    return redisClient;
  } catch (error) {
    logger.error('Redis initialization error:', error);
    return null;
  }
};

export const redis = getRedisClient();
