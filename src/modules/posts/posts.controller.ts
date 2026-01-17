import { Response, NextFunction } from 'express';
import { postsService } from './posts.service';
import { successResponse, errorResponse, notFoundResponse } from '../../utils/response';
import { AuthRequest } from '../../middleware/auth';

export class PostsController {
  createPost = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        errorResponse(res, 'Authentication required', 401);
        return;
      }
      const post = await postsService.createPost(req.userId, req.body);
      successResponse(res, post, 201);
    } catch (error) {
      next(error);
    }
  };

  getPost = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const post = await postsService.getPostById(req.params.postId!, req.userId);
      if (!post) {
        notFoundResponse(res, 'Post not found');
        return;
      }
      successResponse(res, post);
    } catch (error) {
      next(error);
    }
  };

  updatePost = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        errorResponse(res, 'Authentication required', 401);
        return;
      }
      const post = await postsService.updatePost(req.params.postId!, req.userId, req.body);
      successResponse(res, post);
    } catch (error: any) {
      if (error.message === 'Post not found') {
        notFoundResponse(res, error.message);
        return;
      }
      if (error.message === 'Not authorized to edit this post') {
        errorResponse(res, error.message, 403);
        return;
      }
      next(error);
    }
  };

  deletePost = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        errorResponse(res, 'Authentication required', 401);
        return;
      }
      const result = await postsService.deletePost(req.params.postId!, req.userId);
      successResponse(res, result);
    } catch (error: any) {
      if (error.message === 'Post not found') {
        notFoundResponse(res, error.message);
        return;
      }
      if (error.message === 'Not authorized to delete this post') {
        errorResponse(res, error.message, 403);
        return;
      }
      next(error);
    }
  };

  likePost = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        errorResponse(res, 'Authentication required', 401);
        return;
      }
      const result = await postsService.likePost(req.userId, req.params.postId!);
      successResponse(res, result);
    } catch (error: any) {
      if (error.message === 'Post not found') {
        notFoundResponse(res, error.message);
        return;
      }
      next(error);
    }
  };

  unlikePost = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        errorResponse(res, 'Authentication required', 401);
        return;
      }
      const result = await postsService.unlikePost(req.userId, req.params.postId!);
      successResponse(res, result);
    } catch (error) {
      next(error);
    }
  };

  savePost = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        errorResponse(res, 'Authentication required', 401);
        return;
      }
      const result = await postsService.savePost(req.userId, req.params.postId!);
      successResponse(res, result);
    } catch (error: any) {
      if (error.message === 'Post not found') {
        notFoundResponse(res, error.message);
        return;
      }
      next(error);
    }
  };

  unsavePost = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        errorResponse(res, 'Authentication required', 401);
        return;
      }
      const result = await postsService.unsavePost(req.userId, req.params.postId!);
      successResponse(res, result);
    } catch (error) {
      next(error);
    }
  };

  getSavedPosts = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        errorResponse(res, 'Authentication required', 401);
        return;
      }
      const { cursor } = req.query;
      const result = await postsService.getSavedPosts(req.userId, undefined, cursor as string);
      successResponse(res, result);
    } catch (error) {
      next(error);
    }
  };

  getFeed = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        errorResponse(res, 'Authentication required', 401);
        return;
      }
      const result = await postsService.getFeed(req.userId, req.query as any);
      successResponse(res, result);
    } catch (error) {
      next(error);
    }
  };

  getDiscoverFeed = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        errorResponse(res, 'Authentication required', 401);
        return;
      }
      const { cursor } = req.query;
      const result = await postsService.getDiscoverFeed(req.userId, undefined, cursor as string);
      successResponse(res, result);
    } catch (error) {
      next(error);
    }
  };

  searchByHashtag = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        errorResponse(res, 'Authentication required', 401);
        return;
      }
      const { hashtag, cursor } = req.query;
      const result = await postsService.searchByHashtag(
        hashtag as string,
        req.userId,
        undefined,
        cursor as string
      );
      successResponse(res, result);
    } catch (error) {
      next(error);
    }
  };

  getTrendingHashtags = async (_req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await postsService.getTrendingHashtags();
      successResponse(res, result);
    } catch (error) {
      next(error);
    }
  };

  reportPost = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        errorResponse(res, 'Authentication required', 401);
        return;
      }
      const result = await postsService.reportPost(req.userId, req.params.postId!, req.body);
      successResponse(res, result);
    } catch (error: any) {
      if (error.message === 'Post not found') {
        notFoundResponse(res, error.message);
        return;
      }
      next(error);
    }
  };

  getPostsByUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { cursor } = req.query;
      const result = await postsService.getPostsByUser(
        req.params.userId!,
        req.userId,
        undefined,
        cursor as string
      );
      successResponse(res, result);
    } catch (error) {
      next(error);
    }
  };

  getPostsByVendor = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { cursor } = req.query;
      const result = await postsService.getPostsByVendor(
        req.params.vendorId!,
        req.userId,
        undefined,
        cursor as string
      );
      successResponse(res, result);
    } catch (error) {
      next(error);
    }
  };
}

export const postsController = new PostsController();
