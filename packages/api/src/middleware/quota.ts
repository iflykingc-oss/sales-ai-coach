import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';

export const PLAN_LIMITS: Record<string, Record<string, number>> = {
  FREE: { scripts: 5, practices: 3, reviews: 1 },
  PROFESSIONAL: { scripts: -1, practices: -1, reviews: -1 },
  TEAM: { scripts: -1, practices: -1, reviews: -1 },
  ENTERPRISE: { scripts: -1, practices: -1, reviews: -1 },
};

const FEATURE_NAMES: Record<string, string> = {
  scripts: '话术生成',
  practices: 'AI 陪练',
  reviews: '复盘分析',
};

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

function getTomorrowResetTime(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow.toISOString();
}

export function quotaMiddleware(action: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Authentication required for quota check' });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { plan: true },
      });

      if (!user) {
        return res.status(401).json({ success: false, error: 'User not found' });
      }

      const limits = PLAN_LIMITS[user.plan] || PLAN_LIMITS.FREE;
      const limit = limits[action];

      // -1 means unlimited
      if (limit === -1 || limit === undefined) return next();

      const today = getTodayDate();
      const usage = await prisma.usageLog.findUnique({
        where: { userId_action_date: { userId, action, date: today } },
      });

      if (usage && usage.count >= limit) {
        return res.status(429).json({
          success: false,
          error: `已达到今日${FEATURE_NAMES[action] || action}次数上限`,
          feature: action,
          limit,
          used: usage.count,
          plan: user.plan,
          resetAt: getTomorrowResetTime(),
        });
      }

      // Increment usage count
      await prisma.usageLog.upsert({
        where: { userId_action_date: { userId, action, date: today } },
        update: { count: { increment: 1 } },
        create: { userId, action, date: today, count: 1 },
      });

      next();
    } catch (err) {
      // Fail-closed: block request on quota check failure to prevent abuse
      logger.error('Quota check failed, blocking request', { error: err, action, userId: req.user?.id });
      return res.status(503).json({
        success: false,
        error: 'Service temporarily unavailable, please try again',
      });
    }
  };
}
