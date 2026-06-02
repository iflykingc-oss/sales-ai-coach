import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimit.js';
import { prisma } from '../lib/prisma.js';
import { sendPracticeMessage, callAiService } from '../services/ai.service.js';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const router = Router();

// Auto-select logic framework based on skill focus or scenario
function autoSelectFramework(skillFocus?: string, scenario?: string): string {
  // Skill-based recommendations (internal logic, not exposed to frontend)
  const skillFrameworkMap: Record<string, string> = {
    objection: 'objection-handling',
    closing: 'closing-techniques',
    discovery: 'spin-selling',
    rapport: 'expectation-sync',
    negotiation: 'value-demo',
    presentation: 'fab',
  };

  if (skillFocus && skillFrameworkMap[skillFocus]) {
    return skillFrameworkMap[skillFocus];
  }

  // Default framework for general scenarios
  return 'expectation-sync';
}

// Harness-powered endpoints (direct proxy to AI service)
router.post('/init', authMiddleware, async (req, res, next) => {
  try {
    const { scenario, industry, mode, maxRounds, sessionId, scriptId, logicFramework, difficulty, skillFocus } = req.body;

    // Auto-select framework if not provided (backend logic, hidden from user)
    const selectedFramework = logicFramework || autoSelectFramework(skillFocus, scenario);

    // Fetch knowledge context for realistic practice
    let knowledgeContext = '';
    try {
      const knowledgeItems = await prisma.knowledgeItem.findMany({
        where: { userId: req.user!.id, status: 'ACTIVE' },
        orderBy: { weight: 'desc' },
        take: 10,
      });
      if (knowledgeItems.length > 0) {
        knowledgeContext = knowledgeItems.map((k) => k.content).join('\n---\n');
      }
    } catch { /* ignore knowledge fetch errors */ }

    const result = await callAiService({
      path: '/practices/init',
      body: {
        scenario,
        industry: industry || '',
        mode: mode || 'scenario',
        maxRounds: maxRounds || 10,
        sessionId: sessionId || '',
        scriptId: scriptId || '',
        userId: req.user!.id,
        logicFramework: selectedFramework,
        difficulty: difficulty || 'medium',
        knowledgeContext,
      },
    });
    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
});

router.post('/message', authMiddleware, aiLimiter, async (req, res, next) => {
  try {
    const { sessionId, message, logicFramework } = req.body;
    const result = await callAiService({
      path: '/practices/message',
      body: { sessionId, message, logicFramework: logicFramework || '' },
    });
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// Streaming practice message (SSE proxy)
router.post('/message/stream', authMiddleware, aiLimiter, async (req, res, next) => {
  try {
    const { sessionId, message, logicFramework } = req.body;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const aiRes = await fetch(`${AI_SERVICE_URL}/api/practices/message/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, message, logicFramework: logicFramework || '' }),
    });

    if (!aiRes.ok) {
      const error = await aiRes.text();
      res.status(aiRes.status).json({ success: false, error });
      return;
    }

    // Pipe the SSE stream from AI service to client
    const reader = aiRes.body?.getReader();
    if (!reader) {
      res.status(500).json({ success: false, error: 'No response body' });
      return;
    }

    const decoder = new TextDecoder();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        res.write(chunk);
        // Flush immediately for SSE
        if (typeof (res as any).flush === 'function') {
          (res as any).flush();
        }
      }
    } finally {
      reader.releaseLock();
      res.end();
    }
  } catch (err) { next(err); }
});

router.post('/report', authMiddleware, async (req, res, next) => {
  try {
    const { sessionId } = req.body;
    const result = await callAiService({
      path: '/practices/report',
      body: { sessionId },
    });
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

router.post('/hint', authMiddleware, async (req, res, next) => {
  try {
    const { sessionId } = req.body;
    const result = await callAiService({
      path: '/practices/hint',
      body: { sessionId },
    });
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// Save completed practice session to DB with pipeline linkage
router.post('/save', authMiddleware, async (req, res, next) => {
  try {
    const { sessionId, scriptId, scenario, industry, rounds, score, feedback, transcript } = req.body;

    const practice = await prisma.practiceSession.create({
      data: {
        userId: req.user!.id,
        sessionId: sessionId || null,
        scriptId: scriptId || null,
        scenario: scenario || '',
        industry: industry || null,
        rounds: rounds || 0,
        score: score || 0,
        feedback: feedback || {},
        transcript: transcript || null,
      },
    });

    // Auto-advance pipeline stage to REVIEW if linked to a session
    if (sessionId) {
      await prisma.session.updateMany({
        where: { id: sessionId, userId: req.user!.id, stage: { in: ['SCRIPT', 'PRACTICE'] } },
        data: { stage: 'REVIEW' },
      });
    }

    res.status(201).json({ success: true, data: practice });
  } catch (err) { next(err); }
});

// Legacy DB-backed endpoints (still available)
router.post('/start', authMiddleware, async (req, res, next) => {
  try {
    const { scenario, industry, mode } = req.body;
    const practice = await prisma.practiceSession.create({
      data: {
        userId: req.user!.id,
        scenario,
        industry: industry || null,
        rounds: 0,
        score: 0,
        feedback: { mode, status: 'started' },
      },
    });
    res.status(201).json({ success: true, data: practice });
  } catch (err) { next(err); }
});

router.post('/:id/message', authMiddleware, aiLimiter, async (req, res, next) => {
  try {
    const { content } = req.body;
    const practice = await prisma.practiceSession.findUnique({ where: { id: req.params.id as string } });
    if (!practice || practice.userId !== req.user!.id) {
      return res.status(404).json({ success: false, error: 'Practice session not found' });
    }

    const feedback = practice.feedback as Record<string, unknown>;
    const messages = (feedback.messages as Array<{ role: 'user' | 'assistant'; content: string }> || []);

    const result = await sendPracticeMessage({
      scenario: practice.scenario,
      industry: practice.industry || undefined,
      mode: (feedback.mode as string) || 'scenario',
      messages: [...messages, { role: 'user' as const, content }],
      userId: req.user!.id,
    });

    const updatedMessages = [...messages, { role: 'user' as const, content }, { role: 'assistant' as const, content: result.response }];
    await prisma.practiceSession.update({
      where: { id: req.params.id as string },
      data: {
        rounds: { increment: 1 },
        feedback: { ...feedback, messages: updatedMessages, emotion: result.emotion },
        ...(result.isComplete ? {
          score: result.feedback?.overallScore || 0,
        } : {}),
      },
    });

    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const practices = await prisma.practiceSession.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: practices });
  } catch (err) { next(err); }
});

router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const practice = await prisma.practiceSession.findFirst({
      where: { id: req.params.id as string, userId: req.user!.id },
    });
    if (!practice) return res.status(404).json({ success: false, error: 'Practice session not found' });
    res.json({ success: true, data: practice });
  } catch (err) { next(err); }
});

export default router;
