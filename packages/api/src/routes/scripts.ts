import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimit.js';
import { quotaMiddleware } from '../middleware/quota.js';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { generateScript } from '../services/ai.service.js';

/**
 * Simple character-level similarity (Jaccard on bigrams).
 * Returns 0-1. Used for deduplicating knowledge items.
 */
function _similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const bigramsA = new Set<string>();
  const bigramsB = new Set<string>();
  for (let i = 0; i < a.length - 1; i++) bigramsA.add(a.slice(i, i + 2));
  for (let i = 0; i < b.length - 1; i++) bigramsB.add(b.slice(i, i + 2));
  let intersection = 0;
  for (const bg of bigramsA) if (bigramsB.has(bg)) intersection++;
  const union = bigramsA.size + bigramsB.size - intersection;
  return union > 0 ? intersection / union : 0;
}

const router = Router();

router.post('/generate', authMiddleware, aiLimiter, quotaMiddleware('scripts'), async (req, res, next) => {
  try {
    const { input, inputType, industry, context, sessionId, frameworks } = req.body;

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
          .sort((a, b) => b.score - a.score);

        // Deduplicate: remove items with >80% content overlap
        const deduped: typeof scored = [];
        const seenContents = new Set<string>();
        for (const item of scored) {
          const normalized = item.content.replace(/\s+/g, '').slice(0, 100);
          // Check if this content overlaps significantly with any already-seen content
          let isDuplicate = false;
          for (const seen of seenContents) {
            if (_similarity(normalized, seen) > 0.8) {
              isDuplicate = true;
              break;
            }
          }
          if (!isDuplicate) {
            seenContents.add(normalized);
            deduped.push(item);
          }
          if (deduped.length >= 5) break;
        }

        if (deduped.length > 0) {
          const ragContent = deduped
            .map((item, i) => `[知识${i + 1}${item.source ? ` (${item.source})` : ''}]\n${item.content}`)
            .join('\n\n---\n\n');
          knowledgeContext = knowledgeContext
            ? `${knowledgeContext}\n\n${ragContent}`
            : ragContent;
        }
      }
    } catch (ragErr) {
      // RAG failure shouldn't block script generation
      logger.warn('RAG retrieval failed', { error: String(ragErr) });
    }

    const result = await generateScript({
      input, inputType, industry, context: knowledgeContext, userId: req.user!.id,
      frameworks: frameworks || [],
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

    // Auto-advance pipeline stage to PRACTICE after script generation
    if (sessionId) {
      await prisma.session.updateMany({
        where: { id: sessionId, userId: req.user!.id, stage: 'SCRIPT' },
        data: { stage: 'PRACTICE' },
      });
    }

    // Normalize to camelCase for frontend (Python AI service returns snake_case)
    const raw = result as any;
    const normalized = {
      speechStyles: speechStyles,
      reasoning: raw.reasoning || [],
      pitfalls: raw.pitfalls || [],
      knowledgeSource: raw.knowledge_source || raw.knowledgeSource || '',
      confidenceScore: raw.confidence_score || raw.confidenceScore || 0,
      quality_report: raw.quality_report,
      execution_report: raw.execution_report,
      painAnalysis: raw.pain_analysis || raw.painAnalysis || null,
      scenarioBreakdown: raw.scenario_breakdown || raw.scenarioBreakdown || null,
      followUpQuestions: raw.follow_up_questions || raw.followUpQuestions || [],
      objectionHandling: raw.objection_handling || raw.objectionHandling || [],
      closingStrategy: raw.closing_strategy || raw.closingStrategy || null,
      // Framework analysis fields
      swotAnalysis: raw.swotAnalysis || raw.swot_analysis || null,
      scenario5w2h: raw.scenario5w2h || raw.scenario_5w2h || null,
      aidaFlow: raw.aidaFlow || raw.aida_flow || null,
      fabMapping: raw.fabMapping || raw.fab_mapping || null,
      bantQualification: raw.bantQualification || raw.bant_qualification || null,
      meddicAnalysis: raw.meddicAnalysis || raw.meddic_analysis || null,
      porterForces: raw.porterForces || raw.porter_forces || null,
      journeyStage: raw.journeyStage || raw.journey_stage || null,
      scqaNarrative: raw.scqaNarrative || raw.scqa_narrative || null,
      challengerInsight: raw.challengerInsight || raw.challenger_insight || null,
      frameworkAnalysis: raw.frameworkAnalysis || raw.framework_analysis || null,
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

    // Persist feedback to database
    await prisma.scriptFeedback.create({
      data: {
        userId: req.user!.id,
        scriptId: req.params.id as string,
        type,
        reason: reason || null,
      },
    });

    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
