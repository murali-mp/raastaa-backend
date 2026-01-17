import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { 
  successResponse, 
  createdResponse, 
  errorResponse, 
  unauthorizedResponse, 
  conflictResponse 
} from '../../utils/response';
import { AuthRequest } from '../../middleware/auth';

export class AuthController {
  /**
   * POST /auth/register/user
   */
  async registerUser(req: Request, res: Response, next: NextFunction) {
    try {
      const ip = req.ip || req.socket.remoteAddress || 'unknown';

      // Check if email is available
      const emailAvailable = await authService.isEmailAvailable(req.body.email);
      if (!emailAvailable) {
        return conflictResponse(res, 'Email is already registered');
      }

      // Check if phone is available
      const phoneAvailable = await authService.isPhoneAvailable(req.body.phone);
      if (!phoneAvailable) {
        return conflictResponse(res, 'Phone number is already registered');
      }

      // Check if username is available
      const usernameAvailable = await authService.isUsernameAvailable(req.body.username);
      if (!usernameAvailable) {
        return conflictResponse(res, 'Username is already taken');
      }

      const result = await authService.registerUser(req.body, ip);
      return createdResponse(res, result, 'User registered successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/register/vendor
   */
  async registerVendor(req: Request, res: Response, next: NextFunction) {
    try {
      // Check if email is available
      const emailAvailable = await authService.isEmailAvailable(req.body.email, true);
      if (!emailAvailable) {
        return conflictResponse(res, 'Email is already registered');
      }

      // Check if phone is available
      const phoneAvailable = await authService.isPhoneAvailable(req.body.phone, true);
      if (!phoneAvailable) {
        return conflictResponse(res, 'Phone number is already registered');
      }

      const result = await authService.registerVendor(req.body);
      return createdResponse(res, result, result.message);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/login
   */
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.login(req.body);
      return successResponse(res, result, 200, 'Login successful');
    } catch (error: any) {
      if (error.message === 'Invalid credentials') {
        return unauthorizedResponse(res, 'Invalid credentials');
      }
      if (error.message?.includes('Account is')) {
        return unauthorizedResponse(res, error.message);
      }
      next(error);
    }
  }

  /**
   * POST /auth/refresh
   */
  async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { refresh_token } = req.body;

      if (!refresh_token) {
        return errorResponse(res, 'Refresh token is required', 400);
      }

      const tokens = await authService.refreshTokens(refresh_token);
      return successResponse(res, { tokens }, 200, 'Token refreshed successfully');
    } catch (error: any) {
      if (error.message?.includes('invalid') || error.message?.includes('expired')) {
        return unauthorizedResponse(res, 'Invalid or expired refresh token');
      }
      next(error);
    }
  }

  /**
   * POST /auth/logout
   */
  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const { refresh_token } = req.body;

      if (refresh_token) {
        await authService.logout(refresh_token);
      }

      return successResponse(res, null, 200, 'Logged out successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/change-password
   */
  async changePassword(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.userId || req.vendorId;
      const isVendor = !!req.vendorId;

      if (!userId) {
        return unauthorizedResponse(res, 'Authentication required');
      }

      await authService.changePassword(userId, req.body, isVendor);
      return successResponse(res, null, 200, 'Password changed successfully');
    } catch (error: any) {
      if (error.message === 'Current password is incorrect') {
        return errorResponse(res, error.message, 400);
      }
      next(error);
    }
  }

  /**
   * GET /auth/me
   */
  async getMe(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (req.userId) {
        const user = await authService.getUserById(req.userId);
        return successResponse(res, { user }, 200, 'User retrieved successfully');
      }

      if (req.vendorId) {
        const vendor = await authService.getVendorById(req.vendorId);
        return successResponse(res, { vendor }, 200, 'Vendor retrieved successfully');
      }

      return unauthorizedResponse(res, 'Authentication required');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /auth/check/username/:username
   */
  async checkUsername(req: Request, res: Response, next: NextFunction) {
    try {
      const username = req.params.username;
      if (!username) {
        return errorResponse(res, 'Username is required', 400);
      }
      const available = await authService.isUsernameAvailable(username);
      return successResponse(res, { available }, 200, available ? 'Username is available' : 'Username is taken');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /auth/check/email
   */
  async checkEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const email = req.query.email as string;
      const forVendor = req.query.vendor === 'true';

      if (!email) {
        return errorResponse(res, 'Email is required', 400);
      }

      const available = await authService.isEmailAvailable(email, forVendor);
      return successResponse(res, { available }, 200, available ? 'Email is available' : 'Email is taken');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /auth/check/phone
   */
  async checkPhone(req: Request, res: Response, next: NextFunction) {
    try {
      const phone = req.query.phone as string;
      const forVendor = req.query.vendor === 'true';

      if (!phone) {
        return errorResponse(res, 'Phone is required', 400);
      }

      const available = await authService.isPhoneAvailable(phone, forVendor);
      return successResponse(res, { available }, 200, available ? 'Phone is available' : 'Phone is taken');
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
