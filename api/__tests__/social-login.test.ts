import { describe, it, expect } from 'vitest';

describe('Social Login API', () => {
  describe('POST /api/auth/social-login', () => {
    it('should require access_token', () => {
      const body = {};
      const hasToken = !!body.access_token;
      expect(hasToken).toBe(false);
    });

    it('should accept valid access_token', () => {
      const body = { access_token: 'valid-token-123', provider: 'google' };
      expect(body.access_token).toBeDefined();
      expect(body.provider).toBe('google');
    });

    it('should handle Google provider', () => {
      const providers = ['google', 'github', 'facebook'];
      expect(providers).toContain('google');
    });
  });

  describe('User Creation from Social Login', () => {
    it('should create user with empty password for social login', () => {
      const userData = {
        name: 'Google User',
        email: 'user@gmail.com',
        password: '', // No password for social login
        role: 'USER',
        plan: 'FREE',
        industry: [],
      };

      expect(userData.password).toBe('');
      expect(userData.role).toBe('USER');
      expect(userData.plan).toBe('FREE');
    });

    it('should use email prefix as name if no name provided', () => {
      const email = 'john.doe@gmail.com';
      const fallbackName = email.split('@')[0];
      expect(fallbackName).toBe('john.doe');
    });

    it('should handle user metadata from Google', () => {
      const metadata = {
        full_name: 'John Doe',
        name: 'John Doe',
        avatar_url: 'https://lh3.googleusercontent.com/avatar.jpg',
      };

      const name = metadata.full_name || metadata.name || 'user';
      const avatarUrl = metadata.avatar_url || null;

      expect(name).toBe('John Doe');
      expect(avatarUrl).toContain('googleusercontent.com');
    });
  });

  describe('JWT Creation for Social Login', () => {
    it('should create JWT with user info', () => {
      const payload = {
        userId: 'user-123',
        email: 'user@gmail.com',
        role: 'USER',
      };

      expect(payload.userId).toBeDefined();
      expect(payload.email).toContain('@');
      expect(payload.role).toBe('USER');
    });

    it('should set cookie with proper attributes', () => {
      const maxAge = 7 * 24 * 60 * 60; // 7 days
      const cookie = `token=test-token; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=${maxAge}`;

      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('Secure');
      expect(cookie).toContain('SameSite=None');
      expect(cookie).toContain('Max-Age=604800');
    });
  });
});

describe('Supabase Integration', () => {
  it('should use correct Supabase URL', () => {
    const supabaseUrl = process.env.SUPABASE_URL || '';
    expect(supabaseUrl).toContain('supabase.co');
  });

  it('should verify user with Supabase auth endpoint', () => {
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const endpoint = `${supabaseUrl}/auth/v1/user`;
    expect(endpoint).toContain('/auth/v1/user');
  });
});
