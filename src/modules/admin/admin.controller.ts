import { Response, NextFunction } from 'express';
import { adminService } from './admin.service';
import { successResponse, errorResponse, notFoundResponse } from '../../utils/response';
import { AuthRequest } from '../../middleware/auth';

export class AdminController {
  // ==================== Dashboard ====================
  getDashboard = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const period = (req.query.period as string) || 'week';
      const stats = await adminService.getDashboardStats(period);
      successResponse(res, stats);
    } catch (error) {
      next(error);
    }
  };

  // ==================== Vendor Management ====================
  getPendingVendors = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const vendors = await adminService.getPendingVendors(limit, req.query.cursor as string);
      successResponse(res, vendors);
    } catch (error) {
      next(error);
    }
  };

  approveVendor = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await adminService.handleVendorApproval(req.params.vendorId!, req.body);
      successResponse(res, result);
    } catch (error: any) {
      if (error.message === 'Vendor not found') {
        notFoundResponse(res, error.message);
        return;
      }
      if (error.message.includes('not pending')) {
        errorResponse(res, error.message, 400);
        return;
      }
      next(error);
    }
  };

  // ==================== Content Moderation ====================
  getContentFlags = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const flags = await adminService.getContentFlags(req.query as any);
      successResponse(res, flags);
    } catch (error) {
      next(error);
    }
  };

  resolveFlag = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        errorResponse(res, 'Authentication required', 401);
        return;
      }
      const result = await adminService.resolveFlag(
        req.params.flagId!,
        req.userId,
        req.body
      );
      successResponse(res, result);
    } catch (error: any) {
      if (error.message === 'Flag not found') {
        notFoundResponse(res, error.message);
        return;
      }
      next(error);
    }
  };

  // ==================== User Management ====================
  getUsers = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const users = await adminService.getUsers(
        limit,
        req.query.cursor as string,
        req.query.search as string
      );
      successResponse(res, users);
    } catch (error) {
      next(error);
    }
  };

  handleUserAction = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        errorResponse(res, 'Authentication required', 401);
        return;
      }
      const result = await adminService.handleUserAction(
        req.params.userId!,
        req.userId,
        req.body
      );
      successResponse(res, result);
    } catch (error: any) {
      if (error.message === 'User not found') {
        notFoundResponse(res, error.message);
        return;
      }
      next(error);
    }
  };

  // ==================== Broadcast ====================
  sendBroadcast = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        errorResponse(res, 'Authentication required', 401);
        return;
      }
      const result = await adminService.sendBroadcast(req.userId, req.body);
      successResponse(res, result);
    } catch (error) {
      next(error);
    }
  };
}

export const adminController = new AdminController();
