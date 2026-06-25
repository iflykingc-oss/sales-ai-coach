/**
 * Compliance Routes
 *
 * Handles GDPR (international) and China PIPL (个人信息保护法) requirements:
 * - Consent management (record/update user consents)
 * - Data export (right to portability / 个人信息复制权)
 * - Data deletion (right to erasure / 个人信息删除权)
 * - Privacy policy versioning
 *
 * China laws: 网络安全法, 数据安全法, 个人信息保护法
 * EU laws: GDPR (General Data Protection Regulation)
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { z } from 'zod';

const router = Router();

// ── Consent Management ─────────────────────────────────────────

const consentTypes = ['PRIVACY_POLICY', 'TERMS_OF_SERVICE', 'DATA_PROCESSING', 'MARKETING'] as const;

const recordConsentSchema = z.object({
  type: z.enum(consentTypes),
  version: z.string().min(1).max(50),
  accepted: z.boolean(),
});

// POST /compliance/consent — Record or update consent
router.post('/consent', authMiddleware, async (req: Request, res: Response) => {
  try {
    const body = recordConsentSchema.parse(req.body);
    const userId = req.user!.id;

    const consent = await prisma.consentRecord.create({
      data: {
        userId,
        type: body.type,
        version: body.version,
        accepted: body.accepted,
        ip: req.ip || req.headers['x-forwarded-for'] as string || null,
        userAgent: req.headers['user-agent'] || null,
      },
    });

    return res.json({ success: true, data: consent });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: err.errors });
    }
    return res.status(500).json({ success: false, error: 'Failed to record consent' });
  }
});

// POST /compliance/consent/batch — Record multiple consents at once (e.g. on signup)
router.post('/consent/batch', authMiddleware, async (req: Request, res: Response) => {
  try {
    const body = z
      .object({
        consents: z.array(recordConsentSchema).min(1).max(10),
        version: z.string().min(1).max(50),
      })
      .parse(req.body);

    const userId = req.user!.id;
    const ip = req.ip || req.headers['x-forwarded-for'] as string || null;
    const userAgent = req.headers['user-agent'] || null;

    const records = await prisma.$transaction(
      body.consents.map((c) =>
        prisma.consentRecord.create({
          data: {
            userId,
            type: c.type,
            version: c.version || body.version,
            accepted: c.accepted,
            ip,
            userAgent,
          },
        }),
      ),
    );

    return res.json({ success: true, data: records });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: err.errors });
    }
    return res.status(500).json({ success: false, error: 'Failed to record consents' });
  }
});

// GET /compliance/consent — Get user's consent history
router.get('/consent', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const consents = await prisma.consentRecord.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    // Group by type, latest first
    const latestByType: Record<string, any> = {};
    for (const c of consents) {
      if (!latestByType[c.type]) {
        latestByType[c.type] = c;
      }
    }

    return res.json({
      success: true,
      data: {
        history: consents,
        current: latestByType,
      },
    });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to fetch consents' });
  }
});

// ── Data Export (GDPR Art.20 / PIPL Art.45) ───────────────────

// GET /compliance/export — Export all user data
router.get('/export', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const [user, sessions, scripts, knowledge, practices, reviews, consents, sharedScripts] =
      await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true, name: true, email: true, role: true, plan: true,
            industry: true, createdAt: true, updatedAt: true,
            // Exclude password
          },
        }),
        prisma.session.findMany({
          where: { userId },
          include: {
            messages: {
              select: { role: true, content: true, inputType: true, createdAt: true },
              orderBy: { createdAt: 'asc' },
            },
          },
        }),
        prisma.script.findMany({ where: { userId } }),
        prisma.knowledgeItem.findMany({ where: { userId } }),
        prisma.practiceSession.findMany({ where: { userId } }),
        prisma.reviewReport.findMany({ where: { userId } }),
        prisma.consentRecord.findMany({ where: { userId } }),
        prisma.sharedScript.findMany({ where: { authorId: userId } }),
      ]);

    const exportData = {
      exportedAt: new Date().toISOString(),
      format: 'sales-ai-coach-export-v1',
      user,
      sessions: sessions.map((s) => ({
        ...s,
        messageCount: s.messages.length,
      })),
      scripts,
      knowledge,
      practices,
      reviews,
      consents,
      sharedScripts,
      totals: {
        sessions: sessions.length,
        scripts: scripts.length,
        knowledge: knowledge.length,
        practices: practices.length,
        reviews: reviews.length,
      },
    };

    // Set download headers
    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="sales-ai-coach-data-${userId.slice(0, 8)}.json"`,
    );

    return res.json(exportData);
  } catch {
    return res.status(500).json({ success: false, error: 'Data export failed' });
  }
});

// ── Data Deletion (GDPR Art.17 / PIPL Art.47) ─────────────────

const deletionRequestSchema = z.object({
  reason: z.string().max(500).optional(),
  confirmEmail: z.string().email(),
});

// POST /compliance/delete — Request account and data deletion
router.post('/delete', authMiddleware, async (req: Request, res: Response) => {
  try {
    const body = deletionRequestSchema.parse(req.body);
    const userId = req.user!.id;

    // Verify email matches
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user || user.email !== body.confirmEmail) {
      return res.status(400).json({
        success: false,
        error: 'Email does not match your account',
      });
    }

    // Check for existing pending request
    const existing = await prisma.dataDeletionRequest.findFirst({
      where: { userId, status: 'PENDING' },
    });

    if (existing) {
      return res.json({
        success: true,
        data: existing,
        message: 'A deletion request is already pending',
      });
    }

    const request = await prisma.dataDeletionRequest.create({
      data: {
        userId,
        reason: body.reason,
        status: 'PENDING',
      },
    });

    return res.json({
      success: true,
      data: request,
      message: 'Deletion request submitted. Data will be permanently deleted within 30 days.',
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: err.errors });
    }
    return res.status(500).json({ success: false, error: 'Failed to submit deletion request' });
  }
});

// GET /compliance/delete/status — Check deletion request status
router.get('/delete/status', authMiddleware, async (req: Request, res: Response) => {
  try {
    const request = await prisma.dataDeletionRequest.findFirst({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({
      success: true,
      data: request || { status: 'NONE' },
    });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to check deletion status' });
  }
});

// POST /compliance/delete/process — Admin: Process pending deletion requests
router.post('/delete/process', authMiddleware, async (req: Request, res: Response) => {
  try {
    // Admin only
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const { requestId } = z.object({ requestId: z.string().uuid() }).parse(req.body);

    const request = await prisma.dataDeletionRequest.findUnique({
      where: { id: requestId },
    });

    if (!request || request.status !== 'PENDING') {
      return res.status(404).json({ success: false, error: 'Deletion request not found or already processed' });
    }

    // Mark as processing
    await prisma.dataDeletionRequest.update({
      where: { id: requestId },
      data: { status: 'PROCESSING' },
    });

    const userId = request.userId;

    // Delete user data in order (respect FKs)
    await prisma.$transaction([
      // Delete practice + review data
      prisma.reviewReport.deleteMany({ where: { userId } }),
      prisma.practiceSession.deleteMany({ where: { userId } }),
      // Delete scripts + feedback
      prisma.scriptFeedback.deleteMany({ where: { userId } }),
      prisma.script.deleteMany({ where: { userId } }),
      // Delete knowledge
      prisma.knowledgeItem.deleteMany({ where: { userId } }),
      // Delete messages via sessions
      prisma.message.deleteMany({ where: { session: { userId } } }),
      prisma.session.deleteMany({ where: { userId } }),
      // Delete shared scripts
      prisma.sharedScriptLike.deleteMany({ where: { userId } }),
      prisma.sharedScript.deleteMany({ where: { authorId: userId } }),
      // Delete usage logs
      prisma.usageLog.deleteMany({ where: { userId } }),
      // Delete consents
      prisma.consentRecord.deleteMany({ where: { userId } }),
      // Delete API keys
      prisma.apiUsageLog.deleteMany({ where: { apiKey: { userId } } }),
      prisma.apiKey.deleteMany({ where: { userId } }),
      // Delete team tasks
      prisma.teamTask.deleteMany({ where: { assigneeId: userId } }),
      // Remove from team
      prisma.user.update({
        where: { id: userId },
        data: { teamId: null },
      }),
    ]);

    // Anonymize user record (keep for audit, remove PII)
    await prisma.user.update({
      where: { id: userId },
      data: {
        name: `Deleted User ${userId.slice(0, 8)}`,
        email: `deleted-${userId.slice(0, 8)}@removed.local`,
        password: 'DELETED',
        industry: [],
      },
    });

    // Mark deletion complete
    await prisma.dataDeletionRequest.update({
      where: { id: requestId },
      data: { status: 'COMPLETED', processedAt: new Date() },
    });

    return res.json({
      success: true,
      message: 'User data has been permanently deleted and account anonymized',
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: err.errors });
    }
    return res.status(500).json({ success: false, error: 'Deletion processing failed' });
  }
});

// ── Data Import (restore from export) ──────────────────────────

router.post('/import', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const data = req.body;

    if (!data || data.format !== 'sales-ai-coach-export-v1') {
      return res.status(400).json({ success: false, error: 'Invalid export format' });
    }

    let imported = { scripts: 0, knowledge: 0, practices: 0, reviews: 0 };

    // Import scripts
    if (Array.isArray(data.scripts)) {
      for (const s of data.scripts) {
        await prisma.script.create({
          data: {
            userId,
            content: s.content || '',
            style: s.style || 'default',
            tags: s.tags || [],
            industry: s.industry || null,
            status: s.status || 'DRAFT',
          },
        });
        imported.scripts++;
      }
    }

    // Import knowledge
    if (Array.isArray(data.knowledge)) {
      for (const k of data.knowledge) {
        await prisma.knowledgeItem.create({
          data: {
            userId,
            source: k.source || 'import',
            content: k.content || '',
            tags: k.tags || [],
            industry: k.industry || null,
            weight: k.weight || 1.0,
          },
        });
        imported.knowledge++;
      }
    }

    // Import practices (as records, not re-playable)
    if (Array.isArray(data.practices)) {
      for (const p of data.practices) {
        await prisma.practiceSession.create({
          data: {
            userId,
            scenario: p.scenario || 'imported',
            industry: p.industry || null,
            rounds: p.rounds || 0,
            score: p.score || 0,
            feedback: p.feedback || {},
            transcript: p.transcript || null,
          },
        });
        imported.practices++;
      }
    }

    // Import reviews
    if (Array.isArray(data.reviews)) {
      for (const r of data.reviews) {
        await prisma.reviewReport.create({
          data: {
            userId,
            summary: r.summary || '',
            strengths: r.strengths || [],
            improvements: r.improvements || [],
            recommendations: r.recommendations || [],
            radarScores: r.radarScores || null,
          },
        });
        imported.reviews++;
      }
    }

    return res.json({ success: true, data: imported });
  } catch {
    return res.status(500).json({ success: false, error: 'Data import failed' });
  }
});

// ── One-click Knowledge Delete ─────────────────────────────────

router.delete('/knowledge', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const result = await prisma.knowledgeItem.deleteMany({ where: { userId } });
    return res.json({ success: true, data: { deleted: result.count } });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to delete knowledge data' });
  }
});

// ── Privacy Policy / Terms Info ────────────────────────────────

// GET /compliance/legal — Get current privacy policy and terms versions
router.get('/legal', (_req: Request, res: Response) => {
  return res.json({
    success: true,
    data: {
      privacyPolicy: {
        version: '2024-01-15',
        lastUpdated: '2024-01-15',
        regions: {
          china: {
            title: '隐私政策（中国版）',
            laws: ['网络安全法', '数据安全法', '个人信息保护法'],
            dataController: 'Sales AI Coach 团队',
            contactEmail: 'privacy@salesaicoach.com',
          },
          international: {
            title: 'Privacy Policy (International)',
            laws: ['GDPR'],
            dataController: 'Sales AI Coach Team',
            contactEmail: 'privacy@salesaicoach.com',
            dpo: 'dpo@salesaicoach.com',
          },
        },
      },
      termsOfService: {
        version: '2024-01-15',
        lastUpdated: '2024-01-15',
      },
      dataProcessing: {
        version: '2025-06-25',
        purposes: [
          'Sales coaching and script generation',
          'Practice session analysis',
          'Knowledge base management',
        ],
        retention: {
          accountData: 'Until user requests deletion',
          paymentData: 'As required by tax law',
          contentData: 'Only when user explicitly saves; otherwise ephemeral',
          knowledgeData: 'Until user deletes via dashboard or one-click clear',
        },
        userControl: {
          save: 'User must explicitly click Save to persist content data',
          export: 'Full data export available at any time via Data Rights page',
          import: 'Users can re-import previously exported data',
          delete: 'One-click knowledge deletion; full account deletion via request',
        },
        thirdParties: [
          'AI model providers (for script generation and analysis)',
          'Cloud hosting providers (for data storage)',
        ],
      },
    },
  });
});

export default router;
