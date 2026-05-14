import { describe, expect, it } from 'vitest';
import { calculateHistoricalInventoryMetrics } from '../inventory-metrics';

const startDate = new Date('2026-04-01T00:00:00.000Z');
const endDate = new Date('2026-04-30T23:59:59.999Z');

describe('calculateHistoricalInventoryMetrics', () => {
  it('uses currentQty for current inventory, not product row count', () => {
    const metrics = calculateHistoricalInventoryMetrics(
      [
        {
          currentQty: 5,
          transactions: [],
        },
        {
          currentQty: 0,
          transactions: [],
        },
      ],
      startDate,
      endDate
    );

    expect(metrics.currentInventory).toBe(5);
  });

  it('reconstructs starting inventory by reversing quantity movements since the start date', () => {
    const metrics = calculateHistoricalInventoryMetrics(
      [
        {
          currentQty: 8,
          transactions: [
            {
              transactionType: 'SALE',
              transactionDate: new Date('2026-04-05T00:00:00.000Z'),
              quantity: 3,
            },
            {
              transactionType: 'RESTOCK',
              transactionDate: new Date('2026-04-10T00:00:00.000Z'),
              quantity: 2,
            },
          ],
        },
      ],
      startDate,
      endDate
    );

    expect(metrics.startingInventory).toBe(9);
    expect(metrics.unitsAddedInPeriod).toBe(2);
    expect(metrics.availableInventory).toBe(11);
    expect(metrics.inventorySoldInPeriod).toBe(3);
    expect(metrics.sellThroughRate).toBeCloseTo(27.2727, 4);
  });

  it('counts transaction quantities for sales and period additions', () => {
    const metrics = calculateHistoricalInventoryMetrics(
      [
        {
          currentQty: 7,
          transactions: [
            {
              transactionType: 'ORDER',
              transactionDate: new Date('2026-04-01T00:00:00.000Z'),
              quantity: 10,
            },
            {
              transactionType: 'SALE',
              transactionDate: new Date('2026-04-12T00:00:00.000Z'),
              quantity: 2,
            },
            {
              transactionType: 'WRITE_OFF',
              transactionDate: new Date('2026-04-15T00:00:00.000Z'),
              quantity: 1,
            },
          ],
        },
      ],
      startDate,
      endDate
    );

    expect(metrics.startingInventory).toBe(0);
    expect(metrics.unitsAddedInPeriod).toBe(10);
    expect(metrics.availableInventory).toBe(10);
    expect(metrics.inventorySoldInPeriod).toBe(2);
    expect(metrics.unitsWrittenOffInPeriod).toBe(1);
    expect(metrics.sellThroughRate).toBe(20);
  });

  it('matches retail sell-through: sold divided by starting inventory plus received units', () => {
    const metrics = calculateHistoricalInventoryMetrics(
      [
        {
          currentQty: 40,
          transactions: [
            {
              transactionType: 'RESTOCK',
              transactionDate: new Date('2026-04-08T00:00:00.000Z'),
              quantity: 30,
            },
            {
              transactionType: 'SALE',
              transactionDate: new Date('2026-04-20T00:00:00.000Z'),
              quantity: 40,
            },
          ],
        },
      ],
      startDate,
      endDate
    );

    expect(metrics.startingInventory).toBe(50);
    expect(metrics.unitsAddedInPeriod).toBe(30);
    expect(metrics.availableInventory).toBe(80);
    expect(metrics.inventorySoldInPeriod).toBe(40);
    expect(metrics.sellThroughRate).toBe(50);
  });

  it('uses transactions after the selected period only to reconstruct the start, not period availability', () => {
    const metrics = calculateHistoricalInventoryMetrics(
      [
        {
          currentQty: 3,
          transactions: [
            {
              transactionType: 'SALE',
              transactionDate: new Date('2026-04-12T00:00:00.000Z'),
              quantity: 2,
            },
            {
              transactionType: 'RESTOCK',
              transactionDate: new Date('2026-05-05T00:00:00.000Z'),
              quantity: 4,
            },
          ],
        },
      ],
      startDate,
      endDate
    );

    expect(metrics.startingInventory).toBe(1);
    expect(metrics.unitsAddedInPeriod).toBe(0);
    expect(metrics.availableInventory).toBe(1);
    expect(metrics.inventorySoldInPeriod).toBe(2);
  });

  it('does not count a same-period write-off revert as newly available inventory', () => {
    const metrics = calculateHistoricalInventoryMetrics(
      [
        {
          currentQty: 5,
          transactions: [
            {
              id: 10,
              transactionType: 'WRITE_OFF',
              transactionDate: new Date('2026-04-12T00:00:00.000Z'),
              quantity: 1,
            },
            {
              transactionType: 'REVERT_WRITE_OFF',
              transactionDate: new Date('2026-04-15T00:00:00.000Z'),
              quantity: 1,
              revertedFromId: 10,
            },
          ],
        },
      ],
      startDate,
      endDate
    );

    expect(metrics.startingInventory).toBe(5);
    expect(metrics.unitsAddedInPeriod).toBe(0);
    expect(metrics.availableInventory).toBe(5);
    expect(metrics.unitsWrittenOffInPeriod).toBe(1);
  });

  it('counts a prior-period write-off revert as available inventory restored in the period', () => {
    const metrics = calculateHistoricalInventoryMetrics(
      [
        {
          currentQty: 5,
          transactions: [
            {
              id: 10,
              transactionType: 'WRITE_OFF',
              transactionDate: new Date('2026-03-20T00:00:00.000Z'),
              quantity: 1,
            },
            {
              transactionType: 'REVERT_WRITE_OFF',
              transactionDate: new Date('2026-04-15T00:00:00.000Z'),
              quantity: 1,
              revertedFromId: 10,
            },
          ],
        },
      ],
      startDate,
      endDate
    );

    expect(metrics.startingInventory).toBe(4);
    expect(metrics.unitsAddedInPeriod).toBe(1);
    expect(metrics.availableInventory).toBe(5);
  });
});
