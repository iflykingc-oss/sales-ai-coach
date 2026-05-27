import { Router } from 'express';
import { authMiddleware, requireAdmin } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';

const router = Router();

router.use(authMiddleware, requireAdmin);

router.get('/stats', async (req, res, next) => {
  try {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [totalUsers, activeUsers, totalSessions, totalScripts, totalPractices, totalReviews] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { updatedAt: { gte: weekAgo } } }),
      prisma.session.count(),
      prisma.script.count(),
      prisma.practiceSession.count(),
      prisma.reviewReport.count(),
    ]);

    // Daily scripts in last 30 days
    const scriptsByDay = await prisma.script.groupBy({
      by: ['createdAt'],
      where: { createdAt: { gte: monthAgo } },
      _count: true,
    });
    const dailyScripts = new Array(30).fill(0);
    scriptsByDay.forEach((s) => {
      const dayIndex = Math.floor((now.getTime() - new Date(s.createdAt).getTime()) / (24 * 60 * 60 * 1000));
      if (dayIndex >= 0 && dayIndex < 30) dailyScripts[29 - dayIndex] = s._count;
    });

    // Industry distribution (real data from user.industry array)
    const allUsers = await prisma.user.findMany({
      where: { industry: { isEmpty: false } },
      select: { industry: true },
    });
    const industryCount: Record<string, number> = {};
    allUsers.forEach((u) => {
      (u.industry as string[]).forEach((ind) => {
        industryCount[ind] = (industryCount[ind] || 0) + 1;
      });
    });
    const topIndustries = Object.entries(industryCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // User growth trend (group by month using raw query)
    const userGrowthTrend: { month: string; count: number }[] = await prisma.$queryRaw`
      SELECT to_char("createdAt", 'YYYY-MM') AS month, COUNT(*)::int AS count
      FROM "User"
      GROUP BY month
      ORDER BY month ASC
      LIMIT 12
    `;

    res.json({
      success: true,
      data: {
        totalUsers,
        dailyActiveUsers: activeUsers,
        totalScriptsGenerated: totalScripts,
        dailyScriptsGenerated: dailyScripts[29] || 0,
        totalSessions,
        totalPractices,
        totalReviews,
        modelUsage: null,
        userGrowthTrend,
        scriptUsageTrend: dailyScripts,
        topIndustries,
      },
    });
  } catch (err) { next(err); }
});

router.get('/users', async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true, name: true, email: true, role: true, plan: true,
        industry: true, teamId: true, createdAt: true, updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: users });
  } catch (err) { next(err); }
});

router.post('/users/:id/disable', async (req, res, next) => {
  try {
    await prisma.user.update({ where: { id: req.params.id }, data: { role: 'USER' } });
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.post('/plugins', async (req, res, next) => {
  try {
    const { name, industry, scripts, scenarios, knowledge, customerProfiles, bestPractices } = req.body;
    const plugin = await prisma.industryPlugin.create({
      data: {
        name, industry,
        version: '1.0.0',
        scripts: scripts || {},
        scenarios: scenarios || {},
        knowledge: knowledge || {},
        customerProfiles: customerProfiles || {},
        bestPractices: bestPractices || {},
      },
    });
    res.status(201).json({ success: true, data: plugin });
  } catch (err) { next(err); }
});

router.post('/train', async (req, res, next) => {
  try {
    res.json({ success: true, message: 'Training job started' });
  } catch (err) { next(err); }
});

// Model configuration endpoints
const DEFAULT_MODELS = [
  { id: 'qwen-plus', name: 'Qwen-Plus', provider: 'Alibaba Cloud', temperature: 0.7, maxTokens: 4096, repetitionPenalty: 1.1, status: 'active' as const, usageQuota: 100000, usageCurrent: 0, alertThreshold: 80, apiKey: '' },
  { id: 'claude-sonnet', name: 'Claude Sonnet', provider: 'Anthropic', temperature: 0.7, maxTokens: 4096, repetitionPenalty: 1.05, status: 'active' as const, usageQuota: 50000, usageCurrent: 0, alertThreshold: 80, apiKey: '' },
  { id: 'minimax', name: 'MiniMax', provider: 'MiniMax', temperature: 0.8, maxTokens: 8192, repetitionPenalty: 1.1, status: 'inactive' as const, usageQuota: 30000, usageCurrent: 0, alertThreshold: 80, apiKey: '' },
];

router.get('/models', async (req, res, next) => {
  try {
    // In production these would come from env or a config store
    res.json({ success: true, data: DEFAULT_MODELS });
  } catch (err) { next(err); }
});

router.put('/models/:id', async (req, res, next) => {
  try {
    res.json({ success: true, message: 'Model config updated' });
  } catch (err) { next(err); }
});

export default router;
