import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';

const router = Router();

// Get all model configs
router.get('/', authMiddleware, requireAdmin, async (req, res, next) => {
  try {
    const configs = await prisma.modelConfig.findMany({
      orderBy: [{ isPrimary: 'desc' }, { provider: 'asc' }],
    });
    res.json({ success: true, data: configs });
  } catch (err) { next(err); }
});

// Create or update model config
router.post('/', authMiddleware, requireAdmin, async (req, res, next) => {
  try {
    const { provider, modelId, displayName, apiKey, baseUrl, temperature, maxTokens, isActive, isPrimary } = req.body;

    // Detect masked apiKey — skip it
    const isMaskedKey = apiKey && apiKey.startsWith('***');
    const validApiKey = isMaskedKey ? undefined : apiKey;

    // If setting as primary, unset other primaries
    if (isPrimary) {
      await prisma.modelConfig.updateMany({
        where: { isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const config = await prisma.modelConfig.upsert({
      where: { provider_modelId: { provider, modelId } },
      update: {
        displayName,
        apiKey: validApiKey || undefined,
        baseUrl: baseUrl || undefined,
        temperature,
        maxTokens,
        isActive,
        isPrimary,
      },
      create: {
        provider,
        modelId,
        displayName,
        apiKey: apiKey || null,
        baseUrl: baseUrl || null,
        temperature: temperature || 0.7,
        maxTokens: maxTokens || 2048,
        isActive: isActive !== false,
        isPrimary: isPrimary || false,
      },
    });

    res.json({ success: true, data: config });
  } catch (err) { next(err); }
});

// Update model config
router.put('/:id', authMiddleware, requireAdmin, async (req, res, next) => {
  try {
    const { displayName, apiKey, baseUrl, temperature, maxTokens, isActive, isPrimary } = req.body;

    // Detect masked apiKey — skip it
    const isMaskedKey = apiKey && apiKey.startsWith('***');
    const validApiKey = isMaskedKey ? undefined : apiKey;

    if (isPrimary) {
      await prisma.modelConfig.updateMany({
        where: { isPrimary: true, id: { not: req.params.id as string } },
        data: { isPrimary: false },
      });
    }

    const config = await prisma.modelConfig.update({
      where: { id: req.params.id as string },
      data: {
        displayName,
        apiKey: validApiKey || undefined,
        baseUrl: baseUrl || undefined,
        temperature,
        maxTokens,
        isActive,
        isPrimary,
      },
    });

    res.json({ success: true, data: config });
  } catch (err) { next(err); }
});

// Delete model config
router.delete('/:id', authMiddleware, requireAdmin, async (req, res, next) => {
  try {
    await prisma.modelConfig.delete({ where: { id: req.params.id as string } });
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
