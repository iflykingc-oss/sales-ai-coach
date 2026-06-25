import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimit.js';
import { prisma } from '../lib/prisma.js';
import { analyzeReview } from '../services/ai.service.js';

const router = Router();

// Fetch knowledge context for review benchmarking
async function getKnowledgeContext(userId: string): Promise<string> {
  try {
    const items = await prisma.knowledgeItem.findMany({
      where: { userId, status: 'ACTIVE' },
      orderBy: { weight: 'desc' },
      take: 10,
    });
    return items.map((k) => k.content).join('\n---\n');
  } catch { return ''; }
}

router.post('/generate', authMiddleware, aiLimiter, async (req, res, next) => {
  try {
    const { conversations, sessionId, practiceSessionId } = req.body;
    const knowledgeContext = await getKnowledgeContext(req.user!.id);

    const analysis = await analyzeReview({
      conversations,
      userId: req.user!.id,
      knowledgeContext,
    });

    const report = await prisma.reviewReport.create({
      data: {
        userId: req.user!.id,
        sessionId: sessionId || null,
        practiceSessionId: practiceSessionId || null,
        summary: analysis.summary,
        strengths: analysis.strengths,
        improvements: analysis.improvements,
        recommendations: analysis.recommendations,
        radarScores: analysis.radarScores || null,
      },
    });

    // Auto-advance pipeline stage to CLOSED if linked
    if (sessionId) {
      await prisma.session.updateMany({
        where: { id: sessionId, userId: req.user!.id },
        data: { stage: 'CLOSED' },
      });
    }

    res.json({ success: true, data: report });
  } catch (err) { next(err); }
});

// Generate review directly from a practice session
router.post('/from-practice', authMiddleware, aiLimiter, async (req, res, next) => {
  try {
    const { practiceSessionId } = req.body;
    if (!practiceSessionId) {
      return res.status(400).json({ success: false, error: 'Missing practiceSessionId' });
    }

    const practice = await prisma.practiceSession.findFirst({
      where: { id: practiceSessionId, userId: req.user!.id },
    });
    if (!practice) {
      return res.status(404).json({ success: false, error: 'Practice session not found' });
    }

    // Check if review already exists
    const existing = await prisma.reviewReport.findFirst({
      where: { practiceSessionId },
    });
    if (existing) {
      return res.json({ success: true, data: existing, reused: true });
    }

    // Build conversations from transcript
    const transcript = practice.transcript as Array<{ role: string; content: string }> | null;
    const conversations = transcript || [];

    if (conversations.length === 0) {
      return res.status(400).json({ success: false, error: 'No conversation transcript available' });
    }

    const knowledgeContext = await getKnowledgeContext(req.user!.id);

    const analysis = await analyzeReview({
      conversations,
      userId: req.user!.id,
      knowledgeContext,
    });

    const report = await prisma.reviewReport.create({
      data: {
        userId: req.user!.id,
        sessionId: practice.sessionId || null,
        practiceSessionId,
        summary: analysis.summary,
        strengths: analysis.strengths,
        improvements: analysis.improvements,
        recommendations: analysis.recommendations,
        radarScores: analysis.radarScores || null,
      },
    });

    // Advance pipeline to CLOSED
    if (practice.sessionId) {
      await prisma.session.updateMany({
        where: { id: practice.sessionId, userId: req.user!.id },
        data: { stage: 'CLOSED' },
      });
    }

    res.json({ success: true, data: report });
  } catch (err) { next(err); }
});

router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const [reports, total] = await Promise.all([
      prisma.reviewReport.findMany({
        where: { userId: req.user!.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.reviewReport.count({ where: { userId: req.user!.id } }),
    ]);

    res.json({ success: true, data: reports, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
});

router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    const report = await prisma.reviewReport.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (!report) return res.status(404).json({ success: false, error: 'Report not found' });
    await prisma.reviewReport.delete({ where: { id: req.params.id } });
    res.json({ success: true });
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
