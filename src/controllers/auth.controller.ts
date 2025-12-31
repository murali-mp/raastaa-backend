import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { generateAccessToken, verifyToken } from '../utils/jwt';
import { AuthenticationError } from '../utils/errors';

export class AuthController {
  /**
   * POST /api/v1/auth/signup
   */
  async signup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.signup(req.body);
      res.status(201).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/auth/login
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.login(req.body);
      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/auth/refresh
   */
  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        throw new AuthenticationError('Refresh token required');
      }

      const payload = verifyToken(refreshToken);
      
      if (payload.type !== 'refresh') {
        throw new AuthenticationError('Invalid token type');
      }

      // Generate new access token
      const accessToken = generateAccessToken(payload.userId);

      res.status(200).json({
        status: 'success',
        data: {
          accessToken,
          expiresIn: 900,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/auth/me
   */
  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.userId) {
        throw new AuthenticationError();
      }

      const user = await authService.getUserById(req.userId);
      
      res.status(200).json({
        status: 'success',
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/auth/password
   */
  async updatePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.userId) {
        throw new AuthenticationError();
      }

      const { oldPassword, newPassword } = req.body;
      await authService.updatePassword(req.userId, oldPassword, newPassword);

      res.status(200).json({
        status: 'success',
        message: 'Password updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/auth/apple
   */
  async appleSignIn(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { providerUserId, email, displayName } = req.body;

      const result = await authService.socialAuth(
        'APPLE',
        providerUserId,
        email,
        displayName
      );

      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/auth/google
   */
  async googleSignIn(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { providerUserId, email, displayName } = req.body;

      const result = await authService.socialAuth(
        'GOOGLE',
        providerUserId,
        email,
        displayName
      );

      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/auth/logout
   */
  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // In a stateless JWT system, logout is handled client-side
      // Here we could blacklist the token in Redis if needed
      
      res.status(200).json({
        status: 'success',
        message: 'Logged out successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
