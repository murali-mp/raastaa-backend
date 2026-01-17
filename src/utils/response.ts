import { Response } from 'express';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: {
    total_count?: number;
    next_cursor?: string | null;
    has_more?: boolean;
  };
}

export function successResponse<T>(
  res: Response,
  data: T,
  statusCode = 200,
  message?: string
): Response {
  const response: ApiResponse<T> = {
    success: true,
    data,
  };
  if (message) response.message = message;
  return res.status(statusCode).json(response);
}

export function errorResponse(
  res: Response,
  error: string,
  statusCode = 400
): Response {
  return res.status(statusCode).json({
    success: false,
    error,
  });
}

export function paginatedResponse<T>(
  res: Response,
  items: T[],
  nextCursor: string | null,
  totalCount?: number,
  hasMore?: boolean
): Response {
  return res.status(200).json({
    success: true,
    data: items,
    meta: {
      total_count: totalCount,
      next_cursor: nextCursor,
      has_more: hasMore ?? nextCursor !== null,
    },
  });
}

export function createdResponse<T>(res: Response, data: T, message?: string): Response {
  return successResponse(res, data, 201, message);
}

export function noContentResponse(res: Response): Response {
  return res.status(204).send();
}

export function notFoundResponse(res: Response, message = 'Resource not found'): Response {
  return errorResponse(res, message, 404);
}

export function unauthorizedResponse(res: Response, message = 'Unauthorized'): Response {
  return errorResponse(res, message, 401);
}

export function forbiddenResponse(res: Response, message = 'Forbidden'): Response {
  return errorResponse(res, message, 403);
}

export function validationErrorResponse(res: Response, errors: string[]): Response {
  return res.status(422).json({
    success: false,
    error: 'Validation failed',
    details: errors,
  });
}

export function conflictResponse(res: Response, message = 'Resource already exists'): Response {
  return errorResponse(res, message, 409);
}

export function tooManyRequestsResponse(res: Response, message = 'Too many requests'): Response {
  return errorResponse(res, message, 429);
}

export function serverErrorResponse(res: Response, message = 'Internal server error'): Response {
  return errorResponse(res, message, 500);
}
