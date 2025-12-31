import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { stream } from './utils/logger';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';
import { apiRateLimiter } from './middlewares/rateLimit.middleware';

// Import routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import vendorRoutes from './routes/vendor.routes';
import walletRoutes from './routes/wallet.routes';
import challengeRoutes from './routes/challenge.routes';
import postRoutes from './routes/post.routes';
import tagRoutes from './routes/tag.routes';
import visitRoutes from './routes/visit.routes';

export const createApp = (): Application => {
  const app = express();

  // Security middleware
  app.use(helmet());

  // CORS configuration
  const corsOrigins = process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'];
  app.use(
    cors({
      origin: corsOrigins,
      credentials: true,
    })
  );

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Compression
  app.use(compression());

  // HTTP request logging
  app.use(morgan('combined', { stream }));

  // Health check endpoint (no rate limiting)
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    });
  });

  // Apply rate limiting to all API routes
  app.use('/api/', apiRateLimiter);

  // API Routes
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/users', userRoutes);
  app.use('/api/v1/vendors', vendorRoutes);
  app.use('/api/v1/wallet', walletRoutes);
  app.use('/api/v1/challenges', challengeRoutes);
  app.use('/api/v1/posts', postRoutes);
  app.use('/api/v1/tags', tagRoutes);
  app.use('/api/v1/visits', visitRoutes);
  // 404 handler
  app.use(notFoundHandler);

  // Global error handler (must be last)
  app.use(errorHandler);

  return app;
};
