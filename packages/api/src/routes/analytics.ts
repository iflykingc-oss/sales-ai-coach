import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';

const router = Router();

// GET /analytics/skills — Get user's skill scores over time
router.get('/skills', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { dimension, days = 30 } = req.query;

    const since = new Date();
    since.setDate(since.getDate() - parseInt(days as string));

    const where: { userId: string; createdAt: { gte: Date }; dimension?: string } = { userId, createdAt: { gte: since } };
    if (dimension) where.dimension = dimension as string;

    const scores = await prisma.skillScore.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      select: {
        dimension: true,
        subDimension: true,
        score: true,
        createdAt: true,
        sessionId: true,
      },
    });

    // Group by dimension
    const byDimension: Record<string, any[]> = {};
    for (const s of scores) {
      if (!byDimension[s.dimension]) byDimension[s.dimension] = [];
      byDimension[s.dimension].push({
        score: s.score,
        subDimension: s.subDimension,
        date: s.createdAt,
        sessionId: s.sessionId,
      });
    }

    // Calculate averages per dimension
    const averages: Record<string, number> = {};
    for (const [dim, data] of Object.entries(byDimension)) {
      averages[dim] = data.reduce((sum, d) => sum + d.score, 0) / data.length;
    }

    res.json({
      success: true,
      data: {
        scores: byDimension,
        averages,
        totalSamples: scores.length,
      },
    });
  } catch (err) { next(err); }
});

// POST /analytics/skills — Save skill scores from a practice session
router.post('/skills', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.id;
    const { sessionId, scores } = req.body;

    if (!scores || typeof scores !== 'object') {
      return res.status(400).json({ success: false, error: 'Invalid scores data' });
    }

    // scores format: { "需求挖掘": { "question_quality": 0.8, "listening_depth": 0.7, ... }, ... }
    const records: any[] = [];
    for (const [dimension, subScores] of Object.entries(scores)) {
      if (typeof subScores === 'number') {
        // Flat score format
        records.push({
          userId,
          dimension,
          score: subScores as number,
          sessionId: sessionId || null,
        });
      } else if (typeof subScores === 'object' && subScores !== null) {
        // Nested sub-dimension format
        for (const [subDim, subScore] of Object.entries(subScores as Record<string, number>)) {
          if (typeof subScore === 'number') {
            records.push({
              userId,
              dimension,
              subDimension: subDim,
              score: subScore,
              sessionId: sessionId || null,
            });
          }
        }
      }
    }

    if (records.length > 0) {
      await prisma.skillScore.createMany({ data: records });
    }

    res.json({ success: true, data: { saved: records.length } });
  } catch (err) { next(err); }
});

// GET /analytics/trends — Get skill trend data for charts
router.get('/trends', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.id;
    const { days = 30 } = req.query;

    const since = new Date();
    since.setDate(since.getDate() - parseInt(days as string));

    // Get raw scores grouped by date and dimension
    const scores = await prisma.skillScore.findMany({
      where: { userId, createdAt: { gte: since } },
      orderBy: { createdAt: 'asc' },
      select: {
        dimension: true,
        score: true,
        createdAt: true,
      },
    });

    // Group by date (YYYY-MM-DD) and dimension
    const trends: Record<string, Record<string, number[]>> = {};
    for (const s of scores) {
      const date = s.createdAt.toISOString().split('T')[0];
      if (!trends[date]) trends[date] = {};
      if (!trends[date][s.dimension]) trends[date][s.dimension] = [];
      trends[date][s.dimension].push(s.score);
    }

    // Calculate daily averages
    const result: Record<string, Record<string, number>> = {};
    for (const [date, dims] of Object.entries(trends)) {
      result[date] = {};
      for (const [dim, scoresArr] of Object.entries(dims)) {
        result[date][dim] = scoresArr.reduce((a, b) => a + b, 0) / scoresArr.length;
      }
    }

    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

export default router;
