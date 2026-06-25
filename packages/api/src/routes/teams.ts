import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { z } from 'zod';

const createTeamSchema = z.object({
  name: z.string().min(1).max(100),
});

const createTaskSchema = z.object({
  assigneeId: z.string().uuid().optional(),
  type: z.string().min(1),
  scenario: z.string().min(1),
  deadline: z.string().datetime(),
});

const updateTaskStatusSchema = z.object({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE']),
});

const transferOwnershipSchema = z.object({
  newOwnerId: z.string().uuid(),
});

const router = Router();

router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const { name } = createTeamSchema.parse(req.body);
    const result = await prisma.$transaction(async (tx) => {
      const team = await tx.team.create({ data: { name, ownerId: req.user!.id } });
      await tx.user.update({ where: { id: req.user!.id }, data: { teamId: team.id, role: 'TEAM_OWNER' } });
      return team;
    });
    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
});

router.get('/my', authMiddleware, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id }, include: { team: true } });
    res.json({ success: true, data: user?.team });
  } catch (err) { next(err); }
});

router.get('/:id/dashboard', authMiddleware, async (req, res, next) => {
  try {
    const team = await prisma.team.findFirst({
      where: { id: req.params.id as string, ownerId: req.user!.id },
    });
    if (!team) return res.status(404).json({ success: false, error: 'Team not found' });

    const members = await prisma.user.findMany({
      where: { teamId: team.id },
      select: { id: true, name: true, email: true },
    });

    res.json({ success: true, data: { team, members } });
  } catch (err) { next(err); }
});

router.post('/:id/tasks', authMiddleware, async (req, res, next) => {
  try {
    const team = await prisma.team.findUnique({ where: { id: req.params.id as string } });
    if (!team) return res.status(404).json({ success: false, error: 'Team not found' });
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (team.ownerId !== req.user!.id && user?.teamId !== team.id) {
      return res.status(403).json({ success: false, error: 'Not a member of this team' });
    }

    const { assigneeId, type, scenario, deadline } = createTaskSchema.parse(req.body);

    if (assigneeId) {
      const assignee = await prisma.user.findFirst({
        where: { id: assigneeId, teamId: team.id },
      });
      if (!assignee) {
        return res.status(400).json({ success: false, error: 'Assignee is not a member of this team' });
      }
    }

    const task = await prisma.teamTask.create({
      data: { teamId: req.params.id as string, assigneeId: assigneeId ?? req.user!.id, type, scenario, deadline: new Date(deadline) },
    });
    res.status(201).json({ success: true, data: task });
  } catch (err) { next(err); }
});

router.get('/:id/tasks', authMiddleware, async (req, res, next) => {
  try {
    const team = await prisma.team.findUnique({ where: { id: req.params.id as string } });
    if (!team) return res.status(404).json({ success: false, error: 'Team not found' });
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (team.ownerId !== req.user!.id && user?.teamId !== team.id) {
      return res.status(403).json({ success: false, error: 'Not a member of this team' });
    }

    const tasks = await prisma.teamTask.findMany({
      where: { teamId: req.params.id as string },
      orderBy: { deadline: 'asc' },
    });
    res.json({ success: true, data: tasks });
  } catch (err) { next(err); }
});

// Update task status
router.patch('/:id/tasks/:taskId', authMiddleware, async (req, res, next) => {
  try {
    const team = await prisma.team.findUnique({ where: { id: req.params.id as string } });
    if (!team) return res.status(404).json({ success: false, error: 'Team not found' });
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (team.ownerId !== req.user!.id && user?.teamId !== team.id) {
      return res.status(403).json({ success: false, error: 'Not a member of this team' });
    }

    const { status } = updateTaskStatusSchema.parse(req.body);
    const task = await prisma.teamTask.update({
      where: { id: req.params.taskId as string },
      data: { status },
    });
    res.json({ success: true, data: task });
  } catch (err) { next(err); }
});

// Team stats dashboard
router.get('/:id/stats', authMiddleware, async (req, res, next) => {
  try {
    const team = await prisma.team.findFirst({
      where: { id: req.params.id as string },
    });
    if (!team) return res.status(404).json({ success: false, error: 'Team not found' });
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (team.ownerId !== req.user!.id && user?.teamId !== team.id) {
      return res.status(403).json({ success: false, error: 'Not a member of this team' });
    }

    const members = await prisma.user.findMany({
      where: { teamId: team.id },
      select: { id: true, name: true, email: true, createdAt: true },
    });

    const memberIds = members.map((m) => m.id);

    // Real stats from database
    const [totalScripts, practiceSessions, recentActive] = await Promise.all([
      prisma.script.count({ where: { userId: { in: memberIds } } }),
      prisma.practiceSession.findMany({
        where: { userId: { in: memberIds } },
        select: { feedback: true, createdAt: true, userId: true },
      }),
      prisma.script.count({
        where: {
          userId: { in: memberIds },
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    // Compute avg practice score from feedback
    const scores = practiceSessions
      .map((s) => {
        try {
          const fb = typeof s.feedback === 'string' ? JSON.parse(s.feedback) : s.feedback;
          return fb?.overallScore || fb?.score || null;
        } catch { return null; }
      })
      .filter((s): s is number => s !== null && s > 0);

    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    // Weak scenarios from practice sessions
    const scenarioScores: Record<string, number[]> = {};
    for (const session of practiceSessions) {
      try {
        const fb = typeof session.feedback === 'string' ? JSON.parse(session.feedback) : session.feedback;
        const scenario = fb?.scenarioType || fb?.scenario || '通用场景';
        const score = fb?.overallScore || fb?.score || 0;
        if (score > 0) {
          if (!scenarioScores[scenario]) scenarioScores[scenario] = [];
          scenarioScores[scenario].push(score);
        }
      } catch { /* skip */ }
    }

    const weakScenarios = Object.entries(scenarioScores)
      .map(([name, scores]) => ({
        name,
        avgScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
        weakness: 100 - Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      }))
      .sort((a, b) => b.weakness - a.weakness)
      .slice(0, 5);

    // Member stats
    const memberStats = await Promise.all(
      members.map(async (m) => {
        const [scriptCount, sessions] = await Promise.all([
          prisma.script.count({ where: { userId: m.id } }),
          prisma.practiceSession.findMany({
            where: { userId: m.id },
            select: { feedback: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
            take: 10,
          }),
        ]);

        const memberScores = sessions
          .map((s) => {
            try {
              const fb = typeof s.feedback === 'string' ? JSON.parse(s.feedback) : s.feedback;
              return fb?.overallScore || fb?.score || null;
            } catch { return null; }
          })
          .filter((s): s is number => s !== null && s > 0);

        return {
          id: m.id,
          name: m.name || m.email.split('@')[0],
          email: m.email,
          role: m.id === team.ownerId ? 'TEAM_OWNER' as const : 'USER' as const,
          status: 'offline' as const,
          joinedAt: m.createdAt.toISOString(),
          stats: {
            scriptsGenerated: scriptCount,
            practiceScore: memberScores.length > 0 ? Math.round(memberScores.reduce((a, b) => a + b, 0) / memberScores.length) : 0,
            sessionsCompleted: sessions.length,
            growthTrend: memberScores.slice(0, 5).reverse(),
          },
        };
      }),
    );

    res.json({
      success: true,
      data: {
        team,
        members: memberStats,
        stats: {
          totalMembers: members.length,
          activeToday: recentActive > 0 ? Math.min(members.length, Math.ceil(recentActive / 3)) : 0,
          totalScriptsGenerated: totalScripts,
          avgPracticeScore: avgScore,
        },
        weakScenarios,
      },
    });
  } catch (err) { next(err); }
});

// Remove a member from the team (owner only)
router.delete('/:id/members/:userId', authMiddleware, async (req, res, next) => {
  try {
    const team = await prisma.team.findUnique({ where: { id: req.params.id as string } });
    if (!team) return res.status(404).json({ success: false, error: 'Team not found' });
    if (team.ownerId !== req.user!.id) {
      return res.status(403).json({ success: false, error: 'Only the team owner can remove members' });
    }

    const userId = req.params.userId as string;
    if (userId === team.ownerId) {
      return res.status(400).json({ success: false, error: 'Cannot remove the team owner' });
    }

    const member = await prisma.user.findFirst({ where: { id: userId, teamId: team.id } });
    if (!member) {
      return res.status(404).json({ success: false, error: 'User is not a member of this team' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { teamId: null } });
      await tx.team.update({ where: { id: team.id }, data: { memberCount: { decrement: 1 } } });
    });

    res.json({ success: true, data: { message: 'Member removed successfully' } });
  } catch (err) { next(err); }
});

// Delete/dissolve a team (owner only)
router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    const team = await prisma.team.findUnique({ where: { id: req.params.id as string } });
    if (!team) return res.status(404).json({ success: false, error: 'Team not found' });
    if (team.ownerId !== req.user!.id) {
      return res.status(403).json({ success: false, error: 'Only the team owner can dissolve the team' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.updateMany({ where: { teamId: team.id }, data: { teamId: null } });
      await tx.team.delete({ where: { id: team.id } });
    });

    res.json({ success: true, data: { message: 'Team dissolved successfully' } });
  } catch (err) { next(err); }
});

// Transfer team ownership to another member
router.patch('/:id/transfer', authMiddleware, async (req, res, next) => {
  try {
    const team = await prisma.team.findUnique({ where: { id: req.params.id as string } });
    if (!team) return res.status(404).json({ success: false, error: 'Team not found' });
    if (team.ownerId !== req.user!.id) {
      return res.status(403).json({ success: false, error: 'Only the team owner can transfer ownership' });
    }

    const { newOwnerId } = transferOwnershipSchema.parse(req.body);

    const newOwner = await prisma.user.findFirst({ where: { id: newOwnerId, teamId: team.id } });
    if (!newOwner) {
      return res.status(400).json({ success: false, error: 'New owner must be a member of this team' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.team.update({ where: { id: team.id }, data: { ownerId: newOwnerId } });
      await tx.user.update({ where: { id: req.user!.id }, data: { role: 'USER' } });
      await tx.user.update({ where: { id: newOwnerId }, data: { role: 'TEAM_OWNER' } });
    });

    res.json({ success: true, data: { message: 'Ownership transferred successfully' } });
  } catch (err) { next(err); }
});

export default router;
