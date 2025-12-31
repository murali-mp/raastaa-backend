import { Router, Request, Response } from 'express';
import { authenticate, optionalAuthenticate } from '../middlewares/auth.middleware';
import { PostService } from '../services/post.service';

const router = Router();
const postService = new PostService();

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

/**
 * GET /api/v1/users/:id/posts
 * Get posts by a specific user
 */
router.get('/:id/posts', optionalAuthenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { limit, offset } = req.query;

    const posts = await postService.getUserPosts(id, {
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });

    res.json({
      status: 'success',
      data: {
        posts,
        count: posts.length,
      },
    });
  } catch (error: any) {
    console.error('Error fetching user posts:', error);
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message || 'Failed to fetch user posts',
    });
  }
});

export default router;
