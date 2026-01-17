import { Response, NextFunction } from 'express';
import { uploadsService } from './uploads.service';
import { successResponse, errorResponse } from '../../utils/response';
import { AuthRequest } from '../../middleware/auth';

export class UploadsController {
  /**
   * Get presigned URL for file upload
   */
  getPresignedUrl = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId && !req.vendorId) {
        errorResponse(res, 'Authentication required', 401);
        return;
      }
      const userId = req.userId || req.vendorId!;
      const result = await uploadsService.getPresignedUrl(userId, req.body);
      successResponse(res, result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get presigned URLs for batch upload
   */
  getBatchPresignedUrls = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId && !req.vendorId) {
        errorResponse(res, 'Authentication required', 401);
        return;
      }
      const userId = req.userId || req.vendorId!;
      const result = await uploadsService.getBatchPresignedUrls(userId, req.body);
      successResponse(res, result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete a file
   */
  deleteFile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId && !req.vendorId) {
        errorResponse(res, 'Authentication required', 401);
        return;
      }
      const result = await uploadsService.deleteFileByUrl(req.body);
      successResponse(res, result);
    } catch (error: any) {
      if (error.message === 'Invalid file URL') {
        errorResponse(res, error.message, 400);
        return;
      }
      next(error);
    }
  };
}

export const uploadsController = new UploadsController();
