import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import type { CreateSessionInput, UpdateSessionInput } from '@sales-ai-coach/shared';

const router = Router();

router.get('/', authMiddleware, async (req: Request, res, next) => {
  try {
    const sessions = await prisma.session.findMany({
      where: { userId: req.user!.id },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });
    res.json({ success: true, data: sessions });
  } catch (err) { next(err); }
});

router.get('/:id', authMiddleware, async (req: Request, res, next) => {
  try {
    const session = await prisma.session.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!session) return res.status(404).json({ success: false, error: 'Session not found' });
    res.json({ success: true, data: session });
  } catch (err) { next(err); }
});

router.post('/', authMiddleware, async (req: Request, res, next) => {
  try {
    const { name, industry, tags } = req.body as CreateSessionInput;
    const session = await prisma.session.create({
      data: { userId: req.user!.id, name, industry: industry || null, tags: tags || [] },
    });
    res.status(201).json({ success: true, data: session });
  } catch (err) { next(err); }
});

router.put('/:id', authMiddleware, async (req: Request, res, next) => {
  try {
    const { name, industry, status, tags } = req.body as UpdateSessionInput;
    const session = await prisma.session.updateMany({
      where: { id: req.params.id, userId: req.user!.id },
      data: { name, industry, status, tags },
    });
    if (session.count === 0) return res.status(404).json({ success: false, error: 'Session not found' });
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.delete('/:id', authMiddleware, async (req: Request, res, next) => {
  try {
    const result = await prisma.session.deleteMany({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (result.count === 0) return res.status(404).json({ success: false, error: 'Session not found' });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// Create a message in a session
router.post('/:id/messages', authMiddleware, async (req: Request, res, next) => {
  try {
    const session = await prisma.session.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (!session) return res.status(404).json({ success: false, error: 'Session not found' });

    const { role, content, inputType = 'TEXT' } = req.body;
    if (!role || !content) {
      return res.status(400).json({ success: false, error: 'role and content are required' });
    }

    const message = await prisma.message.create({
      data: {
        sessionId: req.params.id,
        role,
        content,
        inputType,
      },
    });

    // Update session's updatedAt
    await prisma.session.update({
      where: { id: req.params.id },
      data: { updatedAt: new Date() },
    });

    res.status(201).json({ success: true, data: message });
  } catch (err) { next(err); }
});

export default router;
