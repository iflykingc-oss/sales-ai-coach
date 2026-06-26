import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimit.js';
import { prisma } from '../lib/prisma.js';
import { sendPracticeMessage, callAiService, aiServiceHeaders } from '../services/ai.service.js';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const router = Router();

// Zod schemas for input validation
const initSchema = z.object({
  scenario: z.string().min(1).max(500),
  industry: z.string().max(100).optional(),
  mode: z.enum(['scenario', 'freeform', 'special', 'objection_training']).optional(),
  maxRounds: z.number().int().min(1).max(50).optional(),
  sessionId: z.string().uuid().optional(),
  scriptId: z.string().uuid().optional(),
  logicFramework: z.string().max(100).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  skillFocus: z.string().max(50).optional(),
});

const messageSchema = z.object({
  sessionId: z.string().min(1),
  message: z.string().min(1).max(5000),
  logicFramework: z.string().max(100).optional(),
});

const analyzeDocumentSchema = z.object({
  fileName: z.string().min(1).max(200),
  content: z.string().min(1).max(50000),
});

const savePracticeSchema = z.object({
  sessionId: z.string().uuid().optional(),
  scriptId: z.string().uuid().optional(),
  scenario: z.string().max(500).optional(),
  industry: z.string().max(100).optional(),
  rounds: z.number().int().min(0).max(100).optional(),
  score: z.number().min(0).max(100).optional(),
  feedback: z.record(z.unknown()).optional(),
  transcript: z.unknown().optional(),
});

const startPracticeSchema = z.object({
  scenario: z.string().min(1).max(500),
  industry: z.string().max(100).optional(),
  mode: z.string().max(50).optional(),
});

// Auto-select logic framework based on skill focus or scenario
function autoSelectFramework(skillFocus?: string, scenario?: string): string {
  // Skill-based recommendations (internal logic, not exposed to frontend)
  const skillFrameworkMap: Record<string, string> = {
    objection: 'objection-handling',
    closing: 'closing-techniques',
    discovery: 'spin-selling',
    rapport: 'expectation-sync',
    negotiation: 'value-demo',
    presentation: 'fab-principle',
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
    const parsed = initSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.flatten() });
    }
    const { scenario, industry, mode, maxRounds, sessionId, scriptId, logicFramework, difficulty, skillFocus } = parsed.data;

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
    const parsed = messageSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.flatten() });
    }
    const { sessionId, message, logicFramework } = parsed.data;
    const result = await callAiService({
      path: '/practices/message',
      body: { sessionId, message, logicFramework: logicFramework || '' },
    });
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// Analyze uploaded document for practice context
router.post('/analyze-document', authMiddleware, async (req, res, next) => {
  try {
    const parsed = analyzeDocumentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.flatten() });
    }
    const { fileName, content } = parsed.data;

    // Call AI service to analyze document
    const result = await callAiService({
      path: '/practices/analyze-document',
      body: { fileName, content },
    });

    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// Streaming practice message (SSE proxy)
router.post('/message/stream', authMiddleware, aiLimiter, async (req, res, next) => {
  try {
    const parsed = messageSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.flatten() });
    }
    const { sessionId, message, logicFramework } = parsed.data;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const aiRes = await fetch(`${AI_SERVICE_URL}/api/practices/message/stream`, {
      method: 'POST',
      headers: aiServiceHeaders(),
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
    const parsed = savePracticeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.flatten() });
    }
    const { sessionId, scriptId, scenario, industry, rounds, score, feedback, transcript } = parsed.data;

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
        transcript: transcript ? JSON.parse(JSON.stringify(transcript)) : null,
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
    const parsed = startPracticeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.flatten() });
    }
    const { scenario, industry, mode } = parsed.data;
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
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const [practices, total] = await Promise.all([
      prisma.practiceSession.findMany({
        where: { userId: req.user!.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.practiceSession.count({ where: { userId: req.user!.id } }),
    ]);

    res.json({ success: true, data: practices, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
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
