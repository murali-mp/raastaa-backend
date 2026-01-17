import Redis from 'ioredis';
import { env, isDev } from './env';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => {
    if (times > 3) {
      console.error('❌ Redis connection failed after 3 retries');
      return null;
    }
    return Math.min(times * 100, 2000);
  },
  lazyConnect: true,
});

redis.on('error', (err) => {
  console.error('❌ Redis Client Error:', err.message);
});

redis.on('connect', () => {
  console.log('✅ Redis connected');
});

redis.on('ready', () => {
  if (isDev) console.log('🟢 Redis ready');
});

redis.on('close', () => {
  console.log('📤 Redis connection closed');
});

export async function connectRedis(): Promise<void> {
  try {
    await redis.connect();
  } catch (error) {
    console.error('❌ Redis connection failed:', error);
    throw error;
  }
}

export async function disconnectRedis(): Promise<void> {
  await redis.quit();
}

// Helper functions for common Redis operations
export const redisHelpers = {
  // Cache with TTL
  async cached<T>(key: string, ttlSeconds: number, fn: () => Promise<T>): Promise<T> {
    const cached = await redis.get(key);
    if (cached) {
      return JSON.parse(cached) as T;
    }
    const data = await fn();
    await redis.setex(key, ttlSeconds, JSON.stringify(data));
    return data;
  },

  // Invalidate cache
  async invalidate(pattern: string): Promise<void> {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  },

  // Rate limiting helper
  async checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<{ allowed: boolean; remaining: number }> {
    const current = await redis.incr(key);
    if (current === 1) {
      await redis.expire(key, windowSeconds);
    }
    return {
      allowed: current <= limit,
      remaining: Math.max(0, limit - current),
    };
  },

  // Geo operations for vendor locations
  async geoAdd(key: string, longitude: number, latitude: number, member: string): Promise<number> {
    return redis.geoadd(key, longitude, latitude, member);
  },

  async geoRadius(key: string, longitude: number, latitude: number, radius: number, unit: 'km' | 'm' = 'm'): Promise<string[]> {
    return redis.georadius(key, longitude, latitude, radius, unit, 'WITHDIST', 'WITHCOORD', 'ASC') as unknown as string[];
  },

  async geoPos(key: string, member: string): Promise<[string, string] | null> {
    const result = await redis.geopos(key, member);
    return result[0] as [string, string] | null;
  },
};
