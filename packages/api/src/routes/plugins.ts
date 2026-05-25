import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';

const router = Router();

router.get('/', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const plugins = await prisma.industryPlugin.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: plugins });
  } catch (err) { next(err); }
});

router.get('/:id', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const plugin = await prisma.industryPlugin.findUnique({ where: { id: req.params.id } });
    if (!plugin) return res.status(404).json({ success: false, error: 'Plugin not found' });
    res.json({ success: true, data: plugin });
  } catch (err) { next(err); }
});

router.post('/install', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { pluginId } = req.body;
    const plugin = await prisma.industryPlugin.findUnique({ where: { id: pluginId } });
    if (!plugin) return res.status(404).json({ success: false, error: 'Plugin not found' });

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    const industries = user?.industry || [];
    if (!industries.includes(plugin.industry)) {
      await prisma.user.update({
        where: { id: req.user!.id },
        data: { industry: [...industries, plugin.industry] },
      });
    }

    res.json({ success: true, data: plugin });
  } catch (err) { next(err); }
});

export default router;
