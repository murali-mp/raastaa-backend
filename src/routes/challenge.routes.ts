import { Router, Request, Response } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { db } from '../config/database';
import { walletService } from '../services/wallet.service';
import { AppError, ValidationError, NotFoundError } from '../utils/errors';
import { logger } from '../utils/logger';
import { serializeChallenge, serializeWalletTransaction } from '../utils/serializers';

const router = Router();

/**
 * GET /api/v1/challenges
 * Get available challenges
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ status: 'error', message: 'Authentication required' });
    }

    const challenges = await db.challenge.findMany({
      where: { isActive: true },
      orderBy: [{ createdAt: 'desc' }],
      take: 200,
    });

    const progress = await db.challengeProgress.findMany({
      where: { userId },
    });

    const progressByChallengeId = new Map(progress.map((p) => [p.challengeId, p]));

    res.json({
      status: 'success',
      data: {
        challenges: challenges.map((c) => serializeChallenge(c, progressByChallengeId.get(c.id))),
      },
    });
  } catch (error: unknown) {
    logger.error('Failed to fetch challenges', { error });
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : 'Failed to fetch challenges';
    res.status(statusCode).json({ status: 'error', message });
  }
});

/**
 * POST /api/v1/challenges/claim
 * Claim a completed challenge reward
 */
router.post('/claim', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ status: 'error', message: 'Authentication required' });
    }

    const { challengeId } = req.body as { challengeId?: string };
    if (!challengeId) {
      throw new ValidationError('challengeId is required');
    }

    const challenge = await db.challenge.findUnique({ where: { id: challengeId } });
    if (!challenge) throw new NotFoundError('Challenge not found');

    const progress = await db.challengeProgress.findUnique({
      where: { challengeId_userId: { challengeId, userId } },
    });

    if (!progress || !progress.isCompleted) {
      throw new ValidationError('Challenge is not completed');
    }

    const txn = await walletService.awardChallengeReward(userId, challengeId, challenge.rewardPoints);
    const wallet = await walletService.getWallet(userId);

    res.json({
      status: 'success',
      data: {
        newBalance: wallet.balance,
        transaction: serializeWalletTransaction(txn),
      },
    });
  } catch (error: unknown) {
    logger.error('Failed to claim challenge reward', { error });
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : 'Failed to claim reward';
    res.status(statusCode).json({ status: 'error', message });
  }
});

export default router;
