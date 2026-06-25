import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';

function hashKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

// In-memory rate limit counters (per-process; use Redis for multi-instance)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const dailyLimitStore = new Map<string, { count: number; date: string }>();

function getTodayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function cleanupRateLimits() {
  const now = Date.now();
  const today = getTodayStr();
  for (const [key, val] of rateLimitStore) {
    if (val.resetAt < now) rateLimitStore.delete(key);
  }
  for (const [key, val] of dailyLimitStore) {
    if (val.date !== today) dailyLimitStore.delete(key);
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupRateLimits, 300000).unref();

export function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Missing API key. Include "Authorization: Bearer sk-..." header',
    });
  }

  const rawKey = authHeader.slice(7);
  const keyHash = hashKey(rawKey);

  // Look up key
  prisma.apiKey
    .findUnique({
      where: { keyHash },
      include: {
        user: {
          select: { id: true, email: true, role: true, plan: true },
        },
      },
    })
    .then((apiKey) => {
      if (!apiKey || !apiKey.isActive) {
        return res.status(401).json({ success: false, error: 'Invalid or revoked API key' });
      }

      // Check expiration
      if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
        return res.status(401).json({ success: false, error: 'API key expired' });
      }

      // Per-minute rate limit
      const minuteKey = `${apiKey.id}:${Math.floor(Date.now() / 60000)}`;
      const minuteEntry = rateLimitStore.get(minuteKey) || { count: 0, resetAt: Date.now() + 60000 };
      minuteEntry.count++;
      rateLimitStore.set(minuteKey, minuteEntry);

      if (minuteEntry.count > apiKey.rateLimit) {
        res.set('Retry-After', String(Math.ceil((minuteEntry.resetAt - Date.now()) / 1000)));
        return res.status(429).json({
          success: false,
          error: 'Rate limit exceeded',
          limit: apiKey.rateLimit,
          retryAfter: Math.ceil((minuteEntry.resetAt - Date.now()) / 1000),
        });
      }

      // Daily limit
      const today = getTodayStr();
      const dailyKey = apiKey.id;
      const dailyEntry = dailyLimitStore.get(dailyKey) || { count: 0, date: today };
      if (dailyEntry.date !== today) {
        dailyEntry.count = 0;
        dailyEntry.date = today;
      }
      dailyEntry.count++;
      dailyLimitStore.set(dailyKey, dailyEntry);

      if (dailyEntry.count > apiKey.dailyLimit) {
        return res.status(429).json({
          success: false,
          error: 'Daily limit exceeded',
          limit: apiKey.dailyLimit,
          used: dailyEntry.count,
        });
      }

      // Set rate limit headers
      res.set('X-RateLimit-Limit', String(apiKey.rateLimit));
      res.set('X-RateLimit-Remaining', String(Math.max(0, apiKey.rateLimit - minuteEntry.count)));
      res.set('X-DailyLimit-Limit', String(apiKey.dailyLimit));
      res.set('X-DailyLimit-Remaining', String(Math.max(0, apiKey.dailyLimit - dailyEntry.count)));

      // Attach API context to request
      req.apiKey = {
        id: apiKey.id,
        tier: apiKey.tier,
        permissions: JSON.parse(apiKey.permissions as string),
        userId: apiKey.userId,
      };
      // Also set req.user for downstream middleware
      req.user = {
        id: apiKey.user.id,
        email: apiKey.user.email,
        role: apiKey.user.role,
      };

      // Update lastUsedAt async
      prisma.apiKey
        .update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } })
        .catch(() => {});

      next();
    })
    .catch(() => {
      return res.status(500).json({ success: false, error: 'API key validation failed' });
    });
}

// Permission check middleware factory
export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const apiKey = req.apiKey;
    if (!apiKey) {
      return res.status(403).json({ success: false, error: 'API key context required' });
    }

    const perms: string[] = apiKey.permissions;
    if (perms.includes('*') || perms.includes(permission)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: `Permission denied. Required: ${permission}`,
      yourTier: apiKey.tier,
      yourPermissions: perms,
    });
  };
}

// Log API usage (call after response completes)
export function logApiUsage(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  const apiKey = req.apiKey;

  res.on('finish', () => {
    if (!apiKey) return;
    const duration = Date.now() - startTime;
    prisma.apiUsageLog
      .create({
        data: {
          apiKeyId: apiKey.id,
          endpoint: req.path,
          method: req.method,
          status: res.statusCode,
          duration,
        },
      })
      .catch(() => {});
  });

  next();
}
