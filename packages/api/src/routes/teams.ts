import { Router } from 'express';
import { authMiddleware } from from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';

const router = Router();

router.post('/', authMiddleware, async (req: Request, res, next) => {
  try {
    const { name } = req.body;
    const team = await prisma.team.create({
      data: { name, ownerId: req.user!.id },
    });
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { teamId: team.id, role: 'TEAM_OWNER' },
    });
    res.status(201).json({ success: true, data: team });
  } catch (err) { next(err); }
});

router.get('/my', authMiddleware, async (req: Request, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id }, include: { team: true } });
    res.json({ success: true, data: user?.team });
  } catch (err) { next(err); }
});

router.get('/:id/dashboard', authMiddleware, async (req: Request, res, next) => {
  try {
    const team = await prisma.team.findFirst({
      where: { id: req.params.id, ownerId: req.user!.id },
    });
    if (!team) return res.status(404).json({ success: false, error: 'Team not found' });

    const members = await prisma.user.findMany({
      where: { teamId: team.id },
      select: { id: true, name: true, email: true },
    });

    res.json({ success: true, data: { team, members } });
  } catch (err) { next(err); }
});

router.post('/:id/tasks', authMiddleware, async (req: Request, res, next) => {
  try {
    const { assigneeId, type, scenario, deadline } = req.body;
    const task = await prisma.teamTask.create({
      data: { teamId: req.params.id, assigneeId, type, scenario, deadline: new Date(deadline) },
    });
    res.status(201).json({ success: true, data: task });
  } catch (err) { next(err); }
});

router.get('/:id/tasks', authMiddleware, async (req: Request, res, next) => {
  try {
    const tasks = await prisma.teamTask.findMany({
      where: { teamId: req.params.id },
      orderBy: { deadline: 'asc' },
    });
    res.json({ success: true, data: tasks });
  } catch (err) { next(err); }
});

export default router;
