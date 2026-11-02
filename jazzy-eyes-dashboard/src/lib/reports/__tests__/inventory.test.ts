import { describe, expect, it } from 'vitest';
import { framesWithStatus, unknownStatus } from '../inventory';

const frames = [
  { frameId: 'a', displayStatus: 'Active' },
  { frameId: 'b', displayStatus: 'Sold Out' },
  { frameId: 'c', displayStatus: 'Returned' },
  { frameId: 'd', displayStatus: 'Discontinued' },
  { frameId: 'e', displayStatus: 'Active' },
];
const ids = (rows: { frameId: string }[]) => rows.map(row => row.frameId);

describe('inventory status filter', () => {
  it('keeps every frame when no status is given', () => {
    expect(ids(framesWithStatus(frames, []))).toEqual(['a', 'b', 'c', 'd', 'e']);
  });
  it('keeps only frames with a listed status, in their original order', () => {
    expect(ids(framesWithStatus(frames, ['Active']))).toEqual(['a', 'e']);
    expect(ids(framesWithStatus(frames, ['Returned', 'Sold Out']))).toEqual(['b', 'c']);
  });
  it('names the first unknown status, matching case exactly', () => {
    expect(unknownStatus(['Active', 'Sold Out', 'Returned', 'Discontinued'])).toBeUndefined();
    expect(unknownStatus(['Active', 'active', 'Bogus'])).toBe('active');
  });
});
