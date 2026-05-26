import { Router } from 'express';
import { authMiddleware, optionalAuth } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimit.js';
import { prisma } from '../lib/prisma.js';
import { sendPracticeMessage, callAiService } from '../services/ai.service.js';

const router = Router();

// Harness-powered endpoints (direct proxy to AI service)
router.post('/init', optionalAuth, async (req: Request, res, next) => {
  try {
    const { scenario, industry, mode, maxRounds, sessionId } = req.body;
    const result = await callAiService({
      path: '/practices/init',
      body: {
        scenario,
        industry: industry || '',
        mode: mode || 'scenario',
        maxRounds: maxRounds || 10,
        sessionId: sessionId || '',
        userId: req.user?.id || '',
      },
    });
    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
});

router.post('/message', authMiddleware, aiLimiter, async (req: Request, res, next) => {
  try {
    const { sessionId, message } = req.body;
    const result = await callAiService({
      path: '/practices/message',
      body: { sessionId, message },
    });
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

router.post('/report', authMiddleware, async (req: Request, res, next) => {
  try {
    const { sessionId } = req.body;
    const result = await callAiService({
      path: '/practices/report',
      body: { sessionId },
    });
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// Legacy DB-backed endpoints (still available)
router.post('/start', authMiddleware, async (req: Request, res, next) => {
  try {
    const { scenario, industry, mode } = req.body;
    const practice = await prisma.practiceSession.create({
      data: {
        userId: req.user!.id,
        scenario,
        industry: industry || null,
        rounds: 0,
        score: 0,
        feedback: { mode, status: 'started' },
      },
    });
    res.status(201).json({ success: true, data: practice });
  } catch (err) { next(err); }
});

router.post('/:id/message', authMiddleware, aiLimiter, async (req: Request, res, next) => {
  try {
    const { content } = req.body;
    const practice = await prisma.practiceSession.findUnique({ where: { id: req.params.id } });
    if (!practice || practice.userId !== req.user!.id) {
      return res.status(404).json({ success: false, error: 'Practice session not found' });
    }

    const feedback = practice.feedback as Record<string, unknown>;
    const messages = (feedback.messages as Array<{ role: 'user' | 'assistant'; content: string }> || []);

    const result = await sendPracticeMessage({
      scenario: practice.scenario,
      industry: practice.industry || undefined,
      mode: (feedback.mode as string) || 'scenario',
      messages: [...messages, { role: 'user' as const, content }],
      userId: req.user!.id,
    });

    const updatedMessages = [...messages, { role: 'user' as const, content }, { role: 'assistant' as const, content: result.response }];
    await prisma.practiceSession.update({
      where: { id: req.params.id },
      data: {
        rounds: { increment: 1 },
        feedback: { ...feedback, messages: updatedMessages, emotion: result.emotion },
        ...(result.isComplete ? {
          score: result.feedback?.overallScore || 0,
        } : {}),
      },
    });

    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

router.get('/', authMiddleware, async (req: Request, res, next) => {
  try {
    const practices = await prisma.practiceSession.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: practices });
  } catch (err) { next(err); }
});

router.get('/:id', authMiddleware, async (req: Request, res, next) => {
  try {
    const practice = await prisma.practiceSession.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (!practice) return res.status(404).json({ success: false, error: 'Practice session not found' });
    res.json({ success: true, data: practice });
  } catch (err) { next(err); }
});

export default router;
