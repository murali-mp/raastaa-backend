import { Router } from 'express';
import { commentsController } from './comments.controller';
import { authenticate, optionalAuth } from '../../middleware/auth';
import { validateBody, validateQuery } from '../../middleware/validator';
import {
  createCommentSchema,
  updateCommentSchema,
  getCommentsQuery,
  reportCommentSchema,
} from './comments.schema';

const router = Router();

// Get comments for a post (public but auth optional for like status)
router.get('/posts/:postId/comments', optionalAuth, validateQuery(getCommentsQuery), commentsController.getComments);

// Get replies to a comment
router.get('/:commentId/replies', optionalAuth, commentsController.getReplies);

// Create a comment (auth required)
router.post('/', authenticate, validateBody(createCommentSchema), commentsController.createComment);

// Update a comment
router.patch('/:commentId', authenticate, validateBody(updateCommentSchema), commentsController.updateComment);

// Delete a comment
router.delete('/:commentId', authenticate, commentsController.deleteComment);

// Comment interactions
router.post('/:commentId/like', authenticate, commentsController.likeComment);
router.delete('/:commentId/like', authenticate, commentsController.unlikeComment);
router.post('/:commentId/report', authenticate, validateBody(reportCommentSchema), commentsController.reportComment);

export default router;
