import { Router, Response, NextFunction } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { PLAN_LIMITS } from '../middleware/quota.js';
import { Plan } from '@prisma/client';

const router = Router();

// Plan tier definitions with features
const PLAN_TIERS: Record<string, { name: string; price: number; period: string; features: string[]; limits: Record<string, number> }> = {
  FREE: {
    name: '免费版',
    price: 0,
    period: '永久',
    features: ['基础话术生成', 'AI 陪练 (限次)', '复盘分析 (限次)', '知识库 (50条)'],
    limits: { scripts: 5, practices: 3, reviews: 1 },
  },
  PROFESSIONAL: {
    name: '专业版',
    price: 99,
    period: '月',
    features: ['无限话术生成', '无限 AI 陪练', '无限复盘分析', '知识库 (500条)', '高级框架分析', 'API 接口访问'],
    limits: { scripts: -1, practices: -1, reviews: -1 },
  },
  TEAM: {
    name: '团队版',
    price: 299,
    period: '人/月',
    features: ['专业版全部功能', '团队协作空间', '团队任务管理', '共享话术库', '团队数据分析', '优先技术支持'],
    limits: { scripts: -1, practices: -1, reviews: -1 },
  },
  ENTERPRISE: {
    name: '企业版',
    price: -1,
    period: '定制',
    features: ['团队版全部功能', '私有化部署', '定制行业插件', '专属客户经理', 'SLA 保障', '数据安全审计'],
    limits: { scripts: -1, practices: -1, reviews: -1 },
  },
};

// GET /plans — list all plan tiers
router.get('/', (req, res: Response) => {
  const tiers = Object.entries(PLAN_TIERS).map(([key, tier]) => ({
    id: key,
    ...tier,
  }));
  res.json({ success: true, data: tiers });
});

// GET /plans/current — get current user's plan with usage stats
router.get('/current', authMiddleware, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, plan: true, createdAt: true },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const today = new Date().toISOString().split('T')[0];
    const usage = await prisma.usageLog.findMany({
      where: { userId, date: today },
    });

    const usageMap: Record<string, number> = {};
    usage.forEach((u) => { usageMap[u.action] = u.count; });

    const tier = PLAN_TIERS[user.plan] || PLAN_TIERS.FREE;
    const limits = PLAN_LIMITS[user.plan] || PLAN_LIMITS.FREE;

    const usageStats = Object.entries(limits).map(([action, limit]) => ({
      action,
      used: usageMap[action] || 0,
      limit,
      remaining: limit === -1 ? -1 : Math.max(0, limit - (usageMap[action] || 0)),
    }));

    // Get recent plan changes
    const recentChanges = await prisma.planChange.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    res.json({
      success: true,
      data: {
        plan: user.plan,
        tier,
        usage: usageStats,
        recentChanges,
      },
    });
  } catch (err) { next(err); }
});

// POST /plans/upgrade — user self-upgrade
router.post('/upgrade', authMiddleware, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.id;
    const { targetPlan } = req.body;

    if (!targetPlan || !PLAN_TIERS[targetPlan]) {
      return res.status(400).json({ success: false, error: 'Invalid target plan' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, plan: true },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (user.plan === targetPlan) {
      return res.status(400).json({ success: false, error: 'Already on this plan' });
    }

    // ENTERPRISE requires contact sales
    if (targetPlan === 'ENTERPRISE') {
      return res.status(400).json({ success: false, error: 'Enterprise plan requires contacting sales' });
    }

    // Plan hierarchy: FREE < PROFESSIONAL < TEAM < ENTERPRISE
    const planOrder: Record<string, number> = { FREE: 0, PROFESSIONAL: 1, TEAM: 2, ENTERPRISE: 3 };
    if (planOrder[targetPlan] <= planOrder[user.plan]) {
      return res.status(400).json({ success: false, error: 'Can only upgrade to a higher plan' });
    }

    // Update plan and log the change
    const [updatedUser] = await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { plan: targetPlan as Plan },
        select: { id: true, name: true, email: true, plan: true },
      }),
      prisma.planChange.create({
        data: {
          userId,
          fromPlan: user.plan as Plan,
          toPlan: targetPlan as Plan,
          changedBy: 'user',
          reason: `User upgraded from ${user.plan} to ${targetPlan}`,
        },
      }),
    ]);

    res.json({ success: true, data: updatedUser });
  } catch (err) { next(err); }
});

// GET /plans/history — user's plan change history
router.get('/history', authMiddleware, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.id;
    const history = await prisma.planChange.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    res.json({ success: true, data: history });
  } catch (err) { next(err); }
});

export default router;
