import { Router, Request, Response } from 'express';
import { authenticate, optionalAuthenticate } from '../middlewares/auth.middleware';
import { PostService } from '../services/post.service';
import { authService } from '../services/auth.service';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { db } from '../config/database';
import { ConflictError, ValidationError, NotFoundError } from '../utils/errors';
import { serializeUser } from '../utils/serializers';

const router = Router();
const postService = new PostService();

/**
 * GET /api/v1/users/me
 * Get current user profile
 */
router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
    }

    const user = await authService.getUserById(userId);
    res.json({
      status: 'success',
      data: user,
    });
  } catch (error: unknown) {
    logger.error('Failed to fetch user profile', { error });
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : 'Failed to fetch user profile';
    res.status(statusCode).json({
      status: 'error',
      message,
    });
  }
});

/**
 * PUT /api/v1/users/profile
 * Update current user's profile
 */
router.put('/profile', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
    }

    const { displayName, email, username } = req.body as {
      displayName?: string;
      email?: string;
      username?: string;
    };

    if (username && username.length < 3) {
      throw new ValidationError('Username must be at least 3 characters');
    }

    // uniqueness checks (only if fields are being changed)
    if (typeof username === 'string') {
      const existing = await db.user.findFirst({
        where: { username, NOT: { id: userId } },
        select: { id: true },
      });
      if (existing) throw new ConflictError('Username already taken');
    }

    if (typeof email === 'string' && email.length > 0) {
      const existing = await db.user.findFirst({
        where: { email, NOT: { id: userId } },
        select: { id: true },
      });
      if (existing) throw new ConflictError('Email already registered');
    }

    const updated = await db.user.update({
      where: { id: userId },
      data: {
        ...(displayName !== undefined ? { displayName } : {}),
        ...(email !== undefined ? { email } : {}),
        ...(username !== undefined ? { username } : {}),
      },
    });

    res.json({
      status: 'success',
      data: serializeUser(updated),
    });
  } catch (error: unknown) {
    logger.error('Failed to update profile', { error });
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : 'Failed to update profile';
    res.status(statusCode).json({
      status: 'error',
      message,
    });
  }
});

/**
 * POST /api/v1/users/:id/follow
 */
router.post('/:id/follow', authenticate, async (req: Request, res: Response) => {
  try {
    const followerId = req.userId;
    const followingId = req.params.id;

    if (!followerId) {
      return res.status(401).json({ status: 'error', message: 'Authentication required' });
    }
    if (followerId === followingId) {
      throw new ValidationError("Can't follow yourself");
    }

    await db.user.findUnique({ where: { id: followingId } }).then((u) => {
      if (!u) throw new NotFoundError('User not found');
    });

    await db.follower.upsert({
      where: { followerId_followingId: { followerId, followingId } },
      update: {},
      create: { followerId, followingId },
    });

    res.json({
      status: 'success',
      data: { isFollowing: true },
    });
  } catch (error: unknown) {
    logger.error('Failed to follow user', { error });
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : 'Failed to follow user';
    res.status(statusCode).json({ status: 'error', message });
  }
});

/**
 * POST /api/v1/users/:id/unfollow
 */
router.post('/:id/unfollow', authenticate, async (req: Request, res: Response) => {
  try {
    const followerId = req.userId;
    const followingId = req.params.id;

    if (!followerId) {
      return res.status(401).json({ status: 'error', message: 'Authentication required' });
    }

    await db.follower.deleteMany({
      where: { followerId, followingId },
    });

    res.json({
      status: 'success',
      data: { isFollowing: false },
    });
  } catch (error: unknown) {
    logger.error('Failed to unfollow user', { error });
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : 'Failed to unfollow user';
    res.status(statusCode).json({ status: 'error', message });
  }
});

/**
 * GET /api/v1/users/:id/stats
 */
router.get('/:id/stats', optionalAuthenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    const viewerId = req.userId;

    const [followerCount, followingCount, postCount] = await Promise.all([
      db.follower.count({ where: { followingId: userId } }),
      db.follower.count({ where: { followerId: userId } }),
      db.feedPost.count({ where: { authorId: userId, status: 'VISIBLE' } }),
    ]);

    const reviewCount = await db.review.count({ where: { userId, status: 'VISIBLE' } });

    const isFollowing = viewerId
      ? Boolean(
          await db.follower.findUnique({
            where: { followerId_followingId: { followerId: viewerId, followingId: userId } },
          })
        )
      : null;

    res.json({
      status: 'success',
      data: {
        followerCount,
        followingCount,
        reviewCount,
        postCount,
        isFollowing,
      },
    });
  } catch (error: unknown) {
    logger.error('Failed to fetch user stats', { error });
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : 'Failed to fetch user stats';
    res.status(statusCode).json({ status: 'error', message });
  }
});

/**
 * GET /api/v1/users/:id/followers
 */
router.get('/:id/followers', async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    const followers = await db.follower.findMany({
      where: { followingId: userId },
      include: { follower: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    res.json({
      status: 'success',
      data: {
        users: followers.map((f) => serializeUser(f.follower)),
      },
    });
  } catch (error: unknown) {
    logger.error('Failed to fetch followers', { error });
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : 'Failed to fetch followers';
    res.status(statusCode).json({ status: 'error', message });
  }
});

/**
 * GET /api/v1/users/:id/following
 */
router.get('/:id/following', async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    const following = await db.follower.findMany({
      where: { followerId: userId },
      include: { following: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    res.json({
      status: 'success',
      data: {
        users: following.map((f) => serializeUser(f.following)),
      },
    });
  } catch (error: unknown) {
    logger.error('Failed to fetch following', { error });
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : 'Failed to fetch following';
    res.status(statusCode).json({ status: 'error', message });
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
      viewerId: req.userId,
    });

    res.json({
      status: 'success',
      data: {
        posts,
        count: posts.length,
      },
    });
  } catch (error: unknown) {
    logger.error('Error fetching user posts', { error });
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : 'Failed to fetch user posts';
    res.status(statusCode).json({
      status: 'error',
      message,
    });
  }
});

export default router;
