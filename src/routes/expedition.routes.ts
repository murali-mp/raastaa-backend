import { Router, Request, Response } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { expeditionService } from '../services/expedition.service';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

const router = Router();

/**
 * POST /api/v1/expeditions
 * Create a new expedition
 */
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ status: 'error', message: 'Authentication required' });
    }

    const { name, expeditionType, vendorIds, targetDate, notes } = req.body;

    const expedition = await expeditionService.createExpedition({
      userId,
      name,
      expeditionType: expeditionType?.toUpperCase().replace(/ /g, '_') || 'CUSTOM',
      vendorIds,
      targetDate: targetDate ? new Date(targetDate) : undefined,
      notes,
    });

    res.status(201).json({
      status: 'success',
      data: expedition,
    });
  } catch (error: unknown) {
    logger.error('Failed to create expedition', { error });
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : 'Failed to create expedition';
    res.status(statusCode).json({ status: 'error', message });
  }
});

/**
 * GET /api/v1/expeditions
 * Get user's expeditions
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ status: 'error', message: 'Authentication required' });
    }

    const { status } = req.query;
    const validStatus = status === 'ACTIVE' || status === 'COMPLETED' || status === 'CANCELLED'
      ? status
      : undefined;

    const expeditions = await expeditionService.getUserExpeditions(userId, validStatus as any);

    res.json({
      status: 'success',
      data: { expeditions },
    });
  } catch (error: unknown) {
    logger.error('Failed to fetch expeditions', { error });
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : 'Failed to fetch expeditions';
    res.status(statusCode).json({ status: 'error', message });
  }
});

/**
 * GET /api/v1/expeditions/:id
 * Get a single expedition
 */
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ status: 'error', message: 'Authentication required' });
    }

    const expedition = await expeditionService.getExpedition(req.params.id, userId);

    res.json({
      status: 'success',
      data: expedition,
    });
  } catch (error: unknown) {
    logger.error('Failed to fetch expedition', { error });
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : 'Failed to fetch expedition';
    res.status(statusCode).json({ status: 'error', message });
  }
});

/**
 * POST /api/v1/expeditions/:id/visit/:vendorId
 * Mark a stop as visited
 */
router.post('/:id/visit/:vendorId', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ status: 'error', message: 'Authentication required' });
    }

    const result = await expeditionService.markStopVisited(
      req.params.id,
      req.params.vendorId,
      userId
    );

    res.json({
      status: 'success',
      data: result,
    });
  } catch (error: unknown) {
    logger.error('Failed to mark stop visited', { error });
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : 'Failed to mark stop visited';
    res.status(statusCode).json({ status: 'error', message });
  }
});

/**
 * DELETE /api/v1/expeditions/:id
 * Cancel an expedition
 */
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ status: 'error', message: 'Authentication required' });
    }

    const result = await expeditionService.cancelExpedition(req.params.id, userId);

    res.json({
      status: 'success',
      data: result,
    });
  } catch (error: unknown) {
    logger.error('Failed to cancel expedition', { error });
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : 'Failed to cancel expedition';
    res.status(statusCode).json({ status: 'error', message });
  }
});

export default router;
