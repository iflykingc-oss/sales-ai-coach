import { Router, Request, Response, NextFunction } from 'express';
import { authLimiter } from '../middleware/rateLimit.js';
import { getJwtSecret, authMiddleware } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { registerSchema, loginSchema } from '@sales-ai-coach/shared/schemas';
import {
  signAccessToken,
  setAuthCookies,
  clearAuthCookies,
  issueRefreshToken,
  rotateRefreshToken,
  revokeFamily,
} from '../lib/auth-tokens.js';

const router = Router();

router.post('/register', authLimiter, async (req, res: Response, next: NextFunction) => {
  try {
    const data = registerSchema.parse(req.body);
    const hashedPassword = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        industry: data.industry || [],
      },
      select: {
        id: true, name: true, email: true, role: true, plan: true,
        industry: true, teamId: true, createdAt: true, updatedAt: true,
      },
    });

    // Consent is NOT recorded at registration. The user must explicitly
    // POST to /auth/consent after viewing the terms. This is required
    // for GDPR / PIPL compliance: pre-ticked boxes do not constitute valid
    // consent.

    const accessToken = signAccessToken({ id: user.id, email: user.email, role: user.role });
    const { raw: refreshToken } = await issueRefreshToken(user.id, null, req);
    setAuthCookies(res, accessToken, refreshToken);

    // Also return tokens in the body for non-browser clients (CLI, mobile, tests).
    // Browser clients should rely on the HttpOnly cookies.
    res.json({ success: true, data: { user, tokens: { accessToken, refreshToken } } });
  } catch (err) { next(err); }
});

router.post('/login', authLimiter, async (req, res: Response, next: NextFunction) => {
  try {
    const data = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: data.email } });

    if (!user || !(await bcrypt.compare(data.password, user.password))) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const accessToken = signAccessToken({ id: user.id, email: user.email, role: user.role });
    const { raw: refreshToken } = await issueRefreshToken(user.id, null, req);
    setAuthCookies(res, accessToken, refreshToken);

    const { password, ...publicUser } = user;
    res.json({ success: true, data: { user: publicUser, tokens: { accessToken, refreshToken } } });
  } catch (err) { next(err); }
});

router.post('/logout', async (req: Request, res: Response) => {
  // Revoke the entire refresh-token family for the current session
  // so the cookie can't be used again even if the user keeps the cookie.
  const rt = req.cookies?.refreshToken;
  if (rt) {
    const hash = require('crypto').createHash('sha256').update(rt).digest('hex');
    const record = await prisma.refreshToken.findUnique({ where: { tokenHash: hash } });
    if (record) await revokeFamily(record.family);
  }
  clearAuthCookies(res);
  res.json({ success: true });
});

router.get('/me', async (req, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.accessToken || req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, error: 'Not authenticated' });

    const decoded = jwt.verify(token, getJwtSecret()) as { id: string };
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true, name: true, email: true, role: true, plan: true,
        industry: true, teamId: true, createdAt: true, updatedAt: true,
      },
    });

    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
});

// Refresh access token. Reads HttpOnly refresh cookie, rotates the
// family, and issues a new access token. Designed to be hit by the
// frontend on 401 to silently retry.
router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rt = req.cookies?.refreshToken;
    if (!rt) {
      return res.status(401).json({ success: false, error: 'No refresh token' });
    }
    const rotated = await rotateRefreshToken(rt, req);
    if (!rotated) {
      clearAuthCookies(res);
      return res.status(401).json({ success: false, error: 'Refresh token invalid or reused' });
    }
    const user = await prisma.user.findUnique({
      where: { id: rotated.userId },
      select: { id: true, email: true, role: true },
    });
    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }
    const accessToken = signAccessToken(user);
    setAuthCookies(res, accessToken, rotated.raw);
    res.json({ success: true, data: { user } });
  } catch (err) { next(err); }
});

// Explicit consent endpoint. The user must POST here after viewing the
// terms/privacy page and ticking the checkbox. The IP and User-Agent are
// recorded for audit purposes.
const consentSchema = z.object({
  type: z.enum(['PRIVACY_POLICY', 'TERMS_OF_SERVICE', 'DATA_PROCESSING', 'MARKETING']),
  version: z.string().min(1).max(64),
  accepted: z.boolean(),
});

router.post('/consent', authLimiter, authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = consentSchema.parse(req.body);
    if (!data.accepted) {
      return res.status(400).json({
        success: false,
        error: 'Refusing to record a rejected consent. To withdraw consent, use DELETE /compliance/consent/:type',
      });
    }
    const ip = req.ip || (req.headers['x-forwarded-for'] as string) || null;
    const userAgent = req.headers['user-agent'] || null;
    const record = await prisma.consentRecord.create({
      data: {
        userId: req.user!.id,
        type: data.type,
        version: data.version,
        accepted: true,
        ip,
        userAgent,
      },
    });
    res.json({ success: true, data: { id: record.id, type: record.type, version: record.version } });
  } catch (err) { next(err); }
});

export default router;
