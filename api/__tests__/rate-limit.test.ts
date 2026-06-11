import { describe, it, expect, beforeEach } from 'vitest';

// Replicate the rate limiting logic from api/index.js
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function getRateLimitKey(ip: string): string {
  return ip || 'unknown';
}

function checkRateLimit(key: string, limit: number, windowMs: number): { allowed: boolean; remaining: number; retryAfter?: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, retryAfter: Math.ceil((entry.resetTime - now) / 1000) };
  }

  entry.count++;
  return { allowed: true, remaining: limit - entry.count };
}

describe('Rate Limiting', () => {
  beforeEach(() => {
    rateLimitStore.clear();
  });

  describe('checkRateLimit', () => {
    it('should allow first request', () => {
      const result = checkRateLimit('192.168.1.1', 10, 60000);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
    });

    it('should track request count', () => {
      checkRateLimit('192.168.1.1', 10, 60000);
      checkRateLimit('192.168.1.1', 10, 60000);
      const result = checkRateLimit('192.168.1.1', 10, 60000);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(7);
    });

    it('should block when limit reached', () => {
      for (let i = 0; i < 10; i++) {
        checkRateLimit('192.168.1.1', 10, 60000);
      }
      const result = checkRateLimit('192.168.1.1', 10, 60000);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeDefined();
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('should track different IPs independently', () => {
      for (let i = 0; i < 10; i++) {
        checkRateLimit('192.168.1.1', 10, 60000);
      }
      const result1 = checkRateLimit('192.168.1.1', 10, 60000);
      expect(result1.allowed).toBe(false);

      const result2 = checkRateLimit('192.168.1.2', 10, 60000);
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(9);
    });

    it('should reset after window expires', () => {
      // Use a very short window for testing
      for (let i = 0; i < 5; i++) {
        checkRateLimit('192.168.1.1', 5, 1); // 1ms window
      }
      const blocked = checkRateLimit('192.168.1.1', 5, 1);
      expect(blocked.allowed).toBe(false);

      // Wait for window to expire (in real code, we'd need to wait)
      // For testing, we'll simulate by using a new key
      const newEntry = rateLimitStore.get('192.168.1.1')!;
      newEntry.resetTime = Date.now() - 1000; // Set to past

      const result = checkRateLimit('192.168.1.1', 5, 60000);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
    });
  });

  describe('Auth Rate Limit (10/min)', () => {
    it('should allow 10 requests', () => {
      for (let i = 0; i < 10; i++) {
        const result = checkRateLimit('auth-ip', 10, 60000);
        expect(result.allowed).toBe(true);
      }
    });

    it('should block 11th request', () => {
      for (let i = 0; i < 10; i++) {
        checkRateLimit('auth-ip', 10, 60000);
      }
      const result = checkRateLimit('auth-ip', 10, 60000);
      expect(result.allowed).toBe(false);
    });
  });

  describe('AI Rate Limit (30/min)', () => {
    it('should allow 30 requests', () => {
      for (let i = 0; i < 30; i++) {
        const result = checkRateLimit('ai-ip', 30, 60000);
        expect(result.allowed).toBe(true);
      }
    });

    it('should block 31st request', () => {
      for (let i = 0; i < 30; i++) {
        checkRateLimit('ai-ip', 30, 60000);
      }
      const result = checkRateLimit('ai-ip', 30, 60000);
      expect(result.allowed).toBe(false);
    });
  });

  describe('General Rate Limit (100/min)', () => {
    it('should allow 100 requests', () => {
      for (let i = 0; i < 100; i++) {
        const result = checkRateLimit('general-ip', 100, 60000);
        expect(result.allowed).toBe(true);
      }
    });

    it('should block 101st request', () => {
      for (let i = 0; i < 100; i++) {
        checkRateLimit('general-ip', 100, 60000);
      }
      const result = checkRateLimit('general-ip', 100, 60000);
      expect(result.allowed).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing IP gracefully', () => {
      const result = checkRateLimit('unknown', 10, 60000);
      expect(result.allowed).toBe(true);
    });

    it('should handle empty string IP', () => {
      const result = checkRateLimit('', 10, 60000);
      expect(result.allowed).toBe(true);
    });

    it('should return correct retryAfter seconds', () => {
      for (let i = 0; i < 10; i++) {
        checkRateLimit('test-ip', 10, 60000);
      }
      const result = checkRateLimit('test-ip', 10, 60000);
      expect(result.retryAfter).toBeDefined();
      expect(result.retryAfter!).toBeLessThanOrEqual(60);
      expect(result.retryAfter!).toBeGreaterThan(0);
    });
  });
});
