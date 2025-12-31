import { Router, Request, Response } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { db } from '../config/database';
import { AppError, ValidationError, NotFoundError } from '../utils/errors';
import { logger } from '../utils/logger';
import { calculateDistance } from '../utils/geoUtils';
import { walletService } from '../services/wallet.service';
import { serializeVisit } from '../utils/serializers';

const router = Router();

/**
 * POST /api/v1/visits
 * Record a visit (GPS verification if close enough)
 */
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ status: 'error', message: 'Authentication required' });
    }

    const { vendorId, latitude, longitude } = req.body as {
      vendorId?: string;
      latitude?: number;
      longitude?: number;
    };

    if (!vendorId) {
      throw new ValidationError('vendorId is required');
    }

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      throw new ValidationError('latitude and longitude are required');
    }

    const vendor = await db.vendor.findUnique({
      where: { id: vendorId },
      include: { location: true },
    });

    if (!vendor) {
      throw new NotFoundError('Vendor not found');
    }

    // verify by GPS within 200m
    const distanceKm = calculateDistance(
      latitude,
      longitude,
      Number(vendor.location.latitude),
      Number(vendor.location.longitude)
    );

    const isVerified = distanceKm <= 0.2;

    const visit = await db.visit.create({
      data: {
        userId,
        vendorId,
        isVerified,
        verificationMethod: isVerified ? 'GPS' : null,
      },
    });

    // Award points for verified visits (idempotent via referenceType/referenceId)
    if (isVerified) {
      await walletService.awardVisitReward(userId, visit.id);
    }

    res.status(201).json({
      status: 'success',
      data: serializeVisit(visit),
    });
  } catch (error: unknown) {
    logger.error('Failed to record visit', { error });
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : 'Failed to record visit';
    res.status(statusCode).json({
      status: 'error',
      message,
    });
  }
});

export default router;
