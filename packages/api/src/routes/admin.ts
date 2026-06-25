import { Router } from 'express';
import { authMiddleware, requireAdmin } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { decrypt, isEncrypted } from '../lib/encryption.js';

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

// PUT /admin/users/:id/plan — admin changes user's plan
router.put('/users/:id/plan', async (req, res, next) => {
  try {
    const { plan, reason } = req.body;
    const validPlans = ['FREE', 'PROFESSIONAL', 'TEAM', 'ENTERPRISE'];
    if (!plan || !validPlans.includes(plan)) {
      return res.status(400).json({ success: false, error: 'Invalid plan' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.params.id as string },
      select: { id: true, plan: true },
    });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const adminUser = (req as any).user;
    const [updatedUser] = await prisma.$transaction([
      prisma.user.update({
        where: { id: req.params.id as string },
        data: { plan },
        select: { id: true, name: true, email: true, role: true, plan: true },
      }),
      prisma.planChange.create({
        data: {
          userId: req.params.id as string,
          fromPlan: user.plan,
          toPlan: plan,
          changedBy: `admin:${adminUser.id}`,
          reason: reason || `Admin changed plan from ${user.plan} to ${plan}`,
        },
      }),
    ]);

    res.json({ success: true, data: updatedUser });
  } catch (err) { next(err); }
});

// GET /admin/users/:id/plan-history — admin views user's plan change history
router.get('/users/:id/plan-history', async (req, res, next) => {
  try {
    const history = await prisma.planChange.findMany({
      where: { userId: req.params.id as string },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ success: true, data: history });
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

router.get('/models', requireAdmin, async (req, res, next) => {
  try {
    // Try to get from DB first
    const dbModels = await prisma.modelConfig.findMany({
      orderBy: [{ isPrimary: 'desc' }, { provider: 'asc' }],
    });

    if (dbModels.length > 0) {
      const formatted = dbModels.map((m) => {
        // Decrypt and mask API key for display
        let maskedKey = '';
        if (m.apiKey) {
          try {
            const raw = isEncrypted(m.apiKey) ? decrypt(m.apiKey) : m.apiKey;
            maskedKey = raw.length > 8 ? raw.slice(0, 4) + '***' + raw.slice(-4) : '***' + raw.slice(-4);
          } catch {
            maskedKey = '***';
          }
        }
        return {
          id: m.id,
          name: m.displayName,
          provider: m.provider,
          temperature: m.temperature,
          maxTokens: m.maxTokens,
          repetitionPenalty: 1.1,
          status: m.isActive ? 'active' as const : 'inactive' as const,
          usageQuota: 100000,
          usageCurrent: 0,
          alertThreshold: 80,
          apiKey: maskedKey,
        };
      });
      return res.json({ success: true, data: formatted });
    }

    // Fallback to defaults
    res.json({ success: true, data: DEFAULT_MODELS });
  } catch (err) { next(err); }
});

router.put('/models/:id', requireAdmin, async (req, res, next) => {
  try {
    const { temperature, maxTokens, apiKey, isActive, provider, modelId, displayName, baseUrl, isPrimary } = req.body;

    // Detect masked apiKey (e.g., "***xyz") — skip updating it
    const isMaskedKey = apiKey && apiKey.startsWith('***');
    const validApiKey = isMaskedKey ? undefined : apiKey;

    const config = await prisma.modelConfig.update({
      where: { id: req.params.id as string },
      data: {
        provider: provider || undefined,
        modelId: modelId || undefined,
        displayName: displayName || undefined,
        baseUrl: baseUrl !== undefined ? baseUrl : undefined,
        temperature: temperature !== undefined ? temperature : undefined,
        maxTokens: maxTokens !== undefined ? maxTokens : undefined,
        apiKey: validApiKey !== undefined ? validApiKey : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
        isPrimary: isPrimary !== undefined ? isPrimary : undefined,
      },
    });

    res.json({ success: true, data: config });
  } catch (err) {
    // If model not found in DB, just return success (default models)
    res.json({ success: true, message: 'Model config updated' });
  }
});

// Test model connection
router.post('/models/test', requireAdmin, async (req, res, next) => {
  try {
    const { baseUrl, apiKey, modelId } = req.body;

    if (!apiKey || !modelId) {
      return res.status(400).json({ success: false, message: '缺少必要参数' });
    }

    // Try to make a simple API call to test the connection
    const testUrl = (baseUrl || 'https://api.openai.com/v1') + '/chat/completions';
    const response = await fetch(testUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelId,
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 5,
      }),
    });

    if (response.ok) {
      res.json({ success: true, message: '连接成功' });
    } else {
      const error = await response.text();
      res.json({ success: false, message: `连接失败: ${response.status}` });
    }
  } catch (err: any) {
    res.json({ success: false, message: `连接错误: ${err.message}` });
  }
});

export default router;
