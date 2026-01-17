import { Request, Response, NextFunction } from 'express';
import { vendorsService } from './vendors.service';
import { 
  successResponse, 
  errorResponse, 
  notFoundResponse 
} from '../../utils/response';
import { AuthRequest } from '../../middleware/auth';

export class VendorsController {
  /**
   * GET /vendors/:vendorId
   */
  async getVendor(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { vendorId } = req.params;
      if (!vendorId) {
        return errorResponse(res, 'Vendor ID is required', 400);
      }

      const vendor = await vendorsService.getVendorById(vendorId, req.userId);
      if (!vendor) {
        return notFoundResponse(res, 'Vendor not found');
      }

      return successResponse(res, { vendor });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /vendors/me
   */
  async updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.vendorId) {
        return errorResponse(res, 'Vendor authentication required', 401);
      }

      const vendor = await vendorsService.updateProfile(req.vendorId, req.body);
      return successResponse(res, { vendor }, 200, 'Profile updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /vendors/me/photo
   */
  async updateStallPhoto(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.vendorId) {
        return errorResponse(res, 'Vendor authentication required', 401);
      }

      if (!req.file) {
        return errorResponse(res, 'No file uploaded', 400);
      }

      const result = await vendorsService.updateStallPhoto(
        req.vendorId,
        req.file.buffer,
        req.file.mimetype
      );

      return successResponse(res, result, 200, 'Stall photo updated');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /vendors/me/banner
   */
  async updateBannerPhoto(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.vendorId) {
        return errorResponse(res, 'Vendor authentication required', 401);
      }

      if (!req.file) {
        return errorResponse(res, 'No file uploaded', 400);
      }

      const result = await vendorsService.updateStallPhoto(
        req.vendorId,
        req.file.buffer,
        req.file.mimetype
      );

      return successResponse(res, result, 200, 'Stall photo updated');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /vendors/search
   */
  async searchVendors(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await vendorsService.searchVendors(req.query as any);
      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /vendors/nearby
   */
  async getNearbyVendors(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await vendorsService.getNearbyVendors(req.query as any);
      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /vendors/me/go-live
   */
  async goLive(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.vendorId) {
        return errorResponse(res, 'Vendor authentication required', 401);
      }

      const result = await vendorsService.goLive(req.vendorId, req.body);
      return successResponse(res, result, 200, 'You are now live');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /vendors/me/location
   */
  async updateLocation(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.vendorId) {
        return errorResponse(res, 'Vendor authentication required', 401);
      }

      const result = await vendorsService.updateLocation(req.vendorId, req.body);
      return successResponse(res, result);
    } catch (error: any) {
      if (error.message === 'Vendor is not live') {
        return errorResponse(res, error.message, 400);
      }
      next(error);
    }
  }

  /**
   * POST /vendors/me/go-offline
   */
  async goOffline(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.vendorId) {
        return errorResponse(res, 'Vendor authentication required', 401);
      }

      const result = await vendorsService.goOffline(req.vendorId);
      return successResponse(res, result, 200, 'You are now offline');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /vendors/:vendorId/menu
   */
  async getMenu(req: Request, res: Response, next: NextFunction) {
    try {
      const { vendorId } = req.params;
      if (!vendorId) {
        return errorResponse(res, 'Vendor ID is required', 400);
      }

      const vendor = await vendorsService.getVendorById(vendorId);
      return successResponse(res, { menu: vendor?.menuItems || [] });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /vendors/me/menu
   */
  async addMenuItem(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.vendorId) {
        return errorResponse(res, 'Vendor authentication required', 401);
      }

      const item = await vendorsService.addMenuItem(req.vendorId, req.body);
      return successResponse(res, { item }, 201, 'Menu item added');
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /vendors/me/menu/:itemId
   */
  async updateMenuItem(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.vendorId) {
        return errorResponse(res, 'Vendor authentication required', 401);
      }

      const itemId = req.params.itemId || '';
      if (!itemId) {
        return errorResponse(res, 'Menu item ID is required', 400);
      }

      const item = await vendorsService.updateMenuItem(req.vendorId, itemId, req.body);
      return successResponse(res, { item }, 200, 'Menu item updated');
    } catch (error: any) {
      if (error.message === 'Menu item not found') {
        return notFoundResponse(res, error.message);
      }
      next(error);
    }
  }

  /**
   * DELETE /vendors/me/menu/:itemId
   */
  async deleteMenuItem(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.vendorId) {
        return errorResponse(res, 'Vendor authentication required', 401);
      }

      const itemId = req.params.itemId || '';
      if (!itemId) {
        return errorResponse(res, 'Menu item ID is required', 400);
      }

      const result = await vendorsService.deleteMenuItem(req.vendorId, itemId);
      return successResponse(res, result, 200, 'Menu item deleted');
    } catch (error: any) {
      if (error.message === 'Menu item not found') {
        return notFoundResponse(res, error.message);
      }
      next(error);
    }
  }

  /**
   * GET /vendors/:vendorId/posts
   */
  async getVendorPosts(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { vendorId } = req.params;
      if (!vendorId) {
        return errorResponse(res, 'Vendor ID is required', 400);
      }

      const { cursor, limit } = req.query;
      const result = await vendorsService.getVendorPosts(
        vendorId,
        limit ? parseInt(limit as string) : undefined,
        cursor as string
      );

      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /vendors/:vendorId/ratings
   */
  async getVendorRatings(req: Request, res: Response, next: NextFunction) {
    try {
      const { vendorId } = req.params;
      if (!vendorId) {
        return errorResponse(res, 'Vendor ID is required', 400);
      }

      const result = await vendorsService.getVendorRatings(vendorId, req.query as any);
      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /vendors/me/analytics
   */
  async getAnalytics(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.vendorId) {
        return errorResponse(res, 'Vendor authentication required', 401);
      }

      // Get rating distribution as basic analytics
      const distribution = await vendorsService.getRatingDistribution(req.vendorId);
      const vendor = await vendorsService.getVendorById(req.vendorId);
      
      return successResponse(res, {
        ratings: distribution,
        followers_count: vendor?.followers_count ?? 0,
        total_ratings: vendor?.total_ratings ?? 0,
        rating_overall: vendor?.rating_overall ?? 0,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const vendorsController = new VendorsController();
