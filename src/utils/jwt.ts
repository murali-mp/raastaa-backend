import jwt from 'jsonwebtoken';
import { AuthenticationError } from './errors';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-this-in-production';
const JWT_ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m';
const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '30d';

export interface TokenPayload {
  userId: string;
  type: 'access' | 'refresh';
}

export const generateAccessToken = (userId: string): string => {
  return jwt.sign(
    { userId, type: 'access' } as TokenPayload,
    JWT_SECRET,
    { expiresIn: JWT_ACCESS_EXPIRY }
  );
};

export const generateRefreshToken = (userId: string): string => {
  return jwt.sign(
    { userId, type: 'refresh' } as TokenPayload,
    JWT_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRY }
  );
};

export const verifyToken = (token: string): TokenPayload => {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return payload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AuthenticationError('Token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AuthenticationError('Invalid token');
    }
    throw new AuthenticationError('Token verification failed');
  }
};

export const extractTokenFromHeader = (authHeader?: string): string => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AuthenticationError('No token provided');
  }
  return authHeader.substring(7);
};
