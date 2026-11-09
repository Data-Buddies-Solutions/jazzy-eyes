import { describe, expect, it } from 'vitest';
import { discountedCost } from '../cost-discount';

const day = (date: string) => new Date(`${date}T00:00:00.000Z`);
const brand = { costDiscountPercent: 10, costDiscountStartDate: day('2026-11-09') };

describe('discountedCost', () => {
  it('discounts frames received on or after the start date only', () => {
    expect(discountedCost(100, day('2026-11-09'), brand)).toBe(90);
    expect(discountedCost(100, day('2026-12-01'), brand)).toBe(90);
    expect(discountedCost(100, day('2026-11-08'), brand)).toBe(100);
  });

  it('leaves the cost alone without a discount, a start date, or a receive date', () => {
    expect(discountedCost(100, day('2026-12-01'), { costDiscountPercent: 0, costDiscountStartDate: day('2026-01-01') })).toBe(100);
    expect(discountedCost(100, day('2026-12-01'), { costDiscountPercent: null, costDiscountStartDate: null })).toBe(100);
    expect(discountedCost(100, day('2026-12-01'), { costDiscountPercent: 10, costDiscountStartDate: null })).toBe(100);
    expect(discountedCost(100, null, brand)).toBe(100);
  });
});
