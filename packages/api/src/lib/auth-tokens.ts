import crypto from 'crypto';
import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from './prisma.js';
import { getJwtSecret } from '../middleware/auth.js';

// Short-lived access token (minutes). Adjust via env if needed.
const ACCESS_TTL = process.env.JWT_ACCESS_TTL || '15m';

// Long-lived refresh token (days).
const REFRESH_TTL_DAYS = Number(process.env.JWT_REFRESH_TTL_DAYS || 30);

export interface AccessTokenPayload {
  id: string;
  email: string;
  role: string;
}

export function signAccessToken(user: { id: string; email: string; role: string }): string {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    getJwtSecret(),
    { expiresIn: ACCESS_TTL } as jwt.SignOptions,
  );
}

function hashRefreshToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function generateRefreshToken(): { raw: string; hash: string; family: string } {
  const raw = crypto.randomBytes(48).toString('base64url');
  return { raw, hash: hashRefreshToken(raw), family: crypto.randomUUID() };
}

interface CookieOptions {
  secure: boolean;
}

function cookieOpts(): CookieOptions {
  return { secure: process.env.NODE_ENV === 'production' };
}

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  const opts = cookieOpts();
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: opts.secure,
    sameSite: 'lax',
    maxAge: 15 * 60 * 1000, // 15 min
  });
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: opts.secure,
    sameSite: 'lax',
    path: '/api/auth', // refresh cookie only sent to /api/auth
    maxAge: REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookies(res: Response) {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken', { path: '/api/auth' });
}

/**
 * Issue a new refresh token (and persist). Returns the raw token (caller
 * places it in the HttpOnly cookie) and the family id (caller may pass
 * it back on rotate to keep the same family).
 */
export async function issueRefreshToken(
  userId: string,
  family: string | null,
  req: Request,
): Promise<{ raw: string; family: string; expiresAt: Date }> {
  const { raw, hash, family: newFamily } = generateRefreshToken();
  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hash,
      family: family || newFamily,
      expiresAt,
      userAgent: req.headers['user-agent'] || null,
      ip: req.ip || (req.headers['x-forwarded-for'] as string) || null,
    },
  });
  return { raw, family: family || newFamily, expiresAt };
}

/**
 * Rotate a refresh token: validate the presented token, mark it as
 * replaced (revoked), issue a new one in the same family.
 *
 * If a revoked token is presented again, revoke the entire family
 * (defense against token theft).
 */
export async function rotateRefreshToken(
  rawToken: string,
  req: Request,
): Promise<{ raw: string; family: string; userId: string } | null> {
  const hash = hashRefreshToken(rawToken);
  const record = await prisma.refreshToken.findUnique({ where: { tokenHash: hash } });
  if (!record) return null;

  // Reuse detection: if a token that's already been revoked/rotated is
  // presented, treat as compromise and revoke the whole family.
  if (record.revokedAt) {
    await prisma.refreshToken.updateMany({
      where: { family: record.family, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return null;
  }
  if (record.expiresAt < new Date()) return null;

  // Mark the old token as revoked and link to new
  const { raw, family } = await issueRefreshToken(record.userId, record.family, req);
  await prisma.refreshToken.update({
    where: { id: record.id },
    data: { revokedAt: new Date() },
  });
  return { raw, family, userId: record.userId };
}

/**
 * Revoke an entire family (e.g. on logout-all-devices or password change).
 */
export async function revokeFamily(family: string) {
  await prisma.refreshToken.updateMany({
    where: { family, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/**
 * Revoke all refresh tokens for a user.
 */
export async function revokeAllForUser(userId: string) {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
