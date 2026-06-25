import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../lib/logger.js';

const isProd = process.env.NODE_ENV === 'production';

export function errorMiddleware(err: Error, req: Request, res: Response, _next: NextFunction) {
  // Always log the full error server-side with request context
  logger.error('Request error', err, {
    method: req.method,
    path: req.path,
    requestId: req.headers['x-request-id'],
  });

  // Zod validation errors — hide field details in production
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: isProd ? 'Invalid request parameters' : 'Validation error',
      ...(isProd ? {} : {
        details: err.errors.reduce((acc, e) => {
          const key = e.path.join('.');
          acc[key] = e.message;
          return acc;
        }, {} as Record<string, string>),
      }),
    });
  }

  // Prisma known errors
  if (err.name === 'PrismaClientKnownRequestError') {
    const code = (err as any).code;
    if (code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: 'A record with this value already exists',
      });
    }
    if (code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Record not found',
      });
    }
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
    });
  }

  // Rate limit errors
  if (err.name === 'RateLimitError' || (err as any).status === 429) {
    return res.status(429).json({
      success: false,
      error: 'Too many requests',
    });
  }

  // Generic 500 — never leak internals in production
  res.status(500).json({
    success: false,
    error: isProd ? 'Internal server error' : err.message || 'An error occurred',
  });
}
