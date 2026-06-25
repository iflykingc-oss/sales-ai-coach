import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { encrypt, decrypt, isEncrypted } from '../lib/encryption.js';

const router = Router();

/** Mask API key for frontend display: show first 4 and last 4 chars */
function maskApiKey(key: string | null): string | null {
  if (!key) return null;
  // If already encrypted, show masked version
  if (isEncrypted(key)) {
    const decrypted = decrypt(key);
    if (decrypted.length <= 8) return '***' + decrypted.slice(-4);
    return decrypted.slice(0, 4) + '***' + decrypted.slice(-4);
  }
  // Plain text key
  if (key.length <= 8) return '***' + key.slice(-4);
  return key.slice(0, 4) + '***' + key.slice(-4);
}

/** Get all model configs (with masked API keys) */
router.get('/', authMiddleware, requireAdmin, async (req, res, next) => {
  try {
    const configs = await prisma.modelConfig.findMany({
      orderBy: [{ isPrimary: 'desc' }, { provider: 'asc' }],
    });
    // Mask API keys before sending to frontend
    const masked = configs.map(c => ({
      ...c,
      apiKey: maskApiKey(c.apiKey),
    }));
    res.json({ success: true, data: masked });
  } catch (err) { next(err); }
});

// Create or update model config
router.post('/', authMiddleware, requireAdmin, async (req, res, next) => {
  try {
    const { provider, modelId, displayName, apiKey, baseUrl, temperature, maxTokens, isActive, isPrimary } = req.body;

    // Detect masked apiKey — skip it
    const isMaskedKey = apiKey && (apiKey.startsWith('***') || apiKey.includes('***'));
    const validApiKey = isMaskedKey ? undefined : (apiKey ? encrypt(apiKey) : undefined);

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
        apiKey: validApiKey,
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
        apiKey: apiKey ? encrypt(apiKey) : null,
        baseUrl: baseUrl || null,
        temperature: temperature || 0.7,
        maxTokens: maxTokens || 2048,
        isActive: isActive !== false,
        isPrimary: isPrimary || false,
      },
    });

    res.json({ success: true, data: { ...config, apiKey: maskApiKey(config.apiKey) } });
  } catch (err) { next(err); }
});

// Update model config
router.put('/:id', authMiddleware, requireAdmin, async (req, res, next) => {
  try {
    const { displayName, apiKey, baseUrl, temperature, maxTokens, isActive, isPrimary } = req.body;

    // Detect masked apiKey — skip it
    const isMaskedKey = apiKey && (apiKey.startsWith('***') || apiKey.includes('***'));
    const validApiKey = isMaskedKey ? undefined : (apiKey ? encrypt(apiKey) : undefined);

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
        apiKey: validApiKey,
        baseUrl: baseUrl || undefined,
        temperature,
        maxTokens,
        isActive,
        isPrimary,
      },
    });

    res.json({ success: true, data: { ...config, apiKey: maskApiKey(config.apiKey) } });
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
