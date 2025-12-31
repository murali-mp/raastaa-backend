import rateLimit from 'express-rate-limit';
import { redis } from '../config/redis';
import { TooManyRequestsError } from '../utils/errors';

/**
 * General API rate limiter
 */
export const apiRateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    throw new TooManyRequestsError('Too many requests, please try again later');
  },
});

/**
 * Strict rate limiter for auth endpoints
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many authentication attempts, please try again later',
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    throw new TooManyRequestsError('Too many login attempts, please try again later');
  },
});

/**
 * Redis-backed rate limiter (more scalable)
 * Falls back to no rate limiting if Redis is unavailable
 */
export const createRedisRateLimiter = (maxRequests: number, windowSeconds: number) => {
  return async (req: any, res: any, next: any) => {
    // If Redis is not available, skip rate limiting
    if (!redis) {
      return next();
    }

    const key = `ratelimit:${req.ip}:${req.path}`;

    try {
      const current = await redis.incr(key);
      
      if (current === 1) {
        await redis.expire(key, windowSeconds);
      }

      if (current > maxRequests) {
        throw new TooManyRequestsError('Rate limit exceeded');
      }

      next();
    } catch (error) {
      // If Redis fails, allow the request through
      next();
    }
  };
};
