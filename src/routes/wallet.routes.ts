import { Router, Request, Response } from 'express';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

/**
 * GET /api/v1/wallet
 * Get user's wallet info
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;

    // TODO: Fetch wallet from database
    res.json({
      status: 'success',
      data: {
        wallet: {
          userId,
          balance: 0,
          currency: 'INR',
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch wallet',
    });
  }
});

/**
 * GET /api/v1/wallet/transactions
 * Get wallet transactions
 */
router.get('/transactions', authenticate, async (req: Request, res: Response) => {
  try {
    res.json({
      status: 'success',
      data: {
        transactions: [],
      },
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch transactions',
    });
  }
});

export default router;
