import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { z } from 'zod';

const router = Router();

// All routes require auth
router.use(authMiddleware);

const createKeySchema = z.object({
  name: z.string().min(1).max(100),
  tier: z.enum(['BASIC', 'STANDARD', 'PREMIUM', 'ENTERPRISE']).default('BASIC'),
  permissions: z.array(z.string()).default([]),
  rateLimit: z.number().int().min(1).max(10000).default(100),
  dailyLimit: z.number().int().min(1).max(100000).default(1000),
  expiresInDays: z.number().int().min(1).max(365).optional(),
});

// Tier-based default permissions
const TIER_PERMISSIONS: Record<string, string[]> = {
  BASIC: ['scripts:read', 'scenarios:read'],
  STANDARD: ['scripts:read', 'scripts:generate', 'scenarios:read', 'knowledge:read'],
  PREMIUM: ['scripts:read', 'scripts:generate', 'scenarios:read', 'knowledge:read', 'practices:create', 'reviews:create'],
  ENTERPRISE: ['*'],
};

const TIER_RATE_LIMITS: Record<string, { rate: number; daily: number }> = {
  BASIC: { rate: 30, daily: 500 },
  STANDARD: { rate: 100, daily: 2000 },
  PREMIUM: { rate: 300, daily: 10000 },
  ENTERPRISE: { rate: 1000, daily: 100000 },
};

// Generate API key: sk-{tier_prefix}-{random32}
function generateApiKey(tier: string): string {
  const prefix = tier.toLowerCase().slice(0, 3);
  const random = crypto.randomBytes(24).toString('base64url');
  return `sk-${prefix}-${random}`;
}

function hashKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

// POST /api-keys — Create new API key
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const body = createKeySchema.parse(req.body);

    // Check plan — only PROFESSIONAL+ can create API keys
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true, apiKeys: { select: { id: true } } },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (user.plan === 'FREE') {
      return res.status(403).json({
        success: false,
        error: 'API access requires Professional plan or above',
        upgradeUrl: '/pricing',
      });
    }

    // Limit number of keys per plan
    const maxKeys: Record<string, number> = {
      FREE: 0,
      PROFESSIONAL: 3,
      TEAM: 10,
      ENTERPRISE: 50,
    };
    if (user.apiKeys.length >= (maxKeys[user.plan] || 0)) {
      return res.status(400).json({
        success: false,
        error: `Maximum API keys reached for ${user.plan} plan`,
      });
    }

    // Tier restriction — can't create a tier higher than plan
    const planTierOrder = ['BASIC', 'STANDARD', 'PREMIUM', 'ENTERPRISE'];
    const planMaxTier: Record<string, number> = {
      PROFESSIONAL: 1, // STANDARD
      TEAM: 2,         // PREMIUM
      ENTERPRISE: 3,   // ENTERPRISE
    };
    const requestedTierIdx = planTierOrder.indexOf(body.tier);
    if (requestedTierIdx > (planMaxTier[user.plan] || 0)) {
      return res.status(403).json({
        success: false,
        error: `${body.tier} tier requires a higher plan`,
      });
    }

    const rawKey = generateApiKey(body.tier);
    const keyHash = hashKey(rawKey);
    const keyPrefix = rawKey.slice(0, 12); // "sk-bas-abc1..."

    const tierDefaults = TIER_RATE_LIMITS[body.tier] || TIER_RATE_LIMITS.BASIC;
    const permissions = body.permissions.length > 0 ? body.permissions : TIER_PERMISSIONS[body.tier] || [];

    const apiKey = await prisma.apiKey.create({
      data: {
        userId,
        name: body.name,
        keyHash,
        keyPrefix,
        tier: body.tier as any,
        permissions: JSON.stringify(permissions),
        rateLimit: Math.min(body.rateLimit, tierDefaults.rate),
        dailyLimit: Math.min(body.dailyLimit, tierDefaults.daily),
        expiresAt: body.expiresInDays
          ? new Date(Date.now() + body.expiresInDays * 86400000)
          : null,
      },
    });

    // Return the raw key ONLY on creation — never shown again
    return res.status(201).json({
      success: true,
      data: {
        id: apiKey.id,
        name: apiKey.name,
        key: rawKey, // Show once
        keyPrefix: apiKey.keyPrefix,
        tier: apiKey.tier,
        permissions: JSON.parse(apiKey.permissions as string),
        rateLimit: apiKey.rateLimit,
        dailyLimit: apiKey.dailyLimit,
        expiresAt: apiKey.expiresAt,
        createdAt: apiKey.createdAt,
      },
      message: 'Save this API key securely — it will not be shown again',
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: err.errors });
    }
    return res.status(500).json({ success: false, error: 'Failed to create API key' });
  }
});

// GET /api-keys — List user's API keys (no secrets)
router.get('/', async (req: Request, res: Response) => {
  try {
    const keys = await prisma.apiKey.findMany({
      where: { userId: req.user!.id },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        tier: true,
        permissions: true,
        rateLimit: true,
        dailyLimit: true,
        isActive: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
        _count: { select: { usageLogs: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({
      success: true,
      data: keys.map((k) => ({
        ...k,
        permissions: JSON.parse(k.permissions as string),
        totalCalls: k._count.usageLogs,
      })),
    });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to list API keys' });
  }
});

// PATCH /api-keys/:id — Update key (name, active status, limits)
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const body = z
      .object({
        name: z.string().min(1).max(100).optional(),
        isActive: z.boolean().optional(),
        rateLimit: z.number().int().min(1).max(10000).optional(),
        dailyLimit: z.number().int().min(1).max(100000).optional(),
      })
      .parse(req.body);

    const key = await prisma.apiKey.findFirst({
      where: { id, userId: req.user!.id },
    });

    if (!key) {
      return res.status(404).json({ success: false, error: 'API key not found' });
    }

    const updated = await prisma.apiKey.update({
      where: { id },
      data: body,
    });

    return res.json({ success: true, data: updated });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: err.errors });
    }
    return res.status(500).json({ success: false, error: 'Failed to update API key' });
  }
});

// DELETE /api-keys/:id — Revoke and delete key
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const key = await prisma.apiKey.findFirst({
      where: { id, userId: req.user!.id },
    });

    if (!key) {
      return res.status(404).json({ success: false, error: 'API key not found' });
    }

    await prisma.apiKey.delete({ where: { id } });

    return res.json({ success: true, message: 'API key revoked' });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to revoke API key' });
  }
});

// GET /api-keys/:id/usage — Usage stats for a key
router.get('/:id/usage', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const days = Math.min(parseInt(req.query.days as string) || 30, 90);

    const key = await prisma.apiKey.findFirst({
      where: { id, userId: req.user!.id },
      select: { id: true },
    });

    if (!key) {
      return res.status(404).json({ success: false, error: 'API key not found' });
    }

    const since = new Date(Date.now() - days * 86400000);

    const [dailyUsage, totalCalls] = await Promise.all([
      prisma.$queryRaw`
        SELECT
          DATE(created_at) as date,
          COUNT(*) as calls,
          AVG(duration) as avg_duration
        FROM api_usage_logs
        WHERE api_key_id = ${id} AND created_at >= ${since}
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `,
      prisma.apiUsageLog.count({
        where: { apiKeyId: id, createdAt: { gte: since } },
      }),
    ]);

    return res.json({
      success: true,
      data: { dailyUsage, totalCalls, period: `${days}d` },
    });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to fetch usage stats' });
  }
});

export default router;
