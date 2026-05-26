import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Centralized JWT secret — throws in production if not configured
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is required in production');
  }
  return secret || 'dev-secret-do-not-use-in-production';
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.accessToken || req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as {
      id: string;
      email: string;
      role: string;
    };
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}

export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.accessToken || req.headers.authorization?.split(' ')[1];
  if (token) {
    try {
      const decoded = jwt.verify(token, getJwtSecret()) as {
        id: string;
        email: string;
        role: string;
      };
      req.user = decoded;
    } catch {
      // Token invalid, but that's OK for optional auth
    }
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const role = req.user?.role;
  if (role !== 'ADMIN' && role !== 'TEAM_OWNER') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }
  next();
}
