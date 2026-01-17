import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';

import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimiter';

// Import routes
import authRoutes from './modules/auth/auth.routes';
import usersRoutes from './modules/users/users.routes';
import vendorsRoutes from './modules/vendors/vendors.routes';
import postsRoutes from './modules/posts/posts.routes';
import commentsRoutes from './modules/comments/comments.routes';
import socialRoutes from './modules/social/social.routes';
import expeditionsRoutes from './modules/expeditions/expeditions.routes';
import ratingsRoutes from './modules/ratings/ratings.routes';
import bottlecapsRoutes from './modules/bottlecaps/bottlecaps.routes';
import uploadsRoutes from './modules/uploads/uploads.routes';
import notificationsRoutes from './modules/notifications/notifications.routes';
import adminRoutes from './modules/admin/admin.routes';

export function createApp(): Express {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors({
    origin: env.CORS_ORIGINS ? env.CORS_ORIGINS.split(',') : '*',
    credentials: true,
  }));

  // Request parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  
  // Compression
  app.use(compression());

  // Logging
  if (env.NODE_ENV !== 'test') {
    app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  }

  // Rate limiting
  app.use('/api/', apiLimiter);

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // API version prefix
  const apiV1 = express.Router();

  // Mount routes
  apiV1.use('/auth', authRoutes);
  apiV1.use('/users', usersRoutes);
  apiV1.use('/vendors', vendorsRoutes);
  apiV1.use('/posts', postsRoutes);
  apiV1.use('/comments', commentsRoutes);
  apiV1.use('/social', socialRoutes);
  apiV1.use('/expeditions', expeditionsRoutes);
  apiV1.use('/ratings', ratingsRoutes);
  apiV1.use('/caps', bottlecapsRoutes);
  apiV1.use('/uploads', uploadsRoutes);
  apiV1.use('/notifications', notificationsRoutes);
  apiV1.use('/admin', adminRoutes);

  app.use('/api/v1', apiV1);

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: 'Route not found',
    });
  });

  // Error handler
  app.use(errorHandler);

  return app;
}
