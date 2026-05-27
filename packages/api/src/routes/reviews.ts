import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimit.js';
import { prisma } from '../lib/prisma.js';
import { analyzeReview } from '../services/ai.service.js';

const router = Router();

router.post('/generate', authMiddleware, aiLimiter, async (req, res, next) => {
  try {
    const { conversations, sessionId } = req.body;
    const analysis = await analyzeReview({
      conversations,
      userId: req.user!.id,
    });

    const report = await prisma.reviewReport.create({
      data: {
        userId: req.user!.id,
        sessionId: sessionId || null,
        summary: analysis.summary,
        strengths: analysis.strengths,
        improvements: analysis.improvements,
        recommendations: analysis.recommendations,
      },
    });

    res.json({ success: true, data: { ...report, radarScores: analysis.radarScores } });
  } catch (err) { next(err); }
});

router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const reports = await prisma.reviewReport.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: reports });
  } catch (err) { next(err); }
});

router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const report = await prisma.reviewReport.findFirst({
      where: { id: req.params.id as string, userId: req.user!.id },
    });
    if (!report) return res.status(404).json({ success: false, error: 'Report not found' });
    res.json({ success: true, data: report });
  } catch (err) { next(err); }
});

export default router;
