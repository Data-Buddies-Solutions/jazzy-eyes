import { describe, expect, it } from 'vitest';
import { buildRepRow, parseReportDate, selectRepRows, type RepTransaction } from '../sales-rep';
const t = (id: number, type: string, date: string, quantity = 1, extra = {}): RepTransaction => ({ id, transactionType: type, transactionDate: new Date(date), quantity, status: 'completed', revertedFromId: null, ...extra });
const row = (transactions: RepTransaction[], qty = 1, model = '100') => buildRepRow({ compositeId: `1-${model}-001-52`, brandId: 1, styleNumber: model, colorCode: '001', eyeSize: '52', currentQty: qty, transactions }, 'Gucci', '2026-09-01', '2026-09-30', '2026-10-03');
describe('sales rep report', () => {
  it('counts both inclusive boundaries but keeps lifetime dates and age', () => {
    const result = row([t(1, 'ORDER', '2026-08-01'), t(2, 'RESTOCK', '2026-09-01'), t(3, 'SALE', '2026-09-30'), t(4, 'RESTOCK', '2026-10-01')], 2);
    expect(result).toMatchObject({ received: 1, sold: 1, lastReceived: '2026-10-01', lastSold: '2026-09-30', daysOnShelf: 32, ageBand: '30–59 days' });
  });
  it('keeps the old unit age when a second unit just arrived', () => {
    expect(row([t(1, 'ORDER', '2026-06-01'), t(2, 'RESTOCK', '2026-10-02')], 2).daysOnShelf).toBe(124);
  });
  it('uses initial inventory date as arrival and excludes opening balance from received', () => {
    const result = buildRepRow({ compositeId: '1', brandId: 1, styleNumber: '1', colorCode: '1', eyeSize: '1', currentQty: 1, transactions: [t(1, 'ORDER', '2026-01-08')] }, 'Gucci', '2026-01-01', '2026-10-03', '2026-10-03');
    expect(result).toMatchObject({ daysOnShelf: 268, received: 0, lastReceived: '2026-01-08' });
  });
  it('restores original receipt age when a write-off is reverted', () => {
    expect(row([t(1, 'ORDER', '2026-07-01'), t(2, 'WRITE_OFF', '2026-08-01'), t(3, 'REVERT_WRITE_OFF', '2026-09-15', 1, { revertedFromId: 2 })]).daysOnShelf).toBe(94);
  });
  it('does not invent an age when history does not reconcile', () => {
    expect(row([t(1, 'ORDER', '2026-08-01')], 2).daysOnShelf).toBeNull();
    expect(row([t(1, 'REVERT_WRITE_OFF', '2026-08-01', 1, { revertedFromId: 99 })]).daysOnShelf).toBeNull();
  });
  it('excludes pending, cancelled and future events', () => {
    expect(row([t(1, 'ORDER', '2026-08-01'), t(2, 'SALE', '2026-09-01', 1, { status: 'cancelled' }), t(3, 'RESTOCK', '2026-09-02', 5, { status: 'pending' }), t(4, 'SALE', '2026-12-01')])).toMatchObject({ received: 0, sold: 0, lastSold: null, daysOnShelf: 63 });
  });
  it('includes old current stock and sold-out activity, hiding old sold-out frames', () => {
    const old = row([t(1, 'ORDER', '2026-07-01')]);
    const sold = row([t(1, 'ORDER', '2026-07-01'), t(2, 'SALE', '2026-09-02')], 0, '200');
    const gone = row([t(1, 'ORDER', '2026-07-01'), t(2, 'SALE', '2026-08-02')], 0, '300');
    expect(selectRepRows([sold, gone, old])).toEqual([old, sold]);
    expect(selectRepRows([sold, gone, old], true)).toEqual([sold]);
    expect(sold.daysOnShelf).toBeNull();
  });
  it('includes received-then-returned frames in activity only', () => {
    const returned = row([t(1, 'ORDER', '2026-09-01'), t(2, 'WRITE_OFF', '2026-09-02')], 0);
    expect(selectRepRows([returned], true)).toHaveLength(1);
  });
  it('uses natural model order for equal ages', () => {
    const tx = [t(1, 'ORDER', '2026-08-01')];
    expect(selectRepRows([row(tx, 1, '100'), row(tx, 1, '20')]).map(r => r.model)).toEqual(['20', '100']);
  });
  it('shows each remaining unit with its own receipt date and age', () => {
    const result = row([t(1, 'ORDER', '2026-06-01'), t(2, 'RESTOCK', '2026-10-02', 2)], 3);
    expect(result.units).toEqual([
      { status: 'In stock', receivedDate: '2026-06-01', soldDate: null, daysOnShelf: 124 },
      { status: 'In stock', receivedDate: '2026-10-02', soldDate: null, daysOnShelf: 1 },
      { status: 'In stock', receivedDate: '2026-10-02', soldDate: null, daysOnShelf: 1 },
    ]);
  });
  it('matches period sales to oldest receipts and stops age at the sale date', () => {
    const result = row([t(1, 'ORDER', '2026-07-01'), t(2, 'RESTOCK', '2026-08-01', 2), t(3, 'SALE', '2026-09-01', 2)]);
    expect(result.units).toEqual([
      { status: 'In stock', receivedDate: '2026-08-01', soldDate: null, daysOnShelf: 63 },
      { status: 'Sold', receivedDate: '2026-07-01', soldDate: '2026-09-01', daysOnShelf: 62 },
      { status: 'Sold', receivedDate: '2026-08-01', soldDate: '2026-09-01', daysOnShelf: 31 },
    ]);
  });
  it('does not invent unit receipt dates when stock and history disagree', () => {
    expect(row([t(1, 'ORDER', '2026-08-01')], 2).units).toEqual([
      { status: 'In stock', receivedDate: null, soldDate: null, daysOnShelf: null },
      { status: 'In stock', receivedDate: null, soldDate: null, daysOnShelf: null },
    ]);
  });
  it('validates date-only inputs including impossible dates', () => {
    for (const input of [null, '', '2026-02-30', '2026-13-01', '2026-1-01', 'invalid']) expect(parseReportDate(input)).toBeNull();
    expect(parseReportDate('2026-09-30')?.toISOString()).toBe('2026-09-30T00:00:00.000Z');
  });
});
