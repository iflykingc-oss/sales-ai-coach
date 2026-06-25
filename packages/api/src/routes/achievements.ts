import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { ACHIEVEMENTS, XP_LEVELS, getLevelForXp } from '@sales-ai-coach/shared';
import type { Achievement, UserProgress } from '@sales-ai-coach/shared';

const checkAchievementsSchema = z.object({
  previousUnlocked: z.array(z.string().max(100)).max(100).optional(),
});

const router = Router();

// Helper: calculate streak from practice dates
function calculateStreak(practiceDates: Date[]): { current: number; longest: number } {
  if (practiceDates.length === 0) return { current: 0, longest: 0 };

  // Normalize to date strings and deduplicate
  const uniqueDays = [...new Set(practiceDates.map((d) => d.toISOString().slice(0, 10)))].sort();

  let longest = 1;
  let current = 1;

  for (let i = 1; i < uniqueDays.length; i++) {
    const prev = new Date(uniqueDays[i - 1]);
    const curr = new Date(uniqueDays[i]);
    const diffMs = curr.getTime() - prev.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffDays === 1) {
      current++;
      longest = Math.max(longest, current);
    } else if (diffDays > 1) {
      current = 1;
    }
  }

  // Check if the streak is still active (last practice was today or yesterday)
  const today = new Date().toISOString().slice(0, 10);
  const lastDay = uniqueDays[uniqueDays.length - 1];
  const daysSinceLast = (new Date(today).getTime() - new Date(lastDay).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceLast > 1) {
    current = 0;
  }

  return { current, longest };
}

// Helper: build user progress from practice history
async function buildUserProgress(userId: string): Promise<UserProgress & { practiceDates: Date[] }> {
  const practices = await prisma.practiceSession.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  });

  const practiceDates = practices.map((p) => p.createdAt);
  const { current: currentStreak, longest: longestStreak } = calculateStreak(practiceDates);

  // Calculate best scores
  const bestScores: Record<string, number> = {};
  const skillScores: Record<string, number> = {};

  for (const practice of practices) {
    const score = practice.score;

    if (!bestScores.total_score || score > bestScores.total_score) {
      bestScores.total_score = score;
    }

    // Extract skill scores from feedback radarScores
    const feedback = practice.feedback as Record<string, unknown> | null;
    if (feedback && typeof feedback === 'object') {
      const radarScores = feedback.radarScores as Record<string, number> | undefined;
      if (radarScores) {
        for (const [dim, val] of Object.entries(radarScores)) {
          if (!bestScores[dim] || val > bestScores[dim]) {
            bestScores[dim] = val;
          }
          // Track latest skill scores for each dimension
          skillScores[dim] = val;
        }
      }
    }
  }

  // Calculate total XP from unlocked achievements (stored in user metadata or recalculated)
  // For now, recalculate from scratch based on practice data
  const unlockedAchievements: string[] = [];
  let totalXp = 0;

  for (const achievement of ACHIEVEMENTS) {
    const unlocked = checkAchievement(achievement, {
      practiceSessions: practices.length,
      bestScores,
      currentStreak,
      longestStreak,
      skillScores,
      practices,
    });
    if (unlocked) {
      unlockedAchievements.push(achievement.id);
      totalXp += achievement.xp;
    }
  }

  const levelInfo = getLevelForXp(totalXp);

  return {
    totalXp,
    level: levelInfo.level,
    practiceSessions: practices.length,
    currentStreak,
    longestStreak,
    lastPracticeDate: practiceDates.length > 0 ? practiceDates[practiceDates.length - 1].toISOString().slice(0, 10) : null,
    unlockedAchievements,
    skillScores,
    bestScores,
    practiceDates,
  };
}

// Helper: check if a single achievement is unlocked
function checkAchievement(
  achievement: Achievement,
  ctx: {
    practiceSessions: number;
    bestScores: Record<string, number>;
    currentStreak: number;
    longestStreak: number;
    skillScores: Record<string, number>;
    practices: Array<{ score: number; feedback: unknown; scenario: string }>;
  },
): boolean {
  const { type, metric, threshold } = achievement.requirement;

  switch (type) {
    case 'count':
      if (metric === 'practice_sessions') return ctx.practiceSessions >= threshold;
      return false;

    case 'score':
      return (ctx.bestScores[metric] ?? 0) >= threshold;

    case 'streak':
      if (metric === 'practice_days') return ctx.longestStreak >= threshold;
      return false;

    case 'special':
      if (metric === 'all_dimensions_above_80') {
        const dimensions = ['需求挖掘', '异议处理', '促单能力', '沟通表达', '情绪管理', '产品知识', '信任建立', '价值传递'];
        return dimensions.every((dim) => (ctx.bestScores[dim] ?? 0) >= 80);
      }
      if (metric === 'score_improvement') {
        if (ctx.practices.length < 2) return false;
        const firstScore = ctx.practices[0].score;
        const bestScore = ctx.bestScores.total_score ?? 0;
        return bestScore - firstScore >= threshold;
      }
      if (metric === 'expert_difficulty_completed') {
        return ctx.practices.some((p) => {
          const fb = p.feedback as Record<string, unknown> | null;
          return fb && typeof fb === 'object' && fb.difficulty === 'expert';
        });
      }
      return false;

    default:
      return false;
  }
}

// GET /achievements - return all achievements with unlock status
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const progress = await buildUserProgress(userId);

    const achievementsWithStatus = ACHIEVEMENTS.map((achievement) => ({
      ...achievement,
      unlocked: progress.unlockedAchievements.includes(achievement.id),
    }));

    res.json({ success: true, data: achievementsWithStatus });
  } catch (err) {
    next(err);
  }
});

// GET /achievements/progress - return user's XP, level, streak, and skill scores
router.get('/progress', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const progress = await buildUserProgress(userId);

    // Omit internal practiceDates from response
    const { practiceDates: _, ...responseData } = progress;

    const currentLevelInfo = getLevelForXp(progress.totalXp);
    const nextLevelIndex = XP_LEVELS.findIndex((l) => l.level === currentLevelInfo.level + 1);
    const xpForNextLevel = nextLevelIndex !== -1 ? XP_LEVELS[nextLevelIndex].xpRequired - progress.totalXp : 0;
    const nextLevelInfo = nextLevelIndex !== -1 ? XP_LEVELS[nextLevelIndex] : null;

    res.json({
      success: true,
      data: {
        ...responseData,
        currentLevel: currentLevelInfo,
        nextLevel: nextLevelInfo,
        xpForNextLevel,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /achievements/analytics - return detailed practice analytics for the user
router.get('/analytics', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user!.id;

    // Get all practice sessions with scores and feedback
    const practices = await prisma.practiceSession.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        scenario: true,
        industry: true,
        rounds: true,
        score: true,
        feedback: true,
        createdAt: true,
      },
    });

    // Practice trend (last 30 sessions)
    const recentPractices = practices.slice(-30);
    const practiceTrend = recentPractices.map((p) => {
      const fb = p.feedback as Record<string, unknown> | null;
      return {
        date: p.createdAt.toISOString().slice(0, 10),
        score: p.score,
        scenario: p.scenario,
        difficulty: (fb?.difficulty as string) || 'medium',
      };
    });

    // Skill progression over time (group by week)
    const skillTrend: Array<{ week: string; scores: Record<string, number> }> = [];
    const weekMap = new Map<string, Array<Record<string, number>>>();

    for (const p of practices) {
      const feedback = p.feedback as Record<string, unknown> | null;
      if (feedback && typeof feedback === 'object') {
        const radarScores = feedback.radarScores as Record<string, number> | undefined;
        if (radarScores) {
          const weekStart = new Date(p.createdAt);
          weekStart.setDate(weekStart.getDate() - weekStart.getDay());
          const weekKey = weekStart.toISOString().slice(0, 10);
          if (!weekMap.has(weekKey)) weekMap.set(weekKey, []);
          weekMap.get(weekKey)!.push(radarScores);
        }
      }
    }

    for (const [week, scoresList] of weekMap) {
      const avgScores: Record<string, number> = {};
      const dimensions = Object.keys(scoresList[0] || {});
      for (const dim of dimensions) {
        const values = scoresList.map((s) => s[dim] ?? 0);
        avgScores[dim] = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
      }
      skillTrend.push({ week, scores: avgScores });
    }

    // Difficulty distribution
    const difficultyCount: Record<string, number> = {};
    for (const p of practices) {
      const fb = p.feedback as Record<string, unknown> | null;
      const d = (fb?.difficulty as string) || 'medium';
      difficultyCount[d] = (difficultyCount[d] || 0) + 1;
    }

    // Scenario frequency
    const scenarioCount: Record<string, number> = {};
    for (const p of practices) {
      scenarioCount[p.scenario] = (scenarioCount[p.scenario] || 0) + 1;
    }
    const topScenarios = Object.entries(scenarioCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // Average score by difficulty
    const scoreByDifficulty: Record<string, { avg: number; count: number }> = {};
    for (const p of practices) {
      const fb = p.feedback as Record<string, unknown> | null;
      const d = (fb?.difficulty as string) || 'medium';
      if (!scoreByDifficulty[d]) scoreByDifficulty[d] = { avg: 0, count: 0 };
      scoreByDifficulty[d].avg += p.score;
      scoreByDifficulty[d].count++;
    }
    for (const d of Object.keys(scoreByDifficulty)) {
      scoreByDifficulty[d].avg = Math.round(scoreByDifficulty[d].avg / scoreByDifficulty[d].count);
    }

    // Recent improvement: compare last 5 vs previous 5
    let recentImprovement = 0;
    if (practices.length >= 10) {
      const recent5 = practices.slice(-5).reduce((sum, p) => sum + p.score, 0) / 5;
      const prev5 = practices.slice(-10, -5).reduce((sum, p) => sum + p.score, 0) / 5;
      recentImprovement = Math.round(recent5 - prev5);
    }

    // Practice dates for streak calendar
    const practiceDates = practices.map((p) => p.createdAt.toISOString().slice(0, 10));
    const uniqueDates = [...new Set(practiceDates)];

    res.json({
      success: true,
      data: {
        totalSessions: practices.length,
        practiceTrend,
        skillTrend,
        difficultyDistribution: difficultyCount,
        topScenarios,
        scoreByDifficulty,
        recentImprovement,
        practiceDates: uniqueDates,
        averageScore: practices.length > 0
          ? Math.round(practices.reduce((sum, p) => sum + p.score, 0) / practices.length)
          : 0,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /achievements/check - check if any new achievements were unlocked after a practice session
router.post('/check', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const parsed = checkAchievementsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.flatten() });
    }
    const { previousUnlocked } = parsed.data;

    const progress = await buildUserProgress(userId);
    const previouslyUnlocked = new Set(previousUnlocked || []);

    const newlyUnlocked = ACHIEVEMENTS.filter(
      (a) => progress.unlockedAchievements.includes(a.id) && !previouslyUnlocked.has(a.id),
    );

    const totalNewXp = newlyUnlocked.reduce((sum, a) => sum + a.xp, 0);

    res.json({
      success: true,
      data: {
        newlyUnlocked,
        totalNewXp,
        progress: {
          totalXp: progress.totalXp,
          level: progress.level,
          currentStreak: progress.currentStreak,
          longestStreak: progress.longestStreak,
          practiceSessions: progress.practiceSessions,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
