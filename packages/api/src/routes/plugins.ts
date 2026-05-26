import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';

const router = Router();

router.get('/', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const plugins = await prisma.industryPlugin.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: plugins });
  } catch (err) { next(err); }
});

router.get('/:id', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const plugin = await prisma.industryPlugin.findUnique({ where: { id: req.params.id } });
    if (!plugin) return res.status(404).json({ success: false, error: 'Plugin not found' });
    res.json({ success: true, data: plugin });
  } catch (err) { next(err); }
});

router.post('/install', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
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

router.get('/search', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q, category, sort } = req.query;
    const where: Record<string, any> = {};

    if (q) {
      const query = q as string;
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { industry: { contains: query, mode: 'insensitive' } },
      ];
    }

    const plugins = await prisma.industryPlugin.findMany({ where, orderBy });
    res.json({ success: true, data: plugins });
  } catch (err) { next(err); }
});

router.post('/:id/uninstall', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const plugin = await prisma.industryPlugin.findUnique({ where: { id: req.params.id } });
    if (!plugin) return res.status(404).json({ success: false, error: 'Plugin not found' });

    await prisma.industryPlugin.update({
      where: { id: req.params.id },
      data: { installCount: { decrement: 1 } },
    });

    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
