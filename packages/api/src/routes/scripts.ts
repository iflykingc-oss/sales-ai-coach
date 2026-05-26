import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimit.js';
import { prisma } from '../lib/prisma.js';
import { generateScript } from '../services/ai.service.js';

const router = Router();

router.post('/generate', authMiddleware, aiLimiter, async (req: Request, res, next) => {
  try {
    const { input, inputType, industry, context, sessionId } = req.body;
    const result = await generateScript({
      input, inputType, industry, context, userId: req.user!.id,
    });

    // Save generated scripts and collect IDs
    const createdIds: string[] = [];
    for (const style of result.speech_styles) {
      const created = await prisma.script.create({
        data: {
          userId: req.user!.id,
          sessionId: sessionId || null,
          content: style.content,
          style: style.style,
          tags: [],
          industry: industry || null,
        },
      });
      createdIds.push(created.id);
    }

    res.json({ success: true, data: result, scriptIds: createdIds });
  } catch (err) { next(err); }
});

router.get('/', authMiddleware, async (req: Request, res, next) => {
  try {
    const { sessionId, tag } = req.query;
    const where: Record<string, unknown> = { userId: req.user!.id };
    if (sessionId) where.sessionId = sessionId;
    if (tag) where.tags = { has: tag as string };

    const scripts = await prisma.script.findMany({ where, orderBy: { createdAt: 'desc' } });
    res.json({ success: true, data: scripts });
  } catch (err) { next(err); }
});

router.post('/:id/feedback', authMiddleware, async (req: Request, res, next) => {
  try {
    const { type, reason } = req.body as { type: 'up' | 'down'; reason?: string };
    const weightDelta = type === 'up' ? 0.1 : -0.2;
    const script = await prisma.script.updateMany({
      where: { id: req.params.id, userId: req.user!.id },
      data: { weight: { increment: weightDelta } },
    });
    if (script.count === 0) return res.status(404).json({ success: false, error: 'Script not found' });

    // Log feedback reason for analytics (in production, store in a feedback table)
    if (reason && type === 'down') {
      console.log(`[Feedback] Script ${req.params.id}: ${reason}`);
    }

    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
