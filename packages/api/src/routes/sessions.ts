import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';

const createSessionSchema = z.object({
  name: z.string().min(1).max(200),
  industry: z.string().optional(),
  tags: z.array(z.string()).optional(),
  customerName: z.string().max(100).optional(),
  customerInfo: z.record(z.unknown()).optional(),
});

const updateSessionSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  status: z.enum(['PENDING', 'NEGOTIATING', 'WON', 'LOST', 'ARCHIVED']).optional(),
  stage: z.enum(['SCRIPT', 'PRACTICE', 'REVIEW', 'CLOSED']).optional(),
  tags: z.array(z.string()).optional(),
  customerName: z.string().max(100).optional(),
  customerInfo: z.record(z.unknown()).optional(),
});

const createMessageSchema = z.object({
  content: z.string().min(1).max(50000),
  role: z.literal('USER').default('USER'),
  inputType: z.enum(['TEXT', 'IMAGE', 'VOICE', 'FORM', 'PASTE']).default('TEXT'),
});

const router = Router();

router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const sessions = await prisma.session.findMany({
      where: { userId: req.user!.id },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });
    res.json({ success: true, data: sessions });
  } catch (err) { next(err); }
});

router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const session = await prisma.session.findFirst({
      where: { id: req.params.id as string, userId: req.user!.id },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        scripts: { orderBy: { createdAt: 'desc' }, take: 10 },
        practices: { orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, score: true, rounds: true, scenario: true, createdAt: true } },
        reviews: { orderBy: { createdAt: 'desc' }, take: 3, select: { id: true, summary: true, createdAt: true } },
      },
    });
    if (!session) return res.status(404).json({ success: false, error: 'Session not found' });
    res.json({ success: true, data: session });
  } catch (err) { next(err); }
});

router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const { name, industry, tags, customerName, customerInfo } = createSessionSchema.parse(req.body);
    const session = await prisma.session.create({
      data: {
        userId: req.user!.id, name, industry: industry || null, tags: tags || [],
        customerName: customerName || null, customerInfo: customerInfo ? JSON.parse(JSON.stringify(customerInfo)) : undefined,
      },
    });
    res.status(201).json({ success: true, data: session });
  } catch (err) { next(err); }
});

router.put('/:id', authMiddleware, async (req, res, next) => {
  try {
    const { name, status, stage, tags, customerName, customerInfo } = updateSessionSchema.parse(req.body);
    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (status !== undefined) data.status = status;
    if (stage !== undefined) data.stage = stage;
    if (tags !== undefined) data.tags = tags;
    if (customerName !== undefined) data.customerName = customerName;
    if (customerInfo !== undefined) data.customerInfo = customerInfo;

    const session = await prisma.session.updateMany({
      where: { id: req.params.id as string, userId: req.user!.id },
      data,
    });
    if (session.count === 0) return res.status(404).json({ success: false, error: 'Session not found' });
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    const result = await prisma.session.deleteMany({
      where: { id: req.params.id as string, userId: req.user!.id },
    });
    if (result.count === 0) return res.status(404).json({ success: false, error: 'Session not found' });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// Create a message in a session
router.post('/:id/messages', authMiddleware, async (req, res, next) => {
  try {
    const session = await prisma.session.findFirst({
      where: { id: req.params.id as string, userId: req.user!.id },
    });
    if (!session) return res.status(404).json({ success: false, error: 'Session not found' });

    const { content, inputType } = createMessageSchema.parse(req.body);

    const message = await prisma.message.create({
      data: {
        sessionId: req.params.id as string,
        role: 'USER',
        content,
        inputType,
      },
    });

    // Update session's updatedAt
    await prisma.session.update({
      where: { id: req.params.id as string },
      data: { updatedAt: new Date() },
    });

    res.status(201).json({ success: true, data: message });
  } catch (err) { next(err); }
});

export default router;
