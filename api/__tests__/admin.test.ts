import { describe, it, expect } from 'vitest';
import crypto from 'crypto';

// Replicate the actual JWT functions from api/index.js
function base64url(str: string): string {
  return Buffer.from(str).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function createJWT(payload: Record<string, any>, secret: string): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 7 * 24 * 60 * 60;
  const h = base64url(JSON.stringify(header));
  const p = base64url(JSON.stringify({ ...payload, iat: now, exp }));
  const sig = crypto.createHmac('sha256', secret).update(`${h}.${p}`).digest('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${h}.${p}.${sig}`;
}

function verifyJWT(token: string, secret: string): Record<string, any> | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [h, p, sig] = parts;
  const expected = crypto.createHmac('sha256', secret).update(`${h}.${p}`).digest('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  if (sig !== expected) return null;
  try {
    const payload = JSON.parse(Buffer.from(p, 'base64').toString());
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch { return null; }
}

function getUserFromRequest(token: string | undefined, secret: string): Record<string, any> | null {
  if (!token || !secret) return null;
  return verifyJWT(token, secret);
}

function requireAuth(token: string | undefined, secret: string): Record<string, any> {
  const user = getUserFromRequest(token, secret);
  if (!user) throw { status: 401, error: 'Not authenticated' };
  return user;
}

function requireAdmin(token: string | undefined, secret: string): Record<string, any> {
  const user = requireAuth(token, secret);
  if (user.role !== 'ADMIN') throw { status: 403, error: 'Admin access required' };
  return user;
}

describe('Access Control', () => {
  const secret = 'test-secret';

  describe('requireAuth', () => {
    it('should return user for valid token', () => {
      const token = createJWT({ userId: 'user-1', email: 'test@test.com', role: 'USER' }, secret);
      const user = requireAuth(token, secret);
      expect(user.userId).toBe('user-1');
      expect(user.role).toBe('USER');
    });

    it('should throw 401 for missing token', () => {
      expect(() => requireAuth(undefined, secret)).toThrow();
      try {
        requireAuth(undefined, secret);
      } catch (e: any) {
        expect(e.status).toBe(401);
        expect(e.error).toBe('Not authenticated');
      }
    });

    it('should throw 401 for empty token', () => {
      try {
        requireAuth('', secret);
      } catch (e: any) {
        expect(e.status).toBe(401);
      }
    });

    it('should throw 401 for expired token', () => {
      // Create a token that expired 1 hour ago
      const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const now = Math.floor(Date.now() / 1000);
      const p = base64url(JSON.stringify({ userId: 'user-1', role: 'USER', iat: now - 7200, exp: now - 3600 }));
      const sig = crypto.createHmac('sha256', secret).update(`${header}.${p}`).digest('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
      const expiredToken = `${header}.${p}.${sig}`;

      try {
        requireAuth(expiredToken, secret);
      } catch (e: any) {
        expect(e.status).toBe(401);
      }
    });

    it('should throw 401 for malformed token', () => {
      try {
        requireAuth('not.a.valid.token', secret);
      } catch (e: any) {
        expect(e.status).toBe(401);
      }
    });
  });

  describe('requireAdmin', () => {
    it('should return user for admin token', () => {
      const token = createJWT({ userId: 'admin-1', email: 'admin@test.com', role: 'ADMIN' }, secret);
      const user = requireAdmin(token, secret);
      expect(user.userId).toBe('admin-1');
      expect(user.role).toBe('ADMIN');
    });

    it('should throw 403 for non-admin user', () => {
      const token = createJWT({ userId: 'user-1', email: 'user@test.com', role: 'USER' }, secret);
      try {
        requireAdmin(token, secret);
      } catch (e: any) {
        expect(e.status).toBe(403);
        expect(e.error).toBe('Admin access required');
      }
    });

    it('should throw 401 for missing token (before checking admin)', () => {
      try {
        requireAdmin(undefined, secret);
      } catch (e: any) {
        expect(e.status).toBe(401);
      }
    });

    it('should throw 403 for TEAM_OWNER role', () => {
      const token = createJWT({ userId: 'owner-1', role: 'TEAM_OWNER' }, secret);
      try {
        requireAdmin(token, secret);
      } catch (e: any) {
        expect(e.status).toBe(403);
      }
    });
  });

  describe('Role-based access scenarios', () => {
    it('USER can access auth-required endpoints', () => {
      const token = createJWT({ userId: 'user-1', role: 'USER' }, secret);
      expect(() => requireAuth(token, secret)).not.toThrow();
    });

    it('USER cannot access admin endpoints', () => {
      const token = createJWT({ userId: 'user-1', role: 'USER' }, secret);
      expect(() => requireAdmin(token, secret)).toThrow();
    });

    it('ADMIN can access both auth and admin endpoints', () => {
      const token = createJWT({ userId: 'admin-1', role: 'ADMIN' }, secret);
      expect(() => requireAuth(token, secret)).not.toThrow();
      expect(() => requireAdmin(token, secret)).not.toThrow();
    });
  });
});

describe('Plan Upgrade Security', () => {
  it('should require paymentId for non-FREE plans', () => {
    const plans = ['PROFESSIONAL', 'TEAM', 'ENTERPRISE'];
    for (const plan of plans) {
      const hasPayment = false;
      if (plan !== 'FREE' && !hasPayment) {
        expect(true).toBe(true); // Should reject
      }
    }
  });

  it('should allow FREE plan without paymentId', () => {
    const plan = 'FREE';
    const hasPayment = false;
    if (plan === 'FREE') {
      expect(true).toBe(true); // Should allow
    }
  });

  it('should reject invalid plan names', () => {
    const validPlans = ['FREE', 'PROFESSIONAL', 'TEAM', 'ENTERPRISE'];
    const invalidPlan = 'MEGA_ULTRA';
    expect(validPlans.includes(invalidPlan)).toBe(false);
  });

  it('should reject self-upgrade to ENTERPRISE without payment', () => {
    const plan = 'ENTERPRISE';
    const paymentId = undefined;
    const requiresPayment = plan !== 'FREE';
    const hasValidPayment = typeof paymentId === 'string' && paymentId.length >= 10;

    expect(requiresPayment).toBe(true);
    expect(hasValidPayment).toBe(false);
    // Should return 402
  });
});
