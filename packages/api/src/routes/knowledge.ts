import { Router } from 'express';
import { authMiddleware } from from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';

const router = Router();

router.get('/', authMiddleware, async (req: Request, res, next) => {
  try {
    const { tag, industry } = req.query;
    const where: Record<string, unknown> = { userId: req.user!.id, status: 'ACTIVE' };
    if (tag) where.tags = { has: tag as string };
    if (industry) where.industry = industry;

    const items = await prisma.knowledgeItem.findMany({
      where,
      orderBy: [{ weight: 'desc' }, { createdAt: 'desc' }],
    });
    res.json({ success: true, data: items });
  } catch (err) { next(err); }
});

router.post('/', authMiddleware, async (req: Request, res, next) => {
  try {
    const { source, content, tags, industry } = req.body;
    const item = await prisma.knowledgeItem.create({
      data: {
        userId: req.user!.id,
        source,
        content,
        tags: tags || [],
        industry: industry || null,
      },
    });
    res.status(201).json({ success: true, data: item });
  } catch (err) { next(err); }
});

router.put('/:id', authMiddleware, async (req: Request, res, next) => {
  try {
    const { content, tags, status, weight } = req.body;
    const result = await prisma.knowledgeItem.updateMany({
      where: { id: req.params.id, userId: req.user!.id },
      data: { content, tags, status, weight },
    });
    if (result.count === 0) return res.status(404).json({ success: false, error: 'Item not found' });
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.delete('/:id', authMiddleware, async (req: Request, res, next) => {
  try {
    const result = await prisma.knowledgeItem.deleteMany({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (result.count === 0) return res.status(404).json({ success: false, error: 'Item not found' });
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
