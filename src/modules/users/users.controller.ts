import { Request, Response, NextFunction } from 'express';
import { usersService } from './users.service';
import { 
  successResponse, 
  errorResponse, 
  notFoundResponse 
} from '../../utils/response';
import { AuthRequest } from '../../middleware/auth';

export class UsersController {
  /**
   * GET /users/:userId
   */
  async getUser(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      if (!userId) {
        return errorResponse(res, 'User ID is required', 400);
      }

      const user = await usersService.getUserById(userId, req.userId);
      if (!user) {
        return notFoundResponse(res, 'User not found');
      }

      return successResponse(res, { user });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /users/username/:username
   */
  async getUserByUsername(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { username } = req.params;
      if (!username) {
        return errorResponse(res, 'Username is required', 400);
      }

      const user = await usersService.getUserByUsername(username, req.userId);
      if (!user) {
        return notFoundResponse(res, 'User not found');
      }

      return successResponse(res, { user });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /users/me
   */
  async updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        return errorResponse(res, 'Authentication required', 401);
      }

      const user = await usersService.updateProfile(req.userId, req.body);
      return successResponse(res, { user }, 200, 'Profile updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /users/me/avatar
   */
  async updateAvatar(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        return errorResponse(res, 'Authentication required', 401);
      }

      if (!req.file) {
        return errorResponse(res, 'No file uploaded', 400);
      }

      const result = await usersService.updateProfilePicture(
        req.userId,
        req.file.buffer,
        req.file.mimetype
      );

      return successResponse(res, result, 200, 'Avatar updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /users/search
   */
  async searchUsers(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await usersService.searchUsers(req.query as any, req.userId);
      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /users/:userId/posts
   */
  async getUserPosts(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      if (!userId) {
        return errorResponse(res, 'User ID is required', 400);
      }

      const { cursor, limit } = req.query;
      const result = await usersService.getUserPosts(
        userId,
        limit ? parseInt(limit as string) : undefined,
        cursor as string,
        req.userId
      );

      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /users/me/saved
   */
  async getSavedPosts(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        return errorResponse(res, 'Authentication required', 401);
      }

      const { cursor, limit } = req.query;
      const result = await usersService.getSavedPosts(
        req.userId,
        limit ? parseInt(limit as string) : undefined,
        cursor as string
      );

      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /users/me/referrals
   */
  async getReferralStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        return errorResponse(res, 'Authentication required', 401);
      }

      const stats = await usersService.getReferralStats(req.userId);
      return successResponse(res, stats);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /users/me/caps/history
   */
  async getBottleCapsHistory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        return errorResponse(res, 'Authentication required', 401);
      }

      const result = await usersService.getBottleCapsHistory(req.userId, req.query as any);
      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /users/me/achievements
   */
  async getAchievements(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        return errorResponse(res, 'Authentication required', 401);
      }

      const achievements = await usersService.getUserAchievements(req.userId);
      return successResponse(res, achievements);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /users/block
   */
  async blockUser(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        return errorResponse(res, 'Authentication required', 401);
      }

      const { user_id } = req.body;
      const result = await usersService.blockUser(req.userId, user_id);
      return successResponse(res, result, 200, 'User blocked successfully');
    } catch (error: any) {
      if (error.message === 'Cannot block yourself') {
        return errorResponse(res, error.message, 400);
      }
      next(error);
    }
  }

  /**
   * DELETE /users/block/:userId
   */
  async unblockUser(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        return errorResponse(res, 'Authentication required', 401);
      }

      const { userId } = req.params;
      if (!userId) {
        return errorResponse(res, 'User ID is required', 400);
      }

      const result = await usersService.unblockUser(req.userId, userId);
      return successResponse(res, result, 200, 'User unblocked successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /users/me/blocked
   */
  async getBlockedUsers(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        return errorResponse(res, 'Authentication required', 401);
      }

      const blocked = await usersService.getBlockedUsers(req.userId);
      return successResponse(res, { blocked_users: blocked });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /users/me/deactivate
   */
  async deactivateAccount(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        return errorResponse(res, 'Authentication required', 401);
      }

      const result = await usersService.deactivateAccount(req.userId);
      return successResponse(res, result, 200, 'Account deactivated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /users/me
   */
  async deleteAccount(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        return errorResponse(res, 'Authentication required', 401);
      }

      const result = await usersService.deleteAccount(req.userId);
      return successResponse(res, result, 200, 'Account deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /users/me/expeditions
   */
  async getUserExpeditions(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        return errorResponse(res, 'Authentication required', 401);
      }

      const { cursor, limit } = req.query;
      const result = await usersService.getUserExpeditions(
        req.userId,
        limit ? parseInt(limit as string) : undefined,
        cursor as string
      );

      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }
}

export const usersController = new UsersController();
