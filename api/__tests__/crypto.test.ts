import { describe, it, expect } from 'vitest';
import crypto from 'crypto';

// Replicate the actual functions from api/index.js for real crypto testing
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

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, hash] = storedHash.split(':');
  return hash === crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

describe('JWT - Real Crypto', () => {
  const secret = 'test-secret-key-12345';

  it('should create a valid JWT with 3 parts', () => {
    const token = createJWT({ userId: 'user-123', email: 'test@test.com', role: 'USER' }, secret);
    const parts = token.split('.');
    expect(parts.length).toBe(3);
    expect(parts[0].length).toBeGreaterThan(0);
    expect(parts[1].length).toBeGreaterThan(0);
    expect(parts[2].length).toBeGreaterThan(0);
  });

  it('should verify a valid JWT and return payload', () => {
    const token = createJWT({ userId: 'user-123', email: 'test@test.com', role: 'USER' }, secret);
    const payload = verifyJWT(token, secret);
    expect(payload).not.toBeNull();
    expect(payload!.userId).toBe('user-123');
    expect(payload!.email).toBe('test@test.com');
    expect(payload!.role).toBe('USER');
  });

  it('should include iat and exp in payload', () => {
    const token = createJWT({ userId: 'user-123' }, secret);
    const payload = verifyJWT(token, secret);
    expect(payload!.iat).toBeDefined();
    expect(payload!.exp).toBeDefined();
    expect(payload!.exp).toBeGreaterThan(payload!.iat);
    expect(payload!.exp - payload!.iat).toBe(7 * 24 * 60 * 60); // 7 days
  });

  it('should reject token with wrong secret', () => {
    const token = createJWT({ userId: 'user-123' }, secret);
    const payload = verifyJWT(token, 'wrong-secret');
    expect(payload).toBeNull();
  });

  it('should reject tampered token (modified payload)', () => {
    const token = createJWT({ userId: 'user-123', role: 'USER' }, secret);
    const parts = token.split('.');
    // Tamper with payload to change role to ADMIN
    const tamperedPayload = base64url(JSON.stringify({ userId: 'user-123', role: 'ADMIN', iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 86400 }));
    const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;
    const payload = verifyJWT(tamperedToken, secret);
    expect(payload).toBeNull(); // Signature should not match
  });

  it('should reject token with only 2 parts', () => {
    const payload = verifyJWT('header.payload', secret);
    expect(payload).toBeNull();
  });

  it('should reject token with 4 parts', () => {
    const payload = verifyJWT('a.b.c.d', secret);
    expect(payload).toBeNull();
  });

  it('should reject empty string', () => {
    const payload = verifyJWT('', secret);
    expect(payload).toBeNull();
  });

  it('should reject expired token', () => {
    // Create a token that expired 1 hour ago
    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const h = base64url(JSON.stringify(header));
    const p = base64url(JSON.stringify({ userId: 'user-123', iat: now - 7200, exp: now - 3600 }));
    const sig = crypto.createHmac('sha256', secret).update(`${h}.${p}`).digest('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const expiredToken = `${h}.${p}.${sig}`;

    const payload = verifyJWT(expiredToken, secret);
    expect(payload).toBeNull();
  });

  it('should accept token that is still valid', () => {
    const token = createJWT({ userId: 'user-123' }, secret);
    const payload = verifyJWT(token, secret);
    expect(payload).not.toBeNull();
    expect(payload!.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });
});

describe('Password Hashing - Real Crypto', () => {
  it('should hash password and return salt:hash format', async () => {
    const hashed = await hashPassword('mypassword123');
    const parts = hashed.split(':');
    expect(parts.length).toBe(2);
    expect(parts[0].length).toBe(32); // 16 bytes = 32 hex chars
    expect(parts[1].length).toBe(128); // 64 bytes = 128 hex chars
  });

  it('should verify correct password', async () => {
    const password = 'SecurePass123!';
    const hashed = await hashPassword(password);
    const result = await verifyPassword(password, hashed);
    expect(result).toBe(true);
  });

  it('should reject wrong password', async () => {
    const hashed = await hashPassword('correct-password');
    const result = await verifyPassword('wrong-password', hashed);
    expect(result).toBe(false);
  });

  it('should produce different hashes for same password (different salts)', async () => {
    const hash1 = await hashPassword('same-password');
    const hash2 = await hashPassword('same-password');
    expect(hash1).not.toBe(hash2); // Different salts
    expect(await verifyPassword('same-password', hash1)).toBe(true);
    expect(await verifyPassword('same-password', hash2)).toBe(true);
  });

  it('should reject empty stored hash', async () => {
    const result = await verifyPassword('password', '');
    expect(result).toBe(false);
  });

  it('should reject hash without colon separator', async () => {
    const result = await verifyPassword('password', 'nosalthere');
    expect(result).toBe(false);
  });

  it('should handle special characters in password', async () => {
    const password = 'p@$$w0rd!#%^&*()_+-=[]{}|;:",.<>?/~`';
    const hashed = await hashPassword(password);
    expect(await verifyPassword(password, hashed)).toBe(true);
    expect(await verifyPassword('wrong', hashed)).toBe(false);
  });

  it('should handle unicode password', async () => {
    const password = '密码测试🔐🗝️';
    const hashed = await hashPassword(password);
    expect(await verifyPassword(password, hashed)).toBe(true);
  });

  it('should handle long password', async () => {
    const password = 'a'.repeat(10000);
    const hashed = await hashPassword(password);
    expect(await verifyPassword(password, hashed)).toBe(true);
  });
});
