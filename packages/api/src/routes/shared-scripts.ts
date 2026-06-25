import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';

const shareScriptSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1, '内容不能为空').max(50000),
  industry: z.string().max(100).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  scriptId: z.string().uuid().optional(),
});

const approveSchema = z.object({
  approved: z.boolean(),
});

const router = Router();

// Get shared scripts for a team
router.get('/:teamId', authMiddleware, async (req, res, next) => {
  try {
    const teamId = req.params.teamId as string;
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) return res.status(404).json({ success: false, error: 'Team not found' });

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (team.ownerId !== req.user!.id && user?.teamId !== team.id) {
      return res.status(403).json({ success: false, error: 'Not a member of this team' });
    }

    const scripts = await prisma.sharedScript.findMany({
      where: { teamId: team.id },
      include: {
        author: { select: { id: true, name: true } },
        likedBy: { where: { userId: req.user!.id }, select: { id: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const result = scripts.map((s) => ({
      id: s.id,
      title: s.title,
      content: s.content,
      industry: s.industry,
      tags: s.tags,
      authorId: s.authorId,
      authorName: s.author.name,
      likes: s.likes,
      approved: s.approved,
      likedByCurrentUser: s.likedBy.length > 0,
      createdAt: s.createdAt.toISOString().split('T')[0],
    }));

    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// Share a script to team
router.post('/:teamId', authMiddleware, async (req, res, next) => {
  try {
    const teamId = req.params.teamId as string;
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) return res.status(404).json({ success: false, error: 'Team not found' });

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (team.ownerId !== req.user!.id && user?.teamId !== team.id) {
      return res.status(403).json({ success: false, error: 'Not a member of this team' });
    }

    const parsed = shareScriptSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.flatten() });
    }
    const { title, content, industry, tags, scriptId } = parsed.data;
    const script = await prisma.sharedScript.create({
      data: {
        teamId: team.id,
        authorId: req.user!.id,
        scriptId: scriptId || null,
        title: title || '分享话术',
        content,
        industry: industry || null,
        tags: tags || [],
        approved: team.ownerId === req.user!.id, // Auto-approve if owner
      },
    });

    res.status(201).json({ success: true, data: script });
  } catch (err) { next(err); }
});

// Like/unlike a shared script
router.post('/:teamId/:scriptId/like', authMiddleware, async (req, res, next) => {
  try {
    const script = await prisma.sharedScript.findFirst({
      where: { id: req.params.scriptId as string, teamId: req.params.teamId as string },
    });
    if (!script) return res.status(404).json({ success: false, error: 'Script not found' });

    const existing = await prisma.sharedScriptLike.findUnique({
      where: { userId_scriptId: { userId: req.user!.id, scriptId: script.id } },
    });

    if (existing) {
      await prisma.$transaction([
        prisma.sharedScriptLike.delete({ where: { id: existing.id } }),
        prisma.sharedScript.update({ where: { id: script.id }, data: { likes: { decrement: 1 } } }),
      ]);
      res.json({ success: true, liked: false });
    } else {
      await prisma.$transaction([
        prisma.sharedScriptLike.create({ data: { userId: req.user!.id, scriptId: script.id } }),
        prisma.sharedScript.update({ where: { id: script.id }, data: { likes: { increment: 1 } } }),
      ]);
      res.json({ success: true, liked: true });
    }
  } catch (err) { next(err); }
});

// Approve/reject a shared script (team owner only)
router.patch('/:teamId/:scriptId/approve', authMiddleware, async (req, res, next) => {
  try {
    const team = await prisma.team.findUnique({ where: { id: req.params.teamId as string } });
    if (!team || team.ownerId !== req.user!.id) {
      return res.status(403).json({ success: false, error: 'Only team owner can approve' });
    }

    const { approved } = req.body;
    if (approved) {
      await prisma.sharedScript.update({
        where: { id: req.params.scriptId as string },
        data: { approved: true },
      });
      res.json({ success: true });
    } else {
      await prisma.sharedScript.delete({ where: { id: req.params.scriptId as string } });
      res.json({ success: true, deleted: true });
    }
  } catch (err) { next(err); }
});

export default router;
