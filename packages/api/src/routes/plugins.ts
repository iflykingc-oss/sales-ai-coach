import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';

const pluginSearchSchema = z.object({
  q: z.string().max(100).optional(),
  industry: z.string().max(50).optional(),
});

const router = Router();

router.get('/', authMiddleware, async (req, res: Response, next: NextFunction) => {
  try {
    const plugins = await prisma.industryPlugin.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: plugins });
  } catch (err) { next(err); }
});

router.get('/search', authMiddleware, async (req, res: Response, next: NextFunction) => {
  try {
    const parsed = pluginSearchSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid search parameters' });
    }
    const { q, industry } = parsed.data;
    const where: Record<string, unknown> = {};

    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { industry: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (industry) {
      where.industry = industry;
    }

    const plugins = await prisma.industryPlugin.findMany({ where, orderBy: { installCount: 'desc' } });
    res.json({ success: true, data: plugins });
  } catch (err) { next(err); }
});

router.get('/:id', authMiddleware, async (req, res: Response, next: NextFunction) => {
  try {
    const plugin = await prisma.industryPlugin.findUnique({ where: { id: req.params.id as string } });
    if (!plugin) return res.status(404).json({ success: false, error: 'Plugin not found' });
    res.json({ success: true, data: plugin });
  } catch (err) { next(err); }
});

router.post('/install', authMiddleware, async (req, res: Response, next: NextFunction) => {
  try {
    const { pluginId } = req.body;
    if (!pluginId) return res.status(400).json({ success: false, error: 'Missing pluginId' });

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

    // Increment install count
    await prisma.industryPlugin.update({
      where: { id: pluginId },
      data: { installCount: { increment: 1 } },
    });

    res.json({ success: true, data: plugin });
  } catch (err) { next(err); }
});

router.post('/:id/uninstall', authMiddleware, async (req, res: Response, next: NextFunction) => {
  try {
    const plugin = await prisma.industryPlugin.findUnique({ where: { id: req.params.id as string } });
    if (!plugin) return res.status(404).json({ success: false, error: 'Plugin not found' });

    // Remove industry from user's list
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    const industries = (user?.industry || []).filter((i: string) => i !== plugin.industry);
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { industry: industries },
    });

    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
