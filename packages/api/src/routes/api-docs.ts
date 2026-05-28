/**
 * API Documentation Route
 *
 * Returns OpenAPI-style documentation for the v1 public API.
 * Accessible at GET /api/v1/docs
 */

import { Router, Request, Response } from 'express';

const router = Router();

router.get('/docs', (_req: Request, res: Response) => {
  return res.json({
    openapi: '3.0.3',
    info: {
      title: 'Sales AI Coach API',
      description: 'Enterprise API for sales coaching capabilities — script generation, practice sessions, conversation analysis, and knowledge management.',
      version: '1.0.0',
      contact: {
        email: 'api@salesaicoach.com',
      },
    },
    servers: [
      { url: '/api/v1', description: 'Production' },
    ],
    authentication: {
      type: 'bearer',
      description: 'Include your API key as: Authorization: Bearer sk-{tier}-{key}',
      note: 'Generate API keys in Settings > API Keys (requires Professional plan or above)',
    },
    rateLimits: {
      BASIC: { perMinute: 30, perDay: 500 },
      STANDARD: { perMinute: 100, perDay: 2000 },
      PREMIUM: { perMinute: 300, perDay: 10000 },
      ENTERPRISE: { perMinute: 1000, perDay: 100000 },
    },
    endpoints: [
      {
        method: 'GET',
        path: '/scenarios',
        description: 'List available practice scenarios',
        tier: 'BASIC+',
        permission: 'scenarios:read',
        response: {
          success: true,
          data: [{ id: 'string', name: 'string', industry: 'string', description: 'string' }],
          total: 'number',
        },
      },
      {
        method: 'GET',
        path: '/frameworks',
        description: 'List available sales frameworks',
        tier: 'BASIC+',
        permission: 'scenarios:read',
        response: {
          success: true,
          data: [{ id: 'string', name: 'string', nameEn: 'string', description: 'string', stages: 'number', useCases: ['string'] }],
          total: 'number',
        },
      },
      {
        method: 'POST',
        path: '/scripts/generate',
        description: 'Generate sales scripts using AI',
        tier: 'STANDARD+',
        permission: 'scripts:generate',
        body: {
          input: 'string (required, 1-5000 chars)',
          inputType: 'TEXT | IMAGE | VOICE | FORM | PASTE (default: TEXT)',
          industry: 'string (optional)',
          frameworks: 'string[] (optional, framework IDs)',
        },
        response: {
          success: true,
          data: {
            sessionId: 'string',
            scriptIds: ['string'],
            speechStyles: [{ style: 'string', content: 'string', logic: 'string' }],
            reasoning: ['string'],
            confidenceScore: 'number',
          },
        },
      },
      {
        method: 'GET',
        path: '/scripts',
        description: "List user's generated scripts",
        tier: 'BASIC+',
        permission: 'scripts:read',
        query: {
          page: 'number (default: 1)',
          limit: 'number (1-50, default: 20)',
        },
        response: {
          success: true,
          data: [{ id: 'string', content: 'string', style: 'string', industry: 'string', tags: ['string'], createdAt: 'string' }],
          pagination: { page: 'number', limit: 'number', total: 'number', pages: 'number' },
        },
      },
      {
        method: 'POST',
        path: '/practices/start',
        description: 'Start a practice session with AI customer',
        tier: 'PREMIUM+',
        permission: 'practices:create',
        body: {
          scenarioId: 'string (optional)',
          scenarioName: 'string (optional)',
          industry: 'string (optional)',
          mode: 'scenario | freeform | special (default: scenario)',
          logicFramework: 'string (optional, framework ID)',
          difficulty: 'easy | medium | hard | expert (default: medium)',
          maxRounds: 'number (3-30, default: 10)',
        },
        response: {
          success: true,
          data: { sessionId: 'string', practiceSessionId: 'string', maxRounds: 'number' },
        },
      },
      {
        method: 'POST',
        path: '/practices/message',
        description: 'Send a message in an active practice session',
        tier: 'PREMIUM+',
        permission: 'practices:create',
        body: {
          sessionId: 'string (required, UUID)',
          message: 'string (required, 1-2000 chars)',
        },
        response: {
          success: true,
          data: { response: 'string', emotion: 'string', roundScore: 'number', isComplete: 'boolean' },
        },
      },
      {
        method: 'POST',
        path: '/reviews/analyze',
        description: 'Analyze a conversation and generate a review report',
        tier: 'PREMIUM+',
        permission: 'reviews:create',
        body: {
          sessionId: 'string (required, UUID)',
        },
        response: {
          success: true,
          data: {
            reportId: 'string',
            summary: 'string',
            strengths: ['string'],
            improvements: ['string'],
            recommendations: [{ dimension: 'string', advice: 'string' }],
            radarScores: { '情绪管理': 'number', '需求挖掘': 'number', ... },
          },
        },
      },
      {
        method: 'GET',
        path: '/knowledge',
        description: 'Search the knowledge base',
        tier: 'STANDARD+',
        permission: 'knowledge:read',
        query: {
          q: 'string (search query)',
          limit: 'number (1-50, default: 20)',
        },
        response: {
          success: true,
          data: [{ id: 'string', source: 'string', content: 'string', tags: ['string'], industry: 'string' }],
          total: 'number',
        },
      },
    ],
    errors: {
      format: { success: false, error: 'string', details: 'any (optional)' },
      codes: {
        401: 'Missing or invalid API key',
        403: 'Permission denied — check your tier and permissions',
        429: 'Rate limit exceeded — check X-RateLimit-* headers',
        400: 'Invalid request body — check errors array',
        500: 'Internal server error',
      },
    },
    headers: {
      'X-RateLimit-Limit': 'Maximum requests per minute for your key',
      'X-RateLimit-Remaining': 'Remaining requests in current window',
      'X-DailyLimit-Limit': 'Maximum requests per day for your key',
      'X-DailyLimit-Remaining': 'Remaining requests today',
    },
  });
});

export default router;
