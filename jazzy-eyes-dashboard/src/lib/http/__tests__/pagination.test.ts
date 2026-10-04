import { describe, expect, it } from 'vitest';
import { parsePagination } from '../pagination';

describe('pagination input', () => {
  it('defaults to the existing first page and 20 rows', () => {
    expect(parsePagination(new URLSearchParams())).toEqual({ page: 1, limit: 20, skip: 0 });
  });
  it('supports valid pages and the maximum page size', () => {
    expect(parsePagination(new URLSearchParams('page=3&limit=100'))).toEqual({ page: 3, limit: 100, skip: 200 });
  });
  it.each(['page=0', 'page=-1', 'page=1.5', 'page=2abc', 'page=', 'page=NaN', 'page=9007199254740993', 'page=2147483647&limit=100', 'limit=0', 'limit=-1', 'limit=101', 'limit=1.5', 'limit=Infinity', 'limit='])('rejects %s before querying', query => {
    expect(parsePagination(new URLSearchParams(query))).toBeNull();
  });
});
