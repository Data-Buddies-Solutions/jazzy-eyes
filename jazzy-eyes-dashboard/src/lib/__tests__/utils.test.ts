import { describe, it, expect } from 'vitest';
import { formatCurrency, formatNumber, formatPercent, getDaysDifference } from '../utils';

describe('formatCurrency', () => {
  it('formats positive integers correctly', () => {
    expect(formatCurrency(100)).toBe('$100');
    expect(formatCurrency(1000)).toBe('$1,000');
    expect(formatCurrency(1234567)).toBe('$1,234,567');
  });

  it('formats zero correctly', () => {
    expect(formatCurrency(0)).toBe('$0');
  });

  it('rounds decimals to whole numbers', () => {
    expect(formatCurrency(99.49)).toBe('$99');
    expect(formatCurrency(99.5)).toBe('$100');
  });

  it('handles negative values', () => {
    expect(formatCurrency(-100)).toBe('-$100');
  });
});

describe('formatNumber', () => {
  it('formats integers with commas', () => {
    expect(formatNumber(1000)).toBe('1,000');
    expect(formatNumber(1234567)).toBe('1,234,567');
  });

  it('formats zero correctly', () => {
    expect(formatNumber(0)).toBe('0');
  });

  it('handles decimals', () => {
    expect(formatNumber(1234.56)).toBe('1,234.56');
  });

  it('handles negative values', () => {
    expect(formatNumber(-1000)).toBe('-1,000');
  });
});

describe('formatPercent', () => {
  it('formats with default 1 decimal place', () => {
    expect(formatPercent(50)).toBe('50.0%');
    expect(formatPercent(33.333)).toBe('33.3%');
  });

  it('formats with custom decimal places', () => {
    expect(formatPercent(33.333, 2)).toBe('33.33%');
    expect(formatPercent(100, 0)).toBe('100%');
  });

  it('handles zero', () => {
    expect(formatPercent(0)).toBe('0.0%');
  });

  it('handles negative values', () => {
    expect(formatPercent(-10.5)).toBe('-10.5%');
  });
});

describe('getDaysDifference', () => {
  it('calculates days between two dates', () => {
    expect(getDaysDifference('2025-01-01', '2025-01-08')).toBe(7);
    expect(getDaysDifference('2025-01-01', '2025-01-31')).toBe(30);
  });

  it('returns 0 for same day', () => {
    expect(getDaysDifference('2025-01-01', '2025-01-01')).toBe(0);
  });

  it('handles reverse date order (uses absolute value)', () => {
    expect(getDaysDifference('2025-01-08', '2025-01-01')).toBe(7);
  });

  it('handles year boundaries', () => {
    expect(getDaysDifference('2024-12-31', '2025-01-01')).toBe(1);
  });
});
