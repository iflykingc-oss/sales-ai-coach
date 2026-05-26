import { Router } from 'express';
import { authMiddleware, requireAdmin } from from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';

const router = Router();

router.use(authMiddleware, requireAdmin);

router.get('/stats', async (req: Request, res, next) => {
  try {
    const [totalUsers, activeUsers, totalSessions, totalScripts] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { updatedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } }),
      prisma.session.count(),
      prisma.script.count(),
    ]);

    res.json({ success: true, data: { totalUsers, activeUsers, totalSessions, totalScripts } });
  } catch (err) { next(err); }
});

router.get('/users', async (req: Request, res, next) => {
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

router.post('/users/:id/disable', async (req: Request, res, next) => {
  try {
    await prisma.user.update({ where: { id: req.params.id }, data: { role: 'USER' } });
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.post('/plugins', async (req: Request, res, next) => {
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

router.post('/train', async (req: Request, res, next) => {
  try {
    res.json({ success: true, message: 'Training job started' });
  } catch (err) { next(err); }
});

export default router;
