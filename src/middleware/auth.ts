import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { redis } from '../config/redis';
import { errorResponse, unauthorizedResponse, forbiddenResponse } from '../utils/response';
import { prisma } from '../config/database';
import { CACHE_KEYS } from '../utils/constants';

export interface JWTPayload {
  uuid: string;
  type: 'user' | 'vendor';
  isAdmin?: boolean;
  iat?: number;
  exp?: number;
}

export interface AuthRequest extends Request {
  user?: JWTPayload;
  userId?: string;
  vendorId?: string;
}

/**
 * Authenticate request using JWT
 */
export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    unauthorizedResponse(res, 'No token provided');
    return;
  }

  const token = authHeader.split(' ')[1];
  
  if (!token) {
    unauthorizedResponse(res, 'No token provided');
    return;
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JWTPayload;
    req.user = payload;
    
    if (payload.type === 'user') {
      req.userId = payload.uuid;
    } else if (payload.type === 'vendor') {
      req.vendorId = payload.uuid;
    }
    
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      unauthorizedResponse(res, 'Token expired');
      return;
    }
    unauthorizedResponse(res, 'Invalid token');
  }
}

/**
 * Optional authentication - doesn't fail if no token
 */
export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    next();
    return;
  }

  const token = authHeader.split(' ')[1];
  
  if (!token) {
    next();
    return;
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JWTPayload;
    req.user = payload;
    
    if (payload.type === 'user') {
      req.userId = payload.uuid;
    } else if (payload.type === 'vendor') {
      req.vendorId = payload.uuid;
    }
  } catch {
    // Ignore errors for optional auth
  }
  
  next();
}

/**
 * Require user type authentication
 */
export function requireUser(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    unauthorizedResponse(res, 'Authentication required');
    return;
  }
  
  if (req.user.type !== 'user') {
    forbiddenResponse(res, 'User access required');
    return;
  }
  
  next();
}

/**
 * Require vendor type authentication
 */
export function requireVendor(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    unauthorizedResponse(res, 'Authentication required');
    return;
  }
  
  if (req.user.type !== 'vendor') {
    forbiddenResponse(res, 'Vendor access required');
    return;
  }
  
  next();
}

/**
 * Require admin authentication
 */
export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    unauthorizedResponse(res, 'Authentication required');
    return;
  }
  
  if (!req.user.isAdmin) {
    forbiddenResponse(res, 'Admin access required');
    return;
  }
  
  next();
}

/**
 * Check if user account is active
 */
export async function requireActiveAccount(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  if (!req.user || !req.userId) {
    unauthorizedResponse(res, 'Authentication required');
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { uuid: req.userId },
      select: { account_status: true },
    });

    if (!user) {
      unauthorizedResponse(res, 'User not found');
      return;
    }

    if (user.account_status !== 'ACTIVE') {
      forbiddenResponse(res, `Account is ${user.account_status.toLowerCase()}`);
      return;
    }

    next();
  } catch {
    errorResponse(res, 'Failed to verify account status', 500);
  }
}

/**
 * Check if vendor is verified
 */
export async function requireVerifiedVendor(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  if (!req.user || !req.vendorId) {
    unauthorizedResponse(res, 'Vendor authentication required');
    return;
  }

  try {
    const vendor = await prisma.vendor.findUnique({
      where: { uuid: req.vendorId },
      select: { verification_status: true },
    });

    if (!vendor) {
      unauthorizedResponse(res, 'Vendor not found');
      return;
    }

    const verifiedStatuses = ['VERIFIED', 'PREMIUM'];
    if (!verifiedStatuses.includes(vendor.verification_status)) {
      forbiddenResponse(res, 'Vendor verification required');
      return;
    }

    next();
  } catch {
    errorResponse(res, 'Failed to verify vendor status', 500);
  }
}

/**
 * Verify refresh token
 */
export async function verifyRefreshToken(token: string): Promise<JWTPayload & { jti: string }> {
  const payload = jwt.verify(token, env.JWT_SECRET) as JWTPayload & { jti: string };
  
  // Check if token exists in Redis (not revoked)
  const stored = await redis.get(CACHE_KEYS.SESSION(payload.jti));
  if (!stored) {
    throw new Error('Token revoked');
  }
  
  return payload;
}

/**
 * Create access token
 */
export function createAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: '15m',
  });
}

/**
 * Create refresh token
 */
export async function createRefreshToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string> {
  const { v4: uuidv4 } = await import('uuid');
  const jti = uuidv4();
  
  const token = jwt.sign(
    { ...payload, jti },
    env.JWT_SECRET,
    { expiresIn: '7d' }
  );
  
  // Store in Redis
  await redis.setex(
    CACHE_KEYS.SESSION(jti),
    7 * 24 * 60 * 60, // 7 days
    JSON.stringify(payload)
  );
  
  return token;
}

/**
 * Revoke refresh token
 */
export async function revokeRefreshToken(token: string): Promise<void> {
  try {
    const payload = jwt.decode(token) as { jti?: string } | null;
    if (payload?.jti) {
      await redis.del(CACHE_KEYS.SESSION(payload.jti));
    }
  } catch {
    // Ignore errors during revocation
  }
}

/**
 * Generate token pair
 */
export async function generateTokenPair(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<{
  accessToken: string;
  refreshToken: string;
}> {
  const accessToken = createAccessToken(payload);
  const refreshToken = await createRefreshToken(payload);
  
  return { accessToken, refreshToken };
}
