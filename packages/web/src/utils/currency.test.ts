import { describe, it, expect } from 'vitest';
import { formatPrice } from './currency';

describe('formatPrice', () => {
  it('formats CNY correctly for zh locale', () => {
    const result = formatPrice(100, 'zh');
    expect(result).toContain('¥');
    expect(result).toContain('100');
  });

  it('formats USD correctly for en locale', () => {
    const result = formatPrice(100, 'en');
    expect(result).toContain('$');
  });

  it('handles zero as free', () => {
    const result = formatPrice(0, 'zh');
    expect(result).toBe('免费');
  });

  it('handles zero as free in English', () => {
    const result = formatPrice(0, 'en');
    expect(result).toBe('Free');
  });

  it('returns empty string for -1', () => {
    const result = formatPrice(-1, 'zh');
    expect(result).toBe('');
  });
});
