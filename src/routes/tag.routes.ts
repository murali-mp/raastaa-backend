import { Router, Request, Response } from 'express';
import { db } from '../config/database';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { serializeTag } from '../utils/serializers';
import { TagCategory } from '@prisma/client';

const router = Router();

/**
 * GET /api/v1/tags
 * List tags (optionally filter by category)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { category } = req.query;

    const where =
      typeof category === 'string' && category.length > 0
        ? {
            category: category.toUpperCase() as TagCategory,
          }
        : undefined;

    const tags = await db.tag.findMany({
      where,
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    });

    res.json({
      status: 'success',
      data: {
        tags: tags.map(serializeTag),
      },
    });
  } catch (error: unknown) {
    logger.error('Failed to fetch tags', { error });
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : 'Failed to fetch tags';
    res.status(statusCode).json({
      status: 'error',
      message,
    });
  }
});

export default router;
