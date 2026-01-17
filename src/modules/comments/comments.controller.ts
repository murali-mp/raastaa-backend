import { Response, NextFunction } from 'express';
import { commentsService } from './comments.service';
import { successResponse, errorResponse, notFoundResponse } from '../../utils/response';
import { AuthRequest } from '../../middleware/auth';

export class CommentsController {
  createComment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        errorResponse(res, 'Authentication required', 401);
        return;
      }
      const comment = await commentsService.createComment(req.userId, req.body);
      successResponse(res, comment, 201);
    } catch (error: any) {
      if (error.message === 'Post not found' || error.message === 'Parent comment not found') {
        notFoundResponse(res, error.message);
        return;
      }
      next(error);
    }
  };

  getComments = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await commentsService.getComments(
        req.params.postId!,
        req.userId,
        req.query as any
      );
      successResponse(res, result);
    } catch (error) {
      next(error);
    }
  };

  getReplies = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { cursor } = req.query;
      const result = await commentsService.getReplies(
        req.params.commentId!,
        req.userId,
        undefined,
        cursor as string
      );
      successResponse(res, result);
    } catch (error) {
      next(error);
    }
  };

  updateComment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        errorResponse(res, 'Authentication required', 401);
        return;
      }
      const comment = await commentsService.updateComment(
        req.params.commentId!,
        req.userId,
        req.body
      );
      successResponse(res, comment);
    } catch (error: any) {
      if (error.message === 'Comment not found') {
        notFoundResponse(res, error.message);
        return;
      }
      if (error.message === 'Not authorized to edit this comment') {
        errorResponse(res, error.message, 403);
        return;
      }
      next(error);
    }
  };

  deleteComment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        errorResponse(res, 'Authentication required', 401);
        return;
      }
      const result = await commentsService.deleteComment(req.params.commentId!, req.userId);
      successResponse(res, result);
    } catch (error: any) {
      if (error.message === 'Comment not found') {
        notFoundResponse(res, error.message);
        return;
      }
      if (error.message === 'Not authorized to delete this comment') {
        errorResponse(res, error.message, 403);
        return;
      }
      next(error);
    }
  };

  likeComment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        errorResponse(res, 'Authentication required', 401);
        return;
      }
      const result = await commentsService.likeComment(req.userId, req.params.commentId!);
      successResponse(res, result);
    } catch (error: any) {
      if (error.message === 'Comment not found') {
        notFoundResponse(res, error.message);
        return;
      }
      next(error);
    }
  };

  unlikeComment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        errorResponse(res, 'Authentication required', 401);
        return;
      }
      const result = await commentsService.unlikeComment(req.userId, req.params.commentId!);
      successResponse(res, result);
    } catch (error) {
      next(error);
    }
  };

  reportComment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        errorResponse(res, 'Authentication required', 401);
        return;
      }
      const result = await commentsService.reportComment(
        req.userId,
        req.params.commentId!,
        req.body
      );
      successResponse(res, result);
    } catch (error: any) {
      if (error.message === 'Comment not found') {
        notFoundResponse(res, error.message);
        return;
      }
      next(error);
    }
  };
}

export const commentsController = new CommentsController();
