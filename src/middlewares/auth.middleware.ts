import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromHeader, TokenPayload } from '../utils/jwt';
import { AuthenticationError } from '../utils/errors';
import { db } from '../config/database';

declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      id: string;
      username: string;
      email?: string | null;
      trustScore: number;
      status: string;
    };
    userId?: string;
  }
}

/**
 * Middleware to authenticate JWT token
 */
export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    const payload: TokenPayload = verifyToken(token);

    if (payload.type !== 'access') {
      throw new AuthenticationError('Invalid token type');
    }

    // Fetch user from database
    const user = await db.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        username: true,
        email: true,
        trustScore: true,
        status: true,
      },
    });

    if (!user) {
      throw new AuthenticationError('User not found');
    }

    if (user.status !== 'ACTIVE') {
      throw new AuthenticationError('Account suspended or deleted');
    }

    // Attach user to request
    req.user = user;
    req.userId = user.id;

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Optional authentication - doesn't throw error if no token
 */
export const optionalAuthenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (req.headers.authorization) {
      const token = extractTokenFromHeader(req.headers.authorization);
      const payload: TokenPayload = verifyToken(token);

      if (payload.type === 'access') {
        const user = await db.user.findUnique({
          where: { id: payload.userId },
          select: {
            id: true,
            username: true,
            email: true,
            trustScore: true,
            status: true,
          },
        });

        if (user && user.status === 'ACTIVE') {
          req.user = user;
          req.userId = user.id;
        }
      }
    }
    next();
  } catch (error) {
    // Ignore errors for optional auth
    next();
  }
};
