import { Response, NextFunction } from 'express';
import { ratingsService } from './ratings.service';
import { successResponse, errorResponse, notFoundResponse } from '../../utils/response';
import { AuthRequest } from '../../middleware/auth';

export class RatingsController {
  /**
   * Create a new rating for a vendor
   */
  createRating = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        errorResponse(res, 'Authentication required', 401);
        return;
      }
      const rating = await ratingsService.createRating(req.userId, req.body);
      successResponse(res, rating, 201, 'Rating created successfully');
    } catch (error: any) {
      if (error.message === 'Vendor not found') {
        notFoundResponse(res, error.message);
        return;
      }
      if (error.message === 'You have already rated this vendor') {
        errorResponse(res, error.message, 400);
        return;
      }
      next(error);
    }
  };

  /**
   * Update a rating
   */
  updateRating = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        errorResponse(res, 'Authentication required', 401);
        return;
      }
      const rating = await ratingsService.updateRating(req.params.id!, req.userId, req.body);
      successResponse(res, rating, 200, 'Rating updated successfully');
    } catch (error: any) {
      if (error.message === 'Rating not found') {
        notFoundResponse(res, error.message);
        return;
      }
      if (error.message === 'Not authorized to edit this rating') {
        errorResponse(res, error.message, 403);
        return;
      }
      next(error);
    }
  };

  /**
   * Delete a rating
   */
  deleteRating = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        errorResponse(res, 'Authentication required', 401);
        return;
      }
      const result = await ratingsService.deleteRating(req.params.id!, req.userId);
      successResponse(res, result, 200, 'Rating deleted successfully');
    } catch (error: any) {
      if (error.message === 'Rating not found') {
        notFoundResponse(res, error.message);
        return;
      }
      if (error.message === 'Not authorized to delete this rating') {
        errorResponse(res, error.message, 403);
        return;
      }
      next(error);
    }
  };

  /**
   * Get a rating by ID
   */
  getRating = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rating = await ratingsService.getRatingById(req.params.id!);
      if (!rating) {
        notFoundResponse(res, 'Rating not found');
        return;
      }
      successResponse(res, rating);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get ratings for a vendor
   */
  getVendorRatings = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ratings = await ratingsService.getVendorRatings(req.params.vendorId!, req.query as any);
      successResponse(res, ratings);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get current user's ratings
   */
  getMyRatings = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        errorResponse(res, 'Authentication required', 401);
        return;
      }
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const ratings = await ratingsService.getUserRatings(req.userId, limit, req.query.cursor as string);
      successResponse(res, ratings);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get a user's ratings
   */
  getUserRatings = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const ratings = await ratingsService.getUserRatings(
        req.params.userId!,
        limit,
        req.query.cursor as string
      );
      successResponse(res, ratings);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Mark a rating as helpful
   */
  markHelpful = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        errorResponse(res, 'Authentication required', 401);
        return;
      }
      const result = await ratingsService.markHelpful(req.params.id!, req.userId, req.body.helpful);
      successResponse(res, result);
    } catch (error: any) {
      if (error.message === 'Rating not found') {
        notFoundResponse(res, error.message);
        return;
      }
      next(error);
    }
  };

  /**
   * Report a rating
   */
  reportRating = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        errorResponse(res, 'Authentication required', 401);
        return;
      }
      const result = await ratingsService.reportRating(req.userId, req.params.id!, req.body);
      successResponse(res, result);
    } catch (error: any) {
      if (error.message === 'Rating not found') {
        notFoundResponse(res, error.message);
        return;
      }
      next(error);
    }
  };

  /**
   * Get vendor rating statistics
   */
  getVendorStats = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const stats = await ratingsService.getVendorRatingStats(req.params.vendorId!);
      successResponse(res, stats);
    } catch (error) {
      next(error);
    }
  };
}

export const ratingsController = new RatingsController();
