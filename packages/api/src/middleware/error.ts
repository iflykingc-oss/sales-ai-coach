import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function errorMiddleware(err: Error, req: Request, res: Response, next: NextFunction) {
  console.error('[Error]', err);

  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      details: err.errors.reduce((acc, e) => {
        const key = e.path.join('.');
        acc[key] = e.message;
        return acc;
      }, {} as Record<string, string>),
    });
  }

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

  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : 'An error occurred',
  });
}
