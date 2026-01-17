import { Router } from 'express';
import { postsController } from './posts.controller';
import { authenticate, optionalAuth } from '../../middleware/auth';
import { validateBody, validateQuery } from '../../middleware/validator';
import {
  createPostSchema,
  updatePostSchema,
  getFeedQuery,
  getPostsByHashtagQuery,
  reportPostSchema,
} from './posts.schema';

const router = Router();

// Feed routes (auth required)
router.get('/feed', authenticate, validateQuery(getFeedQuery), postsController.getFeed);
router.get('/discover', authenticate, postsController.getDiscoverFeed);
router.get('/saved', authenticate, postsController.getSavedPosts);

// Hashtag routes
router.get('/hashtags/trending', postsController.getTrendingHashtags);
router.get('/hashtags/search', authenticate, validateQuery(getPostsByHashtagQuery), postsController.searchByHashtag);

// Post CRUD
router.post('/', authenticate, validateBody(createPostSchema), postsController.createPost);
router.get('/:postId', optionalAuth, postsController.getPost);
router.patch('/:postId', authenticate, validateBody(updatePostSchema), postsController.updatePost);
router.delete('/:postId', authenticate, postsController.deletePost);

// Post interactions
router.post('/:postId/like', authenticate, postsController.likePost);
router.delete('/:postId/like', authenticate, postsController.unlikePost);
router.post('/:postId/save', authenticate, postsController.savePost);
router.delete('/:postId/save', authenticate, postsController.unsavePost);
router.post('/:postId/report', authenticate, validateBody(reportPostSchema), postsController.reportPost);

// User/Vendor posts
router.get('/users/:userId', optionalAuth, postsController.getPostsByUser);
router.get('/vendors/:vendorId', optionalAuth, postsController.getPostsByVendor);

export default router;
