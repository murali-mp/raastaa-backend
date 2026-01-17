import { Response, NextFunction } from 'express';
import { notificationsService } from './notifications.service';
import { successResponse, errorResponse } from '../../utils/response';
import { AuthRequest } from '../../middleware/auth';

export class NotificationsController {
  /**
   * Get user's notifications
   */
  getNotifications = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        errorResponse(res, 'Authentication required', 401);
        return;
      }
      const notifications = await notificationsService.getNotifications(req.userId, req.query as any);
      successResponse(res, notifications);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get unread notification count
   */
  getUnreadCount = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        errorResponse(res, 'Authentication required', 401);
        return;
      }
      const count = await notificationsService.getUnreadCount(req.userId);
      successResponse(res, count);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Mark notifications as read
   */
  markAsRead = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        errorResponse(res, 'Authentication required', 401);
        return;
      }
      const result = await notificationsService.markAsRead(req.userId, req.body.notification_ids);
      successResponse(res, result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Mark all notifications as read
   */
  markAllAsRead = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        errorResponse(res, 'Authentication required', 401);
        return;
      }
      const result = await notificationsService.markAllAsRead(req.userId);
      successResponse(res, result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete notifications
   */
  deleteNotifications = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        errorResponse(res, 'Authentication required', 401);
        return;
      }
      const result = await notificationsService.deleteNotifications(req.userId, req.body.notification_ids);
      successResponse(res, result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Clear all notifications
   */
  clearAll = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        errorResponse(res, 'Authentication required', 401);
        return;
      }
      const result = await notificationsService.clearAllNotifications(req.userId);
      successResponse(res, result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get notification preferences
   */
  getPreferences = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        errorResponse(res, 'Authentication required', 401);
        return;
      }
      const preferences = await notificationsService.getPreferences(req.userId);
      successResponse(res, preferences);
    } catch (error) {
      next(error);
    }
  };
}

export const notificationsController = new NotificationsController();
