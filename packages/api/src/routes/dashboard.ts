import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';

const router = Router();

router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [totalScripts, totalPractices, totalReviews, recentSessions, recentPractices, avgScore] = await Promise.all([
      prisma.script.count({ where: { userId } }),
      prisma.practiceSession.count({ where: { userId } }),
      prisma.reviewReport.count({ where: { userId } }),
      // Pipeline: recent sessions with counts of scripts, practices, reviews
      prisma.session.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: {
          id: true, name: true, industry: true, stage: true, status: true,
          customerName: true, createdAt: true, updatedAt: true,
          _count: { select: { scripts: true, practices: true, reviews: true } },
        },
      }),
      prisma.practiceSession.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, scenario: true, score: true, rounds: true, sessionId: true, createdAt: true },
      }),
      prisma.practiceSession.aggregate({
        where: { userId, score: { gt: 0 } },
        _avg: { score: true },
      }),
    ]);

    // Weekly activity
    const weeklyScripts = await prisma.script.count({ where: { userId, createdAt: { gte: weekAgo } } });
    const weeklyPractices = await prisma.practiceSession.count({ where: { userId, createdAt: { gte: weekAgo } } });

    // Pipeline stage distribution
    const stageCounts = await prisma.session.groupBy({
      by: ['stage'],
      where: { userId },
      _count: { id: true },
    });
    const pipeline = { SCRIPT: 0, PRACTICE: 0, REVIEW: 0, CLOSED: 0 };
    for (const s of stageCounts) {
      pipeline[s.stage as keyof typeof pipeline] = s._count.id;
    }

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
        pipeline,
        recentSessions,
        recentPractices,
      },
    });
  } catch (err) { next(err); }
});

export default router;
