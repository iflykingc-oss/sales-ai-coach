import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimit.js';
import { prisma } from '../lib/prisma.js';
import { generateScript } from '../services/ai.service.js';

const router = Router();

router.post('/generate', authMiddleware, aiLimiter, async (req, res, next) => {
  try {
    const { input, inputType, industry, context, sessionId } = req.body;

    // RAG: search user's knowledge base for relevant content
    let knowledgeContext = context || '';
    try {
      const knowledgeItems = await prisma.knowledgeItem.findMany({
        where: { userId: req.user!.id, status: 'ACTIVE' },
        orderBy: [{ weight: 'desc' }, { createdAt: 'desc' }],
        take: 50,
        select: { content: true, source: true, tags: true },
      });

      if (knowledgeItems.length > 0) {
        // Simple keyword matching for RAG
        const inputLower = (input || '').toLowerCase();
        const keywords = inputLower.split(/[\s,，。、；：！？!?.]+/).filter((w: string) => w.length > 1);

        const scored = knowledgeItems
          .map((item) => {
            const contentLower = item.content.toLowerCase();
            const matchCount = keywords.filter((kw: string) => contentLower.includes(kw)).length;
            const weightBonus = (item as any).weight || 1;
            return { ...item, score: matchCount * weightBonus };
          })
          .filter((item) => item.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 5);

        if (scored.length > 0) {
          const ragContent = scored
            .map((item, i) => `[来源${i + 1}${item.source ? `: ${item.source}` : ''}]\n${item.content}`)
            .join('\n\n---\n\n');
          knowledgeContext = knowledgeContext
            ? `${knowledgeContext}\n\n=== 知识库参考 ===\n${ragContent}`
            : `=== 知识库参考 ===\n${ragContent}`;
        }
      }
    } catch (ragErr) {
      // RAG failure shouldn't block script generation
      console.warn(`RAG retrieval failed: ${ragErr}`);
    }

    const result = await generateScript({
      input, inputType, industry, context: knowledgeContext, userId: req.user!.id,
    });

    // Save generated scripts and collect IDs
    const createdIds: string[] = [];
    const speechStyles = (result as any).speech_styles || result.speechStyles || [];
    for (const style of speechStyles) {
      const created = await prisma.script.create({
        data: {
          userId: req.user!.id,
          sessionId: sessionId || null,
          content: style.content,
          style: style.style,
          tags: [],
          industry: industry || null,
        },
      });
      createdIds.push(created.id);
    }

    // Normalize to camelCase for frontend (Python AI service returns snake_case)
    const normalized = {
      speechStyles: speechStyles,
      reasoning: (result as any).reasoning || [],
      pitfalls: (result as any).pitfalls || [],
      knowledgeSource: (result as any).knowledge_source || (result as any).knowledgeSource || '',
      confidenceScore: (result as any).confidence_score || (result as any).confidenceScore || 0,
      quality_report: (result as any).quality_report,
      execution_report: (result as any).execution_report,
    };
    res.json({ success: true, data: normalized, scriptIds: createdIds });
  } catch (err) { next(err); }
});

router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const { sessionId, tag } = req.query;
    const where: Record<string, unknown> = { userId: req.user!.id };
    if (sessionId) where.sessionId = sessionId;
    if (tag) where.tags = { has: tag as string };

    const scripts = await prisma.script.findMany({ where, orderBy: { createdAt: 'desc' } });
    res.json({ success: true, data: scripts });
  } catch (err) { next(err); }
});

router.post('/:id/feedback', authMiddleware, async (req, res, next) => {
  try {
    const { type, reason } = req.body as { type: 'up' | 'down'; reason?: string };
    const weightDelta = type === 'up' ? 0.1 : -0.2;
    const script = await prisma.script.findFirst({
      where: { id: req.params.id as string, userId: req.user!.id },
    });
    if (!script) return res.status(404).json({ success: false, error: 'Script not found' });

    const newWeight = Math.max(0.1, script.weight + weightDelta);
    await prisma.script.update({
      where: { id: req.params.id as string },
      data: { weight: newWeight },
    });

    // Log feedback reason for analytics (in production, store in a feedback table)
    if (reason && type === 'down') {
      console.log(`[Feedback] Script ${req.params.id as string}: ${reason}`);
    }

    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
