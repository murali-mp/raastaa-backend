import { Router, Request, Response } from 'express';
import { PostService } from '../services/post.service';
import { authenticate, optionalAuthenticate } from '../middlewares/auth.middleware';

const router = Router();
const postService = new PostService();

/**
 * POST /api/v1/posts
 * Create a new feed post
 */
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { vendorId, postType, body, mediaIds } = req.body;

    if (!postType) {
      return res.status(400).json({
        status: 'error',
        message: 'postType is required',
      });
    }

    if (!['REVIEW', 'TIP', 'PHOTO', 'CHECKIN'].includes(postType)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid postType. Must be one of: REVIEW, TIP, PHOTO, CHECKIN',
      });
    }

    const post = await postService.createPost({
      authorId: req.userId!,
      vendorId,
      postType,
      body,
      mediaIds,
    });

    res.status(201).json({
      status: 'success',
      data: {
        post,
      },
    });
  } catch (error: any) {
    console.error('Error creating post:', error);
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message || 'Failed to create post',
    });
  }
});

/**
 * GET /api/v1/posts
 * Get global feed posts
 */
router.get('/', optionalAuthenticate, async (req: Request, res: Response) => {
  try {
    const { limit, offset } = req.query;

    const posts = await postService.getFeedPosts({
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
      userId: req.userId,
    });

    res.json({
      status: 'success',
      data: {
        posts,
        count: posts.length,
      },
    });
  } catch (error: any) {
    console.error('Error fetching posts:', error);
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message || 'Failed to fetch posts',
    });
  }
});

/**
 * GET /api/v1/posts/following
 * Get feed from followed users
 */
router.get('/following', authenticate, async (req: Request, res: Response) => {
  try {
    const { limit, offset } = req.query;

    const posts = await postService.getFollowingFeed(req.userId!, {
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
    console.error('Error fetching following feed:', error);
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message || 'Failed to fetch following feed',
    });
  }
});

/**
 * GET /api/v1/posts/:id
 * Get a single post by ID
 */
router.get('/:id', optionalAuthenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const post = await postService.getPostById(id, req.userId);

    res.json({
      status: 'success',
      data: {
        post,
      },
    });
  } catch (error: any) {
    console.error('Error fetching post:', error);
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message || 'Failed to fetch post',
    });
  }
});

/**
 * POST /api/v1/posts/:id/like
 * Like or unlike a post
 */
router.post('/:id/like', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await postService.toggleLike(id, req.userId!);

    res.json({
      status: 'success',
      data: result,
    });
  } catch (error: any) {
    console.error('Error toggling like:', error);
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message || 'Failed to like post',
    });
  }
});

/**
 * POST /api/v1/posts/:id/save
 * Save or unsave a post
 */
router.post('/:id/save', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await postService.toggleSave(id, req.userId!);

    res.json({
      status: 'success',
      data: result,
    });
  } catch (error: any) {
    console.error('Error toggling save:', error);
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message || 'Failed to save post',
    });
  }
});

/**
 * GET /api/v1/posts/:id/comments
 * Get comments for a post
 */
router.get('/:id/comments', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const comments = await postService.getComments(id);

    res.json({
      status: 'success',
      data: {
        comments,
        count: comments.length,
      },
    });
  } catch (error: any) {
    console.error('Error fetching comments:', error);
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message || 'Failed to fetch comments',
    });
  }
});

/**
 * POST /api/v1/posts/:id/comments
 * Add a comment to a post
 */
router.post('/:id/comments', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { body } = req.body;

    if (!body) {
      return res.status(400).json({
        status: 'error',
        message: 'Comment body is required',
      });
    }

    const comment = await postService.addComment({
      authorId: req.userId!,
      postId: id,
      body,
    });

    res.status(201).json({
      status: 'success',
      data: {
        comment,
      },
    });
  } catch (error: any) {
    console.error('Error adding comment:', error);
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message || 'Failed to add comment',
    });
  }
});

export default router;
