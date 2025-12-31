import { Router, Request, Response } from 'express';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

/**
 * GET /api/v1/challenges
 * Get available challenges
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    res.json({
      status: 'success',
      data: {
        challenges: [],
        message: 'No challenges available yet',
      },
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch challenges',
    });
  }
});

export default router;
