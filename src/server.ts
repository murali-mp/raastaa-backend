import dotenv from 'dotenv';
dotenv.config();

import { createApp } from './app';
import { logger } from './utils/logger';
import { db } from './config/database';
import { redis } from './config/redis';

const PORT = parseInt(process.env.API_PORT || '3000', 10);
const HOST = process.env.API_HOST || 'localhost';

const startServer = async () => {
  try {
    // Test database connection
    await db.$connect();
    logger.info('✓ Database connected');

    // Test Redis connection (optional)
    if (redis) {
      await redis.ping();
      logger.info('✓ Redis connected');
    } else {
      logger.info('⚠ Redis not configured - caching disabled');
    }

    // Create Express app
    const app = createApp();

    // Start server
    const server = app.listen(PORT, HOST, () => {
      logger.info(`✓ Server running on http://${HOST}:${PORT}`);
      logger.info(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`✓ Health check: http://${HOST}:${PORT}/health`);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);

      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          await db.$disconnect();
          logger.info('Database disconnected');

          if (redis) {
            await redis.quit();
            logger.info('Redis disconnected');
          }

          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
