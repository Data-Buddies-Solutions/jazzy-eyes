import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getDateRangePreset,
  formatDateRange,
  toISODateString,
  daysBetween,
  DATE_RANGE_PRESETS,
} from '../date-utils';

describe('toISODateString', () => {
  it('formats date to YYYY-MM-DD', () => {
    expect(toISODateString(new Date(2025, 0, 15))).toBe('2025-01-15');
    expect(toISODateString(new Date(2025, 11, 5))).toBe('2025-12-05');
  });

  it('pads single digit months and days', () => {
    expect(toISODateString(new Date(2025, 0, 1))).toBe('2025-01-01');
    expect(toISODateString(new Date(2025, 8, 9))).toBe('2025-09-09');
  });
});

describe('daysBetween', () => {
  it('calculates days between two dates', () => {
    const start = new Date(2025, 0, 1);
    const end = new Date(2025, 0, 8);
    expect(daysBetween(start, end)).toBe(7);
  });

  it('returns 0 for same date', () => {
    const date = new Date(2025, 0, 1);
    expect(daysBetween(date, date)).toBe(0);
  });

  it('handles negative difference (end before start)', () => {
    const start = new Date(2025, 0, 8);
    const end = new Date(2025, 0, 1);
    expect(daysBetween(start, end)).toBe(-7);
  });
});

describe('formatDateRange', () => {
  it('formats date range string', () => {
    const start = new Date(2025, 11, 1);
    const end = new Date(2026, 0, 8);
    const result = formatDateRange(start, end);
    expect(result).toBe('Dec 1, 2025 - Jan 8, 2026');
  });
});

describe('getDateRangePreset', () => {
  beforeEach(() => {
    // Mock current date to Jan 15, 2025
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 0, 15, 12, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns correct range for Last 7 days', () => {
    const { startDate, endDate } = getDateRangePreset('Last 7 days');
    expect(toISODateString(startDate)).toBe('2025-01-08');
    expect(toISODateString(endDate)).toBe('2025-01-15');
  });

  it('returns correct range for Last 30 days', () => {
    const { startDate, endDate } = getDateRangePreset('Last 30 days');
    expect(toISODateString(startDate)).toBe('2024-12-16');
    expect(toISODateString(endDate)).toBe('2025-01-15');
  });

  it('returns correct range for Last 90 days', () => {
    const { startDate, endDate } = getDateRangePreset('Last 90 days');
    expect(toISODateString(startDate)).toBe('2024-10-17');
    expect(toISODateString(endDate)).toBe('2025-01-15');
  });

  it('returns correct range for This Month', () => {
    const { startDate, endDate } = getDateRangePreset('This Month');
    expect(toISODateString(startDate)).toBe('2025-01-01');
    expect(toISODateString(endDate)).toBe('2025-01-15');
  });

  it('returns correct range for Last Month', () => {
    const { startDate, endDate } = getDateRangePreset('Last Month');
    expect(toISODateString(startDate)).toBe('2024-12-01');
    expect(toISODateString(endDate)).toBe('2024-12-31');
  });

  it('returns correct range for This Quarter (Q1)', () => {
    const { startDate, endDate } = getDateRangePreset('This Quarter');
    expect(toISODateString(startDate)).toBe('2025-01-01');
    expect(toISODateString(endDate)).toBe('2025-01-15');
  });

  it('returns correct range for All Time', () => {
    const { startDate, endDate } = getDateRangePreset('All Time');
    expect(toISODateString(startDate)).toBe('2000-01-01');
    expect(toISODateString(endDate)).toBe('2025-01-15');
  });

  it('defaults to Last 30 days for unknown preset', () => {
    const { startDate, endDate } = getDateRangePreset('Unknown');
    expect(toISODateString(startDate)).toBe('2024-12-16');
    expect(toISODateString(endDate)).toBe('2025-01-15');
  });
});

describe('DATE_RANGE_PRESETS', () => {
  it('contains all expected presets', () => {
    expect(DATE_RANGE_PRESETS).toContain('Last 7 days');
    expect(DATE_RANGE_PRESETS).toContain('Last 30 days');
    expect(DATE_RANGE_PRESETS).toContain('Last 90 days');
    expect(DATE_RANGE_PRESETS).toContain('This Month');
    expect(DATE_RANGE_PRESETS).toContain('Last Month');
    expect(DATE_RANGE_PRESETS).toContain('This Quarter');
    expect(DATE_RANGE_PRESETS).toContain('All Time');
  });

  it('has exactly 7 presets', () => {
    expect(DATE_RANGE_PRESETS).toHaveLength(7);
  });
});
