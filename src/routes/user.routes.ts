import { Router, Request, Response } from 'express';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

/**
 * GET /api/v1/users/me
 * Get current user profile
 */
router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    
    // TODO: Fetch user from database
    res.json({
      status: 'success',
      data: {
        user: {
          id: userId,
          email: 'test@raastaa.com',
          name: 'Test User',
          trustScore: 100,
          status: 'ACTIVE',
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch user profile',
    });
  }
});

export default router;
