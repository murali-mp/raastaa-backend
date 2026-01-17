import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  // Server
  PORT: z.string().default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Redis
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),

  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),

  // Digital Ocean Spaces
  DO_SPACES_KEY: z.string().min(1, 'DO_SPACES_KEY is required'),
  DO_SPACES_SECRET: z.string().min(1, 'DO_SPACES_SECRET is required'),
  DO_SPACES_BUCKET: z.string().default('raastaa'),
  DO_SPACES_ENDPOINT: z.string().default('blr1.digitaloceanspaces.com'),
  DO_SPACES_CDN_ENDPOINT: z.string().optional(),

  // Discord
  DISCORD_ADMIN_WEBHOOK: z.string().url().optional(),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().default('60000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100'),
  RATE_LIMIT_MAX_AUTH_REQUESTS: z.string().default('10'),

  // App
  APP_NAME: z.string().default('Raastaa'),
  APP_URL: z.string().default('http://localhost:3000'),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export const isProd = env.NODE_ENV === 'production';
export const isDev = env.NODE_ENV === 'development';
export const isTest = env.NODE_ENV === 'test';
