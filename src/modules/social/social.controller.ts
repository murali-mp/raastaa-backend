import { Response, NextFunction } from 'express';
import { socialService } from './social.service';
import { successResponse, errorResponse, notFoundResponse } from '../../utils/response';
import { AuthRequest } from '../../middleware/auth';

export class SocialController {
  followUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        errorResponse(res, 'Authentication required', 401);
        return;
      }
      const result = await socialService.followUser(req.userId, req.body.user_id);
      successResponse(res, result);
    } catch (error: any) {
      if (error.message === 'Cannot follow yourself' || error.message === 'Cannot follow this user') {
        errorResponse(res, error.message, 400);
        return;
      }
      next(error);
    }
  };

  unfollowUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        errorResponse(res, 'Authentication required', 401);
        return;
      }
      const result = await socialService.unfollowUser(req.userId, req.params.userId!);
      successResponse(res, result);
    } catch (error) {
      next(error);
    }
  };

  followVendor = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        errorResponse(res, 'Authentication required', 401);
        return;
      }
      const result = await socialService.followVendor(
        req.userId,
        req.body.vendor_id,
        req.body.notifications
      );
      successResponse(res, result);
    } catch (error) {
      next(error);
    }
  };

  unfollowVendor = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        errorResponse(res, 'Authentication required', 401);
        return;
      }
      const result = await socialService.unfollowVendor(req.userId, req.params.vendorId!);
      successResponse(res, result);
    } catch (error) {
      next(error);
    }
  };

  getFollowers = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.params.userId || req.userId;
      if (!userId) {
        errorResponse(res, 'User ID required', 400);
        return;
      }
      const { cursor } = req.query;
      const result = await socialService.getFollowers(userId, undefined, cursor as string);
      successResponse(res, result);
    } catch (error) {
      next(error);
    }
  };

  getFollowing = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.params.userId || req.userId;
      if (!userId) {
        errorResponse(res, 'User ID required', 400);
        return;
      }
      const { cursor } = req.query;
      const result = await socialService.getFollowing(userId, undefined, cursor as string);
      successResponse(res, result);
    } catch (error) {
      next(error);
    }
  };

  sendFriendRequest = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        errorResponse(res, 'Authentication required', 401);
        return;
      }
      const result = await socialService.sendFriendRequest(req.userId, req.body.user_id);
      successResponse(res, result);
    } catch (error: any) {
      if (error.message === 'Cannot send friend request to yourself' || error.message === 'Cannot send friend request') {
        errorResponse(res, error.message, 400);
        return;
      }
      next(error);
    }
  };

  respondFriendRequest = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        errorResponse(res, 'Authentication required', 401);
        return;
      }
      const { request_id, action } = req.body;
      const result = action === 'accept'
        ? await socialService.acceptFriendRequest(request_id, req.userId)
        : await socialService.declineFriendRequest(request_id, req.userId);
      successResponse(res, result);
    } catch (error: any) {
      if (error.message === 'Friend request not found') {
        notFoundResponse(res, error.message);
        return;
      }
      if (error.message === 'Request already processed' || error.message === 'Cannot accept your own request') {
        errorResponse(res, error.message, 400);
        return;
      }
      next(error);
    }
  };

  getPendingFriendRequests = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        errorResponse(res, 'Authentication required', 401);
        return;
      }
      const result = await socialService.getPendingFriendRequests(req.userId);
      successResponse(res, result);
    } catch (error) {
      next(error);
    }
  };

  getFriends = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        errorResponse(res, 'Authentication required', 401);
        return;
      }
      const { cursor } = req.query;
      const result = await socialService.getFriends(req.userId, undefined, cursor as string);
      successResponse(res, result);
    } catch (error) {
      next(error);
    }
  };

  removeFriend = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        errorResponse(res, 'Authentication required', 401);
        return;
      }
      const result = await socialService.removeFriend(req.userId, req.params.friendId!);
      successResponse(res, result);
    } catch (error: any) {
      if (error.message === 'Friendship not found') {
        notFoundResponse(res, error.message);
        return;
      }
      next(error);
    }
  };
}

export const socialController = new SocialController();
