import { describe, it, expect } from 'vitest';

/**
 * Tests for EOM report parameter validation logic
 * Mirrors the validation in /api/reports/eom/route.ts
 */

function validateEOMParams(yearStr: string | null, monthStr: string | null): { valid: boolean; error?: string; year?: number; month?: number } {
  const year = parseInt(yearStr || new Date().getFullYear().toString(), 10);
  const month = parseInt(monthStr || (new Date().getMonth() + 1).toString(), 10);

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12 || year < 2000 || year > 2100) {
    return { valid: false, error: 'Invalid year or month parameter' };
  }

  return { valid: true, year, month };
}

describe('EOM report parameter validation', () => {
  it('accepts valid year and month', () => {
    const result = validateEOMParams('2026', '1');
    expect(result.valid).toBe(true);
    expect(result.year).toBe(2026);
    expect(result.month).toBe(1);
  });

  it('accepts boundary month values', () => {
    expect(validateEOMParams('2025', '1').valid).toBe(true);
    expect(validateEOMParams('2025', '12').valid).toBe(true);
  });

  it('rejects month 0', () => {
    expect(validateEOMParams('2025', '0').valid).toBe(false);
  });

  it('rejects month 13', () => {
    expect(validateEOMParams('2025', '13').valid).toBe(false);
  });

  it('rejects non-numeric year', () => {
    expect(validateEOMParams('abc', '1').valid).toBe(false);
  });

  it('rejects non-numeric month', () => {
    expect(validateEOMParams('2025', 'abc').valid).toBe(false);
  });

  it('rejects year below 2000', () => {
    expect(validateEOMParams('1999', '6').valid).toBe(false);
  });

  it('rejects year above 2100', () => {
    expect(validateEOMParams('2101', '6').valid).toBe(false);
  });

  it('uses current year/month when params are null', () => {
    const result = validateEOMParams(null, null);
    expect(result.valid).toBe(true);
    expect(result.year).toBe(new Date().getFullYear());
    expect(result.month).toBe(new Date().getMonth() + 1);
  });
});

/**
 * Tests for below-cost sale validation logic
 * Mirrors the check in /api/frames/[id]/route.ts
 */

function isBelowCost(salePrice: number, wholesaleCost: number): boolean {
  return wholesaleCost > 0 && salePrice < wholesaleCost;
}

describe('below-cost sale validation', () => {
  it('rejects sale price below wholesale cost', () => {
    expect(isBelowCost(50, 100)).toBe(true);
  });

  it('accepts sale price equal to wholesale cost', () => {
    expect(isBelowCost(100, 100)).toBe(false);
  });

  it('accepts sale price above wholesale cost', () => {
    expect(isBelowCost(200, 100)).toBe(false);
  });

  it('allows any price when wholesale cost is 0', () => {
    expect(isBelowCost(10, 0)).toBe(false);
    expect(isBelowCost(0, 0)).toBe(false);
  });

  it('allows any price when wholesale cost is negative (edge case)', () => {
    expect(isBelowCost(10, -5)).toBe(false);
  });
});

/**
 * Tests for FIFO cost calculation logic
 * Mirrors previewFIFOCost in /api/frames/[id]/route.ts
 */

interface Batch {
  remainingQty: number;
  unitCost: number;
}

function calculateFIFOCost(batches: Batch[], quantityToConsume: number): number {
  let remainingToConsume = quantityToConsume;
  let totalCost = 0;

  for (const batch of batches) {
    if (remainingToConsume <= 0) break;
    const availableInBatch = batch.remainingQty || 0;
    const consumeFromBatch = Math.min(availableInBatch, remainingToConsume);
    totalCost += consumeFromBatch * batch.unitCost;
    remainingToConsume -= consumeFromBatch;
  }

  return quantityToConsume > 0 ? totalCost / quantityToConsume : 0;
}

describe('FIFO cost calculation', () => {
  it('calculates cost from a single batch', () => {
    const batches: Batch[] = [{ remainingQty: 10, unitCost: 50 }];
    expect(calculateFIFOCost(batches, 3)).toBe(50);
  });

  it('calculates weighted average across multiple batches', () => {
    const batches: Batch[] = [
      { remainingQty: 2, unitCost: 40 },
      { remainingQty: 3, unitCost: 60 },
    ];
    // Consume 4: 2 @ $40 + 2 @ $60 = $80 + $120 = $200 / 4 = $50
    expect(calculateFIFOCost(batches, 4)).toBe(50);
  });

  it('uses oldest batches first (FIFO order)', () => {
    const batches: Batch[] = [
      { remainingQty: 5, unitCost: 30 }, // oldest
      { remainingQty: 5, unitCost: 50 }, // newer
    ];
    // Consume 3: all from first batch @ $30
    expect(calculateFIFOCost(batches, 3)).toBe(30);
  });

  it('returns 0 when quantity is 0', () => {
    const batches: Batch[] = [{ remainingQty: 10, unitCost: 50 }];
    expect(calculateFIFOCost(batches, 0)).toBe(0);
  });

  it('handles empty batches array', () => {
    expect(calculateFIFOCost([], 5)).toBe(0);
  });

  it('handles consuming entire inventory', () => {
    const batches: Batch[] = [
      { remainingQty: 2, unitCost: 100 },
      { remainingQty: 3, unitCost: 200 },
    ];
    // (2*100 + 3*200) / 5 = 800/5 = 160
    expect(calculateFIFOCost(batches, 5)).toBe(160);
  });
});
