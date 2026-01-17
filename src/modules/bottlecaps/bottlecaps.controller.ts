import { Response, NextFunction } from 'express';
import { bottleCapsService } from './bottlecaps.service';
import { successResponse, errorResponse, notFoundResponse } from '../../utils/response';
import { AuthRequest } from '../../middleware/auth';

export class BottleCapsController {
  /**
   * Get current user's bottle cap balance
   */
  getBalance = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        errorResponse(res, 'Authentication required', 401);
        return;
      }
      const balance = await bottleCapsService.getBalance(req.userId);
      successResponse(res, balance);
    } catch (error: any) {
      if (error.message === 'User not found') {
        notFoundResponse(res, error.message);
        return;
      }
      next(error);
    }
  };

  /**
   * Get current user's transaction history
   */
  getTransactions = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        errorResponse(res, 'Authentication required', 401);
        return;
      }
      const transactions = await bottleCapsService.getTransactions(req.userId, req.query as any);
      successResponse(res, transactions);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Claim daily login reward
   */
  claimDaily = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        errorResponse(res, 'Authentication required', 401);
        return;
      }
      const result = await bottleCapsService.claimDailyReward(req.userId);
      successResponse(res, result);
    } catch (error: any) {
      if (error.message === 'User not found') {
        notFoundResponse(res, error.message);
        return;
      }
      next(error);
    }
  };

  /**
   * Get daily rewards status
   */
  getDailyStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        errorResponse(res, 'Authentication required', 401);
        return;
      }
      const status = await bottleCapsService.getDailyStatus(req.userId);
      successResponse(res, status);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Spend bottle caps
   */
  spend = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        errorResponse(res, 'Authentication required', 401);
        return;
      }
      const result = await bottleCapsService.spendBottleCaps(req.userId, req.body);
      successResponse(res, result);
    } catch (error: any) {
      if (error.message === 'User not found') {
        notFoundResponse(res, error.message);
        return;
      }
      if (error.message === 'Insufficient bottle caps') {
        errorResponse(res, error.message, 400);
        return;
      }
      next(error);
    }
  };

  /**
   * Get leaderboard
   */
  getLeaderboard = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const leaderboard = await bottleCapsService.getLeaderboard(req.query as any);
      successResponse(res, leaderboard);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get current user's rank
   */
  getMyRank = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        errorResponse(res, 'Authentication required', 401);
        return;
      }
      const rank = await bottleCapsService.getUserRank(req.userId);
      successResponse(res, rank);
    } catch (error: any) {
      if (error.message === 'User not found') {
        notFoundResponse(res, error.message);
        return;
      }
      next(error);
    }
  };

  /**
   * Admin: Grant bottle caps to a user
   */
  adminGrant = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        errorResponse(res, 'Authentication required', 401);
        return;
      }
      const result = await bottleCapsService.adminGrant(req.userId, req.body);
      successResponse(res, result);
    } catch (error: any) {
      if (error.message.includes('not found')) {
        notFoundResponse(res, error.message);
        return;
      }
      next(error);
    }
  };

  /**
   * Admin: Deduct bottle caps from a user
   */
  adminDeduct = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        errorResponse(res, 'Authentication required', 401);
        return;
      }
      const result = await bottleCapsService.adminDeduct(req.userId, req.body);
      successResponse(res, result);
    } catch (error: any) {
      if (error.message === 'User not found') {
        notFoundResponse(res, error.message);
        return;
      }
      next(error);
    }
  };
}

export const bottleCapsController = new BottleCapsController();
