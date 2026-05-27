import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';

const router = Router();

router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [totalScripts, totalPractices, totalReviews, recentScripts, recentPractices, avgScore] = await Promise.all([
      prisma.script.count({ where: { userId } }),
      prisma.practiceSession.count({ where: { userId } }),
      prisma.reviewReport.count({ where: { userId } }),
      prisma.script.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, style: true, industry: true, createdAt: true },
      }),
      prisma.practiceSession.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, scenario: true, score: true, rounds: true, createdAt: true },
      }),
      prisma.practiceSession.aggregate({
        where: { userId, score: { gt: 0 } },
        _avg: { score: true },
      }),
    ]);

    // Weekly activity
    const weeklyScripts = await prisma.script.count({ where: { userId, createdAt: { gte: weekAgo } } });
    const weeklyPractices = await prisma.practiceSession.count({ where: { userId, createdAt: { gte: weekAgo } } });

    res.json({
      success: true,
      data: {
        stats: {
          totalScripts,
          totalPractices,
          totalReviews,
          weeklyScripts,
          weeklyPractices,
          avgPracticeScore: avgScore._avg.score ? Math.round(avgScore._avg.score * 100) : 0,
        },
        recentScripts,
        recentPractices,
      },
    });
  } catch (err) { next(err); }
});

export default router;
