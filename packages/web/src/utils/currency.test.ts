import { describe, it, expect } from 'vitest';
import { formatCurrency } from './currency';

describe('formatCurrency', () => {
  it('formats USD correctly', () => {
    const result = formatCurrency(1234.56, 'USD');
    expect(result).toContain('1,234.56');
  });

  it('formats CNY correctly', () => {
    const result = formatCurrency(1234.56, 'CNY');
    expect(result).toContain('1,234.56');
  });

  it('handles zero', () => {
    const result = formatCurrency(0, 'USD');
    expect(result).toContain('0');
  });

  it('handles negative values', () => {
    const result = formatCurrency(-100, 'USD');
    expect(result).toContain('100');
  });
});
