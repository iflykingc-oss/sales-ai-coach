import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import Redis from 'ioredis';
import { prisma } from '../lib/prisma.js';

function hashKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

// ---------------------------------------------------------------------------
// Redis-backed rate limiter (sliding window + daily counter).
// Falls back to in-memory if REDIS_URL is not set; logs a warning on init.
// ---------------------------------------------------------------------------

interface RateLimitBackend {
  incrementMinute(apiKeyId: string, limit: number): Promise<{ allowed: boolean; count: number; resetAt: number }>;
  incrementDaily(apiKeyId: string, limit: number): Promise<{ allowed: boolean; count: number }>;
  ping(): Promise<boolean>;
}

class RedisBackend implements RateLimitBackend {
  private client: Redis;
  constructor(url: string) {
    this.client = new Redis(url, {
      maxRetriesPerRequest: 1,
      lazyConnect: false,
      enableOfflineQueue: false,
    });
    this.client.on('error', (e) => {
      // Don't crash; the limiter will fall back per-call.
      console.warn('[rate-limit] redis error:', e.message);
    });
  }

  async ping(): Promise<boolean> {
    try {
      const r = await this.client.ping();
      return r === 'PONG';
    } catch {
      return false;
    }
  }

  private minuteKey(apiKeyId: string, now: number): string {
    return `rl:api:min:${apiKeyId}:${Math.floor(now / 60000)}`;
  }
  private dailyKey(apiKeyId: string, day: string): string {
    return `rl:api:day:${apiKeyId}:${day}`;
  }

  async incrementMinute(apiKeyId: string, limit: number) {
    const now = Date.now();
    const k = this.minuteKey(apiKeyId, now);
    const resetAt = Math.floor(now / 60000) * 60000 + 60000;
    const count = await this.client.incr(k);
    if (count === 1) {
      await this.client.expire(k, 90); // 60s window + slack
    }
    return { allowed: count <= limit, count, resetAt };
  }

  async incrementDaily(apiKeyId: string, limit: number) {
    const day = new Date().toISOString().slice(0, 10);
    const k = this.dailyKey(apiKeyId, day);
    const count = await this.client.incr(k);
    if (count === 1) {
      // Set expiry at end of day (UTC) + slack
      const tomorrow = new Date();
      tomorrow.setUTCHours(24, 0, 0, 0);
      const ttl = Math.max(60, Math.floor((tomorrow.getTime() - Date.now()) / 1000));
      await this.client.expire(k, ttl);
    }
    return { allowed: count <= limit, count };
  }
}

class InMemoryBackend implements RateLimitBackend {
  private minute = new Map<string, { count: number; resetAt: number }>();
  private daily = new Map<string, { count: number; date: string }>();

  async ping() { return true; }

  async incrementMinute(apiKeyId: string, limit: number) {
    const now = Date.now();
    const k = apiKeyId;
    const e = this.minute.get(k);
    if (!e || e.resetAt < now) {
      const resetAt = Math.floor(now / 60000) * 60000 + 60000;
      const fresh = { count: 1, resetAt };
      this.minute.set(k, fresh);
      return { allowed: true, count: 1, resetAt };
    }
    e.count++;
    return { allowed: e.count <= limit, count: e.count, resetAt: e.resetAt };
  }

  async incrementDaily(apiKeyId: string, limit: number) {
    const day = new Date().toISOString().slice(0, 10);
    const e = this.daily.get(apiKeyId);
    if (!e || e.date !== day) {
      this.daily.set(apiKeyId, { count: 1, date: day });
      return { allowed: true, count: 1 };
    }
    e.count++;
    return { allowed: e.count <= limit, count: e.count };
  }
}

let _backend: RateLimitBackend | null = null;
function getBackend(): RateLimitBackend {
  if (_backend) return _backend;
  if (process.env.REDIS_URL) {
    const r = new RedisBackend(process.env.REDIS_URL);
    // Probe; if it fails, fall back. (No async top-level wait.)
    r.ping().then((ok) => {
      if (!ok) {
        console.warn('[rate-limit] redis unreachable; using in-memory backend');
      }
    });
    _backend = r;
    console.log('[rate-limit] using redis at', process.env.REDIS_URL);
  } else {
    console.warn(
      '[rate-limit] REDIS_URL not set. Using in-memory backend. ' +
        'Multi-instance deploys will undercount. Vulnerable to memory-exhaustion DoS.'
    );
    _backend = new InMemoryBackend();
  }
  return _backend;
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

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

  prisma.apiKey
    .findUnique({
      where: { keyHash },
      include: {
        user: { select: { id: true, email: true, role: true, plan: true } },
      },
    })
    .then(async (apiKey) => {
      if (!apiKey || !apiKey.isActive) {
        return res.status(401).json({ success: false, error: 'Invalid or revoked API key' });
      }
      if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
        return res.status(401).json({ success: false, error: 'API key expired' });
      }

      const backend = getBackend();
      const [min, day] = await Promise.all([
        backend.incrementMinute(apiKey.id, apiKey.rateLimit),
        backend.incrementDaily(apiKey.id, apiKey.dailyLimit),
      ]);

      // Headers
      res.set('X-RateLimit-Limit', String(apiKey.rateLimit));
      res.set('X-RateLimit-Remaining', String(Math.max(0, apiKey.rateLimit - min.count)));
      res.set('X-DailyLimit-Limit', String(apiKey.dailyLimit));
      res.set('X-DailyLimit-Remaining', String(Math.max(0, apiKey.dailyLimit - day.count)));

      if (!min.allowed) {
        res.set('Retry-After', String(Math.ceil((min.resetAt - Date.now()) / 1000)));
        return res.status(429).json({
          success: false,
          error: 'Rate limit exceeded',
          limit: apiKey.rateLimit,
          retryAfter: Math.ceil((min.resetAt - Date.now()) / 1000),
        });
      }
      if (!day.allowed) {
        return res.status(429).json({
          success: false,
          error: 'Daily limit exceeded',
          limit: apiKey.dailyLimit,
          used: day.count,
        });
      }

      req.apiKey = {
        id: apiKey.id,
        tier: apiKey.tier,
        permissions: JSON.parse(apiKey.permissions as string),
        userId: apiKey.userId,
      };
      req.user = {
        id: apiKey.user.id,
        email: apiKey.user.email,
        role: apiKey.user.role,
      };

      prisma.apiKey
        .update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } })
        .catch(() => {});

      next();
    })
    .catch(() => {
      return res.status(500).json({ success: false, error: 'API key validation failed' });
    });
}

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
