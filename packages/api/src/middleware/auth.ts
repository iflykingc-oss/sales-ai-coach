import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';

// Centralized JWT secret — always required, no fallback
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  return secret;
}

// Validate JWT_SECRET exists at module load (fail fast on startup)
try {
  getJwtSecret();
} catch {
  // Will throw on first request if missing — logged as warning
  console.warn('WARNING: JWT_SECRET not set. Authentication will fail at runtime.');
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

/**
 * Full auth middleware that also verifies user exists in DB and role is current.
 * Use for sensitive operations (admin, team management, compliance).
 */
export async function authMiddlewareVerified(req: Request, res: Response, next: NextFunction) {
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

    // Verify user still exists and role hasn't changed
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, role: true },
    });

    if (!user) {
      return res.status(401).json({ success: false, error: 'User no longer exists' });
    }

    // Use DB role (in case user was demoted since token was issued)
    req.user = { id: user.id, email: user.email, role: user.role };
    next();
  } catch {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}

/**
 * SECURITY WARNING: this middleware does NOT reject unauthenticated
 * requests. It only tries to parse a token if one is present. If you
 * use this, you MUST check `req.user` inside the route handler and
 * return 401 if it is missing. Used in routes that work for both anon
 * and authenticated users (e.g. public landing pages with personalization).
 */
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
  if (role !== 'ADMIN') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }
  next();
}

export function requireTeamOwner(req: Request, res: Response, next: NextFunction) {
  const role = req.user?.role;
  if (role !== 'ADMIN' && role !== 'TEAM_OWNER') {
    return res.status(403).json({ success: false, error: 'Team owner or admin access required' });
  }
  next();
}
