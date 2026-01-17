import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { logger, logError } from '../utils/logger';
import { errorResponse, serverErrorResponse } from '../utils/response';
import { isProd } from '../config/env';

/**
 * Global error handler middleware
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  logError(err, {
    path: req.path,
    method: req.method,
    body: isProd ? undefined : req.body,
    query: req.query,
    userId: (req as any).userId,
  });

  // Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    handlePrismaError(err, res);
    return;
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    errorResponse(res, 'Invalid data provided', 422);
    return;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    errorResponse(res, 'Invalid token', 401);
    return;
  }

  if (err.name === 'TokenExpiredError') {
    errorResponse(res, 'Token expired', 401);
    return;
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    errorResponse(res, err.message, 422);
    return;
  }

  // Multer errors
  if (err.name === 'MulterError') {
    handleMulterError(err, res);
    return;
  }

  // Syntax errors (malformed JSON)
  if (err instanceof SyntaxError && 'body' in err) {
    errorResponse(res, 'Invalid JSON', 400);
    return;
  }

  // Default error
  serverErrorResponse(
    res,
    isProd ? 'Internal server error' : err.message
  );
}

/**
 * Handle Prisma-specific errors
 */
function handlePrismaError(err: Prisma.PrismaClientKnownRequestError, res: Response): void {
  switch (err.code) {
    case 'P2002': // Unique constraint violation
      const field = (err.meta?.target as string[])?.join(', ') || 'field';
      errorResponse(res, `A record with this ${field} already exists`, 409);
      break;

    case 'P2003': // Foreign key constraint violation
      errorResponse(res, 'Related record not found', 400);
      break;

    case 'P2025': // Record not found
      errorResponse(res, 'Record not found', 404);
      break;

    case 'P2014': // Required relation violation
      errorResponse(res, 'Required relation missing', 400);
      break;

    case 'P2016': // Query interpretation error
      errorResponse(res, 'Invalid query', 400);
      break;

    default:
      logger.error('Unhandled Prisma error:', { code: err.code, message: err.message });
      serverErrorResponse(res, 'Database error');
  }
}

/**
 * Handle Multer-specific errors
 */
function handleMulterError(err: Error, res: Response): void {
  const multerErr = err as any;
  
  switch (multerErr.code) {
    case 'LIMIT_FILE_SIZE':
      errorResponse(res, 'File too large', 413);
      break;

    case 'LIMIT_FILE_COUNT':
      errorResponse(res, 'Too many files', 400);
      break;

    case 'LIMIT_UNEXPECTED_FILE':
      errorResponse(res, 'Unexpected file field', 400);
      break;

    default:
      errorResponse(res, 'File upload error', 400);
  }
}

/**
 * 404 handler
 */
export function notFoundHandler(req: Request, res: Response): void {
  errorResponse(res, `Route ${req.method} ${req.path} not found`, 404);
}

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
