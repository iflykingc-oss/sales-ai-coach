/**
 * v1 Public API Routes
 *
 * For external consumers (enterprise/team users with API keys).
 * All routes require API key authentication via Bearer token.
 *
 * Endpoints:
 *   POST /v1/scripts/generate   — Generate sales scripts (STANDARD+)
 *   GET  /v1/scripts            — List user's scripts (BASIC+)
 *   POST /v1/practices/start    — Start practice session (PREMIUM+)
 *   POST /v1/practices/message  — Send practice message (PREMIUM+)
 *   POST /v1/reviews/analyze    — Analyze conversation (PREMIUM+)
 *   GET  /v1/scenarios          — List practice scenarios (BASIC+)
 *   GET  /v1/frameworks         — List sales frameworks (BASIC+)
 *   GET  /v1/knowledge          — Search knowledge base (STANDARD+)
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { apiKeyAuth, requirePermission, logApiUsage } from '../middleware/apiKey.js';
import { aiServiceHeaders } from '../services/ai.service.js';
import { salesLogicFrameworks } from '@sales-ai-coach/shared';

const router = Router();

// All v1 routes require API key + usage logging
router.use(apiKeyAuth);
router.use(logApiUsage);

// ── GET /v1/scenarios ──────────────────────────────────────────
router.get('/scenarios', requirePermission('scenarios:read'), async (_req: Request, res: Response) => {
  const scenarios = [
    { id: 're-1', name: '首次看房接待', industry: '房地产', description: '客户第一次来看房，需要建立信任' },
    { id: 're-2', name: '价格谈判', industry: '房地产', description: '客户对价格有异议，需要谈判技巧' },
    { id: 're-3', name: '处理客户犹豫', industry: '房地产', description: '客户犹豫不决，需要推动决策' },
    { id: 'au-1', name: '新车介绍', industry: '汽车', description: '客户想了解新车，需要专业介绍' },
    { id: 'au-2', name: '竞品对比', industry: '汽车', description: '客户在对比竞品，需要差异化分析' },
    { id: 'au-3', name: '试驾后促单', industry: '汽车', description: '试驾后需要促成订单' },
    { id: 'sa-1', name: '需求挖掘', industry: 'SaaS', description: '需要了解客户真实需求' },
    { id: 'sa-2', name: '方案演示', industry: 'SaaS', description: '需要演示产品方案价值' },
    { id: 'sa-3', name: '处理预算异议', industry: 'SaaS', description: '客户预算不足，需要灵活应对' },
    { id: 'in-1', name: '保险需求分析', industry: '保险', description: '需要分析客户保险需求' },
    { id: 'in-2', name: '方案推荐', industry: '保险', description: '需要推荐合适的保险方案' },
    { id: 'in-3', name: '处理理赔担忧', industry: '保险', description: '客户担心理赔，需要建立信心' },
  ];
  return res.json({ success: true, data: scenarios, total: scenarios.length });
});

// ── GET /v1/frameworks ─────────────────────────────────────────
router.get('/frameworks', requirePermission('scenarios:read'), (_req: Request, res: Response) => {
  return res.json({
    success: true,
    data: salesLogicFrameworks.map((fw) => ({
      id: fw.id,
      name: fw.name,
      nameEn: fw.nameEn,
      description: fw.description,
      stages: fw.stages.length,
      useCases: fw.useCases,
    })),
    total: salesLogicFrameworks.length,
  });
});

// ── POST /v1/scripts/generate ──────────────────────────────────
const generateScriptSchema = z.object({
  input: z.string().min(1).max(5000),
  inputType: z.enum(['TEXT', 'IMAGE', 'VOICE', 'FORM', 'PASTE']).default('TEXT'),
  industry: z.string().optional(),
  frameworks: z.array(z.string()).default([]),
});

router.post('/scripts/generate', requirePermission('scripts:generate'), async (req: Request, res: Response) => {
  try {
    const body = generateScriptSchema.parse(req.body);
    const userId = req.user!.id;

    // Create a session for this generation
    const session = await prisma.session.create({
      data: {
        userId,
        name: `API生成-${new Date().toLocaleDateString('zh-CN')}`,
        industry: body.industry,
        stage: 'SCRIPT',
      },
    });

    // Save user message
    await prisma.message.create({
      data: {
        sessionId: session.id,
        role: 'USER',
        content: body.input,
        inputType: body.inputType as any,
      },
    });

    // Call AI service
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    const response = await fetch(`${aiServiceUrl}/scripts/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: body.input,
        input_type: body.inputType,
        industry: body.industry,
        session_id: session.id,
        frameworks: body.frameworks,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI service error: ${response.status}`);
    }

    const result: any = await response.json();

    // Save generated scripts
    const scriptIds: string[] = [];
    if (result.data?.speechStyles) {
      for (const style of result.data.speechStyles) {
        const script = await prisma.script.create({
          data: {
            userId,
            sessionId: session.id,
            content: style.content,
            style: style.style,
            industry: body.industry,
            tags: body.frameworks,
          },
        });
        scriptIds.push(script.id);
      }
    }

    return res.json({
      success: true,
      data: {
        sessionId: session.id,
        scriptIds,
        ...result.data,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: err.errors });
    }
    return res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Script generation failed',
    });
  }
});

// ── GET /v1/scripts ────────────────────────────────────────────
router.get('/scripts', requirePermission('scripts:read'), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const [scripts, total] = await Promise.all([
      prisma.script.findMany({
        where: { userId },
        select: {
          id: true,
          content: true,
          style: true,
          industry: true,
          tags: true,
          status: true,
          weight: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.script.count({ where: { userId } }),
    ]);

    return res.json({
      success: true,
      data: scripts,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to fetch scripts' });
  }
});

// ── POST /v1/practices/start ───────────────────────────────────
const startPracticeSchema = z.object({
  scenarioId: z.string().optional(),
  scenarioName: z.string().optional(),
  industry: z.string().optional(),
  mode: z.enum(['scenario', 'freeform', 'special']).default('scenario'),
  logicFramework: z.string().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard', 'expert']).default('medium'),
  maxRounds: z.number().int().min(3).max(30).default(10),
});

router.post('/practices/start', requirePermission('practices:create'), async (req: Request, res: Response) => {
  try {
    const body = startPracticeSchema.parse(req.body);
    const userId = req.user!.id;

    // Create session
    const session = await prisma.session.create({
      data: {
        userId,
        name: body.scenarioName || `API陪练-${body.mode}`,
        industry: body.industry,
        stage: 'PRACTICE',
      },
    });

    // Call AI service to initialize practice
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    const response = await fetch(`${aiServiceUrl}/practices/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: session.id,
        scenario_id: body.scenarioId,
        scenario_name: body.scenarioName,
        industry: body.industry,
        mode: body.mode,
        logic_framework: body.logicFramework,
        difficulty: body.difficulty,
        max_rounds: body.maxRounds,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI service error: ${response.status}`);
    }

    const result: any = await response.json();

    return res.json({
      success: true,
      data: {
        sessionId: session.id,
        practiceSessionId: result.data?.session_id,
        maxRounds: body.maxRounds,
        ...result.data,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: err.errors });
    }
    return res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Failed to start practice',
    });
  }
});

// ── POST /v1/practices/message ─────────────────────────────────
const practiceMessageSchema = z.object({
  sessionId: z.string().uuid(),
  message: z.string().min(1).max(2000),
});

router.post('/practices/message', requirePermission('practices:create'), async (req: Request, res: Response) => {
  try {
    const body = practiceMessageSchema.parse(req.body);

    // Verify session ownership
    const session = await prisma.session.findFirst({
      where: { id: body.sessionId, userId: req.user!.id },
    });
    if (!session) {
      return res.status(404).json({ success: false, error: 'Practice session not found' });
    }

    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    const response = await fetch(`${aiServiceUrl}/practices/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: body.sessionId,
        message: body.message,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI service error: ${response.status}`);
    }

    const result: any = await response.json();
    return res.json({ success: true, data: result.data || result });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: err.errors });
    }
    return res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Practice message failed',
    });
  }
});

// ── POST /v1/reviews/analyze ───────────────────────────────────
const analyzeReviewSchema = z.object({
  sessionId: z.string().uuid(),
});

router.post('/reviews/analyze', requirePermission('reviews:create'), async (req: Request, res: Response) => {
  try {
    const body = analyzeReviewSchema.parse(req.body);
    const userId = req.user!.id;

    // Verify session ownership
    const session = await prisma.session.findFirst({
      where: { id: body.sessionId, userId },
    });
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    // Get messages
    const messages = await prisma.message.findMany({
      where: { sessionId: body.sessionId },
      orderBy: { createdAt: 'asc' },
    });

    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    const response = await fetch(`${aiServiceUrl}/reviews/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: body.sessionId,
        conversations: messages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });

    if (!response.ok) {
      throw new Error(`AI service error: ${response.status}`);
    }

    const result: any = await response.json();

    // Save review report
    const report = await prisma.reviewReport.create({
      data: {
        userId,
        sessionId: body.sessionId,
        summary: result.data?.summary || '',
        strengths: result.data?.strengths || [],
        improvements: result.data?.improvements || [],
        recommendations: (result.data?.recommendations || []).map((r: any) =>
          typeof r === 'string' ? r : r.advice || JSON.stringify(r),
        ),
      },
    });

    // Update session stage
    await prisma.session.update({
      where: { id: body.sessionId },
      data: { stage: 'REVIEW' },
    });

    return res.json({ success: true, data: { reportId: report.id, ...result.data } });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: err.errors });
    }
    return res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Review analysis failed',
    });
  }
});

// ── GET /v1/knowledge ──────────────────────────────────────────
router.get('/knowledge', requirePermission('knowledge:read'), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const q = (req.query.q as string) || '';
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));

    const items = await prisma.knowledgeItem.findMany({
      where: {
        userId,
        status: 'ACTIVE',
        ...(q ? { content: { contains: q, mode: 'insensitive' } } : {}),
      },
      select: {
        id: true,
        source: true,
        content: true,
        tags: true,
        industry: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return res.json({ success: true, data: items, total: items.length });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to fetch knowledge' });
  }
});

export default router;
