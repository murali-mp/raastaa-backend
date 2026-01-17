import winston from 'winston';
import { env, isProd } from '../config/env';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  isProd
    ? winston.format.json()
    : winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
          let log = `${timestamp} [${level}]: ${message}`;
          if (Object.keys(meta).length > 0) {
            log += ` ${JSON.stringify(meta)}`;
          }
          if (stack) {
            log += `\n${stack}`;
          }
          return log;
        })
      )
);

export const logger = winston.createLogger({
  level: isProd ? 'info' : 'debug',
  format: logFormat,
  defaultMeta: { service: 'raastaa-api' },
  transports: [
    new winston.transports.Console(),
  ],
});

// Request logging helper
export function logRequest(method: string, path: string, statusCode: number, duration: number, userId?: string): void {
  const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
  logger.log(level, `${method} ${path} ${statusCode} ${duration}ms`, { userId });
}

// Error logging helper
export function logError(error: Error, context?: Record<string, unknown>): void {
  logger.error(error.message, {
    stack: error.stack,
    ...context,
  });
}

// Audit logging for sensitive operations
export function logAudit(action: string, userId: string, details?: Record<string, unknown>): void {
  logger.info(`AUDIT: ${action}`, {
    userId,
    ...details,
    timestamp: new Date().toISOString(),
  });
}
