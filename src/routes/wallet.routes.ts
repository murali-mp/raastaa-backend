import { Router, Request, Response } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { WalletService } from '../services/wallet.service';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { serializeWalletTransaction } from '../utils/serializers';

const router = Router();
const walletService = new WalletService();

/**
 * GET /api/v1/wallet
 * Get user's wallet info
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
    }

    const wallet = await walletService.getWallet(userId);
    res.json({
      status: 'success',
      data: wallet,
    });
  } catch (error: unknown) {
    logger.error('Failed to fetch wallet', { error });
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : 'Failed to fetch wallet';
    res.status(statusCode).json({
      status: 'error',
      message,
    });
  }
});

/**
 * GET /api/v1/wallet/transactions
 * Get wallet transactions
 */
router.get('/transactions', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
    }

    const { limit, offset } = req.query;
    const result = await walletService.getTransactions(
      userId,
      limit ? Number(limit) : 50,
      offset ? Number(offset) : 0
    );

    const serialized = {
      ...result,
      transactions: result.transactions.map(serializeWalletTransaction),
    };

    res.json({
      status: 'success',
      data: serialized,
    });
  } catch (error: unknown) {
    logger.error('Failed to fetch wallet transactions', { error });
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : 'Failed to fetch transactions';
    res.status(statusCode).json({
      status: 'error',
      message,
    });
  }
});

export default router;
