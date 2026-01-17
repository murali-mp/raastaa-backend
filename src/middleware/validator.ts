import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError, ZodIssue } from 'zod';
import { validationErrorResponse } from '../utils/response';

function formatZodErrors(error: ZodError): string[] {
  return error.issues.map((e: ZodIssue) => `${e.path.join('.')}: ${e.message}`);
}

/**
 * Validate request body against a Zod schema
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        validationErrorResponse(res, formatZodErrors(error));
        return;
      }
      next(error);
    }
  };
}

/**
 * Validate request query params against a Zod schema
 * Uses 'any' for flexibility with transforms
 */
export function validateQuery(schema: ZodSchema<any>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.query = schema.parse(req.query) as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        validationErrorResponse(res, formatZodErrors(error));
        return;
      }
      next(error);
    }
  };
}

/**
 * Validate request params against a Zod schema
 */
export function validateParams(schema: ZodSchema<any>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.params = schema.parse(req.params) as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        validationErrorResponse(res, formatZodErrors(error));
        return;
      }
      next(error);
    }
  };
}

/**
 * Combined validation for body, query, and params
 */
export function validate<B, Q, P>(schemas: {
  body?: ZodSchema<B>;
  query?: ZodSchema<Q>;
  params?: ZodSchema<P>;
}) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      if (schemas.query) {
        req.query = schemas.query.parse(req.query) as any;
      }
      if (schemas.params) {
        req.params = schemas.params.parse(req.params) as any;
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        validationErrorResponse(res, formatZodErrors(error));
        return;
      }
      next(error);
    }
  };
}
